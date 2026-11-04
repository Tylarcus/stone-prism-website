# Stone Prism Player V3 — persistent jukebox

Stone Prism keeps its V2.5 layout and Pages CMS. This update changes how
visitors listen, not how the site is administered.

## Listening

- Clicking the Angel card on the homepage starts Angel immediately.
- Clicking any **playable recording card** in Music starts its first available
  MP3 in the bottom dock (without opening the big artwork detail page).
- A subtle **Track details** link still opens liner notes and the track list.
- On recording detail pages, Play starts the relevant track directly in the dock.
- The dock shows cover art, song title, play/pause, previous/next, song duration,
  an interactive WaveSurfer audio waveform and a colored animated spectrum.
- The waveform is an actual timeline of the recording, not a moving EQ.
  The spectrum bars use Web Audio AnalyserNode when available and have a
  graceful CSS animation fallback.
- Tracks in the published recording library with direct audio URLs form a
  playlist. After a track ends, the next direct-audio track starts automatically.
  Video-only entries are intentionally excluded from this audio playlist.
- The dock's Close button stops playback and unloads the recording.

## Site navigation

The site still serves independent index.html, music.html, visuals.html and
recording.html pages for direct links and search indexing. JavaScript catches
ordinary same-origin clicks between these pages, fetches the next document
and swaps only the .site and artwork dialog while retaining the dock's Audio
object outside .site. Browser Back/Forward uses History API popstate. A failed
fetch falls back to normal browser navigation (which stops the audio).

Tab closure still stops music. Android Chrome may expose browser/system
media controls using the Media Session API, including title, artwork, pause,
next/previous and seeking. Push notifications cannot keep a closed web tab
playing, and background behavior depends on device/browser restrictions.

## Adding songs

Upload an MP3 to Cloudflare R2. Copy the object's **complete public URL**,
then add it to the specific track's **Direct audio file URL (MP3 / R2)**
field in Pages CMS. Set the recording to Published to show it in the library.

Recording cards start the first available audio track. Album detail pages
allow choosing a particular track with a single Play click.

The audio object URL must allow CORS from the website for the WaveSurfer
visualization and the Web Audio analyser. See `R2_CORS_POLICY.json` in the repo.
For non-CORS audio, the browser may reject playback when the analyser requests
cross-origin audio. Test new audio sources in Chrome on Android.

## Verification

- `node --check player-v3.js`
- `node tools/build.mjs`
- `node tools/test-music.mjs`
- `node tools/test-player-v3.mjs`

After deployment, exercise the actual Android site:
1. Tap Angel on Home — playback starts with one tap, dock appears.
2. Open Music / Visuals / Home and browser Back — music stays playing.
3. Pause, resume, seek in waveform, close player and reopen.
4. Check phone media controls while backgrounded, but do not assume support.
5. When there are 2+ direct audio tracks, verify automatic next-track.
