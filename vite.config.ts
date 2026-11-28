import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'path';
import {defineConfig} from 'vite';
import { getContentSecurityPolicy } from './contentSecurityPolicy.ts';

export default defineConfig(({ mode }) => {
  const websupport = mode === 'websupport';
  return {
    base: websupport ? '/avert/' : './',
    publicDir: false,
    build: websupport ? { outDir: 'public', emptyOutDir: false } : undefined,
    plugins: [
      react(),
      tailwindcss(),
      ...(websupport ? [{
        name: 'avert-apache-config',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: '.htaccess',
            source: readFileSync(path.resolve(import.meta.dirname, 'deploy', 'websupport.htaccess')),
          });
        },
      }] : []),
      {
        name: 'atap-content-security-policy',
        transformIndexHtml(html, context) {
          const policy = getContentSecurityPolicy(context.bundle === undefined, false);
          const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
          return html.replace('</head>', `  ${meta}\n  </head>`);
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR === 'true'
        ? false
        : { host: '127.0.0.1', port: 24678, clientPort: 24678 },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
