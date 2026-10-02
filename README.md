# Drew Watkins — résumé site

This is a static, single-page résumé at https://drewwatkins.com. It has a portrait area and a password-gated editor. The layout and the portrait runtime are the same as lilysite. The color scheme is blue and gold.

The portrait area has no photo at this time. The page shows an empty gold studio arch where the portrait goes. The earlier AI-generated portrait was removed, and real photos of Drew replace it later (see "Install real photos").

The portrait runtime stays in place. It plays a ring of frames from one video: a canvas shows one frame at a time, and the cursor angle around the face selects the frame. It can also show one still photo.

## Layout

```
content/profile.json          all page text (the only content source)
public/index.html             layout; render:* regions come from profile.json
public/js/render.js           the renderer: Node build and in-page editor use it
public/js/editor.js           edit switch, password dialog, edit panel, publish
public/edit/lock.json         editor password hash; sealed GitHub token
public/styles.css             palette, layout, portrait surface, print sheet
public/editor.css             editor switch, dialog, and panel
public/js/main.js             portrait player: modes, smoothing, frame selection
public/js/{manifest,renderer,controller,stage,companion}.js   portrait runtime
(not installed) public/frames/       frame ring: frame_NNN.webp, metadata.json
(not installed) public/center.webp   ring frame with direct eye contact
(not installed) public/assets/drew/drew_still.png   one still photo
scripts/render_content.mjs    profile.json -> index.html (--check: stale test)
scripts/edit_lock.mjs         set the editor password; seal the GitHub token
scripts/extract_video_frames.py   video -> cutout frames, center.webp, metadata
scripts/check_site.py         static checks
scripts/verify_browser.mjs    headless Chrome checks (portrait, layout, editor)
scripts/build_dist.sh         public/ -> dist/ for GitHub Pages
.github/workflows/pages.yml   render, check, build, deploy on each push to main
```

## Run the site

```bash
python3 -m http.server 4173 -d public
```

Open `http://localhost:4173/`. To see the still photo without the ring, open `http://localhost:4173/?portrait=static`.

The portrait mode shows on `<figure id="portrait" data-mode>`:

| Mode | Installed files | The page shows |
|---|---|---|
| `empty` | none (now) | the gold arch only; the cue says "Photo coming soon" |
| `fallback` | `drew_still.png` | the still photo in the arch |
| `ring` | `frames/` and `center.webp` | the frame that follows the cursor |

## Install real photos

The site has no photo of Drew now. Use only real photos that Drew approves. Do not use generated or AI-changed images.

To show one still photo:

1. Save the photo as a PNG at `public/assets/drew/drew_still.png`. A portrait crop is best. The runtime puts the photo at the bottom of the 9:16 field and fills the space above it with the top-row color of the photo.
2. To put the photo on the printed résumé, save a copy in `public/`. Then set `PRINT_PHOTO` near the top of `public/js/render.js` to its path, for example `"/drew-print.jpg"`.
3. Run `node scripts/render_content.mjs`.
4. Run the checks in "Validation". The browser checks find the photo and check `fallback` mode.

To show a frame ring from real video, use the steps in "Make a frame ring from a video".

`scripts/make_og.mjs` makes the link preview card from the page. After you install a photo, run it again, and add 1 to `image_version` (default 4, in `render.js`). Without the new version, link previews keep the old card.

## Edit the site (for Drew)

1. Go to https://drewwatkins.com/#edit, or select "Edit site" at the bottom of the page.
2. Type the password, and then select "Unlock".
3. Click a text on the page to open its field in the panel. You can also open a group in the panel.
4. Type the change. The page shows the change at once.
5. To add an entry to a list, select "Add". To move or remove an entry, use the arrows or "Remove".
6. Select "Download edits". The browser saves your changes as `profile.json`.
7. Send `profile.json` to the site owner.
8. Select "Close" to stop editing.

Your draft stays in this browser until you discard it. Only you see the draft. Visitors see a change only after the site owner applies `profile.json`.

A section with no entries does not show on the page. For example, Experience shows after you add the first job.

The panel shows "Publish" in place of "Download edits" only after the site owner seals a GitHub token (see the next section). "Publish" then updates the live site in approximately 1–2 minutes.

To apply a downloaded `profile.json` (site owner): copy the file over `content/profile.json`, run `node scripts/render_content.mjs`, commit, and push to `main`.

## Set up publishing from the editor (one time, for the site owner)

The editor publishes with a GitHub token. The token is encrypted with the editor password and kept in `public/edit/lock.json`. Without the password, nobody can decrypt the token.

1. In GitHub, go to Settings, then Developer settings, then Personal access tokens, then Fine-grained tokens.
2. Select "Generate new token".
3. Set Repository access to "Only select repositories", and select `DavesGames123/drewsite`.
4. Under Repository permissions, set Contents to "Read and write". Give no other permission.
5. Set an expiration date, and then generate the token.
6. In the repository folder, run `node scripts/edit_lock.mjs seal`.
7. When the script asks, type the editor password and then paste the token.
8. Run `node scripts/edit_lock.mjs unseal-test`, and make sure that it shows "token opens".
9. Commit `public/edit/lock.json`, and then push to `main`.

WARNING: Do not commit the plain token or paste it into any file. A public token gives write access to the repository to all persons.

