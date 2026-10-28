/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'verify-admin-engine-isolation',
      generateBundle(_options, bundle) {
        const admin = Object.values(bundle).find(
          (entry) =>
            entry.type === 'chunk' &&
            entry.facadeModuleId?.replace(/\\/g, '/').endsWith('/src/admin/AdminApp.tsx'),
        );
        if (!admin || admin.type !== 'chunk')
          this.error('Admin entry is missing from the production bundle.');
        const pending = [admin.fileName],
          seen = new Set<string>();
        while (pending.length) {
          const name = pending.pop()!;
          if (seen.has(name)) continue;
          seen.add(name);
          const chunk = bundle[name];
          if (!chunk || chunk.type !== 'chunk') continue;
          if (
            Object.keys(chunk.modules).some((id) =>
              id.replace(/\\/g, '/').includes('/node_modules/phaser/'),
            )
          )
            this.error('Admin entry must not statically load Phaser.');
          pending.push(...chunk.imports);
        }
      },
    },
  ],
  server: { port: 5173, watch: { ignored: ['**/.preview/**'] } },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: { game: 'index.html', admin: 'admin/index.html' },
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.includes('commonjsHelpers')) return 'vendor-helpers';
          if (id.replace(/\\/g, '/').includes('/node_modules/phaser/')) return 'phaser';
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Tests must never depend on the developer's .env.local: with credentials
    // present the auth screen would hit the real network and hang.
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
});
