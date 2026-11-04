# Editing Stone Prism website text

Open https://app.pagescms.org/, sign in with GitHub, choose **Tylarcus/stone-prism-website** on **main**, then select **Website Text & Settings**.

The editor has grouped fields for:
- **Homepage:** tagline beneath the logo, About paragraph, and section link labels.
- **Music page:** introduction, library heading, artwork heading, and empty-state messages.
- **Visual Archive page:** subtitle and gallery introduction.
- **Individual recording page:** description underneath the page's illustrated heading.
- **Footer & contact:** shared heading and message, plus optional public email, Instagram, YouTube, and Bandcamp links.
- **Browser titles & search descriptions:** per-page metadata.

When you save, Pages CMS commits `content/site-text.json` to GitHub. The existing GitHub Pages workflow rebuilds `data/site-content.js` and updates static HTML and SEO metadata before publishing. No hand-editing HTML is required.

**Appearance preserved:** Illustrated section headings are image assets, not plain text. V2.5 layout, artwork, colors, and animations are unchanged. Music release details and visual archive entries remain editable through their existing CMS sections.

**Privacy:** This GitHub repository is public, so a draft recording, contact email, or private audio URL in CMS is visible in its source even when omitted from the website. Do not save private or unreleased recordings in a public repo.

**Rollback:** The original V2.5 archive remains safely stored in Google Drive. The pre-upgrade source is also retained in GitHub commit history.
