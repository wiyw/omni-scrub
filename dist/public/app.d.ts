interface Point {
    x: number;
    y: number;
}
interface Zone {
    id: number;
    name: string;
    type: 'nogo' | 'clean' | 'sched' | 'custom';
    rect: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
}
interface Schedule {
    id: number;
    name: string;
    enabled: boolean;
    days: number[];
    time: string;
    interval: number;
    zoneId: number | null;
}
interface Room {
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'room' | 'hall';
}
interface Detection {
    label: string;
    conf: number;
    x: number;
    y: number;
    w: number;
    h: number;
}
interface ZoneStyle {
    fill: string;
    stroke: string;
    label: string;
}
declare const ZS: Record<string, ZoneStyle>;
declare const PHASES: string[];
declare const DAYS: string[];
declare const DEMO_OBJS: string[];
declare let canvas: HTMLCanvasElement;
declare let ctx: CanvasRenderingContext2D;
declare let area: HTMLElement;
declare let mapW: number;
declare let mapH: number;
declare let tool: string;
declare let zones: Zone[];
declare let schedules: Schedule[];
declare let selectedZone: number | null;
declare let drawingZone: {
    x: number;
    y: number;
    w: number;
    h: number;
} | null;
declare let isDrawing: boolean;
declare let dragStart: Point | null;
declare let mapScanned: boolean;
declare let roomPolygon: Point[];
declare let rooms: Room[];
declare let botPos: {
    x: number;
    y: number;
};
declare let botTrail: Point[];
declare let selectedPathMode: string;
declare let pathPreview: Point[];
declare let pendingZoneType: 'nogo' | 'clean' | 'sched' | 'custom';
declare let camOpen: boolean;
declare let camExpanded: boolean;
declare let camSource: 'webcam' | 'arduino' | 'mjpeg';
declare let mediaStream: MediaStream | null;
declare let mjpegTimer: ReturnType<typeof setInterval> | null;
declare let fpsTimer: ReturnType<typeof setInterval> | null;
declare let visionTimer: ReturnType<typeof setInterval> | null;
declare let fpsFrames: number;
declare let fpsLast: number;
declare let demoDetections: Detection[];
declare let drag2: boolean;
declare let dx0: number;
declare let dy0: number;
declare let px0: number;
declare let py0: number;
declare let ws: WebSocket | null;
declare function init(): void;
declare function resizeCanvas(): void;
declare function mpos(e: MouseEvent | TouchEvent): Point;
declare function inp(p: Point, r: {
    x: number;
    y: number;
    w: number;
    h: number;
}): boolean;
declare function startScan(): void;
declare function completeScan(): void;
declare function rescan(): void;
declare function setTool(t: string): void;
declare function showTab(n: string): void;
declare function pickType(t: string, el: HTMLElement): void;
declare function setTypeUI(t: string): void;
declare function confirmZone(): void;
declare function cancelZone(): void;
declare function deleteZone(id: number): void;
declare function undoLast(): void;
declare function clearAllZones(): void;
declare function renderZoneList(): void;
declare function selZ(id: number): void;
declare function addSchedule(): void;
declare function renderSchedules(): void;
declare function togS(id: number): void;
declare function togD(id: number, i: number): void;
declare function updS(id: number, k: string, v: string): void;
declare function delS(id: number): void;
declare function nxRun(s: Schedule): string;
declare function selectPath(p: string): void;
declare function getBounds(): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};
declare function previewPath(): void;
declare function clearPath(): void;
declare function redraw(): void;
declare function saveMap(): void;
declare function showToast(msg: string): void;
declare function loadSavedMap(): void;
declare function connectWS(): void;
declare function sendWS(event: string, data?: Record<string, unknown>): void;
declare const camPanel: HTMLElement;
declare const camHandle: HTMLElement;
declare const camVideo: HTMLVideoElement;
declare const camImg: HTMLImageElement;
declare const camOvCanvas: HTMLCanvasElement;
declare const camNoFeed: HTMLElement;
declare function initCameraDrag(): void;
declare function toggleCam(): void;
declare function toggleCamExpand(): void;
declare function setSource(src: string): void;
declare function startWebcam(): Promise<void>;
declare function connectExternal(): void;
declare function stopAllFeeds(): void;
declare function syncOv(): void;
declare function startFps(): void;
declare function drawVisionOv(): void;
declare function startVision(): void;
declare function takeSnapshot(): void;
declare function showCamErr(msg: string): void;
//# sourceMappingURL=app.d.ts.map