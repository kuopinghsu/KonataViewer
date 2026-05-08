// =====================================================================
// PARSER
// =====================================================================

function parseKonataFile(text, progressCallback = null) {
    return new Promise((resolve, reject) => {
        const lines = text.split('\n');
        const insns = new Map();
        const active = new Map();
        const deps = [];
        
        let cur = 0;
        let start = 0;
        let insnList = [];
        const totalLines = lines.length;
        let processedLines = 0;
        const chunkSize = 10000; // Increased from 1000 for better performance
        const updateInterval = Math.max(1, Math.floor(totalLines / 50)); // Update every 2% instead of 1%
        
        const processChunk = (startIdx) => {
            const endIdx = Math.min(startIdx + chunkSize, totalLines);
            
            for (let i = startIdx; i < endIdx; i++) {
                const line = lines[i];
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                
                const parts = trimmed.split('\t');
                const cmd = parts[0];
                
                try {
                    if (cmd === 'C=') {
                        // C= sets absolute cycle
                        const newCur = parseInt(parts[1]);
                        cur = newCur;
                        if (start === 0) start = cur;
                    }
                    else if (cmd === 'C') {
                        // C adds delta to cycle
                        const delta = parseInt(parts[1]);
                        cur += delta;
                        if (start === 0) start = cur;
                    }
                    else if (cmd === 'I') {
                        const idf = parseInt(parts[1]);
                        const tid = parseInt(parts[2]);
                        const cyc = parseInt(parts[3]);
                        insns.set(idf, new Instruction(idf, tid, cyc, cyc));
                    }
                    else if (cmd === 'L') {
                        const idf = parseInt(parts[1]);
                        const lane = parseInt(parts[2]);
                        const lbl = parts.slice(3).join('\t');
                        const ins = insns.get(idf);
                        if (ins) ins.labels.push(lbl);
                    }
                    else if (cmd === 'S') {
                        const idf = parseInt(parts[1]);
                        const lane = parseInt(parts[2]);
                        const sname = parts[3];
                        const key = `${idf}:${lane}:${sname}`;
                        active.set(key, { name: sname, start: cur, lane });
                    }
                    else if (cmd === 'E') {
                        const idf = parseInt(parts[1]);
                        const lane = parseInt(parts[2]);
                        const sname = parts[3];
                        const key = `${idf}:${lane}:${sname}`;
                        const stg = active.get(key);
                        if (stg) {
                            const ins = insns.get(idf);
                            if (ins) {
                                ins.stages.push(new StageInterval(lane, sname, stg.start, cur));
                            }
                            active.delete(key);
                        }
                    }
                    else if (cmd === 'R') {
                        const idf = parseInt(parts[1]);
                        const rtype = parseInt(parts[2]);
                        const ins = insns.get(idf);
                        if (ins) {
                            ins.retireCycle = cur;
                            ins.retireType = rtype;
                        }
                        // Close all open stages for this instruction
                        const toClose = [];
                        for (const [key, stg] of active.entries()) {
                            if (key.startsWith(`${idf}:`)) {
                                toClose.push(key);
                            }
                        }
                        for (const key of toClose) {
                            const stg = active.get(key);
                            const ins = insns.get(idf);
                            if (ins) {
                                ins.stages.push(new StageInterval(stg.lane, stg.name, stg.start, cur));
                            }
                            active.delete(key);
                        }
                    }
                    else if (cmd === 'W') {
                        const prod = parseInt(parts[1]);
                        const cons = parseInt(parts[2]);
                        const type = parseInt(parts[3]);
                        deps.push(new Dependency(prod, cons, type));
                    }
                } catch (e) {
                    // Skip malformed lines
                }
            }
            
            processedLines = endIdx;
            if (progressCallback && (processedLines % updateInterval < chunkSize || endIdx >= totalLines)) {
                const progress = Math.min(95, Math.floor((processedLines / totalLines) * 95));
                progressCallback(progress, `Parsing: ${processedLines.toLocaleString()} / ${totalLines.toLocaleString()} lines`);
            }
            
            if (endIdx < totalLines) {
                // Process next chunk asynchronously (only every 10 chunks to reduce overhead)
                if ((endIdx / chunkSize) % 5 === 0) {
                    setTimeout(() => processChunk(endIdx), 0);
                } else {
                    processChunk(endIdx);
                }
            } else {
                // Parsing complete, finalize
                if (progressCallback) progressCallback(95, 'Finalizing...');
                
                // Close any remaining open stages
                for (const [key, stg] of active.entries()) {
                    const idf = parseInt(key.split(':')[0]);
                    const ins = insns.get(idf);
                    if (ins) {
                        ins.stages.push(new StageInterval(stg.lane, stg.name, stg.start, cur));
                    }
                }
                
                // Convert to array and sort
                insnList = Array.from(insns.values()).sort((a, b) => a.idInFile - b.idInFile);
                
                // Compute actual cycle range from stages
                let minCycle = Infinity;
                let maxCycle = -Infinity;
                let maxLane = 0;
                for (const ins of insnList) {
                    for (const stg of ins.stages) {
                        minCycle = Math.min(minCycle, stg.startCycle);
                        maxCycle = Math.max(maxCycle, stg.endCycle);
                        maxLane = Math.max(maxLane, stg.laneId);
                    }
                }
                
                // Fallback if no stages found
                if (minCycle === Infinity) minCycle = start || 0;
                if (maxCycle === -Infinity) maxCycle = cur || 0;
                
                if (progressCallback) progressCallback(100, 'Complete');
                
                const trace = new KonataTrace(minCycle, maxCycle, insnList, deps, maxLane);
                resolve(trace);
            }
        };
        
        // Start processing
        setTimeout(() => processChunk(0), 0);
    });
}
