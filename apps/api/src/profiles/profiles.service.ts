import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Db } from '../db.js';
import type { Profile } from '../matching/matcher.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const won = z.number().int().min(0).max(1e13);

export const profileSchema = z.object({
  birthDate: isoDate,
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'ENGAGED']),
  marriedAt: isoDate.nullable().default(null),
  childrenCount: z.number().int().min(0).max(20).default(0),
  youngestChildBirthDate: isoDate.nullable().default(null),
  householdSize: z.number().int().min(1).max(20),
  householdMonthlyIncome: won,
  dualIncome: z.boolean().default(false),
  isHomeless: z.boolean().default(true),
  totalAssets: won.nullable().default(null),
  carValue: won.nullable().default(null),
  isStudent: z.boolean().default(false),
  isHousingBenefitRecipient: z.boolean().default(false),
  hasSubscriptionAccount: z.boolean().default(false),
  isIndustrialWorker: z.boolean().default(false),
  employedYears: z.number().int().min(0).max(60).nullable().default(null),
  sidoCode: z.string().length(2),
  sigunguCode: z.string().length(5).nullable().default(null),
  preferredSigunguCodes: z.array(z.string().length(5)).max(50).default([]),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type StoredProfile = Profile & Pick<ProfileInput, 'sidoCode' | 'sigunguCode' | 'preferredSigunguCodes'>;

const SELECT = `
  select birth_date::text as "birthDate", marital_status as "maritalStatus", married_at::text as "marriedAt",
    children_count as "childrenCount", youngest_child_birth_date::text as "youngestChildBirthDate",
    household_size as "householdSize", household_monthly_income as "householdMonthlyIncome",
    dual_income as "dualIncome", is_homeless as "isHomeless", total_assets as "totalAssets", car_value as "carValue",
    is_student as "isStudent", is_housing_benefit_recipient as "isHousingBenefitRecipient",
    has_subscription_account as "hasSubscriptionAccount", is_industrial_worker as "isIndustrialWorker", employed_years as "employedYears",
    sido_code as "sidoCode", sigungu_code as "sigunguCode", preferred_sigungu_codes as "preferredSigunguCodes"
  from user_profiles where user_id = $1`;

const values = (p: ProfileInput) => [
  p.birthDate, p.maritalStatus, p.marriedAt, p.childrenCount, p.youngestChildBirthDate, p.householdSize,
  p.householdMonthlyIncome, p.dualIncome, p.isHomeless, p.totalAssets, p.carValue, p.isStudent,
  p.isHousingBenefitRecipient, p.hasSubscriptionAccount, p.isIndustrialWorker, p.employedYears, p.sidoCode, p.sigunguCode, p.preferredSigunguCodes,
];

@Injectable()
export class ProfilesService {
  constructor(private readonly db: Db) {}

  get(userId: string): Promise<StoredProfile | undefined> {
    return this.db.one<StoredProfile>(SELECT, [userId]);
  }

  /** 서버 미저장 상태. localOnly면 profile은 null이고 birthDate만 있다 */
  async getMe(userId: string): Promise<{ localOnly: boolean; birthDate: string | null; profile: StoredProfile | null }> {
    const u = await this.db.one<{ local_only: boolean; birth_date: string | null }>(
      `select profile_local_only as local_only, birth_date::text from users where id = $1`,
      [userId],
    );
    if (u?.local_only) return { localOnly: true, birthDate: u.birth_date, profile: null };
    return { localOnly: false, birthDate: null, profile: (await this.get(userId)) ?? null };
  }

  /** "서버에 저장하지 않을래요": 생년월일만 남기고 프로필 행은 지운다 */
  async setLocalOnly(userId: string, birthDate: string) {
    await this.db.tx(async (q) => {
      await q(`update users set profile_local_only = true, birth_date = $2 where id = $1`, [userId, birthDate]);
      await q(`delete from user_profiles where user_id = $1`, [userId]);
    });
    return { localOnly: true as const, birthDate, profile: null };
  }

  async upsert(userId: string, p: ProfileInput): Promise<StoredProfile> {
    await this.db.query(`update users set profile_local_only = false, birth_date = null where id = $1`, [userId]);
    await this.db.query(
      `insert into user_profiles (user_id, birth_date, marital_status, married_at, children_count, youngest_child_birth_date,
         household_size, household_monthly_income, dual_income, is_homeless, total_assets, car_value, is_student,
         is_housing_benefit_recipient, has_subscription_account, is_industrial_worker, employed_years, sido_code, sigungu_code, preferred_sigungu_codes)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       on conflict (user_id) do update set birth_date = excluded.birth_date, marital_status = excluded.marital_status,
         married_at = excluded.married_at, children_count = excluded.children_count,
         youngest_child_birth_date = excluded.youngest_child_birth_date, household_size = excluded.household_size,
         household_monthly_income = excluded.household_monthly_income, dual_income = excluded.dual_income,
         is_homeless = excluded.is_homeless, total_assets = excluded.total_assets, car_value = excluded.car_value,
         is_student = excluded.is_student, is_housing_benefit_recipient = excluded.is_housing_benefit_recipient,
         has_subscription_account = excluded.has_subscription_account, is_industrial_worker = excluded.is_industrial_worker,
         employed_years = excluded.employed_years, sido_code = excluded.sido_code, sigungu_code = excluded.sigungu_code,
         preferred_sigungu_codes = excluded.preferred_sigungu_codes, updated_at = now()`,
      [userId, ...values(p)],
    );
    return (await this.get(userId))!;
  }
}
