-- Unicorn Badminton: เพิ่มคอลัมน์สำหรับยกเลิกและคืนเงินรายชั่วโมง
-- รันใน Supabase > SQL Editor > Run (รันซ้ำได้ ไม่พัง)
alter table bookings
  add column if not exists cancelled_at timestamptz,
  add column if not exists refund_status text not null default 'none'
    check (refund_status in ('none', 'due', 'refunded')),
  add column if not exists refund_amount int not null default 0;
