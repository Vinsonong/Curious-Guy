# Wildcrew

A single-page marketing site for a fictional small-group outdoor adventure company.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=flat-square&logo=githubpages&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)

## Live demo

**[vinsonong.github.io/Curious-Guy](https://vinsonong.github.io/Curious-Guy/)**

## About the project

Wildcrew runs guided hiking, surf, climbing, kayaking and wild camping
weekends across the UK and Europe — twelve people max, gear included, no
experience needed. This repo is the marketing site: a hero, a trust ticker,
six trip cards, a three-step "how it works", a photo gallery, a testimonial
carousel, a free pack-list lead magnet, an FAQ, a booking enquiry form, and a
floating WhatsApp chat widget.

Notable features:

- **Fully responsive**, mobile-first layout with breakpoints at 480 / 768 / 1024px
- **Accessible markup** — skip link, focus management on in-page navigation,
  `aria-current`/`role="group"` on the carousel, `aria-invalid`/`aria-describedby`
  wiring on every form field, and a palette checked against WCAG AA contrast
  ratios (4.5:1 for text, 3:1 for interactive control boundaries)
- **Scroll-reveal animation** that degrades gracefully — nothing hides unless
  JavaScript runs, `IntersectionObserver` is supported, *and* the user hasn't
  requested reduced motion
- **Crew Stories carousel** — CSS scroll-snap drives movement on mobile
  (native touch swiping); JS only builds the dot indicators and syncs them to
  scroll position. Above 768px it becomes a static 3-column grid
- **Two client-side-validated forms** (booking enquiry + pack-list signup)
  sharing one validation engine, with honeypot spam traps, inline error
  messages, and distinct success/error/timeout states — the page never reloads
- **Floating WhatsApp widget** — a disclosure panel (same open/close pattern
  as the mobile nav) with four pre-filled suggested queries and a general CTA,
  styled entirely from the site's own design tokens rather than WhatsApp's
  branding
- **Image-load fallback** — every photo is hotlinked from Unsplash; a failed
  load degrades to a pastel placeholder block instead of a broken-image icon
- **SEO/sharing metadata** — Open Graph/Twitter card tags, JSON-LD structured
  data (Organization, WebSite, FAQPage), `robots.txt`, and `sitemap.xml`

## Tech stack

**HTML, CSS and vanilla JavaScript only** — no framework, no bundler, no
`package.json`, no build step, no transpilation. The only outside resources
are hotlinked Unsplash photography and Google Fonts (`Bricolage Grotesque`,
`DM Sans`, `DM Mono`); everything else is three static files.

Deployed via **GitHub Actions** to **GitHub Pages** on every push to `main`.

## Project structure

```
.
├── index.html                    # All page sections + SEO/JSON-LD metadata
├── styles.css                    # Design tokens + mobile-first component rules
├── script.js                     # Nav, scroll reveal, carousel, forms
├── robots.txt                    # Points crawlers at sitemap.xml
├── sitemap.xml                   # Single-URL sitemap for the Pages site
└── .github/workflows/deploy.yml  # Build-free GitHub Pages deployment
```

## Installation / running locally

Nothing to install and no build step.

```bash
git clone https://github.com/Vinsonong/Curious-Guy.git
cd Curious-Guy
open index.html          # macOS — opens directly over file://
```

`index.html` also works served from a local static server, if you'd rather
avoid `file://` restrictions in your browser:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Configuration

Before this goes live for real, two placeholders need swapping:

- **`FORM_ENDPOINT`** and **`SIGNUP_ENDPOINT`** at the top of `script.js`
  currently point at `example.com`, so submissions intentionally take the
  network-error branch. Swap in a real endpoint (Formspree, Getform, or a
  custom API) — instructions are in the comment above them — and add its
  origin to the `connect-src` directive in `index.html`'s CSP `<meta>` tag.
- The footer's social links (Instagram, TikTok, Strava) and legal links
  (Privacy policy, Booking terms) are `href="#"` placeholders.

## Accessibility & browser support

Every text/background pair was checked against WCAG AA contrast thresholds
(4.5:1 for text, 3:1 for interactive control boundaries under WCAG 1.4.11),
with the ratios recorded as comments next to each color token in
`styles.css`. `prefers-reduced-motion` is respected throughout — reveal
animations, the loading spinner, and smooth-scroll all fall back to instant
behavior. No JavaScript framework dependencies means no minimum browser
version beyond `fetch`, `IntersectionObserver`, and CSS scroll-snap support
(all modern evergreen browsers).

## Credits

Built by [Vinsonong](https://github.com/Vinsonong), with assistance from
[Claude Code](https://claude.com/claude-code). Wildcrew is a fictional
company created for this project. Photography via
[Unsplash](https://unsplash.com/license); fonts via
[Google Fonts](https://fonts.google.com/).

## License

No license specified.
