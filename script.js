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


/* ── WebGL Fluid Cursor — faithful SplashCursor port ──── */
;(function () {
    if (window.innerWidth <= 768) return;
    const canvas = document.getElementById('trail');
    if (!canvas) return;

    /* ── Config — matches SplashCursor defaults exactly ── */
    const config = {
        SIM_RESOLUTION: 128,
        DYE_RESOLUTION: 1440,
        DENSITY_DISSIPATION: 3.5,
        VELOCITY_DISSIPATION: 2,
        PRESSURE: 0.1,
        PRESSURE_ITERATIONS: 20,
        CURL: 3,
        SPLAT_RADIUS: 0.2,
        SPLAT_FORCE: 6000,
        SHADING: true,
        COLOR_UPDATE_SPEED: 10
    };

    /* ── Pointer state ── */
    function Pointer() {
        this.texcoordX = 0; this.texcoordY = 0;
        this.prevTexcoordX = 0; this.prevTexcoordY = 0;
        this.deltaX = 0; this.deltaY = 0;
        this.moved = false;
        this.color = { r: 0, g: 0, b: 0 };
    }
    let pointer = new Pointer();

    /* ── Helpers ── */
    function scaleByPixelRatio(v) { return Math.floor(v * (window.devicePixelRatio || 1)); }

    function getResolution(resolution) {
        let ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
        if (ar < 1) ar = 1.0 / ar;
        const min = Math.round(resolution);
        const max = Math.round(resolution * ar);
        return gl.drawingBufferWidth > gl.drawingBufferHeight
            ? { width: max, height: min }
            : { width: min, height: max };
    }

    function HSVtoRGB(h, s, v) {
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        return { r, g, b };
    }

    function generateColor() {
        const c = HSVtoRGB(Math.random(), 1.0, 1.0);
        c.r *= 0.12; c.g *= 0.12; c.b *= 0.12;
        return c;
    }

    function correctDeltaX(delta) {
        const ar = canvas.width / canvas.height;
        if (ar < 1) delta *= ar;
        return delta;
    }

    function correctDeltaY(delta) {
        const ar = canvas.width / canvas.height;
        if (ar > 1) delta /= ar;
        return delta;
    }

    function correctRadius(radius) {
        const ar = canvas.width / canvas.height;
        if (ar > 1) radius *= ar;
        return radius;
    }

    /* ── WebGL context ── */
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    let gl = canvas.getContext('webgl2', params);
    const isWebGL2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
    if (!gl) return;

    let halfFloatTexType, supportLinearFiltering;
    if (isWebGL2) {
        gl.getExtension('EXT_color_buffer_float');
        supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
        halfFloatTexType = gl.HALF_FLOAT;
    } else {
        const hf = gl.getExtension('OES_texture_half_float');
        supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
        halfFloatTexType = hf && hf.HALF_FLOAT_OES;
    }
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    /* ── Texture format support ── */
    function supportRenderTextureFormat(internalFormat, format, type) {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        gl.deleteTexture(tex); gl.deleteFramebuffer(fbo);
        return status === gl.FRAMEBUFFER_COMPLETE;
    }

    function getSupportedFormat(internalFormat, format, type) {
        if (!supportRenderTextureFormat(internalFormat, format, type)) {
            switch (internalFormat) {
                case gl.R16F: return getSupportedFormat(gl.RG16F, gl.RG, type);
                case gl.RG16F: return getSupportedFormat(gl.RGBA16F, gl.RGBA, type);
                default: return null;
            }
        }
        return { internalFormat, format };
    }

    let formatRGBA, formatRG, formatR;
    if (isWebGL2) {
        formatRGBA = getSupportedFormat(gl.RGBA16F, gl.RGBA, halfFloatTexType);
        formatRG   = getSupportedFormat(gl.RG16F,   gl.RG,   halfFloatTexType);
        formatR    = getSupportedFormat(gl.R16F,    gl.RED,  halfFloatTexType);
    } else {
        formatRGBA = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
        formatRG   = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
        formatR    = getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType);
    }

    if (!supportLinearFiltering) {
        config.DYE_RESOLUTION = 256;
        config.SHADING = false;
    }

    const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    /* ── Shader compilation ── */
    function compileShader(type, source, keywords) {
        if (keywords) {
            let kw = '';
            keywords.forEach(k => { kw += '#define ' + k + '\n'; });
            source = kw + source;
        }
        const s = gl.createShader(type);
        gl.shaderSource(s, source); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
        return s;
    }

    function createProgram(vs, fs) {
        const p = gl.createProgram();
        gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(p)); return null; }
        const uniforms = {};
        const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i++) {
            const name = gl.getActiveUniform(p, i).name;
            uniforms[name] = gl.getUniformLocation(p, name);
        }
        return { program: p, uniforms, bind() { gl.useProgram(p); } };
    }

    /* ── Shaders — WebGL1 GLSL (compatible with WebGL2 compat mode) ── */
    const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `);
    if (!baseVertexShader) return;

    const clearShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
        void main () {
            gl_FragColor = value * texture2D(uTexture, vUv);
        }
    `);

    const displayShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
        uniform vec2 texelSize;
        vec3 linearToGamma (vec3 color) {
            color = max(color, vec3(0));
            return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
        }
        void main () {
            vec3 c = texture2D(uTexture, vUv).rgb;
            #ifdef SHADING
                vec3 lc = texture2D(uTexture, vL).rgb;
                vec3 rc = texture2D(uTexture, vR).rgb;
                vec3 tc = texture2D(uTexture, vT).rgb;
                vec3 bc = texture2D(uTexture, vB).rgb;
                float dx = length(rc) - length(lc);
                float dy = length(tc) - length(bc);
                vec3 n = normalize(vec3(dx, dy, length(texelSize)));
                vec3 l = vec3(0.0, 0.0, 1.0);
                float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
                c *= diffuse;
            #endif
            float a = max(c.r, max(c.g, c.b));
            gl_FragColor = vec4(c, a);
        }
    `, config.SHADING ? ['SHADING'] : null);

    const splatShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;
        void main () {
            vec2 p = vUv - point.xy;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }
    `);

    const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;
        vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
            vec2 st = uv / tsize - 0.5;
            vec2 iuv = floor(st);
            vec2 fuv = fract(st);
            vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
            vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
            vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
            vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
            return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
        }
        void main () {
            #ifdef MANUAL_FILTERING
                vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
                vec4 result = bilerp(uSource, coord, dyeTexelSize);
            #else
                vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                vec4 result = texture2D(uSource, coord);
            #endif
            float decay = 1.0 + dissipation * dt;
            gl_FragColor = result / decay;
        }
    `, supportLinearFiltering ? null : ['MANUAL_FILTERING']);

    const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).x;
            float R = texture2D(uVelocity, vR).x;
            float T = texture2D(uVelocity, vT).y;
            float B = texture2D(uVelocity, vB).y;
            vec2 C = texture2D(uVelocity, vUv).xy;
            if (vL.x < 0.0) { L = -C.x; }
            if (vR.x > 1.0) { R = -C.x; }
            if (vT.y > 1.0) { T = -C.y; }
            if (vB.y < 0.0) { B = -C.y; }
            float div = 0.5 * (R - L + T - B);
            gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
    `);

    const curlShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
    `);

    const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;
        void main () {
            float L = texture2D(uCurl, vL).x;
            float R = texture2D(uCurl, vR).x;
            float T = texture2D(uCurl, vT).x;
            float B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;
            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            force.y *= -1.0;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity += force * dt;
            velocity = min(max(velocity, -1000.0), 1000.0);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
    `);

    const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            float C = texture2D(uPressure, vUv).x;
            float divergence = texture2D(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
    `);

    const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
    `);

    /* ── Programs ── */
    const prog = {
        clear:    createProgram(baseVertexShader, clearShader),
        display:  createProgram(baseVertexShader, displayShader),
        splat:    createProgram(baseVertexShader, splatShader),
        advection:createProgram(baseVertexShader, advectionShader),
        divergence:createProgram(baseVertexShader, divergenceShader),
        curl:     createProgram(baseVertexShader, curlShader),
        vorticity:createProgram(baseVertexShader, vorticityShader),
        pressure: createProgram(baseVertexShader, pressureShader),
        gradSub:  createProgram(baseVertexShader, gradientSubtractShader)
    };
    if (Object.values(prog).some(p => !p)) return;

    /* ── Geometry ── */
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    function blit(target) {
        if (target == null) {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
            gl.viewport(0, 0, target.width, target.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        }
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    /* ── FBOs ── */
    function createFBO(w, h, internalFormat, format, type, param) {
        gl.activeTexture(gl.TEXTURE0);
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const texelSizeX = 1.0 / w, texelSizeY = 1.0 / h;
        return {
            texture: tex, fbo, width: w, height: h, texelSizeX, texelSizeY,
            attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; }
        };
    }

    function createDoubleFBO(w, h, internalFormat, format, type, param) {
        let fbo1 = createFBO(w, h, internalFormat, format, type, param);
        let fbo2 = createFBO(w, h, internalFormat, format, type, param);
        return {
            width: w, height: h,
            texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY,
            get read() { return fbo1; }, set read(v) { fbo1 = v; },
            get write() { return fbo2; }, set write(v) { fbo2 = v; },
            swap() { const t = fbo1; fbo1 = fbo2; fbo2 = t; }
        };
    }

    /* ── Init FBOs ── */
    function resizeCanvas() {
        const w = scaleByPixelRatio(canvas.clientWidth);
        const h = scaleByPixelRatio(canvas.clientHeight);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w; canvas.height = h;
            return true;
        }
        return false;
    }

    resizeCanvas();

    let simRes = getResolution(config.SIM_RESOLUTION);
    let dyeRes = getResolution(config.DYE_RESOLUTION);

    let dye       = createDoubleFBO(dyeRes.width, dyeRes.height, formatRGBA.internalFormat, formatRGBA.format, halfFloatTexType, filtering);
    let velocity  = createDoubleFBO(simRes.width, simRes.height, formatRG.internalFormat, formatRG.format, halfFloatTexType, filtering);
    let divergenceFBO = createFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, halfFloatTexType, gl.NEAREST);
    let curlFBO   = createFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, halfFloatTexType, gl.NEAREST);
    let pressure  = createDoubleFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, halfFloatTexType, gl.NEAREST);

    /* ── Splat ── */
    function splat(x, y, dx, dy, color) {
        prog.splat.bind();
        gl.uniform1i(prog.splat.uniforms.uTarget, velocity.read.attach(0));
        gl.uniform1f(prog.splat.uniforms.aspectRatio, canvas.width / canvas.height);
        gl.uniform2f(prog.splat.uniforms.point, x, y);
        gl.uniform3f(prog.splat.uniforms.color, dx, dy, 0.0);
        gl.uniform1f(prog.splat.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
        blit(velocity.write); velocity.swap();

        gl.uniform1i(prog.splat.uniforms.uTarget, dye.read.attach(0));
        gl.uniform3f(prog.splat.uniforms.color, color.r, color.g, color.b);
        blit(dye.write); dye.swap();
    }

    function splatPointer(p) {
        const dx = p.deltaX * config.SPLAT_FORCE;
        const dy = p.deltaY * config.SPLAT_FORCE;
        splat(p.texcoordX, p.texcoordY, dx, dy, p.color);
    }

    /* ── Simulation step ── */
    function step(dt) {
        gl.disable(gl.BLEND);

        prog.curl.bind();
        gl.uniform2f(prog.curl.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(prog.curl.uniforms.uVelocity, velocity.read.attach(0));
        blit(curlFBO);

        prog.vorticity.bind();
        gl.uniform2f(prog.vorticity.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(prog.vorticity.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(prog.vorticity.uniforms.uCurl, curlFBO.attach(1));
        gl.uniform1f(prog.vorticity.uniforms.curl, config.CURL);
        gl.uniform1f(prog.vorticity.uniforms.dt, dt);
        blit(velocity.write); velocity.swap();

        prog.divergence.bind();
        gl.uniform2f(prog.divergence.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(prog.divergence.uniforms.uVelocity, velocity.read.attach(0));
        blit(divergenceFBO);

        prog.clear.bind();
        gl.uniform1i(prog.clear.uniforms.uTexture, pressure.read.attach(0));
        gl.uniform1f(prog.clear.uniforms.value, config.PRESSURE);
        blit(pressure.write); pressure.swap();

        prog.pressure.bind();
        gl.uniform2f(prog.pressure.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(prog.pressure.uniforms.uDivergence, divergenceFBO.attach(0));
        for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
            gl.uniform1i(prog.pressure.uniforms.uPressure, pressure.read.attach(1));
            blit(pressure.write); pressure.swap();
        }

        prog.gradSub.bind();
        gl.uniform2f(prog.gradSub.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(prog.gradSub.uniforms.uPressure, pressure.read.attach(0));
        gl.uniform1i(prog.gradSub.uniforms.uVelocity, velocity.read.attach(1));
        blit(velocity.write); velocity.swap();

        prog.advection.bind();
        gl.uniform2f(prog.advection.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        if (!supportLinearFiltering)
            gl.uniform2f(prog.advection.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
        const velId = velocity.read.attach(0);
        gl.uniform1i(prog.advection.uniforms.uVelocity, velId);
        gl.uniform1i(prog.advection.uniforms.uSource, velId);
        gl.uniform1f(prog.advection.uniforms.dt, dt);
        gl.uniform1f(prog.advection.uniforms.dissipation, config.VELOCITY_DISSIPATION);
        blit(velocity.write); velocity.swap();

        if (!supportLinearFiltering)
            gl.uniform2f(prog.advection.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
        gl.uniform1i(prog.advection.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(prog.advection.uniforms.uSource, dye.read.attach(1));
        gl.uniform1f(prog.advection.uniforms.dissipation, config.DENSITY_DISSIPATION);
        blit(dye.write); dye.swap();
    }

    /* ── Render ── */
    function render() {
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
        prog.display.bind();
        if (config.SHADING)
            gl.uniform2f(prog.display.uniforms.texelSize, 1.0 / gl.drawingBufferWidth, 1.0 / gl.drawingBufferHeight);
        gl.uniform1i(prog.display.uniforms.uTexture, dye.read.attach(0));
        blit(null);
    }

    /* ── Pointer input ── */
    let firstMove = true;
    let colorUpdateTimer = 0.0;

    function updatePointerMoveData(posX, posY) {
        pointer.prevTexcoordX = pointer.texcoordX;
        pointer.prevTexcoordY = pointer.texcoordY;
        pointer.texcoordX = posX / canvas.width;
        pointer.texcoordY = 1.0 - posY / canvas.height;
        pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
        pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
        pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    }

    window.addEventListener('mousemove', function (e) {
        const posX = scaleByPixelRatio(e.clientX);
        const posY = scaleByPixelRatio(e.clientY);
        if (firstMove) {
            pointer.color = generateColor();
            firstMove = false;
        }
        updatePointerMoveData(posX, posY);
    });

    window.addEventListener('touchstart', function (e) {
        const t = e.targetTouches;
        for (let i = 0; i < t.length; i++) {
            const posX = scaleByPixelRatio(t[i].clientX);
            const posY = scaleByPixelRatio(t[i].clientY);
            pointer.texcoordX = posX / canvas.width;
            pointer.texcoordY = 1.0 - posY / canvas.height;
            pointer.prevTexcoordX = pointer.texcoordX;
            pointer.prevTexcoordY = pointer.texcoordY;
            pointer.deltaX = 0; pointer.deltaY = 0;
            pointer.color = generateColor();
        }
    });

    window.addEventListener('touchmove', function (e) {
        const t = e.targetTouches;
        for (let i = 0; i < t.length; i++) {
            updatePointerMoveData(scaleByPixelRatio(t[i].clientX), scaleByPixelRatio(t[i].clientY));
        }
    }, false);

    /* ── Frame loop ── */
    let lastUpdateTime = Date.now();

    function calcDeltaTime() {
        const now = Date.now();
        let dt = (now - lastUpdateTime) / 1000;
        dt = Math.min(dt, 0.016666);
        lastUpdateTime = now;
        return dt;
    }

    function updateColors(dt) {
        colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
        if (colorUpdateTimer >= 1) {
            colorUpdateTimer %= 1;
            pointer.color = generateColor();
        }
    }

    ;(function frame() {
        const dt = calcDeltaTime();
        if (resizeCanvas()) {
            simRes = getResolution(config.SIM_RESOLUTION);
            dyeRes = getResolution(config.DYE_RESOLUTION);
            dye      = createDoubleFBO(dyeRes.width, dyeRes.height, formatRGBA.internalFormat, formatRGBA.format, halfFloatTexType, filtering);
            velocity = createDoubleFBO(simRes.width, simRes.height, formatRG.internalFormat, formatRG.format, halfFloatTexType, filtering);
            divergenceFBO = createFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, halfFloatTexType, gl.NEAREST);
            curlFBO  = createFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, halfFloatTexType, gl.NEAREST);
            pressure = createDoubleFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, halfFloatTexType, gl.NEAREST);
        }
        updateColors(dt);
        if (pointer.moved) {
            pointer.moved = false;
            splatPointer(pointer);
        }
        step(dt);
        render();
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


/* ── GitHub Contributions Heatmap ──────────────────── */
;(function () {
    const grid = document.getElementById('gh-grid');
    const totalEl = document.getElementById('gh-total');
    if (!grid) return;

    function render(levels) {
        const frag = document.createDocumentFragment();
        levels.forEach(function (l) {
            const sq = document.createElement('div');
            sq.className = 'gh-sq';
            sq.dataset.level = l;
            frag.appendChild(sq);
        });
        grid.appendChild(frag);
    }

    const WEEKS = 5; // ~1 month (5 weeks to fill partial weeks)

    function fallback() {
        const levels = [];
        let total = 0;
        for (let i = 0; i < WEEKS * 7; i++) {
            const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
            const r = x - Math.floor(x);
            const day = i % 7;
            const week = Math.floor(i / 7);
            const dayW = (day >= 1 && day <= 5) ? 1 : 0.5;
            const weekW = 0.5 + 0.35 * Math.sin(week * 0.35 + 1.5);
            const v = r * dayW * weekW;
            let level = 0;
            if (v > 0.12) level = 1;
            if (v > 0.24) level = 2;
            if (v > 0.36) level = 3;
            if (v > 0.46) level = 4;
            levels.push(level);
            total += [0, 1, 3, 6, 10][level];
        }
        render(levels);
        if (totalEl) totalEl.textContent = total + ' contributions';
    }

    fetch('https://github-contributions-api.jogruber.de/v4/DivyamBanga?y=last')
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (data) {
            const contribs = data.contributions;
            if (!contribs || contribs.length < 30) throw 0;
            // Take only last ~30 days
            const recent = contribs.slice(-30);
            const firstDate = new Date(recent[0].date);
            const startDay = firstDate.getDay();
            const levels = [];
            for (let i = 0; i < startDay; i++) levels.push(-1);
            recent.forEach(function (c) { levels.push(c.level); });
            while (levels.length % 7 !== 0) levels.push(-1);
            render(levels);
            const t = recent.reduce(function (s, c) { return s + c.count; }, 0);
            if (totalEl) totalEl.textContent = t + ' contributions';
        })
        .catch(fallback);
})();


/* ── Spotify / On Repeat ───────────────────────────── */
;(function () {
    const trackEl = document.getElementById('spot-track');
    const artistEl = document.getElementById('spot-artist');
    const linkEl = document.getElementById('spot-open');
    if (!trackEl) return;

    /* ── Customize your tracks here ── */
    const tracks = [
        { name: 'Runaway', artist: 'Kanye West', url: 'https://open.spotify.com/track/3DK6m7It6Pw857FcQftMds' },
        { name: 'Blinding Lights', artist: 'The Weeknd', url: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b' },
        { name: 'Nights', artist: 'Frank Ocean', url: 'https://open.spotify.com/track/7eqoqGkKwgOaEMSTIuKLRX' },
        { name: 'HUMBLE.', artist: 'Kendrick Lamar', url: 'https://open.spotify.com/track/7KXjTSCq5nL1LoYtL7XAwS' }
    ];
    let idx = 0;

    function show(i, immediate) {
        if (immediate) {
            trackEl.textContent = tracks[i].name;
            artistEl.textContent = tracks[i].artist;
            if (linkEl) linkEl.href = tracks[i].url;
            trackEl.style.opacity = '1';
            artistEl.style.opacity = '1';
            return;
        }
        trackEl.style.opacity = '0';
        artistEl.style.opacity = '0';
        setTimeout(function () {
            trackEl.textContent = tracks[i].name;
            artistEl.textContent = tracks[i].artist;
            if (linkEl) linkEl.href = tracks[i].url;
            trackEl.style.opacity = '1';
            artistEl.style.opacity = '1';
        }, 350);
    }

    show(0, true);
    setInterval(function () {
        idx = (idx + 1) % tracks.length;
        show(idx);
    }, 6000);
})();
