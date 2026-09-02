import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';

// 숫자 컬럼(bigint/numeric/int8)이 문자열로 오는 pg 기본 동작 회피. 금액이 2^53을 넘지 않으므로 안전
pg.types.setTypeParser(20, Number);
pg.types.setTypeParser(1700, Number);

@Injectable()
export class Db implements OnModuleDestroy {
  private readonly pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const { rows } = await this.pool.query(sql, params);
    return rows as T[];
  }

  async one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return (await this.query<T>(sql, params))[0];
  }

  /** 커넥션 하나를 잡고 트랜잭션 실행. 풀에 begin/commit을 따로 보내면 다른 커넥션에 갈 수 있어 이 경로만 쓴다. */
  async tx<T>(fn: (q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const r = await fn(async (sql, params = []) => (await client.query(sql, params)).rows);
      await client.query('commit');
      return r;
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }

  onModuleDestroy() {
    return this.pool.end();
  }
}
