import { NextResponse } from 'next/server';
import { getAdmin } from './auth';

export const ok = (data = {}, status = 200) => NextResponse.json(data, { status });
export const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });

export function guard(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      console.error(e);
      return fail('ระบบขัดข้อง ลองใหม่อีกครั้ง', 500);
    }
  };
}

// สำหรับ API หลังบ้าน: ownerOnly = true คือเฉพาะเจ้าของร้าน
export function adminGuard(fn, { ownerOnly = false } = {}) {
  return guard(async (req, ctx) => {
    const me = await getAdmin(req);
    if (!me) return fail('ต้องเข้าสู่ระบบ', 401);
    if (ownerOnly && me.role !== 'owner') return fail('เฉพาะเจ้าของร้านเท่านั้น', 403);
    return fn(req, ctx, me);
  });
}
