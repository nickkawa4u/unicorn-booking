import crypto from 'crypto';
import { db } from '@/lib/db';
import { ok, fail, guard } from '@/lib/http';
import { verifySlip } from '@/lib/slipok';
import { expireOld } from '@/lib/expire';

export const dynamic = 'force-dynamic';

export const POST = guard(async (req, { params }) => {
  const form = await req.formData().catch(() => null);
  if (!form) return fail('ข้อมูลไม่ถูกต้อง');
  const file = form.get('file');
  const owner = String(form.get('owner') || '');
  if (!file || typeof file === 'string' || !file.size) return fail('เลือกรูปสลิปก่อน');
  if (file.size > 5 * 1024 * 1024) return fail('รูปใหญ่เกิน 5 MB');
  if (!String(file.type || '').startsWith('image/')) return fail('แนบได้เฉพาะรูปภาพ');

  await expireOld();
  const { data: order } = await db().from('orders').select('*').eq('id', params.id).maybeSingle();
  if (!order || order.line_user_id !== owner) return fail('ไม่พบรายการจอง', 404);
  if (order.status === 'paid') return ok({ ok: true, code: order.access_code });
  if (order.status !== 'pending') return fail('หมดเวลาล็อกสนามแล้ว กลับไปเลือกใหม่ได้เลย', 410);

  const r = await verifySlip(file, order.total_price);
  if (!r.ok) return fail(r.message, 422);

  const p = await db().from('payments').insert({
    order_id: order.id,
    trans_ref: r.transRef,
    amount: r.amount,
    verified: true,
    verify_result: r.raw,
  });
  if (p.error) {
    if (p.error.code === '23505') return fail('สลิปนี้เคยถูกใช้แล้ว', 409);
    throw p.error;
  }

  const code = String(crypto.randomInt(1000, 10000));
  await db().from('orders').update({ status: 'paid', access_code: code }).eq('id', order.id);
  await db().from('bookings').update({ status: 'confirmed' }).eq('order_id', order.id).eq('status', 'pending');
  return ok({ ok: true, code });
});
