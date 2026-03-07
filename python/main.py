<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>🫧 OmniScrub — Map & Zones</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
<style>
:root{--bg:#080c10;--surface:#0d1318;--panel:#111820;--border:#1e2d3d;--accent:#00e5ff;--accent2:#ff6b35;--green:#39ff14;--yellow:#ffd600;--red:#ff1744;--text:#e0eaf4;--muted:#4a6278;--font:'Syne',sans-serif;--mono:'DM Mono',monospace;}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--text);font-family:var(--font);height:100vh;overflow:hidden;display:flex;flex-direction:column;}
body::before{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,229,255,0.012) 2px,rgba(0,229,255,0.012) 4px);pointer-events:none;z-index:9999;}
.toolbar{display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap;}
.toolbar-group{display:flex;align-items:center;gap:6px;}
.toolbar-sep{width:1px;height:28px;background:var(--border);margin:0 4px;}
.tool-btn{padding:6px 12px;border-radius:7px;border:1px solid var(--border);background:var(--panel);color:var(--muted);font-family:var(--mono);font-size:0.72rem;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:6px;white-space:nowrap;}
.tool-btn:hover{border-color:var(--accent);color:var(--accent);}
.tool-btn.active{background:rgba(0,229,255,.1);border-color:var(--accent);color:var(--accent);}
.tool-btn.nogo{border-color:var(--red);color:var(--red);}
.tool-btn.nogo.active{background:rgba(255,23,68,.12);}
.tool-btn.clean{border-color:var(--green);color:var(--green);}
.tool-btn.clean.active{background:rgba(57,255,20,.1);}
.tool-btn.sched{border-color:var(--yellow);color:var(--yellow);}
.tool-btn.sched.active{background:rgba(255,214,0,.1);}
.tool-btn.custom{border-color:var(--accent2);color:var(--accent2);}
.tool-btn.custom.active{background:rgba(255,107,53,.1);}
.tool-btn.cam-open{border-color:var(--red)!important;color:var(--red)!important;background:rgba(255,23,68,.1)!important;}
.tool-label{font-size:.68rem;letter-spacing:.1em;color:var(--muted);font-family:var(--mono);text-transform:uppercase;}
.scan-status{display:flex;align-items:center;gap:8px;padding:5px 12px;border-radius:20px;border:1px solid var(--border);font-family:var(--mono);font-size:.72rem;margin-left:auto;}
.scan-dot{width:7px;height:7px;border-radius:50%;background:var(--muted);}
.scan-dot.scanning{background:var(--yellow);box-shadow:0 0 8px var(--yellow);animation:blink .8s infinite;}
.scan-dot.done{background:var(--green);box-shadow:0 0 8px var(--green);}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.main-area{display:grid;grid-template-columns:1fr 300px;flex:1;overflow:hidden;}
.map-area{position:relative;overflow:hidden;background:var(--bg);}
#mapCanvas{position:absolute;top:0;left:0;cursor:crosshair;}
.map-hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);padding:6px 14px;background:rgba(0,0,0,.7);border:1px solid var(--border);border-radius:20px;font-family:var(--mono);font-size:.7rem;color:var(--muted);pointer-events:none;backdrop-filter:blur(4px);white-space:nowrap;}
.map-coords{position:absolute;top:12px;left:12px;font-family:var(--mono);font-size:.68rem;color:var(--muted);background:rgba(0,0,0,.5);padding:4px 8px;border-radius:5px;}
#scanOverlay{position:absolute;inset:0;background:rgba(8,12,16,.92);display:none;flex-direction:column;align-items:center;justify-content:center;gap:20px;z-index:10;}
.scan-ring{width:80px;height:80px;border-radius:50%;border:2px solid var(--border);border-top-color:var(--accent);animation:spin 1.2s linear infinite;position:relative;}
.scan-ring::after{content:'🫧';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:24px;animation:spin 1.2s linear infinite reverse;}
@keyframes spin{to{transform:rotate(360deg)}}
.scan-title{font-size:1.1rem;font-weight:700;letter-spacing:.1em;}
.scan-subtitle{font-family:var(--mono);font-size:.75rem;color:var(--muted);}
.scan-bar-wrap{width:220px;}
.scan-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden;}
.scan-bar-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:2px;transition:width .3s;width:0%;}
.scan-pct{font-family:var(--mono);font-size:.8rem;color:var(--accent);text-align:center;margin-top:6px;}

