-- zipzom 스키마 (Postgres 17). docker compose 첫 기동 시 자동 적용.
-- 좌표는 PostGIS 없이 double 컬럼 사용. ponytail: bbox 조회로 충분, 반경/거리순 정밀도 필요해지면 PostGIS

create type notice_source as enum ('MYHOME', 'LH', 'SH', 'HUG');
create type marital_status as enum ('SINGLE', 'MARRIED', 'ENGAGED'); -- ENGAGED = 예비신혼부부

-- ───────────────────────── 사용자 · 주거조건 ─────────────────────────

-- 카카오 로그인 사용자. 비로그인 프로필은 서버에 저장하지 않는다(브라우저 localStorage)
create table users (
  id          uuid primary key default gen_random_uuid(),
  kakao_id    text unique,
  email       text unique,                 -- 카카오 계정 이메일(필수 동의). ADMIN_EMAILS 판정 기준
  nickname    text,
  created_at  timestamptz not null default now()
);

create table user_profiles (
  user_id                      uuid primary key references users(id) on delete cascade,
  birth_date                   date not null,                       -- 만 나이는 조회 시점에 계산
  marital_status               marital_status not null default 'SINGLE',
  married_at                   date,                                -- 혼인신고일 (신혼부부 7년 이내 판정)
  children_count               smallint not null default 0,
  youngest_child_birth_date    date,                                -- 만 6세 이하 자녀 판정. 태아는 출산예정일
  household_size               smallint not null default 1,
  household_monthly_income     bigint not null,                     -- 해당세대 월평균소득 합계 (원)
  dual_income                  boolean not null default false,      -- 맞벌이 → 소득기준 120%
  is_homeless                  boolean not null default true,       -- 무주택세대구성원
  total_assets                 bigint,                              -- 총자산 (원)
  car_value                    bigint,                              -- 자동차가액 (원)
  is_student                   boolean not null default false,
  is_housing_benefit_recipient boolean not null default false,      -- 주거급여수급자
  sido_code                    char(2) not null,                    -- 거주지 (법정동코드 앞 2자리)
  sigungu_code                 char(5),                             -- 거주지 (법정동코드 앞 5자리)
  preferred_sigungu_codes      char(5)[] not null default '{}',     -- 관심 지역. 비어 있으면 거주 시도 전체
  updated_at                   timestamptz not null default now()
);

-- ───────────────────────── 기준 · 코드 ─────────────────────────

-- 법정동코드 시군구 단위 + 각 API별 지역코드 매핑 (마이홈 brtcCode/signguCode ≠ 법정동코드)
create table regions (
  code               char(5) primary key,   -- 시군구 5자리. 시도 행은 'XX000'
  sido_code          char(2) not null,
  name               text not null,         -- 예: 서울특별시 강남구
  myhome_brtc_code   text,
  myhome_signgu_code text,
  lh_cnp_code        text,
  lat                double precision,      -- 지도 초기 중심
  lng                double precision
);
create index on regions (sido_code);

-- 전년도 도시근로자 가구원수별 가구당 월평균소득 100% (원). 매년 3~4월 통계청 발표 후 행 추가
create table income_standards (
  apply_year      smallint not null,
  household_size  smallint not null,   -- 6 = 6인 이상
  amount          bigint not null,
  primary key (apply_year, household_size)
);

-- 공급유형별 입주자격. 공고별 예외(우선공급 등)는 notices.raw로 보완
create table eligibility_rules (
  code                   text primary key,   -- STUDENT | YOUTH | NEWLYWED | SINGLE_PARENT | SENIOR | HOUSING_BENEFIT | HUG_JEONSE
  supply_type            text not null,      -- 이 규칙이 적용되는 notices.supply_type. 규칙 통과 = 해당 공급유형 공고 노출
  label                  text not null,
  min_age                smallint,
  max_age                smallint,
  requires_unmarried     boolean not null default false,
  marriage_within_years  smallint,           -- 신혼부부: 7
  child_max_age          smallint,           -- 신혼부부·한부모: 6
  income_pct             smallint,           -- null = 소득기준 미적용
  dual_income_pct        smallint,           -- 맞벌이 시 대체 %
  bonus_pct_1p           smallint not null default 20,  -- 1인 가구 가산 %p
  bonus_pct_2p           smallint not null default 10,  -- 2인 가구 가산 %p
  asset_limit            bigint,
  car_limit              bigint,             -- 0 = 소유 불가
  max_residence_years    smallint,
  effective_from         date not null
);

