import { NextResponse } from 'next/server';
import { guard, fail } from '@/lib/http';
import { login, makeToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = guard(async (req) => {
  const body = await req.json().catch(() => null);
  const me = body && (await login(body.username, body.password));
  if (!me) return fail('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
  const res = NextResponse.json({ ok: true, u: me.u, role: me.role });
  res.cookies.set('adm', makeToken(me.u, me.role), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 12 * 3600 });
  return res;
});
