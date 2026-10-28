// ตรวจสลิปกับ Slip2Go (ชื่อไฟล์ยังเป็น slipok.js เพื่อให้จุดอื่นในโค้ดไม่ต้องแก้)
// ค่าที่ต้องตั้งใน Vercel: SLIP2GO_API_URL, SLIP2GO_SECRET_KEY (และ PROMPTPAY_ID ที่มีอยู่แล้ว)
// ถ้าข้อความหรือรหัสผิดไป แก้ได้เฉพาะไฟล์นี้ไฟล์เดียว
const MESSAGES = {
  200401: 'บัญชีผู้รับในสลิปไม่ใช่บัญชีของร้าน',
  200402: 'ยอดในสลิปไม่ตรงกับยอดที่ต้องโอน',
  200403: 'วันที่ในสลิปไม่ตรงกัน',
  200404: 'ไม่พบสลิปนี้ในระบบธนาคาร ลองใหม่อีกครั้งในอีกสักครู่',
  200500: 'สลิปนี้ไม่ถูกต้อง (อาจเป็นสลิปปลอม)',
  200501: 'สลิปนี้เคยถูกใช้แล้ว',
  200502: 'ระบบธนาคารขัดข้อง ลองใหม่อีกครั้ง',
  400001: 'อ่าน QR ในสลิปไม่ได้ ลองแนบสลิปที่เห็น QR ชัดเจน',
  400002: 'ไฟล์รูปไม่ถูกต้อง',
  429000: 'มีคนตรวจสลิปพร้อมกันมาก ลองใหม่อีกครั้งในสักครู่',
};

// ข้อผิดพลาดฝั่งการตั้งค่าร้าน (ลูกค้าไม่ต้องรู้รายละเอียด)
const CONFIG_CODES = [401001, 401002, 401003, 401004, 401005, 401006, 401007];

const digits = (s) => String(s || '').replace(/\D/g, '');

// เช็กว่าผู้รับในสลิปคือบัญชีพร้อมเพย์ของร้าน (เทียบเลขท้าย 4 ตัว เพราะสลิปมักปิดบังเลขบางส่วน)
function receiverOk(d) {
  const mine = digits(process.env.PROMPTPAY_ID);
  if (mine.length < 4) return true;
  const last4 = mine.slice(-4);
  const r = d.receiver || {};
  const acc = r.account || {};
  const found = [
    acc.proxy && acc.proxy.account,
    acc.bank && acc.bank.account,
  ].map(digits).filter((x) => x.length >= 3);
  if (!found.length) return true; // สลิปไม่แสดงเลขบัญชีผู้รับ ปล่อยผ่านให้ตรวจยอดกับเลขอ้างอิงแทน
  return found.some((x) => x.endsWith(last4));
}

export async function verifySlip(file, amount) {
  const base = String(process.env.SLIP2GO_API_URL || '').replace(/\/+$/, '');
  if (!base || !process.env.SLIP2GO_SECRET_KEY) {
    console.error('SLIP2GO_API_URL / SLIP2GO_SECRET_KEY not set');
    return { ok: false, message: 'ระบบตรวจสลิปยังตั้งค่าไม่ครบ กรุณาติดต่อร้าน' };
  }

  const fd = new FormData();
  fd.append('file', file, 'slip.jpg');
  fd.append('payload', JSON.stringify({ checkCondition: { checkDuplicate: true } }));

  let res;
  try {
    res = await fetch(`${base}/api/verify-slip/qr-image/info`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SLIP2GO_SECRET_KEY}` },
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

  const code = json ? Number(json.code) : 0;

  if (code === 200000 || code === 200200) {
    const d = json.data || {};
    const paid = Number(d.amount);
    if (!Number.isFinite(paid) || paid !== Number(amount)) {
      return { ok: false, message: MESSAGES[200402], code };
    }
    if (!receiverOk(d)) return { ok: false, message: MESSAGES[200401], code };
    if (!d.transRef) return { ok: false, message: 'อ่านเลขอ้างอิงจากสลิปไม่ได้ ลองแนบสลิปใหม่' };
    return { ok: true, transRef: String(d.transRef), amount: paid, raw: json };
  }

  if (CONFIG_CODES.includes(code)) {
    console.error('Slip2Go config error', json);
    return { ok: false, message: 'ระบบตรวจสลิปขัดข้อง กรุณาติดต่อร้าน', code };
  }

  const message = MESSAGES[code] || 'ตรวจสลิปไม่ผ่าน ลองแนบสลิปใหม่';
  if (!MESSAGES[code]) console.error('Slip2Go unexpected', res.status, json);
  return { ok: false, message, code };
}
