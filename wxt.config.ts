import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  manifest: {
    name: 'Second Brain',
    description: 'Moteur de mémoire personnelle augmentée',
    version: '1.0.0',
    permissions: ['storage', 'sidePanel'],
    host_permissions: ['<all_urls>'],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
  },
  vite: () => ({
    optimizeDeps: {
      exclude: ['@electric-sql/pglite'],
    },
  }),
});
