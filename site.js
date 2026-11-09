/* Vantageous site behaviour: scroll-driven hero, nav state, film dialog, project form. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- nav: light bar once the dark hero has scrolled away ---------- */
  const nav = $('[data-nav]');
  const hero = $('[data-hero]');
  const darkZones = [hero, $('[data-svc-zoom]')].filter(Boolean);
  const setNav = () => {
    if (!nav) return;
    const h = nav.offsetHeight;
    const light = !darkZones.some(z => { const r = z.getBoundingClientRect(); return r.top <= h && r.bottom > h; });
    nav.classList.toggle('is-light', light);
  };

  /* ---------- hero: the marble run plays once on arrival, then holds on the chart ---------- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection && navigator.connection.saveData;
  const video = $('[data-hero-video]');
  const replay = $('[data-replay]');
  const portrait = matchMedia('(max-aspect-ratio: 1/1)');

  if (hero && video) {
    // poster follows the orientation so the first frame matches the clip
    video.poster = portrait.matches ? '/assets/hero/hero-first-916.jpg' : '/assets/hero/hero-first-169.jpg';
    if (reduce.matches || saveData) {
      hero.classList.add('is-static');
      video.removeAttribute('preload');
    } else {
      const start = () => video.play().catch(() => { hero.classList.add('is-static'); });
      video.addEventListener('ended', () => { if (replay) replay.hidden = false; });
      replay?.addEventListener('click', () => { replay.hidden = true; video.currentTime = 0; start(); });
      // pause off-screen, resume when back (only if it hasn't finished)
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => { if (!e.isIntersecting) video.pause(); else if (!video.ended && video.currentTime > 0) video.play().catch(() => {}); }).observe(hero);
      }
      start();
    }
  }

  /* split headings marked data-words into words that rise in one at a time */
  if (!reduce.matches) {
    $$('[data-words]').forEach(el => {
      let i = 0;
      const walk = node => {
        [...node.childNodes].forEach(n => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(part => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.append(part); return; }
              const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = part; frag.append(s);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1) walk(n);
        });
      };
      walk(el);
    });
    $('.hero-copy')?.classList.add('anim');
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


  /* ---------- services: orbs fly in from the film's ring and grow as you scroll ---------- */
  const zoom = $('[data-svc-zoom]');
  if (zoom) {
    const list = $('.orbs', zoom);
    const orbs = $$('.orb', zoom);
    const vids = $$('video', zoom);
    const ease = t => 1 - Math.pow(1 - t, 3);
    let near = false, playing = false, ticking = false;

    const place = () => {               // ring offsets, measured on resize only
      const cx = list.clientWidth / 2, cy = list.clientHeight / 2;
      const R = Math.min(list.clientWidth, list.clientHeight) * 0.24;
      orbs.forEach((o, k) => {
        const m = $('.orb-media', o);
        const a = (-90 + k * 60) * Math.PI / 180;
        o.style.setProperty('--sx', (cx + R * Math.cos(a) - (o.offsetLeft + o.offsetWidth / 2)).toFixed(1));
        o.style.setProperty('--sy', (cy + R * Math.sin(a) - (o.offsetTop + m.offsetHeight / 2)).toFixed(1));
      });
    };
    const setPlay = on => {
      if (on === playing) return;
      playing = on;
      vids.forEach(v => on ? v.play().catch(() => {}) : v.pause());
    };
    const update = () => {
      ticking = false;
      const r = zoom.getBoundingClientRect();
      const travel = Math.max(1, r.height - innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / (travel * 0.6)));
      const e = ease(p);
      zoom.style.setProperty('--e', e.toFixed(4));
      setPlay(near && e > 0.45);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

    if (reduce.matches) {
      zoom.style.setProperty('--e', 1);
    } else {
      place();
      addEventListener('resize', () => { place(); onScroll(); }, { passive: true });
      addEventListener('scroll', onScroll, { passive: true });
      update();
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => {
        near = en.isIntersecting;
        if (near) vids.forEach(v => { if (v.preload === 'none') v.preload = 'auto'; });
        if (reduce.matches) setPlay(false); else update();
      }, { rootMargin: '50% 0px' }).observe(zoom);
    }

    /* detail dialog, deep-linked as ?service=slug */
    const sd = $('[data-svc-dialog]');
    const slot = $('[data-svc-slot]', sd);
    let opener = null;
    const setParam = slug => {
      const u = new URL(location.href);
      slug ? u.searchParams.set('service', slug) : u.searchParams.delete('service');
      history.replaceState(null, '', u);
    };
    const openSvc = (slug, from) => {
      const t = $('#svc-' + slug);
      if (!t || !sd?.showModal) return;
      opener = from || null;
      slot.replaceChildren(t.content.cloneNode(true));
      const v = $('video', slot);
      if (reduce.matches) { v.removeAttribute('autoplay'); v.pause(); }
      setPlay(false);
      sd.showModal();
      setParam(slug);
    };
    $$('[data-service]', zoom).forEach(b => b.addEventListener('click', () => openSvc(b.dataset.service, b)));
    sd?.addEventListener('click', e => {
      if (e.target === sd) { sd.close(); return; }
      const c = e.target.closest('[data-close-svc]');
      if (!c) return;
      if (c.dataset.package) { if (pkgSelect) pkgSelect.value = c.dataset.package; opener = null; }
      sd.close();
    });
    sd?.addEventListener('close', () => {
      slot.replaceChildren();
      setParam(null);
      opener?.focus({ preventScroll: true });
      if (!reduce.matches) update();
    });
    const want = new URLSearchParams(location.search).get('service');
    if (want) openSvc(want);
  }

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
