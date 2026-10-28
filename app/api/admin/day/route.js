import { db } from '@/lib/db';
import { ok, fail, guard } from '@/lib/http';
import { isAdmin } from '@/lib/auth';
import { expireOld } from '@/lib/expire';
import { loadRules } from '@/lib/rules';

export const dynamic = 'force-dynamic';

export const GET = guard(async (req) => {
  if (!isAdmin(req)) return fail('ต้องเข้าสู่ระบบ', 401);
  const date = new URL(req.url).searchParams.get('date') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('วันที่ไม่ถูกต้อง');
  await expireOld();
  const { data, error } = await db()
    .from('bookings')
    .select('id,court_id,start_hour,kind,status,note,price,orders(customer_name,phone,access_code)')
    .eq('booking_date', date)
    .in('status', ['pending', 'confirmed']);
  if (error) throw error;
  const slots = data.map((b) => ({
    id: b.id, c: b.court_id, h: b.start_hour, kind: b.kind, status: b.status, note: b.note, price: b.price,
    name: b.orders && b.orders.customer_name, phone: b.orders && b.orders.phone, code: b.orders && b.orders.access_code,
  }));
  return ok({ slots, rules: await loadRules() });
});
