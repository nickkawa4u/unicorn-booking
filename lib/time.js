// เวลาทั้งหมดใช้เขตเวลาไทย (UTC+7)
export function bkk(now = Date.now()) {
  const dt = new Date(now + 7 * 3600e3);
  return { iso: dt.toISOString().slice(0, 10), hour: dt.getUTCHours() };
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// เวลาเริ่มของชั่วโมงนั้น เป็น ms (UTC)
export function startMs(iso, hour) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d, hour - 7);
}

// ตรวจช่องที่ส่งมา คืนข้อความ error หรือ null ถ้าถูกต้อง
export function checkSlot(s, { future = true, maxAhead = 13 } = {}) {
  if (!s || typeof s.d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.d)) return 'วันที่ไม่ถูกต้อง';
  const today = bkk().iso;
  if (s.d < today || s.d > addDays(today, maxAhead)) return 'วันที่อยู่นอกช่วงที่จองได้';
  if (!Number.isInteger(s.c) || s.c < 1 || s.c > 7) return 'หมายเลขสนามไม่ถูกต้อง';
  if (!Number.isInteger(s.h) || s.h < 16 || s.h > 22) return 'เวลาไม่ถูกต้อง';
  if (future && startMs(s.d, s.h) <= Date.now()) return 'ช่วงเวลานี้ผ่านไปแล้ว';
  return null;
}