CAUTION: Keep the token limited to this one repository and to Contents only. A person who finds the password can then change only this site, and `git revert` repairs that change.

When the token expires, "Publish" shows "GitHub rejected the token". Do steps 1–9 again.

To change the password, run `node scripts/edit_lock.mjs password`. A new password deletes the sealed token, so seal the token again after the change.

## Deploy to drewwatkins.com

The site deploys like lilysite. Each push to `main` starts `.github/workflows/pages.yml`. The workflow renders `profile.json` into the page, runs `check_site.py`, builds `dist/`, prints the résumé PDF into `dist/`, and publishes `dist/` to GitHub Pages.

The status on 2026-10-01: steps 1 to 4 are complete. Use the steps again if the domain or the repository moves.

1. In Squarespace, open Domains, then drewwatkins.com, then DNS. Delete the Squarespace default records for `@` and `www`.
2. Add these custom records:
   - `@` A `185.199.108.153`
   - `@` A `185.199.109.153`
   - `@` A `185.199.110.153`
   - `@` A `185.199.111.153`
   - `www` CNAME `davesgames123.github.io`
3. In GitHub, open the repository Settings, then Pages. Set Source to "GitHub Actions". Do not select a suggested workflow.
4. In the same Pages settings, set Custom domain to `drewwatkins.com`. After the certificate is issued, select "Enforce HTTPS".
5. Push to `main`.
6. Open the Actions tab, and make sure that the "pages" run completes.
7. Open https://drewwatkins.com, and make sure that the portrait area shows the installed photo, or the empty gold arch if none is installed.

## Change the content without the editor

1. Edit `content/profile.json`. Use only facts from a real source.
2. Run `node scripts/render_content.mjs`.
3. Run `python3 scripts/check_site.py`.

The page is static HTML, so the résumé reads and prints without JavaScript.

## Make a frame ring from a video

1. Copy the new video to `public/character.mp4`. The video must be 9:16.
2. Install the requirements: `python3 -m pip install -r requirements.txt`.
3. Make a contact sheet, and find the frames where the head points up, left, down, and right.
4. Edit `KEYFRAMES` and `CENTER_SOURCE_FRAME` at the top of `scripts/extract_video_frames.py`.
5. Run `python3 scripts/extract_video_frames.py`.
6. Run `python3 scripts/check_site.py` and `node scripts/verify_browser.mjs`.

The extractor needs macOS for the Vision matte. Without the matte, it writes opaque frames.

`KEYFRAMES`, `CENTER_SOURCE_FRAME`, and `CROP` in the extractor still hold the values for the removed video. Set them for the new video before you run the extractor.

## Print

The printed résumé is a US Letter sheet, not the screen layout. `render.js` writes the `.print-sheet` block from `profile.json`, and only `@media print` shows it.

The footer link "Résumé (PDF)" downloads `/drew-watkins-resume.pdf`. The deploy makes this file: `scripts/build_pdf.mjs` prints the served `dist/` page in headless Chrome, with no browser header or footer. Thus an edit from the editor reaches the PDF in the same deploy. The script stops the deploy if the PDF is not 1 or 2 pages. The sheet has a headshot only when `PRINT_PHOTO` in `render.js` is set. It is empty now. The file is not in `public/`, so the link gives a 404 on a local server of `public/`. To make the PDF locally:

```bash
bash scripts/build_dist.sh
python3 -m http.server 4173 -d dist &
node scripts/build_pdf.mjs --url http://localhost:4173/ --out dist/drew-watkins-resume.pdf
```

Cmd+P on the page also prints the sheet, with the header and footer of the browser.

The sheet flows. The browser makes as many pages as the content needs, so the current profile prints on 1 page. A blue card with skills, honors, and links floats at the right of the main column. The sheet has no fixed page height, needs no `@page` margins, and uses no CSS mask. For this reason, it prints the same in Chrome, Safari, and Firefox.

To see the Safari result, run `scripts/print_webkit.swift`:

```bash
swiftc -O -o /tmp/print_webkit scripts/print_webkit.swift
/tmp/print_webkit http://localhost:4173/ /tmp/resume-webkit.pdf
```

## Color scheme

The accent is Berkeley California Gold `#fdb515` (`--gold-light`), and hairlines use Berkeley Medalist `#c4820e` (`--gold`). The studio arch is California Gold too (`--arch-gold`). The gold `rgb(239, 190, 49)` in `--arch-field` is the field behind an opaque still photo, and the print edge. When a frame ring is installed, `main.js` sets `--arch-field` from `frames/metadata.json`. The page is navy `#06142b`, and the Skills & honors band is Berkeley Blue `#003262` (`--navy`). The print sheet uses a gold top rule and a Berkeley blue (`#003262`) card. A matted ring cutout keeps its soft edge pixels from the video background.

## Validation

```bash
node scripts/render_content.mjs --check
python3 scripts/check_site.py
python3 -m http.server 4173 -d public &
EDIT_PASSWORD='…' node scripts/verify_browser.mjs --shots /tmp/drew-shots
```

`verify_browser.mjs` needs Google Chrome. It runs the editor checks only when `EDIT_PASSWORD` is set, so the password never goes into the repository. It runs the frame-ring checks only when `public/frames/` has a frame set. In the other case, it checks the `empty` or `fallback` mode.

`check_site.py` checks a frame set only when one is installed. It prints a NOTE when the frame set or the still photo is absent.
