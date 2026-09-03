-- 관심 공급유형. 비어 있으면 전 유형 대상 (기존 사용자는 그대로 넓어진다). 재실행 안전.
alter table user_profiles add column if not exists preferred_supply_types text[] not null default '{}';
