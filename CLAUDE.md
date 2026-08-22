# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page marketing site for a fictional small-group outdoor adventure
company, **Wildcrew** (guided hiking, surf, climbing, kayaking and wild
camping weekends across the UK and Europe). Three files, no framework, no
build step:

- `index.html` — hero, trust ticker, trips, how-it-works, gallery,
  testimonials/carousel, pack-list lead magnet, FAQ, enquiry form, footer
- `styles.css` — design tokens + mobile-first component rules
- `script.js` — nav, scroll reveal, image fallback, carousel, two forms

Hard constraint from the original brief: **HTML, CSS and vanilla JS only.** No
dependencies, no bundler, no `package.json`, no transpilation. Do not
introduce any.

Unlike an earlier draft of this brief, this version **does** pull in outside
resources: photography is hotlinked from the Unsplash CDN and type comes from
Google Fonts (`Bricolage Grotesque`, `DM Sans`, `DM Mono`). `index.html`
therefore needs network access for images/fonts to render as designed, but
still opens and functions (forms, nav, carousel) directly from disk over
`file://` — see the image-fallback note below for what happens without a
connection.

## Commands

There is no build, no lint config and no test runner — the site is opened directly.

```bash
open index.html            # macOS; render the page
node --check script.js     # syntax-check the JS (only real "lint" available)
```

No browser or headless driver is installed. Anything visual (layout at each
breakpoint, hamburger behaviour, the fetch branches, hotlinked images
failing) needs a browser the user opens; verify what you can statically and
say plainly what you could not.

### Verification that has to be scripted

Two checks matter enough that they were run during the build and should be re-run
after touching colors or either form. Both are throwaway scripts, not committed files.

**Contrast** — the palette is close enough to the AA threshold that eyeballing is
not sufficient. Compute WCAG ratios directly (relative luminance → `(hi+0.05)/(lo+0.05)`)
for every text pair against its actual background. Text needs 4.5:1; boundaries of
interactive controls need 3:1 under WCAG 1.4.11.

**Form validation** — test the shipped rules rather than a retyped copy: read
`script.js`, slice from `const EMAIL_RE` to the end of the `SIGNUP_RULES`
object, `eval` it in Node, and assert against cases. Phone must accept
`+44 20 7946 0958`, `(020) 7946 0958` and `020-7946-0958`. There are two rule
sets now — `RULES` (enquiry form: name, email, phone, groupsize, trip,
message) and `SIGNUP_RULES` (pack-list form: packlistEmail only) — both are
keyed off `EMAIL_RE`/`PHONE_SHAPE_RE`, so test both.

A useful static sweep: confirm no duplicate `id`s, that every `label[for]`,
`href="#…"`, `aria-controls` and `aria-labelledby` resolves to a real id, and that
`{`/`}` counts in the CSS match.

## Architecture

### Design tokens are the only place colors live

`:root` in `styles.css` holds every raw color. **Component rules must contain no
raw hex or `rgba()`** — including translucent overlays, which are tokenized as
`--c-veil-*`. Verified by grepping for color literals outside the `:root` block.

The palette is a "sun-faded trail patch" direction: pastel surfaces
(`--c-cream`, `--c-sky`, `--c-mint`, `--c-blush`, `--c-butter`, `--c-lilac`)
plus low-strength washes of the same hues for large fields, dark ink text
(`--c-ink`, `--c-ink-soft`), and two accent text colors (`--c-teal-deep`,
`--c-clay-deep`) chosen to clear 4.5:1 on their worst-case surface — each
ratio is noted in a comment next to its token. Do not swap in a lighter/louder
version of an accent without re-checking contrast on every surface it's used on.

Sole unavoidable exception: the select chevron and the checklist tick are inline
SVG data URIs, where `var()` cannot be used. Their hex is duplicated from a token
(`--c-teal-deep` for the tick, `--c-ink` for the chevron), so a palette change means
editing those two data URIs by hand.

**Two border tokens, deliberately.** `--c-border` (`#E7DFD6`) is decorative — card
edges, dividers. `--c-border-strong` (`#6E7F88`) is for boundaries of interactive
controls (inputs, carousel dots, arrow buttons) because those need 3:1 under WCAG
1.4.11 and `--c-border` is only ~1.7:1. Using the wrong one is a silent
accessibility regression.

### Hotlinked photography needs a fallback path

Every `<img>` on the page points at the Unsplash CDN — there are no local
image assets. `img { background: var(--c-sky-wash) }` in `styles.css` reserves
the aspect box (and gives a pastel placeholder look) while an image loads.
`initImageFallback()` in `script.js` adds `.img--failed` to any `<img>` whose
`naturalWidth` is 0 once loading settles (including an `error` listener for
images that fail after the initial check), and `.img--failed::after` paints
the same wash over the space so a broken connection degrades to a clean
placeholder block instead of a row of broken-image icons. **Do not remove
either half of this pair** — the CSS background alone doesn't cover images
that fail after already starting to load, and the JS class alone does nothing
without the CSS rule.

The CSP `<meta>` tag in `<head>` allowlists exactly the third parties in use:
`fonts.googleapis.com`/`fonts.gstatic.com` for type, `images.unsplash.com` for
photos, and `connect-src` for the form endpoints. **Adding any new external
resource (a different CDN, an analytics script, a new font host) requires
adding its origin to the CSP too**, or the browser will silently block it.
Note `frame-ancestors`/`X-Frame-Options` cannot be set from a `<meta>` tag —
that needs real response headers from whatever host eventually serves this.

