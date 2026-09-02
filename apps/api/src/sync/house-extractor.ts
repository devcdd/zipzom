import { z } from 'zod';

/** 행복주택 계층 코드. eligibility_rules.code와 맞춘다. INDUSTRIAL·OTHER는 규칙이 없어 매칭엔 안 쓰고 카드에만 표시 */
export const GROUP_CODES = ['STUDENT', 'YOUTH', 'NEWLYWED', 'SINGLE_PARENT', 'SENIOR', 'HOUSING_BENEFIT', 'INDUSTRIAL', 'OTHER'] as const;
export type GroupCode = (typeof GROUP_CODES)[number];

const int = z.number().int().nullable();

export const houseGroupSchema = z.object({ code: z.enum(GROUP_CODES), supplyCount: int });

export const extractedHouseSchema = z.object({
  name: z.string().min(1),
  address: z.string().nullable(),
  supplyCount: int,
  totalHouseholds: int,
  minDeposit: int,
  minMonthlyRent: int,
  areaMin: z.number().nullable().default(null), // 전용면적 ㎡
  areaMax: z.number().nullable().default(null),
  groups: z.array(houseGroupSchema).default([]), // 단지별 계층 배정
});
export type ExtractedHouse = z.infer<typeof extractedHouseSchema>;

/** 공고 × 계층 자격 기준. null = 공고문에 명시 없음(공통 규칙으로 대체) */
export const extractedEligibilitySchema = z.object({
  code: z.enum(GROUP_CODES),
  label: z.string().min(1), // 공고문 표기 계층명
  ageMin: int,
  ageMax: int,
  incomePct: int,
  dualIncomePct: int,
  assetLimit: int, // 원
  carLimit: int, // 원
  exempt: z.array(z.enum(['income', 'asset', 'car'])).default([]), // 공고가 명시적으로 배제한 요건 (자격완화 공고). null과 구분
  conditions: z.array(z.string()).default([]), // 우선공급·거주요건 등 문장 요약
});
export type ExtractedEligibility = z.infer<typeof extractedEligibilitySchema>;

export interface ExtractionResult {
  houses: ExtractedHouse[];
  eligibility: ExtractedEligibility[];
  usage: unknown;
}

// OpenAI json_schema strict: 모든 키 required, nullable은 type 배열로
const nint = { type: ['integer', 'null'] };
const codeEnum = { type: 'string', enum: [...GROUP_CODES] };
const jsonSchema = (withHouseDetail: boolean) => ({
  type: 'object',
  additionalProperties: false,
  required: ['houses', 'eligibility'],
  properties: {
    houses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'address', 'supplyCount', 'totalHouseholds', 'minDeposit', 'minMonthlyRent', 'areaMin', 'areaMax', 'groups'],
        properties: {
          name: { type: 'string' },
          address: withHouseDetail ? { type: ['string', 'null'] } : { type: 'null' },
          supplyCount: nint,
          totalHouseholds: withHouseDetail ? nint : { type: 'null' },
          minDeposit: withHouseDetail ? nint : { type: 'null' },
          minMonthlyRent: withHouseDetail ? nint : { type: 'null' },
          areaMin: withHouseDetail ? { type: ['number', 'null'] } : { type: 'null' },
          areaMax: withHouseDetail ? { type: ['number', 'null'] } : { type: 'null' },
          groups: {
            type: 'array',
            items: { type: 'object', additionalProperties: false, required: ['code', 'supplyCount'], properties: { code: codeEnum, supplyCount: nint } },
          },
        },
      },
    },
    eligibility: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'label', 'ageMin', 'ageMax', 'incomePct', 'dualIncomePct', 'assetLimit', 'carLimit', 'exempt', 'conditions'],
        properties: {
          code: codeEnum,
          label: { type: 'string' },
          ageMin: nint,
          ageMax: nint,
          incomePct: nint,
          dualIncomePct: nint,
          assetLimit: nint,
          carLimit: nint,
          exempt: { type: 'array', items: { type: 'string', enum: ['income', 'asset', 'car'] } },
          conditions: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
});

const GROUP_GUIDE = `계층 code 매핑: 대학생·취업준비생→STUDENT, 청년·사회초년생→YOUTH, 신혼부부·예비신혼부부·한부모(신혼부부와 묶여 있으면)→NEWLYWED,
한부모가족 단독 계층→SINGLE_PARENT, 고령자→SENIOR, 주거급여수급자→HOUSING_BENEFIT, 산업단지근로자→INDUSTRIAL, 그 외→OTHER.`;

