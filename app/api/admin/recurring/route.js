import { db } from '@/lib/db';
import { ok, fail, adminGuard } from '@/lib/http';
import { bkk, addDays } from '@/lib/time';
import { loadRecurring, dowOf } from '@/lib/recurring';

export const dynamic = 'force-dynamic';

// รายการก๊วนประจำ + วันที่งดล็อกที่ยังไม่ผ่าน
export const GET = adminGuard(async () => {
  const today = bkk().iso;
  const [locks, sk] = await Promise.all([
    loadRecurring(),
    db().from('recurring_skips').select('lock_id,skip_date').gte('skip_date', today).order('skip_date'),
  ]);
  if (sk.error) throw sk.error;
  const list = locks.map((l) => ({
    id: l.id, dow: l.dow, c: l.court_id, from: l.start_hour, to: l.end_hour, note: l.note, by: l.created_by,
    skips: sk.data.filter((s) => s.lock_id === l.id).map((s) => s.skip_date),
  }));
  return ok({ list, today });
});

// เพิ่มก๊วนประจำ { dow, courts: [1,2], from, to, note }
export const POST = adminGuard(async (req, ctx, me) => {
  const b = await req.json().catch(() => null);
  if (!b) return fail('ข้อมูลไม่ถูกต้อง');
  const dow = Number(b.dow), from = Number(b.from), to = Number(b.to);
  const courts = Array.isArray(b.courts) ? [...new Set(b.courts.map(Number))] : [];
  const note = String(b.note || '').trim().slice(0, 40);
  if (!Number.isInteger(dow) || dow < 0 || dow > 6) return fail('เลือกวัน');
  if (!courts.length || courts.some((c) => !Number.isInteger(c) || c < 1 || c > 7)) return fail('เลือกสนามอย่างน้อย 1 สนาม');
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 16 || to > 23 || from >= to) return fail('เวลาไม่ถูกต้อง เวลาจบต้องมากกว่าเวลาเริ่ม');
  if (!note) return fail('กรอกชื่อก๊วน');

  // ห้ามซ้อนกับก๊วนประจำเดิม
  const old = await loadRecurring();
  const clash = old.find((l) => l.dow === dow && courts.includes(l.court_id) && l.start_hour < to && from < l.end_hour);
  if (clash) return fail(`สนาม ${clash.court_id} ช่วงเวลานี้เป็นของก๊วน "${clash.note}" อยู่แล้ว`, 409);

  const ins = await db()
    .from('recurring_locks')
    .insert(courts.map((c) => ({ dow, court_id: c, start_hour: from, end_hour: to, note, created_by: me.u })));
  if (ins.error) throw ins.error;

  // ลูกค้าที่จองช่องเหล่านี้ไว้ก่อนแล้ว ยังได้สนามตามเดิม แจ้งแอดมินให้รู้
  const today = bkk().iso;
  const { data: bk, error } = await db()
    .from('bookings')
    .select('booking_date,court_id,start_hour')
    .eq('kind', 'customer')
    .in('status', ['pending', 'confirmed'])
    .in('court_id', courts)
    .gte('start_hour', from)
    .lt('start_hour', to)
    .gte('booking_date', today)
    .lte('booking_date', addDays(today, 60));
  if (error) throw error;
  const hit = bk.filter((x) => dowOf(x.booking_date) === dow);
  return ok({ ok: true, conflicts: hit.length, conflictDates: [...new Set(hit.map((x) => x.booking_date))].sort() });
});

// ลบก๊วนประจำ ?id=
export const DELETE = adminGuard(async (req) => {
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id)) return fail('ข้อมูลไม่ถูกต้อง');
  const { error } = await db().from('recurring_locks').delete().eq('id', id);
  if (error) throw error;
  return ok({ ok: true });
});
