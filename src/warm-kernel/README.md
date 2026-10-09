# Warm Kernel

Shared design tokens, header and footer for the 8gent family of sites. First
used on the 8gentjr.com home page (#251). Written to lift out into a shared
package for 8gent.world, 8gentos.com, 8gent.dev and 8gent.games later; nothing
here imports from the Jr app.

## Files

| File | What it is |
|------|------------|
| `tokens.ts` | The one source of truth: colour (light and dark), type scale, spacing, layout, radius, motion, focus ring. |
| `tokens.css` | Generated CSS custom properties (`--wk-*`). Run `bun run wk:css` after editing `tokens.ts`. |
| `warm-kernel.css` | Component and type styles that use only the tokens. |
| `Header.tsx` | Skip link, wordmark, nav, one primary action. Folds into a menu under 720px; Escape closes it. Without JavaScript the links stay visible. |
| `Footer.tsx` | Site links first, then the family, source, and "Built by the 8GI Foundation". |
| `color.ts` | Hue and WCAG contrast maths used by the tests. |
| `tokens.test.ts` | The gate. |

## What the tests hold

- No colour token has a hue in 270-350 (purple, pink, violet).
- Every text token is 7:1 or better on bg0, bg1 and bg2, in both sets. bg3 never carries text.
- Button label on its fill is 7:1. Focus ring and strong borders are 3:1 on every surface.
- `tokens.css` matches `tokens.ts` exactly.
- Reduced motion, and `data-wk-motion="none"`, set every duration to 0ms.

## Use

```tsx
import { Header, Footer } from '@/warm-kernel';
import '@/warm-kernel/tokens.css';
import '@/warm-kernel/warm-kernel.css';

<div className="wk-page" data-wk-motion="none">
  <Header product="8gent Jr" links={[...]} action={{ label: 'Get started', href: '/onboarding' }} />
  <main id="main" tabIndex={-1}>...</main>
  <Footer first={[...]} family={[...]} />
</div>
```

The brand orange `accent` is for large marks and decoration only. Text, links and
button fills use `accentInk`. Dark sites set `data-wk-theme="dark"` on the root.
