import QRCode from 'qrcode';
import generatePayload from 'promptpay-qr';
import { db } from '@/lib/db';
import { ok, fail, guard } from '@/lib/http';
import { checkSlot } from '@/lib/time';
import { loadRules, priceOf, loadAdvanceDays } from '@/lib/rules';
import { expandRecurring } from '@/lib/recurring';
import { expireOld } from '@/lib/expire';

export const dynamic = 'force-dynamic';

export const POST = guard(async (req) => {
  const body = await req.json().catch(() => null);
  if (!body) return fail('ข้อมูลไม่ถูกต้อง');
  const slots = Array.isArray(body.slots) ? body.slots : [];
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').replace(/\D/g, '');
  const owner = String(body.owner || '');

  if (slots.length < 1 || slots.length > 12) return fail('เลือกได้ครั้งละ 1-12 ชั่วโมง');
  if (name.length < 2 || name.length > 60) return fail('กรอกชื่อผู้จอง');
  if (!/^0\d{8,9}$/.test(phone)) return fail('กรอกเบอร์โทรให้ถูกต้อง');
  if (owner.length < 16 || owner.length > 64) return fail('ข้อมูลไม่ถูกต้อง');

  const maxAhead = (await loadAdvanceDays()) - 1;
  const seen = new Set();
  for (const s of slots) {
    const e = checkSlot(s, { maxAhead });
    if (e) return fail(e);
    const k = `${s.d}|${s.c}|${s.h}`;
    if (seen.has(k)) return fail('มีช่องซ้ำกัน');
    seen.add(k);
  }

  // ห้ามจองทับเวลาก๊วนประจำ
  const ds = slots.map((s) => s.d).sort();
  const rec = new Set((await expandRecurring(ds[0], ds[ds.length - 1])).map((r) => `${r.d}|${r.c}|${r.h}`));
  if ([...seen].some((k) => rec.has(k))) return fail('ช่องที่เลือกเป็นเวลาของก๊วนประจำ เลือกช่องอื่นได้เลย', 409);

  await expireOld();
  const rules = await loadRules();
  const priced = slots.map((s) => ({ ...s, price: priceOf(rules, s.h) }));
  if (priced.some((s) => !s.price)) return fail('ยังไม่ได้ตั้งราคาสำหรับช่วงเวลานี้');
  const total = priced.reduce((a, s) => a + s.price, 0);
  const expiresAt = new Date(Date.now() + 10 * 60e3).toISOString();

  const o = await db()
    .from('orders')
    .insert({ line_user_id: owner, customer_name: name, phone, total_price: total, status: 'pending', expires_at: expiresAt })
    .select('id')
    .single();
  if (o.error) throw o.error;

  // insert ครั้งเดียว: ถ้ามีช่องไหนชน ทั้งชุดจะไม่ถูกบันทึก
  const b = await db()
    .from('bookings')
    .insert(priced.map((s) => ({ court_id: s.c, booking_date: s.d, start_hour: s.h, kind: 'customer', status: 'pending', order_id: o.data.id, price: s.price })));
  if (b.error) {
    await db().from('orders').delete().eq('id', o.data.id);
    if (b.error.code === '23505') return fail('ช่องที่เลือกมีคนจองไปแล้ว เลือกช่องอื่นได้เลย', 409);
    throw b.error;
  }

  const payload = generatePayload(process.env.PROMPTPAY_ID, { amount: total });
  const qr = await QRCode.toDataURL(payload, { margin: 1, width: 360 });
  return ok({ orderId: o.data.id, expiresAt, total, qr });
});
