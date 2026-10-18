// Baseline security headers for 8gentjr.com. Imported by next.config.mjs and by the test.
// The CSP below is REPORT-ONLY: the browser logs violations to the console and blocks nothing.
// There is no report endpoint yet. Enforcing is a follow-up once it has run clean.

const csp = [
  // Default: same origin only.
  "default-src 'self'",
  // Next.js inline bootstrap + JSON-LD need 'unsafe-inline' (no nonce yet); Clerk, its bot check, and
  // onnxruntime-web (loaded from jsDelivr by the on-device model) are the only third-party scripts.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://*.clerk.accounts.dev https://clerk.8gentjr.com https://challenges.cloudflare.com https://cdn.jsdelivr.net",
  // Tailwind and next/font emit inline styles; fonts are self-hosted by next/font.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // ARASAAC pictograms, Clerk avatars, generated canvas images.
  "img-src 'self' data: blob: https://static.arasaac.org https://api.arasaac.org https://img.clerk.com",
  // Audio is generated in the browser; blob: and data: cover it.
  "media-src 'self' blob: data:",
  // Clerk frontend API, ARASAAC search, and the on-device model download from Hugging Face.
  "connect-src 'self' https://*.clerk.accounts.dev https://clerk.8gentjr.com https://api.arasaac.org https://huggingface.co https://*.huggingface.co https://*.hf.co https://cdn.jsdelivr.net",
  // The on-device model runs in a blob/self Web Worker.
  "worker-src 'self' blob:",
  // YouTube embeds (help page, SchoolTube) and the Clerk/Cloudflare challenge frame.
  // SchoolTube uses youtube.com, not youtube-nocookie with click-to-load: tracked in 8gentjr#259.
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // Enforced and minimal: nobody may embed this site. Redundant with X-Frame-Options on purpose.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  // microphone=(self): VoicePlay and ChladniVisualizer (getUserMedia, analysed locally) and
  // VoiceCardCreator / useVoiceInput (browser Web Speech API) use the mic. The Web Speech API is NOT
  // on-device: Chrome and Edge stream the audio to Google, Safari to Apple. The privacy page
  // (src/app/privacy/page.tsx:134-137) currently says otherwise; tracked in 8gentjr#258.
  // Camera and geolocation are not used anywhere in src.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
  { key: 'Content-Security-Policy-Report-Only', value: csp },
];
