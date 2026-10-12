import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         -> dist/  (build normal, para servidor web)
// `npm run build:single`  -> docs/index.html (arquivo único, abre com duplo clique / GitHub Pages)
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: single ? [viteSingleFile()] : [],
    build: {
      outDir: single ? 'docs' : 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 4000,
      assetsInlineLimit: single ? 100_000_000 : 4096,
    },
    server: { host: true },
  };
});
