/**
 * DAWA Desktop — محرك الرسم الإسقاطي ثلاثي الأبعاد المتقدم والواقعي (Realistic 3D Perspective Canvas Engine)
 * 
 * مستوحى ومدمج بالكامل مع:
 * 1. Hiobuy Warehouse Journey 3D (بيئة مستودع واقعية نهارية، مسارات الطرود، مناطق الفحص والتشغيل الست، رافعات ومعدات)
 * 2. WDA (Warehouse Design Automation — عناصر معمارية CAD: أبواب، نوافذ، جدران، أعمدة، شبكة أمان، وتوسيع الأبعاد)
 * 3. نظام DAWA NEXUS السيادي للصيدليات والمستودعات الطبية
 */

import { ArchitecturalElement, WarehouseLayoutPlacement, JourneyStageDef } from './layout-types';

export interface CameraState {
  yaw: number;
  pitch: number;
  zoom: number;
  px: number;
  py: number;
  base: number;
  dirty: boolean;
  ptr: Map<number, { x: number; y: number }>;
  dragMoved: number;
  dragItemId: string | null;
  dragItemType: 'RACK' | 'ELEMENT' | null;
  rawPx: number | null;
  rawPz: number | null;
  hits: Array<{
    id: string;
    type: 'RACK' | 'ELEMENT';
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    dep: number;
  }>;
}

export function projectPoint(
  x: number,
  y: number,
  z: number,
  state: { yaw: number; pitch: number; zoom: number; px: number; py: number; base: number },
  width: number,
  height: number,
  ww = 24,
  wd = 16,
): [number, number, number] {
  const c = Math.cos(state.yaw);
  const s = Math.sin(state.yaw);
  const X = x - ww / 2;
  const Z = z - wd / 2;
  const rx = X * c - Z * s;
  const rz = X * s + Z * c;
  const cp = Math.cos(state.pitch);
  const sp = Math.sin(state.pitch);
  const up = y * cp + rz * sp;
  const dep = rz * cp - y * sp;
  const k = state.base * state.zoom * (50 / (50 + dep));
  return [width / 2 + state.px + rx * k, height / 2 + state.py - up * k, dep];
}

export function screenToWorldGround(
  x: number,
  z: number,
  dsx: number,
  dsy: number,
  state: { yaw: number; pitch: number; zoom: number; px: number; py: number; base: number },
  width: number,
  height: number,
  ww = 24,
  wd = 16,
): [number, number] {
  const a = projectPoint(x, 0, z, state, width, height, ww, wd);
  const b = projectPoint(x + 1, 0, z, state, width, height, ww, wd);
  const c = projectPoint(x, 0, z + 1, state, width, height, ww, wd);
  const m11 = b[0] - a[0];
  const m12 = c[0] - a[0];
  const m21 = b[1] - a[1];
  const m22 = c[1] - a[1];
  const det = m11 * m22 - m12 * m21;
  if (Math.abs(det) < 1e-6) return [0, 0];
  return [(dsx * m22 - m12 * dsy) / det, (m11 * dsy - m21 * dsx) / det];
}

