import { groupLabel, type Notice } from '@/entities/notice';
import { fmtArea } from '@/shared/lib';
import { fmtRent } from '@/shared/lib';

export interface MapMarker {
  key: string;
  noticeId: number;
  houseId: number;
  lat: number;
  lng: number;
  name: string;
  noticeTitle: string;
  detailUrl: string | null;
  rentText: string | null;
  areaText: string | null; // 전용면적 ㎡·평
  groups: string[]; // 배정 계층 코드
  matched: string[]; // 내 매칭에서 통과한 계층 (강조용)
  title: string; // 마커 호버 툴팁
}

export function noticesToMarkers(notices: (Notice & { matchedCodes?: string[] })[]): MapMarker[] {
  return notices.flatMap((n) =>
    n.houses
      .filter((h): h is typeof h & { lat: number; lng: number } => h.lat != null && h.lng != null)
      .map((h) => ({
        key: `${n.id}:${h.id}`,
        noticeId: n.id,
        houseId: h.id,
        lat: h.lat,
        lng: h.lng,
        name: h.name ?? h.address ?? n.title,
        noticeTitle: n.title,
        detailUrl: n.detailUrl,
        rentText: fmtRent(h.minDeposit, h.minMonthlyRent, n.supplyType === '든든전세'),
        areaText: fmtArea(h.areaMin, h.areaMax),
        groups: h.eligibleGroups ?? [],
        matched: n.matchedCodes ?? [],
        // 마커 호버 툴팁: "단지명 · 청년·신혼부부 · 26~45㎡ · 8~14평"
        title: [h.name ?? h.address ?? n.title, (h.eligibleGroups ?? []).map(groupLabel).join('·') || null, fmtArea(h.areaMin, h.areaMax)].filter(Boolean).join(' · '),
      })),
  );
}
