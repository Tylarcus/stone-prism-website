# STONE PRISM — PUBLISHING SETUP (V2.5)

The approved website design is unchanged. This is the launch-ready copy.
It includes the actual website, content files, Pages CMS configuration,
and a GitHub Pages build workflow.

## First, create the GitHub repository
1. Sign into GitHub as Tylarcus.
2. Open https://github.com/new
3. Repository name: `stone-prism-website`
4. Choose **Public** if using GitHub Free with GitHub Pages.
   Note: A public repository exposes its source code and images.
   Do not put private demos, sensitive information, or unpublished audio in it.
5. Do NOT initialize with README, .gitignore or license.
6. Click Create repository.

## Upload these website files on your Surface
The most reliable GUI way is GitHub Desktop (https://desktop.github.com/).
1. Download/extract the Stone Prism launch ZIP.
2. Open GitHub Desktop and sign into the same GitHub account.
3. File > Clone repository, select `Tylarcus/stone-prism-website`,
   and choose where on your Surface to keep it.
4. Open the cloned repo folder. Copy **the contents** of the
   `Stone_Prism_Launch_Ready_V2_5` folder into the cloned repo root.
   Important: `index.html`, `.pages.yml`, `assets`, and `content`
   should be at the repository root, not inside an extra nested folder.
5. In GitHub Desktop enter summary `Add Stone Prism V2.5 launch site`,
   click Commit to main, then Push origin.

## Publish after verifying the GitHub upload
1. In GitHub visit the repo > Settings > Pages.
2. Under "Build and deployment" choose "GitHub Actions" as Source.
3. Check the Actions tab for "Stone Prism — publish website".
   Rerun the workflow if GitHub Pages was enabled after the first push.
4. Once deployed, the expected URL (if you chose that repository name) is:
   https://tylarcus.github.io/stone-prism-website/

## Enable the content dashboard
1. Go to https://app.pagescms.org/ and sign in with GitHub.
2. Authorize/install Pages CMS for `Tylarcus/stone-prism-website`.
3. Open the repo inside Pages CMS; it reads `.pages.yml`.
4. Use **Visual Archive** to add or edit images/categories, or
   **Music / Official releases & demos** to create content entries.
5. Save changes: Pages CMS writes to GitHub, and the workflow
   rebuilds the public site (once GitHub Pages is enabled).

## Recording policy
- The website has NO download buttons or download links.
- An audio track needs a separate hosted URL to play. No real audio
  or invented demo tracks are included yet.
- Streamed audio is not copy-protected. A determined person can capture it.
- Do not upload private or unreleased music to a public repo even as "draft":
  public GitHub files can be read regardless of on-site draft filtering.

## Troubleshooting
- If the homepage is 404, make sure `index.html` is at the repo root.
- If CMS doesn't show the repo, check its GitHub App installation permissions.
- If Pages isn't deploying, use Settings > Pages > Source: GitHub Actions,
  then Actions > publish workflow to inspect or rerun.
- If uploaded images don't show, inspect the media path and re-run the build.
- Until the repo is created, Pages CMS cannot connect or edit this website.
