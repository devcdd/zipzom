export interface GeoPoint {
  lat: number;
  lng: number;
  bcode?: string; // 법정동코드 10자리
  sigunguName?: string; // 예: 강남구
  regionName?: string; // 카카오 시도 표기 (표에 없는 신규 코드 대비)
  address?: string;
}

const headers = () => ({ Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` });

async function kakao(path: string, query: string): Promise<GeoPoint | undefined> {
  const url = new URL(`https://dapi.kakao.com/v2/local/search/${path}.json`);
  url.search = new URLSearchParams({ query, size: '1' }).toString();
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`kakao ${path} HTTP ${res.status}`);
  const { documents } = (await res.json()) as {
    documents: { x: string; y: string; address_name: string; address?: { b_code: string; region_1depth_name: string; region_2depth_name: string } }[];
  };
  const d = documents[0];
  if (!d) return undefined;
  const a = d.address;
  return { lat: Number(d.y), lng: Number(d.x), bcode: a?.b_code, sigunguName: a?.region_2depth_name || undefined, regionName: a?.region_1depth_name || undefined, address: d.address_name };
}

// 주소 검색 → 실패 시 키워드(단지명) 검색. 신규 택지는 주소가 안 잡히는 경우가 있음
export async function geocode(address: string, keyword?: string): Promise<GeoPoint | undefined> {
  const byAddress = address.trim() ? await kakao('address', address.trim()) : undefined;
  if (byAddress) return byAddress;
  return keyword?.trim() ? kakao('keyword', keyword.trim()) : undefined;
}
