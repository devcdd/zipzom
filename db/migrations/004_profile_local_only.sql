-- 프로필 서버 미저장 옵션 + 추가 조건 필드 + 산업단지근로자 계층. 재실행 안전.

alter table users add column if not exists profile_local_only boolean not null default false; -- 체크 시 생년월일만 서버, 나머지는 브라우저
alter table users add column if not exists birth_date date;

alter table user_profiles add column if not exists has_subscription_account boolean not null default false; -- 주택청약종합저축 가입
alter table user_profiles add column if not exists is_industrial_worker boolean not null default false;     -- 산업단지 입주기업 근로자
alter table user_profiles add column if not exists employed_years smallint;                                 -- 재직기간(년). 사회초년생 판정용

insert into eligibility_rules
  (code, supply_type, label, min_age, max_age, requires_unmarried, marriage_within_years, child_max_age,
   income_pct, dual_income_pct, asset_limit, car_limit, max_residence_years, effective_from)
values ('INDUSTRIAL', '행복주택', '산업단지근로자', null, null, false, null, null, 100, null, 345000000, 45420000, 10, '2026-01-01')
on conflict (code) do nothing;
