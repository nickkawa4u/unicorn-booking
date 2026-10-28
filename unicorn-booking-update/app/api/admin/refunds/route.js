import { db } from '@/lib/db';
import { ok, fail, adminGuard } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const GET = adminGuard(async (req) => {
  const { data, error } = await db()
    .from('bookings')
    .select('id,court_id,booking_date,start_hour,refund_status,refund_amount,cancelled_at,orders(customer_name,phone)')
    .in('refund_status', ['due', 'refunded'])
    .order('cancelled_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return ok({
    list: data.map((b) => ({
      id: b.id, c: b.court_id, d: b.booking_date, h: b.start_hour, st: b.refund_status, amount: b.refund_amount,
      name: b.orders && b.orders.customer_name, phone: b.orders && b.orders.phone,
    })),
  });
});
