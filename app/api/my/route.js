import { db } from '@/lib/db';
import { ok, fail, guard } from '@/lib/http';
import { loadRefundHours } from '@/lib/rules';

export const dynamic = 'force-dynamic';

export const GET = guard(async (req) => {
  const owner = new URL(req.url).searchParams.get('owner') || '';
  if (owner.length < 16) return fail('ข้อมูลไม่ถูกต้อง');
  const { data, error } = await db()
    .from('orders')
    .select('id,access_code,created_at,bookings(id,court_id,booking_date,start_hour,price,status,refund_status,refund_amount)')
    .eq('line_user_id', owner)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  const list = [];
  for (const o of data) {
    for (const b of o.bookings) {
      list.push({ id: b.id, c: b.court_id, d: b.booking_date, h: b.start_hour, price: b.price, status: b.status, refund: b.refund_status, code: o.access_code });
    }
  }
  return ok({ list, refundHours: await loadRefundHours(), now: Date.now() });
});
