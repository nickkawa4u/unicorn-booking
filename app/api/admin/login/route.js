import { NextResponse } from 'next/server';
import { guard, fail } from '@/lib/http';
import { passwordOk, makeToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = guard(async (req) => {
  const body = await req.json().catch(() => null);
  if (!body || !passwordOk(body.password)) return fail('รหัสผ่านไม่ถูกต้อง', 401);
  const res = NextResponse.json({ ok: true });
  res.cookies.set('adm', makeToken(), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 12 * 3600 });
  return res;
});
