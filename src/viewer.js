// =====================================================================
// RENDERER
// =====================================================================

class KonataViewer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.trace = null;
        
        // View state
        this.pxCycle = DEF_PX_CYCLE;
        this.scrollX = 0;
        this.scrollY = 0;
        this.selectedRow = -1;
        this.anchorMode = true;  // Anchor mode enabled by default
        this.splitLanes = false; // Split lanes mode
        
        // Cached data
        this.stageColors = new Map();
        
        // Scrollbar elements
        this.hScrollbar = document.getElementById('h-scrollbar');
        this.hScrollbarThumb = document.getElementById('h-scrollbar-thumb');
        this.vScrollbar = document.getElementById('v-scrollbar');
        this.vScrollbarThumb = document.getElementById('v-scrollbar-thumb');
        
        // Minimap elements
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        this.minimapBase = null;
        
        this.setupCanvas();
        this.setupEvents();
        this.setupScrollbars();
    }
    
    rowH() {
        if (this.splitLanes && this.trace && this.trace.maxLaneId > 0) {
            return ROW_HEIGHT * (this.trace.maxLaneId + 1);
        }
        return ROW_HEIGHT;
    }
    
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    }
    
    setupEvents() {
        // Resize handling
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.render();
        });
        
        // Mouse events
        let dragging = false;
        let dragMoved = false;
        let lastX = 0;
        let lastY = 0;
        
        this.canvas.addEventListener('mousedown', (e) => {
            dragging = true;
            dragMoved = false;
            lastX = e.clientX;
            lastY = e.clientY;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (dragging) {
                const dx = e.clientX - lastX;
                const dy = e.clientY - lastY;
                this.scrollX -= dx;
                this.scrollY -= dy;
                this.clampScroll();
                lastX = e.clientX;
                lastY = e.clientY;
                dragMoved = true;
                this.render();
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (dragging && !dragMoved) {
                // Click without drag - select the clicked row
                const rect = this.canvas.getBoundingClientRect();
                const mouseY = e.clientY - rect.top;
                if (mouseY > RULER_HEIGHT) {
                    const clickedRow = Math.floor((mouseY - RULER_HEIGHT + this.scrollY) / this.rowH());
                    if (this.trace && clickedRow >= 0 && clickedRow < this.trace.instructions.length) {
                        // Toggle: click same row again to deselect
                        this.selectedRow = (this.selectedRow === clickedRow) ? -1 : clickedRow;
                    } else {
                        this.selectedRow = -1;
                    }
                } else {
                    this.selectedRow = -1;
                }
                this.render();
            }
            dragging = false;
            dragMoved = false;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            dragging = false;
        });
        
        // Wheel: Ctrl+wheel to zoom, normal wheel to scroll
        this.canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                // Ctrl+wheel: zoom
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            } else if (e.shiftKey) {
                // Shift+wheel: horizontal scroll
                e.preventDefault();
                this.scrollX += e.deltaY;
                this.clampScroll();
                this.render();
            } else {
                // Normal wheel: vertical scroll
                e.preventDefault();
                const oldScrollY = this.scrollY;
                this.scrollY += e.deltaY;
                this.clampScroll();
                
                // Apply anchor mode if enabled and vertical scroll changed
                if (this.anchorMode && oldScrollY !== this.scrollY) {
                    this.anchorHCenter();
                }
                this.render();
            }
        });
    }
    
    setupScrollbars() {
        // Horizontal scrollbar drag
        let hDragging = false;
        let hDragStart = 0;
        let hScrollStart = 0;
        
        this.hScrollbarThumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            hDragging = true;
            hDragStart = e.clientX;
            hScrollStart = this.scrollX;
        });
        
        // Vertical scrollbar drag
        let vDragging = false;
        let vDragStart = 0;
        let vScrollStart = 0;
        
        this.vScrollbarThumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            vDragging = true;
            vDragStart = e.clientY;
            vScrollStart = this.scrollY;
        });
        
        // Global mouse move and up for scrollbar dragging
        document.addEventListener('mousemove', (e) => {
            if (hDragging) {
                e.preventDefault();
                const delta = e.clientX - hDragStart;
                const trackWidth = this.hScrollbar.offsetWidth;
                const thumbWidth = this.hScrollbarThumb.offsetWidth;
                const scrollableWidth = trackWidth - thumbWidth;
                
                if (this.trace) {
                    const totalCycles = this.trace.endCycle - this.trace.startCycle;
                    const maxScrollX = Math.max(0, totalCycles * this.pxCycle - (this.width - LABEL_WIDTH));
                    this.scrollX = hScrollStart + (delta / scrollableWidth) * maxScrollX;
                    this.clampScroll();
                    this.updateMinimap();
                    this.render();
                }
            }
            
            if (vDragging) {
                e.preventDefault();
                const delta = e.clientY - vDragStart;
                const trackHeight = this.vScrollbar.offsetHeight;
                const thumbHeight = this.vScrollbarThumb.offsetHeight;
                const scrollableHeight = trackHeight - thumbHeight;
                
                if (this.trace) {
                    const oldScrollY = this.scrollY;
                    const maxScrollY = Math.max(0, this.trace.instructions.length * this.rowH() - (this.height - RULER_HEIGHT));
                    this.scrollY = vScrollStart + (delta / scrollableHeight) * maxScrollY;
                    this.clampScroll();
                    
                    // Apply anchor mode if enabled
                    if (this.anchorMode && oldScrollY !== this.scrollY) {
                        this.anchorHCenter();
                    }
                    this.updateMinimap();
                    this.render();
                }
            }
        });
        
        document.addEventListener('mouseup', () => {
            hDragging = false;
            vDragging = false;
        });
        
        // Click on scrollbar track
        this.hScrollbar.addEventListener('mousedown', (e) => {
            if (e.target === this.hScrollbar) {
                const rect = this.hScrollbar.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const thumbWidth = this.hScrollbarThumb.offsetWidth;
                const trackWidth = this.hScrollbar.offsetWidth;
                
                if (this.trace) {
                    const totalCycles = this.trace.endCycle - this.trace.startCycle;
                    const maxScrollX = Math.max(0, totalCycles * this.pxCycle - (this.width - LABEL_WIDTH));
                    this.scrollX = ((clickX - thumbWidth / 2) / (trackWidth - thumbWidth)) * maxScrollX;
                    this.clampScroll();
                    this.render();
                }
            }
        });
        
        this.vScrollbar.addEventListener('mousedown', (e) => {
            if (e.target === this.vScrollbar) {
                const rect = this.vScrollbar.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const thumbHeight = this.vScrollbarThumb.offsetHeight;
                const trackHeight = this.vScrollbar.offsetHeight;
                
                if (this.trace) {
                    const oldScrollY = this.scrollY;
                    const maxScrollY = Math.max(0, this.trace.instructions.length * this.rowH() - (this.height - RULER_HEIGHT));
                    this.scrollY = ((clickY - thumbHeight / 2) / (trackHeight - thumbHeight)) * maxScrollY;
                    this.clampScroll();
                    
                    // Apply anchor mode if enabled
                    if (this.anchorMode && oldScrollY !== this.scrollY) {
                        this.anchorHCenter();
                    }
                    this.render();
                }
            }
        });
    }
    
    updateScrollbars() {
        if (!this.trace) {
            this.hScrollbarThumb.style.width = '0';
            this.vScrollbarThumb.style.height = '0';
            return;
        }
        
        // Update horizontal scrollbar
        const totalCycles = this.trace.endCycle - this.trace.startCycle;
        const contentWidth = totalCycles * this.pxCycle;
        const viewportWidth = this.width - LABEL_WIDTH;
        const hScrollbarWidth = this.hScrollbar.offsetWidth;
        
        if (contentWidth <= viewportWidth) {
            this.hScrollbarThumb.style.width = '0';
            this.hScrollbarThumb.style.left = '0';
        } else {
            const thumbWidth = Math.max(20, (viewportWidth / contentWidth) * hScrollbarWidth);
            const maxScrollX = contentWidth - viewportWidth;
            const thumbLeft = (this.scrollX / maxScrollX) * (hScrollbarWidth - thumbWidth);
            
            this.hScrollbarThumb.style.width = thumbWidth + 'px';
            this.hScrollbarThumb.style.left = thumbLeft + 'px';
        }
        
        // Update vertical scrollbar
        const contentHeight = this.trace.instructions.length * this.rowH();
        const viewportHeight = this.height - RULER_HEIGHT;
        const vScrollbarHeight = this.vScrollbar.offsetHeight;
        
        if (contentHeight <= viewportHeight) {
            this.vScrollbarThumb.style.height = '0';
            this.vScrollbarThumb.style.top = '0';
        } else {
            const thumbHeight = Math.max(20, (viewportHeight / contentHeight) * vScrollbarHeight);
            const maxScrollY = contentHeight - viewportHeight;
            const thumbTop = (this.scrollY / maxScrollY) * (vScrollbarHeight - thumbHeight);
            
            this.vScrollbarThumb.style.height = thumbHeight + 'px';
            this.vScrollbarThumb.style.top = thumbTop + 'px';
        }
    }
    
    setTrace(trace) {
        this.trace = trace;
        this.scrollX = 0;
        this.scrollY = 0;
        this.selectedRow = -1;
        this.pxCycle = DEF_PX_CYCLE;
        this.minimapBase = null;
        this.prerenderMinimap();
        this.render();
    }
    
    // ---- Minimap methods ----
    
    prerenderMinimap() {
        const mw = 256, mh = 160;
        const mc = document.createElement('canvas');
        mc.width = mw;
        mc.height = mh;
        const mctx = mc.getContext('2d');
        
        mctx.fillStyle = '#1a1d26';
        mctx.fillRect(0, 0, mw, mh);
        
        if (!this.trace || this.trace.instructions.length === 0) {
            this.minimapBase = mc;
            return;
        }
        
        const totalCycles = Math.max(1, this.trace.endCycle - this.trace.startCycle);
        const totalRows = this.trace.instructions.length;
        const scaleX = mw / totalCycles;
        
        if (totalRows >= mh) {
            // Sample: one pixel row per unique row in minimap height
            for (let py = 0; py < mh; py++) {
                const ri = Math.floor(py * totalRows / mh);
                const ins = this.trace.instructions[ri];
                for (const stg of ins.stages) {
                    const colors = this.getStageColors(stg.stageName, stg.laneId);
                    mctx.fillStyle = colors.begin;
                    const x1 = Math.floor((stg.startCycle - this.trace.startCycle) * scaleX);
                    const x2 = Math.ceil((stg.endCycle - this.trace.startCycle) * scaleX);
                    mctx.fillRect(x1, py, Math.max(1, x2 - x1), 1);
                }
            }
        } else {
            // Full render: each row maps to multiple pixels
            const scaleY = mh / totalRows;
            for (let ri = 0; ri < totalRows; ri++) {
                const ins = this.trace.instructions[ri];
                const y = Math.floor(ri * scaleY);
                const h = Math.max(1, Math.ceil(scaleY));
                for (const stg of ins.stages) {
                    const colors = this.getStageColors(stg.stageName, stg.laneId);
                    mctx.fillStyle = colors.begin;
                    const x1 = Math.floor((stg.startCycle - this.trace.startCycle) * scaleX);
                    const x2 = Math.ceil((stg.endCycle - this.trace.startCycle) * scaleX);
                    mctx.fillRect(x1, y, Math.max(1, x2 - x1), h);
                }
            }
        }
        
        this.minimapBase = mc;
    }
    
    updateMinimap() {
        if (!this.trace || !this.minimapBase) return;
        
        const mw = this.minimapCanvas.width;
        const mh = this.minimapCanvas.height;
        
        // Draw pre-rendered base
        this.minimapCtx.clearRect(0, 0, mw, mh);
        this.minimapCtx.drawImage(this.minimapBase, 0, 0);
        
        // Darken entire minimap
        this.minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        this.minimapCtx.fillRect(0, 0, mw, mh);
        
        // Calculate viewport rect in minimap coordinates
        const totalCycles = Math.max(1, this.trace.endCycle - this.trace.startCycle);
        const totalRows = Math.max(1, this.trace.instructions.length);
        const scaleX = mw / totalCycles;
        const scaleY = mh / totalRows;
        
        const vpCycles = (this.width - LABEL_WIDTH) / this.pxCycle;
        const vpRows = (this.height - RULER_HEIGHT) / this.rowH();
        
        const vx = Math.max(0, Math.min(mw - 2, (this.scrollX / this.pxCycle) * scaleX));
        const vy = Math.max(0, Math.min(mh - 2, (this.scrollY / this.rowH()) * scaleY));
        const vw = Math.min(mw - vx, Math.max(2, vpCycles * scaleX));
        const vh = Math.min(mh - vy, Math.max(2, vpRows * scaleY));
        
        // Re-draw the viewport area from base (bright)
        this.minimapCtx.drawImage(this.minimapBase, vx, vy, vw, vh, vx, vy, vw, vh);
        
        // Viewport border
        this.minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        this.minimapCtx.lineWidth = 1.5;
        this.minimapCtx.strokeRect(vx + 0.75, vy + 0.75, vw - 1.5, vh - 1.5);
        
        // Info text
        const curCycle = Math.round(this.trace.startCycle + this.scrollX / this.pxCycle);
        const curRow = Math.floor(this.scrollY / this.rowH());
        document.getElementById('minimap-info').textContent =
            `Row ${curRow + 1} / ${totalRows}  ·  Cycle ${curCycle}`;
    }
    
    zoomIn() {
        if (!this.trace) return;
        
        // Calculate viewport dimensions (excluding scrollbars and label/ruler)
        const vpw = Math.max(1, this.width - LABEL_WIDTH);
        const centerCycle = this.trace.startCycle + (this.scrollX + vpw / 2) / this.pxCycle;
        
        // Apply zoom
        this.pxCycle = Math.min(MAX_PX_CYCLE, this.pxCycle * 1.2);
        
        // Recalculate scrollX to keep center cycle in center
        const newPx = (centerCycle - this.trace.startCycle) * this.pxCycle;
        this.scrollX = Math.max(0, newPx - vpw / 2);
        this.clampScroll();
        this.render();
    }
    
    zoomOut() {
        if (!this.trace) return;
        
        // Calculate viewport dimensions (excluding scrollbars and label/ruler)
        const vpw = Math.max(1, this.width - LABEL_WIDTH);
        const centerCycle = this.trace.startCycle + (this.scrollX + vpw / 2) / this.pxCycle;
        
        // Apply zoom
        this.pxCycle = Math.max(MIN_PX_CYCLE, this.pxCycle / 1.2);
        
        // Recalculate scrollX to keep center cycle in center
        const newPx = (centerCycle - this.trace.startCycle) * this.pxCycle;
        this.scrollX = Math.max(0, newPx - vpw / 2);
        this.clampScroll();
        this.render();
    }
    
    fitView() {
        if (!this.trace || this.trace.instructions.length === 0) return;
        
        // Get currently visible rows
        const vph = Math.max(1, this.height - RULER_HEIGHT);
        const vpw = Math.max(1, this.width - LABEL_WIDTH);
        const row0 = Math.max(0, Math.floor(this.scrollY / this.rowH()));
        const row1 = Math.min(this.trace.instructions.length - 1, 
                             Math.floor((this.scrollY + vph) / this.rowH()));
        
        // Find cycle range of visible rows
        let cyLo = this.trace.endCycle;
        let cyHi = this.trace.startCycle;
        
        for (let ri = row0; ri <= row1; ri++) {
            const ins = this.trace.instructions[ri];
            const lane0 = ins.stages.filter(s => s.laneId === 0);
            
            if (lane0.length > 0) {
                const minCycle = Math.min(...lane0.map(s => s.startCycle));
                const maxCycle = Math.max(...lane0.map(s => s.endCycle));
                cyLo = Math.min(cyLo, minCycle);
                cyHi = Math.max(cyHi, maxCycle);
            } else {
                cyLo = Math.min(cyLo, ins.fetchCycle);
                cyHi = Math.max(cyHi, ins.fetchCycle + 1);
            }
        }
        
        // Add 5% padding
        const span = Math.max(1, cyHi - cyLo);
        const pad = Math.max(1, Math.floor(span * 0.05));
        cyLo = Math.max(this.trace.startCycle, cyLo - pad);
        cyHi = Math.min(this.trace.endCycle, cyHi + pad);
        const finalSpan = Math.max(1, cyHi - cyLo);
        
        // Calculate zoom to fit
        this.pxCycle = vpw / finalSpan;
        this.pxCycle = Math.max(MIN_PX_CYCLE, Math.min(MAX_PX_CYCLE, this.pxCycle));
        
        // Scroll to show this range
        this.scrollX = Math.max(0, (cyLo - this.trace.startCycle) * this.pxCycle);
        this.clampScroll();
        this.render();
    }
    
    anchorHCenter() {
        // Anchor mode: keep centered pipeline visible when scrolling vertically
        if (!this.trace || this.trace.instructions.length === 0) return;
        
        const vph = Math.max(1, this.height - RULER_HEIGHT);
        const vpw = Math.max(1, this.width - LABEL_WIDTH);
        const centreY = this.scrollY + vph / 2;
        const row = Math.floor(centreY / this.rowH());
        const clampedRow = Math.max(0, Math.min(row, this.trace.instructions.length - 1));
        
        const ins = this.trace.instructions[clampedRow];
        const lane0 = ins.stages.filter(s => s.laneId === 0);
        
        let cyMid;
        if (lane0.length > 0) {
            const minCycle = Math.min(...lane0.map(s => s.startCycle));
            const maxCycle = Math.max(...lane0.map(s => s.endCycle));
            cyMid = (minCycle + maxCycle) / 2;
        } else {
            cyMid = ins.fetchCycle;
        }
        
        const px = (cyMid - this.trace.startCycle) * this.pxCycle;
        this.scrollX = Math.max(0, px - vpw / 2);
    }
    
    toggleAnchorMode() {
        this.anchorMode = !this.anchorMode;
        return this.anchorMode;
    }
    
    findInstruction(query) {
        if (!this.trace || !query) return;
        
        const lowerQuery = query.toLowerCase();
        let foundRow = -1;
        
        // Search from current position forward
        const startRow = this.selectedRow >= 0 ? this.selectedRow + 1 : 0;
        
        for (let i = 0; i < this.trace.instructions.length; i++) {
            const idx = (startRow + i) % this.trace.instructions.length;
            const ins = this.trace.instructions[idx];
            
            // Search in labels
            for (const label of ins.labels) {
                if (label.toLowerCase().includes(lowerQuery)) {
                    foundRow = idx;
                    break;
                }
            }
            
            if (foundRow >= 0) break;
            
            // Search in ID
            if (ins.idInFile.toString().includes(query)) {
                foundRow = idx;
                break;
            }
        }
        
        if (foundRow >= 0) {
            // Scroll to found instruction
            this.selectedRow = foundRow;
            const targetY = foundRow * this.rowH();
            const vph = this.height - RULER_HEIGHT;
            this.scrollY = Math.max(0, targetY - vph / 2);
            this.clampScroll();
            
            // Center horizontally on this instruction
            const ins = this.trace.instructions[foundRow];
            const lane0 = ins.stages.filter(s => s.laneId === 0);
            if (lane0.length > 0) {
                const minCycle = Math.min(...lane0.map(s => s.startCycle));
                const maxCycle = Math.max(...lane0.map(s => s.endCycle));
                const cyMid = (minCycle + maxCycle) / 2;
                const vpw = this.width - LABEL_WIDTH - 15;
                const px = (cyMid - this.trace.startCycle) * this.pxCycle;
                this.scrollX = Math.max(0, px - vpw / 2);
                this.clampScroll();
            }
            
            this.render();
            return true;
        } else {
            alert('No match found for: ' + query);
            return false;
        }
    }
    
    clampScroll() {
        // Clamp scrollY to valid range
        if (this.trace && this.trace.instructions.length > 0) {
            const maxScrollY = Math.max(0, this.trace.instructions.length * this.rowH() - (this.height - RULER_HEIGHT));
            this.scrollY = Math.max(0, Math.min(this.scrollY, maxScrollY));
            
            // Clamp scrollX to valid range
            const totalCycles = this.trace.endCycle - this.trace.startCycle;
            const maxScrollX = Math.max(0, totalCycles * this.pxCycle - (this.width - LABEL_WIDTH));
            this.scrollX = Math.max(0, Math.min(this.scrollX, maxScrollX));
        } else {
            this.scrollX = Math.max(0, this.scrollX);
            this.scrollY = Math.max(0, this.scrollY);
        }
    }
    
    getStageColors(name, laneId) {
        // Returns {begin, end} colors for gradient rendering
        const key = `${name}:${laneId}`;
        if (this.stageColors.has(key)) {
            return this.stageColors.get(key);
        }
        
        const lk = name.toLowerCase();
        let colors;
        
        // Special handling for stall/flush stages (lane > 0)
        if (laneId > 0) {
            if (name.match(/^\d+$/) || lk === 'stl' || lk === 'st' || lk === 'f') {
                // Stall stage: grey (H=0, S=0%, L=50%)
                colors = { begin: '#808080', end: '#808080' };
                this.stageColors.set(key, colors);
                return colors;
            }
            // Otherwise, fall through to use normal coloring
        }
        
        // Check for special annotation stages (stall, flush) in lane 0
        if (STAGE_COLORS[lk]) {
            colors = { begin: STAGE_COLORS[lk], end: STAGE_COLORS[lk] };
        } else {
            // Main pipeline stage - use official Konata HSL gradient
            // Begin: H varies, S=40%, L=40%
            // End: H varies, S=40%, L=50% (lighter for gradient)
            const level = STAGE_LEVELS[lk] !== undefined ? STAGE_LEVELS[lk] : (Math.abs(this.hashCode(lk)) % 15);
            const hue = ((250 - level * 55) % 360 + 360) % 360;  // Ensure positive
            colors = {
                begin: hslToHex(hue, 40, 40),
                end: hslToHex(hue, 40, 50)
            };
        }
        
        this.stageColors.set(key, colors);
        return colors;
    }
    
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
    
    cy2x(cycle) {
        return LABEL_WIDTH + (cycle - this.trace.startCycle) * this.pxCycle - this.scrollX;
    }
    
    row2y(row) {
        return RULER_HEIGHT + row * this.rowH() - this.scrollY;
    }
    
    render() {
        if (!this.trace) {
            this.renderEmpty();
            return;
        }
        
        const ctx = this.ctx;
        const W = this.width;
        const H = this.height;
        const t = this._theme();
        
        // Clear
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);
        
        // Calculate visible range
        const row0 = Math.max(0, Math.floor(this.scrollY / this.rowH()));
        const row1 = Math.min(this.trace.instructions.length - 1,
                             Math.ceil((this.scrollY + H - RULER_HEIGHT) / this.rowH()));
        
        const cyc0 = this.trace.startCycle + this.scrollX / this.pxCycle;
        const cyc1 = cyc0 + (W - LABEL_WIDTH) / this.pxCycle;
        
        // Row backgrounds (stripe overlay)
        for (let ri = row0; ri <= row1; ri++) {
            const y = this.row2y(ri);
            if (y + this.rowH() < RULER_HEIGHT || y > H) continue;
            
            // Stripe overlay on even rows
            if (ri % 2 === 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.fillRect(0, y, W, this.rowH());
            }
            
            if (ri === this.selectedRow) {
                ctx.fillStyle = 'rgba(255, 220, 0, 0.15)';
                ctx.fillRect(0, y, W, this.rowH());
            }
        }
        
        // Cycle grid
        ctx.strokeStyle = t.grid;
        ctx.lineWidth = 0.5;
        const gridStep = this.getGridStep();
        let gc = Math.floor(cyc0 / gridStep) * gridStep;
        while (gc <= cyc1) {
            const x = this.cy2x(gc);
            if (x >= LABEL_WIDTH && x <= W) {
                ctx.beginPath();
                ctx.moveTo(x, RULER_HEIGHT);
                ctx.lineTo(x, H);
                ctx.stroke();
            }
            gc += gridStep;
        }
        
        // Stage boxes
        for (let ri = row0; ri <= row1; ri++) {
            const ins = this.trace.instructions[ri];
            const y = this.row2y(ri);
            
            if (this.splitLanes && this.trace.maxLaneId > 0) {
                // Split lanes: each lane rendered in its own sub-row
                for (const stg of ins.stages) {
                    const laneY = y + stg.laneId * ROW_HEIGHT;
                    const sx = this.cy2x(stg.startCycle);
                    const ex = this.cy2x(stg.endCycle);
                    if (ex > LABEL_WIDTH && sx < W) {
                        this.drawStageBox(sx, laneY, ex - sx, stg.stageName, stg.laneId,
                            sx, stg.endCycle - stg.startCycle, ROW_HEIGHT);
                    }
                }
                // Lane separator lines
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 0.5;
                for (let lid = 1; lid <= this.trace.maxLaneId; lid++) {
                    const ly = y + lid * ROW_HEIGHT;
                    if (ly < RULER_HEIGHT || ly > H) continue;
                    ctx.beginPath();
                    ctx.moveTo(LABEL_WIDTH, ly);
                    ctx.lineTo(W, ly);
                    ctx.stroke();
                }
            } else {
                // Normal mode: lane 0 with cut-outs, lane N overlaid
                const lane0Stages = ins.stages.filter(s => s.laneId === 0);
                const laneNStages = ins.stages.filter(s => s.laneId > 0);
                
                // Draw lane 0 stages (split around overlays)
                for (const stg of lane0Stages) {
                    let sx = this.cy2x(stg.startCycle);
                    let ex = this.cy2x(stg.endCycle);
                    
                    // Check for overlaps with lane > 0
                    const segments = [{start: sx, end: ex}];
                    for (const overlay of laneNStages) {
                        const ox1 = this.cy2x(overlay.startCycle);
                        const ox2 = this.cy2x(overlay.endCycle);
                        
                        const newSegments = [];
                        for (const seg of segments) {
                            if (seg.end <= ox1 || seg.start >= ox2) {
                                newSegments.push(seg);
                            } else {
                                if (seg.start < ox1) {
                                    newSegments.push({start: seg.start, end: ox1});
                                }
                                if (seg.end > ox2) {
                                    newSegments.push({start: ox2, end: seg.end});
                                }
                            }
                        }
                        segments.length = 0;
                        segments.push(...newSegments);
                    }
                    
                    // Draw segments
                    for (const seg of segments) {
                        if (seg.end > LABEL_WIDTH && seg.start < W) {
                            this.drawStageBox(seg.start, y, seg.end - seg.start, stg.stageName, stg.laneId,
                                this.cy2x(stg.startCycle), stg.endCycle - stg.startCycle);
                        }
                    }
                }
                
                // Draw lane > 0 stages
                for (const stg of laneNStages) {
                    const sx = this.cy2x(stg.startCycle);
                    const ex = this.cy2x(stg.endCycle);
                    if (ex > LABEL_WIDTH && sx < W) {
                        this.drawStageBox(sx, y, ex - sx, stg.stageName, stg.laneId,
                            sx, stg.endCycle - stg.startCycle);
                    }
                }
            }
        }
        
        // Ruler
        ctx.fillStyle = t.ruler;
        ctx.fillRect(LABEL_WIDTH, 0, W - LABEL_WIDTH, RULER_HEIGHT);
        
        ctx.fillStyle = t.fg;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        gc = Math.floor(cyc0 / gridStep) * gridStep;
        while (gc <= cyc1) {
            const x = this.cy2x(gc);
            if (x >= LABEL_WIDTH && x <= W) {
                ctx.fillText(gc.toString(), x, RULER_HEIGHT / 2);
            }
            gc += gridStep;
        }
        
        // Labels
        ctx.fillStyle = t.label;
        ctx.fillRect(0, RULER_HEIGHT, LABEL_WIDTH, H - RULER_HEIGHT);
        
        ctx.fillStyle = t.fg;
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        for (let ri = row0; ri <= row1; ri++) {
            const ins = this.trace.instructions[ri];
            const y = this.row2y(ri);
            if (y + this.rowH() < RULER_HEIGHT || y > H) continue;
            
            const label = ins.labels.length > 0 ? ins.labels[0] : `[${ins.idInFile}]`;
            const truncated = label.length > 35 ? label.substring(0, 32) + '...' : label;
            
            if (this.splitLanes && this.trace.maxLaneId > 0) {
                // Main label at lane-0 sub-row center
                ctx.fillStyle = t.fg;
                ctx.fillText(truncated, 6, y + ROW_HEIGHT / 2);
                // Lane index labels for lanes > 0
                ctx.fillStyle = t.fgDim;
                ctx.font = '10px monospace';
                for (let lid = 1; lid <= this.trace.maxLaneId; lid++) {
                    ctx.fillText(`  lane ${lid}`, 6, y + lid * ROW_HEIGHT + ROW_HEIGHT / 2);
                }
                ctx.fillStyle = t.fg;
                ctx.font = '11px monospace';
            } else {
                ctx.fillText(truncated, 6, y + ROW_HEIGHT / 2);
            }
        }
        
        // Corner
        ctx.fillStyle = t.label;
        ctx.fillRect(0, 0, LABEL_WIDTH, RULER_HEIGHT);
        
        // Update scrollbars and minimap
        this.updateScrollbars();
        this.updateMinimap();
    }
    
    drawStageBox(x, y, width, name, laneId, stgStartX, stgLen, boxH = ROW_HEIGHT) {
        const ctx = this.ctx;
        const bx = Math.max(LABEL_WIDTH, x);
        const bw = Math.min(x + width, this.width) - bx;
        
        if (bw <= 0) return;
        
        const colors = this.getStageColors(name, laneId);
        
        // Gradient rendering (left to right)
        const gradient = ctx.createLinearGradient(bx, 0, bx + bw, 0);
        gradient.addColorStop(0, colors.begin);
        gradient.addColorStop(1, colors.end);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(bx, y + 1, bw, boxH - 2);
        
        // White outline (official Konata border)
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(bx, y + 1, bw, boxH - 2);
        
        // Labels: draw stage name at cycle 0, stall count (1,2,3...) at each subsequent cycle
        // Mirrors official Konata: stage name in first cell, j=1,2,... in subsequent cells
        if (this.pxCycle >= 6 && stgStartX !== undefined) {
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.min(10, this.pxCycle * 0.65)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const ty = y + boxH / 2;
            const W = this.width;
            
            // Stage name at first cycle cell
            const x0 = stgStartX + this.pxCycle * 0.5;
            if (x0 > LABEL_WIDTH && x0 < W) {
                ctx.fillText(name, x0, ty);
            }
            
            // Stall/cycle count at subsequent cycle cells
            for (let j = 1; j < stgLen; j++) {
                const xj = stgStartX + (j + 0.5) * this.pxCycle;
                if (xj < LABEL_WIDTH) continue;
                if (xj > W) break;
                ctx.fillText(j, xj, ty);
            }
        }
    }
    
    getGridStep() {
        const minPx = 60;
        const cyclesPerPx = 1 / this.pxCycle;
        const minCycles = minPx * cyclesPerPx;
        
        const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
        for (const step of steps) {
            if (step >= minCycles) return step;
        }
        return 10000;
    }
    
    renderEmpty() {
        const t = this._theme();
        const ctx = this.ctx;
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, this.width, this.height);
        this.updateScrollbars();
        this.updateMinimap();
    }

    _theme() {
        const s = getComputedStyle(document.body);
        return {
            bg:       s.getPropertyValue('--canvas-bg').trim() || '#1E1E1E',
            label:    s.getPropertyValue('--canvas-label').trim() || '#252526',
            ruler:    s.getPropertyValue('--ruler-bg').trim() || '#2D2D2D',
            grid:     s.getPropertyValue('--grid-line').trim() || '#2A2A2A',
            fg:       s.getPropertyValue('--fg').trim() || '#D4D4D4',
            fgDim:    s.getPropertyValue('--fg-dim').trim() || '#858585',
            isDark:   !document.body.classList.contains('light'),
        };
    }
}