const prompt = (withHouseDetail: boolean) => `이 행복주택 입주자 모집공고문에서 두 가지를 추출해.

1) eligibility: 계층별 입주자격 기준. 계층마다 label(공고문 표기명), ageMin/ageMax(만 나이, 없으면 null),
incomePct(전년도 도시근로자 가구당 월평균소득 대비 %, 기본 기준), dualIncomePct(맞벌이 완화 %, 없으면 null),
assetLimit(총자산 기준, 만원 단위 정수: "3억 4,500만원"→34500), carLimit(자동차가액 기준, 만원 단위 정수: "4,542만원"→4542, 소유 불가면 0),
exempt(공고가 "이번 모집에 한해 배제"처럼 명시적으로 적용하지 않는다고 한 요건: income·asset·car 중. 단순히 언급이 없는 건 exempt가 아니라 null), conditions(우선공급·거주지·재직 요건 등 그 계층에만 해당하는 조건을 짧은 문장으로, 최대 5개).
공고문에 명시되지 않은 숫자는 null. 자산·자동차는 만원 단위, 그 외 금액(보증금·월세)은 원 단위 정수.
${GROUP_GUIDE}

2) houses: 이번에 공급하는 단지 목록. 단지마다 name(단지명)${
    withHouseDetail
      ? ', address(주소, 시도부터), supplyCount(공급호수 합계), totalHouseholds(총세대수), minDeposit(최저 임대보증금 원), minMonthlyRent(최저 월임대료 원), areaMin/areaMax(이번 공급 형별 전용면적 ㎡의 최소·최대, 소수 둘째자리)'
      : ', supplyCount(공급호수 합계). address·totalHouseholds·minDeposit·minMonthlyRent·areaMin·areaMax는 null'
  }, groups(그 단지에 배정된 계층별 공급호수. 배정 없으면 빈 배열).
신규공급·재공급으로 나뉘어도 같은 단지는 한 번만 넣고 호수는 합산.`;

/**
 * PDF를 통째로 넣고 json_schema strict로 받는다. withHouseDetail=false면(마이홈에 단지 정보가 이미 있는 LH) 단지는 이름·계층 배정만.
 */
const RATE_LIMIT_RETRIES = 3;
const MAX_WAIT_MS = 90_000;

/** 429의 retry-after 헤더(초)를 따르고, 없으면 메시지의 "try again in 10.6s"를 읽는다. 둘 다 없으면 20초. */
export function retryAfterMs(headers: Headers, message: string | undefined): number {
  const header = Number(headers.get('retry-after'));
  if (header > 0) return Math.min(header * 1000, MAX_WAIT_MS);
  const m = /try again in ([\d.]+)\s*s/i.exec(message ?? '');
  return Math.min(m ? Math.ceil(Number(m[1]) * 1000) : 20_000, MAX_WAIT_MS);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface OpenAiResponse {
  error?: { message: string };
  status?: string;
  usage?: unknown;
  output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[];
}

/**
 * 공고문 한 건이 10만 토큰 안팎이라 동기화 1회에 5~6건이 연달아 들어가면 분당 한도(TPM 50만)에 걸린다.
 * 429는 몇 초 뒤 풀리는 오류라 여기서 기다렸다 다시 보낸다. 안 그러면 FAILED로 굳어 수동 재시도가 필요해진다.
 */
async function postWithRetry(body: string): Promise<{ res: Response; json: OpenAiResponse }> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(240_000),
      body,
    });
    const json = (await res.json()) as OpenAiResponse;
    if (res.status !== 429 || attempt >= RATE_LIMIT_RETRIES) return { res, json };
    await sleep(retryAfterMs(res.headers, json.error?.message));
  }
}

export async function extractFromPdf(pdf: Uint8Array, filename: string, opts: { withHouseDetail: boolean }): Promise<ExtractionResult> {
  const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const body = JSON.stringify({
    model,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_file', filename, file_data: `data:application/pdf;base64,${Buffer.from(pdf).toString('base64')}` },
          { type: 'input_text', text: prompt(opts.withHouseDetail) },
        ],
      },
    ],
    text: { format: { type: 'json_schema', name: 'notice', strict: true, schema: jsonSchema(opts.withHouseDetail) } },
  });
  const { res, json } = await postWithRetry(body);
  if (!res.ok) throw new Error(`openai HTTP ${res.status}: ${json.error?.message ?? 'unknown'}`);
  const content = json.output?.flatMap((o) => o.content ?? []) ?? [];
  const refusal = content.find((c) => c.type === 'refusal')?.refusal;
  if (refusal) throw new Error(`openai refusal: ${refusal}`);
  const text = content.find((c) => c.type === 'output_text')?.text;
  if (!text) throw new Error(`openai empty output (status ${json.status})`);
  const parsed = z.object({ houses: z.array(extractedHouseSchema), eligibility: z.array(extractedEligibilitySchema) }).parse(JSON.parse(text));
  // 자산·자동차는 만원으로 받아 원으로 저장. 모델이 단위를 흔들어서(3450 / 345000000 혼용) 만원 고정이 더 안정적
  const eligibility = parsed.eligibility.map((e) => ({
    ...e,
    assetLimit: e.assetLimit == null ? null : e.assetLimit * 10_000,
    carLimit: e.carLimit == null ? null : e.carLimit * 10_000,
  }));
  return { houses: parsed.houses, eligibility, usage: json.usage ?? null };
}
