import { useEffect, useRef, useState } from 'react';
import { loadKakaoMaps } from '@/shared/lib';
import type { MapMarker } from '../lib/markers';

const BRAND = '#1e7a5b';

// 초록 원형 인디케이터 (흰 테두리 + 은은한 헤일로)
const DOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><circle cx="13" cy="13" r="12" fill="${BRAND}" fill-opacity="0.18"/><circle cx="13" cy="13" r="7" fill="${BRAND}" stroke="#fff" stroke-width="2.5"/></svg>`;

function greenDot(): kakao.maps.MarkerImage {
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DOT_SVG)}`;
  return new kakao.maps.MarkerImage(src, new kakao.maps.Size(26, 26), { offset: new kakao.maps.Point(13, 13) });
}

// 클러스터 뱃지도 같은 초록으로
const CLUSTER_STYLES: Record<string, string>[] = [
  {
    width: '36px',
    height: '36px',
    background: BRAND,
    opacity: '0.9',
    borderRadius: '50%',
    color: '#fff',
    textAlign: 'center',
    lineHeight: '36px',
    fontSize: '12px',
    fontWeight: '600',
    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
  },
];

/** 공고 단지 마커 지도. 마커 클릭 → 말풍선 + onSelect(noticeId). */
export interface MapFocus {
  noticeId: number;
  at: number; // 같은 공고 재클릭도 다시 트리거되게 타임스탬프
}

export function NoticeMap({
  markers,
  focus,
  onSelect,
  className = '',
}: {
  markers: MapMarker[];
  focus?: MapFocus | null;
  onSelect?: (noticeId: number) => void;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<kakao.maps.Map | null>(null);
  const clusterer = useRef<kakao.maps.MarkerClusterer | null>(null);
  const overlay = useRef<kakao.maps.CustomOverlay | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const markersRef = useRef<MapMarker[]>(markers);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    markersRef.current = markers;
    onSelectRef.current = onSelect;
  });

  // 부모가 매 렌더 새 배열을 만들기 때문에 참조로 비교하면 마커가 계속 다시 그려지고
  // 아래 setBounds가 사용자가 맞춰둔 줌·중심을 되돌린다. 내용이 바뀔 때만 다시 그린다
  const markerKey = markers.map((m) => m.key).join('|');

  useEffect(() => {
    let alive = true;
    loadKakaoMaps().then(
      () => {
        if (!alive || !el.current) return;
        map.current = new kakao.maps.Map(el.current, { center: new kakao.maps.LatLng(36.5, 127.8), level: 13 });
        clusterer.current = new kakao.maps.MarkerClusterer({ map: map.current, averageCenter: true, minLevel: 7, styles: CLUSTER_STYLES });
        kakao.maps.event.addListener(map.current, 'click', () => overlay.current?.setMap(null));
        setStatus('ready');
      },
      (e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !map.current || !clusterer.current) return;
    overlay.current?.setMap(null);
    clusterer.current.clear();
    const bounds = new kakao.maps.LatLngBounds();
    const image = greenDot();
    const kakaoMarkers = markersRef.current.map((m) => {
      const pos = new kakao.maps.LatLng(m.lat, m.lng);
      bounds.extend(pos);
      const marker = new kakao.maps.Marker({ position: pos, title: m.name, image });
      kakao.maps.event.addListener(marker, 'click', () => {
        overlay.current?.setMap(null);
        overlay.current = new kakao.maps.CustomOverlay({ position: pos, content: buildBubble(m), yAnchor: 1.35, zIndex: 10 });
        overlay.current.setMap(map.current);
        onSelectRef.current?.(m.noticeId);
      });
      return marker;
    });
    clusterer.current.addMarkers(kakaoMarkers);
    if (!bounds.isEmpty()) map.current.setBounds(bounds, 40, 40, 40, 40);
    return () => {
      clusterer.current?.clear();
      kakaoMarkers.forEach((k) => k.setMap(null));
    };
  }, [status, markerKey]);

  // 카드의 지도 아이콘 클릭 → 해당 공고 단지로 이동. 단지 1곳이면 줌인+말풍선, 여러 곳이면 bounds
  useEffect(() => {
    if (!focus || status !== 'ready' || !map.current) return;
    const targets = markersRef.current.filter((m) => m.noticeId === focus.noticeId);
    if (targets.length === 0) return;
    el.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    overlay.current?.setMap(null);
    if (targets.length === 1) {
      const m = targets[0];
      const pos = new kakao.maps.LatLng(m.lat, m.lng);
      map.current.setLevel(4);
      map.current.panTo(pos);
      overlay.current = new kakao.maps.CustomOverlay({ position: pos, content: buildBubble(m), yAnchor: 1.35, zIndex: 10 });
      overlay.current.setMap(map.current);
    } else {
      const bounds = new kakao.maps.LatLngBounds();
      for (const m of targets) bounds.extend(new kakao.maps.LatLng(m.lat, m.lng));
      map.current.setBounds(bounds, 60, 60, 60, 60);
    }
  }, [focus, status]);

  if (status === 'error')
    return (
      <div className={`card grid place-items-center p-6 text-center text-sm text-muted ${className}`}>
        <p>
          지도를 불러올 수 없어요.
          <br />
          <span className="text-xs">{error}</span>
        </p>
      </div>
    );

  return (
    <div className={`card relative overflow-hidden ${className}`}>
      <div ref={el} className="size-full" />
      {status === 'loading' && <p className="absolute inset-0 grid place-items-center text-sm text-muted">지도 불러오는 중…</p>}
      {status === 'ready' && markers.length === 0 && (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-muted">표시할 좌표가 있는 단지가 없어요</p>
      )}
    </div>
  );
}

// XSS 방지: 공고 제목·단지명은 외부 데이터라 innerHTML 대신 textContent로 조립
function buildBubble(m: MapMarker): HTMLElement {
  const root = document.createElement('div');
  root.className = 'rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md max-w-60';
  const name = document.createElement('p');
  name.className = 'font-semibold truncate';
  name.textContent = m.name;
  root.appendChild(name);
  const title = document.createElement('p');
  title.className = 'text-muted truncate';
  title.textContent = m.noticeTitle;
  root.appendChild(title);
  if (m.rentText) {
    const rent = document.createElement('p');
    rent.textContent = m.rentText;
    root.appendChild(rent);
  }
  if (m.detailUrl) {
    const a = document.createElement('a');
    a.href = m.detailUrl;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.className = 'text-brand hover:underline';
    a.textContent = '원문 공고 ↗';
    root.appendChild(a);
  }
  return root;
}
