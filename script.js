/* ===================================================
   Div Banga — Site Interactions
   =================================================== */

// ─── Paint Canvas ───────────────────────────────────
const paintCanvas = (() => {
    const canvas = document.getElementById('paint-canvas');
    const ctx = canvas.getContext('2d');
    let lastPos = null;
    let colorIdx = 0;
    let isActive = false;
    let hasPainted = false;
    let rafId = null;

    const palettes = {
        light: [
            [209, 64, 0, 0.10],
            [255, 107, 53, 0.09],
            [255, 160, 122, 0.08],
            [255, 179, 71, 0.07],
            [232, 56, 13, 0.07],
        ],
        dark: [
            [79, 195, 247, 0.13],
            [124, 77, 255, 0.11],
            [0, 229, 255, 0.09],
            [255, 110, 64, 0.10],
            [179, 136, 255, 0.09],
        ]
    };

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function getColor() {
        const theme = document.documentElement.dataset.theme || 'light';
        const pal = palettes[theme];
        const c = pal[colorIdx % pal.length];
        colorIdx++;
        return c;
    }

    function drawSplat(x, y, radius, rgba) {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]})`);
        grad.addColorStop(0.6, `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3] * 0.4})`);
        grad.addColorStop(1, `rgba(${rgba[0]},${rgba[1]},${rgba[2]},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    function onMouseMove(e) {
        if (!isActive) return;

        const x = e.clientX;
        const y = e.clientY;

        if (!hasPainted) {
            hasPainted = true;
            const hint = document.getElementById('paint-hint');
            if (hint) hint.classList.add('faded');
        }

        if (lastPos) {
            const dx = x - lastPos.x;
            const dy = y - lastPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 1) {
                const steps = Math.ceil(dist / 3);
                for (let i = 0; i < steps; i++) {
                    const t = i / steps;
                    const px = lastPos.x + dx * t;
                    const py = lastPos.y + dy * t;
                    const speed = dist / steps;
                    const radius = Math.max(5, 35 - speed * 0.4) + Math.random() * 10;
                    const color = getColor();

                    drawSplat(
                        px + (Math.random() - 0.5) * 4,
                        py + (Math.random() - 0.5) * 4,
                        radius,
                        color
                    );

                    // Scatter particles
                    if (Math.random() < 0.25) {
                        const angle = Math.random() * Math.PI * 2;
                        const scatter = Math.random() * speed * 2.5;
                        drawSplat(
                            px + Math.cos(angle) * scatter,
                            py + Math.sin(angle) * scatter,
                            radius * 0.35,
                            getColor()
                        );
                    }
                }
            }
        }
        lastPos = { x, y };
    }

    // Very slow fade so painting accumulates but doesn't over-saturate
    function tick() {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.002)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
        rafId = requestAnimationFrame(tick);
    }

    function show() {
        isActive = true;
        canvas.classList.add('active');
        canvas.classList.remove('hidden');
        lastPos = null;
    }

    function hide() {
        isActive = false;
        canvas.classList.remove('active');
        canvas.classList.add('hidden');
    }

    function clear() {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        hasPainted = false;
        const hint = document.getElementById('paint-hint');
        if (hint) hint.classList.remove('faded');
    }

    // Init
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    tick();

    return { show, hide, clear };
})();


// ─── Typing Effect ──────────────────────────────────
const typingEffect = (() => {
    const el = document.getElementById('typing-text');
    const words = ['engineer', 'builder', 'competitor', 'maker'];
    let wordIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let timeout = null;

    function tick() {
        const current = words[wordIdx];

        if (!isDeleting) {
            charIdx++;
            el.textContent = current.slice(0, charIdx);
            if (charIdx === current.length) {
                timeout = setTimeout(() => { isDeleting = true; tick(); }, 1800);
                return;
            }
            timeout = setTimeout(tick, 80 + Math.random() * 40);
        } else {
            charIdx--;
            el.textContent = current.slice(0, charIdx);
            if (charIdx === 0) {
                isDeleting = false;
                wordIdx = (wordIdx + 1) % words.length;
                timeout = setTimeout(tick, 400);
                return;
            }
            timeout = setTimeout(tick, 40 + Math.random() * 20);
        }
    }

    function start() {
        // Small delay to let entrance animations play first
        setTimeout(tick, 900);
    }

    return { start };
})();


// ─── Theme Toggle ───────────────────────────────────
const themeToggle = (() => {
    const btn = document.getElementById('theme-toggle');
    const html = document.documentElement;

    function set(theme) {
        html.dataset.theme = theme;
        localStorage.setItem('div-theme', theme);
    }

    function init() {
        const saved = localStorage.getItem('div-theme');
        if (saved) {
            set(saved);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            set('dark');
        }

        btn.addEventListener('click', () => {
            const next = html.dataset.theme === 'light' ? 'dark' : 'light';
            set(next);
        });
    }

    return { init };
})();


