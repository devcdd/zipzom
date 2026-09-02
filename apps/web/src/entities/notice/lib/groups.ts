/** 행복주택 계층 코드 → 표시명. API의 GROUP_CODES와 맞춘다 */
export const GROUP_LABEL: Record<string, string> = {
  STUDENT: '대학생',
  YOUTH: '청년',
  NEWLYWED: '신혼부부',
  SINGLE_PARENT: '한부모',
  SENIOR: '고령자',
  HOUSING_BENEFIT: '주거급여',
  INDUSTRIAL: '산단근로자',
  OTHER: '기타',
};
export const GROUP_CODES = Object.keys(GROUP_LABEL);
export const groupLabel = (code: string) => GROUP_LABEL[code] ?? code;
