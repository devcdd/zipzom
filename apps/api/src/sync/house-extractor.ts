import { z } from 'zod';

export const extractedHouseSchema = z.object({
  name: z.string().min(1),
  address: z.string().nullable(),
  supplyCount: z.number().int().nullable(),
  totalHouseholds: z.number().int().nullable(),
  minDeposit: z.number().int().nullable(),
  minMonthlyRent: z.number().int().nullable(),
});
export type ExtractedHouse = z.infer<typeof extractedHouseSchema>;

const int = { type: ['integer', 'null'] };
const jsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['houses'],
  properties: {
    houses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'address', 'supplyCount', 'totalHouseholds', 'minDeposit', 'minMonthlyRent'],
        properties: {
          name: { type: 'string' },
          address: { type: ['string', 'null'] },
          supplyCount: int,
          totalHouseholds: int,
          minDeposit: int,
          minMonthlyRent: int,
        },
      },
    },
  },
};

const PROMPT = `이 행복주택 입주자 모집공고문에서 이번에 공급하는 단지 목록을 추출해.
단지마다: name(단지명), address(주소, "서울특별시"부터 시작하는 도로명 또는 지번), supplyCount(이번 공고 공급호수 합계),
totalHouseholds(단지 총세대수), minDeposit(가장 낮은 임대보증금, 원), minMonthlyRent(가장 낮은 월임대료, 원).
금액은 원 단위 정수로 환산(천원 단위 표기 주의). 표에 없는 값은 null.
신규공급·재공급으로 나뉘어도 같은 단지는 한 번만 넣고 supplyCount는 합산.`;

export interface ExtractionResult {
  houses: ExtractedHouse[];
  usage: unknown;
}

/** PDF를 통째로 넣고 json_schema strict로 단지 표를 받는다. 텍스트 추출 단계 없음 (모델이 PDF 직접 입력 지원). */
export async function extractHousesFromPdf(pdf: Uint8Array, filename: string): Promise<ExtractionResult> {
  const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(180_000),
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_file', filename, file_data: `data:application/pdf;base64,${Buffer.from(pdf).toString('base64')}` },
            { type: 'input_text', text: PROMPT },
          ],
        },
      ],
      text: { format: { type: 'json_schema', name: 'houses', strict: true, schema: jsonSchema } },
    }),
  });
  const json = (await res.json()) as {
    error?: { message: string };
    status?: string;
    usage?: unknown;
    output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[];
  };
  if (!res.ok) throw new Error(`openai HTTP ${res.status}: ${json.error?.message ?? 'unknown'}`);
  const content = json.output?.flatMap((o) => o.content ?? []) ?? [];
  const refusal = content.find((c) => c.type === 'refusal')?.refusal;
  if (refusal) throw new Error(`openai refusal: ${refusal}`);
  const text = content.find((c) => c.type === 'output_text')?.text;
  if (!text) throw new Error(`openai empty output (status ${json.status})`);
  const houses = z.object({ houses: z.array(extractedHouseSchema) }).parse(JSON.parse(text)).houses;
  return { houses, usage: json.usage ?? null };
}
