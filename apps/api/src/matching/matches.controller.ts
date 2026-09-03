import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser, type SessionUser } from '../auth/auth.js';
import { parse } from '../validate.js';
import { Db } from '../db.js';
import { NoticesService } from '../notices/notices.service.js';
import { profileSchema } from '../profiles/profiles.service.js';
import { MatchingService } from './matching.service.js';

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly db: Db,
    private readonly notices: NoticesService,
    private readonly matching: MatchingService,
  ) {}

  /**
   * 계층 자격은 공고와 무관하게 프로필로 결정되고, 공고는 유형·모집 중·관심 지역으로 거른다.
   * 프로필은 본문으로 받는다 — 비로그인은 localStorage 프로필로도 판정 가능. NEW 배지용 매칭 이력은 로그인 시에만 기록
   */
  @Post()
  async evaluate(@Body() body: unknown, @CurrentUser() user: SessionUser | null) {
    const profile = parse(profileSchema, body);
    // 후보 범위는 사용자가 고른 관심 공급유형. 비워두면 전 유형 (규칙 유무로 우리가 좁히지 않는다)
    const supplyTypes = profile.preferredSupplyTypes.length > 0 ? profile.preferredSupplyTypes : null;

    // 'XX000'은 시도 전체 선택. 관심 지역이 없으면 거주 시도
    const sigungu = profile.preferredSigunguCodes.filter((c) => !c.endsWith('000'));
    const sido = profile.preferredSigunguCodes.filter((c) => c.endsWith('000')).map((c) => c.slice(0, 2));
    const scoped = sigungu.length + sido.length > 0;
    const { items } = await this.notices.list({
      supplyTypes,
      phases: ['open', 'upcoming'],
      sigunguCodes: scoped ? sigungu : null,
      sidoCodes: scoped ? sido : [profile.sidoCode],
      limit: 200,
      offset: 0,
    });

    const { evaluations, matches } = await this.matching.annotate(profile, items);
    const matchedRules = evaluations.filter((e) => e.ok).map((e) => e.code);
    // 자격을 못 따진 유형도 남긴다. 화면에서 '자격 기준 미등록'으로 구분해 보여준다
    const passed = matches.filter((p) => p.codes.length > 0 || p.unverified);

    const matchedAt = new Map<number, string>();
    if (passed.length && user) {
      const rows = await this.db.query<{ notice_id: number; matched_at: Date }>(
        `insert into user_notice_matches (user_id, notice_id, matched_rules)
         select $1, unnest($2::bigint[]), $3::text[]
         on conflict (user_id, notice_id) do update set matched_rules = excluded.matched_rules
         returning notice_id, matched_at`,
        [user.id, passed.map((p) => p.notice.id), matchedRules],
      );
      for (const r of rows) matchedAt.set(r.notice_id, r.matched_at.toISOString());
    }
    return {
      eligible: matchedRules.length > 0 || passed.length > 0,
      evaluations,
      notices: passed.map((p) => ({
        ...p.notice,
        matchedAt: matchedAt.get(p.notice.id),
        matchedCodes: p.codes,
        noticeSpecific: p.overridden,
        unverified: p.unverified,
      })),
    };
  }
}
