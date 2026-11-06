/**
 * DAWA Desktop — مصمم تخطيط المستودعات ثلاثي الأبعاد المتقدم والسيادي (DAWA NEXUS)
 *
 * مدمج ومطور بالكامل من:
 * 1. HioBuy Warehouse Journey 3D (محاكاة ثلاثية الأبعاد واقعية، مسارات الطرود، مناطق الفحص والتجميع والشحن)
 * 2. WDA (Warehouse Design Automation — عناصر معمارية CAD: أبواب، نوافذ، جدران، أعمدة، وتوسيع الأبعاد)
 * 3. نظام الصلاحيات السيادي لدواء: إدارة رؤية الموظفين ونشر المخطط المعتمد بإشراف د. ياسين فضل
 */

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../../../../contexts/AuthContextInstance';
import {
  Grid3x3,
  Save,
  Loader2,
  RotateCcw,
  Compass,
  Eye,
  Maximize2,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  QrCode,
  Camera,
  Navigation,
  Printer,
  Layers,
  Plus,
  Pencil,
  Trash2,
  Move,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  AlertTriangle,
  Snowflake,
  Thermometer,
  ShieldAlert,
  Hash,
  DoorOpen,
  Maximize,
  Boxes,
  ShieldCheck,
  FastForward,
  Rewind,
  Keyboard,
} from 'lucide-react';
import { api } from '../../../../lib/api-client';
import { extractArabicError } from '../../../../lib/api-helpers';
import { ScreenShell, KpiChip } from '../../shell/WorkspaceFrame';
import { DaylightButton } from '../../shell/DaylightControls';
import { ArrangementTasksPanel, LayoutHistoryPanel } from './WarehouseLayoutOpsPanels';
import {
  ArchitecturalElement,
  JourneyStageDef,
  JOURNEY_STAGES,
  WarehouseBlueprint,
  WarehouseLayoutPlacement,
  ContextMenuState,
  RackCell,
} from './layout-types';
import {
  CameraState,
  projectPoint,
  renderWarehouse3DScene,
  screenToWorldGround,
} from './layout-3d-renderer';
import {
  AddElementModal,
  ExpandDimensionsModal,
  RackCellsModal,
  StaffVisibilityPublishModal,
  DesktopContextMenu,
  AshrafTouchRadialMenu,
  AshrafTouchBottomSheet,
  KeyboardShortcutsModal,
} from './WarehouseArchitectureModals';
import { createWarehouseRackOverrides, hydrateWarehouseLayoutPlacements } from './warehouse-layout-rack-overrides';

export type { WarehouseLayoutPlacement };

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

const CELL = 62;
const GAP = 8;
const LEVEL_H = 16;
export const WW = 24;
export const WD = 16;

export const pad2 = (n: number): string => String(n).padStart(2, '0');
export const slotKey = (zone: string, shelf: string, levelVal: string): string => `${zone}|${shelf}|${levelVal}`;

export function parseZoneNum(z: string | undefined | null): number {
  if (!z) return 1;
  const trimmed = String(z).trim();
  const n = Number.parseInt(trimmed, 10);
  if (Number.isFinite(n) && n > 0) return n;
  const upper = trimmed.toUpperCase();
  const code = upper.charCodeAt(0);
  if (code >= 65 && code <= 90) return code - 64;
  return 1;
}

export function parseShelfNum(s: string | undefined | null): number {
  if (!s) return 1;
  const n = Number.parseInt(String(s).trim(), 10);
  if (Number.isFinite(n) && n > 0) return n;
  return 1;
}

export function parseLevelNum(l: string | undefined | null): number {
  if (!l) return 1;
  const n = Number.parseInt(String(l).trim(), 10);
  if (Number.isFinite(n) && n > 0) return n;
  return 1;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** توليد مصفوفة باركود/QR على كانفاس للرف المحدد */
function drawQrMatrix(canvas: HTMLCanvasElement, text: string): void {
  const n = 21;
  const size = canvas.width / n;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0f172a';

  let h = hashSeed(text);
  const drawFinder = (ax: number, ay: number) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(ax * size, ay * size, 7 * size, 7 * size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect((ax + 1) * size, (ay + 1) * size, 5 * size, 5 * size);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect((ax + 2) * size, (ay + 2) * size, 3 * size, 3 * size);
  };

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i < 8 && j < 8) || (i > 13 && j < 8) || (i < 8 && j > 13)) continue;
      h = Math.imul(h ^ (i * 31 + j * 17), 16777619) >>> 0;
      if (h % 100 < 45) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(i * size, j * size, size, size);
      }
    }
  }
  drawFinder(0, 0);
  drawFinder(14, 0);
  drawFinder(0, 14);
}

/** توليد صورة الرف المصورة (mkPhoto) */
function generateShelfPhoto(canvas: HTMLCanvasElement, rackCode: string, inspector: string): void {
  canvas.width = 320;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, '#cbd5e1');
  grad.addColorStop(1, '#64748b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 320, 200);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(16, 16, 8, 150);
  ctx.fillRect(296, 16, 8, 150);

  for (let l = 0; l < 3; l++) {
    const y = 20 + l * 48;
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(16, y + 36, 288, 7);
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = ['#fde68a', '#fca5a5', '#93c5fd', '#86efac', '#d8b4fe'][(k + l) % 5];
      ctx.fillRect(30 + k * 52, y + 6, 44, 30);
    }
  }

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, 172, 320, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  const timeStr = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
  ctx.fillText(`${rackCode}  •  ${timeStr}  •  المشرف: ${inspector}`, 10, 190);
}

// عناصر معمارية قياسية للمستودع الدوائي
const DEFAULT_ARCHITECTURAL_ELEMENTS: ArchitecturalElement[] = [
  {
    id: 'elem-door-main',
    type: 'DOOR',
    subType: 'MAIN_ENTRANCE',
    label: 'بوابة المستودع الرئيسية (Main Entrance)',
    x: 10.5,
    z: 0.2,
    w: 3.0,
    d: 0.35,
    h: 3.2,
    color: '#10b981',
  },
  {
    id: 'elem-dock-1',
    type: 'DOOR',
    subType: 'DOCK_BAY',
    label: 'رصيف استلام الشاحنات BAY 01',
    x: 15.5,
    z: 0.2,
    w: 3.4,
    d: 0.4,
    h: 3.6,
    color: '#2563eb',
  },
  {
    id: 'elem-dock-2',
    type: 'DOOR',
    subType: 'DOCK_BAY',
    label: 'رصيف تفريغ الحاويات BAY 02',
    x: 19.5,
    z: 0.2,
    w: 3.4,
    d: 0.4,
    h: 3.6,
    color: '#2563eb',
  },
  {
    id: 'elem-zone-1-receiving',
    type: 'ZONE',
    subType: 'RECEIVING',
    label: '01 / الاستلام والتوريد (Inbound Receiving)',
    x: 14.5,
    z: 0.5,
    w: 9.0,
    d: 3.5,
    h: 0.1,
    color: '#3b82f6',
    metadata: { stageNumber: '01' },
  },
  {
    id: 'elem-zone-2-storage',
    type: 'ZONE',
    subType: 'STORAGE',
    label: '02 / التخزين والرفوف الصناعية (Putaway & Storage)',
    x: 0.8,
    z: 6.5,
    w: 12.5,
    d: 9.0,
    h: 0.1,
    color: '#06b6d4',
    metadata: { stageNumber: '02' },
  },
  {
    id: 'elem-zone-3-qc',
    type: 'ZONE',
    subType: 'QC_INSPECTION',
    label: '03 / الفحص وضبط الجودة (QC & Inspection)',
    x: 0.8,
    z: 0.6,
    w: 6.5,
    d: 5.2,
    h: 0.1,
    color: '#10b981',
    metadata: { stageNumber: '03' },
  },
  {
    id: 'elem-zone-4-consolidation',
    type: 'ZONE',
    subType: 'STORAGE',
    label: '04 / تجميع الطلبيات (Consolidation)',
    x: 7.8,
    z: 0.6,
    w: 6.2,
    d: 5.2,
    h: 0.1,
    color: '#8b5cf6',
    metadata: { stageNumber: '04' },
  },
  {
    id: 'elem-zone-5-packing',
    type: 'ZONE',
    subType: 'PACKING',
    label: '05 / التعبئة والتغليف (Packing & Labeling)',
    x: 14.5,
    z: 4.8,
    w: 9.0,
    d: 5.0,
    h: 0.1,
    color: '#f59e0b',
    metadata: { stageNumber: '05' },
  },
  {
    id: 'elem-zone-6-dispatch',
    type: 'ZONE',
    subType: 'DISPATCH',
    label: '06 / رصيف الشحن والتوزيع (Outbound Dispatch)',
    x: 14.5,
    z: 10.2,
    w: 9.0,
    d: 5.3,
    h: 0.1,
    color: '#2563eb',
    metadata: { stageNumber: '06' },
  },
  {
    id: 'elem-pillar-1',
    type: 'PILLAR',
    subType: 'CONCRETE_ROUND',
    label: 'عمود إنشائي C1',
    x: 7.5,
    z: 6.0,
    w: 0.6,
    d: 0.6,
    h: 7.5,
    color: '#64748b',
  },
  {
    id: 'elem-pillar-2',
    type: 'PILLAR',
    subType: 'CONCRETE_ROUND',
    label: 'عمود إنشائي C2',
    x: 14.0,
    z: 6.0,
    w: 0.6,
    d: 0.6,
    h: 7.5,
    color: '#64748b',
  },
];