/* ─── CAMERA PANEL ─── */
#camPanel{position:absolute;bottom:50px;right:16px;width:270px;background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;z-index:50;display:none;box-shadow:0 6px 36px rgba(0,0,0,.75),0 0 0 1px rgba(0,229,255,.07);transition:width .2s;}
#camPanel.open{display:block;}
#camPanel.expanded{width:410px;}
.cam-header{display:flex;align-items:center;justify-content:space-between;padding:7px 11px;background:var(--panel);border-bottom:1px solid var(--border);cursor:move;user-select:none;}
.cam-title-row{display:flex;align-items:center;gap:7px;}
.cam-badge{display:flex;align-items:center;gap:4px;padding:2px 7px;border-radius:10px;background:rgba(255,23,68,.12);border:1px solid rgba(255,23,68,.3);font-family:var(--mono);font-size:.6rem;color:var(--red);}
.cam-badge.live{background:rgba(57,255,20,.1);border-color:rgba(57,255,20,.3);color:var(--green);}
.cam-badge-dot{width:5px;height:5px;border-radius:50%;background:var(--red);}
.cam-badge.live .cam-badge-dot{background:var(--green);box-shadow:0 0 5px var(--green);animation:blink 1s infinite;}
.cam-title-text{font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;}
.cam-hdr-btns{display:flex;gap:4px;}
.cam-hdr-btn{width:22px;height:22px;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;font-size:.68rem;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.cam-hdr-btn:hover{border-color:var(--accent);color:var(--accent);}
.cam-src-bar{display:flex;gap:4px;padding:6px 10px;background:var(--bg);border-bottom:1px solid var(--border);}
.cam-src-btn{flex:1;padding:4px 0;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:var(--mono);font-size:.62rem;cursor:pointer;transition:all .15s;text-align:center;}
.cam-src-btn.active{border-color:var(--accent);color:var(--accent);background:rgba(0,229,255,.08);}
.cam-src-btn:hover{border-color:var(--accent);color:var(--accent);}
.cam-conn-bar{display:none;align-items:center;gap:6px;padding:6px 10px;background:var(--bg);border-bottom:1px solid var(--border);}
.cam-conn-bar.show{display:flex;}
.cam-url-input{flex:1;padding:4px 7px;background:var(--surface);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:var(--mono);font-size:.68rem;outline:none;}
.cam-url-input:focus{border-color:var(--accent);}
.cam-conn-btn{padding:4px 10px;border-radius:5px;border:1px solid var(--accent);background:rgba(0,229,255,.07);color:var(--accent);font-family:var(--mono);font-size:.64rem;cursor:pointer;transition:all .15s;white-space:nowrap;}
.cam-conn-btn:hover{background:rgba(0,229,255,.15);}
.cam-conn-btn.connected{border-color:var(--green);color:var(--green);background:rgba(57,255,20,.08);}
.cam-viewport{position:relative;width:100%;aspect-ratio:4/3;background:#000;overflow:hidden;}
.cam-viewport video,.cam-viewport img.mjpeg-img{width:100%;height:100%;object-fit:cover;display:none;}
.cam-viewport::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.09) 2px,rgba(0,0,0,.09) 4px);pointer-events:none;z-index:3;}
#camOverlayCanvas{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;}
.cam-nofeed{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;color:var(--muted);font-family:var(--mono);font-size:.72rem;text-align:center;padding:14px;background:#040608;}
.cam-nofeed-icon{font-size:2.2rem;opacity:.3;}
.cam-nofeed-hint{font-size:.62rem;opacity:.6;line-height:1.65;margin-top:2px;}
.cam-footer{display:flex;align-items:center;justify-content:space-between;padding:7px 11px;background:var(--panel);border-top:1px solid var(--border);}
.cam-stats{display:flex;gap:10px;}
.cam-stat{font-family:var(--mono);font-size:.62rem;color:var(--muted);}
.cam-stat span{color:var(--accent);}
.cam-snap{padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:var(--mono);font-size:.65rem;cursor:pointer;transition:all .15s;}
.cam-snap:hover{border-color:var(--accent);color:var(--accent);}
.cam-vision{min-height:26px;padding:5px 11px;background:var(--bg);border-top:1px solid var(--border);display:flex;align-items:center;flex-wrap:wrap;gap:4px;font-family:var(--mono);font-size:.62rem;color:var(--muted);}
.vtag{padding:2px 6px;border-radius:3px;border:1px solid;font-size:.6rem;}
.vtag-clear{border-color:var(--green);color:var(--green);background:rgba(57,255,20,.07);}
.vtag-obs{border-color:var(--red);color:var(--red);background:rgba(255,23,68,.07);}
.vtag-obj{border-color:var(--yellow);color:var(--yellow);background:rgba(255,214,0,.07);}
@keyframes snapFlash{0%{opacity:.7}100%{opacity:0}}
.snap-flash{position:absolute;inset:0;background:#fff;pointer-events:none;z-index:10;animation:snapFlash .25s ease forwards;}

/* ─── SIDEBAR ─── */
.sidebar{background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;}
.sidebar-tabs{display:flex;border-bottom:1px solid var(--border);}
.sidebar-tab{flex:1;padding:10px;text-align:center;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);cursor:pointer;transition:all .2s;border-bottom:2px solid transparent;}
.sidebar-tab:hover{color:var(--text);}
.sidebar-tab.active{color:var(--accent);border-bottom-color:var(--accent);}
.sidebar-content{flex:1;overflow-y:auto;padding:14px;}
.sidebar-section{margin-bottom:18px;}
.section-label{font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border);}
.zone-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);margin-bottom:6px;background:var(--panel);cursor:pointer;transition:all .2s;}
.zone-item:hover{border-color:var(--accent);}
.zone-item.selected{border-color:var(--accent);background:rgba(0,229,255,.06);}
.zone-swatch{width:12px;height:12px;border-radius:3px;flex-shrink:0;}
.zone-name{font-size:.8rem;font-weight:600;flex:1;}
.zone-type{font-family:var(--mono);font-size:.65rem;color:var(--muted);}
.zone-delete{width:20px;height:20px;border-radius:4px;border:none;background:transparent;color:var(--muted);cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.zone-delete:hover{color:var(--red);background:rgba(255,23,68,.1);}
.empty-state{text-align:center;padding:30px 10px;color:var(--muted);font-size:.8rem;font-family:var(--mono);}
.empty-icon{font-size:2rem;margin-bottom:8px;opacity:.4;}
.zone-editor{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px;}
.field-label{font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px;}
.field-input{width:100%;padding:7px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--mono);font-size:.82rem;outline:none;margin-bottom:10px;}
.field-input:focus{border-color:var(--accent);}
.type-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;}
.type-opt{padding:7px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--muted);font-size:.72rem;font-family:var(--mono);cursor:pointer;text-align:center;transition:all .15s;}
.type-opt.sel-nogo{border-color:var(--red);color:var(--red);background:rgba(255,23,68,.1);}
.type-opt.sel-clean{border-color:var(--green);color:var(--green);background:rgba(57,255,20,.08);}
.type-opt.sel-sched{border-color:var(--yellow);color:var(--yellow);background:rgba(255,214,0,.08);}
.type-opt.sel-custom{border-color:var(--accent2);color:var(--accent2);background:rgba(255,107,53,.08);}
.sched-item{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;}
.sched-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.sched-toggle{width:36px;height:20px;border-radius:10px;background:var(--border);border:none;cursor:pointer;position:relative;transition:background .2s;}
.sched-toggle.on{background:var(--green);}
.sched-toggle::after{content:'';position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .2s;}
.sched-toggle.on::after{left:19px;}
.days-row{display:flex;gap:4px;margin-bottom:8px;}
.day-btn{width:28px;height:28px;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--muted);font-size:.65rem;font-weight:700;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;}
.day-btn.active{background:rgba(0,229,255,.15);border-color:var(--accent);color:var(--accent);}
.time-row{display:flex;gap:8px;align-items:center;margin-bottom:6px;}
.time-input{flex:1;padding:5px 8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--mono);font-size:.8rem;outline:none;}
.time-input:focus{border-color:var(--accent);}
.interval-row{display:flex;align-items:center;gap:8px;font-size:.75rem;color:var(--muted);}
.interval-input{width:50px;padding:4px 6px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:var(--mono);font-size:.78rem;text-align:center;outline:none;}
.zone-select{flex:1;padding:5px 8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--mono);font-size:.75rem;outline:none;}
.btn-add{width:100%;padding:9px;border-radius:8px;border:1px dashed var(--border);background:transparent;color:var(--muted);font-family:var(--mono);font-size:.75rem;cursor:pointer;transition:all .2s;margin-top:4px;}
.btn-add:hover{border-color:var(--accent);color:var(--accent);}
.btn-primary{width:100%;padding:9px;border-radius:8px;border:none;background:var(--accent);color:#000;font-family:var(--font);font-size:.82rem;font-weight:700;cursor:pointer;transition:all .2s;margin-top:6px;}
.btn-primary:hover{opacity:.85;}
.btn-danger{width:100%;padding:9px;border-radius:8px;border:1px solid var(--red);background:transparent;color:var(--red);font-family:var(--mono);font-size:.75rem;cursor:pointer;transition:all .2s;margin-top:6px;}
.btn-danger:hover{background:rgba(255,23,68,.1);}
.next-run{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:4px;background:rgba(0,229,255,.08);border:1px solid rgba(0,229,255,.2);font-family:var(--mono);font-size:.65rem;color:var(--accent);}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
select option{background:var(--panel);}
</style>
</head>
<body>

<div class="toolbar">
  <div class="toolbar-group">
    <span class="tool-label">Tool:</span>
    <button class="tool-btn active" id="tool-select" onclick="setTool('select')">↖ Select</button>
    <button class="tool-btn" id="tool-pan" onclick="setTool('pan')">✋ Pan</button>
  </div>
  <div class="toolbar-sep"></div>
  <div class="toolbar-group">
    <span class="tool-label">Draw Zone:</span>
    <button class="tool-btn nogo" id="tool-nogo" onclick="setTool('nogo')">🚫 No-Go</button>
    <button class="tool-btn clean" id="tool-clean" onclick="setTool('clean')">✅ Clean</button>
    <button class="tool-btn sched" id="tool-sched" onclick="setTool('sched')">⏰ Schedule</button>
    <button class="tool-btn custom" id="tool-custom" onclick="setTool('custom')">📍 Custom</button>
  </div>
  <div class="toolbar-sep"></div>
  <div class="toolbar-group">
    <button class="tool-btn" onclick="undoLast()">↩ Undo</button>
    <button class="tool-btn" onclick="clearAllZones()">⊘ Clear</button>
    <button class="tool-btn" onclick="saveMap()">💾 Save</button>
  </div>
  <div class="toolbar-sep"></div>
  <div class="toolbar-group">
    <button class="tool-btn" onclick="startScan()">📷 Scan Floor</button>
    <button class="tool-btn" onclick="rescan()">↻ Rescan</button>
  </div>
  <div class="toolbar-sep"></div>
  <div class="toolbar-group">
    <button class="tool-btn" id="btnCamera" onclick="toggleCam()">📹 Live Camera</button>
  </div>
  <div class="scan-status">
    <div class="scan-dot done" id="scanDot"></div>
    <span id="scanText" style="font-family:var(--mono)">MAP READY</span>
  </div>
</div>

<div class="main-area">
  <div class="map-area" id="mapArea">
    <canvas id="mapCanvas"></canvas>
    <div class="map-coords" id="mapCoords">X: 0  Y: 0</div>
    <div class="map-hint" id="mapHint">Press "Scan Floor" to begin</div>

    <div id="scanOverlay">
      <div class="scan-ring"></div>
      <div class="scan-title">SCANNING FLOOR</div>
      <div class="scan-subtitle" id="scanPhase">Initializing sensors...</div>
      <div class="scan-bar-wrap">
        <div class="scan-bar"><div class="scan-bar-fill" id="scanBarFill"></div></div>
        <div class="scan-pct" id="scanPct">0%</div>
      </div>
    </div>

    <!-- CAMERA PANEL -->
    <div id="camPanel">
      <div class="cam-header" id="camHandle">
        <div class="cam-title-row">
          <span class="cam-title-text">📹 LIVE FEED</span>
          <div class="cam-badge" id="camBadge">
            <div class="cam-badge-dot"></div>
            <span id="camBadgeText">OFF</span>
          </div>
        </div>
        <div class="cam-hdr-btns">
          <button class="cam-hdr-btn" id="camExpandBtn" onclick="toggleCamExpand()" title="Expand">⤢</button>
          <button class="cam-hdr-btn" onclick="toggleCam()" title="Close">✕</button>
        </div>
      </div>
      <div class="cam-src-bar">
        <button class="cam-src-btn active" id="src-webcam" onclick="setSource('webcam')">💻 Webcam</button>
        <button class="cam-src-btn" id="src-arduino" onclick="setSource('arduino')">🔌 Arduino</button>
        <button class="cam-src-btn" id="src-mjpeg" onclick="setSource('mjpeg')">🌐 MJPEG</button>
      </div>
      <div class="cam-conn-bar" id="camConnBar">
        <input class="cam-url-input" id="camUrl" type="text" value="http://192.168.1.100/cam" placeholder="http://arduino-ip/cam"/>
        <button class="cam-conn-btn" id="camConnBtn" onclick="connectExternal()">Connect</button>
      </div>
      <div class="cam-viewport" id="camViewport">
        <video id="camVideo" autoplay muted playsinline></video>
        <img id="camImg" class="mjpeg-img" alt=""/>
        <canvas id="camOverlayCanvas"></canvas>
        <div class="cam-nofeed" id="camNoFeed">
          <div class="cam-nofeed-icon">📷</div>
          <div>No camera feed active</div>
          <div class="cam-nofeed-hint">
            <b>Webcam:</b> select Webcam tab, feed starts automatically<br/>
            <b>Arduino Uno Q:</b> enter stream URL and click Connect<br/>
            Supports ESP32-CAM &amp; OV7670 MJPEG streams
          </div>
        </div>
      </div>
      <div class="cam-footer">
        <div class="cam-stats">
          <div class="cam-stat">RES <span id="camRes">—</span></div>
          <div class="cam-stat">FPS <span id="camFps">—</span></div>
          <div class="cam-stat">SRC <span id="camSrcLbl">—</span></div>
        </div>
        <button class="cam-snap" onclick="takeSnapshot()">📸 Snap</button>
      </div>
      <div class="cam-vision" id="camVision">
        <span>Vision:</span><span class="vtag vtag-clear">CLEAR</span>
      </div>
    </div>
  </div>

  <div class="sidebar">
    <div class="sidebar-tabs">
      <div class="sidebar-tab active" onclick="showTab('zones')">Zones</div>
      <div class="sidebar-tab" onclick="showTab('schedule')">Schedule</div>
      <div class="sidebar-tab" onclick="showTab('paths')">Paths</div>
    </div>
    <div class="sidebar-content" id="tab-zones">
      <div class="zone-editor" id="zoneEditor" style="display:none;">
        <div class="field-label">Zone Name</div>
        <input type="text" class="field-input" id="zoneName" placeholder="e.g. Hallway, Server Room..."/>
        <div class="field-label">Zone Type</div>
        <div class="type-grid">
          <div class="type-opt sel-nogo" onclick="pickType('nogo',this)">🚫 No-Go</div>
          <div class="type-opt" onclick="pickType('clean',this)">✅ Clean</div>
          <div class="type-opt" onclick="pickType('sched',this)">⏰ Schedule</div>
          <div class="type-opt" onclick="pickType('custom',this)">📍 Custom</div>
        </div>
        <button class="btn-primary" onclick="confirmZone()">✓ Add Zone</button>
        <button class="btn-danger" onclick="cancelZone()">Cancel</button>
      </div>
      <div class="sidebar-section">
        <div class="section-label">Active Zones</div>
        <div id="zoneList"><div class="empty-state"><div class="empty-icon">🏢</div>No zones yet.<br/>Scan the floor or draw manually.</div></div>
        <button class="btn-add" onclick="setTool('nogo')">+ Add Zone</button>
      </div>
    </div>
    <div class="sidebar-content" id="tab-schedule" style="display:none;">
      <div class="sidebar-section">
        <div class="section-label">Cleaning Schedules</div>
        <div id="schedList"><div class="empty-state"><div class="empty-icon">⏰</div>No schedules.<br/>Add one below.</div></div>
        <button class="btn-add" onclick="addSchedule()">+ New Schedule</button>
      </div>
    </div>
    <div class="sidebar-content" id="tab-paths" style="display:none;">
      <div class="sidebar-section">
        <div class="section-label">Path Strategy</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div class="zone-item" id="path-zigzag" onclick="selectPath('zigzag')"><div style="font-size:1.2rem">↔</div><div><div class="zone-name">Zig-Zag</div><div class="zone-type">Row-by-row coverage</div></div></div>
          <div class="zone-item" id="path-spiral" onclick="selectPath('spiral')"><div style="font-size:1.2rem">🌀</div><div><div class="zone-name">Spiral Inward</div><div class="zone-type">Outside-in circular</div></div></div>
          <div class="zone-item" id="path-edge" onclick="selectPath('edge')"><div style="font-size:1.2rem">⬜</div><div><div class="zone-name">Edge First</div><div class="zone-type">Perimeter then fill</div></div></div>
          <div class="zone-item" id="path-random" onclick="selectPath('random')"><div style="font-size:1.2rem">⚡</div><div><div class="zone-name">Random Bounce</div><div class="zone-type">Obstacle-reactive</div></div></div>
        </div>
      </div>
      <div class="sidebar-section">
        <div class="section-label">Preview</div>
        <button class="btn-primary" onclick="previewPath()">▶ Preview on Map</button>
        <button class="btn-add" style="margin-top:6px" onclick="clearPath()">Clear Preview</button>
      </div>
    </div>
  </div>
</div>

<script>
// ═══ MAP STATE ═══
const canvas=document.getElementById('mapCanvas'),ctx=canvas.getContext('2d'),area=document.getElementById('mapArea');
let tool='select',zones=[],schedules=[],selectedZone=null,drawingZone=null,isDrawing=false,dragStart=null;
let mapScanned=false,roomPolygon=[],rooms=[],botPos={x:300,y:300},botTrail=[];
let selectedPathMode='zigzag',pathPreview=[],pendingZoneType='nogo',mapW,mapH;
const ZS={nogo:{fill:'rgba(255,23,68,.18)',stroke:'#ff1744',label:'No-Go'},clean:{fill:'rgba(57,255,20,.14)',stroke:'#39ff14',label:'Clean Zone'},sched:{fill:'rgba(255,214,0,.14)',stroke:'#ffd600',label:'Scheduled'},custom:{fill:'rgba(255,107,53,.14)',stroke:'#ff6b35',label:'Custom'}};

function resizeCanvas(){mapW=area.clientWidth;mapH=area.clientHeight;canvas.width=mapW;canvas.height=mapH;redraw();}
window.addEventListener('resize',resizeCanvas);setTimeout(resizeCanvas,50);

// ═══ SCAN — building floor plan ═══
const PHASES=['Initializing LiDAR...','Detecting exterior walls...','Mapping interior walls...','Identifying rooms & corridors...','Locating obstacles...','Calibrating position...','Floor plan complete!'];
function startScan(){
  const ov=document.getElementById('scanOverlay');ov.style.display='flex';
  document.getElementById('scanDot').className='scan-dot scanning';
  document.getElementById('scanText').textContent='SCANNING';
  mapScanned=false;roomPolygon=[];rooms=[];pathPreview=[];
  let prog=0,ph=0;
  const iv=setInterval(()=>{
    prog+=Math.random()*3.5+0.8;if(prog>100)prog=100;
    document.getElementById('scanBarFill').style.width=prog+'%';
    document.getElementById('scanPct').textContent=Math.round(prog)+'%';
    const pi=Math.floor((prog/100)*(PHASES.length-1));
    if(pi!==ph){ph=pi;document.getElementById('scanPhase').textContent=PHASES[pi];}
    if(prog>=100){clearInterval(iv);completeScan();}
  },130);
}
function completeScan(){
  const px=mapW*.08,py=mapH*.10,pw=mapW*.84,ph=mapH*.80;
  roomPolygon=[{x:px,y:py},{x:px+pw,y:py},{x:px+pw,y:py+ph},{x:px,y:py+ph}];
  const c1=px+pw*.33,c2=px+pw*.66,r1=py+ph*.45,r2=py+ph*.63;
  rooms=[
    {label:'Room A',    x:px,    y:py,   w:pw*.33, h:ph*.45, type:'room'},
    {label:'Room B',    x:c1,    y:py,   w:pw*.33, h:ph*.45, type:'room'},
    {label:'Room C',    x:c2,    y:py,   w:pw*.34, h:ph*.45, type:'room'},
    {label:'Hallway',   x:px,    y:r1,   w:pw,     h:ph*.18, type:'hall'},
    {label:'Cafeteria', x:px,    y:r2,   w:pw*.50, h:ph*.37, type:'room'},
    {label:'Office',    x:px+pw*.50,y:r2,w:pw*.25, h:ph*.37, type:'room'},
    {label:'Storage',   x:px+pw*.75,y:r2,w:pw*.25, h:ph*.37, type:'room'},
  ];
  zones=[
    {id:101,name:'Detected: Furniture',type:'nogo',rect:{x:px+pw*.05,y:py+ph*.08,w:pw*.10,h:ph*.20}},
    {id:102,name:'Detected: Equipment',type:'nogo',rect:{x:c1+pw*.05,y:py+ph*.06,w:pw*.08,h:ph*.15}},
    {id:103,name:'Hallway Clean Zone', type:'clean',rect:{x:px+pw*.01,y:r1+ph*.01,w:pw*.98,h:ph*.16}},
  ];
  botPos={x:px+pw*.5,y:r1+ph*.09};mapScanned=true;
  setTimeout(()=>{
    document.getElementById('scanOverlay').style.display='none';
    document.getElementById('scanDot').className='scan-dot done';
    document.getElementById('scanText').textContent='MAP READY';
    document.getElementById('mapHint').textContent='Select a zone tool and drag to draw';
    renderZoneList();redraw();
  },500);
}
function rescan(){zones=zones.filter(z=>!z.name.startsWith('Detected:'));roomPolygon=[];rooms=[];pathPreview=[];startScan();}

// ═══ CANVAS INTERACTION ═══
function mpos(e){const r=canvas.getBoundingClientRect();return{x:(e.touches?e.touches[0].clientX:e.clientX)-r.left,y:(e.touches?e.touches[0].clientY:e.clientY)-r.top};}
canvas.addEventListener('mousedown',e=>{
  const p=mpos(e);
  if(tool==='select'){const h=zones.find(z=>inp(p,z.rect));if(h){selectedZone=h.id;renderZoneList();redraw();}return;}
  if(['nogo','clean','sched','custom'].includes(tool)){isDrawing=true;dragStart=p;pendingZoneType=tool;drawingZone={x:p.x,y:p.y,w:0,h:0};}
});
canvas.addEventListener('mousemove',e=>{
  const p=mpos(e);
  document.getElementById('mapCoords').textContent=`X: ${Math.round(p.x)}  Y: ${Math.round(p.y)}`;
  if(isDrawing&&dragStart){drawingZone={x:Math.min(p.x,dragStart.x),y:Math.min(p.y,dragStart.y),w:Math.abs(p.x-dragStart.x),h:Math.abs(p.y-dragStart.y)};redraw();}
});
canvas.addEventListener('mouseup',()=>{
  if(isDrawing&&drawingZone&&drawingZone.w>10&&drawingZone.h>10){isDrawing=false;document.getElementById('zoneEditor').style.display='block';document.getElementById('zoneName').value='';document.getElementById('zoneName').focus();setTypeUI(pendingZoneType);}
  else{isDrawing=false;drawingZone=null;}
});
canvas.addEventListener('mouseleave',()=>{if(isDrawing){isDrawing=false;drawingZone=null;redraw();}});
function inp(p,r){return p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;}

// ═══ ZONES ═══
function pickType(t,el){pendingZoneType=t;document.querySelectorAll('.type-opt').forEach(o=>o.className='type-opt');el.className='type-opt sel-'+t;}
function setTypeUI(t){pendingZoneType=t;const ts=['nogo','clean','sched','custom'];document.querySelectorAll('.type-opt').forEach((o,i)=>{o.className='type-opt'+(ts[i]===t?' sel-'+t:'');});}
function confirmZone(){if(!drawingZone)return;const n=document.getElementById('zoneName').value.trim()||ZS[pendingZoneType].label+' '+(zones.length+1);zones.push({id:Date.now(),name:n,type:pendingZoneType,rect:{...drawingZone}});drawingZone=null;document.getElementById('zoneEditor').style.display='none';renderZoneList();redraw();}
function cancelZone(){drawingZone=null;document.getElementById('zoneEditor').style.display='none';redraw();}
function deleteZone(id){zones=zones.filter(z=>z.id!==id);if(selectedZone===id)selectedZone=null;renderZoneList();redraw();}
function undoLast(){const i=[...zones].reverse().findIndex(z=>!z.name.startsWith('Detected:'));if(i>=0){zones.splice(zones.length-1-i,1);renderZoneList();redraw();}}
function clearAllZones(){if(!confirm('Clear all zones?'))return;zones=[];selectedZone=null;renderZoneList();redraw();}
function renderZoneList(){
  const el=document.getElementById('zoneList');
  if(!zones.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">🏢</div>No zones yet.</div>';return;}
  el.innerHTML=zones.map(z=>{const s=ZS[z.type];return`<div class="zone-item${selectedZone===z.id?' selected':''}" onclick="selZ(${z.id})"><div class="zone-swatch" style="background:${s.stroke}"></div><div style="flex:1"><div class="zone-name">${z.name}</div><div class="zone-type">${s.label}</div></div><button class="zone-delete" onclick="event.stopPropagation();deleteZone(${z.id})">✕</button></div>`;}).join('');
}
function selZ(id){selectedZone=id;renderZoneList();redraw();}

// ═══ SCHEDULES ═══
const DAYS=['M','T','W','T','F','S','S'];
function addSchedule(){schedules.push({id:Date.now(),name:'Schedule '+(schedules.length+1),enabled:true,days:[0,0,0,0,0,0,0],time:'08:00',interval:0,zoneId:null});renderSchedules();}
function renderSchedules(){
  const el=document.getElementById('schedList');
  if(!schedules.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">⏰</div>No schedules.</div>';return;}
  el.innerHTML=schedules.map(s=>`<div class="sched-item"><div class="sched-header"><input style="background:transparent;border:none;color:var(--text);font-family:var(--font);font-size:.82rem;font-weight:700;outline:none;width:130px;" value="${s.name}" onchange="updS(${s.id},'name',this.value)"/><button class="sched-toggle ${s.enabled?'on':''}" onclick="togS(${s.id})"></button></div><div class="days-row">${DAYS.map((d,i)=>`<button class="day-btn${s.days[i]?' active':''}" onclick="togD(${s.id},${i})">${d}</button>`).join('')}</div><div class="time-row"><span style="font-size:.7rem;color:var(--muted);font-family:var(--mono)">TIME</span><input type="time" class="time-input" value="${s.time}" onchange="updS(${s.id},'time',this.value)"/></div><div class="interval-row"><span>Repeat every</span><input type="number" class="interval-input" value="${s.interval}" min="0" max="48" onchange="updS(${s.id},'interval',this.value)"/><span>hrs</span></div><div style="margin-top:8px"><span style="font-size:.68rem;color:var(--muted);font-family:var(--mono)">ZONE</span><select class="zone-select" style="margin-top:4px" onchange="updS(${s.id},'zoneId',this.value)"><option value="">— Entire floor —</option>${zones.filter(z=>z.type!=='nogo').map(z=>`<option value="${z.id}"${s.zoneId==z.id?' selected':''}>${z.name}</option>`).join('')}</select></div>${s.enabled&&s.days.some(d=>d)?`<div style="margin-top:8px"><span class="next-run">▶ Next: ${nxRun(s)}</span></div>`:''}<button class="btn-danger" style="margin-top:8px;padding:6px" onclick="delS(${s.id})">Delete</button></div>`).join('');
}
function togS(id){const s=schedules.find(x=>x.id===id);if(s){s.enabled=!s.enabled;renderSchedules();}}
function togD(id,i){const s=schedules.find(x=>x.id===id);if(s){s.days[i]=s.days[i]?0:1;renderSchedules();}}
function updS(id,k,v){const s=schedules.find(x=>x.id===id);if(s){s[k]=k==='interval'?parseInt(v)||0:v;renderSchedules();}}
function delS(id){schedules=schedules.filter(s=>s.id!==id);renderSchedules();}
function nxRun(s){const now=new Date();const[h,m]=s.time.split(':').map(Number);const dn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];for(let i=0;i<7;i++){const d=(now.getDay()+i)%7;const idx=d===0?6:d-1;if(s.days[idx]){const r=new Date(now);r.setDate(now.getDate()+i);r.setHours(h,m,0,0);if(r>now)return`${dn[d]} ${s.time}`;}}return'Not scheduled';}

// ═══ PATH PREVIEW ═══
function selectPath(p){selectedPathMode=p;document.querySelectorAll('[id^=path-]').forEach(e=>e.classList.remove('selected'));document.getElementById('path-'+p).classList.add('selected');}
function getBounds(){if(!roomPolygon.length)return{minX:50,maxX:mapW-50,minY:50,maxY:mapH-50};return{minX:Math.min(...roomPolygon.map(p=>p.x)),maxX:Math.max(...roomPolygon.map(p=>p.x)),minY:Math.min(...roomPolygon.map(p=>p.y)),maxY:Math.max(...roomPolygon.map(p=>p.y))};}
function previewPath(){
  pathPreview=[];const b=getBounds(),s=28;
  if(selectedPathMode==='zigzag'){let row=0;for(let y=b.minY+s;y<b.maxY-s;y+=s,row++){pathPreview.push({x:row%2===0?b.minX+s:b.maxX-s,y});pathPreview.push({x:row%2===0?b.maxX-s:b.minX+s,y});}}
  else if(selectedPathMode==='spiral'){let x0=b.minX+s,x1=b.maxX-s,y0=b.minY+s,y1=b.maxY-s;while(x0<x1&&y0<y1){for(let x=x0;x<=x1;x+=s)pathPreview.push({x,y:y0});for(let y=y0+s;y<=y1;y+=s)pathPreview.push({x:x1,y});for(let x=x1-s;x>=x0;x-=s)pathPreview.push({x,y:y1});for(let y=y1-s;y>y0;y-=s)pathPreview.push({x:x0,y});x0+=s;x1-=s;y0+=s;y1-=s;}}
  else if(selectedPathMode==='edge'){for(let x=b.minX+s;x<=b.maxX-s;x+=s)pathPreview.push({x,y:b.minY+s});for(let y=b.minY+s;y<=b.maxY-s;y+=s)pathPreview.push({x:b.maxX-s,y});for(let x=b.maxX-s;x>=b.minX+s;x-=s)pathPreview.push({x,y:b.maxY-s});for(let y=b.maxY-s;y>=b.minY+s;y-=s)pathPreview.push({x:b.minX+s,y});for(let y=b.minY+s*2;y<b.maxY-s*2;y+=s){pathPreview.push({x:b.minX+s*2,y});pathPreview.push({x:b.maxX-s*2,y});}}
  else{let x=(b.minX+b.maxX)/2,y=(b.minY+b.maxY)/2;for(let i=0;i<50;i++){x+=((Math.random()-.5)*100);y+=((Math.random()-.5)*100);x=Math.max(b.minX+s,Math.min(b.maxX-s,x));y=Math.max(b.minY+s,Math.min(b.maxY-s,y));pathPreview.push({x,y});}}
  redraw();
}
function clearPath(){pathPreview=[];redraw();}

// ═══ REDRAW ═══
function redraw(){
  ctx.clearRect(0,0,mapW,mapH);
  ctx.fillStyle='#080c10';ctx.fillRect(0,0,mapW,mapH);
  ctx.strokeStyle='rgba(30,45,61,.5)';ctx.lineWidth=1;
  for(let x=0;x<mapW;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,mapH);ctx.stroke();}
  for(let y=0;y<mapH;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(mapW,y);ctx.stroke();}
  if(!mapScanned){ctx.fillStyle='rgba(74,98,120,.15)';ctx.font="14px 'DM Mono',monospace";ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Press "Scan Floor" to generate building map',mapW/2,mapH/2);return;}

  // Outer floor
  const rp=roomPolygon;
  ctx.beginPath();ctx.rect(rp[0].x,rp[0].y,rp[1].x-rp[0].x,rp[2].y-rp[1].y);
  ctx.fillStyle='rgba(13,20,28,.97)';ctx.fill();
  // Tile texture
  ctx.save();ctx.clip();
  ctx.strokeStyle='rgba(30,45,61,.18)';ctx.lineWidth=.5;
  const tx=rp[0].x,ty=rp[0].y,tw=rp[1].x-tx,th=rp[2].y-ty;
  for(let x=tx;x<=tx+tw;x+=60){ctx.beginPath();ctx.moveTo(x,ty);ctx.lineTo(x,ty+th);ctx.stroke();}
  for(let y=ty;y<=ty+th;y+=60){ctx.beginPath();ctx.moveTo(tx,y);ctx.lineTo(tx+tw,y);ctx.stroke();}
  ctx.restore();
  // Outer walls + glow
  ctx.strokeStyle='rgba(0,229,255,.55)';ctx.lineWidth=2.5;ctx.setLineDash([]);
  ctx.strokeRect(rp[0].x,rp[0].y,rp[1].x-rp[0].x,rp[2].y-rp[1].y);
  ctx.strokeStyle='rgba(0,229,255,.1)';ctx.lineWidth=8;
  ctx.strokeRect(rp[0].x,rp[0].y,rp[1].x-rp[0].x,rp[2].y-rp[1].y);
  rp.forEach(p=>{ctx.fillStyle='#00e5ff';ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();});

  // Interior rooms
  rooms.forEach(r=>{
    const hall=r.type==='hall';
    ctx.strokeStyle=hall?'rgba(0,229,255,.18)':'rgba(0,229,255,.3)';ctx.lineWidth=hall?1:1.5;ctx.setLineDash([]);
    ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.fillStyle=hall?'rgba(0,229,255,.2)':'rgba(0,229,255,.3)';
    ctx.font=`${hall?'600 9px':'bold 10px'} 'DM Mono',monospace`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(r.label.toUpperCase(),r.x+r.w/2,r.y+r.h/2);
  });

  // Path preview
  if(pathPreview.length>1){
    ctx.strokeStyle='rgba(0,229,255,.3)';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(pathPreview[0].x,pathPreview[0].y);
    pathPreview.forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);
    pathPreview.forEach((p,i)=>{if(i%4===0){ctx.fillStyle='rgba(0,229,255,.35)';ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();}});
  }

  // Zones
  zones.forEach(z=>{
    const s=ZS[z.type],r=z.rect,sel=z.id===selectedZone;
    ctx.fillStyle=s.fill;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,5);ctx.fill();
    ctx.strokeStyle=s.stroke;ctx.lineWidth=sel?2.5:1.5;ctx.setLineDash(z.type==='nogo'?[6,4]:[]);ctx.stroke();ctx.setLineDash([]);
    if(sel){ctx.strokeStyle=s.stroke;ctx.lineWidth=8;ctx.globalAlpha=.12;ctx.stroke();ctx.globalAlpha=1;}
    ctx.fillStyle=s.stroke;ctx.font="bold 10px 'DM Mono',monospace";ctx.textAlign='left';ctx.textBaseline='top';
    const ic=z.type==='nogo'?'🚫':z.type==='clean'?'✅':z.type==='sched'?'⏰':'📍';
    ctx.fillText(`${ic} ${z.name}`,r.x+6,r.y+5);
  });

  // Drawing preview
  if(isDrawing&&drawingZone&&drawingZone.w>0){
    const s=ZS[pendingZoneType]||ZS.nogo;
    ctx.fillStyle=s.fill;ctx.beginPath();ctx.roundRect(drawingZone.x,drawingZone.y,drawingZone.w,drawingZone.h,5);ctx.fill();
    ctx.strokeStyle=s.stroke;ctx.lineWidth=1.5;ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);
  }

  // Bot
  const{x,y}=botPos;
  if(botTrail.length>1){ctx.strokeStyle='rgba(0,229,255,.18)';ctx.lineWidth=10;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(botTrail[0].x,botTrail[0].y);botTrail.forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();ctx.strokeStyle='rgba(0,229,255,.45)';ctx.lineWidth=1.5;ctx.stroke();}
  const g=ctx.createRadialGradient(x,y,0,x,y,22);g.addColorStop(0,'rgba(0,229,255,.2)');g.addColorStop(1,'rgba(0,229,255,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,22,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#00e5ff';ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
  ctx.font='11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🫧',x,y);
}

