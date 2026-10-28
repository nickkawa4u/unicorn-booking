import crypto from 'crypto';

const secret = () => process.env.SESSION_SECRET || '';
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');

export function makeToken() {
  const exp = String(Date.now() + 12 * 3600e3);
  return exp + '.' + sign(exp);
}

function checkToken(t) {
  if (!t || !secret()) return false;
  const [exp, sig] = t.split('.');
  if (!exp || !sig) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(exp) > Date.now();
}

export function isAdmin(req) {
  const c = req.headers.get('cookie') || '';
  const m = c.match(/(?:^|;\s*)adm=([^;]+)/);
  return !!m && checkToken(decodeURIComponent(m[1]));
}

export function passwordOk(p) {
  const want = process.env.ADMIN_PASSWORD || '';
  if (!want) return false;
  const a = crypto.createHash('sha256').update(String(p)).digest();
  const b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}