### Scroll reveal is gated on a JS-added class

`styles.css` only hides `.reveal` elements under a `.js-reveal` ancestor, and
`initReveal()` adds that class to `<html>` — but bails first if the user prefers
reduced motion or `IntersectionObserver` is missing. Net effect: with JS off,
motion reduced, or the API absent, nothing is ever hidden.

**Never move the hiding styles out from under `.js-reveal`.** That would leave the
whole page invisible whenever JS does not run.

### Carousel: one DOM, two layouts

The "Crew stories" testimonials are a single markup structure serving both
breakpoints:

- **Below 768px** — `.carousel__track` is a flex row with `scroll-snap-type: x mandatory`.
  **CSS does all the movement**; touch swiping is native. JS only generates the dot
  buttons, calls `scrollTo`, and reads `scrollLeft` back (rAF-throttled) so the dots
  follow manual swipes.
- **768px and up** — the same track becomes a 3-column grid, `overflow: visible`,
  and the controls are `display: none`.

`script.js` holds `mqDesktop = matchMedia('(min-width: 768px)')`, which **mirrors the
CSS breakpoint and must be changed alongside it.** Scroll and arrow-key handlers
no-op when it matches, and the track drops to `tabindex="-1"` on desktop since it
is no longer a scrollable region.

Dot buttons use **`aria-current`, not `aria-selected`**, and the container is
`role="group"`. There are no real tabpanels here, so `aria-selected` would be
invalid ARIA and gets flagged by Lighthouse. The CSS active-state selector keys off
`[aria-current="true"]`.

### Two forms, one shared engine

There are now two forms, and both run through the same helpers in `script.js`
(`validateField`, `clearFields`, `bindLiveValidation`, `setStatus`,
`setLoading`, `postJSON`):

- **`#enquiry-form`** — full booking enquiry (name, email, phone, group size,
  trip select, message). Rules live in `RULES`, keyed by control name.
- **`#packlist-form`** — single-field email capture for the free "Weekend Pack
  List" lead magnet. Rules live in `SIGNUP_RULES` (currently just
  `packlistEmail: RULES.email`, so the email rule can't drift between forms).

Conventions that tie the three files together, for **either** form:

- The error element's id **must** be `<control-name>-error`; `validateField()`
  derives it and wires `aria-describedby` to it.
- `.field--error` goes on the `.field` wrapper; `aria-invalid` goes on the control.

**Adding a field** therefore means three coordinated edits: the `.field` markup
(label + control + `<p id="<name>-error" role="alert">`), a `RULES` (or
`SIGNUP_RULES`) entry (return `''` for optional fields, as `groupsize` and
`message` do), and nothing else — each form's control list is derived from
`Object.keys(RULES)` / `Object.keys(SIGNUP_RULES)`.

Behaviour worth preserving: validate on `blur`, but on `input`/`change` only
*clear* an already-shown error, so the user is not corrected mid-keystroke.

`FORM_ENDPOINT` and `SIGNUP_ENDPOINT` near the top of `script.js` are both
placeholders pointing at `example.com`, so live submissions intentionally take
the network-error branch. Swap-in instructions for Formspree/Getform/a custom
API are in the comment above them — remember the CSP `connect-src` change
above when you do. Submission is fully intercepted for both forms —
`preventDefault()`, JSON via `fetch`, with distinct messages for success,
non-2xx (includes the status code) and network/`AbortError` timeout. Neither
page ever reloads.

Each form has its own honeypot (`input[name="website"]` on the enquiry form,
`input[name="packlistWebsite"]` on the pack-list form), positioned off-screen
via `.hp` rather than `display: none`, because bots skip hidden inputs. When
filled, the form shows the normal confirmation and sends nothing.

`CONTACT_EMAIL`/`CONTACT_PHONE` constants near the top of `script.js` back the
error copy for both forms plus the `noscript` fallback — keep them in sync
with the footer/JSON-LD if the real contact details ever change.

### Responsive and motion conventions

Mobile-first; breakpoints at **480 / 768 / 1024** only. No horizontal scroll at
320px — keep `min-width: 0` on grid/flex children and `overflow-wrap: anywhere` on
long strings like the email address.

Every animation and smooth scroll has a `prefers-reduced-motion` escape: the media
query at the end of `styles.css` neutralizes transitions, the spinner and reveals,
and `script.js` passes `behavior: 'auto'` to `scrollIntoView`/`scrollTo` when it
matches.

Anchor clicks are intercepted in `initSmoothScroll()`, which also moves focus to
the target (`tabindex="-1"` + `focus({preventScroll: true})`) so keyboard and
screen-reader users follow the visual jump. This includes the skip link.

### Structured data and metadata are load-bearing

`index.html`'s `<head>` carries a JSON-LD `@graph` (Organization, WebSite,
FAQPage) plus Open Graph/Twitter card tags — `og:image` is a real, live
Unsplash URL (not a placeholder). If FAQ copy in the `<details>` elements
changes, update the matching `Question`/`acceptedAnswer` pairs in the JSON-LD
too, or the two will drift.

## Known loose ends

- The three footer social links (Instagram, TikTok, Strava) and the two footer
  legal links (Privacy policy, Booking terms) are all `href="#"` placeholders —
  needs real URLs before launch.
- `FORM_ENDPOINT` and `SIGNUP_ENDPOINT` in `script.js` still point at
  `example.com` — see the forms section above for what to swap in, and the CSP
  `connect-src` change that has to go with it.
