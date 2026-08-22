# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page marketing site for a fictional IT services provider, **Meridian Systems**.
Three files, no framework, no build step, no external images:

- `index.html` — all five sections (hero, services, testimonials, enquiry, footer)
- `styles.css` — design tokens + mobile-first component rules
- `script.js` — nav, scroll reveal, carousel, form

Hard constraint from the original brief: **HTML, CSS and vanilla JS only.** No
dependencies, no bundler, no `package.json`, no transpilation. Do not introduce
any. `index.html` must work when opened directly from disk over `file://`.

## Commands

There is no build, no lint config and no test runner — the site is opened directly.

```bash
open index.html            # macOS; render the page
node --check script.js     # syntax-check the JS (only real "lint" available)
```

No browser or headless driver is installed. Anything visual (layout at each
breakpoint, hamburger behaviour, the fetch branches) needs a browser the user
opens; verify what you can statically and say plainly what you could not.

### Verification that has to be scripted

Two checks matter enough that they were run during the build and should be re-run
after touching colors or the form. Both are throwaway scripts, not committed files.

**Contrast** — the palette is close enough to the AA threshold that eyeballing is
not sufficient. Compute WCAG ratios directly (relative luminance → `(hi+0.05)/(lo+0.05)`)
for every text pair against its actual background. Text needs 4.5:1; boundaries of
interactive controls need 3:1 under WCAG 1.4.11.

**Form validation** — test the shipped rules rather than a retyped copy: read
`script.js`, slice from `const EMAIL_RE` to the end of the `RULES` object, `eval`
it in Node, and assert against cases. Phone must accept `+44 20 7946 0958`,
`(020) 7946 0958` and `020-7946-0958`.

A useful static sweep: confirm no duplicate `id`s, that every `label[for]`,
`href="#…"`, `aria-controls` and `aria-labelledby` resolves to a real id, and that
`{`/`}` counts in the CSS match.

## Architecture

### Design tokens are the only place colors live

`:root` in `styles.css` holds every raw color. **Component rules must contain no
raw hex or `rgba()`** — including translucent overlays, which are tokenized as
`--c-veil-*`. Verified by grepping for color literals outside the `:root` block.

Sole unavoidable exception: the select chevron and the checklist tick are inline
SVG data URIs, where `var()` cannot be used. Their hex is duplicated from a token,
so a palette change means editing those two data URIs by hand.

Three token decisions carry reasoning that is easy to undo by accident:

- **`--c-copper` is `#A64F26`, not the display copper `#C2703D`.** The lighter value
  only reaches 3.1:1 on the bone background and fails AA for text. Do not "restore"
  it.
- **`--c-copper-light` is for charcoal surfaces only.** It fails AA on light ones.
- **Two border tokens, deliberately.** `--c-border` (`#DCD7CF`) is decorative — card
  edges, dividers. `--c-border-strong` (`#8A8377`) is for boundaries of interactive
  controls (inputs, carousel dots, arrow buttons) because those need 3:1 under WCAG
  1.4.11 and `--c-border` is only ~1.4:1. Using the wrong one is a silent
  accessibility regression.

### Scroll reveal is gated on a JS-added class

`styles.css` only hides `.reveal` elements under a `.js-reveal` ancestor, and
`initReveal()` adds that class to `<html>` — but bails first if the user prefers
reduced motion or `IntersectionObserver` is missing. Net effect: with JS off,
motion reduced, or the API absent, nothing is ever hidden.

**Never move the hiding styles out from under `.js-reveal`.** That would leave the
whole page invisible whenever JS does not run.

### Carousel: one DOM, two layouts

The testimonials are a single markup structure serving both breakpoints:

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

### Form: rules keyed by control name

`RULES` in `script.js` maps each control's `name` to a function returning an error
string (or `''` when valid). Two conventions tie the three files together:

- The error element's id **must** be `<control-name>-error`; `validateField()`
  derives it and wires `aria-describedby` to it.
- `.field--error` goes on the `.field` wrapper; `aria-invalid` goes on the control.

**Adding a field** therefore means three coordinated edits: the `.field` markup
(label + control + `<p id="<name>-error" role="alert">`), a `RULES` entry (return
`''` for optional fields, as `company` does), and nothing else — the control list
is derived from `Object.keys(RULES)`.

Behaviour worth preserving: validate on `blur`, but on `input`/`change` only
*clear* an already-shown error, so the user is not corrected mid-keystroke.

`FORM_ENDPOINT` at the top of `script.js` is a placeholder pointing at
`example.com`, so live submissions intentionally take the network-error branch.
Swap-in instructions for Formspree/Getform/a custom API are in the comment above
it. Submission is fully intercepted — `preventDefault()`, JSON via `fetch`, with
distinct messages for success, non-2xx (includes the status code) and
network/`AbortError` timeout. The page must never reload.

The honeypot is `input[name="website"]`, positioned off-screen via `.hp` rather
than `display: none`, because bots skip hidden inputs. When filled, the form shows
the normal confirmation and sends nothing.

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

## Known loose end

`og:image` is a commented-out placeholder in `index.html` — the brief ruled out
image files. It needs an absolute URL to a hosted 1200×630 image before launch, or
link previews render bare.
