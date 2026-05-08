// =====================================================================
// UI CONTROLLER
// =====================================================================

class App {
    constructor() {
        this.viewer = new KonataViewer(document.getElementById('main-canvas'));
        this.trace = null;
        this.bookmarks = [];
        
        this.setupUI();
        this.setupKeyboard();
        this.setupDragDrop();
    }
    
    setupUI() {
        // File open
        document.getElementById('open-btn').addEventListener('click', () => {
            const fileInput = document.getElementById('file-input');
            fileInput.value = '';  // Reset to allow re-opening same file
            fileInput.click();
        });
        
        document.getElementById('file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.loadFile(file);
        });

        // Demo button
        document.getElementById('demo-btn').addEventListener('click', async () => {
            const text = await loadDemoKanata();
            const demoFile = new File([text], 'jv32soc.kanata', { type: 'text/plain' });
            this.loadFile(demoFile);
        });
        
        // Zoom controls
        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            this.viewer.zoomIn();
        });
        
        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            this.viewer.zoomOut();
        });
        
        document.getElementById('fit-btn').addEventListener('click', () => {
            this.viewer.fitView();
        });
        
        // Bookmark
        document.getElementById('bookmark-btn').addEventListener('click', () => this.addBookmark());
        document.getElementById('bookmark-add-btn').addEventListener('click', () => this.addBookmark());
        
        // Anchor mode
        const anchorBtn = document.getElementById('anchor-btn');
        anchorBtn.addEventListener('click', () => {
            const enabled = this.viewer.toggleAnchorMode();
            anchorBtn.style.opacity = enabled ? '1.0' : '0.4';
            anchorBtn.title = enabled ? 'Anchor Mode (ON)' : 'Anchor Mode (OFF)';
        });
        
        // Split lanes
        const splitLanesBtn = document.getElementById('split-lanes-btn');
        splitLanesBtn.addEventListener('click', () => {
            const oldRowH = this.viewer.rowH();
            this.viewer.splitLanes = !this.viewer.splitLanes;
            const newRowH = this.viewer.rowH();
            // Rescale scrollY so the same row stays at the top of the viewport
            if (oldRowH !== newRowH) {
                this.viewer.scrollY = Math.round(this.viewer.scrollY / oldRowH * newRowH);
            }
            splitLanesBtn.classList.toggle('active', this.viewer.splitLanes);
            this.viewer.clampScroll();
            if (this.viewer.anchorMode) {
                this.viewer.anchorHCenter();
            }
            this.viewer.render();
        });
        
        // Find button
        document.getElementById('find-btn').addEventListener('click', () => {
            const query = prompt('Find instruction (search in labels and IDs):');
            if (query) {
                this.viewer.findInstruction(query);
            }
        });
        
        // Export SVG
        document.getElementById('export-btn').addEventListener('click', () => this.exportSVG());
        
        // Help
        document.getElementById('help-btn').addEventListener('click', () => {
            document.getElementById('help-overlay').style.display = 'flex';
        });
        
        document.getElementById('close-help-btn').addEventListener('click', () => {
            document.getElementById('help-overlay').style.display = 'none';
        });
        
        document.getElementById('help-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'help-overlay') {
                document.getElementById('help-overlay').style.display = 'none';
            }
        });

        // About
        document.getElementById('app-name-btn').addEventListener('click', () => {
            document.getElementById('about-overlay').style.display = 'flex';
        });
        document.getElementById('about-close-btn').addEventListener('click', () => {
            document.getElementById('about-overlay').style.display = 'none';
        });
        document.getElementById('about-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'about-overlay') {
                document.getElementById('about-overlay').style.display = 'none';
            }
        });

        // Theme toggle
        const themeBtn = document.getElementById('theme-btn');
        const moonSVG = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>`;
        const sunSVG  = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>`;
        const applyTheme = (isLight) => {
            if (isLight) {
                document.body.classList.add('light');
                themeBtn.innerHTML = sunSVG + ' Light';
                themeBtn.title = 'Toggle dark/light theme (D)';
                localStorage.setItem('kv-theme', 'light');
            } else {
                document.body.classList.remove('light');
                themeBtn.innerHTML = moonSVG + ' Dark';
                themeBtn.title = 'Toggle dark/light theme (D)';
                localStorage.setItem('kv-theme', 'dark');
            }
            this.viewer.render();
        };
        themeBtn.addEventListener('click', () => {
            applyTheme(!document.body.classList.contains('light'));
        });
        // Restore saved theme
        if (localStorage.getItem('kv-theme') === 'light') applyTheme(true);
    }

    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Don't handle shortcuts if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                const fileInput = document.getElementById('file-input');
                fileInput.value = '';  // Reset to allow re-opening same file
                fileInput.click();
            }
            else if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                const query = prompt('Find instruction (search in labels and IDs):');
                if (query) {
                    this.viewer.findInstruction(query);
                }
            }
            else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.viewer.zoomIn();
            }
            else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.viewer.zoomOut();
            }
            else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                this.viewer.fitView();
            }
            else if (e.key === 'l' || e.key === 'L') {
                e.preventDefault();
                document.getElementById('split-lanes-btn').click();
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                this.viewer.selectedRow = -1;
                this.viewer.render();
            }
            else if (e.key === '?') {
                e.preventDefault();
                document.getElementById('help-overlay').style.display = 'flex';
            }
            else if (e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                document.getElementById('theme-btn').click();
            }
            else if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                this.addBookmark();
            }
        });
    }
    
    exportSVG() {
        const v = this.viewer;
        if (!v.trace) return;
        
        const W = v.width;
        const H = v.height;
        const FONT = 'SFMono-Regular,Consolas,Liberation Mono,Menlo,Courier,monospace';
        
        const row0 = Math.max(0, Math.floor(v.scrollY / v.rowH()));
        const row1 = Math.min(v.trace.instructions.length - 1,
                             Math.ceil((v.scrollY + H - RULER_HEIGHT) / v.rowH()));
        const cyc0 = v.trace.startCycle + v.scrollX / v.pxCycle;
        const cyc1 = cyc0 + (W - LABEL_WIDTH) / v.pxCycle;
        const gridStep = v.getGridStep();
        
        const lines = [];
        const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        
        lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
        lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}">`);
        
        // Background
        lines.push(`<rect width="${W}" height="${H}" fill="#262930"/>`);
        
        // SVG defs for gradients (one per unique stage color pair)
        const gradDefs = new Map();
        const getGradId = (name, laneId, x1, x2) => {
            const colors = v.getStageColors(name, laneId);
            if (colors.begin === colors.end) return null;
            const key = `${colors.begin}_${colors.end}`;
            if (!gradDefs.has(key)) {
                const id = `g${gradDefs.size}`;
                gradDefs.set(key, { id, begin: colors.begin, end: colors.end });
            }
            return gradDefs.get(key);
        };
        
        // Pre-scan to register all gradients
        for (let ri = row0; ri <= row1; ri++) {
            for (const stg of v.trace.instructions[ri].stages) {
                getGradId(stg.stageName, stg.laneId, 0, 1);
            }
        }
        
        // Emit defs
        lines.push('<defs>');
        for (const [, g] of gradDefs) {
            lines.push(`<linearGradient id="${g.id}" x1="0" y1="0" x2="1" y2="0">`);
            lines.push(`  <stop offset="0" stop-color="${g.begin}"/>`);
            lines.push(`  <stop offset="1" stop-color="${g.end}"/>`);
            lines.push('</linearGradient>');
        }
        lines.push('</defs>');
        
        // Clip path for pipeline area
        lines.push(`<clipPath id="pipe-clip"><rect x="${LABEL_WIDTH}" y="${RULER_HEIGHT}" width="${W - LABEL_WIDTH}" height="${H - RULER_HEIGHT}"/></clipPath>`);
        
        // Row backgrounds
        for (let ri = row0; ri <= row1; ri++) {
            const y = v.row2y(ri);
            if (ri % 2 === 0)
                lines.push(`<rect x="0" y="${y}" width="${W}" height="${v.rowH()}" fill="rgba(255,255,255,0.03)"/>`);
            if (ri === v.selectedRow)
                lines.push(`<rect x="0" y="${y}" width="${W}" height="${v.rowH()}" fill="rgba(255,220,0,0.15)"/>`);
        }
        
        // Cycle grid
        let gc = Math.floor(cyc0 / gridStep) * gridStep;
        while (gc <= cyc1) {
            const x = v.cy2x(gc);
            if (x >= LABEL_WIDTH && x <= W)
                lines.push(`<line x1="${x.toFixed(1)}" y1="${RULER_HEIGHT}" x2="${x.toFixed(1)}" y2="${H}" stroke="#292929" stroke-width="0.5"/>`);
            gc += gridStep;
        }
        
        // Stage boxes (clipped to pipeline area)
        lines.push('<g clip-path="url(#pipe-clip)">');
        for (let ri = row0; ri <= row1; ri++) {
            const ins = v.trace.instructions[ri];
            const y = v.row2y(ri);
            const lane0Stages = ins.stages.filter(s => s.laneId === 0);
            const laneNStages = ins.stages.filter(s => s.laneId > 0);
            
            const drawBox = (sx, ex, stg, boxY, boxH) => {
                const bx = Math.max(LABEL_WIDTH, sx);
                const bw = Math.min(ex, W) - bx;
                if (bw <= 0) return;
                const colors = v.getStageColors(stg.stageName, stg.laneId);
                let fill;
                if (colors.begin === colors.end) {
                    fill = colors.begin;
                } else {
                    const gid = `gu_${ri}_${stg.stageName}_${stg.laneId}`.replace(/[^a-zA-Z0-9_]/g,'_');
                    lines.push(`<linearGradient id="${gid}" x1="${bx}" y1="0" x2="${bx+bw}" y2="0" gradientUnits="userSpaceOnUse">`);
                    lines.push(`  <stop offset="0" stop-color="${colors.begin}"/>`);
                    lines.push(`  <stop offset="1" stop-color="${colors.end}"/>`);
                    lines.push('</linearGradient>');
                    fill = `url(#${gid})`;
                }
                lines.push(`<rect x="${bx.toFixed(1)}" y="${(boxY+1).toFixed(1)}" width="${bw.toFixed(1)}" height="${boxH-2}" fill="${fill}" stroke="#f0f0f0" stroke-width="0.5"/>`);
                
                // Labels: stage name at cycle 0, stall count (1,2,...) at subsequent cycles
                if (v.pxCycle >= 6) {
                    const stgLen = stg.endCycle - stg.startCycle;
                    const stgStartX = v.cy2x(stg.startCycle);
                    const ty = (boxY + boxH / 2).toFixed(1);
                    const fontSize = Math.min(10, v.pxCycle * 0.65).toFixed(1);
                    const textAttrs = `text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="${fontSize}" font-weight="bold" font-family="${FONT}"`;
                    
                    const x0 = stgStartX + v.pxCycle * 0.5;
                    if (x0 > LABEL_WIDTH && x0 < W)
                        lines.push(`<text x="${x0.toFixed(1)}" y="${ty}" ${textAttrs}>${esc(stg.stageName)}</text>`);
                    
                    for (let j = 1; j < stgLen; j++) {
                        const xj = stgStartX + (j + 0.5) * v.pxCycle;
                        if (xj < LABEL_WIDTH) continue;
                        if (xj > W) break;
                        lines.push(`<text x="${xj.toFixed(1)}" y="${ty}" ${textAttrs}>${j}</text>`);
                    }
                }
            };
            
            if (v.splitLanes && v.trace.maxLaneId > 0) {
                // Split lanes: each lane in its own sub-row
                for (const stg of ins.stages) {
                    const sx = v.cy2x(stg.startCycle);
                    const ex = v.cy2x(stg.endCycle);
                    if (ex > LABEL_WIDTH && sx < W)
                        drawBox(sx, ex, stg, y + stg.laneId * ROW_HEIGHT, ROW_HEIGHT);
                }
                // Lane separator lines
                for (let lid = 1; lid <= v.trace.maxLaneId; lid++) {
                    const ly = y + lid * ROW_HEIGHT;
                    lines.push(`<line x1="${LABEL_WIDTH}" y1="${ly.toFixed(1)}" x2="${W}" y2="${ly.toFixed(1)}" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>`);
                }
            } else {
                for (const stg of lane0Stages) {
                    const sx = v.cy2x(stg.startCycle);
                    const ex = v.cy2x(stg.endCycle);
                    const segments = [{start: sx, end: ex}];
                    for (const ov of laneNStages) {
                        const ox1 = v.cy2x(ov.startCycle), ox2 = v.cy2x(ov.endCycle);
                        const ns = [];
                        for (const seg of segments) {
                            if (seg.end <= ox1 || seg.start >= ox2) { ns.push(seg); }
                            else { if (seg.start < ox1) ns.push({start:seg.start,end:ox1}); if (seg.end > ox2) ns.push({start:ox2,end:seg.end}); }
                        }
                        segments.length = 0; segments.push(...ns);
                    }
                    for (const seg of segments) if (seg.end > LABEL_WIDTH && seg.start < W) drawBox(seg.start, seg.end, stg, y, ROW_HEIGHT);
                }
                for (const stg of laneNStages) {
                    const sx = v.cy2x(stg.startCycle), ex = v.cy2x(stg.endCycle);
                    if (ex > LABEL_WIDTH && sx < W) drawBox(sx, ex, stg, y, ROW_HEIGHT);
                }
            }
        }
        lines.push('</g>');
        
        // Ruler
        lines.push(`<rect x="${LABEL_WIDTH}" y="0" width="${W-LABEL_WIDTH}" height="${RULER_HEIGHT}" fill="#262930"/>`);
        gc = Math.floor(cyc0 / gridStep) * gridStep;
        while (gc <= cyc1) {
            const x = v.cy2x(gc);
            if (x >= LABEL_WIDTH && x <= W)
                lines.push(`<text x="${x.toFixed(1)}" y="${(RULER_HEIGHT/2).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="#c7c8ca" font-size="11" font-family="${FONT}">${gc}</text>`);
            gc += gridStep;
        }
        
        // Label pane
        lines.push(`<rect x="0" y="${RULER_HEIGHT}" width="${LABEL_WIDTH}" height="${H-RULER_HEIGHT}" fill="#303340"/>`);
        for (let ri = row0; ri <= row1; ri++) {
            const ins = v.trace.instructions[ri];
            const y = v.row2y(ri);
            const label = ins.labels.length > 0 ? ins.labels[0] : `[${ins.idInFile}]`;
            const truncated = label.length > 35 ? label.substring(0, 32) + '...' : label;
            lines.push(`<text x="6" y="${(y+ROW_HEIGHT/2).toFixed(1)}" dominant-baseline="middle" fill="#c7c8ca" font-size="11" font-family="${FONT}">${esc(truncated)}</text>`);
        }
        
        // Corner
        lines.push(`<rect x="0" y="0" width="${LABEL_WIDTH}" height="${RULER_HEIGHT}" fill="#303340"/>`);
        
        lines.push('</svg>');
        
        // Download
        const blob = new Blob([lines.join('\n')], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (v.trace.fileName || 'pipeline') + '.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    addBookmark() {
        if (!this.viewer.trace) return;
        
        // Prefer highlighted row; fall back to top visible row
        const selRow = this.viewer.selectedRow;
        const row = selRow >= 0 ? selRow : Math.floor(this.viewer.scrollY / this.viewer.rowH());
        const ins = this.viewer.trace.instructions[row];
        
        // Scroll so that the bookmarked row is visible and centred
        const scrollX = selRow >= 0 ? this.viewer.scrollX : this.viewer.scrollX;
        const vph = Math.max(1, this.viewer.height - RULER_HEIGHT);
        const scrollY = selRow >= 0
            ? Math.max(0, row * this.viewer.rowH() - vph / 2)
            : this.viewer.scrollY;
        
        const cycle = Math.round(this.viewer.trace.startCycle + scrollX / this.viewer.pxCycle);
        const defaultLabel = ins && ins.labels.length > 0
            ? ins.labels[0]
            : `Row ${row + 1}, Cycle ${cycle}`;
        const name = prompt('Bookmark name:', defaultLabel);
        if (name === null) return;  // cancelled
        this.bookmarks.push({
            name: name.trim() || defaultLabel,
            row,
            cycle,
            scrollX,
            scrollY
        });
        this.renderBookmarks();
    }
    
    renderBookmarks() {
        const list = document.getElementById('bookmark-list');
        list.innerHTML = '';
        if (this.bookmarks.length === 0) {
            list.innerHTML = '<span id="bookmark-empty">No bookmarks yet</span>';
            return;
        }
        this.bookmarks.forEach((bm, idx) => {
            const item = document.createElement('div');
            item.className = 'bookmark-item';
            
            const icon = document.createElement('span');
            icon.className = 'bookmark-icon';
            icon.textContent = '🔖';
            
            const label = document.createElement('span');
            label.className = 'bookmark-label';
            label.textContent = bm.name;
            label.title = bm.name;
            
            const pos = document.createElement('span');
            pos.className = 'bookmark-pos';
            pos.textContent = `R${bm.row + 1}`;
            
            const del = document.createElement('span');
            del.className = 'bookmark-del';
            del.textContent = '×';
            del.title = 'Remove bookmark';
            del.addEventListener('click', (e) => {
                e.stopPropagation();
                this.bookmarks.splice(idx, 1);
                this.renderBookmarks();
            });
            
            item.appendChild(icon);
            item.appendChild(label);
            item.appendChild(pos);
            item.appendChild(del);
            
            item.addEventListener('click', () => {
                // Highlight the bookmarked row
                this.viewer.selectedRow = bm.row;
                
                // Center the view vertically on that row
                const vph = Math.max(1, this.viewer.height - RULER_HEIGHT);
                this.viewer.scrollY = Math.max(0, bm.row * this.viewer.rowH() - vph / 2 + this.viewer.rowH() / 2);
                
                // Restore horizontal scroll position
                this.viewer.scrollX = bm.scrollX;
                
                this.viewer.clampScroll();
                this.viewer.render();
            });
            
            list.appendChild(item);
        });
    }

    setupDragDrop() {
        const dropZone = this.viewer.canvas.parentElement;
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const file = e.dataTransfer.files[0];
            if (file) this.loadFile(file);
        });
    }
    
    loadFile(file) {
        const progressOverlay = document.getElementById('progress-overlay');
        const progressBar = document.getElementById('progress-bar-fill');
        const progressText = document.getElementById('progress-text');
        
        // Show progress overlay
        progressOverlay.classList.add('visible');
        progressBar.style.width = '0%';
        progressText.textContent = `Loading ${file.name}...`;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                progressBar.style.width = '10%';
                progressText.textContent = 'Reading file...';
                
                const trace = await parseKonataFile(e.target.result, (progress, message) => {
                    progressBar.style.width = progress + '%';
                    progressText.textContent = message;
                });
                
                this.trace = trace;
                trace.fileName = file.name.replace(/\.[^.]+$/, '');
                this.viewer.setTrace(trace);
                this.updateStats();
                this.updateLegend();
                document.getElementById('info').textContent = 
                    `${trace.instructions.length.toLocaleString()} instructions | ` +
                    `${trace.startCycle}–${trace.endCycle} cycles | ` +
                    `${trace.dependencies.length} dependencies`;
                
                // Hide progress overlay
                setTimeout(() => {
                    progressOverlay.classList.remove('visible');
                }, 300);
            } catch (error) {
                alert('Error parsing file: ' + error.message);
                document.getElementById('info').textContent = 'Error loading file';
                progressOverlay.classList.remove('visible');
            }
        };
        reader.readAsText(file);
    }
    
    updateStats() {
        if (!this.trace) return;
        
        const stats = [
            ['Instructions:', this.trace.instructions.length.toLocaleString()],
            ['Cycles:', `${this.trace.startCycle}–${this.trace.endCycle}`],
            ['Span:', `${(this.trace.endCycle - this.trace.startCycle).toLocaleString()} cycles`],
            ['Dependencies:', this.trace.dependencies.length.toLocaleString()],
        ];
        
        const content = document.getElementById('stats-content');
        content.innerHTML = stats.map(([label, value]) => `
            <div class="stat-row">
                <span class="stat-label">${label}</span>
                <span class="stat-value">${value}</span>
            </div>
        `).join('');
    }
    
    updateLegend() {
        if (!this.trace) return;
        
        const seen = new Set();
        const stages = [];
        
        for (const ins of this.trace.instructions) {
            for (const stg of ins.stages) {
                if (!seen.has(stg.stageName)) {
                    seen.add(stg.stageName);
                    const colors = this.viewer.getStageColors(stg.stageName, stg.laneId);
                    stages.push({
                        name: stg.stageName,
                        color: colors.begin
                    });
                }
            }
        }
        
        const content = document.getElementById('legend-content');
        content.innerHTML = stages.map(stg => `
            <div class="legend-item">
                <div class="legend-color" style="background: ${stg.color}"></div>
                <span class="legend-name">${stg.name}</span>
            </div>
        `).join('');
    }
}

// =====================================================================
// INIT
// =====================================================================

const app = new App();
