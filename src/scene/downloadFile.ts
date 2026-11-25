import { useWorldStore } from '@/store/useWorldStore';

function worldFileName(extension: string): string {
  const { world, seed } = useWorldStore.getState();
  const slug = world.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `orogen-${slug}-${seed}.${extension}`;
}

export function downloadWorldFile(blob: Blob | null, extension: string): void {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement('a'), { href: url, download: worldFileName(extension) });
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
