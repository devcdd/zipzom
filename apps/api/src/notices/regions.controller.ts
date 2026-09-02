import { Controller, Get } from '@nestjs/common';
import { Db } from '../db.js';

@Controller('regions')
export class RegionsController {
  constructor(private readonly db: Db) {}

  /** 'XX000' 행은 시도 전체 — 시군구 유무와 무관하게 그 시도의 단지를 모두 센다. */
  @Get()
  list() {
    return this.db.query(
      `select r.code, r.sido_code as "sidoCode", r.name, count(nh.id)::int as "houseCount"
       from regions r
       left join notice_houses nh on nh.sigungu_code = r.code
         or (r.code like '__000' and nh.sido_code = r.sido_code)
       group by r.code order by r.name`,
    );
  }
}
