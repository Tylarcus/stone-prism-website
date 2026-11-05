# Stone Prism — Upload MP3 files directly from Pages CMS

## Goal

**No more copying R2 links between browser tabs.**

Pages CMS `Music / Official releases & demos` → open a recording → expand a track →
**Upload MP3 (no Cloudflare login)** → pick an MP3 → Save. The GitHub Pages
publish workflow copies any new MP3 files to Cloudflare R2 and generates the
public audio URL automatically. The website player and waveform generator use
that URL. This is a staged-upload approach, not a direct browser-to-R2 upload.

Artwork already uploads directly through Pages CMS. No change is required
to its image or Visual Archive workflow.

## One-time setup (required before uploading the first new MP3)

The existing public R2 URL in `content/audio-host.json` matches the public host
currently used by Stone Prism's songs. Check that it belongs to **your existing
R2 bucket** before configuring the uploader. Do not create a second bucket
unless you deliberately update this configuration.

In Cloudflare R2, create a new API token scoped to **only the bucket containing
your current songs**, with Object Read & Write access. Never put credentials
in Pages CMS, the public repository, the website, or this chat.

In the **GitHub repository** `Tylarcus/stone-prism-website`, go to
Settings → Secrets and variables → Actions → New repository secret.
Create these four secrets:

| Secret name | Value |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID (not your domain or bucket ID) |
| `R2_BUCKET` | Exact name of your existing R2 bucket |
| `R2_ACCESS_KEY_ID` | Access Key ID from the bucket-scoped R2 token |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key from that R2 token |

Only you can configure these secrets. The GitHub Actions workflow is designed
to **fail clearly** if MP3s have been added before the credentials are configured;
it will not silently publish a broken audio link.

## Daily editing workflow

1. Open https://app.pagescms.org/ and choose `Tylarcus/stone-prism-website`.
2. Open **Music / Official releases & demos**.
3. Create or edit a recording, expand **Track list**, and type the song title.
4. In **Upload MP3 (no Cloudflare login)**, choose your MP3 (preferably **under
   25 MiB**, due to GitHub browser/file API limitations).
5. Leave **Existing direct MP3 link** blank for new recordings. A CMS MP3 file
   takes priority if both are present.
6. Set the recording to **Published** (or **Draft** to keep it off the site),
   then save. Pages CMS saves the metadata and media into the GitHub repository.
7. GitHub Actions automatically copies files from `media/audio/` into the
   R2 prefix `cms-audio/`, builds the website and publishes it.

No additional Cloudflare dashboard visit, bucket navigation, or copy/paste is
necessary for subsequent uploads.

## Existing recordings

All existing manually pasted Cloudflare R2 MP3 links remain working exactly
as before. No need to reupload or migrate those songs.

## Hiding versus deleting

- Set a recording's **Publishing status** to **Draft** to hide it from
  the website without losing its metadata or audio file.
- **The MP3 stays in R2 and in GitHub's file history**. Draft does *not*
  make it secret, erase it, or revoke a previously shared direct URL.
- Upload only content you're permitted to publish. The repository is public.
- There is **no automatic deletion** of R2 objects when recording metadata is
  hidden or removed. This is intentional to prevent accidental data loss.
- Avoid uploading private, unreleased, or sensitive audio using this public
  repository. Use a private, authenticated storage workflow for that.

## Limits and troubleshooting

- This version accepts **MP3 only**. Export to MP3 before uploading.
- Keep individual songs under ~25 MiB for reliable browser/CMS uploads.
  Large WAV/FLAC/live recordings and bigger MP3s should use a future direct
  Cloudflare R2 upload interface, not GitHub storage.
- The Github repository stores MP3 files as binary objects and can grow with
  usage. If a band's library becomes large, switch to a **secure direct-to-R2
  uploader** rather than copying hundreds of MP3s into Git.
- The workflow never uploads the staged MP3s as GitHub Pages site assets;
  only the R2 public URL is used by the player.
- The R2 API token must have permission to list and write objects in the
  selected bucket. If the workflow fails, review the GitHub Actions log for
  the precise error; existing published songs remain unaffected.
- To avoid accidental filename collisions, Pages CMS gives newly uploaded
  MP3 files random names. Their display titles remain what you type in the
  recording editor.
- The sync is **copy only**; it does not delete old songs or rename the original
  files already in your R2 bucket.

## Notes for future freelance clients

Each client's bucket, scoped token, and GitHub repository must be separate.
Do not share the Stone Prism R2 token or grant clients permissions to your
personal GitHub account.

For larger libraries or polished paid-client workflows, a small authenticated
uploader using **R2 presigned URLs** is the better long-term solution. It can
upload songs straight to R2 with file-size validation and no Git binary history,
but it requires its own secure backend and client authentication.