const PAL_KRAFT = ['#d97706', '#b45309', '#f59e0b', '#fde68a', '#fdba74', '#fed7aa', '#e2e8f0'];
const rgbCache: Record<string, [number, number, number]> = {};
function hexToRgb(c: string): [number, number, number] {
  if (rgbCache[c]) return rgbCache[c];
  if (!c || !c.startsWith('#') || c.length < 7) return [120, 140, 160];
  const r = parseInt(c.slice(1, 3), 16) || 0;
  const g = parseInt(c.slice(3, 5), 16) || 0;
  const b = parseInt(c.slice(5, 7), 16) || 0;
  rgbCache[c] = [r, g, b];
  return [r, g, b];
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface BoxDef {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  col: string;
  al: number;
  dep: number;
  hasLabel?: boolean;
}

export function drawPoly(
  ctx: CanvasRenderingContext2D,
  pts: [number, number, number][],
  fill?: string,
  stroke?: string,
  lw = 1,
): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function drawBox(
  ctx: CanvasRenderingContext2D,
  b: BoxDef,
  project: (x: number, y: number, z: number) => [number, number, number],
): void {
  const { x, y, z, w, h, d, col, al, hasLabel } = b;
  const v = [
    project(x, y, z),
    project(x + w, y, z),
    project(x + w, y, z + d),
    project(x, y, z + d),
    project(x, y + h, z),
    project(x + w, y + h, z),
    project(x + w, y + h, z + d),
    project(x, y + h, z + d),
  ];
  const faces = [
    [4, 5, 6, 7, 0, 1, 0, 'TOP'], // Top
    [0, 1, 5, 4, 0, 0, -1, 'FRONT'], // Front
    [3, 2, 6, 7, 0, 0, 1, 'BACK'], // Back
    [1, 2, 6, 5, 1, 0, 0, 'RIGHT'], // Right
    [0, 3, 7, 4, -1, 0, 0, 'LEFT'], // Left
  ];
  const rgb = hexToRgb(col);
  const sortedFaces = faces
    .map((f) => ({
      f,
      dep: (v[Number(f[0])][2] + v[Number(f[1])][2] + v[Number(f[2])][2] + v[Number(f[3])][2]) / 4,
    }))
    .sort((m, n) => n.dep - m.dep);

  sortedFaces.forEach(({ f }) => {
    const dot = -0.35 * Number(f[4]) + 0.85 * Number(f[5]) - 0.4 * Number(f[6]);
    const k = 0.62 + 0.38 * dot;
    const facePts: [number, number, number][] = [
      v[Number(f[0])],
      v[Number(f[1])],
      v[Number(f[2])],
      v[Number(f[3])],
    ];
    drawPoly(
      ctx,
      facePts,
      `rgba(${Math.round(rgb[0] * k)},${Math.round(rgb[1] * k)},${Math.round(rgb[2] * k)},${al})`,
      al > 0.45 ? 'rgba(15,23,42,0.22)' : undefined,
      0.8,
    );

    // ملصق باركود أبيض على واجهة الصندوق الأمامية لمحاكاة الطرود الواقعية
    if (hasLabel && f[7] === 'FRONT' && al > 0.8) {
      const cx = (facePts[0][0] + facePts[1][0] + facePts[2][0] + facePts[3][0]) / 4;
      const cy = (facePts[0][1] + facePts[1][1] + facePts[2][1] + facePts[3][1]) / 4;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(cx - 6, cy - 3, 12, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 4, cy - 1, 8, 2);
    }
  });
}

/**
 * رسم مشهد المستودع ثلاثي الأبعاد بالكامل بتفاصيل واقعية
 */
export function renderWarehouse3DScene(params: {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  state: CameraState;
  ww: number;
  wd: number;
  wh: number;
  elements: ArchitecturalElement[];
  placements: WarehouseLayoutPlacement[];
  selectedId: string | null;
  selectedType: 'RACK' | 'ELEMENT' | null;
  showRoutePath: boolean;
  selectedRackPos: { x: number; z: number } | null;
  journeyStage: number | null;
  journeyProgress: number;
  simPackagePos: [number, number, number] | null;
  timeStep: number;
  theme?: 'DAYLIGHT' | 'DARK';
}): void {
  const {
    ctx,
    canvas,
    state,
    ww,
    wd,
    wh,
    elements,
    placements,
    selectedId,
    selectedType,
    showRoutePath,
    selectedRackPos,
    journeyStage,
    journeyProgress,
    simPackagePos,
    timeStep,
    theme = 'DAYLIGHT',
  } = params;

  const dpr = window.devicePixelRatio || 1;
  const project = (x: number, y: number, z: number): [number, number, number] =>
    projectPoint(x, y, z, state, canvas.width, canvas.height, ww, wd);

  state.hits = [];
  const isDay = theme === 'DAYLIGHT';

  // 1. مسح وتعبئة خلفية الكانفاس (Daylight Hiobuy Style vs CAD Dark Mode)
  if (isDay) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#f8fafc');
    bgGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 2. أرضية المستودع والبلاطة الخرسانية المصقولة الصناعية (Polished Concrete Slab)
  const floorFill = isDay ? '#e8edf2' : '#0b1320';
  const floorStroke = isDay ? '#94a3b8' : '#1e293b';

  // ظل خارجي للبلاطة الخرسانية
  drawPoly(
    ctx,
    [project(-0.3, -0.05, -0.3), project(ww + 0.3, -0.05, -0.3), project(ww + 0.3, -0.05, wd + 0.3), project(-0.3, -0.05, wd + 0.3)],
    isDay ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.5)',
  );

  drawPoly(
    ctx,
    [project(0, 0, 0), project(ww, 0, 0), project(ww, 0, wd), project(0, 0, wd)],
    floorFill,
    floorStroke,
    2.5 * dpr,
  );

  // شبكة المتر والخطوط الإرشادية
  ctx.strokeStyle = isDay ? 'rgba(148, 163, 184, 0.35)' : 'rgba(51, 65, 85, 0.4)';
  ctx.lineWidth = 1 * dpr;
  for (let i = 2; i < ww; i += 2) {
    const a = project(i, 0, 0);
    const b = project(i, 0, wd);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  for (let j = 2; j < wd; j += 2) {
    const a = project(0, 0, j);
    const b = project(ww, 0, j);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }

  // مسار الحركة والسلامة الأرضي باللون الأصفر (Safety Traffic Lane Markings - Hiobuy Style)
  const laneY = 0.015;
  ctx.save();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5 * dpr;
  ctx.setLineDash([8 * dpr, 6 * dpr]);

  // مسار عرضي رئيسي للمشاة والرافعات
  const laneA1 = project(1.5, laneY, wd / 2);
  const laneA2 = project(ww - 1.5, laneY, wd / 2);
  ctx.beginPath();
  ctx.moveTo(laneA1[0], laneA1[1]);
  ctx.lineTo(laneA2[0], laneA2[1]);
  ctx.stroke();

  // خط أمان موازي لمنطقة الشحن
  const laneB1 = project(ww - 5.0, laneY, 1.0);
  const laneB2 = project(ww - 5.0, laneY, wd - 1.0);
  ctx.beginPath();
  ctx.moveTo(laneB1[0], laneB1[1]);
  ctx.lineTo(laneB2[0], laneB2[1]);
  ctx.stroke();
  ctx.restore();

  // خطوط مشاة (Zebra Crosswalk) عند بوابات التوريد
  ctx.fillStyle = isDay ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)';
  for (let k = 0; k < 5; k++) {
    const zx = 10.8 + k * 0.45;
    drawPoly(ctx, [
      project(zx, laneY, 0.4),
      project(zx + 0.25, laneY, 0.4),
      project(zx + 0.25, laneY, 1.8),
      project(zx, laneY, 1.8),
    ], isDay ? '#ffffff' : 'rgba(255,255,255,0.4)');
  }

  // مسطرة الأبعاد المترية على الحواف الخارجية
  ctx.fillStyle = isDay ? '#475569' : '#94a3b8';
  ctx.font = `${Math.max(9, 10 * dpr)}px monospace`;
  ctx.textAlign = 'center';
  for (let i = 4; i <= ww; i += 4) {
    const p = project(i, 0, -0.4);
    ctx.fillText(`${i}m`, p[0], p[1]);
  }
  for (let j = 4; j <= wd; j += 4) {
    const p = project(-0.5, 0, j);
    ctx.fillText(`${j}m`, p[0], p[1]);
  }

  // 3. رسم المناطق الوظيفية المخصصة (Zones) بدقة عالية وحدود مشعة
  elements
    .filter((el) => el.type === 'ZONE')
    .forEach((z) => {
      const isSel = selectedId === z.id && selectedType === 'ELEMENT';
      const col = z.color || '#3b82f6';
      const rgb = hexToRgb(col);
      const alpha = isSel ? 0.38 : isDay ? 0.16 : 0.22;
      const pts = [
        project(z.x, 0.02, z.z),
        project(z.x + z.w, 0.02, z.z),
        project(z.x + z.w, 0.02, z.z + z.d),
        project(z.x, 0.02, z.z + z.d),
      ];

      // تعبئة أرضية المنطقة
      drawPoly(ctx, pts, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);

      // إطار حدود المنطقة المنقط (Dashed Zone Perimeter)
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = (isSel ? 3.5 : 1.8) * dpr;
      ctx.setLineDash(isSel ? [] : [6 * dpr, 4 * dpr]);
      ctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // شارة وتسمية المنطقة
      const center = project(z.x + z.w / 2, 0.06, z.z + z.d / 2);
      ctx.font = `bold ${Math.max(10, 11 * dpr)}px sans-serif`;
      ctx.textAlign = 'center';

      // خلفية صغيرة لاسم المنطقة لضمان وضوحه التام
      const lblW = ctx.measureText(z.label).width + 14 * dpr;
      ctx.fillStyle = isDay ? 'rgba(255, 255, 255, 0.92)' : 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(center[0] - lblW / 2, center[1] - 12 * dpr, lblW, 16 * dpr);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(center[0] - lblW / 2, center[1] - 12 * dpr, lblW, 16 * dpr);

      ctx.fillStyle = col;
      ctx.fillText(z.label, center[0], center[1]);
      if (z.temperatureBand) {
        ctx.fillStyle = isDay ? '#475569' : '#94a3b8';
        ctx.font = `${Math.max(8, 8.5 * dpr)}px monospace`;
        ctx.fillText(z.temperatureBand, center[0], center[1] + 12 * dpr);
      }

      // Hit testing للمنطقة
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      state.hits.push({
        id: z.id,
        type: 'ELEMENT',
        x0: Math.min(...xs),
        x1: Math.max(...xs),
        y0: Math.min(...ys),
        y1: Math.max(...ys),
        dep: center[2] + 5,
      });
    });

  // 4. مسار السحب والتنقل المتحرك (Picking Path & Journey Simulation)
  if (showRoutePath && selectedRackPos) {
    const targetX = selectedRackPos.x;
    const targetZ = selectedRackPos.z;
    const pathPoints = [
      [ww / 2, 0.1],
      [ww / 2, 1.4],
      [2.0, 1.4],
      [2.0, targetZ],
      [targetX, targetZ],
    ];

    ctx.save();
    ctx.setLineDash([8 * dpr, 6 * dpr]);
    ctx.lineDashOffset = -timeStep * 18 * dpr;
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3.5 * dpr;
    ctx.beginPath();
    pathPoints.forEach((p, i) => {
      const projected = project(p[0], 0.08, p[1]);
      if (i === 0) ctx.moveTo(projected[0], projected[1]);
      else ctx.lineTo(projected[0], projected[1]);
    });
    ctx.stroke();
    ctx.restore();
  }

  // 5. مصفوفة الأجسام ثلاثية الأبعاد (Solid 3D Objects & Mesh Assembly)
  const boxes: BoxDef[] = [];

  // أ. الجدران المعمارية الخارجية المحيطة والداخلية (Industrial Building Walls)
  // جدار خلفي (North Wall along Z = 0)
  boxes.push({
    x: 0,
    y: 0,
    z: 0,
    w: ww,
    h: wh,
    d: 0.25,
    col: isDay ? '#cbd5e1' : '#334155',
    al: 0.92,
    dep: 0,
  });
  // جدار أيسر (West Wall along X = 0)
  boxes.push({
    x: 0,
    y: 0,
    z: 0,
    w: 0.25,
    h: wh,
    d: wd,
    col: isDay ? '#cbd5e1' : '#334155',
    al: 0.92,
    dep: 0,
  });

  // نوافذ زجاجية علوية على الجدار الخلفي (Clerestory Glass Panels)
  for (let wx = 2; wx < ww - 3; wx += 4.5) {
    boxes.push({
      x: wx,
      y: wh - 2.2,
      z: 0.05,
      w: 3.2,
      h: 1.4,
      d: 0.15,
      col: '#7dd3fc',
      al: 0.65,
      dep: 0,
    });
  }

  // ب. العناصر المعمارية المخصصة (WDA CAD Elements)
  elements
    .filter((el) => el.type !== 'ZONE')
    .forEach((el) => {
      const isSel = selectedId === el.id && selectedType === 'ELEMENT';
      const col = isSel ? '#00d4aa' : el.color || (isDay ? '#94a3b8' : '#64748b');

      if (el.type === 'WALL') {
        boxes.push({
          x: el.x,
          y: 0,
          z: el.z,
          w: el.w,
          h: el.h || 3.5,
          d: el.d,
          col,
          al: 0.95,
          dep: 0,
        });
      } else if (el.type === 'PILLAR') {
        // عمود إنشائي مع طوق أمان تحذيري أصفر وأسود عند القاعدة
        boxes.push({
          x: el.x,
          y: 0,
          z: el.z,
          w: el.w,
          h: 0.45,
          d: el.d,
          col: '#f59e0b',
          al: 1,
          dep: 0,
        });
        boxes.push({
          x: el.x + 0.05,
          y: 0.45,
          z: el.z + 0.05,
          w: el.w - 0.1,
          h: (el.h || wh) - 0.45,
          d: el.d - 0.1,
          col: isSel ? '#00d4aa' : isDay ? '#64748b' : '#475569',
          al: 1,
          dep: 0,
        });
      } else if (el.type === 'DOOR') {
        // بوابة أو رصيف تفريغ الشاحنات
        const frameCol = el.subType === 'DOCK_BAY' ? '#2563eb' : el.subType === 'EMERGENCY_EXIT' ? '#ef4444' : '#10b981';
        // إطار علوي وجانبي
        boxes.push({
          x: el.x,
          y: 0,
          z: el.z,
          w: el.w,
          h: el.h || 3.2,
          d: el.d || 0.35,
          col: frameCol,
          al: 0.85,
          dep: 0,
        });
        // خط عتبة الباب على الأرض
        const ptA = project(el.x, 0.05, el.z);
        const ptB = project(el.x + el.w, 0.05, el.z + (el.d || 0.35));
        ctx.strokeStyle = frameCol;
        ctx.lineWidth = 4 * dpr;
        ctx.beginPath();
        ctx.moveTo(ptA[0], ptA[1]);
        ctx.lineTo(ptB[0], ptB[1]);
        ctx.stroke();
      } else if (el.type === 'WINDOW') {
        boxes.push({
          x: el.x,
          y: 1.2,
          z: el.z,
          w: el.w,
          h: el.h || 1.8,
          d: el.d || 0.2,
          col: '#38bdf8',
          al: 0.55,
          dep: 0,
        });
      }

      // Hit testing للعنصر المعماري
      const cCenter = project(el.x + el.w / 2, (el.h || 2) / 2, el.z + el.d / 2);
      const span = Math.max(22, (el.w + el.d) * 16 * state.zoom);
      state.hits.push({
        id: el.id,
        type: 'ELEMENT',
        x0: cCenter[0] - span,
        x1: cCenter[0] + span,
        y0: cCenter[1] - span,
        y1: cCenter[1] + span,
        dep: cCenter[2],
      });
    });

  // ج. أثاث ومعدات المستودع التفاعلية (Workstations, Forklifts, Conveyors - Hiobuy Style)
  // 1. طاولة فحص واستلام في منطقة الاستلام (Receiving Desk)
  boxes.push({
    x: 16.5,
    y: 0,
    z: 1.8,
    w: 2.2,
    h: 0.85,
    d: 1.1,
    col: isDay ? '#94a3b8' : '#334155',
    al: 1,
    dep: 0,
  });
  // شاشة كمبيوتر مكتبية
  boxes.push({
    x: 17.2,
    y: 0.85,
    z: 2.0,
    w: 0.6,
    h: 0.45,
    d: 0.1,
    col: '#0284c7',
    al: 1,
    dep: 0,
  });

  // 2. طاولة فحص الجودة (QC Inspection Table)
  boxes.push({
    x: 3.5,
    y: 0,
    z: 3.2,
    w: 2.0,
    h: 0.85,
    d: 1.0,
    col: isDay ? '#cbd5e1' : '#334155',
    al: 1,
    dep: 0,
  });
  // تابلت فحص
  boxes.push({
    x: 4.2,
    y: 0.85,
    z: 3.5,
    w: 0.4,
    h: 0.05,
    d: 0.3,
    col: '#10b981',
    al: 1,
    dep: 0,
  });

  // 3. طاولة التعبئة والتغليف (Packing Bench)
  boxes.push({
    x: 13.5,
    y: 0,
    z: 3.5,
    w: 2.4,
    h: 0.85,
    d: 1.1,
    col: isDay ? '#94a3b8' : '#334155',
    al: 1,
    dep: 0,
  });

  // 4. رافعة شوكية صناعية باللون الأصفر والأسود في منطقة الإرسال (Industrial Forklift)
  const flX = ww - 3.8;
  const flZ = wd - 3.2;
  // جسم الرافعة الأصفر
  boxes.push({
    x: flX,
    y: 0.1,
    z: flZ,
    w: 1.6,
    h: 0.7,
    d: 1.0,
    col: '#eab308',
    al: 1,
    dep: 0,
  });
  // قفص الحماية الأسود (Overhead Guard Cage)
  boxes.push({
    x: flX + 0.3,
    y: 0.8,
    z: flZ + 0.1,
    w: 1.0,
    h: 1.1,
    d: 0.8,
    col: '#0f172a',
    al: 0.85,
    dep: 0,
  });
  // صاري وشوكات الرفع الفولاذية (Steel Mast & Forks)
  boxes.push({
    x: flX - 0.2,
    y: 0.1,
    z: flZ + 0.2,
    w: 0.2,
    h: 1.6,
    d: 0.6,
    col: '#64748b',
    al: 1,
    dep: 0,
  });

  // 5. سير أسطواني متحرك لنقل الكراتين في منطقة الشحن (Roller Conveyor Line)
  for (let ci = 0; ci < 4; ci++) {
    boxes.push({
      x: ww - 3.0 + ci * 0.6,
      y: 0.4,
      z: 2.0,
      w: 0.5,
      h: 0.1,
      d: 1.6,
      col: '#475569',
      al: 1,
      dep: 0,
    });
  }

  // د. الرفوف ثلاثية الأبعاد المتقدمة (OSHA Industrial Heavy Duty Racks)
  const placedRacks = placements.filter((p) => p.zone && p.shelf);
  placedRacks.forEach((r) => {
    const isSel = selectedId === r.id && (selectedType === 'RACK' || selectedType == null);
    const lv = r.levels || 4;
    const rw = r.w || 2.2;
    const rd = r.d || 0.9;
    const rh = r.h || 2.2 + lv * 0.28;
    const bw = r.rot ? rd : rw;
    const bd = r.rot ? rw : rd;

    const px = typeof r.px === 'number' ? r.px : 3.0;
    const pz = typeof r.pz === 'number' ? r.pz : 3.0;
    const x0 = px - bw / 2;
    const z0 = pz - bd / 2;

    const isCold = r.storageType === 'COLD' || r.zone.toUpperCase().includes('C');
    // لون الأعمدة الرأسية الصناعي الأزرق القياسي (OSHA Standard Industrial Blue)
    const postCol = isSel ? '#00d4aa' : isCold ? '#06b6d4' : '#1e40af';
    // لون العوارض البرتقالي للسلامة (OSHA Safety Orange Beams)
    const beamCol = isSel ? '#2dd4bf' : isCold ? '#38bdf8' : '#ea580c';

    // 4 أعمدة فولاذية رئيسية مع لوحات تثبيت سفلية
    [
      [0, 0],
      [bw - 0.09, 0],
      [0, bd - 0.09],
      [bw - 0.09, bd - 0.09],
    ].forEach(([ox, oz]) => {
      boxes.push({
        x: x0 + ox,
        y: 0,
        z: z0 + oz,
        w: 0.09,
        h: rh,
        d: 0.09,
        col: postCol,
        al: 1,
        dep: 0,
      });
    });

    // المستويات والعوارض الأفقية وطبليات التخزين
    const layerH = (rh - 0.25) / lv;
    const cellsCount = r.cellsPerLevel || 3;

    for (let l = 0; l < lv; l++) {
      const y = 0.15 + l * layerH;
      // عارضة التحميل البرتقالية الأمامية والخلفية
      boxes.push({
        x: x0,
        y,
        z: z0,
        w: bw,
        h: 0.08,
        d: bd,
        col: beamCol,
        al: 1,
        dep: 0,
      });

      // طبلية خشبية تحت الكراتين (Wooden Pallet)
      boxes.push({
        x: x0 + 0.04,
        y: y + 0.08,
        z: z0 + 0.04,
        w: bw - 0.08,
        h: 0.05,
        d: bd - 0.08,
        col: '#b45309',
        al: 0.9,
        dep: 0,
      });

      // عبوات دوائية وكراتين شحن مع ملصقات باركود
      for (let k = 0; k < cellsCount; k++) {
        const matchingCell = r.customCells?.find(
          (c) => String(c.level) === String(l + 1) && String(c.slot) === String(k + 1),
        );
        const col = matchingCell?.occupied === false
          ? 'rgba(100, 116, 139, 0.35)'
          : matchingCell?.productName
            ? '#10b981'
            : PAL_KRAFT[hashSeed(r.id + k + l) % PAL_KRAFT.length];

        const cellSpan = (r.rot ? bd : bw) / cellsCount;
        const cw = cellSpan - 0.10;
        const boxH = layerH * 0.68;

        if (r.rot) {
          boxes.push({
            x: x0 + 0.08,
            y: y + 0.13,
            z: z0 + 0.05 + k * cellSpan,
            w: bw - 0.16,
            h: boxH,
            d: Math.max(0.22, cw),
            col,
            al: 0.96,
            dep: 0,
            hasLabel: true,
          });
        } else {
          boxes.push({
            x: x0 + 0.05 + k * cellSpan,
            y: y + 0.13,
            z: z0 + 0.08,
            w: Math.max(0.22, cw),
            h: boxH,
            d: bd - 0.16,
            col,
            al: 0.96,
            dep: 0,
            hasLabel: true,
          });
        }
      }
    }

    // وهج التحديد للرف النشط
    if (isSel) {
      boxes.push({
        x: x0 - 0.04,
        y: 0,
        z: z0 - 0.04,
        w: bw + 0.08,
        h: rh + 0.2,
        d: bd + 0.08,
        col: '#00d4aa',
        al: 0.25 + 0.12 * Math.sin(timeStep * 3),
        dep: 0,
      });
    }

    // Hit Testing للرف
    const corners: [number, number, number][] = [];
    [0, rh].forEach((y) => {
      [x0, x0 + bw].forEach((xx) => {
        [z0, z0 + bd].forEach((zz) => {
          corners.push(project(xx, y, zz));
        });
      });
    });
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    state.hits.push({
      id: r.id,
      type: 'RACK',
      x0: Math.min(...xs),
      x1: Math.max(...xs),
      y0: Math.min(...ys),
      y1: Math.max(...ys),
      dep: project(px, rh / 2, pz)[2],
    });
  });

  // هـ. طرد محاكاة الرحلة الحية المتنقل (Live Simulated Package PKG-572)
  if (simPackagePos) {
    boxes.push({
      x: simPackagePos[0] - 0.35,
      y: simPackagePos[1],
      z: simPackagePos[2] - 0.35,
      w: 0.7,
      h: 0.55,
      d: 0.7,
      col: '#f59e0b',
      al: 1,
      dep: 0,
      hasLabel: true,
    });
  }

  // 6. فرز العمق لجميع الصناديق والمجسمات ورسمها بترتيب الإسقاط الصحيح (Painter's Algorithm)
  boxes.forEach((b) => {
    b.dep = project(b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2)[2];
  });
  boxes.sort((a, b) => b.dep - a.dep);
  boxes.forEach((b) => drawBox(ctx, b, project));

  // 7. رسم شارات الرفوف والعناوين العلوية وشارة العنصر المعماري المحدد
  ctx.textAlign = 'center';

  // شارة وتفاصيل العنصر المعماري المحدد
  if (selectedId && selectedType === 'ELEMENT') {
    const selElem = elements.find((el) => el.id === selectedId);
    if (selElem) {
      const ep = project(selElem.x + selElem.w / 2, (selElem.h || 2.5) + 0.8, selElem.z + selElem.d / 2);
      ctx.font = `bold ${11 * dpr}px sans-serif`;
      const txt = `📐 ${selElem.label} (${selElem.w.toFixed(1)}m × ${selElem.d.toFixed(1)}m × ${(selElem.h || 2.5).toFixed(1)}m) • ${selElem.rotation || 0}°`;
      const tw = ctx.measureText(txt).width + 16 * dpr;

      ctx.fillStyle = '#00d4aa';
      ctx.fillRect(ep[0] - tw / 2, ep[1] - 14 * dpr, tw, 20 * dpr);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(txt, ep[0], ep[1]);
    }
  }

  // شارات الرفوف بالأسماء العربية والإنجليزية وأبعادها
  placedRacks.forEach((r) => {
    const isSel = selectedId === r.id && (selectedType === 'RACK' || selectedType == null);
    const lv = r.levels || 4;
    const rw = r.w || 2.2;
    const rd = r.d || 0.9;
    const rh = r.h || 2.2 + lv * 0.28;
    const px = typeof r.px === 'number' ? r.px : 3.0;
    const pz = typeof r.pz === 'number' ? r.pz : 3.0;

    const p = project(px, rh + (isSel ? 1.6 : 0.35), pz);
    ctx.font = `bold ${isSel ? 11 * dpr : 9.5 * dpr}px monospace`;
    const curW = r.rot ? rd : rw;
    const curD = r.rot ? rw : rd;
    const displayName = r.nameAr || r.nameEn ? `${r.code} (${r.nameAr || r.nameEn})` : r.code;
    const text = isSel
      ? `🎯 ${displayName} • ${curW.toFixed(1)}×${curD.toFixed(1)}m • ${lv} مستويات`
      : displayName;
    const tw = ctx.measureText(text).width + 12 * dpr;

    ctx.fillStyle = isSel ? '#00d4aa' : isDay ? 'rgba(30, 41, 59, 0.92)' : 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(p[0] - tw / 2, p[1] - 14 * dpr, tw, 18 * dpr);
    ctx.fillStyle = isSel ? '#0f172a' : '#ffffff';
    ctx.fillText(text, p[0], p[1]);
  });

  // شارة طرد المحاكاة
  if (simPackagePos) {
    const pp = project(simPackagePos[0], simPackagePos[1] + 1.2, simPackagePos[2]);
    ctx.font = `bold ${11 * dpr}px sans-serif`;
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(pp[0] - 44 * dpr, pp[1] - 14 * dpr, 88 * dpr, 19 * dpr);
    ctx.fillStyle = '#0f172a';
    ctx.fillText('📦 طرد PKG-572', pp[0], pp[1]);
  }
}