// ═══ TOOL / TAB ═══
function setTool(t){
  tool=t;document.querySelectorAll('.tool-btn').forEach(b=>b.classList.remove('active'));
  const b=document.getElementById('tool-'+t);if(b)b.classList.add('active');
  const hints={select:'Click a zone to select',pan:'Drag to pan',nogo:'Drag to draw a No-Go zone',clean:'Drag to draw a Clean zone',sched:'Drag to draw a Scheduled zone',custom:'Drag to draw a Custom zone'};
  document.getElementById('mapHint').textContent=hints[t]||'';
  canvas.style.cursor=t==='select'?'default':'crosshair';
  if(['nogo','clean','sched','custom'].includes(t))showTab('zones');
}
function showTab(n){
  ['zones','schedule','paths'].forEach(t=>{document.getElementById('tab-'+t).style.display=t===n?'block':'none';});
  document.querySelectorAll('.sidebar-tab').forEach((tab,i)=>tab.classList.toggle('active',['zones','schedule','paths'][i]===n));
  if(n==='schedule')renderSchedules();
}

// ═══ SAVE ═══
function saveMap(){
  try{localStorage.setItem('omniscrub_map',JSON.stringify({zones,roomPolygon,rooms}));showToast('Map saved ✓');}catch(e){}
  fetch('/api/map/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({zones,roomPolygon})}).catch(()=>{});
}
function showToast(msg){const t=document.createElement('div');t.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:7px 16px;background:rgba(0,229,255,.12);border:1px solid var(--accent);border-radius:20px;color:var(--accent);font-family:var(--mono);font-size:.75rem;z-index:10000;';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2400);}

// ═══════════════════════════════════════════════════════
//  LIVE CAMERA SYSTEM
// ═══════════════════════════════════════════════════════
let camOpen=false,camExpanded=false,camSource='webcam';
let mediaStream=null,mjpegTimer=null,fpsTimer=null,visionTimer=null;
let fpsFrames=0,fpsLast=Date.now();
let drag2=false,dx0=0,dy0=0,px0=0,py0=0;
let demoDetections=[];

const camPanel=document.getElementById('camPanel');
const camHandle=document.getElementById('camHandle');
const camVideo=document.getElementById('camVideo');
const camImg=document.getElementById('camImg');
const camOvCanvas=document.getElementById('camOverlayCanvas');
const camNoFeed=document.getElementById('camNoFeed');
const camBadge=document.getElementById('camBadge');
const camBadgeTxt=document.getElementById('camBadgeText');

// drag
camHandle.addEventListener('mousedown',e=>{
  drag2=true;dx0=e.clientX;dy0=e.clientY;
  const r=camPanel.getBoundingClientRect(),ar=area.getBoundingClientRect();
  px0=r.left-ar.left;py0=r.top-ar.top;e.preventDefault();
});
document.addEventListener('mousemove',e=>{
  if(!drag2)return;
  const ar=area.getBoundingClientRect();
  let nx=px0+(e.clientX-dx0),ny=py0+(e.clientY-dy0);
  nx=Math.max(0,Math.min(ar.width-camPanel.offsetWidth,nx));
  ny=Math.max(0,Math.min(ar.height-camPanel.offsetHeight,ny));
  camPanel.style.left=nx+'px';camPanel.style.top=ny+'px';camPanel.style.right='auto';camPanel.style.bottom='auto';
});
document.addEventListener('mouseup',()=>{drag2=false;});

function toggleCam(){
  camOpen=!camOpen;camPanel.classList.toggle('open',camOpen);
  document.getElementById('btnCamera').classList.toggle('cam-open',camOpen);
  if(camOpen&&camSource==='webcam')startWebcam();
  if(!camOpen)stopAllFeeds();
}
function toggleCamExpand(){
  camExpanded=!camExpanded;camPanel.classList.toggle('expanded',camExpanded);
  document.getElementById('camExpandBtn').textContent=camExpanded?'⤡':'⤢';
  syncOv();
}
function setSource(src){
  stopAllFeeds();camSource=src;
  ['webcam','arduino','mjpeg'].forEach(s=>document.getElementById('src-'+s).classList.toggle('active',s===src));
  const bar=document.getElementById('camConnBar');bar.classList.toggle('show',src!=='webcam');
  if(src==='arduino')document.getElementById('camUrl').placeholder='http://192.168.x.x/cam';
  if(src==='mjpeg')document.getElementById('camUrl').placeholder='http://host/stream.mjpg';
  document.getElementById('camSrcLbl').textContent=src==='webcam'?'Webcam':src==='arduino'?'Arduino':'MJPEG';
  if(src==='webcam'&&camOpen)startWebcam();
}

async function startWebcam(){
  stopAllFeeds();
  try{
    mediaStream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'environment'},audio:false});
    camVideo.srcObject=mediaStream;camVideo.style.display='block';
    camImg.style.display='none';camNoFeed.style.display='none';
    camBadge.classList.add('live');camBadgeTxt.textContent='LIVE';
    camVideo.onloadedmetadata=()=>{
      document.getElementById('camRes').textContent=camVideo.videoWidth+'x'+camVideo.videoHeight;
      document.getElementById('camSrcLbl').textContent='Webcam';
      syncOv();startFps();startVision();
    };
  }catch(err){showCamErr('Camera access denied.\n'+err.message);}
}

