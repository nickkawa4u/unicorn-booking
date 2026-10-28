import { NextResponse } from 'next/server';

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
