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


/* ── WebGL Fluid Cursor — rainbow ink simulation ──────── */
;(function () {
    if (window.innerWidth <= 768) return;
    const canvas = document.getElementById('trail');
    if (!canvas) return;

    /* ── Config ── */
    const SIM_RES = 128, DYE_RES = 1024;
    const DENSITY_DISSIPATION = 3.2, VELOCITY_DISSIPATION = 1.8;
    const PRESSURE = 0.1, ITERATIONS = 20, CURL = 30;
    const SPLAT_RADIUS = 0.25, SPLAT_FORCE = 6000, COLOR_INTENSITY = 0.15;

    canvas.width = innerWidth; canvas.height = innerHeight;

    /* ── WebGL context ── */
    const pa = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    let gl = canvas.getContext('webgl2', pa);
    const gl2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', pa) || canvas.getContext('experimental-webgl', pa);
    if (!gl) return;

    if (gl2) gl.getExtension('EXT_color_buffer_float');
    else { gl.getExtension('OES_texture_half_float'); gl.getExtension('OES_texture_half_float_linear'); }
    gl.clearColor(0, 0, 0, 0);

    const HF = gl2 ? gl.HALF_FLOAT : 0x8D61; // OES_texture_half_float
    const fmtRGBA = gl2 ? gl.RGBA16F : gl.RGBA;
    const fmtRG   = gl2 ? gl.RG16F   : gl.RGBA;
    const fmtR    = gl2 ? gl.R16F    : gl.RGBA;
    const cRGBA   = gl.RGBA;
    const cRG     = gl2 ? gl.RG  : gl.RGBA;
    const cR      = gl2 ? gl.RED : gl.RGBA;

    /* ── Shader helpers ── */
    const V = s => (gl2 ? '#version 300 es\n' : '') + 'precision highp float;\nprecision highp sampler2D;\n' + s;
    const IN  = gl2 ? 'in'  : 'attribute';
    const OUT = gl2 ? 'out' : 'varying';
    const VIN = gl2 ? 'in'  : 'varying';
    const TEX = gl2 ? 'texture' : 'texture2D';
    const FRAG_OUT = gl2 ? 'out vec4 fragColor;\n' : '';
    const FC = gl2 ? 'fragColor' : 'gl_FragColor';

    const baseVS = V(`
        ${IN} vec2 aPosition;
        ${OUT} vec2 vUv, vL, vR, vT, vB;
        uniform vec2 texelSize;
        void main(){
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `);

    function FS(body) {
        return V(`${VIN} vec2 vUv, vL, vR, vT, vB;\n${FRAG_OUT}${body}`);
    }

    /* ── Fragment shaders ── */
    const splatFS = FS(`
        uniform sampler2D uTarget; uniform float aspectRatio;
        uniform vec3 color; uniform vec2 point; uniform float radius;
        void main(){
            vec2 p = vUv - point; p.x *= aspectRatio;
            vec3 splat = exp(-dot(p,p)/radius) * color;
            vec3 base = ${TEX}(uTarget, vUv).xyz;
            ${FC} = vec4(base + splat, 1.0);
        }
    `);
    const advectionFS = FS(`
        uniform sampler2D uVelocity, uSource;
        uniform vec2 texelSize; uniform float dt, dissipation;
        void main(){
            vec2 coord = vUv - dt * ${TEX}(uVelocity, vUv).xy * texelSize;
            ${FC} = ${TEX}(uSource, coord) / (1.0 + dissipation * dt);
        }
    `);
    const divergenceFS = FS(`
        uniform sampler2D uVelocity;
        void main(){
            float L = ${TEX}(uVelocity, vL).x;
            float R = ${TEX}(uVelocity, vR).x;
            float T = ${TEX}(uVelocity, vT).y;
            float B = ${TEX}(uVelocity, vB).y;
            ${FC} = vec4(0.5*(R-L+T-B), 0.0, 0.0, 1.0);
        }
    `);
    const curlFS = FS(`
        uniform sampler2D uVelocity;
        void main(){
            float L = ${TEX}(uVelocity, vL).y;
            float R = ${TEX}(uVelocity, vR).y;
            float T = ${TEX}(uVelocity, vT).x;
            float B = ${TEX}(uVelocity, vB).x;
            ${FC} = vec4(R-L-T+B, 0.0, 0.0, 1.0);
        }
    `);
    const vorticityFS = FS(`
        uniform sampler2D uVelocity, uCurl;
        uniform float curl, dt;
        void main(){
            float L = ${TEX}(uCurl, vL).x;
            float R = ${TEX}(uCurl, vR).x;
            float T = ${TEX}(uCurl, vT).x;
            float B = ${TEX}(uCurl, vB).x;
            float C = ${TEX}(uCurl, vUv).x;
            vec2 force = 0.5 * vec2(abs(T)-abs(B), abs(R)-abs(L));
            force /= length(force)+0.0001;
            force *= curl * C;
            force.y *= -1.0;
            vec2 vel = ${TEX}(uVelocity, vUv).xy + force * dt;
            ${FC} = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
        }
    `);
    const pressureFS = FS(`
        uniform sampler2D uPressure, uDivergence;
        void main(){
            float L = ${TEX}(uPressure, vL).x;
            float R = ${TEX}(uPressure, vR).x;
            float T = ${TEX}(uPressure, vT).x;
            float B = ${TEX}(uPressure, vB).x;
            float C = ${TEX}(uDivergence, vUv).x;
            ${FC} = vec4((L+R+B+T-C)*0.25, 0.0, 0.0, 1.0);
        }
    `);
    const gradSubFS = FS(`
        uniform sampler2D uPressure, uVelocity;
        void main(){
            float L = ${TEX}(uPressure, vL).x;
            float R = ${TEX}(uPressure, vR).x;
            float T = ${TEX}(uPressure, vT).x;
            float B = ${TEX}(uPressure, vB).x;
            vec2 vel = ${TEX}(uVelocity, vUv).xy - vec2(R-L, T-B);
            ${FC} = vec4(vel, 0.0, 1.0);
        }
    `);
    const displayFS = FS(`
        uniform sampler2D uTexture;
        void main(){
            vec3 c = ${TEX}(uTexture, vUv).rgb;
            float a = max(c.r, max(c.g, c.b));
            ${FC} = vec4(c, a);
        }
    `);
    const clearFS = FS(`
        uniform sampler2D uTexture; uniform float value;
        void main(){ ${FC} = value * ${TEX}(uTexture, vUv); }
    `);

    /* ── Compile & link ── */
    function compile(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); gl.deleteShader(s); return null; }
        return s;
    }
    function link(vs, fs) {
        const p = gl.createProgram();
        gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
        const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
        return { program: p, uniforms: u };
    }
    const vsCompiled = compile(gl.VERTEX_SHADER, baseVS);
    if (!vsCompiled) return;
    function makeProg(fragSrc) {
        const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
        if (!fs) return null;
        return link(vsCompiled, fs);
    }

    const P = {
        splat: makeProg(splatFS), adv: makeProg(advectionFS),
        div: makeProg(divergenceFS), curl: makeProg(curlFS),
        vort: makeProg(vorticityFS), press: makeProg(pressureFS),
        grad: makeProg(gradSubFS), disp: makeProg(displayFS),
        clear: makeProg(clearFS)
    };
    if (Object.values(P).some(p => !p)) return;

    /* ── Geometry ── */
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    function blit(target) {
        if (target) gl.viewport(0, 0, target.width, target.height);
        else gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    /* ── FBOs ── */
    function createFBO(w, h, iFmt, fmt, type, filter) {
        gl.activeTexture(gl.TEXTURE0);
        const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, iFmt, w, h, 0, fmt, type, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
        return { texture: tex, fbo, width: w, height: h,
            attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; }
        };
    }
    function dblFBO(w, h, iFmt, fmt, type, filter) {
        let a = createFBO(w, h, iFmt, fmt, type, filter);
        let b = createFBO(w, h, iFmt, fmt, type, filter);
        return { width: w, height: h,
            get read(){ return a; }, get write(){ return b; },
            swap(){ const t = a; a = b; b = t; }
        };
    }
    function res(r) {
        const ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
        return ar < 1 ? { width: Math.round(r * ar), height: r } : { width: r, height: Math.round(r / ar) };
    }

    const sR = res(SIM_RES), dR = res(DYE_RES);
    let velocity   = dblFBO(sR.width, sR.height, fmtRG,   cRG,   HF, gl.LINEAR);
    let dye        = dblFBO(dR.width, dR.height, fmtRGBA, cRGBA, HF, gl.LINEAR);
    let divergence = createFBO(sR.width, sR.height, fmtR, cR, HF, gl.NEAREST);
    let curlFBO    = createFBO(sR.width, sR.height, fmtR, cR, HF, gl.NEAREST);
    let pressure   = dblFBO(sR.width, sR.height, fmtR, cR, HF, gl.NEAREST);

    /* ── Helpers ── */
    function use(p) { gl.useProgram(p.program); return p.uniforms; }

    function correctRadius(r) {
        const ar = canvas.width / canvas.height;
        return ar > 1 ? r * (canvas.height / canvas.width) : r;
    }

    /* ── Rainbow color generator ── */
    let hue = Math.random() * 360;
    function hsvToRGB(h, s, v) {
        const k = (n) => (n + h / 60) % 6;
        const f = (n) => v - v * s * Math.max(Math.min(k(n), 4 - k(n), 1), 0);
        return { r: f(5), g: f(3), b: f(1) };
    }
    function nextColor() {
        hue = (hue + 47) % 360; // golden-angle-ish for max color spread
        const c = hsvToRGB(hue, 1.0, 1.0);
        return { r: c.r * COLOR_INTENSITY, g: c.g * COLOR_INTENSITY, b: c.b * COLOR_INTENSITY };
    }

    /* ── Splat ── */
    function splat(x, y, dx, dy, color) {
        const u = use(P.splat);
        gl.uniform1i(u.uTarget, velocity.read.attach(0));
        gl.uniform1f(u.aspectRatio, canvas.width / canvas.height);
        gl.uniform2f(u.point, x, y);
        gl.uniform3f(u.color, dx, dy, 0.0);
        gl.uniform1f(u.radius, correctRadius(SPLAT_RADIUS / 100));
        blit(velocity.write); velocity.swap();

        gl.uniform1i(u.uTarget, dye.read.attach(0));
        gl.uniform3f(u.color, color.r, color.g, color.b);
        blit(dye.write); dye.swap();
    }

    /* ── Simulation step ── */
    function step(dt) {
        const tx = 1.0 / velocity.read.width, ty = 1.0 / velocity.read.height;
        let u;

        // Curl
        u = use(P.curl);
        gl.uniform2f(u.texelSize, tx, ty);
        gl.uniform1i(u.uVelocity, velocity.read.attach(0));
        blit(curlFBO);

        // Vorticity confinement
        u = use(P.vort);
        gl.uniform2f(u.texelSize, tx, ty);
        gl.uniform1i(u.uVelocity, velocity.read.attach(0));
        gl.uniform1i(u.uCurl, curlFBO.attach(1));
        gl.uniform1f(u.curl, CURL);
        gl.uniform1f(u.dt, dt);
        blit(velocity.write); velocity.swap();

        // Divergence
        u = use(P.div);
        gl.uniform2f(u.texelSize, tx, ty);
        gl.uniform1i(u.uVelocity, velocity.read.attach(0));
        blit(divergence);

        // Clear pressure
        u = use(P.clear);
        gl.uniform1i(u.uTexture, pressure.read.attach(0));
        gl.uniform1f(u.value, PRESSURE);
        blit(pressure.write); pressure.swap();

        // Pressure solve (Jacobi)
        u = use(P.press);
        gl.uniform2f(u.texelSize, tx, ty);
        gl.uniform1i(u.uDivergence, divergence.attach(0));
        for (let i = 0; i < ITERATIONS; i++) {
            gl.uniform1i(u.uPressure, pressure.read.attach(1));
            blit(pressure.write); pressure.swap();
        }

        // Gradient subtraction
        u = use(P.grad);
        gl.uniform2f(u.texelSize, tx, ty);
        gl.uniform1i(u.uPressure, pressure.read.attach(0));
        gl.uniform1i(u.uVelocity, velocity.read.attach(1));
        blit(velocity.write); velocity.swap();

        // Advect velocity
        u = use(P.adv);
        gl.uniform2f(u.texelSize, tx, ty);
        const vId = velocity.read.attach(0);
        gl.uniform1i(u.uVelocity, vId);
        gl.uniform1i(u.uSource, vId);
        gl.uniform1f(u.dt, dt);
        gl.uniform1f(u.dissipation, VELOCITY_DISSIPATION);
        blit(velocity.write); velocity.swap();

        // Advect dye
        gl.uniform2f(u.texelSize, tx, ty);
        gl.uniform1i(u.uVelocity, velocity.read.attach(0));
        gl.uniform1i(u.uSource, dye.read.attach(1));
        gl.uniform1f(u.dissipation, DENSITY_DISSIPATION);
        blit(dye.write); dye.swap();
    }

    /* ── Pointer ── */
    let ptr = { x: 0, y: 0, dx: 0, dy: 0, moved: false };
    addEventListener('mousemove', e => {
        const nx = e.clientX / canvas.width;
        const ny = 1.0 - e.clientY / canvas.height;
        ptr.dx = (nx - ptr.x) * SPLAT_FORCE;
        ptr.dy = (ny - ptr.y) * SPLAT_FORCE;
        ptr.x = nx; ptr.y = ny;
        ptr.moved = true;
    });

    addEventListener('resize', () => { canvas.width = innerWidth; canvas.height = innerHeight; });

    /* ── Render loop ── */
    let last = Date.now();
    ;(function frame() {
        const now = Date.now();
        const dt = Math.min((now - last) / 1000, 0.016666);
        last = now;

        if (ptr.moved) {
            ptr.moved = false;
            splat(ptr.x, ptr.y, ptr.dx, ptr.dy, nextColor());
        }

        step(dt);

        // Display
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const u = use(P.disp);
        gl.uniform2f(u.texelSize, 1.0 / canvas.width, 1.0 / canvas.height);
        gl.uniform1i(u.uTexture, dye.read.attach(0));
        blit(null);

        requestAnimationFrame(frame);
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
