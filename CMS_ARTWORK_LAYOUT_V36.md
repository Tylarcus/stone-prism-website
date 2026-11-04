# Stone Prism CMS V3.6 — Artwork Choice & Layout Defaults

## Choose artwork without destroying the original

**Music / Official releases & demos** → open a recording.

- **Cover art**: upload your original cover as before. This stays in the CMS even if you choose a different primary cover.
- **Use Visual Archive image as primary cover (optional)**: choose a *published* Visual Archive image to replace the displayed cover across the Music gallery, recording detail page and the persistent audio dock. Clear the selector to go back to the original upload.
- If your selected archive image is later unpublished or removed, the site automatically uses the uploaded cover again.

**Homepage Music / Featured Cards** → open the specific featured card:

- **Recording to feature**: choose the recording, as before.
- **Homepage-only artwork from Visual Archive**: choose a *different* published image for this card only. It does not affect the recording's primary cover.
- If that homepage-only reference goes away, the card falls back to its recording's primary cover. For a YouTube-only single without an explicit cover override, the default video preview remains the YouTube thumbnail.
- Audio cards still have the green Play button and video-only cards the YouTube-red Play button. Changing a cover doesn't affect media playback.
- The existing title and caption overrides are still separate.

**Artwork priority:** Homepage-only Visual Archive choice > Recording Visual Archive choice > original uploaded cover. For a YouTube-only single, the YouTube thumbnail is the *automatic preview* when there is no deliberate Visual Archive choice; the uploaded cover is fallback if the thumbnail fails.

The source JSON fields are \`artwork_visual\` (recording) and \`artwork_visual_override\` (homepage feature). These are optional, and previously published content requires no changes.

## Configure all four responsive galleries

Open **Website Layout Defaults** in Pages CMS.

| CMS group | Phone ≤680px | Tablet 681–980px | Desktop >980px |
| --- | ---: | ---: | ---: |
| Homepage Music / Releases | 2 | 3 | 3 |
| Homepage Visual Archive | 3 | 4 | 5 |
| Music / Recording Vault | 3 | 3 | 4 |
| Full Visual Archive | 3 | 4 | 4 |

These are starter values, not fixed limits. Each of the **12 dropdowns** supports 1 through 5 cards per row; change any value and Save to rebuild the site.

The defaults live in \`content/layout-defaults.json\`. The compiler rejects values outside 1–5, ensuring CSS never receives arbitrary values from the CMS.

### Visitor overrides

Visitors still have 1–5 column controls on the full Music and Visual Archive pages.
Their saved device-specific setting wins until they click **Reset to site default**.
Reset removes that visitor's saved choice for the current page and screen-size
category, then applies your CMS default.

Homepage gallery widths are set by your CMS only; there are no public density controls on the homepage.

## Technical safety

- Gallery references resolve only against published Visual Archive entries.
- The original upload is never overwritten or deleted when choosing an alternate.
- No R2 URL or MP3 is re-encoded; playback is unchanged.
- Static page navigation re-applies the current breakpoint's defaults.
- Automated checks cover published-only references, missing artwork fallback, CSS defaults, visitor overrides, mobile/tablet/desktop resizing and reset behavior.
