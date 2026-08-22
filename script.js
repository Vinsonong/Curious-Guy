/* ==========================================================================
   Meridian Systems — behaviour
   Vanilla JS, no dependencies. Everything is scoped inside one IIFE.
   ========================================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     Where the enquiry form POSTs its JSON payload.

     Swap this placeholder for your real endpoint:
       Formspree  -> 'https://formspree.io/f/XXXXXXXX'
       Getform    -> 'https://getform.io/f/XXXXXXXX'
       Custom API -> '/api/enquiries'

     The request below sends `Content-Type: application/json` and
     `Accept: application/json`, which is what Formspree and Getform both
     expect in order to reply with JSON instead of redirecting to their own
     thank-you page. A custom API only needs to accept a JSON body and return
     any 2xx status on success.

     As shipped this points at example.com, so a real submission will take the
     network-error branch. That is expected until you set a live endpoint.
     -------------------------------------------------------------------------- */
  const FORM_ENDPOINT = 'https://example.com/api/enquiries';

  /* How long to wait before giving up on the request, in milliseconds. */
  const REQUEST_TIMEOUT = 15000;

  /* Media queries and motion preference, read once and reused. */
  const mqDesktop = window.matchMedia('(min-width: 768px)');
  const mqReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => mqReduceMotion.matches;

  /* ========================================================================
     Footer year
     ======================================================================== */

  /* Writes the current year into the footer copyright line so it never goes stale. */
  function initYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = String(new Date().getFullYear());
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
    const onBreakpoint = (e) => { if (e.matches) setOpen(false); };
    if (typeof mqDesktop.addEventListener === 'function') {
      mqDesktop.addEventListener('change', onBreakpoint);
    } else {
      mqDesktop.addListener(onBreakpoint); /* Safari < 14 */
    }
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
     Testimonial carousel (mobile only)
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
       so the markup stays in sync if a testimonial is added or removed. */
    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel__dot';
      dot.setAttribute('aria-label', 'Go to testimonial ' + (i + 1) + ' of ' + slides.length);
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
    if (typeof mqDesktop.addEventListener === 'function') {
      mqDesktop.addEventListener('change', syncBreakpoint);
    } else {
      mqDesktop.addListener(syncBreakpoint);
    }

    syncBreakpoint();
    render();
  }

  /* ========================================================================
     Enquiry form
     ======================================================================== */

  /* Deliberately permissive: one @, a dot in the domain, no whitespace.
     Stricter patterns reject valid real-world addresses. */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  /* Allows the separators people actually type: + ( ) - . and spaces. */
  const PHONE_SHAPE_RE = /^\+?[\d\s().-]+$/;

  /* Validation rules, one entry per control. Each `check` returns an error
     message string, or an empty string when the value is acceptable. */
  const RULES = {
    name: (v) => {
      if (!v) return 'Enter your full name.';
      if (v.length < 2) return 'That name looks too short.';
      return '';
    },
    email: (v) => {
      if (!v) return 'Enter your email address.';
      if (!EMAIL_RE.test(v)) return 'Enter a valid email address, like name@company.com.';
      return '';
    },
    phone: (v) => {
      if (!v) return 'Enter a phone number we can reach you on.';
      if (!PHONE_SHAPE_RE.test(v)) return 'Use digits, spaces and + ( ) - only.';
      const digits = v.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) return 'Enter a phone number of 7 to 15 digits.';
      return '';
    },
    company: () => '', /* optional */
    service: (v) => (v ? '' : 'Choose the service you need.'),
    message: (v) => {
      if (!v) return 'Tell us briefly how we can help.';
      if (v.length < 10) return 'Please add a little more detail (10 characters or more).';
      return '';
    }
  };

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

    /* Writes or clears the inline error for one control, keeping aria-invalid
       and aria-describedby in step so assistive tech announces the problem.
       Returns true when the field is valid. */
    function validateField(control) {
      const message = RULES[control.name](String(control.value || '').trim());
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

    /* Validates every control, then focuses the first one that failed.
       Returns true only if the whole form passes. */
    function validateForm() {
      let firstInvalid = null;
      controls.forEach((control) => {
        if (!validateField(control) && !firstInvalid) firstInvalid = control;
      });
      if (firstInvalid) firstInvalid.focus();
      return !firstInvalid;
    }

    /* Shows a form-level message below the submit button. */
    function setStatus(text, state) {
      if (!status) return;
      status.textContent = text || '';
      if (state) status.setAttribute('data-state', state);
      else status.removeAttribute('data-state');
    }

    /* Toggles the button's disabled state and spinner during the request. */
    function setLoading(loading) {
      if (!submitBtn) return;
      submitBtn.disabled = loading;
      submitBtn.classList.toggle('is-loading', loading);
      const label = submitBtn.querySelector('.btn__label');
      if (label) label.textContent = loading ? 'Sending…' : 'Send enquiry';
    }

    /* Hides the form, reveals the confirmation panel, and moves focus into it
       so the outcome is announced rather than silently swapped in. */
    function showSuccess(name) {
      setStatus('');
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
      controls.forEach((control) => {
        control.removeAttribute('aria-invalid');
        control.removeAttribute('aria-describedby');
        const field = control.closest('.field');
        if (field) field.classList.remove('field--error');
        const errorEl = document.getElementById(control.name + '-error');
        if (errorEl) errorEl.textContent = '';
      });
      setStatus('');
      setLoading(false);
      success.hidden = true;
      form.hidden = false;
      if (form.elements.name) form.elements.name.focus();
    }

    /* Intercepts submission, validates, and POSTs JSON via fetch. Success,
       non-2xx responses and network/timeout failures each get their own
       message. The page never reloads. */
    async function handleSubmit(event) {
      event.preventDefault();

      /* Honeypot: a real user cannot see or Tab to this field, so anything in
         it means a bot. Show the normal confirmation and send nothing. */
      if (honeypot && String(honeypot.value || '').trim() !== '') {
        showSuccess('');
        return;
      }

      if (!validateForm()) {
        setStatus('Please correct the highlighted fields and try again.', 'error');
        return;
      }

      const name = String(form.elements.name.value || '').trim();
      const payload = {
        name: name,
        email: String(form.elements.email.value || '').trim(),
        phone: String(form.elements.phone.value || '').trim(),
        company: String(form.elements.company.value || '').trim(),
        service: form.elements.service.value,
        message: String(form.elements.message.value || '').trim(),
        submittedAt: new Date().toISOString(),
        pageUrl: window.location.href
      };

      setLoading(true);
      setStatus('');

      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        const response = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        if (response.ok) {
          showSuccess(name);
          return;
        }

        /* Reached the server, but it refused the submission. */
        setStatus(
          'We couldn’t send your message (the server responded ' + response.status +
          '). Please try again shortly, or email hello@meridiansystems.example.',
          'error'
        );
      } catch (error) {
        /* fetch() only rejects on network-level failure or an aborted request. */
        if (error && error.name === 'AbortError') {
          setStatus(
            'That took too long and timed out. Please try again, or call +44 20 7946 0958.',
            'error'
          );
        } else {
          setStatus(
            'Couldn’t reach the server. Check your connection and try again, or email hello@meridiansystems.example.',
            'error'
          );
        }
      } finally {
        window.clearTimeout(timer);
        setLoading(false);
      }
    }

    /* Validate on blur; on input, only clear an error once it is resolved, so
       the user is not corrected mid-keystroke. */
    controls.forEach((control) => {
      control.addEventListener('blur', () => validateField(control));

      const liveEvent = control.tagName === 'SELECT' ? 'change' : 'input';
      control.addEventListener(liveEvent, () => {
        if (control.getAttribute('aria-invalid') === 'true') validateField(control);
      });
    });

    form.addEventListener('submit', handleSubmit);

    const sendAnother = document.getElementById('send-another');
    if (sendAnother) sendAnother.addEventListener('click', resetForm);
  }

  /* ========================================================================
     Boot
     ======================================================================== */

  /* Runs every initialiser once the DOM is ready. */
  function init() {
    initYear();
    initNav();
    initSmoothScroll();
    initReveal();
    initCarousel();
    initForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
