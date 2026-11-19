export const sourceFileLoaders = import.meta.glob(
  [
    '/src/**/*.{ts,tsx,css}',
    '!/src/utils/sourceFilesManifest.ts',
    '/index.html',
    '/package.json',
    '/vite.config.ts',
    '/tsconfig.json',
    '/vercel.json',
    '/firestore.rules',
    '/firestore.rules.test.ts',
    '/firebase-blueprint.json',
    '/firebase-applet-config.json',
    '/security_spec.md',
    '/metadata.json',
    '/eslint.config.mjs',
    '/.gitignore',
  ],
  { query: '?raw', import: 'default' }
) as Record<string, () => Promise<string>>;

export const imageAssetUrlLoaders = import.meta.glob(
  ['/src/assets/images/*.{jpg,jpeg,png,webp}'],
  { query: '?url', import: 'default' }
) as Record<string, () => Promise<string>>;

export const SOURCE_MANIFEST_TEMPLATE = '';
