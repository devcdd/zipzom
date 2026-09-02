export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'ENGAGED';

export interface Profile {
  birthDate: string;
  maritalStatus: MaritalStatus;
  marriedAt: string | null;
  childrenCount: number;
  youngestChildBirthDate: string | null;
  householdSize: number;
  householdMonthlyIncome: number;
  dualIncome: boolean;
  isHomeless: boolean;
  totalAssets: number | null;
  carValue: number | null;
  isStudent: boolean;
  isHousingBenefitRecipient: boolean;
  sidoCode: string;
  sigunguCode: string | null;
  preferredSigunguCodes: string[];
}

export const EMPTY_PROFILE: Profile = {
  birthDate: '',
  maritalStatus: 'SINGLE',
  marriedAt: null,
  childrenCount: 0,
  youngestChildBirthDate: null,
  householdSize: 1,
  householdMonthlyIncome: 0,
  dualIncome: false,
  isHomeless: true,
  totalAssets: null,
  carValue: null,
  isStudent: false,
  isHousingBenefitRecipient: false,
  sidoCode: '11',
  sigunguCode: null,
  preferredSigunguCodes: [],
};

export const MARITAL_LABEL: Record<MaritalStatus, string> = {
  SINGLE: '미혼',
  MARRIED: '기혼',
  ENGAGED: '예비신혼부부',
};
