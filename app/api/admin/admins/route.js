import { db } from '@/lib/db';
import { ok, fail, adminGuard } from '@/lib/http';
import { hashPassword, cleanUser, OWNER_USER } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// จัดการแอดมิน: เฉพาะเจ้าของร้าน
const checkPass = (p) => (String(p || '').length < 6 ? 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว' : '');

export const GET = adminGuard(async () => {
  const { data, error } = await db().from('admins').select('id,username,created_at').order('created_at');
  if (error) throw error;
  return ok({ list: data });
}, { ownerOnly: true });

// เพิ่มแอดมิน { username, password }
export const POST = adminGuard(async (req) => {
  const body = await req.json().catch(() => null);
  const u = cleanUser(body && body.username);
  if (!/^[a-z0-9._-]{3,20}$/.test(u)) return fail('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z ตัวเลข . _ - ยาว 3-20 ตัว');
  if (u === OWNER_USER) return fail('ชื่อนี้สงวนไว้สำหรับเจ้าของร้าน');
  const e = checkPass(body.password);
  if (e) return fail(e);
  const { error } = await db().from('admins').insert({ username: u, pass_hash: hashPassword(body.password) });
  if (error) {
    if (error.code === '23505') return fail('มีชื่อผู้ใช้นี้แล้ว', 409);
    throw error;
  }
  return ok({ ok: true });
}, { ownerOnly: true });

// เปลี่ยนรหัสผ่าน { id, password }
export const PUT = adminGuard(async (req) => {
  const body = await req.json().catch(() => null);
  const e = checkPass(body && body.password);
  if (e) return fail(e);
  const { error } = await db().from('admins').update({ pass_hash: hashPassword(body.password) }).eq('id', Number(body.id));
  if (error) throw error;
  return ok({ ok: true });
}, { ownerOnly: true });

// ลบแอดมิน ?id=
export const DELETE = adminGuard(async (req) => {
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id)) return fail('ข้อมูลไม่ถูกต้อง');
  const { error } = await db().from('admins').delete().eq('id', id);
  if (error) throw error;
  return ok({ ok: true });
}, { ownerOnly: true });
