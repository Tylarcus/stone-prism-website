import { defineConfig } from 'astro/config';
import tina from '@tinacms/astro/integration';
import { tinaAdminDevRedirect } from '@tinacms/astro/vite';
import node from '@astrojs/node';
import cloudflare from '@astrojs/cloudflare';

// Local testing runs via Node. Cloudflare deployment is gated until the
// experimental domain and admin authentication are configured separately.
const useCloudflare = process.env.DEPLOY_ADAPTER === 'cloudflare';

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  output: 'server',
  adapter: useCloudflare ? cloudflare() : node({ mode: 'standalone' }),
  integrations: [tina()],
  vite: {
    plugins: [tinaAdminDevRedirect()],
    ssr: { noExternal: ['@tinacms/astro', '@tinacms/bridge'] },
  },
});