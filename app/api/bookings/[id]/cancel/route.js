import { db } from '@/lib/db';
import { ok, fail, guard } from '@/lib/http';
import { startMs } from '@/lib/time';
import { loadRefundHours } from '@/lib/rules';

export const dynamic = 'force-dynamic';

export const POST = guard(async (req, { params }) => {
  const body = await req.json().catch(() => null);
  const owner = String((body && body.owner) || '');
  const { data: b } = await db().from('bookings').select('*, orders(line_user_id,status)').eq('id', params.id).maybeSingle();
  if (!b || !b.orders || b.orders.line_user_id !== owner || b.orders.status !== 'paid') return fail('ไม่พบรายการจอง', 404);
  if (b.status !== 'confirmed') return fail('รายการนี้ยกเลิกไปแล้ว', 409);

  const hoursLeft = (startMs(b.booking_date, b.start_hour) - Date.now()) / 36e5;
  if (hoursLeft <= 0) return fail('เลยเวลาเริ่มแล้ว ยกเลิกไม่ได้');
  const refundable = hoursLeft >= (await loadRefundHours());

  const { error } = await db()
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      refund_status: refundable ? 'due' : 'none',
      refund_amount: refundable ? b.price : 0,
    })
    .eq('id', b.id)
    .eq('status', 'confirmed');
  if (error) throw error;
  return ok({ ok: true, refund: refundable, amount: refundable ? b.price : 0 });
});
