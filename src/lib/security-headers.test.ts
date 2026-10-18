import { describe, expect, test } from 'bun:test';
// @ts-expect-error plain .mjs module shared with next.config.mjs
import { securityHeaders } from '../../security-headers.mjs';
import nextConfig from '../../next.config.mjs';

const get = (k: string): string | undefined =>
  (securityHeaders as { key: string; value: string }[]).find((h) => h.key === k)?.value;

describe('baseline security headers', () => {
  test('required headers are present', () => {
    expect(get('X-Content-Type-Options')).toBe('nosniff');
    expect(get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(get('X-Frame-Options')).toBe('DENY');
    expect(get('Content-Security-Policy')).toBe("frame-ancestors 'none'");
  });
  test('permissions policy denies camera and geolocation, mic only for self', () => {
    const p = get('Permissions-Policy')!;
    expect(p).toContain('camera=()');
    expect(p).toContain('geolocation=()');
    expect(p).toContain('microphone=(self)');
  });
  test('full CSP is report-only, never enforced', () => {
    const ro = get('Content-Security-Policy-Report-Only')!;
    expect(ro).toContain("default-src 'self'");
    expect(ro).toContain("frame-ancestors 'none'");
    expect(get('Content-Security-Policy')).not.toContain('default-src');
  });
  test('next.config applies them to every route', async () => {
    const rules = await (nextConfig as { headers: () => Promise<{ source: string; headers: unknown }[]> }).headers();
    expect(rules).toEqual([{ source: '/:path*', headers: securityHeaders }]);
  });
});
