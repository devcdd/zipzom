import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { parse } from '../validate.js';
import { NoticesService } from './notices.service.js';

const csv = z
  .string()
  .optional()
  .transform((s) => (s ? s.split(',').filter(Boolean) : null));

const querySchema = z.object({
  supplyType: csv,
  phase: csv.pipe(z.array(z.enum(['upcoming', 'open', 'closed'])).nullable()),
  sigungu: csv,
  sido: csv,
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

@Controller('notices')
export class NoticesController {
  constructor(private readonly notices: NoticesService) {}

  @Get()
  list(@Query() query: Record<string, string>) {
    const f = parse(querySchema, query);
    return this.notices.list({
      supplyTypes: f.supplyType,
      phases: f.phase,
      sigunguCodes: f.sigungu,
      sidoCodes: f.sido,
      q: f.q ?? null,
      limit: f.limit,
      offset: f.offset,
    });
  }
}