// ─── Section Navigation ─────────────────────────────
const navigation = (() => {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('#nav a[data-section]');
    let currentSection = 'home';
    let transitioning = false;

    function goTo(id) {
        if (id === currentSection || transitioning) return;
        transitioning = true;

        const leaving = document.getElementById(currentSection);
        const entering = document.getElementById(id);

        // Update nav link state
        navLinks.forEach(a => a.classList.toggle('active', a.dataset.section === id));

        // Canvas visibility
        if (id === 'home') {
            paintCanvas.clear();
            paintCanvas.show();
        } else {
            paintCanvas.hide();
        }

        // Animate out
        leaving.classList.add('leaving');
        leaving.classList.remove('active');

        // Animate in
        setTimeout(() => {
            entering.classList.add('active');
            currentSection = id;

            // Clean up leaving state
            setTimeout(() => {
                leaving.classList.remove('leaving');
                transitioning = false;
            }, 460);
        }, 200);
    }

    function init() {
        // Nav clicks
        navLinks.forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                goTo(a.dataset.section);
            });
        });

        // Assign stagger indices to project cards
        document.querySelectorAll('.project-card').forEach((card, i) => {
            card.style.setProperty('--i', i);
        });

        // Start with canvas active on hero
        paintCanvas.show();
    }

    return { init, goTo };
})();


// ─── Photo Slideshow ────────────────────────────────
const slideshow = (() => {
    const images = [
        'assets/d1.webp', 'assets/d2.webp', 'assets/d3.webp', 'assets/d4.webp',
        'assets/d5.webp', 'assets/d6.webp', 'assets/d7.webp', 'assets/d8.webp',
        'assets/d9.webp', 'assets/d10.webp', 'assets/d11.webp', 'assets/d12.webp'
    ];
    let current = 0;
    let slideA, slideB;
    let aIsActive = true;

    function init() {
        slideA = document.querySelector('.slide-a');
        slideB = document.querySelector('.slide-b');
        if (!slideA || !slideB) return;

        // Preload a few images
        images.slice(0, 4).forEach(src => {
            const img = new Image();
            img.src = src;
        });

        setInterval(next, 3500);
    }

    function next() {
        current = (current + 1) % images.length;

        if (aIsActive) {
            slideB.src = images[current];
            slideB.onload = () => {
                slideA.classList.remove('active');
                slideB.classList.add('active');
                aIsActive = false;
            };
        } else {
            slideA.src = images[current];
            slideA.onload = () => {
                slideB.classList.remove('active');
                slideA.classList.add('active');
                aIsActive = true;
            };
        }
    }

    return { init };
})();


// ─── Card Tilt Effect ───────────────────────────────
const cardTilt = (() => {
    function init() {
        document.querySelectorAll('[data-tilt]').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                const tiltX = (y - 0.5) * -8;
                const tiltY = (x - 0.5) * 8;
                const shadowX = (x - 0.5) * -16;
                const shadowY = (y - 0.5) * -16;

                card.style.transform = `perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.025)`;
                card.style.boxShadow = `${shadowX}px ${shadowY}px 30px rgba(0,0,0,0.08)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
                card.style.boxShadow = '';
            });
        });
    }

    return { init };
})();


// ─── Timeline Interaction ───────────────────────────
const timeline = (() => {
    function init() {
        const items = document.querySelectorAll('.timeline-item');
        const detail = document.getElementById('timeline-detail');
        if (!detail) return;

        items.forEach(item => {
            item.addEventListener('mouseenter', () => {
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                detail.textContent = item.dataset.info;
                detail.style.opacity = '1';
            });

            item.addEventListener('mouseleave', () => {
                item.classList.remove('active');
                detail.style.opacity = '0';
            });
        });

        // Activate last item by default when about section is shown
        const observer = new MutationObserver(() => {
            const aboutSection = document.getElementById('about');
            if (aboutSection.classList.contains('active')) {
                const last = items[items.length - 1];
                last.classList.add('active');
                detail.textContent = last.dataset.info;
                detail.style.opacity = '1';
            }
        });
        const aboutSection = document.getElementById('about');
        observer.observe(aboutSection, { attributes: true, attributeFilter: ['class'] });
    }

    return { init };
})();


// ─── Keyboard Navigation ────────────────────────────
function initKeyboard() {
    const sectionOrder = ['home', 'projects', 'about', 'contact'];
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const idx = sectionOrder.indexOf(document.querySelector('.section.active')?.id);
            if (idx < sectionOrder.length - 1) navigation.goTo(sectionOrder[idx + 1]);
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const idx = sectionOrder.indexOf(document.querySelector('.section.active')?.id);
            if (idx > 0) navigation.goTo(sectionOrder[idx - 1]);
        }
    });
}


// ─── Initialize Everything ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    themeToggle.init();
    navigation.init();
    typingEffect.start();
    slideshow.init();
    cardTilt.init();
    timeline.init();
    initKeyboard();
});
