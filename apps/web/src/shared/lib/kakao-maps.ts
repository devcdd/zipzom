import { KAKAO_JS_KEY } from '@/shared/config';

let loading: Promise<void> | null = null;

/** 카카오맵 SDK 1회 로드. 키 없거나 로드 실패면 reject (재시도 가능). */
export function loadKakaoMaps(): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    if (!KAKAO_JS_KEY) {
      reject(new Error('VITE_KAKAO_JS_KEY가 비어 있어요. 루트 .env에 카카오 JavaScript 키를 넣어주세요.'));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=clusterer&autoload=false`;
    script.onload = () => kakao.maps.load(resolve);
    script.onerror = () => reject(new Error('카카오맵 SDK 로드 실패 — 키와 사이트 도메인 등록을 확인하세요.'));
    document.head.appendChild(script);
  }).catch((e: unknown) => {
    loading = null; // 키 채우고 새로고침 없이도 재시도되게
    throw e;
  });
  return loading;
}
