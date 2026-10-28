// ตรวจสลิปกับ SlipOK
// ค่าที่ต้องตั้งใน Vercel: SLIPOK_BRANCH_ID, SLIPOK_API_KEY (และ PROMPTPAY_ID ที่มีอยู่แล้ว)
// สาขาใน SlipOK ต้องเป็นแบบ "API" (ไม่ใช่ LINE Group) ถึงจะมี API key
// ถ้าข้อความหรือรหัสผิดไป แก้ได้เฉพาะไฟล์นี้ไฟล์เดียว
const MESSAGES = {
  1005: 'ไฟล์รูปไม่ถูกต้อง',
  1006: 'ไฟล์รูปไม่ถูกต้อง',
  1007: 'อ่าน QR ในสลิปไม่ได้ ลองแนบสลิปที่เห็น QR ชัดเจน',
  1008: 'รูปนี้ไม่ใช่สลิปโอนเงิน',
  1009: 'ระบบธนาคารขัดข้อง ลองใหม่อีกครั้ง',
  1010: 'ธนาคารยังไม่ส่งข้อมูลสลิปนี้ ลองใหม่อีกครั้งในอีกสักครู่',
  1011: 'สลิปนี้ไม่ถูกต้อง (อาจเป็นสลิปปลอม)',
  1012: 'สลิปนี้เคยถูกใช้แล้ว',
  1013: 'ยอดในสลิปไม่ตรงกับยอดที่ต้องโอน',
  1014: 'บัญชีผู้รับในสลิปไม่ใช่บัญชีของร้าน',
};

// ข้อผิดพลาดฝั่งการตั้งค่าร้าน เช่น key ผิด แพ็กเกจหมด โควตาหมด (ลูกค้าไม่ต้องรู้รายละเอียด)
const CONFIG_CODES = [1000, 1001, 1002, 1003, 1004];

const digits = (s) => String(s || '').replace(/\D/g, '');

// เช็กว่าผู้รับในสลิปคือพร้อมเพย์ของร้าน (เทียบเลขท้าย 4 ตัว เพราะสลิปมักปิดบังเลขบางส่วน)
function receiverOk(d) {
  const mine = digits(process.env.PROMPTPAY_ID);
  if (mine.length < 4) return true;
  const last4 = mine.slice(-4);
  const r = d.receiver || {};
  const found = [
    r.proxy && r.proxy.value,
    r.account && r.account.value,
    r.account && r.account.proxy && r.account.proxy.account,
    r.account && r.account.bank && r.account.bank.account,
  ].map(digits).filter((x) => x.length >= 3);
  if (!found.length) return true; // สลิปไม่แสดงเลขผู้รับ ปล่อยผ่านให้ตรวจยอดกับเลขอ้างอิงแทน
  return found.some((x) => x.endsWith(last4));
}

export async function verifySlip(file, amount) {
  const branch = String(process.env.SLIPOK_BRANCH_ID || '').trim();
  const key = String(process.env.SLIPOK_API_KEY || '').trim();
  if (!branch || !key) {
    console.error('SLIPOK_BRANCH_ID / SLIPOK_API_KEY not set');
    return { ok: false, message: 'ระบบตรวจสลิปยังตั้งค่าไม่ครบ กรุณาติดต่อร้าน' };
  }

  const fd = new FormData();
  fd.append('files', file, 'slip.jpg');
  fd.append('amount', String(amount)); // ให้ SlipOK เช็กยอดด้วย (ตอบรหัส 1013 ถ้าไม่ตรง)
  fd.append('log', 'true'); // ให้ SlipOK จำสลิป เพื่อจับสลิปซ้ำ (รหัส 1012)

  let res;
  try {
    res = await fetch(`https://api.slipok.com/api/line/apikey/${encodeURIComponent(branch)}`, {
      method: 'POST',
      headers: { 'x-authorization': key },
      body: fd,
    });
  } catch (e) {
    console.error(e);
    return { ok: false, message: 'ติดต่อระบบตรวจสลิปไม่ได้ ลองใหม่อีกครั้ง' };
  }

  let json = null;
  try {
    json = await res.json();
  } catch (e) {}

  if (res.ok && json && json.success === true && json.data && json.data.success !== false) {
    const d = json.data;
    const paid = Number(d.amount);
    if (!Number.isFinite(paid) || paid !== Number(amount)) {
      return { ok: false, message: MESSAGES[1013], code: 1013 };
    }
    if (!receiverOk(d)) return { ok: false, message: MESSAGES[1014], code: 1014 };
    if (!d.transRef) return { ok: false, message: 'อ่านเลขอ้างอิงจากสลิปไม่ได้ ลองแนบสลิปใหม่' };
    return { ok: true, transRef: String(d.transRef), amount: paid, raw: json };
  }

  const code = json ? Number(json.code) : 0;

  if (CONFIG_CODES.includes(code) || res.status === 401 || res.status === 403) {
    console.error('SlipOK config error', res.status, json);
    return { ok: false, message: 'ระบบตรวจสลิปขัดข้อง กรุณาติดต่อร้าน', code };
  }

  const message = MESSAGES[code] || 'ตรวจสลิปไม่ผ่าน ลองแนบสลิปใหม่';
  if (!MESSAGES[code]) console.error('SlipOK unexpected', res.status, json);
  return { ok: false, message, code };
}
