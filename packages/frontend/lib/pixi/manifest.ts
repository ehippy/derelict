export type AtlasMode = "grid" | "flood";

export interface AtlasManifestEntry {
  pack: string;
  name: string;
  atlas: string; // path relative to /atlases/, e.g. "some-pack/some-sheet.json"
  image: string;
  mode: AtlasMode;
  frameCount: number;
  sourcePath: string;
}

const MANIFEST_URL = "/atlases/manifest.json";

export async function loadAtlasManifest(): Promise<AtlasManifestEntry[]> {
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) {
    throw new Error(`Failed to load atlas manifest: ${res.status}`);
  }
  return res.json();
}

export function atlasUrl(entry: AtlasManifestEntry): string {
  return `/atlases/${entry.atlas}`;
}
