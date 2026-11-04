# Stone Prism Player V2 — Waveform, YouTube, Cloudflare R2

The approved V2.5 website design and Pages CMS remain intact. Player V2 adds
a responsive SoundCloud-inspired waveform (slime green, orange, red and purple),
an animated activity meter, optional YouTube video embeds, and a reliable
HTML audio fallback. There are no download buttons.

## Publishing with Pages CMS

Open https://app.pagescms.org/ → Tylarcus/stone-prism-website →
Music / Official releases & demos → choose a recording → Track list.

- Direct audio file URL (MP3 / R2): paste the full URL of an individual
  playable audio FILE, not the root of your bucket or a YouTube URL.
- YouTube video URL: paste the YouTube video link, optionally.
- Notes: optional description.

A track can have audio, video, both, or neither. Clicking Watch closes
and stops the audio; clicking Play clears any playing video iframe.
If YouTube disallows embedding, a link to open that video on YouTube remains.

Current user-supplied R2 public bucket base:
https://pub-720b5cbc80aa4d2a87d7b34a063dfe6f.r2.dev

That base address does NOT identify Angel's individual object. In your bucket's
Objects tab, select the actual Angel audio upload, copy its exact public object
URL (which includes the file path), and paste it in the audio URL field.

I Need You (Live Acoustic) is now a YouTube-only published item until an
audio file URL is added. Hole [Demo] remains unpublished. Angel [#] has
been staged as an unpublished CMS draft with the existing Angel artwork.
You can paste the exact R2 file URL into the Angel entry and publish it
when ready.

## Cloudflare R2 CORS for real waveforms

WaveSurfer.js fetches/decompresses the audio file to draw the real waveform.
The R2 bucket must allow the website's browser origin to fetch it.
In Cloudflare R2 → your bucket → Settings → CORS Policy → Add CORS policy,
paste the JSON from R2_CORS_POLICY.json in this repository, then Save.

That read-only policy allows GET and HEAD from stoneprism.music,
www.stoneprism.music and tylarcus.github.io; it permits the Range request
header and exposes basic range/length response headers.
Do not enable public write access or put API tokens into CMS.

A direct MP3 URL must also be public and respond with an audio type
such as audio/mpeg. If CORS is missing, the interactive waveform may
be unavailable; the backup native audio player can still play public audio.

WaveSurfer.js version 7.12.12 is loaded only when Play is clicked.
The colored waveform is derived from the actual recording; the little
animated bars are decorative, not audio-frequency analysis.
Long recordings may benefit from precalculated waveform peaks later.

Website-only is not private. Anyone who knows a public R2 object URL can
access it; the lack of a download button does not provide DRM.
The public r2.dev development URL is for testing and rate-limited.

Reference:
https://wavesurfer.xyz/docs/
https://developers.cloudflare.com/r2/buckets/cors/
