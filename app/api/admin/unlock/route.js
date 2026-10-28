import { db } from '@/lib/db';
import { ok, fail, adminGuard } from '@/lib/http';
import { bkk } from '@/lib/time';

export const dynamic = 'force-dynamic';

// ปลดล็อก 1 ช่อง
// - ล็อกธรรมดา: ส่ง { id }
// - ก๊วนประจำ: ส่ง { lockId, d } = งดเฉพาะวันนั้น สัปดาห์อื่นยังล็อกอยู่ (ส่ง undo: true เพื่อล็อกวันนั้นคืน)
export const POST = adminGuard(async (req, ctx, me) => {
  const body = await req.json().catch(() => null);
  if (!body) return fail('ข้อมูลไม่ถูกต้อง');

  if (body.lockId) {
    const lockId = Number(body.lockId);
    const d = String(body.d || '');
    if (!Number.isInteger(lockId) || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return fail('ข้อมูลไม่ถูกต้อง');
    if (body.undo) {
      const { error } = await db().from('recurring_skips').delete().eq('lock_id', lockId).eq('skip_date', d);
      if (error) throw error;
      return ok({ ok: true });
    }
    if (d < bkk().iso) return fail('วันนี้ผ่านไปแล้ว');
    const { error } = await db().from('recurring_skips').upsert({ lock_id: lockId, skip_date: d, created_by: me.u });
    if (error) throw error;
    return ok({ ok: true });
  }

  const id = String(body.id || '');
  if (!id) return fail('ข้อมูลไม่ถูกต้อง');
  const { error } = await db()
    .from('bookings')
    .update({ status: 'cancelled', cancelled_by: me.u, cancelled_at: new Date().toISOString() })
    .eq('id', id)
    .eq('kind', 'block');
  if (error) throw error;
  return ok({ ok: true });
});
