import { db } from '@/lib/db';
import { ok, fail, adminGuard } from '@/lib/http';
import { loadRules, loadRefundHours, loadAdvanceDays, checkRules } from '@/lib/rules';

export const dynamic = 'force-dynamic';

// ราคาและการตั้งค่า: เฉพาะเจ้าของร้าน
export const GET = adminGuard(async () => {
  const [rules, refundHours, advanceDays] = await Promise.all([loadRules(), loadRefundHours(), loadAdvanceDays()]);
  return ok({ rules, refundHours, advanceDays });
}, { ownerOnly: true });

export const PUT = adminGuard(async (req) => {
  const body = await req.json().catch(() => null);
  if (!body) return fail('ข้อมูลไม่ถูกต้อง');

  if (body.rules !== undefined) {
    const e = checkRules(body.rules);
    if (e) return fail(e);
    const rules = body.rules.map((r) => ({ start_hour: +r.from, end_hour: +r.to, price: +r.price })).sort((a, b) => a.start_hour - b.start_hour);
    const del = await db().from('price_rules').delete().gte('id', 0);
    if (del.error) throw del.error;
    const ins = await db().from('price_rules').insert(rules);
    if (ins.error) throw ins.error;
  }
  if (body.refundHours !== undefined) {
    const n = Number(body.refundHours);
    if (!Number.isInteger(n) || n < 0 || n > 168) return fail('จำนวนชั่วโมงต้องเป็นเลข 0 ถึง 168');
    const up = await db().from('settings').upsert({ key: 'refund_hours', value: String(n) });
    if (up.error) throw up.error;
  }
  if (body.advanceDays !== undefined) {
    const n = Number(body.advanceDays);
    if (!Number.isInteger(n) || n < 1 || n > 60) return fail('จำนวนวันต้องเป็นเลข 1 ถึง 60');
    const up = await db().from('settings').upsert({ key: 'advance_days', value: String(n) });
    if (up.error) throw up.error;
  }
  return ok({ ok: true });
}, { ownerOnly: true });
