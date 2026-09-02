import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isAdminEmail, issueToken, verifyToken } from './auth.js';

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
});