function connectExternal(){
  const url=document.getElementById('camUrl').value.trim();
  if(!url){showCamErr('Enter a URL first.');return;}
  stopAllFeeds();
  const btn=document.getElementById('camConnBtn');
  btn.textContent='Connecting…';btn.disabled=true;
  camVideo.style.display='none';camNoFeed.style.display='none';
  camImg.style.display='block';
  camImg.src=url+(url.includes('?')?'&':'?')+'_t='+Date.now();
  camImg.onload=()=>{
    btn.textContent='Connected';btn.classList.add('connected');btn.disabled=false;
    camBadge.classList.add('live');camBadgeTxt.textContent='LIVE';
    document.getElementById('camRes').textContent=(camImg.naturalWidth||'?')+'x'+(camImg.naturalHeight||'?');
    document.getElementById('camSrcLbl').textContent=camSource==='arduino'?'Arduino':'MJPEG';
    syncOv();startFps();startVision();
    // Refresh loop for snapshot-style endpoints (real MJPEG auto-refreshes)
    mjpegTimer=setInterval(()=>{
      if(camImg.style.display==='block'){camImg.src=url+(url.includes('?')?'&':'?')+'_t='+Date.now();}
    },100);
  };
  camImg.onerror=()=>{
    btn.textContent='Connect';btn.classList.remove('connected');btn.disabled=false;
    camImg.style.display='none';camNoFeed.style.display='flex';
    showCamErr('Cannot connect to:\n'+url+'\n\nCheck:\n• Arduino is powered & on WiFi\n• URL is correct\n• Stream is running\n\nArduino Uno Q: stream is usually http://[ip]/cam or /stream');
  };
}

