'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { TERRAFORM_PRESETS } from '@/ai/presets';
import { PROMPT_LIMIT } from '@/ai/terraformSchema';
import { useWorldStore } from '@/store/useWorldStore';
import { GlassPanel } from './GlassPanel';
import { ArrowIcon, SparkIcon } from './icons';

const MIN_PROMPT_LENGTH = 2;
const subscribeToNothing = () => () => undefined;
const readHasCommandKey = () => /Mac/.test(navigator.userAgent);
const readServerHasCommandKey = () => false;

export function CommandBar() {
  const open = useWorldStore((state) => state.commandOpen);
  const directing = useWorldStore((state) => state.directing);
  const setOpen = useWorldStore((state) => state.setCommandOpen);
  const direct = useWorldStore((state) => state.direct);
  const applyPreset = useWorldStore((state) => state.applyPreset);
  const [prompt, setPrompt] = useState('');
  const hasCommandKey = useSyncExternalStore(
    subscribeToNothing,
    readHasCommandKey,
    readServerHasCommandKey,
  );
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(!useWorldStore.getState().commandOpen);
      } else if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
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
      <GlassPanel className="rounded-full transition-transform duration-300 hover:scale-[1.02]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex items-center gap-3 rounded-full py-2.5 pl-4 pr-4 text-sm text-white/80 ${
            hasCommandKey ? 'sm:pr-3' : ''
          }`}
        >
          <SparkIcon />
          Describe a world to terraform
          {hasCommandKey && (
            <kbd className="hidden rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/70 sm:inline">
              Cmd K
            </kbd>
          )}
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
          placeholder="Misty emerald alpine valley at dawn"
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
          : 'Describe terrain, climate and light. Press Enter to terraform, Esc to dismiss.'}
      </p>
    </GlassPanel>
  );
}
