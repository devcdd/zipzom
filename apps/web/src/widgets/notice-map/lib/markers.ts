import type { Notice } from '@/entities/notice';
import { fmtRent } from '@/shared/lib';

export interface MapMarker {
  key: string;
  noticeId: number;
  lat: number;
  lng: number;
  name: string;
  noticeTitle: string;
  detailUrl: string | null;
  rentText: string | null;
}

export function noticesToMarkers(notices: Notice[]): MapMarker[] {
  return notices.flatMap((n) =>
    n.houses
      .filter((h): h is typeof h & { lat: number; lng: number } => h.lat != null && h.lng != null)
      .map((h) => ({
        key: `${n.id}:${h.id}`,
        noticeId: n.id,
        lat: h.lat,
        lng: h.lng,
        name: h.name ?? h.address ?? n.title,
        noticeTitle: n.title,
        detailUrl: n.detailUrl,
        rentText: fmtRent(h.minDeposit, h.minMonthlyRent),
      })),
  );
}