function stopAllFeeds(){
  if(mediaStream){mediaStream.getTracks().forEach(t=>t.stop());mediaStream=null;}
  camVideo.srcObject=null;camVideo.style.display='none';
  camImg.src='';camImg.style.display='none';camImg.onload=null;camImg.onerror=null;
  camNoFeed.style.display='flex';
  clearInterval(mjpegTimer);clearInterval(fpsTimer);clearInterval(visionTimer);
  camBadge.classList.remove('live');camBadgeTxt.textContent='OFF';
  document.getElementById('camRes').textContent='—';document.getElementById('camFps').textContent='—';
  document.getElementById('camVision').innerHTML='<span>Vision:</span><span class="vtag vtag-clear">CLEAR</span>';
  const btn=document.getElementById('camConnBtn');btn.textContent='Connect';btn.classList.remove('connected');btn.disabled=false;
  demoDetections=[];const oc=camOvCanvas.getContext('2d');oc.clearRect(0,0,camOvCanvas.width,camOvCanvas.height);
}

function syncOv(){const vp=document.getElementById('camViewport');camOvCanvas.width=vp.offsetWidth;camOvCanvas.height=vp.offsetHeight;}

// FPS
function startFps(){
  clearInterval(fpsTimer);fpsFrames=0;fpsLast=Date.now();
  let af=true;
  (function tick(){if(!af)return;fpsFrames++;requestAnimationFrame(tick);})();
  fpsTimer=setInterval(()=>{
    const now=Date.now();
    document.getElementById('camFps').textContent=Math.round(fpsFrames/((now-fpsLast)/1000));
    fpsFrames=0;fpsLast=now;
    drawVisionOv();
  },1000);
}

