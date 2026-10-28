// ตรวจสลิปกับ SlipOK
// หมายเหตุ: รูปแบบคำตอบของ SlipOK เขียนตามที่เข้าใจจากเอกสารสาธารณะ ควรทดสอบกับสลิปจริงของร้านหนึ่งครั้ง
// ถ้าข้อความหรือรหัสผิดไป แก้ได้เฉพาะไฟล์นี้ไฟล์เดียว
const MESSAGES = {
  1012: 'สลิปนี้เคยถูกใช้แล้ว',
  1013: 'ยอดในสลิปไม่ตรงกับยอดที่ต้องโอน',
  1014: 'บัญชีผู้รับในสลิปไม่ใช่บัญชีของร้าน',
};

export async function verifySlip(file, amount) {
  const fd = new FormData();
  fd.append('files', file, 'slip.jpg');
  fd.append('amount', String(amount));
  fd.append('log', 'true');

  let res;
  try {
    res = await fetch(`https://api.slipok.com/api/line/apikey/${process.env.SLIPOK_BRANCH_ID}`, {
      method: 'POST',
      headers: { 'x-authorization': process.env.SLIPOK_API_KEY },
      body: fd,
    });
  } catch (e) {
    return { ok: false, message: 'ติดต่อระบบตรวจสลิปไม่ได้ ลองใหม่อีกครั้ง' };
  }

  let json = null;
  try {
    json = await res.json();
  } catch (e) {}

  if (json && json.success === true && json.data && json.data.success !== false) {
    const d = json.data;
    const paid = Number(d.amount);
    if (Number.isFinite(paid) && paid !== Number(amount)) {
      return { ok: false, message: 'ยอดในสลิปไม่ตรงกับยอดที่ต้องโอน' };
    }
    if (!d.transRef) return { ok: false, message: 'อ่านเลขอ้างอิงจากสลิปไม่ได้ ลองแนบสลิปใหม่' };
    return { ok: true, transRef: String(d.transRef), amount: paid, raw: json };
  }

  const code = json && Number(json.code);
  const message = MESSAGES[code] || (json && json.message) || 'ตรวจสลิปไม่ผ่าน ลองแนบสลิปใหม่';
  return { ok: false, message, code };
}
