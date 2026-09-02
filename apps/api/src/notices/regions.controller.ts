import { Controller, Get } from '@nestjs/common';
import { Db } from '../db.js';

@Controller('regions')
export class RegionsController {
  constructor(private readonly db: Db) {}

  /** 수집된 공고가 있는 지역만. 'XX000' 행은 시도 전체(주소 없는 SH 공고 포함). */
  @Get()
  list() {
    return this.db.query(
      `select r.code, r.sido_code as "sidoCode", r.name, count(nh.id)::int as "houseCount"
       from regions r
       left join notice_houses nh on nh.sigungu_code = r.code
         or (r.code like '__000' and nh.sido_code = r.sido_code and nh.sigungu_code is null)
       group by r.code order by r.name`,
    );
  }
}
