import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { splitLegacyHomepage } from './split-home.mjs';

const source = fileURLToPath(new URL('../../index.html', import.meta.url));
test('the real Stone Prism homepage has exactly one replaceable tagline', () => {
  const html = readFileSync(source, 'utf8');
  const { head, before, after, originalTag } = splitLegacyHomepage(html);
  assert.match(head, /styles\.css/);
  assert.match(before, /class="hero/);
  assert.match(originalTag, /Songs, visuals, archives/);
  assert.match(after, /player-v3\.js/);
  assert.equal(before + originalTag + after, html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1]);
});
test('ambiguous markup fails safe rather than corrupting the replica', () => {
  assert.throws(() => splitLegacyHomepage('<html><head>x</head><body>missing</body></html>'),
    /Expected precisely one/);
});
