# Unicorn Badminton - ระบบจองสนาม

Next.js + Supabase + SlipOK + LINE OA

## ค่าที่ต้องตั้งใน Vercel (Settings > Environment Variables)
ดูรายชื่อใน `.env.example` ห้ามใส่ค่าจริงลงในไฟล์ในโค้ด

## ฐานข้อมูล
รัน `schema_v2.sql` แล้วตามด้วย `schema_v3.sql` ใน Supabase SQL Editor (v3 เพิ่มคอลัมน์ยกเลิก/คืนเงินรายชั่วโมง)

## หน้าเว็บ
- `/` หน้าจองของลูกค้า (ไฟล์ `public/booking.html`)
- `/admin` หลังบ้าน (ไฟล์ `public/admin.html`)
- `/api/line/webhook` ใส่เป็น Webhook URL ของ LINE OA
