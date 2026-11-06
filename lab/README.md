# Malevolent Robotics / TinaCMS visual editor experiment

**Status: experimental, not deployed, not production-ready.**

This folder lives ONLY in the `experiment/malevolent-tina-lab` branch.
It inherits the true Stone Prism homepage HTML, CSS, JavaScript, artwork
and current music catalogue from the parent repository. The test substitutes
**one** editable TinaCMS island for the homepage tagline; everything else
still runs using the original website code.

## Requirements

- Node.js 22.22 or newer
- Git checkout of this experimental branch (not `main`)
- Internet connection to install npm dependencies

## Local proof of concept

```bash
cd lab
npm install
npm test
npm run dev
```

Open `http://localhost:4321/admin/index.html` and select
"Stone Prism Homepage (Experiment)" → `homepage.json`.
The visual editor should display the real Stone Prism homepage. Click its
tagline, edit the text, and watch the page update before saving.

This writes only `lab/content/homepage.json` in the *experimental branch*.
It does not change `content/site-text.json`, the Stone Prism site, or Cloudflare.

`npm run prepare:static` builds the source site's existing JSON content and
copies CSS/JS/images into the local `lab/public` folder.
**No MP3s are copied or uploaded.** Existing R2 URLs are used for playback.

## Intended next steps (not yet implemented)

1. Create a NEW private repo `Tylarcus/malevolent-tina-lab` and migrate
   this branch's site + `lab/` contents to it. Do not merge into `main`.
2. Create an isolated Cloudflare Workers deployment for a playground hostname
   such as `lab.malevolentrobotics.com`, behind Cloudflare Access.
3. Configure private TinaCMS auth. Do **not** publish an open `/admin` editor
   or expose write-capable R2 credentials to browser code.
4. Wire Tina media uploads through authenticated Worker endpoints to
   a SEPARATE R2 bucket. All new image/MP3 binaries must bypass Git.
5. Grow the clickable editor section-by-section; keep music playback and
   public site behavior identical as we port the remaining static HTML.
6. After verifying tests and permissions, decide if/how to move Stone Prism.

## Why not just move media today?

The current git-backed Pages CMS uploader intentionally stores binaries
in the public repo and syncs copies to R2. This experiment cannot use
that as a production media pipeline. The future Worker API requires
authentication, object-level access controls, safe replacement, and
reference validation before deletion.

## Deployment safeguard

There is NO Cloudflare deployment configured for this experiment.
Only the test workflow on this branch may run. The original publishing
workflow deploys from `main` only.
