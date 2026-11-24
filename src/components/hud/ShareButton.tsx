'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, LinkIcon } from './icons';
import { currentWorldUrl } from './WorldLinkSync';

const CONFIRMATION_MS = 1800;

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), CONFIRMATION_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const url = currentWorldUrl();
    window.history.replaceState(window.history.state, '', url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? 'Link copied' : 'Copy a link to this world'}
      title={copied ? 'Link copied' : 'Copy a link to this world'}
      className={`flex items-center justify-center rounded-xl border px-3 py-2 transition-colors ${
        copied
          ? 'border-emerald-300/50 bg-emerald-300/20 text-emerald-100'
          : 'border-white/15 bg-white/5 text-white/70 hover:text-white'
      }`}
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
    </button>
  );
}
