"use strict";
const ZS = {
    nogo: { fill: 'rgba(255,23,68,.18)', stroke: '#ff1744', label: 'No-Go' },
    clean: { fill: 'rgba(57,255,20,.14)', stroke: '#39ff14', label: 'Clean Zone' },
    sched: { fill: 'rgba(255,214,0,.14)', stroke: '#ffd600', label: 'Scheduled' },
    custom: { fill: 'rgba(255,107,53,.14)', stroke: '#ff6b35', label: 'Custom' },
};
const PHASES = [
    'Initializing LiDAR...',
    'Detecting exterior walls...',
    'Mapping interior walls...',
    'Identifying rooms & corridors...',
    'Locating obstacles...',
    'Calibrating position...',
    'Floor plan complete!',
];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DEMO_OBJS = ['Person', 'Chair', 'Desk', 'Door', 'Bin', 'Cart'];
let canvas;
let ctx;
let area;
let mapW = 0;
let mapH = 0;
let tool = 'select';
let zones = [];
let schedules = [];
let selectedZone = null;
let drawingZone = null;
let isDrawing = false;
let dragStart = null;
let mapScanned = false;
let roomPolygon = [];
let rooms = [];
let botPos = { x: 300, y: 300 };
let botTrail = [];
let selectedPathMode = 'zigzag';
let pathPreview = [];
let pendingZoneType = 'nogo';
let camOpen = false;
let camExpanded = false;
let camSource = 'webcam';
let mediaStream = null;
let mjpegTimer = null;
let fpsTimer = null;
let visionTimer = null;
let fpsFrames = 0;
let fpsLast = Date.now();
let demoDetections = [];
let drag2 = false;
let dx0 = 0;
let dy0 = 0;
let px0 = 0;
let py0 = 0;
let ws = null;
function init() {
    canvas = document.getElementById('mapCanvas');
    ctx = canvas.getContext('2d');
    area = document.getElementById('mapArea');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 50);
    initCameraDrag();
    loadSavedMap();
    selectPath('zigzag');
    connectWS();
    if (!mapScanned)
        setTimeout(startScan, 600);
    setInterval(() => { if (mapScanned)
        redraw(); }, 100);
}
function resizeCanvas() {
    mapW = area.clientWidth;
    mapH = area.clientHeight;
    canvas.width = mapW;
    canvas.height = mapH;
    redraw();
}
function mpos(e) {
    const r = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - r.left, y: clientY - r.top };
}
function inp(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}
function startScan() {
    const ov = document.getElementById('scanOverlay');
    ov.style.display = 'flex';
    const dot = document.getElementById('scanDot');
    dot.className = 'scan-dot scanning';
    document.getElementById('scanText').textContent = 'SCANNING';
    mapScanned = false;
    roomPolygon = [];
    rooms = [];
    pathPreview = [];
    let prog = 0;
    let ph = 0;
    const iv = setInterval(() => {
        prog += Math.random() * 3.5 + 0.8;
        if (prog > 100)
            prog = 100;
        const barFill = document.getElementById('scanBarFill');
        const scanPct = document.getElementById('scanPct');
        barFill.style.width = prog + '%';
        scanPct.textContent = Math.round(prog) + '%';
        const pi = Math.floor((prog / 100) * (PHASES.length - 1));
        if (pi !== ph) {
            ph = pi;
            document.getElementById('scanPhase').textContent = PHASES[pi];
        }
        if (prog >= 100) {
            clearInterval(iv);
            completeScan();
        }
    }, 130);
}
function completeScan() {
    const px = mapW * 0.08;
    const py = mapH * 0.1;
    const pw = mapW * 0.84;
    const ph = mapH * 0.8;
    roomPolygon = [
        { x: px, y: py },
        { x: px + pw, y: py },
        { x: px + pw, y: py + ph },
        { x: px, y: py + ph },
    ];
    const c1 = px + pw * 0.33;
    const c2 = px + pw * 0.66;
    const r1 = py + ph * 0.45;
    const r2 = py + ph * 0.63;
    rooms = [
        { label: 'Room A', x: px, y: py, w: pw * 0.33, h: ph * 0.45, type: 'room' },
        { label: 'Room B', x: c1, y: py, w: pw * 0.33, h: ph * 0.45, type: 'room' },
        { label: 'Room C', x: c2, y: py, w: pw * 0.34, h: ph * 0.45, type: 'room' },
        { label: 'Hallway', x: px, y: r1, w: pw, h: ph * 0.18, type: 'hall' },
        { label: 'Cafeteria', x: px, y: r2, w: pw * 0.5, h: ph * 0.37, type: 'room' },
        { label: 'Office', x: px + pw * 0.5, y: r2, w: pw * 0.25, h: ph * 0.37, type: 'room' },
        { label: 'Storage', x: px + pw * 0.75, y: r2, w: pw * 0.25, h: ph * 0.37, type: 'room' },
    ];
    zones = [
        { id: 101, name: 'Detected: Furniture', type: 'nogo', rect: { x: px + pw * 0.05, y: py + ph * 0.08, w: pw * 0.1, h: ph * 0.2 } },
        { id: 102, name: 'Detected: Equipment', type: 'nogo', rect: { x: c1 + pw * 0.05, y: py + ph * 0.06, w: pw * 0.08, h: ph * 0.15 } },
        { id: 103, name: 'Hallway Clean Zone', type: 'clean', rect: { x: px + pw * 0.01, y: r1 + ph * 0.01, w: pw * 0.98, h: ph * 0.16 } },
    ];
    botPos = { x: px + pw * 0.5, y: r1 + ph * 0.09 };
    mapScanned = true;
    setTimeout(() => {
        document.getElementById('scanOverlay').style.display = 'none';
        const dot = document.getElementById('scanDot');
        dot.className = 'scan-dot done';
        document.getElementById('scanText').textContent = 'MAP READY';
        document.getElementById('mapHint').textContent = 'Select a zone tool and drag to draw';
        renderZoneList();
        redraw();
    }, 500);
}
function rescan() {
    zones = zones.filter(z => !z.name.startsWith('Detected:'));
    roomPolygon = [];
    rooms = [];
    pathPreview = [];
    startScan();
}
function setTool(t) {
    tool = t;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tool-' + t);
    if (btn)
        btn.classList.add('active');
    const hints = {
        select: 'Click a zone to select',
        pan: 'Drag to pan',
        nogo: 'Drag to draw a No-Go zone',
        clean: 'Drag to draw a Clean zone',
        sched: 'Drag to draw a Scheduled zone',
        custom: 'Drag to draw a Custom zone',
    };
    document.getElementById('mapHint').textContent = hints[t] || '';
    canvas.style.cursor = t === 'select' ? 'default' : 'crosshair';
    if (['nogo', 'clean', 'sched', 'custom'].includes(t)) {
        showTab('zones');
    }
}
function showTab(n) {
    ['zones', 'schedule', 'paths'].forEach(t => {
        const el = document.getElementById('tab-' + t);
        if (el)
            el.style.display = t === n ? 'block' : 'none';
    });
    document.querySelectorAll('.sidebar-tab').forEach((tab, i) => {
        const tabNames = ['zones', 'schedule', 'paths'];
        tab.classList.toggle('active', tabNames[i] === n);
    });
    if (n === 'schedule')
        renderSchedules();
}
function pickType(t, el) {
    pendingZoneType = t;
    document.querySelectorAll('.type-opt').forEach(o => o.className = 'type-opt');
    el.className = 'type-opt sel-' + t;
}
function setTypeUI(t) {
    pendingZoneType = t;
    const ts = ['nogo', 'clean', 'sched', 'custom'];
    document.querySelectorAll('.type-opt').forEach((o, i) => {
        o.className = 'type-opt' + (ts[i] === t ? ' sel-' + t : '');
    });
}
function confirmZone() {
    if (!drawingZone)
        return;
    const nameInput = document.getElementById('zoneName');
    const n = nameInput.value.trim() || ZS[pendingZoneType].label + ' ' + (zones.length + 1);
    zones.push({
        id: Date.now(),
        name: n,
        type: pendingZoneType,
        rect: { ...drawingZone },
    });
    drawingZone = null;
    document.getElementById('zoneEditor').style.display = 'none';
    renderZoneList();
    redraw();
}
function cancelZone() {
    drawingZone = null;
    document.getElementById('zoneEditor').style.display = 'none';
    redraw();
}
function deleteZone(id) {
    zones = zones.filter(z => z.id !== id);
    if (selectedZone === id)
        selectedZone = null;
    renderZoneList();
    redraw();
}
function undoLast() {
    const i = [...zones].reverse().findIndex(z => !z.name.startsWith('Detected:'));
    if (i >= 0) {
        zones.splice(zones.length - 1 - i, 1);
        renderZoneList();
        redraw();
    }
}
function clearAllZones() {
    if (!confirm('Clear all zones?'))
        return;
    zones = [];
    selectedZone = null;
    renderZoneList();
    redraw();
}
function renderZoneList() {
    const el = document.getElementById('zoneList');
    if (!zones.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">🏢</div>No zones yet.</div>';
        return;
    }
    el.innerHTML = zones.map(z => {
        const s = ZS[z.type];
        return `<div class="zone-item${selectedZone === z.id ? ' selected' : ''}" onclick="selZ(${z.id})">
      <div class="zone-swatch" style="background:${s.stroke}"></div>
      <div style="flex:1">
        <div class="zone-name">${z.name}</div>
        <div class="zone-type">${s.label}</div>
      </div>
      <button class="zone-delete" onclick="event.stopPropagation();deleteZone(${z.id})">✕</button>
    </div>`;
    }).join('');
}
function selZ(id) {
    selectedZone = id;
    renderZoneList();
    redraw();
}
function addSchedule() {
    schedules.push({
        id: Date.now(),
        name: 'Schedule ' + (schedules.length + 1),
        enabled: true,
        days: [0, 0, 0, 0, 0, 0, 0],
        time: '08:00',
        interval: 0,
        zoneId: null,
    });
    renderSchedules();
}
function renderSchedules() {
    const el = document.getElementById('schedList');
    if (!schedules.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">⏰</div>No schedules.</div>';
        return;
    }
    el.innerHTML = schedules.map(s => {
        const nextRun = nxRun(s);
        return `<div class="sched-item">
      <div class="sched-header">
        <input style="background:transparent;border:none;color:var(--text);font-family:var(--font);font-size:.82rem;font-weight:700;outline:none;width:130px;" value="${s.name}" onchange="updS(${s.id},'name',this.value)"/>
        <button class="sched-toggle ${s.enabled ? 'on' : ''}" onclick="togS(${s.id})"></button>
      </div>
      <div class="days-row">${DAYS.map((d, i) => `<button class="day-btn${s.days[i] ? ' active' : ''}" onclick="togD(${s.id},${i})">${d}</button>`).join('')}</div>
      <div class="time-row"><span style="font-size:.7rem;color:var(--muted);font-family:var(--mono)">TIME</span><input type="time" class="time-input" value="${s.time}" onchange="updS(${s.id},'time',this.value)"/></div>
      <div class="interval-row"><span>Repeat every</span><input type="number" class="interval-input" value="${s.interval}" min="0" max="48" onchange="updS(${s.id},'interval',this.value)"/><span>hrs</span></div>
      <div style="margin-top:8px"><span style="font-size:.68rem;color:var(--muted);font-family:var(--mono)">ZONE</span><select class="zone-select" style="margin-top:4px" onchange="updS(${s.id},'zoneId',this.value)"><option value="">— Entire floor —</option>${zones.filter(z => z.type !== 'nogo').map(z => `<option value="${z.id}"${s.zoneId == z.id ? ' selected' : ''}>${z.name}</option>`).join('')}</select></div>
      ${s.enabled && s.days.some(d => d) ? `<div style="margin-top:8px"><span class="next-run">▶ Next: ${nextRun}</span></div>` : ''}
      <button class="btn-danger" style="margin-top:8px;padding:6px" onclick="delS(${s.id})">Delete</button>
    </div>`;
    }).join('');
}
function togS(id) {
    const s = schedules.find(x => x.id === id);
    if (s) {
        s.enabled = !s.enabled;
        renderSchedules();
    }
}
function togD(id, i) {
    const s = schedules.find(x => x.id === id);
    if (s) {
        s.days[i] = s.days[i] ? 0 : 1;
        renderSchedules();
    }
}
function updS(id, k, v) {
    const s = schedules.find(x => x.id === id);
    if (s) {
        s[k] = k === 'interval' ? parseInt(v) || 0 : v;
        renderSchedules();
    }
}
function delS(id) {
    schedules = schedules.filter(s => s.id !== id);
    renderSchedules();
}
function nxRun(s) {
    const now = new Date();
    const [h, m] = s.time.split(':').map(Number);
    const dn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
        const d = (now.getDay() + i) % 7;
        const idx = d === 0 ? 6 : d - 1;
        if (s.days[idx]) {
            const r = new Date(now);
            r.setDate(now.getDate() + i);
            r.setHours(h, m, 0, 0);
            if (r > now)
                return `${dn[d]} ${s.time}`;
        }
    }
    return 'Not scheduled';
}
function selectPath(p) {
    selectedPathMode = p;
    document.querySelectorAll('[id^=path-]').forEach(e => e.classList.remove('selected'));
    const el = document.getElementById('path-' + p);
    if (el)
        el.classList.add('selected');
}
function getBounds() {
    if (!roomPolygon.length)
        return { minX: 50, maxX: mapW - 50, minY: 50, maxY: mapH - 50 };
    return {
        minX: Math.min(...roomPolygon.map(p => p.x)),
        maxX: Math.max(...roomPolygon.map(p => p.x)),
        minY: Math.min(...roomPolygon.map(p => p.y)),
        maxY: Math.max(...roomPolygon.map(p => p.y)),
    };
}
function previewPath() {
    pathPreview = [];
    const b = getBounds();
    const s = 28;
    if (selectedPathMode === 'zigzag') {
        let row = 0;
        for (let y = b.minY + s; y < b.maxY - s; y += s, row++) {
            pathPreview.push({ x: row % 2 === 0 ? b.minX + s : b.maxX - s, y });
            pathPreview.push({ x: row % 2 === 0 ? b.maxX - s : b.minX + s, y });
        }
    }
    else if (selectedPathMode === 'spiral') {
        let x0 = b.minX + s;
        let x1 = b.maxX - s;
        let y0 = b.minY + s;
        let y1 = b.maxY - s;
        while (x0 < x1 && y0 < y1) {
            for (let x = x0; x <= x1; x += s)
                pathPreview.push({ x, y: y0 });
            for (let y = y0 + s; y <= y1; y += s)
                pathPreview.push({ x: x1, y });
            for (let x = x1 - s; x >= x0; x -= s)
                pathPreview.push({ x, y: y1 });
            for (let y = y1 - s; y > y0; y -= s)
                pathPreview.push({ x: x0, y });
            x0 += s;
            x1 -= s;
            y0 += s;
            y1 -= s;
        }
    }
    else if (selectedPathMode === 'edge') {
        for (let x = b.minX + s; x <= b.maxX - s; x += s)
            pathPreview.push({ x, y: b.minY + s });
        for (let y = b.minY + s; y <= b.maxY - s; y += s)
            pathPreview.push({ x: b.maxX - s, y });
        for (let x = b.maxX - s; x >= b.minX + s; x -= s)
            pathPreview.push({ x, y: b.maxY - s });
        for (let y = b.maxY - s; y >= b.minY + s; y -= s)
            pathPreview.push({ x: b.minX + s, y });
        for (let y = b.minY + s * 2; y < b.maxY - s * 2; y += s) {
            pathPreview.push({ x: b.minX + s * 2, y });
            pathPreview.push({ x: b.maxX - s * 2, y });
        }
    }
    else {
        let x = (b.minX + b.maxX) / 2;
        let y = (b.minY + b.maxY) / 2;
        for (let i = 0; i < 50; i++) {
            x += (Math.random() - 0.5) * 100;
            y += (Math.random() - 0.5) * 100;
            x = Math.max(b.minX + s, Math.min(b.maxX - s, x));
            y = Math.max(b.minY + s, Math.min(b.maxY - s, y));
            pathPreview.push({ x, y });
        }
    }
    redraw();
}
function clearPath() {
    pathPreview = [];
    redraw();
}
function redraw() {
    ctx.clearRect(0, 0, mapW, mapH);
    ctx.fillStyle = '#080c10';
    ctx.fillRect(0, 0, mapW, mapH);
    ctx.strokeStyle = 'rgba(30,45,61,.5)';
    ctx.lineWidth = 1;
    for (let x = 0; x < mapW; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapH);
        ctx.stroke();
    }
    for (let y = 0; y < mapH; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(mapW, y);
        ctx.stroke();
    }
    if (!mapScanned) {
        ctx.fillStyle = 'rgba(74,98,120,.15)';
        ctx.font = "14px 'DM Mono',monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Press "Scan Floor" to generate building map', mapW / 2, mapH / 2);
        return;
    }
    const rp = roomPolygon;
    ctx.beginPath();
    ctx.rect(rp[0].x, rp[0].y, rp[1].x - rp[0].x, rp[2].y - rp[1].y);
    ctx.fillStyle = 'rgba(13,20,28,.97)';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(30,45,61,.18)';
    ctx.lineWidth = 0.5;
    const tx = rp[0].x;
    const ty = rp[0].y;
    const tw = rp[1].x - tx;
    const th = rp[2].y - ty;
    for (let x = tx; x <= tx + tw; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, ty);
        ctx.lineTo(x, ty + th);
        ctx.stroke();
    }
    for (let y = ty; y <= ty + th; y += 60) {
        ctx.beginPath();
        ctx.moveTo(tx, y);
        ctx.lineTo(tx + tw, y);
        ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,229,255,.55)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.strokeRect(rp[0].x, rp[0].y, rp[1].x - rp[0].x, rp[2].y - rp[1].y);
    ctx.strokeStyle = 'rgba(0,229,255,.1)';
    ctx.lineWidth = 8;
    ctx.strokeRect(rp[0].x, rp[0].y, rp[1].x - rp[0].x, rp[2].y - rp[1].y);
    rp.forEach(p => {
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    rooms.forEach(r => {
        const hall = r.type === 'hall';
        ctx.strokeStyle = hall ? 'rgba(0,229,255,.18)' : 'rgba(0,229,255,.3)';
        ctx.lineWidth = hall ? 1 : 1.5;
        ctx.setLineDash([]);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = hall ? 'rgba(0,229,255,.2)' : 'rgba(0,229,255,.3)';
        ctx.font = `${hall ? '600 9px' : 'bold 10px'} 'DM Mono',monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.label.toUpperCase(), r.x + r.w / 2, r.y + r.h / 2);
    });
    if (pathPreview.length > 1) {
        ctx.strokeStyle = 'rgba(0,229,255,.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(pathPreview[0].x, pathPreview[0].y);
        pathPreview.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.setLineDash([]);
        pathPreview.forEach((p, i) => {
            if (i % 4 === 0) {
                ctx.fillStyle = 'rgba(0,229,255,.35)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
    zones.forEach(z => {
        const s = ZS[z.type];
        const r = z.rect;
        const sel = z.id === selectedZone;
        ctx.fillStyle = s.fill;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 5);
        ctx.fill();
        ctx.strokeStyle = s.stroke;
        ctx.lineWidth = sel ? 2.5 : 1.5;
        ctx.setLineDash(z.type === 'nogo' ? [6, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);
        if (sel) {
            ctx.strokeStyle = s.stroke;
            ctx.lineWidth = 8;
            ctx.globalAlpha = 0.12;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        ctx.fillStyle = s.stroke;
        ctx.font = "bold 10px 'DM Mono',monospace";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const ic = z.type === 'nogo' ? '🚫' : z.type === 'clean' ? '✅' : z.type === 'sched' ? '⏰' : '📍';
        ctx.fillText(`${ic} ${z.name}`, r.x + 6, r.y + 5);
    });
    if (isDrawing && drawingZone && drawingZone.w > 0) {
        const s = ZS[pendingZoneType] || ZS.nogo;
        ctx.fillStyle = s.fill;
        ctx.beginPath();
        ctx.roundRect(drawingZone.x, drawingZone.y, drawingZone.w, drawingZone.h, 5);
        ctx.fill();
        ctx.strokeStyle = s.stroke;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    const { x, y } = botPos;
    if (botTrail.length > 1) {
        ctx.strokeStyle = 'rgba(0,229,255,.18)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(botTrail[0].x, botTrail[0].y);
        botTrail.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,229,255,.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    const g = ctx.createRadialGradient(x, y, 0, x, y, 22);
    g.addColorStop(0, 'rgba(0,229,255,.2)');
    g.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🫧', x, y);
}
function saveMap() {
    try {
        localStorage.setItem('omniscrub_map', JSON.stringify({ zones, roomPolygon, rooms }));
        showToast('Map saved ✓');
    }
    catch (e) { }
    fetch('/api/map/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones, roomPolygon }),
    }).catch(() => { });
}
function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:7px 16px;background:rgba(0,229,255,.12);border:1px solid var(--accent);border-radius:20px;color:var(--accent);font-family:var(--mono);font-size:.75rem;z-index:10000;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2400);
}
function loadSavedMap() {
    try {
        const saved = localStorage.getItem('omniscrub_map');
        if (saved) {
            const d = JSON.parse(saved);
            zones = d.zones || [];
            roomPolygon = d.roomPolygon || [];
            rooms = d.rooms || [];
            if (roomPolygon.length) {
                mapScanned = true;
                botPos = { x: mapW / 2, y: mapH / 2 };
            }
            renderZoneList();
        }
    }
    catch (e) { }
}
function connectWS() {
    try {
        ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
        ws.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.event === 'sensor_update' && msg.data?.position) {
                    const p = msg.data.position;
                    botTrail.push({ ...botPos });
                    if (botTrail.length > 500)
                        botTrail = botTrail.slice(-500);
                    botPos = { x: p.x * (mapW / 100), y: p.y * (mapH / 100) };
                    redraw();
                }
                if (msg.event === 'vision_detections' && Array.isArray(msg.data?.detections)) {
                    demoDetections = msg.data.detections.map((d) => ({
                        label: d.label || 'Object',
                        conf: Math.round((d.confidence || 0) * 100),
                        x: d.x || 10,
                        y: d.y || 10,
                        w: d.w || 80,
                        h: d.h || 60,
                    }));
                }
                if (msg.event === 'arduino_connected') {
                    const data = msg.data;
                    updateArduinoStatus(true, data.ip);
                }
                if (msg.event === 'arduino_error') {
                    const data = msg.data;
                    updateArduinoStatus(false);
                    showToast('Arduino: ' + data.error);
                }
                if (msg.event === 'arduino_data' && msg.data?.distance !== undefined) {
                    const data = msg.data;
                    document.getElementById('mapHint').textContent = `Distance: ${data.distance}cm | Mode: ${data.mode || 'auto'}`;
                }
            }
            catch (err) { }
        };
        ws.onclose = () => setTimeout(connectWS, 3000);
    }
    catch (e) { }
}
function sendWS(event, data) {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event, data }));
    }
}
canvas.addEventListener('mousedown', (e) => {
    const p = mpos(e);
    if (tool === 'select') {
        const h = zones.find(z => inp(p, z.rect));
        if (h) {
            selectedZone = h.id;
            renderZoneList();
            redraw();
        }
        return;
    }
    if (['nogo', 'clean', 'sched', 'custom'].includes(tool)) {
        isDrawing = true;
        dragStart = p;
        pendingZoneType = tool;
        drawingZone = { x: p.x, y: p.y, w: 0, h: 0 };
    }
});
canvas.addEventListener('mousemove', (e) => {
    const p = mpos(e);
    document.getElementById('mapCoords').textContent = `X: ${Math.round(p.x)}  Y: ${Math.round(p.y)}`;
    if (isDrawing && dragStart) {
        drawingZone = {
            x: Math.min(p.x, dragStart.x),
            y: Math.min(p.y, dragStart.y),
            w: Math.abs(p.x - dragStart.x),
            h: Math.abs(p.y - dragStart.y),
        };
        redraw();
    }
});
canvas.addEventListener('mouseup', () => {
    if (isDrawing && drawingZone && drawingZone.w > 10 && drawingZone.h > 10) {
        isDrawing = false;
        document.getElementById('zoneEditor').style.display = 'block';
        document.getElementById('zoneName').value = '';
        document.getElementById('zoneName').focus();
        setTypeUI(pendingZoneType);
    }
    else {
        isDrawing = false;
        drawingZone = null;
    }
});
canvas.addEventListener('mouseleave', () => {
    if (isDrawing) {
        isDrawing = false;
        drawingZone = null;
        redraw();
    }
});
const camPanel = document.getElementById('camPanel');
const camHandle = document.getElementById('camHandle');
const camVideo = document.getElementById('camVideo');
const camImg = document.getElementById('camImg');
const camOvCanvas = document.getElementById('camOverlayCanvas');
const camNoFeed = document.getElementById('camNoFeed');
function initCameraDrag() {
    camHandle.addEventListener('mousedown', (e) => {
        drag2 = true;
        dx0 = e.clientX;
        dy0 = e.clientY;
        const r = camPanel.getBoundingClientRect();
        const ar = area.getBoundingClientRect();
        px0 = r.left - ar.left;
        py0 = r.top - ar.top;
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!drag2)
            return;
        const ar = area.getBoundingClientRect();
        let nx = px0 + (e.clientX - dx0);
        let ny = py0 + (e.clientY - dy0);
        nx = Math.max(0, Math.min(ar.width - camPanel.offsetWidth, nx));
        ny = Math.max(0, Math.min(ar.height - camPanel.offsetHeight, ny));
        camPanel.style.left = nx + 'px';
        camPanel.style.top = ny + 'px';
        camPanel.style.right = 'auto';
        camPanel.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => { drag2 = false; });
}
function toggleCam() {
    camOpen = !camOpen;
    camPanel.classList.toggle('open', camOpen);
    document.getElementById('btnCamera').classList.toggle('cam-open', camOpen);
    if (camOpen && camSource === 'webcam')
        startWebcam();
    if (!camOpen)
        stopAllFeeds();
}
function toggleCamExpand() {
    camExpanded = !camExpanded;
    camPanel.classList.toggle('expanded', camExpanded);
    document.getElementById('camExpandBtn').textContent = camExpanded ? '⤡' : '⤢';
    syncOv();
}
function setSource(src) {
    stopAllFeeds();
    camSource = src;
    ['webcam', 'arduino', 'mjpeg'].forEach(s => {
        document.getElementById('src-' + s).classList.toggle('active', s === src);
    });
    const bar = document.getElementById('camConnBar');
    bar.classList.toggle('show', src !== 'webcam');
    if (src === 'arduino')
        document.getElementById('camUrl').placeholder = 'http://192.168.x.x/cam';
    if (src === 'mjpeg')
        document.getElementById('camUrl').placeholder = 'http://host/stream.mjpg';
    document.getElementById('camSrcLbl').textContent = src === 'webcam' ? 'Webcam' : src === 'arduino' ? 'Arduino' : 'MJPEG';
    if (src === 'webcam' && camOpen)
        startWebcam();
}
async function startWebcam() {
    stopAllFeeds();
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' },
            audio: false,
        });
        camVideo.srcObject = mediaStream;
        camVideo.style.display = 'block';
        camImg.style.display = 'none';
        camNoFeed.style.display = 'none';
        const camBadge = document.getElementById('camBadge');
        const camBadgeTxt = document.getElementById('camBadgeText');
        camBadge.classList.add('live');
        camBadgeTxt.textContent = 'LIVE';
        camVideo.onloadedmetadata = () => {
            document.getElementById('camRes').textContent = camVideo.videoWidth + 'x' + camVideo.videoHeight;
            document.getElementById('camSrcLbl').textContent = 'Webcam';
            syncOv();
            startFps();
            startVision();
        };
    }
    catch (err) {
        showCamErr('Camera access denied.\n' + err.message);
    }
}
function connectExternal() {
    const url = document.getElementById('camUrl').value.trim();
    if (!url) {
        showCamErr('Enter a URL first.');
        return;
    }
    stopAllFeeds();
    const btn = document.getElementById('camConnBtn');
    btn.textContent = 'Connecting…';
    btn.disabled = true;
    camVideo.style.display = 'none';
    camNoFeed.style.display = 'none';
    camImg.style.display = 'block';
    camImg.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
    camImg.onload = () => {
        btn.textContent = 'Connected';
        btn.classList.add('connected');
        btn.disabled = false;
        const camBadge = document.getElementById('camBadge');
        const camBadgeTxt = document.getElementById('camBadgeText');
        camBadge.classList.add('live');
        camBadgeTxt.textContent = 'LIVE';
        document.getElementById('camRes').textContent = (camImg.naturalWidth || '?') + 'x' + (camImg.naturalHeight || '?');
        document.getElementById('camSrcLbl').textContent = camSource === 'arduino' ? 'Arduino' : 'MJPEG';
        syncOv();
        startFps();
        startVision();
        mjpegTimer = setInterval(() => {
            if (camImg.style.display === 'block') {
                camImg.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
            }
        }, 100);
    };
    camImg.onerror = () => {
        btn.textContent = 'Connect';
        btn.classList.remove('connected');
        btn.disabled = false;
        camImg.style.display = 'none';
        camNoFeed.style.display = 'flex';
        showCamErr('Cannot connect to:\n' + url + '\n\nCheck:\n• Arduino is powered & on WiFi\n• URL is correct\n• Stream is running\n\nArduino Uno Q: stream is usually http://[ip]/cam or /stream');
    };
}
function stopAllFeeds() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
    }
    camVideo.srcObject = null;
    camVideo.style.display = 'none';
    camImg.src = '';
    camImg.style.display = 'none';
    camImg.onload = null;
    camImg.onerror = null;
    camNoFeed.style.display = 'flex';
    if (mjpegTimer)
        clearInterval(mjpegTimer);
    if (fpsTimer)
        clearInterval(fpsTimer);
    if (visionTimer)
        clearInterval(visionTimer);
    const camBadge = document.getElementById('camBadge');
    const camBadgeTxt = document.getElementById('camBadgeText');
    camBadge.classList.remove('live');
    camBadgeTxt.textContent = 'OFF';
    document.getElementById('camRes').textContent = '—';
    document.getElementById('camFps').textContent = '—';
    document.getElementById('camVision').innerHTML = '<span>Vision:</span><span class="vtag vtag-clear">CLEAR</span>';
    const btn = document.getElementById('camConnBtn');
    btn.textContent = 'Connect';
    btn.classList.remove('connected');
    btn.disabled = false;
    demoDetections = [];
    const oc = camOvCanvas.getContext('2d');
    oc.clearRect(0, 0, camOvCanvas.width, camOvCanvas.height);
}
function syncOv() {
    const vp = document.getElementById('camViewport');
    camOvCanvas.width = vp.offsetWidth;
    camOvCanvas.height = vp.offsetHeight;
}
function startFps() {
    if (fpsTimer)
        clearInterval(fpsTimer);
    fpsFrames = 0;
    fpsLast = Date.now();
    let af = true;
    (function tick() {
        if (!af)
            return;
        fpsFrames++;
        requestAnimationFrame(tick);
    })();
    fpsTimer = setInterval(() => {
        const now = Date.now();
        document.getElementById('camFps').textContent = String(Math.round(fpsFrames / ((now - fpsLast) / 1000)));
        fpsFrames = 0;
        fpsLast = now;
        drawVisionOv();
    }, 1000);
}
function drawVisionOv() {
    const c = camOvCanvas.getContext('2d');
    c.clearRect(0, 0, camOvCanvas.width, camOvCanvas.height);
    if (Math.random() < 0.25) {
        demoDetections = [];
        const n = Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
            demoDetections.push({
                label: DEMO_OBJS[Math.floor(Math.random() * DEMO_OBJS.length)],
                conf: Math.round(58 + Math.random() * 37),
                x: 10 + Math.random() * (camOvCanvas.width - 100),
                y: 10 + Math.random() * (camOvCanvas.height - 80),
                w: 55 + Math.random() * 90,
                h: 45 + Math.random() * 80,
            });
        }
    }
    demoDetections.forEach(d => {
        const col = d.label === 'Person' ? '#ff1744' : '#00e5ff';
        c.strokeStyle = col;
        c.lineWidth = 1.5;
        c.strokeRect(d.x, d.y, d.w, d.h);
        const cl = 9;
        [
            [d.x, d.y, 1, 1],
            [d.x + d.w, d.y, -1, 1],
            [d.x, d.y + d.h, 1, -1],
            [d.x + d.w, d.y + d.h, -1, -1],
        ].forEach(([cx, cy, sx, sy]) => {
            c.beginPath();
            c.moveTo(cx, cy);
            c.lineTo(cx + sx * cl, cy);
            c.stroke();
            c.beginPath();
            c.moveTo(cx, cy);
            c.lineTo(cx, cy + sy * cl);
            c.stroke();
        });
        c.fillStyle = col + 'cc';
        c.fillRect(d.x, d.y - 18, d.label.length * 7 + 32, 18);
        c.fillStyle = '#fff';
        c.font = "bold 10px 'DM Mono',monospace";
        c.textBaseline = 'top';
        c.fillText(`${d.label} ${d.conf}%`, d.x + 4, d.y - 16);
    });
}
function startVision() {
    if (visionTimer)
        clearInterval(visionTimer);
    visionTimer = setInterval(() => {
        const el = document.getElementById('camVision');
        if (!demoDetections.length) {
            el.innerHTML = '<span>Vision:</span><span class="vtag vtag-clear">CLEAR</span>';
            return;
        }
        el.innerHTML = '<span>Vision:</span>' + demoDetections.map(d => `<span class="vtag ${d.label === 'Person' ? 'vtag-obs' : 'vtag-obj'}">${d.label.toUpperCase()}</span>`).join('');
    }, 1200);
}
function takeSnapshot() {
    const vp = document.getElementById('camViewport');
    const s = document.createElement('canvas');
    s.width = vp.offsetWidth;
    s.height = vp.offsetHeight;
    const sc = s.getContext('2d');
    if (camVideo.style.display !== 'none' && camVideo.readyState >= 2) {
        sc.drawImage(camVideo, 0, 0, s.width, s.height);
    }
    else if (camImg.style.display !== 'none') {
        sc.drawImage(camImg, 0, 0, s.width, s.height);
    }
    sc.drawImage(camOvCanvas, 0, 0);
    const flash = document.createElement('div');
    flash.className = 'snap-flash';
    vp.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
    try {
        const a = document.createElement('a');
        a.download = 'omniscrub-' + Date.now() + '.png';
        a.href = s.toDataURL();
        a.click();
        showToast('Snapshot saved 📸');
    }
    catch (e) {
        showToast('Snapshot ready');
    }
}
function showCamErr(msg) {
    camNoFeed.style.display = 'flex';
    camNoFeed.innerHTML = `<div class="cam-nofeed-icon">⚠️</div>
    <div style="color:var(--red);font-size:.68rem;line-height:1.5">${msg.replace(/\n/g, '<br>')}</div>
    <button onclick="camNoFeed.innerHTML='<div class=cam-nofeed-icon>📷</div><div>No camera feed</div>'" style="margin-top:8px;padding:3px 10px;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:var(--mono);font-size:.65rem;cursor:pointer">Dismiss</button>`;
}
function connectArduino() {
    const ip = document.getElementById('arduinoIp').value.trim();
    if (!ip) {
        showToast('Enter Arduino IP address');
        return;
    }
    const btn = document.getElementById('btnArduinoConn');
    btn.textContent = 'Connecting...';
    btn.disabled = true;
    fetch('/api/arduino/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port: 23 }),
    }).then(() => {
        showToast(`Connecting to ${ip}...`);
    }).catch(() => {
        btn.textContent = '🔌 Connect';
        btn.disabled = false;
        showToast('Connection failed');
    });
}
function updateArduinoStatus(connected, ip) {
    const btn = document.getElementById('btnArduinoConn');
    const status = document.getElementById('arduinoStatus');
    const dot = document.getElementById('scanDot');
    btn.textContent = '🔌 Connect';
    btn.disabled = false;
    if (connected) {
        status.textContent = `Online (${ip})`;
        status.style.color = '#39ff14';
        dot.className = 'scan-dot done';
        showToast('Arduino connected!');
    }
    else {
        status.textContent = 'Offline';
        status.style.color = '#4a6278';
        dot.className = 'scan-dot';
    }
}
window.setTool = setTool;
window.undoLast = undoLast;
window.clearAllZones = clearAllZones;
window.saveMap = saveMap;
window.startScan = startScan;
window.rescan = rescan;
window.toggleCam = toggleCam;
window.toggleCamExpand = toggleCamExpand;
window.setSource = setSource;
window.connectExternal = connectExternal;
window.takeSnapshot = takeSnapshot;
window.showTab = showTab;
window.pickType = pickType;
window.confirmZone = confirmZone;
window.cancelZone = cancelZone;
window.deleteZone = deleteZone;
window.selZ = selZ;
window.addSchedule = addSchedule;
window.renderSchedules = renderSchedules;
window.togS = togS;
window.togD = togD;
window.updS = updS;
window.delS = delS;
window.selectPath = selectPath;
window.previewPath = previewPath;
window.clearPath = clearPath;
window.connectArduino = connectArduino;
document.addEventListener('DOMContentLoaded', init);
//# sourceMappingURL=app.js.map