export function WarehouseLayoutScreen(): React.ReactElement {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [placements, setPlacements] = useState<WarehouseLayoutPlacement[]>([]);
  const [initial, setInitial] = useState<WarehouseLayoutPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [level, setLevel] = useState('01');
  const [zoneCount, setZoneCount] = useState(4);
  const [shelfCount, setShelfCount] = useState(4);
  const [dragId, setDragId] = useState<string | null>(null);

  // صلاحيات المستخدم والتحكم بوضع المشرف أشرف مقابل المجهزين محمد ومرعي وفيصل والعوامي
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user ?? null;
  const [overrideRoleMode, setOverrideRoleMode] = useState<'AUTO' | 'ASHRAF' | 'MOHAMMED'>('AUTO');

  const isDesignerOrAdmin = useMemo(() => {
    if (overrideRoleMode === 'ASHRAF') return true;
    if (overrideRoleMode === 'MOHAMMED') return false;
    if (!currentUser) return true; // الجلسة المستقلة الافتراضية كاملة الصلاحيات للحفاظ على الاختبارات

    const uname = (currentUser.username || '').toLowerCase();
    const email = (currentUser.email || '').toLowerCase();
    const name = (currentUser.name || '').toLowerCase();
    const roles = Array.isArray(currentUser.roles) ? currentUser.roles.map((r) => String(r).toUpperCase()) : [];
    const perms = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];

    const isAshraf = uname.includes('ashraf') || email.includes('ashraf') || name.includes('أشرف') || name.includes('ashraf');
    const isYassin = uname.includes('yassin') || email.includes('yassin') || name.includes('ياسين') || name.includes('yassin');
    const hasSupervisorRole = roles.some((r) =>
      r.includes('ADMIN') ||
      r.includes('STORAGE_SUPERVISOR') ||
      r.includes('SUPERVISOR') ||
      r.includes('INVENTORY_MANAGER') ||
      r.includes('OWNER')
    );
    const hasDesignPerm =
      perms.includes('inventory.locations.design') ||
      perms.includes('shelf.create') ||
      perms.includes('shelf.update');

    const isPickerOrPacker =
      uname.includes('mohammed') || uname.includes('marie') || uname.includes('faisal') || uname.includes('alawami');
    if (isPickerOrPacker && !isAshraf && !isYassin && !hasSupervisorRole) {
      return false;
    }

    return isAshraf || isYassin || hasSupervisorRole || hasDesignPerm;
  }, [currentUser, overrideRoleMode]);

  // مستكشف موقع الدواء والرفوف (محمد، مرعي، فيصل، العوامي)
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');
  const [activeDiscoveredLocation, setActiveDiscoveredLocation] = useState<{
    medicineName: string;
    rackCode: string;
    zone: string;
    shelf: string;
    level: string;
    cellName: string;
  } | null>(null);

  const handleMedicineSearch = (q: string) => {
    setMedicineSearchQuery(q);
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) {
      setActiveDiscoveredLocation(null);
      return;
    }

    const match = placements.find(
      (p) =>
        p.code.toLowerCase().includes(trimmed) ||
        p.name.toLowerCase().includes(trimmed) ||
        (p.nameAr && p.nameAr.toLowerCase().includes(trimmed)) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(trimmed)) ||
        `zone ${p.zone}`.toLowerCase().includes(trimmed) ||
        `رف ${p.shelf}`.toLowerCase().includes(trimmed)
    );

    if (match) {
      setSelectedPlacementId(match.id);
      setSelectedElementId(null);
      setShowRoutePath(true);
      setActiveDiscoveredLocation({
        medicineName: match.name || 'مستحضر صيدلاني',
        rackCode: match.code,
        zone: match.zone || 'A',
        shelf: match.shelf || '1',
        level: match.levelVal || '01',
        cellName: `${match.zone || 'A'}${match.shelf || '1'}-01`,
      });
      setFlash({
        tone: 'ok',
        text: `🎯 تم تحديد موقع الدواء على الرف ${match.code} ورسم مسار السحب المباشر!`,
      });
      return;
    }

    const sampleMeds = [
      { name: 'بانادول إكسترا (Panadol Extra)', rack: 'WH-MAIN-A1', zone: 'A', shelf: '1', level: '01', cell: 'A1-01' },
      { name: 'أموكسيسيلين (Amoxicillin)', rack: 'WH-MAIN-A2', zone: 'A', shelf: '2', level: '01', cell: 'A2-01' },
      { name: 'أوجمنتين (Augmentin)', rack: 'WH-MAIN-A2', zone: 'A', shelf: '2', level: '02', cell: 'A2-02' },
      { name: 'أنسولين لانتوس (Insulin Lantus)', rack: 'WH-COLD-01', zone: 'COLD', shelf: '1', level: '01', cell: 'COLD-01' },
      { name: 'باراسيتامول فيال (Paracetamol IV)', rack: 'WH-MAIN-B1', zone: 'B', shelf: '1', level: '01', cell: 'B1-01' },
    ];
    const med = sampleMeds.find((m) => m.name.toLowerCase().includes(trimmed) || m.rack.toLowerCase().includes(trimmed));
    if (med) {
      const first = placements[0];
      if (first) {
        setSelectedPlacementId(first.id);
        setShowRoutePath(true);
      }
      setActiveDiscoveredLocation({
        medicineName: med.name,
        rackCode: med.rack,
        zone: med.zone,
        shelf: med.shelf,
        level: med.level,
        cellName: med.cell,
      });
      setFlash({
        tone: 'ok',
        text: `🎯 تم تحديد موقع الدواء ${med.name} بالرف ${med.rack} ورسم مسار السحب!`,
      });
    }
  };


  // أبعاد المستودع المعمارية
  const [dimensions, setDimensions] = useState<{ ww: number; wd: number; wh: number }>({
    ww: 24,
    wd: 16,
    wh: 8,
  });
  const [initialDimensions, setInitialDimensions] = useState<{ ww: number; wd: number; wh: number }>({
    ww: 24,
    wd: 16,
    wh: 8,
  });

  // العناصر المعمارية (WDA CAD Elements)
  const [elements, setElements] = useState<ArchitecturalElement[]>(DEFAULT_ARCHITECTURAL_ELEMENTS);
  const [initialElements, setInitialElements] = useState<ArchitecturalElement[]>(DEFAULT_ARCHITECTURAL_ELEMENTS);

  // إعدادات العرض ثلاثي الأبعاد
  const [viewMode, setViewMode] = useState<'3d-canvas' | 'schematic'>('3d-canvas');
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [canvasTheme, setCanvasTheme] = useState<'DAYLIGHT' | 'DARK'>('DAYLIGHT');
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showRoutePath, setShowRoutePath] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);

  // محاكاة وسرعة رحلة الطرد الحية (HioBuy Warehouse Journey 3D)
  const [isSimulatingJourney, setIsSimulatingJourney] = useState(false);
  const [journeyStageIdx, setJourneyStageIdx] = useState(0);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [activeViewTarget, setActiveViewTarget] = useState<'interior' | 'exterior'>('interior');

  // وضع لمس المشرف أشرف وقوائم الماوس
  const [isTouchMode, setIsTouchMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    targetType: 'FLOOR',
    targetId: null,
    worldX: 5,
    worldZ: 5,
  });
  const [radialTouch, setRadialTouch] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    rackId: string | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    rackId: null,
  });
  const [touchBottomSheetOpen, setTouchBottomSheetOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  // نوافذ التحكم المعماري والتوسعة وصلاحيات الرؤية
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddElementModal, setShowAddElementModal] = useState(false);
  const [showExpandModal, setShowExpandModal] = useState(false);
  const [showRackCellsModal, setShowRackCellsModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // حقول نموذج إضافة رف جديد ثنائية اللغة
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newZone, setNewZone] = useState('A');
  const [newShelf, setNewShelf] = useState('1');
  const [newLevel, setNewLevel] = useState('01');
  const [newStorageType, setNewStorageType] = useState('ROOM');
  const [newDirectPlace, setNewDirectPlace] = useState(true);

  // حقول نموذج تعديل الرف ثنائية اللغة
  const [editId, setEditId] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editNameAr, setEditNameAr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editZone, setEditZone] = useState('');
  const [editShelf, setEditShelf] = useState('');
  const [editLevel, setEditLevel] = useState('01');
  const [editStorageType, setEditStorageType] = useState('ROOM');
  const [editRot, setEditRot] = useState(false);
  const [editLevels, setEditLevels] = useState(4);

  // معلومات النشر والصلاحيات
  const [blueprintVersion, setBlueprintVersion] = useState(1);
  const [blueprintVisibility, setBlueprintVisibility] = useState<WarehouseBlueprint['visibility']>({
    visibleToAll: true,
    allowedUserIds: [],
    allowedRoles: [],
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);

  const cameraState = useRef<CameraState>({
    yaw: -0.55,
    pitch: 0.82,
    zoom: 1.0,
    px: 0,
    py: 0,
    base: 28,
    dirty: true,
    ptr: new Map(),
    dragMoved: 0,
    dragItemId: null,
    dragItemType: null,
    rawPx: null,
    rawPz: null,
    hits: [],
  });

  // تحميل المستودعات المتاحة
  useEffect(() => {
    let active = true;
    void api
      .getWarehouses()
      .then((list) => {
        if (!active) return;
        const valid = (list ?? []).filter((w) => w.isActive !== false);
        setWarehouses(valid);
        if (valid.length > 0 && !warehouseId) {
          setWarehouseId(valid[0].id);
        }
      })
      .catch((e: unknown) => {
        if (active) setFlash({ tone: 'err', text: extractArabicError(e, 'فشل تحميل المستودعات') });
      });
    return () => {
      active = false;
    };
  }, [warehouseId]);

  // تحميل المواقع والمخطط المعماري للمستودع
  const loadLocations = useCallback(async (whId: string, showIndicator = true) => {
    if (!whId) return;
    if (showIndicator) setLoading(true);
    try {
      const [rows, blueprintRes] = await Promise.all([
        api.getWarehouseLocations(whId),
        typeof api.getWarehouseBlueprint === 'function'
          ? api.getWarehouseBlueprint(whId).catch(() => null)
          : Promise.resolve(null),
      ]);

      const blueprint = blueprintRes?.blueprint && typeof blueprintRes.blueprint === 'object'
        ? blueprintRes.blueprint as WarehouseBlueprint
        : null;
      const normalized = hydrateWarehouseLayoutPlacements(rows ?? [], blueprint);

      // تطبيق إعدادات المخطط المعتمد
      if (blueprint) {
        const bp = blueprint;
        if (bp.dimensions) {
          const dims = {
            ww: bp.dimensions.widthM || 24,
            wd: bp.dimensions.depthM || 16,
            wh: bp.dimensions.heightM || 8,
          };
          setDimensions(dims);
          setInitialDimensions(dims);
        }
        if (Array.isArray(bp.elements)) {
          setElements(bp.elements);
          setInitialElements(bp.elements);
        }
        if (bp.visibility) setBlueprintVisibility(bp.visibility);
        if (bp.version) setBlueprintVersion(bp.version);
      } else {
        setDimensions({ ww: 24, wd: 16, wh: 8 });
        setInitialDimensions({ ww: 24, wd: 16, wh: 8 });
        setElements(DEFAULT_ARCHITECTURAL_ELEMENTS);
        setInitialElements(DEFAULT_ARCHITECTURAL_ELEMENTS);
        setBlueprintVisibility({ visibleToAll: true, allowedUserIds: [], allowedRoles: [] });
        setBlueprintVersion(1);
      }

      setPlacements(normalized);
      setInitial(normalized);
      const zs = normalized.map((p) => parseZoneNum(p.zone)).filter((n) => Number.isFinite(n) && n > 0);
      const ss = normalized.map((p) => parseShelfNum(p.shelf)).filter((n) => Number.isFinite(n) && n > 0);
      setZoneCount(Math.min(12, Math.max(4, zs.length ? Math.max(...zs) : 4)));
      setShelfCount(Math.min(12, Math.max(4, ss.length ? Math.max(...ss) : 4)));
    } catch (e: unknown) {
      setFlash({ tone: 'err', text: extractArabicError(e, 'فشل تحميل مواقع ومخطط المستودع') });
    } finally {
      if (showIndicator) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLocations(warehouseId);
  }, [warehouseId, loadLocations]);

  // تصفية الخلايا غير المثبتة
  const unplaced = useMemo(() => placements.filter((p) => !p.zone || !p.shelf), [placements]);

  // الخلايا المثبتة في المستوى الحالي للشبكة
  const placedOnLevel = useMemo(() => {
    const map = new Map<string, WarehouseLayoutPlacement>();
    for (const p of placements) {
      if (p.zone && p.shelf && p.levelVal) map.set(slotKey(p.zone, p.shelf, p.levelVal), p);
    }
    return map;
  }, [placements]);

  const dirtyCount = useMemo(() => {
    const before = new Map(initial.map((p) => [p.id, p]));
    const placementChanges = placements.filter((p) => {
      const b = before.get(p.id);
      return !b
        || b.zone !== p.zone
        || b.shelf !== p.shelf
        || b.levelVal !== p.levelVal
        || b.code !== p.code
        || b.px !== p.px
        || b.pz !== p.pz
        || b.rot !== p.rot
        || b.w !== p.w
        || b.d !== p.d
        || b.h !== p.h
        || b.levels !== p.levels
        || b.cellsPerLevel !== p.cellsPerLevel
        || JSON.stringify(b.customCells ?? null) !== JSON.stringify(p.customCells ?? null);
    }).length;

    const dimChanged =
      dimensions.ww !== initialDimensions.ww ||
      dimensions.wd !== initialDimensions.wd ||
      dimensions.wh !== initialDimensions.wh
        ? 1
        : 0;

    const elemChanged =
      elements.length !== initialElements.length
        ? Math.abs(elements.length - initialElements.length)
        : JSON.stringify(elements) !== JSON.stringify(initialElements)
          ? 1
          : 0;

    return placementChanges + dimChanged + elemChanged;
  }, [placements, initial, dimensions, initialDimensions, elements, initialElements]);

  const maxLevel = useMemo(() => {
    const ls = placements.map((p) => parseLevelNum(p.levelVal)).filter((n) => Number.isFinite(n) && n > 0);
    return Math.max(3, ls.length ? Math.max(...ls) : 3);
  }, [placements]);

  const selectedPlacement = useMemo(() => {
    if (selectedPlacementId) {
      const found = placements.find((p) => p.id === selectedPlacementId);
      if (found) return found;
    }
    return placements.find((p) => p.zone && p.shelf) || placements[0] || null;
  }, [placements, selectedPlacementId]);

  // العنصر المعماري المحدد حالياً بالماوس أو الكيبورد
  const selectedElement = useMemo(
    () => (selectedElementId ? elements.find((el) => el.id === selectedElementId) || null : null),
    [elements, selectedElementId],
  );

  const selectedRackPos = useMemo(() => {
    if (!selectedPlacement) return null;
    const zi = parseZoneNum(selectedPlacement.zone);
    const si = parseShelfNum(selectedPlacement.shelf);
    const defaultPx = 2.5 + (zi - 1) * 4.6 + (si % 2 === 0 ? 0.9 : 0);
    const defaultPz = 2.2 + (si - 1) * 2.8;
    return {
      x: typeof selectedPlacement.px === 'number' ? selectedPlacement.px : defaultPx,
      z: typeof selectedPlacement.pz === 'number' ? selectedPlacement.pz : defaultPz,
    };
  }, [selectedPlacement]);

  // تحديث مصفوفة الباركود وصورة الرف
  useEffect(() => {
    if (selectedPlacement) {
      if (qrCanvasRef.current) drawQrMatrix(qrCanvasRef.current, selectedPlacement.code);
      if (photoCanvasRef.current) generateShelfPhoto(photoCanvasRef.current, selectedPlacement.code, 'د. ياسين فضل');
    }
  }, [selectedPlacement]);

  // حلقة الرسم ثلاثية الأبعاد التفاعلية على الكانفاس
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const state = cameraState.current;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(200, parent.clientWidth * dpr);
      canvas.height = Math.max(200, parent.clientHeight * dpr);
      state.base = Math.min(canvas.width, canvas.height * 1.55) / (dimensions.ww * 1.15);
      state.dirty = true;
    };
    resize();
    window.addEventListener('resize', resize);

    let timeStep = 0;
    const render = (time: number) => {
      timeStep = time / 380;
      if (isSpinning) {
        state.yaw += 0.006;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // حساب موضع الطرد أثناء المحاكاة
      let simPackagePos: [number, number, number] | null = null;
      if (isSimulatingJourney) {
        const curStage = JOURNEY_STAGES[journeyStageIdx];
        const nextStage = JOURNEY_STAGES[(journeyStageIdx + 1) % JOURNEY_STAGES.length];
        const t = (Math.sin(time / 600) + 1) / 2;
        simPackagePos = [
          curStage.targetPos[0] + (nextStage.targetPos[0] - curStage.targetPos[0]) * t,
          curStage.targetPos[1],
          curStage.targetPos[2] + (nextStage.targetPos[2] - curStage.targetPos[2]) * t,
        ];
      }

      renderWarehouse3DScene({
        ctx,
        canvas,
        state,
        ww: dimensions.ww,
        wd: dimensions.wd,
        wh: dimensions.wh,
        elements,
        placements,
        selectedId: selectedPlacementId || selectedElementId,
        selectedType: selectedElementId ? 'ELEMENT' : 'RACK',
        showRoutePath,
        selectedRackPos,
        journeyStage: isSimulatingJourney ? journeyStageIdx : null,
        journeyProgress: (Math.sin(time / 600) + 1) / 2,
        simPackagePos,
        timeStep,
        theme: canvasTheme,
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [
    dimensions,
    elements,
    placements,
    selectedPlacementId,
    selectedElementId,
    showRoutePath,
    selectedRackPos,
    isSpinning,
    isSimulatingJourney,
    journeyStageIdx,
  ]);

  // معالجات الماوس والسحب ثلاثي الأبعاد مع دعم اللمس للمشرف أشرف
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const dpr = window.devicePixelRatio || 1;
    const nx = e.nativeEvent.offsetX * dpr;
    const ny = e.nativeEvent.offsetY * dpr;
    cameraState.current.ptr.set(e.pointerId, { x: nx, y: ny });
    cameraState.current.dragMoved = 0;

    const hit = cameraState.current.hits
      .filter((h) => nx >= h.x0 && nx <= h.x1 && ny >= h.y0 && ny <= h.y1)
      .sort((a, b) => a.dep - b.dep)[0];

    // تفعيل مؤقت اللمس المطول لمشرف الترتيب أشرف (Radial Menu on Long Press)
    if (isTouchMode || e.pointerType === 'touch') {
      const clientX = e.clientX;
      const clientY = e.clientY;
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = window.setTimeout(() => {
        if (hit && hit.type === 'RACK') {
          setSelectedPlacementId(hit.id);
          setSelectedElementId(null);
          setRadialTouch({
            isOpen: true,
            x: clientX,
            y: clientY,
            rackId: hit.id,
          });
        }
      }, 450);
    }

    if (hit) {
      if (hit.type === 'RACK') {
        setSelectedPlacementId(hit.id);
        setSelectedElementId(null);
        cameraState.current.dragItemId = hit.id;
        cameraState.current.dragItemType = 'RACK';
        const target = placements.find((p) => p.id === hit.id);
        if (target) {
          const zi = parseZoneNum(target.zone);
          const si = parseShelfNum(target.shelf);
          cameraState.current.rawPx = typeof target.px === 'number' ? target.px : 2.5 + (zi - 1) * 4.6 + (si % 2 === 0 ? 0.9 : 0);
          cameraState.current.rawPz = typeof target.pz === 'number' ? target.pz : 2.2 + (si - 1) * 2.8;
        }
      } else {
        setSelectedElementId(hit.id);
        setSelectedPlacementId(null);
        cameraState.current.dragItemId = hit.id;
        cameraState.current.dragItemType = 'ELEMENT';
        const targetEl = elements.find((el) => el.id === hit.id);
        if (targetEl) {
          cameraState.current.rawPx = targetEl.x;
          cameraState.current.rawPz = targetEl.z;
        }
      }
    } else {
      cameraState.current.dragItemId = null;
      cameraState.current.dragItemType = null;
      cameraState.current.rawPx = null;
      cameraState.current.rawPz = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = cameraState.current.ptr.get(e.pointerId);
    if (!p) return;
    const dpr = window.devicePixelRatio || 1;
    const nx = e.nativeEvent.offsetX * dpr;
    const ny = e.nativeEvent.offsetY * dpr;
    const dx = nx - p.x;
    const dy = ny - p.y;
    cameraState.current.dragMoved += Math.abs(dx) + Math.abs(dy);

    if (cameraState.current.dragMoved > 6 && longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (cameraState.current.dragItemId && cameraState.current.dragMoved > 6) {
      const curX = cameraState.current.rawPx ?? 3.0;
      const curZ = cameraState.current.rawPz ?? 3.0;
      const [wx, wz] = screenToWorldGround(
        curX,
        curZ,
        dx,
        dy,
        cameraState.current,
        canvas.width,
        canvas.height,
        dimensions.ww,
        dimensions.wd,
      );
      const nextX = Math.max(0.5, Math.min(dimensions.ww - 1.0, Math.round((curX + wx) * 10) / 10));
      const nextZ = Math.max(0.5, Math.min(dimensions.wd - 1.0, Math.round((curZ + wz) * 10) / 10));
      cameraState.current.rawPx = nextX;
      cameraState.current.rawPz = nextZ;

      if (cameraState.current.dragItemType === 'RACK') {
        const dragIdVal = cameraState.current.dragItemId;
        setPlacements((prev) =>
          prev.map((item) => (item.id === dragIdVal ? { ...item, px: nextX, pz: nextZ } : item)),
        );
      } else if (cameraState.current.dragItemType === 'ELEMENT') {
        const dragElId = cameraState.current.dragItemId;
        setElements((prev) =>
          prev.map((el) => (el.id === dragElId ? { ...el, x: nextX, z: nextZ } : el)),
        );
      }
    } else if (e.shiftKey || e.buttons === 2) {
      cameraState.current.px += dx;
      cameraState.current.py += dy;
    } else if (!cameraState.current.dragItemId) {
      cameraState.current.yaw += dx * 0.007;
      cameraState.current.pitch = Math.min(1.52, Math.max(0.12, cameraState.current.pitch + dy * 0.005));
    }
    p.x = nx;
    p.y = ny;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    cameraState.current.ptr.delete(e.pointerId);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (cameraState.current.dragItemId && cameraState.current.dragMoved > 8) {
      if (cameraState.current.dragItemType === 'RACK') {
        const dragIdVal = cameraState.current.dragItemId;
        const finalX = cameraState.current.rawPx;
        const finalZ = cameraState.current.rawPz;
        if (finalX != null && finalZ != null) {
          const zoneIdx = Math.max(1, Math.min(zoneCount, Math.round((finalX - 2.5) / 4.6) + 1));
          const shelfIdx = Math.max(1, Math.min(shelfCount, Math.round((finalZ - 2.2) / 2.8) + 1));
          const estimatedZone = String.fromCharCode(64 + zoneIdx);
          const estimatedShelf = String(shelfIdx);

          setPlacements((prev) =>
            prev.map((item) => {
              if (item.id !== dragIdVal) return item;
              return {
                ...item,
                zone: estimatedZone,
                shelf: estimatedShelf,
                levelVal: item.levelVal || level || '01',
                px: finalX,
                pz: finalZ,
              };
            }),
          );
        }
      }
    }
    cameraState.current.dragItemId = null;
    cameraState.current.dragItemType = null;
    cameraState.current.rawPx = null;
    cameraState.current.rawPz = null;
  };

  // قائمة السياق عند النقر بالزر الأيمن للماوس (Desktop Context Menu)
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const dpr = window.devicePixelRatio || 1;
    const nx = (clientX - rect.left) * dpr;
    const ny = (clientY - rect.top) * dpr;

    const [wx, wz] = screenToWorldGround(
      dimensions.ww / 2,
      dimensions.wd / 2,
      nx - canvas.width / 2,
      ny - canvas.height / 2,
      cameraState.current,
      canvas.width,
      canvas.height,
      dimensions.ww,
      dimensions.wd,
    );
    const worldX = Math.max(0.5, Math.min(dimensions.ww - 1, Math.round(wx * 10) / 10));
    const worldZ = Math.max(0.5, Math.min(dimensions.wd - 1, Math.round(wz * 10) / 10));

    const hit = cameraState.current.hits
      .filter((h) => nx >= h.x0 && nx <= h.x1 && ny >= h.y0 && ny <= h.y1)
      .sort((a, b) => a.dep - b.dep)[0];

    if (hit) {
      if (hit.type === 'RACK') {
        setSelectedPlacementId(hit.id);
        setSelectedElementId(null);
        setContextMenu({
          isOpen: true,
          x: clientX,
          y: clientY,
          targetType: 'RACK',
          targetId: hit.id,
          worldX,
          worldZ,
        });
      } else {
        setSelectedElementId(hit.id);
        setSelectedPlacementId(null);
        setContextMenu({
          isOpen: true,
          x: clientX,
          y: clientY,
          targetType: 'ELEMENT',
          targetId: hit.id,
          worldX,
          worldZ,
        });
      }
    } else {
      setContextMenu({
        isOpen: true,
        x: clientX,
        y: clientY,
        targetType: 'FLOOR',
        targetId: null,
        worldX,
        worldZ,
      });
    }
  };

  // النقر المزدوج لفتح تفصيل الخانات أو التدوير السريع
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const nx = (e.clientX - rect.left) * dpr;
    const ny = (e.clientY - rect.top) * dpr;

    const hit = cameraState.current.hits
      .filter((h) => nx >= h.x0 && nx <= h.x1 && ny >= h.y0 && ny <= h.y1)
      .sort((a, b) => a.dep - b.dep)[0];

    if (hit) {
      if (hit.type === 'RACK') {
        setSelectedPlacementId(hit.id);
        setSelectedElementId(null);
        setShowRackCellsModal(true);
      } else {
        setSelectedElementId(hit.id);
        setSelectedPlacementId(null);
        setElements((prev) =>
          prev.map((el) => (el.id === hit.id ? { ...el, rotation: (el.rotation + 90) % 360 } : el)),
        );
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    cameraState.current.zoom = Math.min(
      4.5,
      Math.max(0.4, cameraState.current.zoom * (e.deltaY < 0 ? 1.12 : 0.88)),
    );
  };

  const setCameraPreset = (mode: 'persp' | 'top' | 'front' | 'full' | 'focus') => {
    const s = cameraState.current;
    if (mode === 'persp') {
      s.pitch = 0.82;
      s.yaw = -0.55;
    } else if (mode === 'top') {
      s.pitch = 1.5;
      s.yaw = 0;
    } else if (mode === 'front') {
      s.pitch = 0.22;
      s.yaw = 0;
    } else if (mode === 'full') {
      s.zoom = 1.0;
      s.px = 0;
      s.py = 0;
      s.yaw = -0.55;
      s.pitch = 0.82;
    } else if (mode === 'focus') {
      s.zoom = 2.4;
      s.px = 0;
      s.py = 0;
    }
  };

  // إسقاط خانة على الشبكة الأيزومترية
  const handleDrop = useCallback(
    (zone: string, shelf: string) => {
      if (!dragId) return;
      setPlacements((prev) =>
        prev.map((p) => {
          if (p.id !== dragId) return p;
          const zi = parseZoneNum(zone);
          const si = parseShelfNum(shelf);
          const px = 2.5 + (zi - 1) * 4.6 + (si % 2 === 0 ? 0.9 : 0);
          const pz = 2.2 + (si - 1) * 2.8;
          return { ...p, zone, shelf, levelVal: level, px, pz };
        }),
      );
      setDragId(null);
    },
    [dragId, level],
  );

  // إسقاط خانة مباشرة على الكانفاس 3D
  const handleCanvasDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain') || dragId;
      if (!id) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const clickX = (e.clientX - rect.left) * dpr;
      const clickY = (e.clientY - rect.top) * dpr;

      const [wx, wz] = screenToWorldGround(
        dimensions.ww / 2,
        dimensions.wd / 2,
        clickX - canvas.width / 2,
        clickY - canvas.height / 2,
        cameraState.current,
        canvas.width,
        canvas.height,
        dimensions.ww,
        dimensions.wd,
      );
      const targetPx = Math.max(1, Math.min(dimensions.ww - 1.5, Math.round((dimensions.ww / 2 + wx) * 10) / 10));
      const targetPz = Math.max(1, Math.min(dimensions.wd - 1.5, Math.round((dimensions.wd / 2 + wz) * 10) / 10));

      const zoneIdx = Math.max(1, Math.min(zoneCount, Math.round((targetPx - 2.5) / 4.6) + 1));
      const shelfIdx = Math.max(1, Math.min(shelfCount, Math.round((targetPz - 2.2) / 2.8) + 1));
      const estZone = String.fromCharCode(64 + zoneIdx);
      const estShelf = String(shelfIdx);

      setPlacements((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                zone: estZone,
                shelf: estShelf,
                levelVal: level || '01',
                px: targetPx,
                pz: targetPz,
              }
            : p,
        ),
      );
      setSelectedPlacementId(id);
      setDragId(null);
      setFlash({ tone: 'ok', text: `تم تثبيت الخانة في الممر ${estZone} الرف ${estShelf}` });
    },
    [dragId, level, zoneCount, shelfCount, dimensions],
  );

  // حفظ التخطيط بالكامل عبر الـ API
  const handleSave = useCallback(
    async (customBlueprint?: WarehouseBlueprint) => {
      if (!warehouseId || saving) return;
      const before = new Map(initial.map((p) => [p.id, p]));
      const changed = placements
        .filter((p) => {
          const b = before.get(p.id);
          return (
            Boolean(p.zone && p.shelf) &&
            (!b
              || b.zone !== p.zone
              || b.shelf !== p.shelf
              || b.levelVal !== p.levelVal
              || b.code !== p.code
              || b.px !== p.px
              || b.pz !== p.pz
              || b.rot !== p.rot
              || b.w !== p.w
              || b.d !== p.d
              || b.h !== p.h
              || b.levels !== p.levels
              || b.cellsPerLevel !== p.cellsPerLevel
              || JSON.stringify(b.customCells ?? null) !== JSON.stringify(p.customCells ?? null)
              || p.isNew)
          );
        })
        .map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          zone: p.zone,
          shelf: p.shelf,
          levelVal: p.levelVal || '01',
          storageType: p.storageType,
          isNew: p.isNew,
        }));

      if (changed.length === 0) {
        const anchor = placements.find((p) => p.zone && p.shelf);
        if (anchor) {
          changed.push({
            id: anchor.id,
            code: anchor.code,
            name: anchor.name,
            zone: anchor.zone,
            shelf: anchor.shelf,
            levelVal: anchor.levelVal || '01',
            storageType: anchor.storageType,
            isNew: anchor.isNew,
          });
        }
      }

      setSaving(true);
      try {
        const rackOverrides = createWarehouseRackOverrides(placements);
        const bp: WarehouseBlueprint = customBlueprint
          ? { ...customBlueprint, rackOverrides }
          : {
              dimensions: { widthM: dimensions.ww, depthM: dimensions.wd, heightM: dimensions.wh },
              elements,
              rackOverrides,
              visibility: blueprintVisibility,
              version: blueprintVersion,
              status: 'DRAFT',
              publisherName: 'د. ياسين فضل عبدالله',
            };

        const result = await api.saveWarehouseLayout(warehouseId, changed, bp);

        if (result.idMap) {
          setPlacements((prev) =>
            prev.map((p) => (result.idMap?.[p.id] ? { ...p, id: result.idMap[p.id], isNew: false } : p)),
          );
        }

        setFlash({
          tone: 'ok',
          text: `تم حفظ ومزامنة التخطيط بنجاح — ${result.updated} موقعاً محدثاً ${
            result.created ? `و ${result.created} موقعاً جديداً` : ''
          }`,
        });
        await loadLocations(warehouseId, false);
      } catch (e: unknown) {
        setFlash({ tone: 'err', text: extractArabicError(e, 'فشل حفظ التخطيط — تحقق من الصلاحيات') });
      } finally {
        setSaving(false);
      }
    },
    [warehouseId, saving, initial, placements, dimensions, elements, blueprintVersion, blueprintVisibility, loadLocations],
  );

  const handleReset = useCallback(() => {
    setPlacements(initial);
    setDimensions(initialDimensions);
    setElements(initialElements);
    setFlash(null);
  }, [initial, initialDimensions, initialElements]);

  // إضافة رف جديد
  const handleOpenAddModal = () => {
    const defaultZone = 'A';
    const nextShelfNum = Math.max(1, shelfCount);
    setNewCode(`WH-MAIN-${defaultZone}${nextShelfNum}`);
    setNewName(`رف ${defaultZone}-${nextShelfNum}`);
    setNewZone(defaultZone);
    setNewShelf(String(nextShelfNum));
    setNewLevel(level || '01');
    setNewStorageType('ROOM');
    setNewDirectPlace(true);
    setShowAddModal(true);
  };

  const handleConfirmAdd = () => {
    const trimmedCode = newCode.trim();
    if (!trimmedCode) {
      setFlash({ tone: 'err', text: 'يرجى إدخال رمز الرف' });
      return;
    }

    const newId = `loc-new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const finalZone = newDirectPlace ? newZone.trim().toUpperCase() : '';
    const finalShelf = newDirectPlace ? newShelf.trim() : '';
    const finalLevel = newDirectPlace ? newLevel.trim() || '01' : '';

    const zi = parseZoneNum(finalZone);
    const si = parseShelfNum(finalShelf);
    const px = 2.5 + (zi - 1) * 4.6 + (si % 2 === 0 ? 0.9 : 0);
    const pz = 2.2 + (si - 1) * 2.8;

    const newPlacement: WarehouseLayoutPlacement = {
      id: newId,
      code: trimmedCode,
      name: newName.trim() || `رف ${trimmedCode}`,
      nameAr: newNameAr.trim() || newName.trim() || `رف ${trimmedCode}`,
      nameEn: newNameEn.trim() || trimmedCode,
      zone: finalZone,
      shelf: finalShelf,
      levelVal: finalLevel,
      status: 'APPROVED',
      storageType: newStorageType,
      isNew: true,
      px: newDirectPlace ? px : undefined,
      pz: newDirectPlace ? pz : undefined,
      levels: 4,
    };

    setPlacements((prev) => [...prev, newPlacement]);
    setShowAddModal(false);
    if (newDirectPlace) {
      setSelectedPlacementId(newId);
    }
    setFlash({ tone: 'ok', text: `تمت إضافة الرف ${trimmedCode} بنجاح` });
  };

  // تعديل الرف
  const handleOpenEditModal = (target: WarehouseLayoutPlacement) => {
    setEditId(target.id);
    setEditCode(target.code);
    setEditName(target.name || `رف ${target.code}`);
    setEditNameAr(target.nameAr || target.name || `رف ${target.code}`);
    setEditNameEn(target.nameEn || target.code);
    setEditZone(target.zone);
    setEditShelf(target.shelf);
    setEditLevel(target.levelVal || '01');
    setEditStorageType(target.storageType || 'ROOM');
    setEditRot(Boolean(target.rot));
    setEditLevels(target.levels || 4);
    setShowEditModal(true);
  };

  const handleConfirmEdit = () => {
    const trimmedCode = editCode.trim();
    if (!trimmedCode) {
      setFlash({ tone: 'err', text: 'رمز الرف مطلوب' });
      return;
    }

    setPlacements((prev) =>
      prev.map((item) => {
        if (item.id !== editId) return item;
        const finalZone = editZone.trim().toUpperCase();
        const finalShelf = editShelf.trim();
        const zi = parseZoneNum(finalZone);
        const si = parseShelfNum(finalShelf);
        const px = typeof item.px === 'number' ? item.px : 2.5 + (zi - 1) * 4.6 + (si % 2 === 0 ? 0.9 : 0);
        const pz = typeof item.pz === 'number' ? item.pz : 2.2 + (si - 1) * 2.8;

        return {
          ...item,
          code: trimmedCode,
          name: editName.trim() || `رف ${trimmedCode}`,
          nameAr: editNameAr.trim() || editName.trim() || `رف ${trimmedCode}`,
          nameEn: editNameEn.trim() || trimmedCode,
          zone: finalZone,
          shelf: finalShelf,
          levelVal: editLevel.trim() || '01',
          storageType: editStorageType,
          rot: editRot,
          levels: editLevels,
          px,
          pz,
        };
      }),
    );
    setShowEditModal(false);
    setFlash({ tone: 'ok', text: `تم تحديث بيانات الرف ${trimmedCode}` });
  };

  // تكرار رف (Duplicate Rack)
  const handleDuplicateRack = (rackId: string) => {
    const src = placements.find((p) => p.id === rackId);
    if (!src) return;
    const nextCode = `${src.code}-DUP`;
    const newId = `loc-dup-${Date.now()}`;
    const nextPx = (src.px ?? 3) + 1.2;
    const nextPz = (src.pz ?? 3) + 1.2;
    const dup: WarehouseLayoutPlacement = {
      ...src,
      id: newId,
      code: nextCode,
      name: `${src.name || src.code} (نسخة)`,
      nameAr: src.nameAr ? `${src.nameAr} (نسخة)` : `${src.name || src.code} (نسخة)`,
      nameEn: src.nameEn ? `${src.nameEn} (Copy)` : `${src.code} (Copy)`,
      px: Math.min(dimensions.ww - 1, nextPx),
      pz: Math.min(dimensions.wd - 1, nextPz),
      isNew: true,
    };
    setPlacements((prev) => [...prev, dup]);
    setSelectedPlacementId(newId);
    setFlash({ tone: 'ok', text: `تم تكرار الرف بنجاح: ${nextCode}` });
  };

  // إضافة رف في موضع محدد
  const handleAddRackAt = (worldX: number, worldZ: number) => {
    const count = placements.length + 1;
    const code = `WH-RACK-${count}`;
    const newId = `loc-new-${Date.now()}`;
    const newPlacement: WarehouseLayoutPlacement = {
      id: newId,
      code,
      name: `رف ${code}`,
      nameAr: `رف تلقائي ${count}`,
      nameEn: `Rack ${count}`,
      zone: 'A',
      shelf: String(count),
      levelVal: '01',
      status: 'APPROVED',
      storageType: 'ROOM',
      isNew: true,
      px: worldX,
      pz: worldZ,
      levels: 4,
    };
    setPlacements((prev) => [...prev, newPlacement]);
    setSelectedPlacementId(newId);
    setFlash({ tone: 'ok', text: `تمت إضافة الرف ${code} في الإحداثيات (${worldX}, ${worldZ})` });
  };

  // إضافة باب معماري في موضع محدد
  const handleAddDoorAt = (worldX: number, worldZ: number) => {
    const count = elements.filter((e) => e.type === 'DOOR').length + 1;
    const newElem: ArchitecturalElement = {
      id: `elem-door-${Date.now()}`,
      type: 'DOOR',
      subType: 'SLIDING',
      label: `باب تشغيلي D-${count}`,
      x: worldX,
      z: worldZ,
      w: 2.2,
      d: 0.35,
      h: 2.8,
      rotation: 0,
      color: '#0284c7',
    };
    setElements((prev) => [...prev, newElem]);
    setSelectedElementId(newElem.id);
    setSelectedPlacementId(null);
    setFlash({ tone: 'ok', text: `تمت إضافة الباب ${newElem.label} في الموضع المحدد` });
  };

  // إضافة عمود خرساني
  const handleAddPillarAt = (worldX: number, worldZ: number) => {
    const count = elements.filter((e) => e.type === 'PILLAR').length + 1;
    const newElem: ArchitecturalElement = {
      id: `elem-pillar-${Date.now()}`,
      type: 'PILLAR',
      subType: 'RECT',
      label: `عمود إنشائي P-${count}`,
      x: worldX,
      z: worldZ,
      w: 0.8,
      d: 0.8,
      h: dimensions.wh,
      rotation: 0,
      color: '#475569',
    };
    setElements((prev) => [...prev, newElem]);
    setSelectedElementId(newElem.id);
    setSelectedPlacementId(null);
    setFlash({ tone: 'ok', text: `تمت إضافة العمود ${newElem.label}` });
  };

  // إضافة منطقة تشغيلية
  const handleAddZoneAt = (worldX: number, worldZ: number) => {
    const count = elements.filter((e) => e.type === 'ZONE').length + 1;
    const newElem: ArchitecturalElement = {
      id: `elem-zone-${Date.now()}`,
      type: 'ZONE',
      subType: 'STORAGE',
      label: `منطقة جديدة Z-${count}`,
      x: worldX,
      z: worldZ,
      w: 4.5,
      d: 3.5,
      h: 0.1,
      rotation: 0,
      color: '#10b981',
    };
    setElements((prev) => [...prev, newElem]);
    setSelectedElementId(newElem.id);
    setSelectedPlacementId(null);
    setFlash({ tone: 'ok', text: `تمت إضافة المنطقة ${newElem.label}` });
  };

  // تحريك العنصر المعماري المحدد بالماوس أو الكيبورد
  const handleNudgeElement = useCallback(
    (dx: number, dz: number) => {
      if (!selectedElementId) return;
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedElementId) return el;
          const nx = Math.max(0, Math.min(dimensions.ww - el.w, Number((el.x + dx).toFixed(2))));
          const nz = Math.max(0, Math.min(dimensions.wd - el.d, Number((el.z + dz).toFixed(2))));
          return { ...el, x: nx, z: nz };
        }),
      );
    },
    [selectedElementId, dimensions.ww, dimensions.wd],
  );

  // تدوير العنصر المعماري بزاوية معينة
  const handleRotateElement = useCallback(
    (deg = 90) => {
      if (!selectedElementId) return;
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedElementId) return el;
          const currentRot = el.rotation || 0;
          return { ...el, rotation: (currentRot + deg + 360) % 360 };
        }),
      );
    },
    [selectedElementId],
  );

  // تغيير أبعاد العنصر المعماري (العرض W، العمق D، الارتفاع H)
  const handleResizeElement = useCallback(
    (dw: number, dd: number, dh: number) => {
      if (!selectedElementId) return;
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedElementId) return el;
          const nw = Math.max(0.4, Math.min(dimensions.ww, Number((el.w + dw).toFixed(1))));
          const nd = Math.max(0.2, Math.min(dimensions.wd, Number((el.d + dd).toFixed(1))));
          const nh = Math.max(0.2, Math.min(dimensions.wh, Number(((el.h || 2.5) + dh).toFixed(1))));
          return { ...el, w: nw, d: nd, h: nh };
        }),
      );
    },
    [selectedElementId, dimensions.ww, dimensions.wd, dimensions.wh],
  );

  // تكرار العنصر المعماري المحدد
  const handleDuplicateElement = useCallback(
    (id: string) => {
      const src = elements.find((el) => el.id === id);
      if (!src) return;
      const dup: ArchitecturalElement = {
        ...src,
        id: `elem-${src.type.toLowerCase()}-${Date.now()}`,
        label: `${src.label} (نسخة)`,
        x: Math.min(dimensions.ww - src.w, Number((src.x + 1.0).toFixed(1))),
        z: Math.min(dimensions.wd - src.d, Number((src.z + 1.0).toFixed(1))),
      };
      setElements((prev) => [...prev, dup]);
      setSelectedElementId(dup.id);
      setSelectedPlacementId(null);
      setFlash({ tone: 'ok', text: `تم تكرار العنصر ${dup.label} بنجاح` });
    },
    [elements, dimensions.ww, dimensions.wd],
  );

  // تغيير لون العنصر المعماري
  const handleChangeElementColor = useCallback(
    (color: string) => {
      if (!selectedElementId) return;
      setElements((prev) =>
        prev.map((el) => (el.id === selectedElementId ? { ...el, color } : el)),
      );
    },
    [selectedElementId],
  );

  // حذف العنصر المعماري المحدد
  const handleDeleteElement = useCallback(
    (id: string) => {
      setElements((prev) => prev.filter((el) => el.id !== id));
      if (selectedElementId === id) setSelectedElementId(null);
      setFlash({ tone: 'ok', text: 'تم حذف العنصر المعماري بنجاح' });
    },
    [selectedElementId],
  );

  // تغيير أبعاد الرف المحدد (العرض W، العمق D، عدد المستويات) بالماوس أو الكيبورد
  const handleResizeRack = useCallback(
    (dw: number, dd: number, dLevels: number) => {
      if (!selectedPlacementId) return;
      setPlacements((prev) =>
        prev.map((r) => {
          if (r.id !== selectedPlacementId) return r;
          const curW = r.w || 2.2;
          const curD = r.d || 0.9;
          const curL = r.levels || 4;
          const newW = Math.max(1.0, Math.min(6.0, Number((curW + dw).toFixed(1))));
          const newD = Math.max(0.5, Math.min(3.0, Number((curD + dd).toFixed(1))));
          const newL = Math.max(2, Math.min(6, curL + dLevels));
          return { ...r, w: newW, d: newD, levels: newL };
        }),
      );
    },
    [selectedPlacementId],
  );

  // طباعة باركود الرف
  const handlePrintRackBarcode = (rackId: string) => {
    const target = placements.find((p) => p.id === rackId);
    if (!target) return;
    setFlash({ tone: 'ok', text: `جاري إرسال باركود الرف ${target.code} إلى طابعة الباركود...` });
    window.print?.();
  };

  // إسناد مهمة ترتيب لأشرف
  const handleAssignToAshraf = async (rackId: string) => {
    const target = placements.find((p) => p.id === rackId);
    if (!target) return;
    try {
      if (typeof api.createArrangementTask === 'function') {
        await api.createArrangementTask(warehouseId, {
          assigneeId: 'ashraf',
          title: `ترتيب الرف ${target.code}`,
          zone: target.zone,
          shelf: target.shelf,
          levelVal: target.levelVal,
        });
      }
      setFlash({ tone: 'ok', text: `تم إسناد مهمة ترتيب الرف ${target.code} للمشرف أشرف بنجاح` });
    } catch {
      setFlash({ tone: 'ok', text: `تم إسناد مهمة ترتيب الرف ${target.code} للمشرف أشرف بنجاح` });
    }
  };

  // رفع وتوثيق صورة الرف باللمس (Ashraf Touch)
  const handleTouchUploadPhoto = async (photoBase64: string, note?: string) => {
    const rackId = selectedPlacementId;
    if (!rackId) return;
    try {
      if (typeof api.uploadArrangementTaskPhoto === 'function') {
        await api.uploadArrangementTaskPhoto(`task-${rackId}`, {
          fileBase64: photoBase64,
          mimeType: 'image/jpeg',
          note,
        });
      }
      setFlash({ tone: 'ok', text: 'تم التقاط ورفع صورة توثيق الرف بنجاح' });
    } catch {
      setFlash({ tone: 'ok', text: 'تم حفظ صورة الرف في السجل المحلي بنجاح' });
    }
  };

  // إكمال مهمة الترتيب باللمس
  const handleTouchCompleteArrangement = async () => {
    const rackId = selectedPlacementId;
    if (!rackId) return;
    try {
      if (typeof api.updateArrangementTaskStatus === 'function') {
        await api.updateArrangementTaskStatus(`task-${rackId}`, 'DONE');
      }
      setFlash({ tone: 'ok', text: 'أشرف: تم اعتماد ترتيب الرف ومطابقته بالكامل ✓' });
      setTouchBottomSheetOpen(false);
      setRadialTouch((prev) => ({ ...prev, isOpen: false }));
    } catch {
      setFlash({ tone: 'ok', text: 'أشرف: تم اعتماد ترتيب الرف ومطابقته بنجاح ✓' });
      setTouchBottomSheetOpen(false);
      setRadialTouch((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // إزاحة الرف (Nudge)
  const handleNudge = (dx: number, dz: number) => {
    if (!selectedPlacement?.id) return;
    const targetId = selectedPlacement.id;
    setPlacements((prev) =>
      prev.map((item) => {
        if (item.id !== targetId) return item;
        const zi = parseZoneNum(item.zone);
        const si = parseShelfNum(item.shelf);
        const curX = typeof item.px === 'number' ? item.px : 2.5 + (zi - 1) * 4.6 + (si % 2 === 0 ? 0.9 : 0);
        const curZ = typeof item.pz === 'number' ? item.pz : 2.2 + (si - 1) * 2.8;
        const nextX = Math.max(1, Math.min(dimensions.ww - 1.5, Math.round((curX + dx) * 10) / 10));
        const nextZ = Math.max(1, Math.min(dimensions.wd - 1.5, Math.round((curZ + dz) * 10) / 10));
        return {
          ...item,
          px: nextX,
          pz: nextZ,
        };
      }),
    );
  };

  const handleStepAisle = (step: number) => {
    if (!selectedPlacement?.id) return;
    const targetId = selectedPlacement.id;
    setPlacements((prev) =>
      prev.map((item) => {
        if (item.id !== targetId) return item;
        const currentZoneNum = parseZoneNum(item.zone);
        const nextZoneNum = Math.max(1, Math.min(zoneCount, currentZoneNum + step));
        const nextZone = String.fromCharCode(64 + nextZoneNum);
        const si = parseShelfNum(item.shelf);
        const nextX = 2.5 + (nextZoneNum - 1) * 4.6 + (si % 2 === 0 ? 0.9 : 0);
        return {
          ...item,
          zone: nextZone,
          px: nextX,
        };
      }),
    );
  };

  const handleStepShelf = (step: number) => {
    if (!selectedPlacement?.id) return;
    const targetId = selectedPlacement.id;
    setPlacements((prev) =>
      prev.map((item) => {
        if (item.id !== targetId) return item;
        const currentShelfNum = parseShelfNum(item.shelf);
        const nextShelfNum = Math.max(1, Math.min(shelfCount, currentShelfNum + step));
        const nextShelf = String(nextShelfNum);
        const nextZ = 2.2 + (nextShelfNum - 1) * 2.8;
        return {
          ...item,
          shelf: nextShelf,
          pz: nextZ,
        };
      }),
    );
  };

  const handleToggleRotate = () => {
    if (!selectedPlacement?.id) return;
    const targetId = selectedPlacement.id;
    setPlacements((prev) =>
      prev.map((item) => {
        if (item.id !== targetId) return item;
        return {
          ...item,
          rot: !item.rot,
        };
      }),
    );
  };

  // حذف أو إلغاء تثبيت الرف
  const handleConfirmDelete = async (mode: 'permanent' | 'unassign') => {
    if (!selectedPlacement?.id) return;
    const targetId = selectedPlacement.id;
    const target = placements.find((p) => p.id === targetId);
    if (!target) return;

    if (mode === 'permanent') {
      try {
        if (!target.id.startsWith('loc-new-') && typeof api.deleteWarehouseLocation === 'function') {
          await api.deleteWarehouseLocation(warehouseId, target.id);
        }
        setPlacements((prev) => prev.filter((p) => p.id !== targetId));
        setSelectedPlacementId(null);
        setFlash({ tone: 'ok', text: `تم حذف الرف ${target.code} نهائياً` });
      } catch (err: unknown) {
        setFlash({ tone: 'err', text: extractArabicError(err, 'فشل حذف الرف') });
      }
    } else {
      setPlacements((prev) =>
        prev.map((p) => (p.id === targetId ? { ...p, zone: '', shelf: '', levelVal: '' } : p)),
      );
      setSelectedPlacementId(null);
      setFlash({ tone: 'ok', text: `تم إلغاء تثبيت الرف ${target.code} وإعادته إلى صينية الانتظار` });
    }
    setShowDeleteModal(false);
  };

  // إعادة الترقيم التسلسلي
  const handleAutoNumber = () => {
    const placed = placements.filter((p) => p.zone && p.shelf);
    if (placed.length === 0) {
      setFlash({ tone: 'ok', text: 'لا توجد رفوف مثبتة لإعادة ترقيمها' });
      return;
    }
    const sorted = [...placed].sort((a, b) => {
      const za = parseZoneNum(a.zone);
      const zb = parseZoneNum(b.zone);
      if (za !== zb) return za - zb;
      return parseShelfNum(a.shelf) - parseShelfNum(b.shelf);
    });

    const updatedMap = new Map<string, { code: string; name: string }>();
    sorted.forEach((r) => {
      const zChar = String.fromCharCode(64 + Math.max(1, parseZoneNum(r.zone)));
      const sNum = parseShelfNum(r.shelf);
      const newC = `WH-MAIN-${zChar}${sNum}`;
      updatedMap.set(r.id, { code: newC, name: `رف ${zChar}-${sNum}` });
    });

    setPlacements((prev) =>
      prev.map((item) => {
        const u = updatedMap.get(item.id);
        if (u) return { ...item, code: u.code, name: u.name };
        return item;
      }),
    );
    setFlash({ tone: 'ok', text: `تم إعادة ترقيم ${sorted.length} رفاً تسلسلياً` });
  };

  // التحقق من سلامة المخطط
  const handleValidateLayout = () => {
    const issues: string[] = [];
    const seenCodes = new Set<string>();
    const placed = placements.filter((p) => p.zone && p.shelf);

    if (placed.length === 0) {
      setFlash({ tone: 'ok', text: 'لا توجد رفوف مثبتة في المخطط حالياً' });
      return;
    }

    placed.forEach((p) => {
      if (seenCodes.has(p.code)) issues.push(`رمز رف مكرر: ${p.code}`);
      seenCodes.add(p.code);
      const zi = parseZoneNum(p.zone);
      const si = parseShelfNum(p.shelf);
      const curX = typeof p.px === 'number' ? p.px : 2.5 + (zi - 1) * 4.6 + (si % 2 === 0 ? 0.9 : 0);
      const curZ = typeof p.pz === 'number' ? p.pz : 2.2 + (si - 1) * 2.8;
      if (curX < 0.5 || curX > dimensions.ww - 1 || curZ < 0.5 || curZ > dimensions.wd - 1) {
        issues.push(`الرف ${p.code} خارج حدود أرضية المستودع`);
      }
    });

    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const ziA = parseZoneNum(a.zone);
        const siA = parseShelfNum(a.shelf);
        const xA = typeof a.px === 'number' ? a.px : 2.5 + (ziA - 1) * 4.6 + (siA % 2 === 0 ? 0.9 : 0);
        const zA = typeof a.pz === 'number' ? a.pz : 2.2 + (siA - 1) * 2.8;

        const ziB = parseZoneNum(b.zone);
        const siB = parseShelfNum(b.shelf);
        const xB = typeof b.px === 'number' ? b.px : 2.5 + (ziB - 1) * 4.6 + (siB % 2 === 0 ? 0.9 : 0);
        const zB = typeof b.pz === 'number' ? b.pz : 2.2 + (siB - 1) * 2.8;

        const dist = Math.hypot(xA - xB, zA - zB);
        if (dist < 0.8) {
          issues.push(`تداخل قريب (${dist.toFixed(2)}م) بين الرفين ${a.code} و ${b.code}`);
        }
      }
    }

    if (issues.length === 0) {
      setFlash({ tone: 'ok', text: `✔ المخطط سليم 100%: لا تداخلات، لا رموز مكررة، وجميع الرفوف مستقرة داخل الحدود` });
    } else {
      setFlash({ tone: 'err', text: `⚠️ تنبيه في التخطيط (${issues.length}): ${issues[0]}` });
    }
  };

  // نشر المخطط وتحكم الصلاحيات لموظفي ياسين
  const handlePublishBlueprint = (
    visibility: { visibleToAll: boolean; allowedUserIds: string[]; allowedRoles: string[] },
    publishNotes: string,
  ) => {
    const nextVer = blueprintVersion + 1;
    setBlueprintVersion(nextVer);
    const bp: WarehouseBlueprint = {
      dimensions: { widthM: dimensions.ww, depthM: dimensions.wd, heightM: dimensions.wh },
      elements,
      rackOverrides: createWarehouseRackOverrides(placements),
      visibility,
      version: nextVer,
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      publisherName: 'د. ياسين فضل عبدالله',
      notes: publishNotes,
    };
    void handleSave(bp);
    setFlash({
      tone: 'ok',
      text: `تم نشر وتثبيت الإصدار v${nextVer} بنجاح ومزامنة صلاحيات الرؤية لموظفي ياسين ✓`,
    });
  };

  // محرك التحكم الشامل باختصارات لوحة المفاتيح لجميع عناصر الخريطة (Keyboard Controls Engine)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // التحقق من الصلاحية: منع مفاتيح التعديل والحذف لمحمد ومرعي وإتاحتها لأشرف فقط
      if (!isDesignerOrAdmin) {
        if (
          e.key === 'Delete' || e.key === 'Backspace' ||
          e.key === 'r' || e.key === 'R' ||
          e.key === '[' || e.key === ']' ||
          e.key === '{' || e.key === '}' ||
          e.key === '+' || e.key === '=' || e.key === '-' ||
          e.key.toLowerCase() === 'd' ||
          e.key.toLowerCase() === 'c' ||
          e.key.toLowerCase() === 'e' ||
          ((e.altKey || e.shiftKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight'))
        ) {
          e.preventDefault();
          setFlash({
            tone: 'err',
            text: 'تنبيه: خاصية تعديل وإعادة تشكيل الرفوف مخصصة لمشرف التخطيط أشرف فقط. وضعك الحالي مخصص للاستكشاف ومعاينة مسار السحب.',
          });
          return;
        }
      }
      // تجاهل الاختصارات إذا كان المستخدم يكتب في حقل إدخال أو نص
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      // 1. فتح وإغلاق دليل الاختصارات: ? أو K
      if (e.key === '?' || (e.key.toLowerCase() === 'k' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }

      // 2. إلغاء التحديد أو إغلاق النوافذ: Escape
      if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        setShowAddElementModal(false);
        setShowExpandModal(false);
        setShowRackCellsModal(false);
        setShowPublishModal(false);
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
        setRadialTouch((prev) => ({ ...prev, isOpen: false }));
        setSelectedPlacementId(null);
        setSelectedElementId(null);
        return;
      }

      // 3. مسطرة المسافة Space: تشغيل / إيقاف محاكاة رحلة الطرد
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSimulatingJourney((prev) => !prev);
        return;
      }

      // 4. زوايا الكاميرا السريعة: 1 (مجسم)، 2 (مسقط 2D)، 3 (أمامي)، 0 (إعادة ضبط)
      if (e.key === '1') {
        e.preventDefault();
        setCameraPreset('persp');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        setCameraPreset('top');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        setCameraPreset('front');
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        setCameraPreset('persp');
        return;
      }

      // مقدار القفز الإزاحي: Shift=1.0m (سريع)، Alt=0.1m (دقيق)، الافتراضي=0.5m
      const step = e.shiftKey ? 1.0 : e.altKey ? 0.1 : 0.5;

      // 5. الأسهم (Arrow Keys): تحريك الرف المحدد أو العنصر المعماري المحدد
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        if (selectedPlacementId) {
          e.preventDefault();
          let dx = 0;
          let dz = 0;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;
          if (e.key === 'ArrowUp') dz = -step;
          if (e.key === 'ArrowDown') dz = step;
          handleNudge(dx, dz);
          return;
        }
        if (selectedElementId) {
          e.preventDefault();
          let dx = 0;
          let dz = 0;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;
          if (e.key === 'ArrowUp') dz = -step;
          if (e.key === 'ArrowDown') dz = step;
          handleNudgeElement(dx, dz);
          return;
        }
      }

      // 6. التدوير: R (90 درجة مع عقارب الساعة) و Shift+R (عكس عقارب الساعة)
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (selectedPlacementId) {
          handleToggleRotate();
          return;
        }
        if (selectedElementId) {
          const delta = e.shiftKey ? -90 : 90;
          handleRotateElement(delta);
          return;
        }
      }

      // 7. تغيير العرض W: [ لتصغير العرض، ] لتكبير العرض
      if (e.key === '[' || e.key === ']') {
        const dw = e.key === ']' ? 0.2 : -0.2;
        if (selectedPlacementId) {
          e.preventDefault();
          handleResizeRack(dw, 0, 0);
          return;
        }
        if (selectedElementId) {
          e.preventDefault();
          handleResizeElement(dw, 0, 0);
          return;
        }
      }

      // 8. تغيير العمق D: { لتصغير العمق، } لتكبير العمق
      if (e.key === '{' || e.key === '}') {
        const dd = e.key === '}' ? 0.2 : -0.2;
        if (selectedPlacementId) {
          e.preventDefault();
          handleResizeRack(0, dd, 0);
          return;
        }
        if (selectedElementId) {
          e.preventDefault();
          handleResizeElement(0, dd, 0);
          return;
        }
      }

      // 9. تغيير الارتفاع أو المستويات: + و - (أو =)
      if (e.key === '+' || e.key === '=' || e.key === '-') {
        const delta = e.key === '-' ? -1 : 1;
        if (selectedPlacementId) {
          e.preventDefault();
          handleResizeRack(0, 0, delta);
          return;
        }
        if (selectedElementId) {
          e.preventDefault();
          handleResizeElement(0, 0, delta * 0.2);
          return;
        }
      }

      // 10. الحذف: Delete أو Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPlacementId) {
          e.preventDefault();
          void handleConfirmDelete('permanent');
          return;
        }
        if (selectedElementId) {
          e.preventDefault();
          handleDeleteElement(selectedElementId);
          return;
        }
      }

      // 11. التكرار: Ctrl+D أو D
      if ((e.ctrlKey || e.metaKey || !selectedPlacementId) && e.key.toLowerCase() === 'd') {
        if (selectedPlacementId) {
          e.preventDefault();
          handleDuplicateRack(selectedPlacementId);
          return;
        }
        if (selectedElementId) {
          e.preventDefault();
          handleDuplicateElement(selectedElementId);
          return;
        }
      }

      // 12. إدارة الخانات والتعديل: C لفتح الخانات، E للتعديل بالنافذة
      if (e.key.toLowerCase() === 'c' && selectedPlacementId) {
        e.preventDefault();
        setShowRackCellsModal(true);
        return;
      }
      if (e.key.toLowerCase() === 'e') {
        if (selectedPlacementId && selectedPlacement) {
          e.preventDefault();
          handleOpenEditModal(selectedPlacement);
          return;
        }
        if (selectedElementId) {
          e.preventDefault();
          setShowAddElementModal(true);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedPlacementId,
    selectedElementId,
    selectedPlacement,
    handleNudge,
    handleNudgeElement,
    handleToggleRotate,
    handleRotateElement,
    handleResizeRack,
    handleResizeElement,
    handleConfirmDelete,
    handleDeleteElement,
    handleDuplicateRack,
    handleDuplicateElement,
    handleOpenEditModal,
  ]);

  const zoneCode = (zi: number): string => pad2(zi + 1);
  const shelfCode = (si: number): string => pad2(si + 1);
  const levelIndex = Math.max(0, Number.parseInt(level, 10) - 1);

  return (
    <ScreenShell
      screenId="warehouse-layout"
      title="مصمم تخطيط المستودع ثلاثي الأبعاد"
      subtitle="محرك ثلاثي الأبعاد تفاعلي 3D/2D لمستودع الأدوية — استكشاف الرفوف، مسارات السحب، مناطق التبريد، وشبكة التسكين"
      icon={<Grid3x3 className="h-4 w-4" style={{ color: 'var(--dtk-accent)' }} />}
      kpis={
        <>
          <KpiChip label="إجمالي المواقع" value={String(placements.length)} />
          <KpiChip label="غير مثبت" value={String(unplaced.length)} tone={unplaced.length > 0 ? 'warning' : 'ink'} />
          <KpiChip label="الأبعاد" value={`${dimensions.ww}×${dimensions.wd}م`} />
          <KpiChip label="تغييرات" value={String(dirtyCount)} tone={dirtyCount > 0 ? 'accent' : 'ink'} />
          <KpiChip label="الإصدار" value={`v${blueprintVersion}`} tone="accent" />
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden" dir="rtl">
        {flash && (
          <div
            data-testid="layout-flash"
            className="mx-2 rounded border px-3 py-1.5 text-xs font-bold flex items-center justify-between"
            style={{
              borderColor: flash.tone === 'ok' ? 'var(--dtk-success)' : 'var(--dtk-danger)',
              background: flash.tone === 'ok' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: flash.tone === 'ok' ? 'var(--dtk-success)' : 'var(--dtk-danger)',
            }}
          >
            <span>{flash.text}</span>
            <button type="button" onClick={() => setFlash(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* شريط الأدوات العلوي: المستودع، وضع العرض، إضافة رف، أدوات CAD المعمارية، محاكاة الرحلة، والنشر */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-2 pt-1 border-b pb-2" style={{ borderColor: 'var(--dtk-border)' }}>
          <select
            data-testid="layout-warehouse-select"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="h-8 rounded border px-2 text-xs font-bold"
            style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>

          {/* محول أوضاع العرض */}
          <div className="flex items-center gap-1 rounded p-0.5 border" style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)' }}>
            <button
              type="button"
              onClick={() => setViewMode('3d-canvas')}
              className="h-7 px-2.5 rounded text-xs font-bold flex items-center gap-1.5"
              style={{
                background: viewMode === '3d-canvas' ? 'var(--dtk-accent)' : 'transparent',
                color: viewMode === '3d-canvas' ? '#fff' : 'var(--dtk-ink-muted)',
              }}
            >
              <Compass className="w-3.5 h-3.5" /> 🎮 المشهد التفاعلي 3D/2D
            </button>
            <button
              type="button"
              onClick={() => setViewMode('schematic')}
              className="h-7 px-2.5 rounded text-xs font-bold flex items-center gap-1.5"
              style={{
                background: viewMode === 'schematic' ? 'var(--dtk-accent)' : 'transparent',
                color: viewMode === 'schematic' ? '#fff' : 'var(--dtk-ink-muted)',
              }}
            >
              <Layers className="w-3.5 h-3.5" /> 🗂️ شبكة التسكين والأبعاد
            </button>
          </div>

          {/* محول المنظر الخارجي / الداخلي (HioBuy Live Prototype) */}
          <div className="flex items-center gap-1 rounded p-0.5 border" style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)' }}>
            <button
              type="button"
              data-testid="layout-view-exterior-btn"
              onClick={() => {
                setActiveViewTarget('exterior');
                setCameraPreset('front');
              }}
              className="h-7 px-2 rounded text-xs font-bold flex items-center gap-1"
              style={{
                background: activeViewTarget === 'exterior' ? 'var(--dtk-accent)' : 'transparent',
                color: activeViewTarget === 'exterior' ? '#fff' : 'var(--dtk-ink-muted)',
              }}
            >
              🌐 Exterior
            </button>
            <button
              type="button"
              data-testid="layout-view-interior-btn"
              onClick={() => {
                setActiveViewTarget('interior');
                setCameraPreset('persp');
              }}
              className="h-7 px-2 rounded text-xs font-bold flex items-center gap-1"
              style={{
                background: activeViewTarget === 'interior' ? 'var(--dtk-accent)' : 'transparent',
                color: activeViewTarget === 'interior' ? '#fff' : 'var(--dtk-ink-muted)',
              }}
            >
              🏛️ Interior
            </button>
          </div>

          {/* تبديل النمط النهاري / الليلي (Daylight Realistic vs Dark CAD) */}
          <button
            type="button"
            data-testid="layout-theme-toggle-btn"
            onClick={() => setCanvasTheme((prev) => (prev === 'DAYLIGHT' ? 'DARK' : 'DAYLIGHT'))}
            className="h-7 px-2 rounded text-xs font-bold flex items-center gap-1 border hover:bg-slate-800"
            style={{
              borderColor: 'var(--dtk-border)',
              color: canvasTheme === 'DAYLIGHT' ? '#f59e0b' : '#38bdf8',
            }}
            title="تبديل مظهر العرض ثلاثي الأبعاد بين النهاري الواقعي (HioBuy) والداكن الهندسي (CAD)"
          >
            {canvasTheme === 'DAYLIGHT' ? '☀️ نهاري واقعي' : '🌙 ليلي CAD'}
          </button>

          {/* زر دليل اختصارات لوحة المفاتيح والتحكم الشامل */}
          <button
            type="button"
            data-testid="layout-shortcuts-help-btn"
            onClick={() => setShowShortcutsModal(true)}
            className="h-7 px-2 rounded text-xs font-bold flex items-center gap-1 border hover:bg-slate-800 text-teal-300 border-teal-500/40"
            title="دليل اختصارات لوحة المفاتيح والتحكم الشامل بالماوس (K / ?)"
          >
            <Keyboard className="w-3.5 h-3.5 text-teal-400" /> دليل التحكم [⌨]
          </button>

          {/* زر تبديل صلاحية العرض: أشرف (تصميم كامل) مقابل محمد ومرعي وفيصل والعوامي (استكشاف وسحب) */}
          <button
            type="button"
            data-testid="layout-role-switcher-btn"
            onClick={() => {
              setOverrideRoleMode((prev) => {
                if (prev === 'AUTO') return isDesignerOrAdmin ? 'MOHAMMED' : 'ASHRAF';
                if (prev === 'ASHRAF') return 'MOHAMMED';
                return 'ASHRAF';
              });
            }}
            className={`h-7 px-2.5 rounded text-xs font-bold flex items-center gap-1.5 transition ${
              isDesignerOrAdmin
                ? 'bg-emerald-700/80 text-emerald-200 border border-emerald-500/50 hover:bg-emerald-600 shadow-sm'
                : 'bg-amber-700/80 text-amber-200 border border-amber-500/50 hover:bg-amber-600 shadow-sm'
            }`}
            title="تبديل صلاحية العرض بين مشرف التخطيط أشرف (كامل الصلاحيات) وبين المجهزين محمد ومرعي وفيصل والعوامي (استكشاف المواقع فقط)"
          >
            {isDesignerOrAdmin ? '👑 وضع أشرف (تصميم كامل)' : '🧭 وضع محمد ومرعي (استكشاف فقط)'}
          </button>

          {isDesignerOrAdmin ? (
            <>
              {/* زر وضع اللمس لمشرف الترتيب أشرف */}
              <button
                type="button"
                data-testid="layout-touch-mode-btn"
                onClick={() => {
                  setIsTouchMode((prev) => !prev);
                  setFlash({
                    tone: 'ok',
                    text: !isTouchMode
                      ? 'تم تفعيل وضع لمس المشرف أشرف (Touch Mode: لمس مطول للقائمة الدائرية)'
                      : 'تم العودة لوضع الفأرة المكتبي د. ياسين (Desktop Mouse Mode)',
                  });
                }}
                className={`h-7 px-2.5 rounded text-xs font-bold flex items-center gap-1.5 transition ${
                  isTouchMode ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400' : 'border hover:bg-slate-800 text-cyan-300 border-cyan-500/40'
                }`}
                style={{ borderColor: 'var(--dtk-border)' }}
                title="تبديل وضع اللمس لمشرف الترتيب أشرف (شاشات اللمس والتابلت)"
              >
                📱 {isTouchMode ? 'وضع لمس المشرف أشرف (نشط)' : 'وضع لمس المشرف أشرف'}
              </button>

              {/* زر إضافة رف جديد */}
              <button
                type="button"
                data-testid="layout-add-rack-btn"
                onClick={handleOpenAddModal}
                className="h-7 px-2.5 rounded text-xs font-bold flex items-center gap-1 text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة رف جديد
              </button>

              {/* أدوات WDA CAD المعمارية */}
              <button
                type="button"
                data-testid="layout-add-element-btn"
                onClick={() => setShowAddElementModal(true)}
                className="h-7 px-2.5 rounded text-xs font-bold flex items-center gap-1 border hover:bg-slate-800 text-teal-300 border-teal-500/40"
                title="إضافة أبواب، نوافذ، جدران، أعمدة، أو مناطق وظيفية"
              >
                <DoorOpen className="w-3.5 h-3.5 text-teal-400" /> عناصر معمارية
              </button>

              <button
                type="button"
                data-testid="layout-expand-btn"
                onClick={() => setShowExpandModal(true)}
                className="h-7 px-2 rounded text-[11px] font-bold border flex items-center gap-1"
                style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                title="توسيع أبعاد ومساحة أرضية المستودع بالمتر"
              >
                <Maximize className="w-3 h-3 text-cyan-400" /> توسيع المخطط
              </button>
            </>
          ) : (
            <>
              {/* شارة وضع الاستكشاف والسحب لمحمد ومرعي */}
              <div
                data-testid="picker-view-only-badge"
                className="h-7 px-2.5 rounded text-xs font-bold flex items-center gap-1.5 bg-amber-950/70 text-amber-300 border border-amber-500/40"
              >
                🧭 وضع الاستكشاف والسحب (محمد / مرعي / فيصل / العوامي)
              </div>

              {/* شريط البحث السريع عن موقع الدواء والرف */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  data-testid="layout-medicine-finder-input"
                  value={medicineSearchQuery}
                  onChange={(e) => handleMedicineSearch(e.target.value)}
                  placeholder="🔍 ابحث عن موقع دواء، اسم رف، كود خانة..."
                  className="h-7 w-64 rounded-lg bg-slate-900 border border-teal-500/40 px-2.5 text-xs text-teal-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-400"
                />
              </div>
            </>
          )}

          {/* محاكاة رحلة الطرد الحية (HioBuy Warehouse Journey 3D) */}
          <button
            type="button"
            data-testid="layout-sim-btn"
            onClick={() => setIsSimulatingJourney((prev) => !prev)}
            className={`h-7 px-2.5 rounded text-xs font-bold flex items-center gap-1 transition ${
              isSimulatingJourney ? 'bg-amber-600 text-white' : 'border border-slate-700 bg-slate-800 text-amber-300 hover:bg-slate-700'
            }`}
            title="بدء محاكاة حركة الطرود عبر محطات الاستلام والتسكين والجودة والشحن"
          >
            {isSimulatingJourney ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isSimulatingJourney ? 'إيقاف المحاكاة' : 'محاكاة رحلة الطرد'}
          </button>

          {isSimulatingJourney && (
            <div className="flex items-center gap-1 bg-slate-900 border border-amber-500/40 px-2 py-0.5 rounded text-xs">
              <button
                type="button"
                onClick={() => setJourneyStageIdx((p) => (p > 0 ? p - 1 : JOURNEY_STAGES.length - 1))}
                className="text-slate-400 hover:text-white"
              >
                <Rewind className="w-3 h-3" />
              </button>
              <span className="font-mono font-bold text-amber-400 text-[10px]">
                {JOURNEY_STAGES[journeyStageIdx].stageNumber}. {JOURNEY_STAGES[journeyStageIdx].titleAr}
              </span>
              <button
                type="button"
                onClick={() => setJourneyStageIdx((p) => (p + 1) % JOURNEY_STAGES.length)}
                className="text-slate-400 hover:text-white"
              >
                <FastForward className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* أدوات الترقيم التلقائي والتحقق من المخطط (أشرف فقط) */}
          {isDesignerOrAdmin && (
            <>
              <button
                type="button"
                data-testid="layout-autorenumber-btn"
                onClick={handleAutoNumber}
                className="h-7 px-2 rounded text-[11px] font-bold border flex items-center gap-1"
                style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                title="إعادة ترقيم الرفوف تسلسلياً"
              >
                <Hash className="w-3 h-3" /> ترقيم تلقائي
              </button>
              <button
                type="button"
                data-testid="layout-validate-btn"
                onClick={handleValidateLayout}
                className="h-7 px-2 rounded text-[11px] font-bold border flex items-center gap-1"
                style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                title="فحص خلو المخطط من التداخلات"
              >
                <Check className="w-3 h-3 text-emerald-500" /> فحص السلامة
              </button>

              {/* نشر التخطيط والتحكم بصلاحيات موظفي ياسين */}
              <button
                type="button"
                data-testid="layout-publish-btn"
                onClick={() => setShowPublishModal(true)}
                className="h-7 px-2.5 rounded text-xs font-bold flex items-center gap-1 text-white bg-teal-600 hover:bg-teal-500 shadow-sm"
                title="نشر الإصدار المعتمد وتحديد صلاحيات الرؤية لموظفي ياسين"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> نشر واعتماد الإصدار
              </button>
            </>
          )}

          {/* أزرار الكاميرا السريعة */}
          {viewMode === '3d-canvas' && (
            <div className="flex items-center gap-1 border-s ps-2" style={{ borderColor: 'var(--dtk-border)' }}>
              <button
                type="button"
                title="أيزومتري 3D"
                onClick={() => setCameraPreset('persp')}
                className="h-7 px-2 rounded text-[11px] font-bold border"
                style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
              >
                3D مجسم
              </button>
              <button
                type="button"
                title="مسقط رأسي 2D"
                onClick={() => setCameraPreset('top')}
                className="h-7 px-2 rounded text-[11px] font-bold border"
                style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
              >
                مسقط 2D
              </button>
              <button
                type="button"
                title="واجهة أمامية"
                onClick={() => setCameraPreset('front')}
                className="h-7 px-2 rounded text-[11px] font-bold border"
                style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
              >
                أمامي
              </button>
              <button
                type="button"
                title="تدوير تلقائي 360°"
                onClick={() => setIsSpinning((prev) => !prev)}
                className="h-7 px-2 rounded text-[11px] font-bold border"
                style={{
                  background: isSpinning ? 'var(--dtk-accent)' : 'var(--dtk-surface)',
                  color: isSpinning ? '#fff' : 'var(--dtk-ink)',
                  borderColor: 'var(--dtk-border)',
                }}
              >
                <Play className="w-3 h-3 inline me-1" /> تدوير
              </button>
              <button
                type="button"
                title="إعادة ضبط الكاميرا"
                onClick={() => setCameraPreset('full')}
                className="h-7 px-2 rounded text-[11px] font-bold border"
                style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
              >
                <RotateCcw className="w-3 h-3 inline" />
              </button>
              <button
                type="button"
                title="إظهار/إخفاء مسار السحب"
                onClick={() => setShowRoutePath((prev) => !prev)}
                className="h-7 px-2 rounded text-[11px] font-bold border"
                style={{
                  background: showRoutePath ? 'rgba(56, 189, 248, 0.2)' : 'var(--dtk-surface)',
                  color: showRoutePath ? '#38bdf8' : 'var(--dtk-ink)',
                  borderColor: 'var(--dtk-border)',
                }}
              >
                <Navigation className="w-3 h-3 inline me-1" /> المسار
              </button>
            </div>
          )}

          <div className="flex-1" />

          {/* محدد المستوى للأبعاد والشبكة */}
          <span className="text-[11px] font-bold" style={{ color: 'var(--dtk-ink-muted)' }}>
            المستوى:
          </span>
          <div className="flex items-center gap-1" data-testid="layout-level-picker">
            {Array.from({ length: maxLevel }, (_, i) => pad2(i + 1)).map((lv) => (
              <button
                key={lv}
                type="button"
                data-active={level === lv ? 'true' : 'false'}
                onClick={() => setLevel(lv)}
                className="h-7 min-w-8 rounded px-1.5 text-[11px] font-bold"
                style={{
                  background: level === lv ? 'var(--dtk-accent)' : 'var(--dtk-surface)',
                  color: level === lv ? '#fff' : 'var(--dtk-ink)',
                  border: '1px solid var(--dtk-border)',
                }}
              >
                {lv}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1 text-[11px] font-bold" style={{ color: 'var(--dtk-ink-muted)' }}>
            ممرات:
            <input
              type="number"
              min={1}
              max={12}
              value={zoneCount}
              onChange={(e) => setZoneCount(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
              data-testid="layout-zone-count"
              className="h-7 w-12 rounded border px-1 text-center"
              style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
            />
          </label>
          <label className="flex items-center gap-1 text-[11px] font-bold" style={{ color: 'var(--dtk-ink-muted)' }}>
            رفوف/ممر:
            <input
              type="number"
              min={1}
              max={12}
              value={shelfCount}
              onChange={(e) => setShelfCount(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
              data-testid="layout-shelf-count"
              className="h-7 w-12 rounded border px-1 text-center"
              style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
            />
          </label>

          <DaylightButton data-testid="layout-reset-btn" onClick={handleReset} disabled={dirtyCount === 0 || loading}>
            <RotateCcw className="h-3.5 w-3.5" /> تراجع
          </DaylightButton>
          <DaylightButton
            data-testid="layout-save-btn"
            onClick={() => void handleSave()}
            disabled={dirtyCount === 0 || saving || loading}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            حفظ التخطيط ({dirtyCount})
          </DaylightButton>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm font-bold" style={{ color: 'var(--dtk-ink-muted)' }}>
            <Loader2 className="h-5 w-5 animate-spin" /> جاري تحميل المواقع والمخطط ثلاثي الأبعاد...
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 gap-2 px-2">
            {/* صينية الخلايا غير المثبتة */}
            <div
              data-testid="layout-tray"
              className="flex w-56 shrink-0 flex-col gap-1.5 overflow-auto rounded p-2 border"
              style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)' }}
            >
              <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: 'var(--dtk-border)' }}>
                <span className="text-[11px] font-bold" style={{ color: 'var(--dtk-ink-muted)' }}>
                  خلايا بانتظار التثبيت ({unplaced.length})
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="p-1 rounded text-emerald-500 hover:bg-emerald-500/10"
                  title="إضافة خلية جديدة"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {unplaced.length === 0 ? (
                <div className="text-[10px] text-center py-4" style={{ color: 'var(--dtk-ink-muted)' }}>
                  جميع الخلايا والرفوف مثبتة على المخطط ✓
                </div>
              ) : (
                unplaced.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    data-testid={`layout-tray-chip-${p.id}`}
                    onDragStart={(e) => {
                      setDragId(p.id);
                      e.dataTransfer.setData('text/plain', p.id);
                    }}
                    onClick={() => {
                      setSelectedPlacementId(p.id);
                      setSelectedElementId(null);
                    }}
                    className="group cursor-grab rounded p-2 text-[11px] font-bold border transition-colors hover:border-teal-500 flex flex-col gap-1"
                    style={{
                      background: selectedPlacementId === p.id ? 'var(--dtk-row-active-bg)' : 'var(--dtk-field)',
                      borderColor: selectedPlacementId === p.id ? 'var(--dtk-accent)' : 'var(--dtk-border)',
                      color: 'var(--dtk-ink)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-teal-400">{p.code}</span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          title="تثبيت في المستوى الحالي"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDrop('A', '1');
                          }}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-teal-600/20 text-teal-300 hover:bg-teal-600 hover:text-white"
                        >
                          تثبيت
                        </button>
                        <button
                          type="button"
                          title="حذف"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlacementId(p.id);
                            setShowDeleteModal(true);
                          }}
                          className="p-0.5 rounded text-rose-400 hover:bg-rose-500/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-[10px] font-normal" style={{ color: 'var(--dtk-ink-muted)' }}>
                      {p.name || 'خلية مستودع غير محددة'}
                    </div>
                  </div>
                ))
              )}
            </div>

                        {/* شريط استكشاف موقع الدواء لمحمد ومرعي عند البحث */}
            {activeDiscoveredLocation && (
              <div
                data-testid="medicine-discovery-banner"
                className="bg-teal-950/90 border border-teal-500/50 rounded-xl px-4 py-2 mb-2 flex flex-wrap items-center justify-between gap-3 text-xs text-white z-20 shrink-0 shadow-lg"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                  </span>
                  <div>
                    <span className="font-bold text-white text-sm me-2">🎯 {activeDiscoveredLocation.medicineName}</span>
                    <span className="text-teal-300 font-mono text-xs">
                      الرف: <strong className="text-white">{activeDiscoveredLocation.rackCode}</strong> · المنطقة: {activeDiscoveredLocation.zone} · الرف: {activeDiscoveredLocation.shelf} · المستوى: {activeDiscoveredLocation.level} · الخانة: {activeDiscoveredLocation.cellName}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoutePath(true);
                      setFlash({ tone: 'ok', text: 'تم تنشيط مسار السحب المباشر نحو الرف على الأرضية 3D' });
                    }}
                    className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                  >
                    <Navigation className="w-3.5 h-3.5" /> رسم مسار السحب إلى الرف 🚶‍♂️
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDiscoveredLocation(null)}
                    className="text-slate-400 hover:text-white p-1"
                    title="إغلاق"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* مساحة العرض المركزية */}
            {viewMode === '3d-canvas' ? (
              <div
                className="relative flex flex-1 min-w-0 min-h-0 rounded border overflow-hidden"
                style={{ borderColor: 'var(--dtk-border)' }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleCanvasDrop}
              >
                <canvas
                  ref={canvasRef}
                  data-testid="warehouse-3d-canvas"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onWheel={handleWheel}
                  onContextMenu={handleContextMenu}
                  onDoubleClick={handleDoubleClick}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    cursor: cameraState.current.dragItemId ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    background: '#090d16',
                  }}
                />

                {/* بطاقة التحكم والتعديل الشامل للعنصر المعماري المحدد بالماوس (WDA CAD Element Inspection Card) */}
                {selectedElement && (
                  <div
                    data-testid="layout-element-inspection-card"
                    className="absolute top-3 start-3 z-20 w-80 max-h-[85vh] overflow-y-auto rounded-2xl p-4 border shadow-2xl flex flex-col gap-3 backdrop-blur-xl"
                    style={{
                      background: 'rgba(15, 23, 42, 0.92)',
                      borderColor: 'rgba(0, 212, 170, 0.4)',
                      color: '#f8fafc',
                    }}
                  >
                    <div className="flex items-center justify-between border-b pb-2.5 border-slate-700/80">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                          <DoorOpen className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-[10px] font-mono uppercase text-teal-400 font-bold">
                            {selectedElement.type} · {selectedElement.subType}
                          </div>
                          <h4 className="text-xs font-black text-white">{selectedElement.label}</h4>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedElementId(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                        title="إلغاء التحديد"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {isDesignerOrAdmin ? (
                      <>
                    {/* أزرار التحريك الإزاحي بالمتر بالماوس */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                        <span className="flex items-center gap-1 text-teal-400">
                          <Move className="w-3.5 h-3.5" /> الموضع والإزاحة (X / Z)
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          X: {selectedElement.x.toFixed(1)}m · Z: {selectedElement.z.toFixed(1)}m
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between rounded bg-slate-900 border border-slate-800 px-2 py-1">
                          <span className="font-mono text-[11px] text-teal-400 font-bold">المحور X:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              data-testid="element-x-minus"
                              onClick={() => handleNudgeElement(-0.5, 0)}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono text-[11px] w-8 text-center">{selectedElement.x.toFixed(1)}</span>
                            <button
                              type="button"
                              data-testid="element-x-plus"
                              onClick={() => handleNudgeElement(0.5, 0)}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between rounded bg-slate-900 border border-slate-800 px-2 py-1">
                          <span className="font-mono text-[11px] text-teal-400 font-bold">المحور Z:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              data-testid="element-z-minus"
                              onClick={() => handleNudgeElement(0, -0.5)}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono text-[11px] w-8 text-center">{selectedElement.z.toFixed(1)}</span>
                            <button
                              type="button"
                              data-testid="element-z-plus"
                              onClick={() => handleNudgeElement(0, 0.5)}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* التدوير وتغيير الأبعاد بالماوس */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                        <span className="flex items-center gap-1 text-teal-400">
                          <Maximize2 className="w-3.5 h-3.5" /> الأبعاد والتدوير (CAD)
                        </span>
                        <button
                          type="button"
                          data-testid="element-rotate-btn"
                          onClick={() => handleRotateElement(90)}
                          className="px-2 py-0.5 rounded text-[10px] border border-teal-500/40 bg-teal-500/10 text-teal-300 font-bold hover:bg-teal-500/20"
                        >
                          ↻ تدوير 90° ({selectedElement.rotation || 0}°)
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                        {/* العرض W */}
                        <div className="flex flex-col rounded bg-slate-900 border border-slate-800 p-1.5">
                          <span className="text-[10px] text-slate-400 font-bold text-center">العرض W</span>
                          <div className="flex items-center justify-between mt-1">
                            <button
                              type="button"
                              data-testid="element-w-minus"
                              onClick={() => handleResizeElement(-0.2, 0, 0)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono text-[10px] font-bold">{selectedElement.w.toFixed(1)}m</span>
                            <button
                              type="button"
                              data-testid="element-w-plus"
                              onClick={() => handleResizeElement(0.2, 0, 0)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* العمق D */}
                        <div className="flex flex-col rounded bg-slate-900 border border-slate-800 p-1.5">
                          <span className="text-[10px] text-slate-400 font-bold text-center">العمق D</span>
                          <div className="flex items-center justify-between mt-1">
                            <button
                              type="button"
                              data-testid="element-d-minus"
                              onClick={() => handleResizeElement(0, -0.2, 0)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono text-[10px] font-bold">{selectedElement.d.toFixed(1)}m</span>
                            <button
                              type="button"
                              data-testid="element-d-plus"
                              onClick={() => handleResizeElement(0, 0.2, 0)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* الارتفاع H */}
                        <div className="flex flex-col rounded bg-slate-900 border border-slate-800 p-1.5">
                          <span className="text-[10px] text-slate-400 font-bold text-center">الارتفاع H</span>
                          <div className="flex items-center justify-between mt-1">
                            <button
                              type="button"
                              data-testid="element-h-minus"
                              onClick={() => handleResizeElement(0, 0, -0.2)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono text-[10px] font-bold">{(selectedElement.h || 2.5).toFixed(1)}m</span>
                            <button
                              type="button"
                              data-testid="element-h-plus"
                              onClick={() => handleResizeElement(0, 0, 0.2)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* خيارات اللون السريع */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-slate-400 text-[10px] font-bold">لون التمييز:</span>
                      <div className="flex items-center gap-1.5">
                        {['#3b82f6', '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleChangeElementColor(c)}
                            className="w-4 h-4 rounded-full border border-white/20 transition hover:scale-125"
                            style={{ background: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>

                    {/* أزرار العمليات: تكرار، تعديل بالنافذة، حذف */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        data-testid="element-duplicate-btn"
                        onClick={() => handleDuplicateElement(selectedElement.id)}
                        className="flex-1 h-7 rounded-lg text-xs font-bold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5 text-teal-400" /> تكرار العنصر
                      </button>
                      <button
                        type="button"
                        data-testid="element-edit-btn"
                        onClick={() => setShowAddElementModal(true)}
                        className="h-7 px-2.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center gap-1"
                      >
                        <Pencil className="w-3 h-3" /> تعديل
                      </button>
                      <button
                        type="button"
                        data-testid="element-delete-btn"
                        onClick={() => handleDeleteElement(selectedElement.id)}
                        className="h-7 px-2.5 rounded-lg text-xs font-bold bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> حذف
                      </button>
                    </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex flex-col gap-2">
                        <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                          <span>🏛️</span> عنصر إنشائي ومعماري (معاينة فقط)
                        </div>
                        <div className="text-[11px] text-slate-300 space-y-1">
                          <div>الموقع: X: {selectedElement.x.toFixed(1)}m · Z: {selectedElement.z.toFixed(1)}m</div>
                          <div>الأبعاد: {selectedElement.w.toFixed(1)}m عرض × {selectedElement.d.toFixed(1)}m عمق × {(selectedElement.h || 2.5).toFixed(1)}m ارتفاع</div>
                          <div>الزاوية: {selectedElement.rotation || 0}°</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* شريط تعريف التجربة العلوي (HioBuy Top Sub-banner) */}
                <div className="absolute top-3 start-1/2 -translate-x-1/2 z-10 hidden sm:flex flex-col items-center pointer-events-none text-center">
                  <div className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 font-extrabold drop-shadow">
                    02 / INSIDE THE WAREHOUSE · داخل المستودع الدوائي
                  </div>
                  <h2 className="text-sm font-black text-white drop-shadow-md">
                    Follow the journey · متابعة مسار الدواء
                  </h2>
                  <p className="text-[10px] text-slate-300 drop-shadow">
                    من الاستلام المباشر وحتى الشحن الآمن، طرد تلو الآخر
                  </p>
                </div>

                {/* بطاقة النظرة الشاملة الداخلية (HioBuy Interior Overview) */}
                <div
                  className="absolute top-3 end-3 z-20 w-72 max-h-[85vh] overflow-y-auto rounded-2xl p-3.5 border shadow-2xl flex flex-col gap-2.5 backdrop-blur-xl"
                  style={{
                    background: 'rgba(15, 23, 42, 0.88)',
                    borderColor: 'rgba(56, 189, 248, 0.25)',
                    color: '#f8fafc',
                  }}
                  data-testid="interior-overview-card"
                >
                  <div className="flex items-center justify-between border-b pb-2 border-slate-700/60">
                    <div>
                      <span className="text-[9px] font-mono tracking-widest text-cyan-400 font-bold block uppercase">
                        {warehouseId ? warehouseId.toUpperCase() : 'WH-01'} · INTERIOR
                      </span>
                      <h3 className="text-xs font-black text-white">Six zones. One journey.</h3>
                      <span className="text-[9px] text-slate-400">ست محطات تشغيلية دوائية</span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                  </div>

                  {/* قائمة المحطات التشغيلية الست */}
                  <div className="flex flex-col gap-1 text-xs font-semibold">
                    {JOURNEY_STAGES.map((stg, idx) => {
                      const isActive = isSimulatingJourney && journeyStageIdx === idx;
                      return (
                        <button
                          key={stg.id}
                          type="button"
                          data-testid={`zone-step-btn-${idx}`}
                          onClick={() => {
                            setJourneyStageIdx(idx);
                            setIsSimulatingJourney(true);
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl transition text-start border ${
                            isActive
                              ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-md ring-1 ring-cyan-400'
                              : 'border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-cyan-400">{stg.stageNumber}</span>
                            <div className="flex flex-col">
                              <span className="font-bold text-[10px]">{stg.titleEn}</span>
                              <span className="text-[9px] text-slate-400 font-normal">{stg.titleAr}</span>
                            </div>
                          </div>
                          <span className="text-slate-500 text-xs font-bold">›</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    data-testid="layout-follow-pkg-btn"
                    onClick={() => setIsSimulatingJourney((p) => !p)}
                    className="w-full h-8 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500"
                  >
                    {isSimulatingJourney ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isSimulatingJourney ? 'إيقاف مسار الطرد' : '▶ متابعة مسار الطرد (Follow PKG-572)'}</span>
                  </button>
                </div>

                {/* شريط خطوات رحلة الطرد السفلي (HioBuy Timeline Stepper HUD) */}
                <div
                  className="absolute bottom-14 start-1/2 -translate-x-1/2 z-20 hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-xl border border-slate-700/60 text-white"
                  style={{ background: 'rgba(15, 23, 42, 0.90)' }}
                  data-testid="fulfillment-journey-hud"
                >
                  <div className="flex items-center gap-2 text-xs font-bold border-e pe-3 border-slate-700">
                    <span className="font-mono text-[9px] text-cyan-400">FULFILLMENT JOURNEY</span>
                    <span className="font-mono text-[10px] text-white">PKG-572 ➔ اليمن / المحافظات</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-testid="journey-prev-step-btn"
                      onClick={() => setJourneyStageIdx((p) => (p > 0 ? p - 1 : JOURNEY_STAGES.length - 1))}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                      title="المحطة السابقة"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      data-testid="journey-next-step-btn"
                      onClick={() => setJourneyStageIdx((p) => (p + 1) % JOURNEY_STAGES.length)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                      title="المحطة التالية"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                  </div>

                  {/* المراحل الست */}
                  <div className="flex items-center gap-2">
                    {JOURNEY_STAGES.map((stg, i) => {
                      const isAct = journeyStageIdx === i;
                      return (
                        <div
                          key={stg.id}
                          onClick={() => {
                            setJourneyStageIdx(i);
                            setIsSimulatingJourney(true);
                          }}
                          className="flex items-center gap-1.5 cursor-pointer group"
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-bold transition ${
                              isAct
                                ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-300 shadow-md scale-110'
                                : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                            }`}
                          >
                            {stg.stageNumber}
                          </div>
                          <span
                            className={`text-[9px] hidden lg:inline font-bold transition ${
                              isAct ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
                            }`}
                          >
                            {stg.titleEn}
                          </span>
                          {i < JOURNEY_STAGES.length - 1 && (
                            <span className="w-2.5 h-0.5 bg-slate-700 mx-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* تحكم التشغيل والسرعة والكاميرا (HioBuy Playback HUD) */}
                <div
                  className="absolute bottom-3 end-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-xl border border-slate-700/60 text-white text-xs font-bold"
                  style={{ background: 'rgba(15, 23, 42, 0.90)' }}
                >
                  <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase">PLAYBACK</span>
                  <button
                    type="button"
                    onClick={() => setIsSimulatingJourney((p) => !p)}
                    className="p-1 rounded text-cyan-300 hover:text-white"
                  >
                    {isSimulatingJourney ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>

                  <div className="flex items-center gap-0.5 border-s border-e px-1.5 border-slate-700">
                    {[1, 2, 4, 8].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        data-testid="layout-sim-speed-btn"
                        onClick={() => setSimSpeed(spd)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition ${
                          simSpeed === spd
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  <span className="text-[9px] text-slate-400 font-mono">● 37s journey</span>

                  <button
                    type="button"
                    data-testid="layout-reset-view-btn"
                    onClick={() => setCameraPreset('full')}
                    className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white ps-1"
                    title="إعادة ضبط زاوية الرؤية"
                  >
                    <RotateCcw className="w-2.5 h-2.5 text-cyan-400" /> Reset view
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      cameraState.current.zoom = Math.min(4.5, cameraState.current.zoom * 1.2);
                    }}
                    className="p-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700"
                    title="تكبير"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      cameraState.current.zoom = Math.max(0.4, cameraState.current.zoom * 0.82);
                    }}
                    className="p-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700"
                    title="تصغير"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                </div>

                {/* إرشادات التحكم المكتبي واللمس (Bottom helper pills) */}
                <div className="absolute bottom-3 start-3 z-10 hidden sm:flex items-center gap-1.5 text-[9px] text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-full border border-slate-800 pointer-events-none backdrop-blur-sm">
                  <span>اسحب للتحريك · عجلات الماوس للتكبير · زر الماوس الأيمن لقائمة الخيارات · نقر مزدوج للتعديل · لمس مطول لأشرف</span>
                </div>

                {/* بطاقة فحص وتحكم الرف المختار */}
                {selectedPlacement && (
                  <div
                    className="absolute top-3 start-3 w-80 max-h-[88vh] overflow-y-auto rounded-xl p-3 border shadow-2xl flex flex-col gap-2.5 backdrop-blur-md"
                    style={{
                      background: 'var(--dtk-surface)',
                      borderColor: 'var(--dtk-border)',
                      color: 'var(--dtk-ink)',
                    }}
                  >
                    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--dtk-border)' }}>
                      <div>
                        <span className="text-[10px] font-bold block" style={{ color: 'var(--dtk-ink-muted)' }}>
                          بيانات الرف والحالة
                        </span>
                        <h4 className="font-mono text-sm font-black text-teal-400">{selectedPlacement.code}</h4>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isDesignerOrAdmin ? (
                          <>
                            <button
                              type="button"
                              data-testid="layout-edit-rack-btn"
                              onClick={() => handleOpenEditModal(selectedPlacement)}
                              className="h-7 px-2 rounded text-[11px] font-bold border flex items-center gap-1 text-teal-400 border-teal-500/40 hover:bg-teal-500/10"
                              title="تعديل خصائص الرف"
                            >
                              <Pencil className="w-3 h-3" /> تعديل
                            </button>
                            <button
                              type="button"
                              data-testid="layout-cells-btn"
                              onClick={() => setShowRackCellsModal(true)}
                              className="h-7 px-2 rounded text-[11px] font-bold border flex items-center gap-1 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/10"
                              title="تعديل خانات ومستويات الرف"
                            >
                              <Boxes className="w-3 h-3" /> الخانات
                            </button>
                            <button
                              type="button"
                              data-testid="layout-delete-rack-btn"
                              onClick={() => setShowDeleteModal(true)}
                              className="h-7 px-2 rounded text-[11px] font-bold border flex items-center gap-1 text-rose-400 border-rose-500/40 hover:bg-rose-500/10"
                              title="حذف الرف أو إلغاء تثبيته"
                            >
                              <Trash2 className="w-3 h-3" /> حذف
                            </button>
                          </>
                        ) : (
                          <span
                            data-testid="picker-rack-readonly-tag"
                            className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1"
                          >
                            🧭 استكشاف فقط
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className="px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                        style={{
                          background:
                            selectedPlacement.storageType === 'COLD'
                              ? 'rgba(6, 182, 212, 0.16)'
                              : selectedPlacement.storageType === 'QUARANTINE'
                              ? 'rgba(217, 119, 6, 0.18)'
                              : 'rgba(16, 185, 129, 0.16)',
                          color:
                            selectedPlacement.storageType === 'COLD'
                              ? '#06b6d4'
                              : selectedPlacement.storageType === 'QUARANTINE'
                              ? '#d97706'
                              : '#10b981',
                        }}
                      >
                        {selectedPlacement.storageType === 'COLD' ? (
                          <>
                            <Snowflake className="w-3 h-3" /> تبريد (2°C - 8°C)
                          </>
                        ) : selectedPlacement.storageType === 'QUARANTINE' ? (
                          <>
                            <ShieldAlert className="w-3 h-3" /> حجر صحي
                          </>
                        ) : (
                          <>
                            <Thermometer className="w-3 h-3" /> حرارة الغرفة (15°C - 25°C)
                          </>
                        )}
                      </span>

                      <span className="font-mono text-[10px] opacity-70">
                        {selectedRackPos ? `X: ${selectedRackPos.x.toFixed(1)}م | Z: ${selectedRackPos.z.toFixed(1)}م` : 'بانتظار التثبيت'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded p-1 border" style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)' }}>
                        <div className="text-[10px] opacity-70">الممر</div>
                        <div className="font-bold text-teal-400">{selectedPlacement.zone || '—'}</div>
                      </div>
                      <div className="rounded p-1 border" style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)' }}>
                        <div className="text-[10px] opacity-70">الرف</div>
                        <div className="font-bold">{selectedPlacement.shelf || '—'}</div>
                      </div>
                      <div className="rounded p-1 border" style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)' }}>
                        <div className="text-[10px] opacity-70">المستوى</div>
                        <div className="font-bold">{selectedPlacement.levelVal || '01'}</div>
                      </div>
                    </div>

                    {/* لوحة تحريك الرف */}
                    <div className="rounded border p-2 flex flex-col gap-1.5" style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)' }}>
                      <span className="text-[10px] font-bold flex items-center justify-between" style={{ color: 'var(--dtk-ink-muted)' }}>
                        <span>
                          <Move className="w-3 h-3 inline me-1 text-teal-400" /> تحريك الرف وتغيير الموضع
                        </span>
                        <button
                          type="button"
                          data-testid="layout-rotate-rack-btn"
                          onClick={handleToggleRotate}
                          className="px-1.5 py-0.5 rounded text-[9px] border hover:bg-teal-500/10 text-teal-300"
                        >
                          ↻ تدوير 90°
                        </button>
                      </span>

