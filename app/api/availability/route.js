import { db } from '@/lib/db';
import { ok, guard } from '@/lib/http';
import { bkk, addDays } from '@/lib/time';
import { loadRules, loadRefundHours } from '@/lib/rules';
import { expireOld } from '@/lib/expire';

export const dynamic = 'force-dynamic';

export const GET = guard(async () => {
  await expireOld();
  const today = bkk().iso;
  const [rules, refundHours, bk] = await Promise.all([
    loadRules(),
    loadRefundHours(),
    db()
      .from('bookings')
      .select('booking_date,court_id,start_hour,kind,note')
      .in('status', ['pending', 'confirmed'])
      .gte('booking_date', today)
      .lte('booking_date', addDays(today, 13)),
  ]);
  if (bk.error) throw bk.error;
  // ลูกค้าเห็นแค่ว่าช่องไหนไม่ว่าง ไม่เห็นชื่อผู้จอง
  const busy = bk.data.map((r) => ({ d: r.booking_date, c: r.court_id, h: r.start_hour, k: r.kind === 'block' ? 'block' : 'booked' }));
  return ok({ today, now: Date.now(), rules, refundHours, busy });
});
