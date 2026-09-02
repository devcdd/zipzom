-- 지오코딩으로 만든 regions 행이 시도명 없이(" 나주시") 저장된 것 복구 + 빠진 시도 행 생성. 재실행 안전.
create temp table if not exists sido_names (code char(2), name text);
insert into sido_names values
  ('11','서울특별시'),('12','전남광주통합특별시'),('26','부산광역시'),('27','대구광역시'),('28','인천광역시'),
  ('29','광주광역시'),('30','대전광역시'),('31','울산광역시'),('36','세종특별자치시'),('41','경기도'),
  ('43','충청북도'),('44','충청남도'),('46','전라남도'),('47','경상북도'),('48','경상남도'),
  ('50','제주특별자치도'),('51','강원특별자치도'),('52','전북특별자치도');

insert into regions (code, sido_code, name)
select distinct r.sido_code || '000', r.sido_code, s.name
from regions r join sido_names s on s.code = r.sido_code
on conflict (code) do nothing;

update regions r set name = s.name || ' ' || ltrim(r.name)
from sido_names s
where s.code = r.sido_code and r.name like ' %';
