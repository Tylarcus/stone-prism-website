import { defineConfig } from 'tinacms';

// This Tina config edits only lab/content/homepage.json, NOT production
// content/site-text.json. It is deliberately a low-risk proof of concept.
// The current repo branch should remain an experiment until moved to its own
// repository and Cloudflare deployment.
export default defineConfig({
  branch: process.env.GITHUB_BRANCH || 'experiment/malevolent-tina-lab',
  clientId: process.env.PUBLIC_TINA_CLIENT_ID,
  token: process.env.TINA_TOKEN,
  build: { outputFolder: 'admin', publicFolder: 'public' },
  media: { tina: { mediaRoot: '', publicFolder: 'public' } },
  schema: {
    collections: [{
      name: 'homepage',
      label: 'Stone Prism Homepage (Experiment)',
      path: 'content',
      format: 'json',
      match: { include: 'homepage' },
      ui: { router: () => '/' },
      fields: [{
        type: 'string',
        name: 'tagline',
        label: 'Homepage tagline',
        isTitle: true,
        required: true,
      }],
    }],
  },
});
