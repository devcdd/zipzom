export interface Region {
  code: string; // 법정동 시군구 5자리. 'XX000' = 시도 전체
  sidoCode: string;
  name: string;
  houseCount: number;
}

export interface Sido {
  code: string;
  name: string;
}
