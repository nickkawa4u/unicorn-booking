import { db } from '@/lib/db';
import { ok, adminGuard } from '@/lib/http';
import { bkk, addDays } from '@/lib/time';

export const dynamic = 'force-dynamic';

// รายได้: เฉพาะเจ้าของร้าน
export const GET = adminGuard(async () => {
  const today = bkk().iso;
  const from = addDays(today, -6);
  // นับเฉพาะรายการที่ชำระแล้วและไม่ได้คืนเงิน
  const { data, error } = await db()
    .from('bookings')
    .select('booking_date,court_id,start_hour,price,orders!inner(status)')
    .eq('kind', 'customer')
    .eq('refund_status', 'none')
    .eq('orders.status', 'paid')
    .gte('booking_date', from)
    .lte('booking_date', today);
  if (error) throw error;
  const due = await db().from('bookings').select('refund_amount').eq('refund_status', 'due');
  if (due.error) throw due.error;
  return ok({
    today,
    now: Date.now(),
    rows: data.map((b) => ({ d: b.booking_date, c: b.court_id, h: b.start_hour, price: b.price })),
    dueAmount: due.data.reduce((a, r) => a + r.refund_amount, 0),
  });
}, { ownerOnly: true });