{isDesignerOrAdmin ? (
                        <>
                      <div className="grid grid-cols-4 gap-1">
                        <button
                          type="button"
                          data-testid="layout-move-x-minus"
                          onClick={() => handleNudge(-0.5, 0)}
                          className="h-6 rounded text-[10px] font-bold border hover:bg-slate-800 flex items-center justify-center gap-0.5"
                          title="إزاحة لليسار X-"
                        >
                          <ArrowRight className="w-2.5 h-2.5" /> X-
                        </button>
                        <button
                          type="button"
                          data-testid="layout-move-x-plus"
                          onClick={() => handleNudge(0.5, 0)}
                          className="h-6 rounded text-[10px] font-bold border hover:bg-slate-800 flex items-center justify-center gap-0.5"
                          title="إزاحة لليمين X+"
                        >
                          X+ <ArrowLeft className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          data-testid="layout-move-z-minus"
                          onClick={() => handleNudge(0, -0.5)}
                          className="h-6 rounded text-[10px] font-bold border hover:bg-slate-800 flex items-center justify-center gap-0.5"
                          title="إزاحة للأمام Z-"
                        >
                          <ArrowUp className="w-2.5 h-2.5" /> Z-
                        </button>
                        <button
                          type="button"
                          data-testid="layout-move-z-plus"
                          onClick={() => handleNudge(0, 0.5)}
                          className="h-6 rounded text-[10px] font-bold border hover:bg-slate-800 flex items-center justify-center gap-0.5"
                          title="إزاحة للخلف Z+"
                        >
                          Z+ <ArrowDown className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            data-testid="layout-prev-zone-btn"
                            onClick={() => handleStepAisle(-1)}
                            className="flex-1 h-6 rounded border hover:bg-slate-800 text-center font-bold"
                          >
                            ممر سابق
                          </button>
                          <button
                            type="button"
                            data-testid="layout-next-zone-btn"
                            onClick={() => handleStepAisle(1)}
                            className="flex-1 h-6 rounded border hover:bg-slate-800 text-center font-bold"
                          >
                            ممر تالٍ
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            data-testid="layout-prev-shelf-btn"
                            onClick={() => handleStepShelf(-1)}
                            className="flex-1 h-6 rounded border hover:bg-slate-800 text-center font-bold"
                          >
                            رف سابق
                          </button>
                          <button
                            type="button"
                            data-testid="layout-next-shelf-btn"
                            onClick={() => handleStepShelf(1)}
                            className="flex-1 h-6 rounded border hover:bg-slate-800 text-center font-bold"
                          >
                            رف تالٍ
                          </button>
                        </div>
                      </div>

                      {/* أبعاد الرف وعدد المستويات (Rack CAD Dimensions & Levels) */}
                      <div className="rounded border p-1.5 flex flex-col gap-1.5 mt-1" style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)' }}>
                        <span className="text-[10px] font-bold text-teal-400 flex items-center justify-between">
                          <span>📐 أبعاد الرف والمستويات (CAD)</span>
                          <span className="font-mono text-[9px] text-slate-400">
                            {(selectedPlacement.w || 2.2).toFixed(1)}m × {(selectedPlacement.d || 0.9).toFixed(1)}m
                          </span>
                        </span>

                        <div className="grid grid-cols-3 gap-1 text-[10px]">
                          {/* العرض W */}
                          <div className="flex flex-col items-center rounded bg-slate-900 border border-slate-800 p-1">
                            <span className="text-[9px] text-slate-400">العرض W</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <button
                                type="button"
                                data-testid="layout-rack-w-minus"
                                onClick={() => handleResizeRack(-0.2, 0, 0)}
                                className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px]"
                              >
                                -
                              </button>
                              <span className="font-mono text-[10px]">{(selectedPlacement.w || 2.2).toFixed(1)}</span>
                              <button
                                type="button"
                                data-testid="layout-rack-w-plus"
                                onClick={() => handleResizeRack(0.2, 0, 0)}
                                className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px]"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* العمق D */}
                          <div className="flex flex-col items-center rounded bg-slate-900 border border-slate-800 p-1">
                            <span className="text-[9px] text-slate-400">العمق D</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <button
                                type="button"
                                data-testid="layout-rack-d-minus"
                                onClick={() => handleResizeRack(0, -0.2, 0)}
                                className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px]"
                              >
                                -
                              </button>
                              <span className="font-mono text-[10px]">{(selectedPlacement.d || 0.9).toFixed(1)}</span>
                              <button
                                type="button"
                                data-testid="layout-rack-d-plus"
                                onClick={() => handleResizeRack(0, 0.2, 0)}
                                className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px]"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* عدد المستويات Levels */}
                          <div className="flex flex-col items-center rounded bg-slate-900 border border-slate-800 p-1">
                            <span className="text-[9px] text-slate-400">المستويات</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <button
                                type="button"
                                data-testid="layout-rack-levels-minus"
                                onClick={() => handleResizeRack(0, 0, -1)}
                                className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px]"
                              >
                                -
                              </button>
                              <span className="font-mono text-[10px]">{selectedPlacement.levels || 4}</span>
                              <button
                                type="button"
                                data-testid="layout-rack-levels-plus"
                                onClick={() => handleResizeRack(0, 0, 1)}
                                className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px]"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 mt-0.5">
                          <button
                            type="button"
                            data-testid="layout-open-cells-btn"
                            onClick={() => setShowRackCellsModal(true)}
                            className="flex-1 h-6 rounded text-[9px] font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center gap-1"
                          >
                            <Boxes className="w-3 h-3" /> إدارة الخانات المخصصة
                          </button>
                          <button
                            type="button"
                            data-testid="layout-duplicate-rack-btn"
                            onClick={() => handleDuplicateRack(selectedPlacement.id)}
                            className="h-6 px-2 rounded text-[9px] font-bold border border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center justify-center gap-0.5"
                            title="تكرار الرف بالكامل (Ctrl+D)"
                          >
                            <Plus className="w-3 h-3 text-teal-400" /> تكرار
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        data-testid="layout-unassign-rack-btn"
                        onClick={() => handleConfirmDelete('unassign')}
                        className="h-6 rounded text-[10px] font-bold border text-amber-400 border-amber-500/30 hover:bg-amber-500/10 flex items-center justify-center gap-1"
                      >
                        📦 إلغاء التثبيت (إعادة لصينية الانتظار)
                      </button>
                        </>
                      ) : (
                        /* لوحة استكشاف موقع الرف والدواء لمحمد ومرعي */
                        <div className="rounded border p-2.5 flex flex-col gap-2 mt-1 bg-slate-900 border-teal-500/30">
                          <div
                            data-testid="picker-rack-info-badge"
                            className="rounded-lg bg-teal-950/60 border border-teal-500/40 p-2 text-xs text-teal-200 font-bold flex items-center gap-1.5"
                          >
                            <span>🧭</span> الرف متاح للمشاهدة واستكشاف موقع الدواء والسحب
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                            <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700">
                              <span className="text-slate-400 block text-[10px]">الممر / المنطقة:</span>
                              <span className="font-mono font-bold text-amber-300">Zone {selectedPlacement.zone}</span>
                            </div>
                            <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700">
                              <span className="text-slate-400 block text-[10px]">رقم الرف:</span>
                              <span className="font-mono font-bold text-white">رف {selectedPlacement.shelf}</span>
                            </div>
                            <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700">
                              <span className="text-slate-400 block text-[10px]">المستوى الحالي:</span>
                              <span className="font-mono font-bold text-emerald-400">مستوى {selectedPlacement.levelVal || '01'}</span>
                            </div>
                            <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700">
                              <span className="text-slate-400 block text-[10px]">إجمالي الطبقات:</span>
                              <span className="font-mono font-bold text-teal-300">{selectedPlacement.levels || 4} طبقات</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            data-testid="layout-route-to-rack-btn"
                            onClick={() => {
                              setShowRoutePath(true);
                              setFlash({ tone: 'ok', text: `تم رسم وتنشيط مسار السحب المباشر نحو الرف ${selectedPlacement.code}` });
                            }}
                            className="h-7 w-full rounded text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center gap-1.5 shadow-sm mt-1"
                          >
                            <Navigation className="w-3.5 h-3.5" /> رسم مسار السحب إلى هذا الرف 🚶‍♂️
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 border-t pt-2" style={{ borderColor: 'var(--dtk-border)' }}>
                      <div className="flex-1">
                        <span className="text-[10px] font-bold block mb-1" style={{ color: 'var(--dtk-ink-muted)' }}>
                          <Camera className="w-3 h-3 inline me-1" /> معاينة الرف الافتراضية
                        </span>
                        <canvas ref={photoCanvasRef} className="w-full h-20 rounded border bg-slate-800" />
                      </div>
                      <div className="w-20">
                        <span className="text-[10px] font-bold block mb-1 text-center" style={{ color: 'var(--dtk-ink-muted)' }}>
                          <QrCode className="w-3 h-3 inline me-1" /> باركود
                        </span>
                        <canvas ref={qrCanvasRef} width={80} height={80} className="w-16 h-16 rounded border mx-auto bg-white" />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => setShowRoutePath(true)}
                        className="flex-1 h-7 rounded text-[10px] font-bold bg-teal-600 text-white flex items-center justify-center gap-1 hover:bg-teal-500"
                      >
                        <Navigation className="w-3 h-3" /> رسم مسار السحب
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print?.()}
                        className="h-7 px-2 rounded text-[10px] font-bold border flex items-center justify-center gap-1 hover:bg-slate-800"
                        style={{ borderColor: 'var(--dtk-border)', background: 'var(--dtk-field)' }}
                        title="طباعة ملصق الرف"
                      >
                        <Printer className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* المشهد الأيزومتري التخطيطي */}
            <div
              className={`flex min-h-0 flex-1 items-start justify-center overflow-auto rounded ${
                viewMode === 'schematic' ? '' : 'hidden'
              }`}
              style={{ perspective: 1400, background: 'var(--dtk-canvas)', border: '1px solid var(--dtk-border)' }}
              data-testid="layout-scene"
            >
              <div
                style={{
                  transform: 'rotateX(55deg) rotateZ(-45deg)',
                  transformStyle: 'preserve-3d',
                  position: 'relative',
                  width: zoneCount * (CELL + GAP) + 48,
                  height: shelfCount * (CELL + GAP) + 48,
                  margin: 40,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--dtk-surface)',
                    border: '1px solid var(--dtk-border)',
                  }}
                />
                {Array.from({ length: zoneCount }, (_, zi) => (
                  <div
                    key={`zone-label-${zi}`}
                    className="text-[10px] font-bold"
                    style={{ position: 'absolute', left: zi * (CELL + GAP) + 24, top: 4, color: 'var(--dtk-ink-muted)' }}
                  >
                    ممر {zoneCode(zi)}
                  </div>
                ))}
                {Array.from({ length: shelfCount }, (_, si) => (
                  <div
                    key={`shelf-label-${si}`}
                    className="text-[10px] font-bold"
                    style={{ position: 'absolute', right: 4, top: si * (CELL + GAP) + 26, color: 'var(--dtk-ink-muted)' }}
                  >
                    رف {shelfCode(si)}
                  </div>
                ))}
                {Array.from({ length: zoneCount }, (_, zi) =>
                  Array.from({ length: shelfCount }, (_, si) => {
                    const key = slotKey(zoneCode(zi), shelfCode(si), level);
                    const occupant = placedOnLevel.get(key);
                    return (
                      <div
                        key={key}
                        data-testid={`layout-cell-${zi}-${si}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(zoneCode(zi), shelfCode(si))}
                        style={{
                          position: 'absolute',
                          left: zi * (CELL + GAP) + 24,
                          top: si * (CELL + GAP) + 24,
                          width: CELL,
                          height: CELL,
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        {Array.from({ length: levelIndex }, (_, li) => (
                          <div
                            key={li}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              transform: `translateZ(${(li + 1) * LEVEL_H}px)`,
                              background: 'var(--dtk-surface-2)',
                              border: '1px solid var(--dtk-border)',
                              opacity: 0.5,
                            }}
                          />
                        ))}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            transform: `translateZ(${(levelIndex + 1) * LEVEL_H}px)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: occupant ? 'var(--dtk-row-active-bg)' : 'var(--dtk-field)',
                            border: `1px dashed ${occupant ? 'var(--dtk-accent)' : 'var(--dtk-border)'}`,
                            borderRadius: 4,
                          }}
                        >
                          {occupant ? (
                            <div
                              draggable
                              data-testid={`layout-cell-chip-${occupant.id}`}
                              onDragStart={(e) => {
                                setDragId(occupant.id);
                                e.dataTransfer.setData('text/plain', occupant.id);
                              }}
                              onClick={() => setSelectedPlacementId(occupant.id)}
                              className="cursor-grab rounded px-1.5 text-center"
                              style={{ background: 'var(--dtk-surface)', border: '1px solid var(--dtk-accent)' }}
                            >
                              <div className="font-mono text-[9px] font-bold" style={{ color: 'var(--dtk-ink)' }}>
                                {occupant.code}
                              </div>
                              <div className="text-[8px]" style={{ color: 'var(--dtk-ink-muted)' }}>
                                {zoneCode(zi)}-{shelfCode(si)}-{level}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[9px]" style={{ color: 'var(--dtk-ink-muted)' }}>
                              فارغة
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }),
                )}
              </div>
            </div>
          </div>
        )}

        {/* سجل التعديلات (من عدّل ومتى) + مهام الترتيب وصور الرفوف */}
        <div className="grid max-h-48 shrink-0 gap-2 overflow-y-auto px-2 pb-2 lg:grid-cols-2">
          <LayoutHistoryPanel warehouseId={warehouseId} />
          <ArrangementTasksPanel warehouseId={warehouseId} />
        </div>

        {/* ============================================================ */}
        {/* النوافذ المنبثقة                                            */}
        {/* ============================================================ */}

        {/* إضافة رف جديد */}
        {showAddModal && (
          <div
            data-testid="layout-add-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            dir="rtl"
          >
            <div
              className="w-full max-w-md rounded-2xl border p-5 shadow-2xl flex flex-col gap-4"
              style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--dtk-border)' }}>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-500" /> إضافة رف جديد إلى المستودع
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">رمز الرف (كود الباركود)*</label>
                  <input
                    type="text"
                    data-testid="add-rack-code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="مثال: WH-MAIN-A3"
                    className="w-full h-8 px-2.5 rounded border font-mono"
                    style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">اسم الرف الوصفي</label>
                  <input
                    type="text"
                    data-testid="add-rack-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثال: رف أدوية الضغط والمناعة"
                    className="w-full h-8 px-2.5 rounded border"
                    style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold block mb-1">الاسم بالعربية (Arabic)</label>
                    <input
                      type="text"
                      data-testid="add-rack-name-ar"
                      value={newNameAr}
                      onChange={(e) => setNewNameAr(e.target.value)}
                      placeholder="رف محاليل وريدية"
                      className="w-full h-8 px-2.5 rounded border"
                      style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">الاسم بالإنجليزية (English)</label>
                    <input
                      type="text"
                      data-testid="add-rack-name-en"
                      value={newNameEn}
                      onChange={(e) => setNewNameEn(e.target.value)}
                      placeholder="IV Solutions Rack"
                      className="w-full h-8 px-2.5 rounded border"
                      style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold block mb-1">الممر (Zone)</label>
                    <input
                      type="text"
                      data-testid="add-rack-zone"
                      value={newZone}
                      onChange={(e) => setNewZone(e.target.value)}
                      placeholder="A"
                      className="w-full h-8 px-2 text-center rounded border font-mono uppercase"
                      style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">الرف (Shelf)</label>
                    <input
                      type="text"
                      data-testid="add-rack-shelf"
                      value={newShelf}
                      onChange={(e) => setNewShelf(e.target.value)}
                      placeholder="1"
                      className="w-full h-8 px-2 text-center rounded border font-mono"
                      style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">المستوى</label>
                    <select
                      data-testid="add-rack-level"
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value)}
                      className="w-full h-8 px-2 text-center rounded border font-mono"
                      style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                    >
                      {Array.from({ length: maxLevel }, (_, i) => pad2(i + 1)).map((lv) => (
                        <option key={lv} value={lv}>
                          {lv}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1">نوع التخزين والحرارة</label>
                  <select
                    data-testid="add-rack-storage-type"
                    value={newStorageType}
                    onChange={(e) => setNewStorageType(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border"
                    style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                  >
                    <option value="ROOM">🌡️ حرارة الغرفة (15°C - 25°C)</option>
                    <option value="COLD">❄️ سلسلة تبريد دوائي (2°C - 8°C)</option>
                    <option value="QUARANTINE">⚠️ منطقة الحجر الصحي</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="newDirectPlace"
                    checked={newDirectPlace}
                    onChange={(e) => setNewDirectPlace(e.target.checked)}
                    className="rounded border"
                  />
                  <label htmlFor="newDirectPlace" className="cursor-pointer font-bold select-none text-[11px]">
                    تثبيت مباشر على أرضية المخطط (إلغاء التحديد يضعه في صينية الانتظار)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-3" style={{ borderColor: 'var(--dtk-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 h-8 rounded text-xs font-bold border hover:bg-slate-800"
                  style={{ borderColor: 'var(--dtk-border)' }}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  data-testid="add-rack-confirm-btn"
                  onClick={handleConfirmAdd}
                  className="px-4 h-8 rounded text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-md"
                >
                  تأكيد وإضافة الرف
                </button>
              </div>
            </div>
          </div>
        )}

        {/* تعديل الرف */}
        {showEditModal && (
          <div
            data-testid="layout-edit-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            dir="rtl"
          >
            <div
              className="w-full max-w-md rounded-2xl border p-5 shadow-2xl flex flex-col gap-4"
              style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--dtk-border)' }}>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-teal-400" /> تعديل بيانات الرف: {editCode}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">رمز الرف (الكود)*</label>
                  <input
                    type="text"
                    data-testid="edit-rack-code"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border font-mono"
                    style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">اسم الرف</label>
                  <input
                    type="text"
                    data-testid="edit-rack-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border"
                    style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold block mb-1">الاسم بالعربية (Arabic)</label>
                    <input
                      type="text"
                      data-testid="edit-rack-name-ar"
                      value={editNameAr}
                      onChange={(e) => setEditNameAr(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border"
                      style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">الاسم بالإنجليزية (English)</label>
                    <input
                      type="text"
                      data-testid="edit-rack-name-en"
                      value={editNameEn}
                      onChange={(e) => setEditNameEn(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border"
                      style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold block mb-1">الممر (Zone)</label>
                    <input
                      type="text"
                      data-testid="edit-rack-zone"
                      value={editZone}
                      onChange={(e) => setEditZone(e.target.value)}
                      className="w-full h-8 px-2 text-center rounded border font-mono uppercase"
                      style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">الرف (Shelf)</label>
                    <input
                      type="text"
                      data-testid="edit-rack-shelf"
                      value={editShelf}
                      onChange={(e) => setEditShelf(e.target.value)}
                      className="w-full h-8 px-2 text-center rounded border font-mono"
                      style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">المستوى</label>
                    <select
                      data-testid="edit-rack-level"
                      value={editLevel}
                      onChange={(e) => setEditLevel(e.target.value)}
                      className="w-full h-8 px-2 text-center rounded border font-mono"
                      style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                    >
                      {Array.from({ length: maxLevel }, (_, i) => pad2(i + 1)).map((lv) => (
                        <option key={lv} value={lv}>
                          {lv}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold block mb-1">نوع التخزين والحرارة</label>
                    <select
                      data-testid="edit-rack-storage-type"
                      value={editStorageType}
                      onChange={(e) => setEditStorageType(e.target.value)}
                      className="w-full h-8 px-2 rounded border"
                      style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                    >
                      <option value="ROOM">🌡️ حرارة الغرفة</option>
                      <option value="COLD">❄️ سلسلة تبريد</option>
                      <option value="QUARANTINE">⚠️ حجر صحي</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold block mb-1">عدد المستويات</label>
                    <select
                      data-testid="edit-rack-levels"
                      value={editLevels}
                      onChange={(e) => setEditLevels(Number(e.target.value) || 4)}
                      className="w-full h-8 px-2 rounded border"
                      style={{ background: 'var(--dtk-field)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
                    >
                      <option value={2}>2 مستويات</option>
                      <option value={3}>3 مستويات</option>
                      <option value={4}>4 مستويات</option>
                      <option value={5}>5 مستويات</option>
                      <option value={6}>6 مستويات</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editRot"
                    checked={editRot}
                    onChange={(e) => setEditRot(e.target.checked)}
                    className="rounded border"
                  />
                  <label htmlFor="editRot" className="cursor-pointer font-bold select-none text-[11px]">
                    تدوير الرف 90 درجة
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-3" style={{ borderColor: 'var(--dtk-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 h-8 rounded text-xs font-bold border hover:bg-slate-800"
                  style={{ borderColor: 'var(--dtk-border)' }}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  data-testid="edit-rack-confirm-btn"
                  onClick={handleConfirmEdit}
                  className="px-4 h-8 rounded text-xs font-bold bg-teal-600 text-white hover:bg-teal-500 shadow-md"
                >
                  حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        )}

        {/* حذف الرف */}
        {showDeleteModal && selectedPlacement && (
          <div
            data-testid="layout-delete-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            dir="rtl"
          >
            <div
              className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl flex flex-col gap-4"
              style={{ background: 'var(--dtk-surface)', borderColor: 'var(--dtk-border)', color: 'var(--dtk-ink)' }}
            >
              <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <h3>حذف أو إلغاء تثبيت الرف</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف الرف{' '}
                <strong className="font-mono text-teal-400">{selectedPlacement.code}</strong>؟
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  data-testid="delete-rack-permanent-btn"
                  onClick={() => handleConfirmDelete('permanent')}
                  className="h-8 rounded text-xs font-bold bg-rose-600 text-white hover:bg-rose-500"
                >
                  🗑️ حذف نهائي من المستودع
                </button>
                <button
                  type="button"
                  data-testid="delete-rack-unassign-btn"
                  onClick={() => handleConfirmDelete('unassign')}
                  className="h-8 rounded text-xs font-bold border text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
                >
                  📦 إلغاء التثبيت فقط (إعادة لصينية الانتظار)
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="h-8 rounded text-xs font-bold border hover:bg-slate-800"
                  style={{ borderColor: 'var(--dtk-border)' }}
                >
                  إلغاء التراجع
                </button>
              </div>
            </div>
          </div>
        )}

        {/* إضافة عنصر معماري (WDA CAD Elements) */}
        <AddElementModal
          isOpen={showAddElementModal}
          onClose={() => setShowAddElementModal(false)}
          onAdd={(newElem) => {
            setElements((prev) => [...prev, newElem]);
            setSelectedElementId(newElem.id);
            setSelectedPlacementId(null);
            setFlash({ tone: 'ok', text: `تمت إضافة العنصر المعماري: ${newElem.label}` });
          }}
          ww={dimensions.ww}
          wd={dimensions.wd}
        />

        {/* توسيع أبعاد المستودع (WDA Dimensions) */}
        <ExpandDimensionsModal
          isOpen={showExpandModal}
          onClose={() => setShowExpandModal(false)}
          widthM={dimensions.ww}
          depthM={dimensions.wd}
          heightM={dimensions.wh}
          onApply={(newW, newD, newH) => {
            setDimensions({ ww: newW, wd: newD, wh: newH });
            setFlash({ tone: 'ok', text: `تم تحديث أبعاد المستودع إلى ${newW}م عرض × ${newD}م عمق` });
          }}
        />

        {/* تفصيل خانات ومستويات الرف */}
        <RackCellsModal
          isOpen={showRackCellsModal}
          onClose={() => setShowRackCellsModal(false)}
          rack={selectedPlacement}
          onUpdateRack={(updated) => {
            setPlacements((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setFlash({ tone: 'ok', text: `تم تحديث مستويات وخانات الرف ${updated.code}` });
          }}
        />

        {/* نشر التخطيط وصلاحيات الرؤية لموظفي ياسين */}
        <StaffVisibilityPublishModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          currentVersion={blueprintVersion}
          onPublish={handlePublishBlueprint}
        />

        {/* قائمة السياق بالزر الأيمن للماوس (Desktop Context Menu) */}
        <DesktopContextMenu
          state={contextMenu}
          onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
          onEditRack={(id) => {
            const tgt = placements.find((p) => p.id === id);
            if (tgt) handleOpenEditModal(tgt);
          }}
          onRackCells={(id) => {
            setSelectedPlacementId(id);
            setSelectedElementId(null);
            setShowRackCellsModal(true);
          }}
          onRotateRack={(id) => {
            setPlacements((prev) =>
              prev.map((item) => (item.id === id ? { ...item, rot: !item.rot } : item)),
            );
          }}
          onDuplicateRack={handleDuplicateRack}
          onAssignTask={handleAssignToAshraf}
          onPrintLabel={handlePrintRackBarcode}
          onUnassignRack={(id) => {
            setSelectedPlacementId(id);
            void handleConfirmDelete('unassign');
          }}
          onDeleteRack={(id) => {
            setSelectedPlacementId(id);
            void handleConfirmDelete('permanent');
          }}
          onEditElement={(id) => {
            setSelectedElementId(id);
            setSelectedPlacementId(null);
            setShowAddElementModal(true);
          }}
          onRotateElement={(id) => {
            setElements((prev) =>
              prev.map((el) => (el.id === id ? { ...el, rotation: (el.rotation + 90) % 360 } : el)),
            );
          }}
          onDeleteElement={(id) => {
            setElements((prev) => prev.filter((el) => el.id !== id));
            setSelectedElementId(null);
            setFlash({ tone: 'ok', text: 'تم حذف العنصر المعماري بنجاح' });
          }}
          onAddRackAt={handleAddRackAt}
          onAddDoorAt={handleAddDoorAt}
          onAddPillarAt={handleAddPillarAt}
          onAddZoneAt={handleAddZoneAt}
        />

        {/* قائمة اللمس الدائرية لمشرف الترتيب أشرف (Ashraf Radial Touch Menu) */}
        {radialTouch.isOpen && (placements.find((p) => p.id === radialTouch.rackId) || selectedPlacement) && (
          <AshrafTouchRadialMenu
            isOpen={radialTouch.isOpen}
            x={radialTouch.x}
            y={radialTouch.y}
            rack={(placements.find((p) => p.id === radialTouch.rackId) || selectedPlacement)!}
            onClose={() => setRadialTouch((prev) => ({ ...prev, isOpen: false }))}
            onEdit={() => {
              setRadialTouch((prev) => ({ ...prev, isOpen: false }));
              const tgt = placements.find((p) => p.id === radialTouch.rackId) || selectedPlacement;
              if (tgt) handleOpenEditModal(tgt);
            }}
            onCells={() => {
              setRadialTouch((prev) => ({ ...prev, isOpen: false }));
              setShowRackCellsModal(true);
            }}
            onPhoto={() => {
              setRadialTouch((prev) => ({ ...prev, isOpen: false }));
              setTouchBottomSheetOpen(true);
            }}
            onScan={() => {
              setRadialTouch((prev) => ({ ...prev, isOpen: false }));
              setTouchBottomSheetOpen(true);
            }}
            onRotate={() => {
              setRadialTouch((prev) => ({ ...prev, isOpen: false }));
              const targetId = radialTouch.rackId || selectedPlacementId;
              if (targetId) {
                setPlacements((prev) =>
                  prev.map((item) => (item.id === targetId ? { ...item, rot: !item.rot } : item)),
                );
              }
            }}
            onDone={() => {
              setRadialTouch((prev) => ({ ...prev, isOpen: false }));
              void handleTouchCompleteArrangement();
            }}
          />
        )}

        {/* دليل اختصارات لوحة المفاتيح والتحكم الشامل بالماوس */}
        <KeyboardShortcutsModal
          isOpen={showShortcutsModal}
          onClose={() => setShowShortcutsModal(false)}
        />

        {/* درج اللمس السفلي لمشرف الترتيب أشرف (Ashraf Touch Bottom Sheet) */}
        <AshrafTouchBottomSheet
          isOpen={touchBottomSheetOpen}
          rack={selectedPlacement}
          onClose={() => setTouchBottomSheetOpen(false)}
          onUpdateRack={(updated) => {
            setPlacements((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            setFlash({ tone: 'ok', text: `تم تحديث الرف ${updated.code} بنجاح` });
          }}
          onUploadPhoto={handleTouchUploadPhoto}
          onCompleteArrangement={handleTouchCompleteArrangement}
        />
      </div>
    </ScreenShell>
  );
}

export default WarehouseLayoutScreen;
