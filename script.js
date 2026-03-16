/* ===================================================
   Div Banga — Bento portfolio interactions
   Full viewport · cursor glow · zoom on hover
   =================================================== */

/* ── Cursor Glow ─────────────────────────────────── */
;(function () {
    const o = document.getElementById('cursor-glow');
    const s = document.getElementById('cursor-glow-sm');
    if (!o || !s) return;
    let mx = innerWidth / 2, my = innerHeight / 2;
    let ox = mx, oy = my, sx = mx, sy = my;
    let shown = false;

    addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        if (!shown) { document.body.classList.add('glow-on'); shown = true; }
    });

    (function tick() {
        ox += (mx - ox) * .04;
        oy += (my - oy) * .04;
        sx += (mx - sx) * .12;
        sy += (my - sy) * .12;
        o.style.transform = `translate(${ox - 260}px,${oy - 260}px)`;
        s.style.transform = `translate(${sx - 120}px,${sy - 120}px)`;
        requestAnimationFrame(tick);
    })();
})();


/* ── Typing Effect ───────────────────────────────── */
;(function () {
    const el = document.getElementById('typing-text');
    if (!el) return;
    const words = ['engineer', 'builder', 'competitor', 'maker'];
    let wi = 0, ci = 0, del = false;

    function step() {
        const w = words[wi];
        if (!del) {
            ci++;
            el.textContent = w.slice(0, ci);
            if (ci === w.length) { setTimeout(() => { del = true; step(); }, 1800); return; }
            setTimeout(step, 80 + Math.random() * 40);
        } else {
            ci--;
            el.textContent = w.slice(0, ci);
            if (ci === 0) { del = false; wi = (wi + 1) % words.length; setTimeout(step, 400); return; }
            setTimeout(step, 40 + Math.random() * 20);
        }
    }
    setTimeout(step, 800);
})();


/* ── Theme Toggle ────────────────────────────────── */
;(function () {
    const btn = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const set = t => { html.dataset.theme = t; localStorage.setItem('div-theme', t); };

    const saved = localStorage.getItem('div-theme');
    if (saved) set(saved);
    else if (matchMedia('(prefers-color-scheme:dark)').matches) set('dark');

    btn.addEventListener('click', () => set(html.dataset.theme === 'light' ? 'dark' : 'light'));
})();


/* ── Nav → cell pulse ────────────────────────────── */
;(function () {
    document.querySelectorAll('.nav-links a[data-focus]').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const group = a.dataset.focus;
            const cells = document.querySelectorAll(`.cell[data-group="${group}"]`);
            cells.forEach(c => {
                c.classList.remove('pulse');
                void c.offsetWidth;          // reflow to restart animation
                c.classList.add('pulse');
                c.addEventListener('animationend', () => c.classList.remove('pulse'), { once: true });
            });
        });
    });
})();


/* ── Photo Slideshow ─────────────────────────────── */
;(function () {
    const imgs = [
        'assets/d1.webp','assets/d2.webp','assets/d3.webp','assets/d4.webp',
        'assets/d5.webp','assets/d6.webp','assets/d7.webp','assets/d8.webp',
        'assets/d9.webp','assets/d10.webp','assets/d11.webp','assets/d12.webp'
    ];
    const a = document.querySelector('.slide-a');
    const b = document.querySelector('.slide-b');
    if (!a || !b) return;
    let idx = 0, aOn = true;

    imgs.slice(0, 3).forEach(s => { const i = new Image(); i.src = s; });

    setInterval(() => {
        idx = (idx + 1) % imgs.length;
        if (aOn) {
            b.src = imgs[idx];
            b.onload = () => { a.classList.remove('active'); b.classList.add('active'); aOn = false; };
        } else {
            a.src = imgs[idx];
            a.onload = () => { b.classList.remove('active'); a.classList.add('active'); aOn = true; };
        }
    }, 3500);
})();


/* ── Timeline hover ──────────────────────────────── */
;(function () {
    const detail = document.getElementById('tl-detail');
    if (!detail) return;

    document.querySelectorAll('.tl-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            detail.textContent = item.dataset.tip;
            detail.style.opacity = '1';
        });
        item.addEventListener('mouseleave', () => {
            detail.style.opacity = '0';
        });
    });
})();
