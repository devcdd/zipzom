import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isAdminEmail, issueToken, refreshSessionIfNeeded, SESSION_COOKIE, verifyToken } from './auth.js';
import type { Request, Response } from 'express';

describe('session token', () => {
  const user = { id: 'u1', email: 'Me@Example.com', nickname: '집좀' };
  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-secret';
    process.env.ADMIN_EMAILS = 'me@example.com, other@x.com';
  });
  afterEach(() => {
    delete process.env.SESSION_SECRET;
    delete process.env.ADMIN_EMAILS;
  });

  it('발급한 토큰을 검증하면 사용자와 어드민 여부가 나온다', () => {
    expect(verifyToken(issueToken(user))).toEqual({ ...user, isAdmin: true });
  });

  it('서명이 다르면 null', () => {
    const t = issueToken(user);
    expect(verifyToken(t.slice(0, -1) + (t.endsWith('a') ? 'b' : 'a'))).toBeNull();
    process.env.SESSION_SECRET = 'other';
    expect(verifyToken(t)).toBeNull();
  });

  it('비어 있거나 형식이 아니면 null', () => {
    expect(verifyToken(undefined)).toBeNull();
    expect(verifyToken('garbage')).toBeNull();
  });

  it('ADMIN_EMAILS는 대소문자·공백 무시', () => {
    expect(isAdminEmail('ME@EXAMPLE.COM')).toBe(true);
    expect(isAdminEmail('nope@example.com')).toBe(false);
  });

  describe('슬라이딩 갱신', () => {
    const reqWith = (token: string) => ({ headers: { cookie: `${SESSION_COOKIE}=${token}` }, get: () => undefined, protocol: 'http' }) as unknown as Request;
    const res = () => {
      const calls: unknown[] = [];
      return { calls, cookie: (...a: unknown[]) => calls.push(a) } as unknown as Response & { calls: unknown[] };
    };

    it('만료 7일 안이면 재발급', () => {
      const r = res();
      expect(refreshSessionIfNeeded(reqWith(issueToken(user, Date.now() + 3 * 86_400_000)), r)).toBe(true);
      expect(r.calls).toHaveLength(1);
    });

    it('아직 여유 있으면 그대로', () => {
      const r = res();
      expect(refreshSessionIfNeeded(reqWith(issueToken(user, Date.now() + 20 * 86_400_000)), r)).toBe(false);
      expect(r.calls).toHaveLength(0);
    });

    it('만료·위조 토큰은 갱신 안 함', () => {
      const r = res();
      expect(refreshSessionIfNeeded(reqWith(issueToken(user, Date.now() - 1000)), r)).toBe(false);
      expect(refreshSessionIfNeeded(reqWith('garbage'), r)).toBe(false);
    });
  });
});
