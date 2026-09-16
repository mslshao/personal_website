# Michael Shao's personal website

A static personal website with a responsive photo gallery, local fonts, a contact form, and a downloadable resume. HTML, CSS, and JavaScript run directly in the browser. The host needs no Node.js, Python, or build process.

GitHub stores the website and maintenance sources. Publishing remains a manual upload through cPanel; pushing or merging a branch does not deploy the site.

## Preview locally

With Node.js installed:

```text
npm run preview
```

Visit <http://127.0.0.1:4173>. The preview binds to this computer only, disables caching, and serves only the website and its assets. External links and contact-form delivery need an internet connection. Open `index.html` directly for a simpler preview.

## Upload through cPanel

On Windows, prepare the upload:

```text
npm run package
```

This creates `release/site-upload.zip` and a SHA-256 file manifest. The ZIP contains 8 root files, `images/optimized/`, and `fonts/`, including the font licenses. It excludes local notes, tools, editable content, backups, and Git metadata.

1. Back up the current live website through cPanel.
2. Upload `release/site-upload.zip` into the document root assigned to **michaelshao.com** and extract it there. The ZIP has `index.html` at its top level; avoid an extra nested directory.
3. Preserve the host's `.htaccess`, `.well-known`, mail settings, redirects, and unrelated folders. This package does not alter them.
4. Delete the uploaded ZIP after extraction. Hard-refresh the live site, open a photograph, download the resume, and send yourself a contact-form test to confirm inbox delivery.

**Upload the prepared ZIP, not the entire repository.** If old archives or backup ZIPs remain publicly accessible on the host, back them up and move them outside the document root. A `robots.txt` rule is not access protection.

## Maintain the site

| Content | File or folder |
| --- | --- |
| Page content and links | `index.html` |
| Layout and colours | `styles.css` |
| Photo viewer | `site.js` |
| Optimized photographs | `images/optimized/` |
| Local fonts and licenses | `fonts/` |
| Editable resume | `content/resume.json` |
| Generated resume | `ms-resume.pdf` |
| Local preview, checks, and build tools | `tools/` |

CSS, JavaScript, and resume links include version queries in `index.html`. Update the relevant query when changing those files for publication. Use new image filenames when replacing images that may be cached.

### Resume

With Python installed:

```text
python -m pip install reportlab
python tools/build-resume.py
```

Edit `content/resume.json`, rebuild, visually review all PDF pages, update the resume link's version query, and rebuild the upload package.

### Photographs and fonts

Original photographs are kept outside this repository. The optimized assets are committed and need no build step for preview or publishing. To regenerate them, install the development dependencies and supply the original website folder, containing `images/` and `favicon.png`:

```text
npm install
npm run images -- "C:\path\to\original-website-folder"
```

Without an argument, the image tool looks for originals in this repository's root. Original files are never overwritten. Review the generated photographs and rebuild the upload package afterward.

`python tools/vendor-fonts.py` refreshes the existing Latin font subsets and their licenses from Google Fonts. This maintenance command needs internet access; the published site loads fonts locally. Preserve the included font licenses and `fonts/SOURCES.txt`.

## Validation

With Google Chrome installed, start the local preview in one terminal and run in another:

```text
npm install
npm test
```

The checks cover desktop and phone layouts, all gallery images, keyboard navigation, focus restoration, image loading and failure recovery, reduced motion, large text, local fonts with external connections blocked, and use without JavaScript. Form validation is tested locally with requests to Formspree blocked; the tests do not send messages. Real inbox delivery and host-specific HTTPS, redirects, and document-root settings need checking on the live host.

Screenshots and results go into `.local/checks/` and are ignored by Git. The suite defaults to installed Chrome. In PowerShell, `$env:TEST_BROWSER='msedge'` selects Edge; `$env:TEST_BROWSER='chromium'` uses Playwright's browser after `npx playwright install chromium`.

## History

The 2026 refresh replaces the active 2017 website with the locally reviewed static version. Previous PHP, libraries, photographs, and page versions remain available in Git history. Local archives, full-resolution originals, generated release ZIPs, and test output are excluded from new commits.
