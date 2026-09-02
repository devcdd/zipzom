-- 공고별 입주자격(계층 × 기준) + 단지별 배정 계층. 재실행 안전.
--   docker exec -i zipzom-db psql -U zipzom -d zipzom < db/migrations/003_eligibility.sql

create table if not exists notice_eligibility (
  notice_id        bigint not null references notices(id) on delete cascade,
  code             text   not null,      -- eligibility_rules.code 또는 INDUSTRIAL·OTHER
  label            text   not null,      -- 공고문 표기 계층명
  age_min          smallint,
  age_max          smallint,
  income_pct       smallint,
  dual_income_pct  smallint,
  asset_limit      bigint,
  car_limit        bigint,
  exempt           text[] not null default '{}', -- 공고가 명시적으로 배제한 요건: income·asset·car
  conditions       text[] not null default '{}',
  primary key (notice_id, code)
);

alter table notice_houses add column if not exists eligible_groups text[];
alter table notice_extractions add column if not exists eligibility jsonb;
alter table notice_eligibility add column if not exists exempt text[] not null default '{}';
