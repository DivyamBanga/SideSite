/* ===================================================
   Div Banga — Bento portfolio v6
   Fast intro · Grid-resize hover · Subtle trail
   Mobile responsive with scroll animations
   =================================================== */

/* ── Intro Sequence — very fast ─────────────────────── */
;(function () {
    const intro = document.getElementById('intro');
    if (!intro) { document.body.classList.add('ready'); return; }

    setTimeout(() => {
        intro.classList.add('exit');
        setTimeout(() => {
            document.body.classList.add('ready');
            setTimeout(() => intro.remove(), 300);
        }, 250);
    }, 350);
})();


/* ── Free cells after entrance animation ────────────── */
;(function () {
    const bento = document.getElementById('bento');
    document.querySelectorAll('.cell, .proj-label').forEach(el => {
        el.addEventListener('animationend', function handler(e) {
            if (e.animationName === 'cellIn') {
                el.classList.add('entered');
                el.removeEventListener('animationend', handler);
            }
        });
    });

    // Enable hover effects after all cells have entered
    const maxD = Math.max(...Array.from(document.querySelectorAll('[style*="--d"]')).map(
        el => parseInt(el.style.getPropertyValue('--d')) || 0
    ));
    const introTime = 600;   // intro duration
    const cascadeTime = maxD * 50 + 500; // last cell delay + animation
    setTimeout(() => {
        if (bento) bento.classList.add('hoverable');
    }, introTime + cascadeTime);
})();


/* ── Canvas Cursor Trail — subtle, consistent ───────── */
;(function () {
    if (window.innerWidth <= 768) return;
    const c = document.getElementById('trail');
    if (!c) return;
    const ctx = c.getContext('2d');
    const pts = [];
    const MAX = 60;
    const LIFETIME = 45;
    let w, h, mx = -1000, my = -1000;

    function resize() { w = c.width = innerWidth; h = c.height = innerHeight; }
    resize();
    addEventListener('resize', resize);
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    let cachedCol = null, lastCheck = 0;
    function getCol() {
        const now = Date.now();
        if (!cachedCol || now - lastCheck > 500) {
            const s = getComputedStyle(document.documentElement);
            cachedCol = {
                r: parseInt(s.getPropertyValue('--trail-r')) || 13,
                g: parseInt(s.getPropertyValue('--trail-g')) || 148,
                b: parseInt(s.getPropertyValue('--trail-b')) || 136
            };
            lastCheck = now;
        }
        return cachedCol;
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

        const col = getCol();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Glow pass — wide, very transparent
        for (let i = 1; i < pts.length - 1; i++) {
            const t = i / (pts.length - 1);
            const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
            const mx1 = (p0.x + p1.x) / 2, my1 = (p0.y + p1.y) / 2;
            const mx2 = (p1.x + p2.x) / 2, my2 = (p1.y + p2.y) / 2;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${(t * t * 0.06).toFixed(4)})`;
            ctx.lineWidth = 8;
            ctx.moveTo(mx1, my1);
            ctx.quadraticCurveTo(p1.x, p1.y, mx2, my2);
            ctx.stroke();
        }

        // Main trail — thin, consistent
        for (let i = 1; i < pts.length - 1; i++) {
            const t = i / (pts.length - 1);
            const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
            const mx1 = (p0.x + p1.x) / 2, my1 = (p0.y + p1.y) / 2;
            const mx2 = (p1.x + p2.x) / 2, my2 = (p1.y + p2.y) / 2;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${(t * 0.28).toFixed(4)})`;
            ctx.lineWidth = 1.5;
            ctx.moveTo(mx1, my1);
            ctx.quadraticCurveTo(p1.x, p1.y, mx2, my2);
            ctx.stroke();
        }

        requestAnimationFrame(draw);
    })();
})();


/* ── Glow Orb — very subtle ─────────────────────────── */
;(function () {
    if (window.innerWidth <= 768) return;
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
        gx += (tx - gx) * 0.04;
        gy += (ty - gy) * 0.04;
        glow.style.transform = `translate(${gx - 275}px,${gy - 275}px)`;
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
    setTimeout(step, 700);
})();


/* ── Theme Toggle — desktop + mobile ────────────────── */
;(function () {
    const html = document.documentElement;
    const set = t => { html.dataset.theme = t; localStorage.setItem('div-theme', t); };
    const toggle = () => set(html.dataset.theme === 'light' ? 'dark' : 'light');

    const saved = localStorage.getItem('div-theme');
    if (saved) set(saved);
    else if (matchMedia('(prefers-color-scheme:dark)').matches) set('dark');

    const dt = document.getElementById('theme-toggle');
    const mt = document.getElementById('mobile-theme-toggle');
    if (dt) dt.addEventListener('click', toggle);
    if (mt) mt.addEventListener('click', toggle);
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


/* ── Timeline Hover (desktop) ───────────────────────── */
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
            detail.style.opacity = '.55';
        });
    });
})();


/* ── Mobile: Scroll animations + active nav ─────────── */
;(function () {
    if (window.innerWidth > 768) return;

    // Staggered entrance on scroll
    const elements = document.querySelectorAll('.cell, .proj-label');
    let staggerCount = 0;

    const enterObserver = new IntersectionObserver(entries => {
        const entering = entries.filter(e => e.isIntersecting);
        entering.forEach((e, i) => {
            e.target.style.transitionDelay = `${(staggerCount + i) * 0.06}s`;
            e.target.classList.add('visible');
            enterObserver.unobserve(e.target);
        });
        staggerCount += entering.length;
        // Reset stagger after a pause
        setTimeout(() => { staggerCount = 0; }, 400);
    }, { threshold: 0.12 });

    elements.forEach(el => enterObserver.observe(el));

    // Active nav link on scroll
    const sections = document.querySelectorAll('[id^="sect-"]');
    const navLinks = document.querySelectorAll('.mn-links a');

    const navObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                navLinks.forEach(l => l.classList.remove('active'));
                const link = document.querySelector(`.mn-links a[href="#${e.target.id}"]`);
                if (link) link.classList.add('active');
            }
        });
    }, { threshold: 0.25, rootMargin: '-48px 0px -50% 0px' });

    sections.forEach(s => navObserver.observe(s));
})();
