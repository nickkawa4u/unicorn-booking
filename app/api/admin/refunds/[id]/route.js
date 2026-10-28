import { db } from '@/lib/db';
import { ok, fail, guard } from '@/lib/http';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = guard(async (req, { params }) => {
  if (!isAdmin(req)) return fail('ต้องเข้าสู่ระบบ', 401);
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
