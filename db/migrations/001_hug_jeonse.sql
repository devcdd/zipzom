-- HUG 든든전세 공고 수집 대응. 이미 만들어진 DB에 psql로 수동 적용한다 (schema.sql은 첫 기동에만 실행됨).
--   docker compose exec -T db psql -U zipzom -d zipzom -f - < db/migrations/001_hug_jeonse.sql
-- 재실행해도 안전하다.

alter type notice_source add value if not exists 'HUG';

alter table eligibility_rules add column if not exists supply_type text;
update eligibility_rules set supply_type = '행복주택' where supply_type is null;
alter table eligibility_rules alter column supply_type set not null;

-- 자격이 '공고일 기준 무주택세대구성원' 뿐이라 나머지 조건 컬럼을 비운다 (2026.7.24 수시 공고문 확인)
insert into eligibility_rules
  (code, supply_type, label, min_age, max_age, requires_unmarried, marriage_within_years, child_max_age,
   income_pct, dual_income_pct, asset_limit, car_limit, max_residence_years, effective_from)
values ('HUG_JEONSE', '든든전세', 'HUG 든든전세', null, null, false, null, null, null, null, null, null, 8, '2026-01-01')
on conflict (code) do update set supply_type = excluded.supply_type, label = excluded.label;
