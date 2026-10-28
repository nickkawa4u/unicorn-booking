-- Unicorn Badminton v5: งดก๊วนประจำได้ทีละชั่วโมง
-- รันใน Supabase > SQL Editor > Run (รันซ้ำได้ ไม่พัง) ต้องรันก่อนอัปโหลดโค้ดขึ้น GitHub
-- skip_hour = -1 คืองดทั้งวัน, 16-22 คืองดเฉพาะชั่วโมงนั้น
alter table recurring_skips add column if not exists skip_hour int not null default -1;
alter table recurring_skips drop constraint if exists recurring_skips_pkey;
alter table recurring_skips add primary key (lock_id, skip_date, skip_hour);
