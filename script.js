/* ===================================================
   Div Banga — Bento portfolio v5
   Intro · Trail · Glow · Typing · Switch · Slideshow
   =================================================== */

/* ── Intro Sequence ─────────────────────────────────── */
;(function () {
    const intro = document.getElementById('intro');
    if (!intro) { document.body.classList.add('ready'); return; }

    setTimeout(() => {
        intro.classList.add('exit');
        setTimeout(() => {
            document.body.classList.add('ready');
            setTimeout(() => intro.remove(), 600);
        }, 500);
    }, 1200);
})();


/* ── Canvas Cursor Trail ────────────────────────────── */
;(function () {
    const c = document.getElementById('trail');
    if (!c) return;
    const ctx = c.getContext('2d');
    const pts = [];
    const MAX = 50;
    const LIFETIME = 35;
    let w, h;
    let mx = -1000, my = -1000;

    function resize() { w = c.width = innerWidth; h = c.height = innerHeight; }
    resize();
    addEventListener('resize', resize);
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    function getTrailColor() {
        const s = getComputedStyle(document.documentElement);
        return {
            r: parseInt(s.getPropertyValue('--trail-r')) || 200,
            g: parseInt(s.getPropertyValue('--trail-g')) || 54,
            b: parseInt(s.getPropertyValue('--trail-b')) || 0
        };
    }

    ;(function draw() {
        ctx.clearRect(0, 0, w, h);
        if (mx > -500) {
            pts.push({ x: mx, y: my, age: 0 });
            if (pts.length > MAX) pts.shift();
        }
        for (let i = pts.length - 1; i >= 0; i--) {
            pts[i].age++;
            if (pts[i].age > LIFETIME) pts.splice(i, 1);
        }
        if (pts.length < 3) { requestAnimationFrame(draw); return; }

        const col = getTrailColor();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < pts.length - 1; i++) {
            const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
            const alpha = 1 - (p1.age / LIFETIME);
            const lw = Math.max(0.5, alpha * 2.5);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${(alpha * .45).toFixed(3)})`;
            ctx.lineWidth = lw;
            const mx1 = (p0.x + p1.x) / 2, my1 = (p0.y + p1.y) / 2;
            const mx2 = (p1.x + p2.x) / 2, my2 = (p1.y + p2.y) / 2;
            ctx.moveTo(mx1, my1);
            ctx.quadraticCurveTo(p1.x, p1.y, mx2, my2);
            ctx.stroke();
        }
        requestAnimationFrame(draw);
    })();
})();


/* ── Glow Orb ───────────────────────────────────────── */
;(function () {
    const glow = document.getElementById('glow');
    if (!glow) return;
    let gx = innerWidth / 2, gy = innerHeight / 2;
    let tx = gx, ty = gy;
    let shown = false;

    addEventListener('mousemove', e => {
        tx = e.clientX; ty = e.clientY;
        if (!shown) { document.body.classList.add('glow-on'); shown = true; }
    });

    ;(function tick() {
        gx += (tx - gx) * .06;
        gy += (ty - gy) * .06;
        glow.style.transform = `translate(${gx - 210}px,${gy - 210}px)`;
        requestAnimationFrame(tick);
    })();
})();


/* ── Typing Effect ──────────────────────────────────── */
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
    setTimeout(step, 1800);
})();


/* ── Theme Toggle ───────────────────────────────────── */
;(function () {
    const btn = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const set = t => { html.dataset.theme = t; localStorage.setItem('div-theme', t); };

    const saved = localStorage.getItem('div-theme');
    if (saved) set(saved);
    else if (matchMedia('(prefers-color-scheme:dark)').matches) set('dark');

    btn.addEventListener('click', () => set(html.dataset.theme === 'light' ? 'dark' : 'light'));
})();


/* ── Photo Slideshow ────────────────────────────────── */
;(function () {
    const imgs = [
        'assets/d1.webp','assets/d2.webp','assets/d3.webp','assets/d4.webp',
        'assets/d5.webp','assets/d6.webp','assets/d7.webp','assets/d8.webp',
        'assets/d9.webp','assets/d10.webp','assets/d11.webp','assets/d12.webp'
    ];
    const a = document.querySelector('.sl-a');
    const b = document.querySelector('.sl-b');
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


/* ── Timeline Hover ─────────────────────────────────── */
;(function () {
    const detail = document.getElementById('tl-detail');
    if (!detail) return;
    const defaultText = detail.textContent;

    document.querySelectorAll('.tl-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            detail.textContent = item.dataset.tip;
            detail.style.opacity = '1';
        });
        item.addEventListener('mouseleave', () => {
            detail.textContent = defaultText;
            detail.style.opacity = '.6';
        });
    });
})();
