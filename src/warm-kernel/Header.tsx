'use client';

/**
 * Warm Kernel shared header.
 *
 * Skip link first, wordmark left, nav, one primary action right. Below 720px
 * the nav and action fold into a disclosure menu. Without JavaScript the links
 * stay visible and wrap, so nothing is ever unreachable.
 */

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

export type WkLink = { label: string; href: string };

export type HeaderProps = {
  /** Product name shown in the wordmark, e.g. "8gent Jr". */
  product: string;
  /** Where the wordmark points. */
  homeHref?: string;
  /** Id of the main landmark the skip link jumps to. */
  mainId?: string;
  links: WkLink[];
  action?: WkLink;
};

export function Header({ product, homeHref = '/', mainId = 'main', links, action }: HeaderProps) {
  const [enhanced, setEnhanced] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setEnhanced(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="wk-header" data-enhanced={enhanced ? 'true' : 'false'} data-open={open ? 'true' : 'false'}>
      <a className="wk-skip" href={`#${mainId}`}>
        Skip to main content
      </a>
      <div className="wk-header__inner">
        <Link className="wk-wordmark" href={homeHref}>
          {product}
          <span className="wk-wordmark__dot" aria-hidden="true">.</span>
        </Link>

        <button
          ref={buttonRef}
          type="button"
          className="wk-menu-button"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Close' : 'Menu'}
        </button>

        <div className="wk-header__menu" id={menuId}>
          <nav aria-label="Main">
            <ul className="wk-nav">
              {links.map((l) => (
                <li key={l.href}>
                  <Link className="wk-nav__link" href={l.href} onClick={() => setOpen(false)}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {action ? (
            <Link className="wk-button wk-button--small" href={action.href}>
              {action.label}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
