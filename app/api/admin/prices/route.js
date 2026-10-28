import { db } from '@/lib/db';
import { ok, fail, guard } from '@/lib/http';
import { isAdmin } from '@/lib/auth';
import { loadRules, loadRefundHours, checkRules } from '@/lib/rules';

export const dynamic = 'force-dynamic';

export const GET = guard(async (req) => {
  if (!isAdmin(req)) return fail('ต้องเข้าสู่ระบบ', 401);
  return ok({ rules: await loadRules(), refundHours: await loadRefundHours() });
});

export const PUT = guard(async (req) => {
  if (!isAdmin(req)) return fail('ต้องเข้าสู่ระบบ', 401);
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
  return ok({ ok: true });
});
