/* ===================================================
   Div Banga — Site interactions
   Single-page scroll · cursor glow · bento hover
   =================================================== */

// ─── Cursor Glow ────────────────────────────────────
;(function cursorGlow() {
    const outer = document.getElementById('cursor-glow');
    const inner = document.getElementById('cursor-glow-sm');
    if (!outer || !inner) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let ox = mx, oy = my;
    let ix = mx, iy = my;

    window.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
    });

    // show after first move
    let shown = false;
    window.addEventListener('mousemove', function show() {
        if (!shown) {
            document.body.classList.add('glow-ready');
            shown = true;
        }
    });

    function tick() {
        ox += (mx - ox) * 0.045;
        oy += (my - oy) * 0.045;
        ix += (mx - ix) * 0.13;
        iy += (my - iy) * 0.13;
        outer.style.transform = `translate(${ox - 275}px,${oy - 275}px)`;
        inner.style.transform = `translate(${ix - 130}px,${iy - 130}px)`;
        requestAnimationFrame(tick);
    }
    tick();
})();


// ─── Typing Effect ──────────────────────────────────
;(function typing() {
    const el = document.getElementById('typing-text');
    if (!el) return;
    const words = ['engineer', 'builder', 'competitor', 'maker'];
    let wi = 0, ci = 0, deleting = false;

    function step() {
        const word = words[wi];
        if (!deleting) {
            ci++;
            el.textContent = word.slice(0, ci);
            if (ci === word.length) { setTimeout(() => { deleting = true; step(); }, 1800); return; }
            setTimeout(step, 80 + Math.random() * 40);
        } else {
            ci--;
            el.textContent = word.slice(0, ci);
            if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; setTimeout(step, 400); return; }
            setTimeout(step, 40 + Math.random() * 20);
        }
    }
    setTimeout(step, 900);
})();


// ─── Theme Toggle ───────────────────────────────────
;(function theme() {
    const btn = document.getElementById('theme-toggle');
    const html = document.documentElement;
    function set(t) { html.dataset.theme = t; localStorage.setItem('div-theme', t); }

    const saved = localStorage.getItem('div-theme');
    if (saved) set(saved);
    else if (window.matchMedia('(prefers-color-scheme:dark)').matches) set('dark');

    btn.addEventListener('click', () => set(html.dataset.theme === 'light' ? 'dark' : 'light'));
})();


// ─── Nav: scroll-spy + scrolled state ───────────────
;(function nav() {
    const navEl  = document.getElementById('nav');
    const links  = document.querySelectorAll('.nav-links a[href^="#"]');
    const sects  = Array.from(document.querySelectorAll('section[id]'));

    function onScroll() {
        navEl.classList.toggle('scrolled', window.scrollY > 50);

        const scrollY = window.scrollY + 120;
        let activeId = sects[0]?.id;
        for (const s of sects) {
            if (scrollY >= s.offsetTop) activeId = s.id;
        }
        links.forEach(a => {
            const target = a.getAttribute('href').replace('#', '');
            a.classList.toggle('active', target === activeId);
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
})();


// ─── Scroll Reveal (IntersectionObserver) ───────────
;(function reveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('revealed');
                obs.unobserve(e.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach(el => obs.observe(el));
})();


// ─── Photo Slideshow ────────────────────────────────
;(function slideshow() {
    const imgs = [
        'assets/d1.webp','assets/d2.webp','assets/d3.webp','assets/d4.webp',
        'assets/d5.webp','assets/d6.webp','assets/d7.webp','assets/d8.webp',
        'assets/d9.webp','assets/d10.webp','assets/d11.webp','assets/d12.webp'
    ];
    const a = document.querySelector('.slide-a');
    const b = document.querySelector('.slide-b');
    if (!a || !b) return;

    let idx = 0, aActive = true;

    // preload first few
    imgs.slice(0, 4).forEach(s => { const i = new Image(); i.src = s; });

    setInterval(() => {
        idx = (idx + 1) % imgs.length;
        if (aActive) {
            b.src = imgs[idx];
            b.onload = () => { a.classList.remove('active'); b.classList.add('active'); aActive = false; };
        } else {
            a.src = imgs[idx];
            a.onload = () => { b.classList.remove('active'); a.classList.add('active'); aActive = true; };
        }
    }, 3500);
})();


// ─── Card tilt on hover ─────────────────────────────
;(function tilt() {
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width;
            const y = (e.clientY - r.top) / r.height;
            const tx = (y - .5) * -6;
            const ty = (x - .5) * 6;
            card.style.transform = `perspective(700px) rotateX(${tx}deg) rotateY(${ty}deg) translateY(-6px) scale(1.03)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
})();
