import { db } from '@/lib/db';
import { ok, fail, adminGuard } from '@/lib/http';
import { expireOld } from '@/lib/expire';
import { loadRules } from '@/lib/rules';
import { expandRecurring } from '@/lib/recurring';

export const dynamic = 'force-dynamic';

export const GET = adminGuard(async (req) => {
  const date = new URL(req.url).searchParams.get('date') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('วันที่ไม่ถูกต้อง');
  await expireOld();
  const { data, error } = await db()
    .from('bookings')
    .select('id,court_id,start_hour,kind,status,note,price,created_by,orders(customer_name,phone,access_code)')
    .eq('booking_date', date)
    .in('status', ['pending', 'confirmed']);
  if (error) throw error;
  const slots = data.map((b) => ({
    id: b.id, c: b.court_id, h: b.start_hour, kind: b.kind, status: b.status, note: b.note, price: b.price, by: b.created_by,
    name: b.orders && b.orders.customer_name, phone: b.orders && b.orders.phone, code: b.orders && b.orders.access_code,
  }));
  // ก๊วนประจำ: แสดงเฉพาะช่องที่ยังไม่มีการจองจริงทับอยู่
  const taken = new Set(slots.map((s) => `${s.c}|${s.h}`));
  for (const r of await expandRecurring(date, date)) {
    if (taken.has(`${r.c}|${r.h}`)) continue;
    taken.add(`${r.c}|${r.h}`);
    slots.push({ id: null, lockId: r.lockId, c: r.c, h: r.h, kind: 'recurring', status: 'confirmed', note: r.note, price: 0 });
  }
  return ok({ slots, rules: await loadRules() });
});
