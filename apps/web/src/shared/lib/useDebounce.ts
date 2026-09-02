import { useEffect, useState } from 'react';

/** 값이 ms 동안 안 바뀌었을 때만 반영. 타이핑마다 요청 나가는 검색 입력용 */
export function useDebounce<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
