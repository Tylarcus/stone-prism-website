// Preserve the existing Stone Prism homepage HTML (and its appearance) while
// replacing only its tagline with a Tina-managed Astro island.
export function splitLegacyHomepage(html) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1];
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!head || !body) throw Error('Original Stone Prism document is missing head/body.');
  const tag = /<p class="hero-kicker" data-cms-text="home\.tagline">[\s\S]*?<\/p>/g;
  const matches = [...body.matchAll(tag)];
  if (matches.length !== 1) {
    throw Error('Expected precisely one Stone Prism homepage tagline; refusing ambiguous edit.');
  }
  const [before, after] = body.split(tag);
  if (typeof after !== 'string') throw Error('Could not split legacy homepage.');
  return { head, before, after, originalTag: matches[0][0] };
}
