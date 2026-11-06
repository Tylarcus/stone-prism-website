import { mkdirSync, existsSync, cpSync, copyFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const pub = resolve(here, '../public');

// Build the actual existing CMS data so the music/visual pages and player
// continue working in the clone. Never upload songs: this is local-only.
execFileSync(process.execPath, [join(repo, 'tools/build.mjs')], { cwd: repo, stdio: 'inherit' });
mkdirSync(pub, { recursive: true });
for (const folder of ['assets', 'data']) {
  cpSync(join(repo, folder), join(pub, folder), { recursive: true, force: true });
}
const mediaImages = join(repo, 'media/images');
if (existsSync(mediaImages)) {
  cpSync(mediaImages, join(pub, 'media/images'), { recursive: true, force: true });
}
for (const file of ['styles.css', 'script.js', 'player-v3.js', 'music.html', 'visuals.html', 'recording.html']) {
  copyFileSync(join(repo, file), join(pub, file));
}
console.log('Lab: source design, scripts, artwork, and generated CMS data copied; no MP3s copied.');
