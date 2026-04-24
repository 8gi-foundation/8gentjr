/**
 * /api/parent-chat — disabled.
 *
 * Removed on 2026-04-24 pending EU compliance review. The prior handler
 * returned AAC/SLP-style advice to parents, which is adjacent to MDR Class I
 * (medical device software) and AI Act Annex III (services affecting access
 * to essential services for vulnerable people). We will not re-enable until
 * legal review + DPAs with all processors are complete.
 *
 * See 8gi-governance/docs/legal/2026-04-24-8gentjr-eu-compliance-audit.md
 * (BAN RISK #1).
 */

export async function GET() {
  return new Response(
    JSON.stringify({ error: 'gone', message: 'This endpoint has been removed.' }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    }
  );
}

export const POST = GET;
