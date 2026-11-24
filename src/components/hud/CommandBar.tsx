'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { TERRAFORM_PRESETS } from '@/ai/presets';
import { PROMPT_LIMIT } from '@/ai/terraformSchema';
import { useWorldStore } from '@/store/useWorldStore';
import { GlassPanel } from './GlassPanel';
import { ArrowIcon, SparkIcon } from './icons';
import { useFirstVisit } from './useFirstVisit';
import { useRotatingText } from './useRotatingText';

const MIN_PROMPT_LENGTH = 2;
const PROMPT_ROTATION_MS = 3200;
const EXAMPLE_PROMPTS = [
  'Misty emerald alpine valley at dawn',
  'Stormy volcanic coast at midnight',
  'Autumn broadleaf hills under a pink sunrise',
  'Frozen fjord in a snowstorm',
  'Alien violet canyon with twisted spires',
  'Tropical atoll lagoon at high noon',
] as const;

export function CommandBar() {
  const open = useWorldStore((state) => state.commandOpen);
  const directing = useWorldStore((state) => state.directing);
  const setOpen = useWorldStore((state) => state.setCommandOpen);
  const direct = useWorldStore((state) => state.direct);
  const applyPreset = useWorldStore((state) => state.applyPreset);
  const [prompt, setPrompt] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const [firstVisit, completeOnboarding] = useFirstVisit();
  const example = useRotatingText(EXAMPLE_PROMPTS, PROMPT_ROTATION_MS, open && prompt.length === 0);

  useEffect(() => {
    if (open && firstVisit) completeOnboarding();
  }, [open, firstVisit, completeOnboarding]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, setOpen]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (trimmed.length < MIN_PROMPT_LENGTH || directing) return;
    await direct(trimmed);
    setPrompt('');
  };

  if (!open) {
    return (
      <GlassPanel
        className={`rounded-full transition-transform duration-300 hover:scale-[1.02] ${
          firstVisit ? 'animate-[beckon_2.6s_ease-in-out_infinite]' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-white/80"
        >
          <SparkIcon />
          Describe a world to terraform
        </button>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel
      ref={panelRef}
      role="dialog"
      aria-label="AI terraformer"
      className="w-[min(40rem,calc(100vw-2rem))] rounded-3xl p-3"
    >
      <form onSubmit={submit} className="flex items-center gap-3 px-2">
        <SparkIcon className={directing ? 'animate-spin text-white' : 'text-white/70'} />
        <input
          autoFocus
          value={prompt}
          maxLength={PROMPT_LIMIT}
          disabled={directing}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Tab' && prompt.length === 0) {
              event.preventDefault();
              setPrompt(example);
            }
          }}
          placeholder={example}
          aria-label="World description"
          className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/35"
        />
        <button
          type="submit"
          disabled={directing || prompt.trim().length < MIN_PROMPT_LENGTH}
          aria-label="Terraform"
          className="flex size-9 items-center justify-center rounded-full bg-white text-slate-900 transition-opacity disabled:opacity-30"
        >
          <ArrowIcon />
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/10 px-1 pt-3">
        {TERRAFORM_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={directing}
            onClick={() => applyPreset(preset)}
            title={preset.prompt}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition-colors hover:border-white/35 hover:bg-white/15 hover:text-white disabled:opacity-40"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p className="px-2 pb-1 pt-2.5 text-[11px] text-white/40" aria-live="polite">
        {directing
          ? 'Directing geology, biomes and atmosphere'
          : 'Describe terrain, climate, weather and light. Tab takes the suggestion, Enter terraforms.'}
      </p>
    </GlassPanel>
  );
}
