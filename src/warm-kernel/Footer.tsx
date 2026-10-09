/**
 * Warm Kernel shared footer. Same component on every 8gent site.
 * `first` holds the links a site leads with (Jr: privacy and help).
 */

import Link from 'next/link';
import type { WkLink } from './Header';

export type FooterProps = {
  /** Links that come first, e.g. privacy, help, feedback. */
  first: WkLink[];
  /** The 8gent family, as shown on this site. */
  family: WkLink[];
  /** Source code for this site. */
  sourceHref?: string;
};

const isExternal = (href: string) => /^https?:\/\//.test(href);

function FooterLink({ link }: { link: WkLink }) {
  if (isExternal(link.href)) {
    return (
      <a className="wk-footer__link" href={link.href} rel="noopener">
        {link.label}
      </a>
    );
  }
  return (
    <Link className="wk-footer__link" href={link.href}>
      {link.label}
    </Link>
  );
}

export function Footer({ first, family, sourceHref }: FooterProps) {
  return (
    <footer className="wk-footer">
      <div className="wk-footer__inner">
        <nav aria-label="Site" className="wk-footer__group">
          <h2 className="wk-footer__heading">This site</h2>
          <ul className="wk-footer__list">
            {first.map((l) => (
              <li key={l.href}>
                <FooterLink link={l} />
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="The 8gent family" className="wk-footer__group">
          <h2 className="wk-footer__heading">The 8gent family</h2>
          <ul className="wk-footer__list">
            {family.map((l) => (
              <li key={l.href}>
                <FooterLink link={l} />
              </li>
            ))}
            {sourceHref ? (
              <li>
                <FooterLink link={{ label: 'Source code on GitHub', href: sourceHref }} />
              </li>
            ) : null}
          </ul>
        </nav>
        <p className="wk-footer__org">
          Built by the{' '}
          <a className="wk-footer__link" href="https://8gi.org" rel="noopener">
            8GI Foundation
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
