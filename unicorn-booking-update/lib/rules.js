import { db } from './db';

export async function loadRules() {
  const { data, error } = await db().from('price_rules').select('start_hour,end_hour,price').order('start_hour');
  if (error) throw error;
  return data.map((r) => ({ from: r.start_hour, to: r.end_hour, price: r.price }));
}

async function loadNumber(key, def, min, max) {
  const { data } = await db().from('settings').select('value').eq('key', key).maybeSingle();
  const n = parseInt(data && data.value, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : def;
}

export const loadRefundHours = () => loadNumber('refund_hours', 24, 0, 168);

// ลูกค้าจองล่วงหน้าได้กี่วัน (นับวันนี้เป็นวันที่ 1)
export const loadAdvanceDays = () => loadNumber('advance_days', 14, 1, 60);

export function priceOf(rules, h) {
  const r = rules.find((x) => h >= x.from && h < x.to);
  return r ? r.price : 0;
}

// คืนข้อความ error หรือ '' ถ้าช่วงราคาถูกต้อง (ต้องครอบคลุม 16-23 ต่อเนื่อง ไม่ซ้อน)
export function checkRules(rules) {
  if (!Array.isArray(rules) || rules.length < 1 || rules.length > 7) return 'ช่วงราคาไม่ถูกต้อง';
  const d = rules.map((r) => ({ from: +r.from, to: +r.to, price: +r.price })).sort((a, b) => a.from - b.from);
  for (let i = 0; i < d.length; i++) {
    const r = d[i];
    if (!Number.isInteger(r.price) || r.price < 1) return 'ราคาต้องมากกว่า 0 บาท';
    if (!(r.from >= 16 && r.to <= 23 && r.from < r.to)) return 'เวลาต้องอยู่ระหว่าง 16:00-23:00 และเวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด';
    if (i === 0 && r.from !== 16) return 'ช่วงแรกต้องเริ่มที่ 16:00';
    if (i > 0 && r.from !== d[i - 1].to) return r.from < d[i - 1].to ? 'มีช่วงราคาซ้อนกัน' : 'มีเวลาที่ไม่มีราคา';
    if (i === d.length - 1 && r.to !== 23) return 'ช่วงสุดท้ายต้องสิ้นสุดที่ 23:00';
  }
  return '';
}
