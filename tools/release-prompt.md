# Release prompt: build the cPanel upload package

Hand the prompt below to a local Claude session on the Windows machine, or tell it to read this file and follow the prompt. The commit, file hashes, and resume version query are for the `cd46ca5` release; update them when the site content changes.

```text
Build the cPanel upload package for my personal website from the latest GitHub master. The Git clone is at C:\Users\Michael\OneDrive\PersonalWebsite\.local\github\personal_website. Work only in that clone. The parent folder, C:\Users\Michael\OneDrive\PersonalWebsite, is my older working copy (original photos, archives, and possibly an older release\ folder). Use nothing from it except where step 3 says so. This is Windows, so use PowerShell.

Goal: a single release\site-upload.zip inside the clone, built from master at commit cd46ca50ecd01213d97f7a5fd334c46946ed9fda (or a later master commit), with no older ZIPs left anywhere I might mistake for it. I'll do the cPanel upload myself.

Rules:
- Don't commit, push, stash, or discard anything.
- Don't run `npm run images` or `tools/build-resume.py`. Both regenerate files that are already committed.
- Moving files into a `.local\` folder is fine. Don't delete anything except Thumbs.db or .DS_Store.
- The folders are synced by OneDrive. If a Git or npm step fails with a lock or access-denied error, stop and tell me rather than retrying.
- If any other step fails, stop and show me the output.

1. Sync
   - Run `git status --porcelain`. If any tracked files are modified, stop and show me `git diff --stat`. `npm install` may later create an untracked package-lock.json; ignore that file.
   - Run `git fetch origin`, `git checkout master`, then `git pull --ff-only origin master`. If the pull won't fast-forward, stop.
   - Confirm `git merge-base --is-ancestor cd46ca50ecd01213d97f7a5fd334c46946ed9fda HEAD` exits 0.

2. Check that the files to be packaged match what Git tracks
   tools\package.ps1 copies 8 root files, plus images\optimized\ and fonts\ as they are on disk. Any stray local file in those folders would end up on the live site.
   - `git status --porcelain --ignored -- images/optimized fonts` must print nothing. If the only hits are Thumbs.db or .DS_Store, delete them. Otherwise stop and list them.
   - Confirm these SHA-256 hashes on disk:
     ms-resume.pdf  6cc702fb6aefb6ec4af8c4182b0bcbd6f3f1ca2c7dace0bc8feabc995f768981
     images\optimized\social-card-1200x630.jpg  3a2ef1febae7be67e0546930bf0d0f95ce230d592aae214a160cd51b2b161243

3. Clear old release output
   - In the clone: if release\ exists, move everything in it into .local\old-releases\<yyyyMMdd-HHmmss>\ inside the clone.
   - In the parent: if C:\Users\Michael\OneDrive\PersonalWebsite\release\ contains anything, report each file's name and timestamp, then move them into C:\Users\Michael\OneDrive\PersonalWebsite\.local\old-releases\<same timestamp>\.
   - Search C:\Users\Michael\OneDrive\PersonalWebsite for any other files named *upload*.zip outside .local\. List them, but don't move them.

4. Test
   - Run `npm install`.
   - Start `npm run preview` in the background (it serves http://127.0.0.1:4173), run `npm test`, then stop the preview. The tests use the installed Chrome; if Chrome isn't installed, set `$env:TEST_BROWSER='msedge'` first. If the tests fail, stop and show me the failure.

5. Package
   - Run `npm run package`. It writes release\site-upload.zip and release\manifest.json.

6. Check the ZIP itself, not just the source folder
   - index.html sits at the top level of the ZIP, not inside a nested folder.
   - The ZIP holds exactly 54 files: 8 at the root, 36 under images/optimized/, and 10 under fonts/. The list matches `git ls-files` for those paths.
   - The index.html inside the ZIP contains `social-card-1200x630.jpg`, `ms-resume.pdf?v=20261105` and `https://www.linkedin.com/in/mshao`, and does not contain `ca.linkedin.com`.
   - The ms-resume.pdf and social-card-1200x630.jpg inside the ZIP match the hashes from step 2.

Report back as a short list: the ZIP's absolute path, size and last-modified time, the HEAD commit, any older ZIPs found or moved, and pass or fail for each check. That ZIP is the only thing I'll upload.
```
