import { db } from '@/lib/db';
import { ok, fail, guard } from '@/lib/http';

export const dynamic = 'force-dynamic';

// ลูกค้ากดกลับก่อนโอนเงิน: ปล่อยช่องที่ล็อกไว้ทันที
export const POST = guard(async (req, { params }) => {
  const body = await req.json().catch(() => null);
  const owner = String((body && body.owner) || '');
  const { data: order } = await db().from('orders').select('id,line_user_id,status').eq('id', params.id).maybeSingle();
  if (!order || order.line_user_id !== owner) return fail('ไม่พบรายการจอง', 404);
  if (order.status !== 'pending') return ok({ ok: true });
  await db().from('orders').update({ status: 'cancelled' }).eq('id', order.id).eq('status', 'pending');
  await db().from('bookings').update({ status: 'cancelled' }).eq('order_id', order.id).eq('status', 'pending');
  return ok({ ok: true });
});
