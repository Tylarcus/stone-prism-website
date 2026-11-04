# Stone Prism — Homepage Music editor (V3.3)

The three cards on the homepage (Angel, Frog, Teeth) are now managed in
**Pages CMS**, not hardcoded into the website.

## Change what appears on the homepage

1. Open https://app.pagescms.org/ and choose **Tylarcus/stone-prism-website**.
2. Open **Homepage Music / Featured Cards**.
3. Each item in the ordered list represents one homepage card.
4. Move items up/down to reorder them, add cards, or delete items entirely.
5. For each card, select **one** source:
   - **Recording to feature** — select a recording from Music / Official releases & demos.
     Published recordings with audio play immediately from the homepage.
     YouTube-only recordings open their details/watch screen.
   - **Visual Archive artwork** — select a published item in Visual Archive
     (e.g. Frog cover or Teeth concept); tapping it opens the artwork viewer.
6. Optionally customize **Homepage card title override** and **Small caption**.
   Leave the title blank to use the selected entry's regular title.
7. Turn on **Hide this homepage card** to keep it in the editor without displaying it.
8. Save. GitHub Pages will rebuild the homepage.

The CMS list order controls the displayed order. You can feature more or
fewer than three cards: the same responsive card grid adapts automatically.

**Important:** The featured-recording selector may include drafts in its
choices, but the website publishes cards **only for published recordings**.
Changing a featured recording back to Draft hides it automatically.
A missing or deleted visual is also excluded from the generated homepage.

This list is separate from individual recording categories, library ordering,
and the Visual Archive's homepage picks. The player, playlist, and R2 URLs
continue working as before.

## Under the hood

- CMS file: \`content/home-music.json\`
- CMS schema: \`.pages.yml\`, under **Homepage Music / Featured Cards**
- Build safety: \`tools/build.mjs\` emits \`homeMusic\` from published references
- Rendering: \`script.js\` → \`initHomepageMusic()\`
- Mobile dock: compact CSS for screens up to 700px, with responsive static
  waveform canvases and a hidden routine status label.
