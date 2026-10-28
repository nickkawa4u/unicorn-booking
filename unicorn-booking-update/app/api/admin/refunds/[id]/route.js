import { db } from '@/lib/db';
import { ok, fail, adminGuard } from '@/lib/http';

export const dynamic = 'force-dynamic';

export const POST = adminGuard(async (req, { params }) => {
  const body = await req.json().catch(() => null);
  const done = !!(body && body.done);
  const { error } = await db()
    .from('bookings')
    .update({ refund_status: done ? 'refunded' : 'due' })
    .eq('id', params.id)
    .in('refund_status', ['due', 'refunded']);
  if (error) throw error;
  return ok({ ok: true });
});
