/* ==========================================================================
   Wildcrew — behaviour
   Vanilla JS, no dependencies. Everything is scoped inside one IIFE.
   ========================================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     Where the two forms POST their JSON payloads.

     Swap these placeholders for your real endpoints:
       Formspree  -> 'https://formspree.io/f/XXXXXXXX'
       Getform    -> 'https://getform.io/f/XXXXXXXX'
       Custom API -> '/api/enquiries'

     The requests below send `Content-Type: application/json` and
     `Accept: application/json`, which is what Formspree and Getform both
     expect in order to reply with JSON instead of redirecting to their own
     thank-you page. A custom API only needs to accept a JSON body and return
     any 2xx status on success.

     As shipped these point at example.com, so a real submission will take the
     network-error branch. That is expected until you set live endpoints.
     -------------------------------------------------------------------------- */
  const FORM_ENDPOINT = 'https://example.com/api/enquiries';
  const SIGNUP_ENDPOINT = 'https://example.com/api/packlist';

  /* Contact details, kept here so the error copy below cannot drift from the
     markup. Update alongside index.html. */
  const CONTACT_EMAIL = 'hey@wildcrew.example';
  const CONTACT_PHONE = '+44 20 7946 0958';

  /* How long to wait before giving up on a request, in milliseconds. */
  const REQUEST_TIMEOUT = 15000;

  /* Media queries and motion preference, read once and reused. */
  const mqDesktop = window.matchMedia('(min-width: 768px)');
  const mqReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => mqReduceMotion.matches;

  /* matchMedia listener registration, with the Safari < 14 fallback. */
  function onMediaChange(mq, handler) {
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
    else mq.addListener(handler);
  }

  /* ========================================================================
     Footer year
     ======================================================================== */

  /* Writes the current year into the footer line so it never goes stale. */
  function initYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ========================================================================
     Photography
     ======================================================================== */

  /* Every photo is hotlinked from the Unsplash CDN, so opening the page with
     no connection would otherwise leave a row of broken-image icons. Marking
     the failures lets CSS fall back to the pastel placeholder block that the
     `img { background }` rule already paints. */
  function initImageFallback() {
    document.querySelectorAll('img').forEach((img) => {
      const flag = () => img.classList.add('img--failed');
      if (img.complete && img.naturalWidth === 0) flag();
      img.addEventListener('error', flag);
    });
  }

  /* ========================================================================
     Navigation
     ======================================================================== */

  /* Wires up the mobile hamburger menu: toggles the open state, keeps
     aria-expanded in sync, and closes the panel on link click, on Escape, and
     when the viewport grows past the desktop breakpoint. */
  function initNav() {
    const header = document.getElementById('site-header');
    const toggle = header && header.querySelector('.nav__toggle');
    const panel = document.getElementById('primary-nav');
    if (!header || !toggle || !panel) return;

    const setOpen = (open) => {
      header.classList.toggle('nav--open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    /* Any nav link tap on mobile should collapse the menu it came from. */
    panel.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });

    /* Escape closes the menu and returns focus to the button that opened it. */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    /* A menu left open while rotating to landscape/desktop would otherwise
       linger in the DOM with a stale aria-expanded="true". */
    onMediaChange(mqDesktop, (e) => { if (e.matches) setOpen(false); });
  }

  /* ========================================================================
     Smooth scrolling
     ======================================================================== */

  /* Handles in-page anchor clicks: scrolls the target into view (instantly if
     the user prefers reduced motion) and moves keyboard focus to the target so
     screen reader and Tab order follow the visual jump. */
  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const id = link.getAttribute('href');
      if (!id || id === '#') return;

      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start'
      });

      /* Sections are not natively focusable, so make them programmatically
         focusable without adding them to the Tab sequence. */
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });

      /* Keep the URL shareable without triggering a second native jump. */
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', id);
      }
    });
  }

  /* ========================================================================
     Scroll reveal
     ======================================================================== */

  /* Fades sections in as they enter the viewport using IntersectionObserver.
     The hiding styles are gated behind a .js-reveal class on <html>, so if JS
     is unavailable, the observer is unsupported, or the user prefers reduced
     motion, the class is never added and everything renders visible. */
  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;

    document.documentElement.classList.add('js-reveal');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    items.forEach((item) => observer.observe(item));
  }

  /* ========================================================================
     Crew stories carousel (mobile only)
     ======================================================================== */

  /* Drives the mobile testimonial carousel. Movement itself is CSS scroll-snap,
     so touch swiping works natively; this only builds the dot indicators, moves
     the scroll position for the dots/arrows, and reads scroll position back to
     keep the indicators and arrow disabled states accurate. Above 768px the
     track is a static 3-column grid and the controls are hidden by CSS. */
  function initCarousel() {
    const root = document.querySelector('[data-carousel]');
    if (!root) return;

    const track = root.querySelector('[data-carousel-track]');
    const dotsWrap = root.querySelector('[data-carousel-dots]');
    const prevBtn = root.querySelector('[data-carousel-prev]');
    const nextBtn = root.querySelector('[data-carousel-next]');
    const slides = Array.prototype.slice.call(root.querySelectorAll('[data-slide]'));
    if (!track || !dotsWrap || !slides.length) return;

    let index = 0;

    /* One dot button per slide, created here rather than hardcoded in the HTML
       so the markup stays in sync if a story is added or removed. */
    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel__dot';
      dot.setAttribute('aria-label', 'Go to story ' + (i + 1) + ' of ' + slides.length);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
      return dot;
    });

    /* Distance between two adjacent slides, including the flex gap. Measured
       rather than assumed, so changing the gap token needs no JS change. */
    function slideStep() {
      if (slides.length < 2) return track.clientWidth || 1;
      return Math.abs(slides[1].offsetLeft - slides[0].offsetLeft) || track.clientWidth || 1;
    }

    /* Reflects the active index onto the dots and arrow disabled states. */
    function render() {
      dots.forEach((dot, i) => {
        if (i === index) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === slides.length - 1;
    }

    /* Scrolls to a slide by index, clamped to the available range. */
    function goTo(i) {
      index = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({
        left: index * slideStep(),
        behavior: prefersReducedMotion() ? 'auto' : 'smooth'
      });
      render();
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goTo(index - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(index + 1));

    /* Derive the active index from the real scroll position so manual swipes
       keep the dots honest. Throttled to one read per animation frame. */
    let ticking = false;
    track.addEventListener('scroll', () => {
      if (ticking || mqDesktop.matches) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const next = Math.round(track.scrollLeft / slideStep());
        if (next !== index && next >= 0 && next < slides.length) {
          index = next;
          render();
        }
        ticking = false;
      });
    });

    /* Left/right arrow keys step through slides when the track has focus. */
    track.addEventListener('keydown', (e) => {
      if (mqDesktop.matches) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
    });

    /* On desktop the track is a grid, not a scroller — drop it out of the tab
       order and reset state so returning to mobile starts from slide one. */
    function syncBreakpoint() {
      if (mqDesktop.matches) {
        track.setAttribute('tabindex', '-1');
      } else {
        track.setAttribute('tabindex', '0');
        index = Math.round(track.scrollLeft / slideStep()) || 0;
        render();
      }
    }
    onMediaChange(mqDesktop, syncBreakpoint);

    syncBreakpoint();
    render();
  }

  /* ========================================================================
     Shared form helpers
     ======================================================================== */

  /* Deliberately permissive: one @, a dot in the domain, no whitespace.
     Stricter patterns reject valid real-world addresses. */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  /* Allows the separators people actually type: + ( ) - . and spaces. */
  const PHONE_SHAPE_RE = /^\+?[\d\s().-]+$/;

  /* Validation rules, one entry per control. Each returns an error message
     string, or an empty string when the value is acceptable. Optional fields
     return '' unconditionally, or only complain about a value that is present
     but malformed. */
  const RULES = {
    name: (v) => {
      if (!v) return 'Enter your name.';
      if (v.length < 2) return 'That name looks too short.';
      return '';
    },
    email: (v) => {
      if (!v) return 'Enter your email address.';
      if (!EMAIL_RE.test(v)) return 'Enter a valid email address, like you@example.com.';
      return '';
    },
    phone: (v) => {
      if (!v) return 'Enter a phone number we can reach you on.';
      if (!PHONE_SHAPE_RE.test(v)) return 'Use digits, spaces and + ( ) - only.';
      const digits = v.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) return 'Enter a phone number of 7 to 15 digits.';
      return '';
    },
    groupsize: () => '', /* optional — "just me", "4 of us", a number, anything */
    trip: (v) => (v ? '' : 'Pick a trip, or choose "Not sure yet".'),
    message: (v) => {
      if (!v) return ''; /* optional */
      if (v.length < 10) return 'Add a little more detail, or leave this blank.';
      return '';
    }
  };

  /* The pack-list signup validates one field with the same email rule. */
  const SIGNUP_RULES = {
    packlistEmail: RULES.email
  };

  /* Writes or clears the inline error for one control, keeping aria-invalid
     and aria-describedby in step so assistive tech announces the problem.
     The error element's id must be `<control-name>-error`. Returns true when
     the field is valid. */
  function validateField(control, rules) {
    const message = rules[control.name](String(control.value || '').trim());
    const field = control.closest('.field');
    const errorEl = document.getElementById(control.name + '-error');

    if (message) {
      control.setAttribute('aria-invalid', 'true');
      control.setAttribute('aria-describedby', control.name + '-error');
      if (field) field.classList.add('field--error');
      if (errorEl) errorEl.textContent = message;
      return false;
    }

    control.removeAttribute('aria-invalid');
    control.removeAttribute('aria-describedby');
    if (field) field.classList.remove('field--error');
    if (errorEl) errorEl.textContent = '';
    return true;
  }

  /* Clears error state from a set of controls without re-validating. */
  function clearFields(controls) {
    controls.forEach((control) => {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
      const field = control.closest('.field');
      if (field) field.classList.remove('field--error');
      const errorEl = document.getElementById(control.name + '-error');
      if (errorEl) errorEl.textContent = '';
    });
  }

  /* Validate on blur; on input/change, only clear an error that is already
     showing, so the user is not corrected mid-keystroke. */
  function bindLiveValidation(controls, rules) {
    controls.forEach((control) => {
      control.addEventListener('blur', () => validateField(control, rules));

      const liveEvent = control.tagName === 'SELECT' ? 'change' : 'input';
      control.addEventListener(liveEvent, () => {
        if (control.getAttribute('aria-invalid') === 'true') validateField(control, rules);
      });
    });
  }

  /* Writes a status message and its state onto a status element. */
  function setStatus(el, text, state) {
    if (!el) return;
    el.textContent = text || '';
    if (state) el.setAttribute('data-state', state);
    else el.removeAttribute('data-state');
  }

  /* Toggles a submit button's disabled state, spinner and label. */
  function setLoading(button, loading, idleLabel, busyLabel) {
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle('is-loading', loading);
    const label = button.querySelector('.btn__label');
    if (label) label.textContent = loading ? busyLabel : idleLabel;
  }

  /* POSTs a JSON payload with a timeout. Resolves to a result object rather
     than throwing, so callers can branch on outcome without a try/catch:
       { ok: true }                    — 2xx
       { ok: false, status: 500 }      — reached the server, it refused
       { ok: false, timeout: true }    — aborted after REQUEST_TIMEOUT
       { ok: false, network: true }    — never reached the server
     fetch() only rejects on network-level failure or an aborted request. */
  async function postJSON(endpoint, payload) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      return response.ok ? { ok: true } : { ok: false, status: response.status };
    } catch (error) {
      if (error && error.name === 'AbortError') return { ok: false, timeout: true };
      return { ok: false, network: true };
    } finally {
      window.clearTimeout(timer);
    }
  }

  /* ========================================================================
     Pack-list signup (lead magnet)
     ======================================================================== */

  /* Email-only capture for the free pack list. Single opt-in: on success the
     form is replaced by a confirmation line in the same status element, so
     the section does not jump. */
  function initSignup() {
    const form = document.getElementById('packlist-form');
    if (!form) return;

    const status = document.getElementById('packlist-status');
    const submitBtn = form.querySelector('[data-signup-submit]');
    const honeypot = form.elements.packlistWebsite;
    const controls = Object.keys(SIGNUP_RULES)
      .map((name) => form.elements[name])
      .filter(Boolean);

    bindLiveValidation(controls, SIGNUP_RULES);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      /* Honeypot: a real user cannot see or Tab to this field, so anything in
         it means a bot. Show the normal confirmation and send nothing. */
      if (honeypot && String(honeypot.value || '').trim() !== '') {
        setStatus(status, 'Thanks — the pack list is on its way to your inbox.', 'success');
        form.reset();
        return;
      }

      const valid = controls.every((control) => validateField(control, SIGNUP_RULES));
      if (!valid) {
        if (controls[0]) controls[0].focus();
        setStatus(status, '', null);
        return;
      }

      setLoading(submitBtn, true, 'Send me the list', 'Sending…');
      setStatus(status, '', null);

      const result = await postJSON(SIGNUP_ENDPOINT, {
        email: String(form.elements.packlistEmail.value || '').trim(),
        leadMagnet: 'weekend-pack-list',
        submittedAt: new Date().toISOString(),
        pageUrl: window.location.href
      });

      setLoading(submitBtn, false, 'Send me the list', 'Sending…');

      if (result.ok) {
        setStatus(status, 'Thanks — the pack list is on its way to your inbox.', 'success');
        form.reset();
        clearFields(controls);
      } else if (result.status) {
        setStatus(status, 'Couldn’t sign you up (the server responded ' + result.status +
          '). Try again shortly, or email ' + CONTACT_EMAIL + '.', 'error');
      } else if (result.timeout) {
        setStatus(status, 'That took too long and timed out. Please try again.', 'error');
      } else {
        setStatus(status, 'Couldn’t reach the server. Check your connection and try again.', 'error');
      }
    });
  }

  /* ========================================================================
     Enquiry form
     ======================================================================== */

  /* Sets up validation, submission, and the success/reset flow for the
     enquiry form. All submission is handled here — the form never navigates. */
  function initForm() {
    const form = document.getElementById('enquiry-form');
    const success = document.getElementById('enquiry-success');
    if (!form || !success) return;

    const submitBtn = form.querySelector('[data-submit]');
    const status = document.getElementById('form-status');
    const honeypot = form.elements.website;
    const controls = Object.keys(RULES)
      .map((name) => form.elements[name])
      .filter(Boolean);

    /* Validates every control, then focuses the first one that failed.
       Returns true only if the whole form passes. */
    function validateForm() {
      let firstInvalid = null;
      controls.forEach((control) => {
        if (!validateField(control, RULES) && !firstInvalid) firstInvalid = control;
      });
      if (firstInvalid) firstInvalid.focus();
      return !firstInvalid;
    }

    /* Hides the form, reveals the confirmation panel, and moves focus into it
       so the outcome is announced rather than silently swapped in. */
    function showSuccess(name) {
      setStatus(status, '', null);
      form.hidden = true;
      success.hidden = false;
      const nameEl = document.getElementById('success-name');
      if (nameEl) nameEl.textContent = name ? ', ' + name.split(/\s+/)[0] : '';
      success.focus();
    }

    /* "Send another" — clears values, error state and status, then brings the
       empty form back and focuses its first field. */
    function resetForm() {
      form.reset();
      clearFields(controls);
      setStatus(status, '', null);
      setLoading(submitBtn, false, 'Send enquiry', 'Sending…');
      success.hidden = true;
      form.hidden = false;
      if (form.elements.name) form.elements.name.focus();
    }

    /* Intercepts submission, validates, and POSTs JSON. Success, non-2xx
       responses and network/timeout failures each get their own message.
       The page never reloads. */
    async function handleSubmit(event) {
      event.preventDefault();

      /* Honeypot: a real user cannot see or Tab to this field, so anything in
         it means a bot. Show the normal confirmation and send nothing. */
      if (honeypot && String(honeypot.value || '').trim() !== '') {
        showSuccess('');
        return;
      }

      if (!validateForm()) {
        setStatus(status, 'Please correct the highlighted fields and try again.', 'error');
        return;
      }

      const name = String(form.elements.name.value || '').trim();
      const payload = {
        name: name,
        email: String(form.elements.email.value || '').trim(),
        phone: String(form.elements.phone.value || '').trim(),
        groupsize: String(form.elements.groupsize.value || '').trim(),
        trip: form.elements.trip.value,
        message: String(form.elements.message.value || '').trim(),
        submittedAt: new Date().toISOString(),
        pageUrl: window.location.href
      };

      setLoading(submitBtn, true, 'Send enquiry', 'Sending…');
      setStatus(status, '', null);

      const result = await postJSON(FORM_ENDPOINT, payload);
      setLoading(submitBtn, false, 'Send enquiry', 'Sending…');

      if (result.ok) {
        showSuccess(name);
      } else if (result.status) {
        setStatus(status, 'We couldn’t send your enquiry (the server responded ' +
          result.status + '). Please try again shortly, or email ' + CONTACT_EMAIL + '.', 'error');
      } else if (result.timeout) {
        setStatus(status, 'That took too long and timed out. Please try again, or call ' +
          CONTACT_PHONE + '.', 'error');
      } else {
        setStatus(status, 'Couldn’t reach the server. Check your connection and try again, ' +
          'or email ' + CONTACT_EMAIL + '.', 'error');
      }
    }

    bindLiveValidation(controls, RULES);
    form.addEventListener('submit', handleSubmit);

    const sendAnother = document.getElementById('send-another');
    if (sendAnother) sendAnother.addEventListener('click', resetForm);
  }

  /* ========================================================================
     WhatsApp chat widget
     ======================================================================== */

  /* Floating disclosure panel, following the same pattern as initNav(): the
     toggle button's aria-expanded and label stay in sync with a hidden panel.
     Every link inside is a plain wa.me URL — there's nothing to submit or
     fetch, so this only ever needs to open, close, and get out of the way. */
  function initChatWidget() {
    const root = document.querySelector('[data-chatwidget]');
    const toggle = root && root.querySelector('[data-chatwidget-toggle]');
    const closeBtn = root && root.querySelector('[data-chatwidget-close]');
    const panel = document.getElementById('chatwidget-panel');
    if (!root || !toggle || !panel) return;

    const setOpen = (open) => {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close chat' : 'Chat with Wildcrew on WhatsApp');
      if (open) {
        const firstLink = panel.querySelector('a, button');
        if (firstLink) firstLink.focus();
      }
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        setOpen(false);
        toggle.focus();
      });
    }

    /* Escape closes the panel and returns focus to the button that opened
       it, matching the mobile nav's Escape handling. */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    /* A click anywhere outside the widget closes it — expected behaviour for
       a floating overlay that sits on top of page content. */
    document.addEventListener('click', (e) => {
      if (toggle.getAttribute('aria-expanded') === 'true' && !root.contains(e.target)) {
        setOpen(false);
      }
    });
  }

  /* ========================================================================
     Boot
     ======================================================================== */

  /* Runs every initialiser once the DOM is ready. */
  function init() {
    initYear();
    initImageFallback();
    initNav();
    initSmoothScroll();
    initReveal();
    initCarousel();
    initSignup();
    initForm();
    initChatWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
