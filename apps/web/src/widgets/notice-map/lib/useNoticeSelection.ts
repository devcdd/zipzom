import { useCallback, useState } from 'react';
import type { MapFocus } from '../ui/NoticeMap';

/**
 * 카드 목록과 지도의 선택 상태를 하나로 묶는다.
 * 어느 쪽에서 고르든 카드가 강조되고 반대쪽이 따라 움직인다.
 */
export function useNoticeSelection() {
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(null);

  // 같은 공고를 다시 눌러도 지도가 반응하도록 타임스탬프를 갱신한다
  const showOnMap = useCallback((noticeId: number, houseId?: number) => {
    setSelectedId(noticeId);
    setSelectedHouseId(houseId ?? null);
    setFocus({ noticeId, houseId, at: Date.now() });
  }, []);

  // NoticeMap의 마커 생성 effect 의존성이라 매 렌더 새 함수를 넘기면 마커가 다시 그려진다
  // 스크롤 대신 목록에서 선택 카드를 맨 위로 올린다(정렬은 각 목록이 selectedId로 처리)
  const selectFromMap = useCallback((noticeId: number, houseId?: number) => {
    setSelectedId(noticeId);
    setSelectedHouseId(houseId ?? null);
  }, []);

  return { focus, selectedId, selectedHouseId, showOnMap, selectFromMap };
}
