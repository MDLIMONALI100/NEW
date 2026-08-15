# MD Limon Ali — Portfolio

## File structure

```
/
├── index.html                 Structure & content
├── style.css                   All styling (design tokens at the top)
├── script.js                   Scroll reveals, stat counters, contact form
├── three-scene.js              The 3D hero scene (Three.js)
├── Md-Limon-Ali-Resume.pdf     Your resume (used by the "Resume" button)
├── favicon.ico                 Browser tab icon (16/32/48px, multi-size)
├── favicon-32x32.png           Standalone 32px icon
├── favicon-16x16.png           Standalone 16px icon
├── apple-touch-icon.png        iOS "Add to Home Screen" icon (180px)
├── site.webmanifest            PWA manifest referencing the icons below
└── assets/
    ├── profile.jpg              ← ADD THIS: your professional photo (see below)
    ├── icon-192.png             App icon, used by site.webmanifest
    ├── icon-512.png             App icon, used by site.webmanifest
    └── projects/
        ├── vira-skincare.jpg
        ├── fashion-trends.jpg
        ├── car-servicing.jpg
        ├── home-cleaning.jpg
        ├── woocommerce-store.jpg
        ├── portfolio.jpg
        ├── aurora-skincare.jpg      (in-progress project)
        └── analytics-site.jpg       (in-progress project)
```

## Adding your photo

Save your professional photo as **`assets/profile.jpg`** (that exact name and path) and it will appear in the About section automatically — no code changes needed. Any aspect ratio works (portrait or landscape); it's shown at its natural proportions, not cropped to a square. Until the file exists, the About section shows a clean placeholder saying "Add your photo as assets/profile.jpg" instead of a broken image.

## Adding your project images

Drop screenshots into `assets/projects/` using the exact filenames listed above.
If an image is missing, the card gracefully shows an "Add project image" placeholder instead of breaking — so the site never looks buggy while you're still collecting screenshots. Recommended: 1200×750px, JPG, under 300KB each (compress at squoosh.app or tinypng.com so the site stays fast).

## The two in-progress projects

"Aurora Skincare Store" and "Custom Analytics Business Site" are now in the same grid as your live projects (no separate section). Since they don't have live URLs yet, their cards currently link to `#contact` so an interested visitor can reach out — once each site is live, open `index.html`, find the card, and change `href="#contact"` to the real URL (and remove `data-inprogress="true"` and update the "In Progress — Get in Touch →" text to "View Project →" if you like).

## Adding your resume

Export your resume as `Md-Limon-Ali-Resume.pdf` and place it in the root folder (same level as `index.html`). The "Resume" button in the hero downloads it directly.

## Favicon & app icons

A full icon set was generated from an "ML" monogram matching the site's terracotta palette and the navbar's "ML/" mark — `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, and `assets/icon-192.png` / `assets/icon-512.png` (referenced by `site.webmanifest` for "Add to Home Screen"). These all work together already; nothing further to do unless you want to swap in your own logo later — just replace these files with same names/sizes.

## Hosting on GitHub Pages

1. Create a new repository (e.g. `portfolio` or `<your-username>.github.io` if you want it at the root domain).
2. Push all files in this folder to the repository root — `index.html` must be at the top level, not inside a subfolder.
3. In the repo: **Settings → Pages → Source → Deploy from a branch → main → / (root) → Save**.
4. Your site will be live at `https://<username>.github.io/<repo-name>/` within a minute or two.

```bash
git init
git add .
git commit -m "Portfolio site"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## Notes on the 3D hero

- Built with Three.js (loaded from a CDN — no build step, no npm required).
- On load, the shapes scale up from nothing and settle into place — a nod to code "compiling."
- On desktop, the shapes gently follow your mouse (parallax). On mobile, this is disabled and the canvas opacity is reduced for performance and battery life.
- If a visitor has "reduce motion" enabled in their OS, the scene renders statically — no spinning, no parallax.

## Customizing

- Colors, fonts, and spacing are all defined as CSS variables at the top of `style.css` under `:root` — change a value there and it updates everywhere.
- Skill bar percentages are set inline in `index.html` via `style="--w:90%"` on each `<li>` — adjust to taste.
- Stat numbers (projects shipped, platforms, etc.) are set via `data-target` attributes on `.stat-number` elements in `index.html`.
