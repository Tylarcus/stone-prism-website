# Stone Prism V3.5 — homepage visuals and one-tap YouTube

## Why the Music page changed

**Music / Recording Vault** contains recordings only. The legacy "Archive
Artwork" section and its misleading "Audio link not yet available" notices
were removed. The actual **Visual Archive** remains under Visuals.

## Choose homepage pictures in Pages CMS

1. Open https://app.pagescms.org/ and select Tylarcus/stone-prism-website.
2. Open **Homepage Visual Archive / Featured Images**.
3. Add an artwork entry to feature, drag the list entries to change their
   order, toggle **Hide** to remove it temporarily, or delete a row.
4. Click Save. Publishing rebuilds the homepage automatically.

The original five homepage pictures were preserved in the same order
(wood illustration, Stone Prism figure, frog poster, January 2016 flyer,
customized guitar). The selection is in \`content/home-visuals.json\`.
Only published Visual Archive entries are displayed. The old per-image
\`featured_home\` flag is retained in source for compatibility, but is no
longer the homepage selector in CMS.

## Homepage music format labels

Homepage featured recording cards now display a small **Single**, **EP**,
**Album**, **Demo**, or **Collection** label on the cover, matching the
compact format on Music. Artwork-only cards have no music-format badge.

## Video-only singles

YouTube-only recordings with one track use the actual YouTube thumbnail
as the card's square preview. One tap opens the YouTube iframe in an
in-page modal and requests autoplay, without a separate details-page
click. The card keeps its title, description and Single badge.

YouTube requires embedded players to be at least 200 × 200 pixels.
The small square cards are *previews*: the actual iframe opens in a
larger responsive viewer (16:9, or letterboxed when necessary), so
YouTube controls remain usable and no video is cropped. Some browsers
may still block autoplay on the first tap; an on-screen YouTube Play
button and direct "Watch on YouTube" link remain available.
Closing the modal removes its iframe to stop video sound.

Audio-only and audio+video singles continue using Stone Prism's native
player when clicked; videos remain reachable on recording detail pages
for tracks with both links. Multi-track albums open their track list.

YouTube embed reference: https://developers.google.com/youtube/player_parameters
