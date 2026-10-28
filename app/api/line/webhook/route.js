import crypto from 'crypto';

export const dynamic = 'force-dynamic';

async function reply(token, text) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify({ replyToken: token, messages: [{ type: 'text', text }] }),
  });
}

export async function POST(req) {
  const raw = await req.text();
  const sig = req.headers.get('x-line-signature') || '';
  const good = crypto.createHmac('sha256', process.env.LINE_CHANNEL_SECRET || '').update(raw).digest('base64');
  const a = Buffer.from(sig);
  const b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return new Response('bad signature', { status: 401 });

  const site = process.env.SITE_URL || new URL(req.url).origin;
  let body = {};
  try {
    body = JSON.parse(raw);
  } catch (e) {}
  for (const ev of body.events || []) {
    if (!ev.replyToken) continue;
    try {
      if (ev.type === 'follow') {
        await reply(ev.replyToken, `ยินดีต้อนรับสู่ Unicorn Badminton\nจองสนามได้ที่ ${site}`);
      } else if (ev.type === 'message') {
        // ตอบกลับด้วย reply message ไม่นับโควต้าข้อความ
        await reply(ev.replyToken, `จองสนาม: ${site}\nดูและยกเลิกการจอง: ${site}/#my-bookings`);
      }
    } catch (e) {
      console.error(e);
    }
  }
  return new Response('ok');
}
