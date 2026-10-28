import { db } from '@/lib/db';
import { ok, fail, guard } from '@/lib/http';
import { isAdmin } from '@/lib/auth';
import { checkSlot } from '@/lib/time';

export const dynamic = 'force-dynamic';

export const POST = guard(async (req) => {
  if (!isAdmin(req)) return fail('ต้องเข้าสู่ระบบ', 401);
  const body = await req.json().catch(() => null);
  const slots = body && Array.isArray(body.slots) ? body.slots : [];
  const note = String((body && body.note) || 'ล็อกโดยแอดมิน').slice(0, 40);
  if (slots.length < 1 || slots.length > 50) return fail('เลือกช่องที่จะล็อกก่อน');
  for (const s of slots) {
    const e = checkSlot(s, { future: false });
    if (e) return fail(e);
  }
  const { error } = await db()
    .from('bookings')
    .insert(slots.map((s) => ({ court_id: s.c, booking_date: s.d, start_hour: s.h, kind: 'block', status: 'confirmed', note, price: 0 })));
  if (error) {
    if (error.code === '23505') return fail('มีบางช่องถูกจองหรือถูกล็อกไปแล้ว รีเฟรชแล้วลองใหม่', 409);
    throw error;
  }
  return ok({ ok: true, count: slots.length });
});
