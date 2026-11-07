/* Vantageous site behaviour: scroll-driven hero, nav state, film dialog, project form. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- nav: light bar once the dark hero has scrolled away ---------- */
  const nav = $('[data-nav]');
  const hero = $('[data-hero]');
  const setNav = () => {
    if (!nav) return;
    const light = !hero || hero.getBoundingClientRect().bottom <= nav.offsetHeight;
    nav.classList.toggle('is-light', light);
  };

  /* ---------- hero: frames of the marble run, scrubbed by scroll ---------- */
  const FRAMES = 177;              // 0–22 s of the film at 8 frames a second
  const FILM_END = 0.9;            // the last 10% of the scroll holds the final frame
  const canvas = $('[data-hero-canvas]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection && navigator.connection.saveData;
  const beats = $$('[data-beat]').map(el => ({ el, range: el.dataset.beat.split(',').map(Number) }));
  const hint = $('[data-scroll-hint]');
  let scrollMode = !!(hero && canvas && canvas.getContext && !reduce.matches && !saveData);

  if (hero && !scrollMode) hero.classList.add('is-static');

  if (scrollMode) {
    document.documentElement.classList.add('js-scroll');
    const ctx = canvas.getContext('2d');
    const imgs = new Array(FRAMES);
    const loaded = new Uint8Array(FRAMES);
    let set = '', current = -1, want = 0, raf = 0;

    const pickSet = () => (innerWidth / innerHeight < 1 ? '916' : '169');
    const src = i => `/assets/hero/${set}/f${String(i).padStart(3, '0')}.webp`;

    const order = () => {   // coarse to fine, so the whole run is scrubbable early
      const seen = new Set(), out = [];
      for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < FRAMES; i += step) if (!seen.has(i)) { seen.add(i); out.push(i); }
      if (!seen.has(FRAMES - 1)) out.push(FRAMES - 1);
      return out;
    };

    const load = () => {
      set = pickSet();
      loaded.fill(0);
      const queue = order();
      let active = 0;
      const next = () => {
        while (active < 6 && queue.length) {
          const i = queue.shift(), img = new Image(), mySet = set;
          active++;
          img.decoding = 'async';
          img.onload = () => { active--; if (mySet !== set) return; imgs[i] = img; loaded[i] = 1; if (Math.abs(i - want) < 12) schedule(); next(); };
          img.onerror = () => { active--; next(); };
          img.src = src(i);
        }
      };
      next();
    };

    const nearest = i => {
      for (let d = 0; d < FRAMES; d++) {
        if (i - d >= 0 && loaded[i - d]) return i - d;
        if (i + d < FRAMES && loaded[i + d]) return i + d;
      }
      return -1;
    };

    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      current = -1;
    };

    const draw = () => {
      raf = 0;
      const i = nearest(want);
      if (i < 0 || i === current) return;
      const img = imgs[i], cw = canvas.width, ch = canvas.height;
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);   // cover
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      current = i;
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };

    const progress = () => {
      const r = hero.getBoundingClientRect();
      const run = r.height - innerHeight;
      return run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 1;
    };

    const update = () => {
      const p = progress();
      const f = Math.min(1, p / FILM_END);
      want = Math.round(f * (FRAMES - 1));
      for (const b of beats) b.el.classList.toggle('is-on', f >= b.range[0] && f < b.range[1]);
      if (hint) hint.classList.toggle('is-off', p > 0.02);
      schedule();
    };

    let lastSet = '';
    const onResize = () => { size(); if (pickSet() !== lastSet) { lastSet = pickSet(); load(); } update(); };
    addEventListener('resize', onResize, { passive: true });
    addEventListener('scroll', update, { passive: true });
    reduce.addEventListener('change', () => location.reload());
    onResize();
  }

  addEventListener('scroll', setNav, { passive: true });
  addEventListener('resize', setNav, { passive: true });
  setNav();

  /* ---------- film dialog ---------- */
  const dialog = $('[data-film-dialog]');
  const film = $('[data-film-video]');
  $$('[data-open-film]').forEach(b => b.addEventListener('click', () => {
    if (!dialog || !dialog.showModal) { location.href = '/assets/film/vantageous-film-16x9.mp4'; return; }
    dialog.showModal();
    film.play().catch(() => {});
  }));
  const closeFilm = () => { film.pause(); dialog.close(); };
  $('[data-close-film]')?.addEventListener('click', closeFilm);
  dialog?.addEventListener('click', e => { if (e.target === dialog) closeFilm(); });
  dialog?.addEventListener('close', () => film.pause());

  /* ---------- package buttons preselect the form ---------- */
  const form = $('[data-form]');
  const pkgSelect = $('#f-package');
  $$('[data-package]').forEach(a => a.addEventListener('click', () => {
    if (pkgSelect) pkgSelect.value = a.dataset.package;
  }));

  /* ---------- project form ---------- */
  if (form) {
    const status = $('[data-status]', form);
    const submit = $('[data-submit]', form);
    const endpoint = form.dataset.endpoint;
    const booking = form.dataset.booking;

    const fieldError = (input, msg) => {
      const field = input.closest('.field');
      let err = $('.err', field);
      if (msg) {
        input.setAttribute('aria-invalid', 'true');
        if (!err) { err = document.createElement('p'); err.className = 'err'; err.id = input.id + '-err'; field.appendChild(err); }
        err.textContent = msg;
        input.setAttribute('aria-describedby', err.id);
      } else {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
        err?.remove();
      }
    };

    const validate = () => {
      let first = null;
      for (const input of $$('input[required], select[required]', form)) {
        let msg = '';
        if (!input.value.trim()) msg = 'Please fill this in.';
        else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) msg = 'Enter an email like you@company.com.';
        fieldError(input, msg);
        if (msg && !first) first = input;
      }
      const site = $('#f-site');
      if (site.value.trim() && !/^https?:\/\/\S+\.\S+/.test(site.value.trim())) {
        fieldError(site, 'Start the address with https://');
        first = first || site;
      } else fieldError(site, '');
      return first;
    };

    $$('input, select, textarea', form).forEach(el => el.addEventListener('input', () => { if (el.hasAttribute('aria-invalid')) validate(); }));

    const done = (sent) => {
      const box = document.createElement('div');
      box.className = 'form-done';
      box.setAttribute('tabindex', '-1');
      const h = document.createElement('h3'); h.className = 'h3';
      h.textContent = sent ? 'Thanks, we have your details.' : 'Your email is ready to send.';
      const p = document.createElement('p');
      p.textContent = booking
        ? 'Pick a time for a 30-minute call and we’ll come prepared with ideas.'
        : (sent ? 'We’ll reply within one business day.' : 'Send the email that just opened and we’ll reply within one business day.');
      box.append(h, p);
      if (booking) {
        const a = document.createElement('a');
        a.className = 'btn btn-primary'; a.href = booking; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'Book a call';
        box.append(a);
      }
      form.replaceChildren(box);
      box.focus();
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (form._gotcha?.value) return;          // spam trap
      const bad = validate();
      if (bad) { bad.focus(); status.textContent = 'Please check the highlighted fields.'; return; }
      const data = Object.fromEntries(new FormData(form));
      delete data._gotcha;

      if (!endpoint) {                            // not connected yet: hand off to email
        const body = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n');
        location.href = `mailto:hello@vantageous.studio?subject=${encodeURIComponent('New project: ' + data.company)}&body=${encodeURIComponent(body)}`;
        done(false);
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Sending…';
      status.textContent = '';
      try {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error(res.status);
        done(true);
      } catch {
        submit.disabled = false;
        submit.textContent = 'Send and book a call';
        status.textContent = 'That didn’t send. Please try again, or email hello@vantageous.studio.';
      }
    });
  }
})();
