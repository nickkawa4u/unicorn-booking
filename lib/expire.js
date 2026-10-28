import { db } from './db';

// ปล่อยช่องที่ล็อกไว้ตอนรอจ่ายเงินแต่หมดเวลาแล้ว (ล็อก 10 นาที + ผ่อนผัน 2 นาทีให้คนที่เพิ่งโอน)
export async function expireOld() {
  const cutoff = new Date(Date.now() - 2 * 60e3).toISOString();
  const { data } = await db().from('orders').select('id').eq('status', 'pending').lt('expires_at', cutoff);
  if (!data || !data.length) return;
  const ids = data.map((o) => o.id);
  await db().from('orders').update({ status: 'expired' }).in('id', ids);
  await db().from('bookings').update({ status: 'cancelled' }).in('order_id', ids).eq('status', 'pending');
}
