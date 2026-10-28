-- Unicorn Badminton v4: แอดมินหลายคน + ก๊วนประจำ (ล็อกทุกสัปดาห์) + ตั้งจำนวนวันจองล่วงหน้า
-- รันใน Supabase > SQL Editor > Run (รันซ้ำได้ ไม่พัง)

-- แอดมินทั่วไป (เจ้าของร้านใช้ชื่อ admin + ADMIN_PASSWORD ใน Vercel ไม่ได้อยู่ในตารางนี้)
create table if not exists admins (
  id bigserial primary key,
  username text not null unique,
  pass_hash text not null,
  created_at timestamptz not null default now()
);

-- ก๊วนประจำ: ล็อกทุกสัปดาห์ (dow 0 = อาทิตย์ ... 6 = เสาร์)
create table if not exists recurring_locks (
  id bigserial primary key,
  dow int not null check (dow between 0 and 6),
  court_id int not null check (court_id between 1 and 7),
  start_hour int not null,
  end_hour int not null,
  note text not null default '',
  created_by text,
  created_at timestamptz not null default now(),
  check (start_hour >= 16 and end_hour <= 23 and start_hour < end_hour)
);

-- วันที่ก๊วนประจำงด (ปลดล็อกเฉพาะวันนั้น)
create table if not exists recurring_skips (
  lock_id bigint not null references recurring_locks(id) on delete cascade,
  skip_date date not null,
  created_by text,
  created_at timestamptz not null default now(),
  primary key (lock_id, skip_date)
);

-- บันทึกว่าแอดมินคนไหนล็อก/ปลดล็อก
alter table bookings
  add column if not exists created_by text,
  add column if not exists cancelled_by text;

-- จองล่วงหน้าได้ 14 วัน (แก้ได้ในหลังบ้าน แท็บราคา)
insert into settings (key, value) values ('advance_days', '14') on conflict (key) do nothing;

-- ปิดไม่ให้เข้าถึงตารางใหม่จากภายนอก (เว็บใช้ service role key ซึ่งผ่านได้อยู่แล้ว)
alter table admins enable row level security;
alter table recurring_locks enable row level security;
alter table recurring_skips enable row level security;