// Simulated bounding-box overlay (replaced by real VideoObjectDetection events via WebSocket)
const DEMO_OBJS=['Person','Chair','Desk','Door','Bin','Cart'];
function drawVisionOv(){
  const c=camOvCanvas.getContext('2d');
  c.clearRect(0,0,camOvCanvas.width,camOvCanvas.height);
  if(Math.random()<.25){
    demoDetections=[];
    const n=Math.floor(Math.random()*3);
    for(let i=0;i<n;i++){
      demoDetections.push({
        label:DEMO_OBJS[Math.floor(Math.random()*DEMO_OBJS.length)],
        conf:Math.round(58+Math.random()*37),
        x:10+Math.random()*(camOvCanvas.width-100),
        y:10+Math.random()*(camOvCanvas.height-80),
        w:55+Math.random()*90,h:45+Math.random()*80
      });
    }
  }
  demoDetections.forEach(d=>{
    const col=d.label==='Person'?'#ff1744':'#00e5ff';
    c.strokeStyle=col;c.lineWidth=1.5;c.strokeRect(d.x,d.y,d.w,d.h);
    // Corner marks
    const cl=9;
    [[d.x,d.y,1,1],[d.x+d.w,d.y,-1,1],[d.x,d.y+d.h,1,-1],[d.x+d.w,d.y+d.h,-1,-1]].forEach(([cx,cy,sx,sy])=>{
      c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+sx*cl,cy);c.stroke();
      c.beginPath();c.moveTo(cx,cy);c.lineTo(cx,cy+sy*cl);c.stroke();
    });
    c.fillStyle=col+'cc';c.fillRect(d.x,d.y-18,d.label.length*7+32,18);
    c.fillStyle='#fff';c.font="bold 10px 'DM Mono',monospace";c.textBaseline='top';
    c.fillText(`${d.label} ${d.conf}%`,d.x+4,d.y-16);
  });
}

