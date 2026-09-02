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
    sido_code as "sidoCode", sigungu_code as "sigunguCode", preferred_sigungu_codes as "preferredSigunguCodes"
  from user_profiles where user_id = $1`;

const values = (p: ProfileInput) => [
  p.birthDate, p.maritalStatus, p.marriedAt, p.childrenCount, p.youngestChildBirthDate, p.householdSize,
  p.householdMonthlyIncome, p.dualIncome, p.isHomeless, p.totalAssets, p.carValue, p.isStudent,
  p.isHousingBenefitRecipient, p.sidoCode, p.sigunguCode, p.preferredSigunguCodes,
];

@Injectable()
export class ProfilesService {
  constructor(private readonly db: Db) {}

  get(userId: string): Promise<StoredProfile | undefined> {
    return this.db.one<StoredProfile>(SELECT, [userId]);
  }

  async upsert(userId: string, p: ProfileInput): Promise<StoredProfile> {
    await this.db.query(
      `insert into user_profiles (user_id, birth_date, marital_status, married_at, children_count, youngest_child_birth_date,
         household_size, household_monthly_income, dual_income, is_homeless, total_assets, car_value, is_student,
         is_housing_benefit_recipient, sido_code, sigungu_code, preferred_sigungu_codes)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       on conflict (user_id) do update set birth_date = excluded.birth_date, marital_status = excluded.marital_status,
         married_at = excluded.married_at, children_count = excluded.children_count,
         youngest_child_birth_date = excluded.youngest_child_birth_date, household_size = excluded.household_size,
         household_monthly_income = excluded.household_monthly_income, dual_income = excluded.dual_income,
         is_homeless = excluded.is_homeless, total_assets = excluded.total_assets, car_value = excluded.car_value,
         is_student = excluded.is_student, is_housing_benefit_recipient = excluded.is_housing_benefit_recipient,
         sido_code = excluded.sido_code, sigungu_code = excluded.sigungu_code,
         preferred_sigungu_codes = excluded.preferred_sigungu_codes, updated_at = now()`,
      [userId, ...values(p)],
    );
    return (await this.get(userId))!;
  }
}
