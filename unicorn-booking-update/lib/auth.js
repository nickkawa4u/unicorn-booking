import crypto from 'crypto';
import { db } from './db';

// แอดมินมี 2 แบบ
// - เจ้าของร้าน: ชื่อผู้ใช้ "admin" + รหัส ADMIN_PASSWORD ที่ตั้งใน Vercel (ทำได้ทุกอย่าง)
// - แอดมินทั่วไป: เจ้าของร้านเพิ่มในหน้าหลังบ้าน เก็บในตาราง admins (แก้ราคา/ดูรายได้/จัดการแอดมินไม่ได้)
export const OWNER_USER = 'admin';

const secret = () => process.env.SESSION_SECRET || '';
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');

export function makeToken(u, role) {
  const payload = Buffer.from(JSON.stringify({ u, r: role, exp: Date.now() + 12 * 3600e3 })).toString('base64url');
  return payload + '.' + sign(payload);
}

function readToken(t) {
  if (!t || !secret()) return null;
  const [payload, sig] = t.split('.');
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!p || !p.u || !p.r || !(Number(p.exp) > Date.now())) return null;
    return { u: String(p.u), role: p.r === 'owner' ? 'owner' : 'staff' };
  } catch (e) {
    return null;
  }
}

// คืน { u, role } หรือ null ถ้ายังไม่ได้ล็อกอิน
// แอดมินทั่วไปเช็กกับฐานข้อมูลทุกครั้ง ถ้าเจ้าของร้านลบออกแล้วจะใช้ต่อไม่ได้ทันที
export async function getAdmin(req) {
  const c = req.headers.get('cookie') || '';
  const m = c.match(/(?:^|;\s*)adm=([^;]+)/);
  const me = m && readToken(decodeURIComponent(m[1]));
  if (!me) return null;
  if (me.role === 'owner') return me.u === OWNER_USER ? me : null;
  const { data } = await db().from('admins').select('id').eq('username', me.u).maybeSingle();
  return data ? me : null;
}

function sameText(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

export function hashPassword(p) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(p), salt, 32).toString('hex');
  return `${salt}:${h}`;
}

function checkHash(p, stored) {
  const [salt, h] = String(stored || '').split(':');
  if (!salt || !h) return false;
  const a = Buffer.from(h, 'hex');
  const b = crypto.scryptSync(String(p), salt, 32);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const cleanUser = (u) => String(u || '').trim().toLowerCase();

// คืน { u, role } ถ้าชื่อผู้ใช้และรหัสถูก ไม่งั้น null
export async function login(username, password) {
  const u = cleanUser(username);
  const p = String(password || '');
  if (!u || !p) return null;
  if (u === OWNER_USER) {
    const want = process.env.ADMIN_PASSWORD || '';
    return want && sameText(p, want) ? { u, role: 'owner' } : null;
  }
  const { data } = await db().from('admins').select('username,pass_hash').eq('username', u).maybeSingle();
  if (!data || !checkHash(p, data.pass_hash)) return null;
  return { u: data.username, role: 'staff' };
}