function startVision(){
  clearInterval(visionTimer);
  visionTimer=setInterval(()=>{
    const el=document.getElementById('camVision');
    if(!demoDetections.length){el.innerHTML='<span>Vision:</span><span class="vtag vtag-clear">CLEAR</span>';return;}
    el.innerHTML='<span>Vision:</span>'+demoDetections.map(d=>`<span class="vtag ${d.label==='Person'?'vtag-obs':'vtag-obj'}">${d.label.toUpperCase()}</span>`).join('');
  },1200);
}

function takeSnapshot(){
  const vp=document.getElementById('camViewport');
  const s=document.createElement('canvas');s.width=vp.offsetWidth;s.height=vp.offsetHeight;
  const sc=s.getContext('2d');
  if(camVideo.style.display!=='none'&&camVideo.readyState>=2)sc.drawImage(camVideo,0,0,s.width,s.height);
  else if(camImg.style.display!=='none')sc.drawImage(camImg,0,0,s.width,s.height);
  sc.drawImage(camOvCanvas,0,0);
  const flash=document.createElement('div');flash.className='snap-flash';vp.appendChild(flash);setTimeout(()=>flash.remove(),300);
  try{const a=document.createElement('a');a.download='omniscrub-'+Date.now()+'.png';a.href=s.toDataURL();a.click();showToast('Snapshot saved 📸');}catch(e){showToast('Snapshot ready');}
}

