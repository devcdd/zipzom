-- LH 공고 수집 + 마이홈 중복 병합. 이미 만들어진 DB에 psql로 수동 적용한다.
--   docker compose exec -T db psql -U zipzom -d zipzom -f - < db/migrations/002_lh_merge.sql
-- 재실행해도 안전하다.

-- 같은 공고가 마이홈·LH 양쪽에 올라온다. 정보가 많은 쪽을 대표로 두고 나머지를 여기로 가리킨다
alter table notices add column if not exists duplicate_of bigint references notices(id) on delete set null;
-- 자동 판정이 틀렸을 때 어드민이 끄면 다음 실행에서 다시 묶지 않는다
alter table notices add column if not exists merge_ignored boolean not null default false;
create index if not exists notices_duplicate_of_idx on notices (duplicate_of) where duplicate_of is not null;