-- ───────────────────────── 단지 ─────────────────────────

-- 마이홈 HWSPR04 rentalHouseGwList + 카카오 지오코딩
create table complexes (
  id              bigserial primary key,
  hsmp_sn         text unique,            -- 마이홈 단지 식별자. SH 크롤 단지는 null
  institution     text not null,          -- LH | SH | GH | ...
  name            text not null,
  sido_code       char(2),
  sigungu_code    char(5),
  road_address    text,
  pnu             char(19),
  completed_on    date,
  households      int,
  house_type      text,                   -- 주택유형 (아파트 등)
  supply_type     text,                   -- 공급유형 (행복주택 | 국민임대 | 영구임대 …)
  heating         text,
  building_style  text,
  has_elevator    boolean,
  parking_count   int,
  lat             double precision,
  lng             double precision,
  geocoded_at     timestamptz,
  raw             jsonb,
  updated_at      timestamptz not null default now()
);
create index on complexes (sigungu_code);
create index on complexes (lat, lng);

-- 단지 내 형(타입)별 면적·기본 임대조건. API가 (단지 × 형) 행으로 내려줌
create table complex_unit_types (
  id                        bigserial primary key,
  complex_id                bigint not null references complexes(id) on delete cascade,
  style_name                text not null,     -- 예: 26A
  exclusive_area            numeric(8,2),      -- 전용 ㎡
  common_area               numeric(8,2),      -- 공용 ㎡
  deposit                   bigint,            -- 기본 임대보증금
  monthly_rent              bigint,            -- 기본 월임대료
  convertible_deposit_limit bigint,            -- 전환보증금 한도
  unique (complex_id, style_name)
);

-- ───────────────────────── 공고 ─────────────────────────

-- 소스 무관 정규화. 원본은 raw에 통째로 보관 (필드 추가 시 재파싱 가능)
create table notices (
  id                  bigserial primary key,
  source              notice_source not null,
  source_id           text not null,     -- MYHOME pblancId | LH PAN_ID | SH 게시글 seq
  title               text not null,
  institution         text,              -- 공급기관 LH | SH | ...
  house_type          text,              -- 주택유형: 아파트 | 다가구주택 | 기숙사 (마이홈 houseTyNm)
  supply_type         text,              -- 공급유형: 행복주택 | 든든전세 | 국민임대 … (마이홈 suplyTyNm) ← 필터 기준
  status              text,              -- 공고중 | 접수중 | 접수마감 | 정정공고중
  posted_on           date,
  apply_begin_on      date,
  apply_end_on        date,
  winner_announce_on  date,
  detail_url          text,
  contact             text,
  raw                 jsonb not null,
  first_seen_at       timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (source, source_id)
);
create index on notices (apply_end_on) where status <> '접수마감';
create index on notices (house_type);

-- 공고 1건에 여러 단지가 묶임 (마이홈 houseSn 단위). 지도 마커 = 이 테이블
create table notice_houses (
  id                bigserial primary key,
  notice_id         bigint not null references notices(id) on delete cascade,
  house_sn          text,
  complex_id        bigint references complexes(id),   -- pnu/단지명으로 후속 매칭, 없으면 null
  name              text,
  sido_code         char(2),
  sigungu_code      char(5),
  address           text,
  pnu               char(19),
  total_households  int,
  supply_count      int,
  min_deposit       bigint,
  min_monthly_rent  bigint,
  lat               double precision,
  lng               double precision,
  geocode_failed_at timestamptz,          -- 지오코딩 결과 없음. 재시도 제외
  unique (notice_id, house_sn)
);
create index on notice_houses (sigungu_code);
create index on notice_houses (lat, lng);

