import { db } from './db';
import { addDays } from './time';

// ก๊วนประจำ: ล็อกทุกสัปดาห์ไปเรื่อยๆ จนกว่าแอดมินจะลบ
// ถ้าบางวันก๊วนไม่มา แอดมินกดงดได้ทีละชั่วโมง หรืองดทั้งวัน (เก็บในตาราง recurring_skips, skip_hour = -1 คืองดทั้งวัน)

const dowOf = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

export async function loadRecurring() {
  const { data, error } = await db()
    .from('recurring_locks')
    .select('id,dow,court_id,start_hour,end_hour,note,created_by,created_at')
    .order('dow')
    .order('court_id')
    .order('start_hour');
  if (error) throw error;
  return data;
}

// กางก๊วนประจำออกเป็นรายช่อง ในช่วงวันที่ from..to (รวมทั้งสองวัน)
// คืน [{ d, c, h, lockId, note }]
export async function expandRecurring(from, to) {
  const locks = await loadRecurring();
  if (!locks.length) return [];
  const { data: skips, error } = await db()
    .from('recurring_skips')
    .select('lock_id,skip_date,skip_hour')
    .gte('skip_date', from)
    .lte('skip_date', to);
  if (error) throw error;
  const skipped = new Set(skips.map((s) => `${s.lock_id}|${s.skip_date}|${s.skip_hour}`));
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const dow = dowOf(d);
    for (const l of locks) {
      if (l.dow !== dow || skipped.has(`${l.id}|${d}|-1`)) continue;
      for (let h = l.start_hour; h < l.end_hour; h++) {
        if (!skipped.has(`${l.id}|${d}|${h}`)) out.push({ d, c: l.court_id, h, lockId: l.id, note: l.note });
      }
    }
  }
  return out;
}

export { dowOf };
