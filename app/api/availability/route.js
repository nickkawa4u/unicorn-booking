import { db } from '@/lib/db';
import { ok, guard } from '@/lib/http';
import { bkk, addDays } from '@/lib/time';
import { loadRules, loadRefundHours, loadAdvanceDays } from '@/lib/rules';
import { expireOld } from '@/lib/expire';
import { expandRecurring } from '@/lib/recurring';

export const dynamic = 'force-dynamic';

export const GET = guard(async () => {
  await expireOld();
  const today = bkk().iso;
  const days = await loadAdvanceDays();
  const last = addDays(today, days - 1);
  const [rules, refundHours, bk, rec] = await Promise.all([
    loadRules(),
    loadRefundHours(),
    db()
      .from('bookings')
      .select('booking_date,court_id,start_hour,kind,note')
      .in('status', ['pending', 'confirmed'])
      .gte('booking_date', today)
      .lte('booking_date', last),
    expandRecurring(today, last),
  ]);
  if (bk.error) throw bk.error;
  // ลูกค้าเห็นแค่ว่าช่องไหนไม่ว่าง ไม่เห็นชื่อผู้จอง
  const busy = bk.data.map((r) => ({ d: r.booking_date, c: r.court_id, h: r.start_hour, k: r.kind === 'block' ? 'block' : 'booked' }));
  const seen = new Set(busy.map((b) => `${b.d}|${b.c}|${b.h}`));
  for (const r of rec) {
    const k = `${r.d}|${r.c}|${r.h}`;
    if (!seen.has(k)) { seen.add(k); busy.push({ d: r.d, c: r.c, h: r.h, k: 'block' }); }
  }
  return ok({ today, now: Date.now(), days, rules, refundHours, busy });
});
