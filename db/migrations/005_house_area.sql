-- 단지별 전용면적(㎡) 범위. LH 상세 API·HUG 응답·SH 공고문 추출에서 채운다. 재실행 안전.
alter table notice_houses add column if not exists area_min numeric(8,2);
alter table notice_houses add column if not exists area_max numeric(8,2);