function showCamErr(msg){
  camNoFeed.style.display='flex';
  camNoFeed.innerHTML=`<div class="cam-nofeed-icon">⚠️</div><div style="color:var(--red);font-size:.68rem;line-height:1.5">${msg.replace(/\n/g,'<br>')}</div><button onclick="camNoFeed.innerHTML='<div class=cam-nofeed-icon>📷</div><div>No camera feed</div>'" style="margin-top:8px;padding:3px 10px;border-radius:5px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:var(--mono);font-size:.65rem;cursor:pointer">Dismiss</button>`;
}

// ═══ WEBSOCKET ═══
function connectWS(){
  try{
    const ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws`);
    ws.onmessage=e=>{
      try{
        const msg=JSON.parse(e.data);
        if(msg.event==='sensor_update'&&msg.data.position){
          const p=msg.data.position;botTrail.push({...botPos});
          if(botTrail.length>500)botTrail=botTrail.slice(-500);
          botPos={x:p.x*(mapW/100),y:p.y*(mapH/100)};redraw();
        }
        if(msg.event==='vision_detections'&&Array.isArray(msg.data.detections)){
          demoDetections=msg.data.detections.map(d=>({
            label:d.label||'Object',conf:Math.round((d.confidence||0)*100),
            x:d.x||10,y:d.y||10,w:d.w||80,h:d.h||60
          }));
        }
      }catch(err){}
    };
    ws.onclose=()=>setTimeout(connectWS,3000);
  }catch(e){}
}

// ═══ INIT ═══
try{
  const saved=localStorage.getItem('omniscrub_map');
  if(saved){const d=JSON.parse(saved);zones=d.zones||[];roomPolygon=d.roomPolygon||[];rooms=d.rooms||[];if(roomPolygon.length){mapScanned=true;botPos={x:(mapW||400)/2,y:(mapH||400)/2};}renderZoneList();}
}catch(e){}

selectPath('zigzag');
connectWS();
if(!mapScanned)setTimeout(startScan,600);
setInterval(()=>{if(mapScanned)redraw();},100);
</script>
</body>
</html>