import { mergeEligibilityByCode, mergeHouseGroups, extractFromPdf, retryAfterMs } from './house-extractor.js';

const ok = {
  status: 'completed',
  usage: { total_tokens: 1 },
  output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ houses: [], eligibility: [] }) }] }],
};
const tooMany = { error: { message: 'Rate limit reached ... Please try again in 10.679s. Visit ...' } };
const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

describe('retryAfterMs', () => {
  it('retry-after 헤더가 우선', () => {
    expect(retryAfterMs(new Headers({ 'retry-after': '7' }), 'try again in 10.679s')).toBe(7_000);
  });
  it('헤더가 없으면 메시지의 초를 읽고 올림한다', () => {
    expect(retryAfterMs(new Headers(), 'Please try again in 10.679s.')).toBe(10_679);
  });
  it('둘 다 없으면 20초, 너무 크면 90초로 자른다', () => {
    expect(retryAfterMs(new Headers(), undefined)).toBe(20_000);
    expect(retryAfterMs(new Headers({ 'retry-after': '600' }), undefined)).toBe(90_000);
  });
});

describe('extractFromPdf 429 재시도', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.OPENAI_API_KEY = 'test';
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('429 뒤 200이 오면 성공으로 끝난다', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(reply(429, tooMany, { 'retry-after': '1' })).mockResolvedValueOnce(reply(200, ok));
    vi.stubGlobal('fetch', fetchMock);
    const p = extractFromPdf(new Uint8Array([1]), 'a.pdf', { withHouseDetail: true });
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(p).resolves.toEqual({ houses: [], eligibility: [], usage: { total_tokens: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('세 번 연속 429면 그 오류를 던진다', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(reply(429, tooMany, { 'retry-after': '1' })));
    vi.stubGlobal('fetch', fetchMock);
    const p = extractFromPdf(new Uint8Array([1]), 'a.pdf', { withHouseDetail: true });
    const assertion = expect(p).rejects.toThrow('openai HTTP 429');
    await vi.advanceTimersByTimeAsync(3_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('mergeEligibilityByCode', () => {
  const base = { ageMin: null, ageMax: null, incomePct: 100, dualIncomePct: null, assetLimit: 345_000_000, carLimit: 45_420_000, exempt: [] as string[], conditions: [] as string[] };
  it('같은 코드는 하나로: 라벨 이어붙이고 비어 있지 않은 값 우선, 조건 합집합', () => {
    const r = mergeEligibilityByCode([
      { ...base, code: 'NEWLYWED', label: '신혼부부', dualIncomePct: 120, conditions: ['혼인 7년 이내'] },
      { ...base, code: 'NEWLYWED', label: '한부모가족', dualIncomePct: null, conditions: ['6세 이하 자녀'], exempt: ['asset'] },
      { ...base, code: 'SENIOR', label: '고령자', ageMin: 65 },
    ] as never);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ code: 'NEWLYWED', label: '신혼부부·한부모가족', dualIncomePct: 120, exempt: ['asset'], conditions: ['혼인 7년 이내', '6세 이하 자녀'] });
  });
  it('단지 배정도 코드별 합산', () => {
    const [h] = mergeHouseGroups([{ name: 'A', address: null, supplyCount: 8, totalHouseholds: null, minDeposit: null, minMonthlyRent: null, areaMin: null, areaMax: null, groups: [{ code: 'YOUTH', supplyCount: 5 }, { code: 'YOUTH', supplyCount: 3 }, { code: 'SENIOR', supplyCount: null }] }]);
    expect(h.groups).toEqual([{ code: 'YOUTH', supplyCount: 8 }, { code: 'SENIOR', supplyCount: null }]);
  });
});
