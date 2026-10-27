import variants from './optimizedAssets.json';

/** Atlas geometry is unchanged; only the transferred image format differs. */
export function optimizedAsset(url: string): string {
  const key = url.startsWith('/') ? url : `/${url}`;
  return (variants as Record<string, string>)[key] ?? url;
}
