#!/usr/bin/env node
// build.js — assemble dist/KonataViewer.html from src/ + examples/
'use strict';

const fs    = require('fs');
const path  = require('path');
const zlib  = require('zlib');
const { minify } = require('terser');

const ROOT     = __dirname;
const SRC      = path.join(ROOT, 'src');
const EXAMPLES = path.join(ROOT, 'examples');
const DIST     = path.join(ROOT, 'dist');
const OUT      = path.join(DIST, 'KonataViewer.html');

// JS modules concatenated in dependency order
const JS_MODULES = [
    'constants.js',
    'models.js',
    'demo.js',
    'parser.js',
    'viewer.js',
    'app.js',
];

// ── CSS minifier (no extra dependency) ───────────────────────────────────────
function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')   // strip block comments
        .replace(/\s*([{}:;,>~+])\s*/g, '$1') // strip space around syntax chars
        .replace(/\s+/g, ' ')               // collapse whitespace
        .replace(/;}/g, '}')                // drop trailing semicolons
        .trim();
}

// ── read sources ──────────────────────────────────────────────────────────────
const template = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
const css      = fs.readFileSync(path.join(SRC, 'style.css'),  'utf8');
const demo     = fs.readFileSync(path.join(EXAMPLES, 'jv32soc.kanata'), 'utf8');

// ── compress demo data with gzip → base64 ────────────────────────────────────
const demoB64 = zlib.gzipSync(demo, { level: 9 }).toString('base64');

(async () => {
    // ── build JS bundle from individual modules ───────────────────────────────
    const moduleTexts = {};
    const rawBundle = JS_MODULES
        .map(name => {
            const src = fs.readFileSync(path.join(SRC, name), 'utf8');
            moduleTexts[name] = src;
            return src;
        })
        .join('\n');

    // Inject compressed demo data before minifying
    const bundleWithDemo = rawBundle.replace(
        /\/\/ @inject:demo\nconst DEMO_KANATA = ``; \/\/ replaced at build time\n/,
        `// DEMO DATA — gzip+base64 encoded jv32soc.kanata\n` +
        `const DEMO_KANATA_B64 = '${demoB64}';\n` +
        `async function loadDemoKanata() {\n` +
        `    const bytes = Uint8Array.from(atob(DEMO_KANATA_B64), c => c.charCodeAt(0));\n` +
        `    const ds = new DecompressionStream('gzip');\n` +
        `    const writer = ds.writable.getWriter();\n` +
        `    writer.write(bytes); writer.close();\n` +
        `    const chunks = [];\n` +
        `    const reader = ds.readable.getReader();\n` +
        `    while (true) { const {done,value} = await reader.read(); if (done) break; chunks.push(value); }\n` +
        `    const all = new Uint8Array(chunks.reduce((a,c) => a+c.length, 0));\n` +
        `    let off = 0; for (const c of chunks) { all.set(c, off); off += c.length; }\n` +
        `    return new TextDecoder().decode(all);\n` +
        `}\n`
    );

    // ── minify JS with terser ─────────────────────────────────────────────────
    const minified = await minify(bundleWithDemo, {
        ecma: 2017,
        compress: { passes: 2 },
        mangle: true,
        format: { comments: false },
    });
    if (minified.error) throw minified.error;

    // The <script> block in the template uses 8-space indent for the marker line
    const jsInlined = minified.code;

    // ── minify CSS ────────────────────────────────────────────────────────────
    const cssMinified = minifyCSS(css);

    // ── assemble HTML ─────────────────────────────────────────────────────────
    let html = template
        .replace('    <!-- @inject:css -->\n', cssMinified + '\n')
        .replace('    <!-- @inject:js -->\n',  jsInlined + '\n');

    // ── write output ──────────────────────────────────────────────────────────
    fs.mkdirSync(DIST, { recursive: true });
    fs.writeFileSync(OUT, html, 'utf8');

    const outKB  = (fs.statSync(OUT).size / 1024).toFixed(1);
    const rawJS  = JS_MODULES.reduce((t, n) => t + fs.statSync(path.join(SRC, n)).size, 0);
    const rawCSS = fs.statSync(path.join(SRC, 'style.css')).size;
    const demoRaw = demo.length;
    console.log(`Built ${path.relative(ROOT, OUT)}  (${outKB} KB)`);
    console.log(`  JS   raw ${(rawJS/1024).toFixed(1)} KB → minified ${(minified.code.length/1024).toFixed(1)} KB`);
    console.log(`  CSS  raw ${(rawCSS/1024).toFixed(1)} KB → minified ${(cssMinified.length/1024).toFixed(1)} KB`);
    console.log(`  Demo raw ${(demoRaw/1024).toFixed(1)} KB → gzip+b64 ${(demoB64.length/1024).toFixed(1)} KB`);
})();