-- ───────────────────────── 매칭 · 운영 ─────────────────────────

create table user_notice_matches (
  user_id       uuid   not null references users(id) on delete cascade,
  notice_id     bigint not null references notices(id) on delete cascade,
  matched_rules text[] not null,        -- 충족한 eligibility_rules.code 목록
  reasons       jsonb,                  -- 규칙별 판정 근거 (소득 %, 나이 등)
  matched_at    timestamptz not null default now(),
  notified_at   timestamptz,
  primary key (user_id, notice_id)
);

-- 북마크. 로그인 사용자만 (비로그인은 저장 안 함)
create table user_bookmarks (
  user_id     uuid   not null references users(id) on delete cascade,
  notice_id   bigint not null references notices(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, notice_id)
);

create table sync_runs (
  id           bigserial primary key,
  source       notice_source not null,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  fetched      int,
  upserted     int,
  error        text
);

-- ───────────────────────── 시드 ─────────────────────────

-- 2026년 적용분. 통계청 2025년 수치 미발표로 2025년 적용 금액(2024 기준) 유지 (LH·SH 공고 기준, 2026-09 확인)
insert into income_standards (apply_year, household_size, amount) values
  (2026, 1, 3813363),
  (2026, 2, 5866270),
  (2026, 3, 8168429),
  (2026, 4, 8802202),
  (2026, 5, 9326985),
  (2026, 6, 9906263);

-- 마이홈포털 행복주택 입주자격 안내 (2026-09 확인). 산업단지근로자 계층은 미포함
insert into eligibility_rules
  (code, supply_type, label, min_age, max_age, requires_unmarried, marriage_within_years, child_max_age,
   income_pct, dual_income_pct, asset_limit, car_limit, max_residence_years, effective_from) values
  ('STUDENT',         '행복주택', '대학생·취업준비생', null, null, true,  null, null, 100, null, 108000000,        0, 10, '2026-01-01'),
  ('YOUTH',           '행복주택', '청년·사회초년생',     19,   39, true,  null, null, 100, null, 251000000, 45420000, 10, '2026-01-01'),
  ('NEWLYWED',        '행복주택', '신혼부부·예비신혼부부', null, null, false,    7,    6, 100,  120, 345000000, 45420000, 10, '2026-01-01'),
  ('SINGLE_PARENT',   '행복주택', '한부모가족',        null, null, false, null,    6, 100, null, 345000000, 45420000, 10, '2026-01-01'),
  ('SENIOR',          '행복주택', '고령자',              65, null, false, null, null, 100, null, 345000000, 45420000, 20, '2026-01-01'),
  ('HOUSING_BENEFIT', '행복주택', '주거급여수급자',    null, null, false, null, null, null, null, 345000000, 45420000, 20, '2026-01-01'),
  -- HUG 든든전세: 2026.7.24 수시 공고문 확인 결과 자격이 '공고일 기준 무주택세대구성원' 뿐.
  -- 공고문 전문에 '소득'·'자산' 단어가 0회 등장하고 선정은 무작위 추첨. 나머지 컬럼을 비워 무주택만 판정한다
  ('HUG_JEONSE',      '든든전세', 'HUG 든든전세',      null, null, false, null, null, null, null,      null,     null,  8, '2026-01-01');

-- ───────────────────────── LLM 추출 검수 ─────────────────────────

-- SH 공고문 PDF에서 LLM이 뽑은 단지 표. 어드민이 검수·승인해야 notice_houses에 반영된다 (환각·숫자 오독 방지)
create type extraction_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'FAILED');

create table notice_extractions (
  notice_id    bigint primary key references notices(id) on delete cascade,
  pdf_url      text not null,
  pdf_name     text,
  model        text,
  status       extraction_status not null default 'PENDING',
  houses       jsonb,                  -- [{name, address, supplyCount, totalHouseholds, minDeposit, minMonthlyRent}]
  usage        jsonb,                  -- 토큰 사용량 (비용 추적)
  error        text,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);
