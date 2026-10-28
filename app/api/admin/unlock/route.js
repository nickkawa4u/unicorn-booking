import { db } from '@/lib/db';
import { ok, fail, guard } from '@/lib/http';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = guard(async (req) => {
  if (!isAdmin(req)) return fail('ต้องเข้าสู่ระบบ', 401);
  const body = await req.json().catch(() => null);
  const id = String((body && body.id) || '');
  const { error } = await db().from('bookings').update({ status: 'cancelled' }).eq('id', id).eq('kind', 'block');
  if (error) throw error;
  return ok({ ok: true });
});
