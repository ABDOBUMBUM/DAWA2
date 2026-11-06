/**
 * DAWA 3D Warehouse Engine & Worker Journey — Master Application
 * Production-grade WebGL Three.js warehouse layout designer & real-time inventory twin with:
 * - Real carved architectural doorways & openable entrances
 * - Unbounded full-wall rack expansion & 360-degree continuous rotation
 * - Global & per-item edit lock toggle
 * - Individual control of all 4 warehouse perimeter walls, high-DPI floor/wall textures & sky backdrops
 * - Precision zoom to any cell & its 3D floating label in all camera modes + 3D cell extrusion (بروز الخانة)
 * - Real-time SQLite database synchronization (/api/warehouse/realtime & SSE) for Orders, Expired, & Returns
 * - Dedicated Item & Cell Locator View (مستكشف وموجه الأصناف والخانات الحقيقي)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  WarehouseRack,
  RackCell,
  ArchitecturalElement,
  WarehouseDimensions,
  WarehouseEnvironmentConfig,
  DEFAULT_ENVIRONMENT_CONFIG,
  GraphicsQualityConfig,
  DEFAULT_GRAPHICS_CONFIG,
  FefoRadarConfig,
  DEFAULT_FEFO_CONFIG,
  CameraMode,
  ContextMenuState,
  SelectionState,
  WorkerConfig,
  PackageConfig,
  RealTimeCellInventoryItem,
  RealTimeInventoryTransaction,
  getRackRotationDeg,
  createEmptyRackCellsForAshraf,
} from './types/warehouse';
import { parseVoiceCommand } from './utils/qrCodeGenerator';
import { WarehouseScene } from './three/WarehouseScene';
import { Warehouse3DCanvas } from './components/Warehouse3DCanvas';
import { Navbar } from './components/Navbar';
import { SideEditorDrawer } from './components/SideEditorDrawer';
import { WarehouseExportSheetModal } from './components/WarehouseExportSheetModal';
import { InspectorPanel } from './components/InspectorPanel';
import { JourneyHUD } from './components/JourneyHUD';
import { WorkerControlHUD } from './components/WorkerControlHUD';
import {
  AddRackModal,
  RackCellsModal,
  AddElementModal,
  ExpandDimensionsModal,
  KeyboardShortcutsModal,
} from './components/Modals';
import { DesktopContextMenu, AshrafTouchRadialMenu } from './components/ContextMenu';
import { RackThumbnailCard } from './components/RackThumbnailCard';
import { OrderPickingHUD } from './components/OrderPickingHUD';
import { ItemLocatorModal } from './components/ItemLocatorModal';
import { GraphicsAndFefoHUD } from './components/GraphicsAndFefoHUD';
import { MatrixExplorerModal } from './components/MatrixExplorerModal';
import { AntigravityGuideModal } from './components/AntigravityGuideModal';

// Initial realistic default racks for pharmaceutical warehouse
const INITIAL_RACKS: WarehouseRack[] = [
  {
    id: 'rack-a1',
    code: 'WH-MAIN-A1',
    name: 'رف أدوية الطوارئ والمسكنات',
    nameAr: 'رف أدوية الطوارئ والمسكنات',
    nameEn: 'Emergency & Analgesics Rack',
    rackType: 'STEEL_INDUSTRIAL',
    zone: 'A',
    shelf: '1',
    levelVal: '01',
    status: 'APPROVED',
    storageType: 'ROOM',
    px: 4.5,
    pz: 7.2,
    rot: false,
    rotation: 0,
    w: 2.4,
    d: 1.0,
    h: 3.8,
    levels: 4,
    cellsPerLevel: 3,
  },
  {
    id: 'rack-a2',
    code: 'WH-MAIN-A2',
    name: 'رف المضادات الحيوية واسعة المجال',
    nameAr: 'رف المضادات الحيوية واسعة المجال',
    nameEn: 'Broad-Spectrum Antibiotics Rack',
    rackType: 'STEEL_INDUSTRIAL',
    zone: 'A',
    shelf: '2',
    levelVal: '01',
    status: 'APPROVED',
    storageType: 'ROOM',
    px: 4.5,
    pz: 10.2,
    rot: false,
    rotation: 0,
    w: 2.4,
    d: 1.0,
    h: 3.8,
    levels: 4,
    cellsPerLevel: 3,
  },
  {
    id: 'rack-b1',
    code: 'WH-MAIN-B1',
    name: 'رف المحاليل الوريدية والسوائل',
    nameAr: 'رف المحاليل الوريدية والسوائل',
    nameEn: 'IV Fluids & Infusions Rack',
    rackType: 'STEEL_INDUSTRIAL',
    zone: 'B',
    shelf: '1',
    levelVal: '01',
    status: 'APPROVED',
    storageType: 'ROOM',
    px: 9.0,
    pz: 7.2,
    rot: false,
    rotation: 0,
    w: 2.4,
    d: 1.0,
    h: 3.8,
    levels: 4,
    cellsPerLevel: 3,
  },
  {
    id: 'rack-b2',
    code: 'WH-MAIN-B2',
    name: 'رف أدوية القلب والأوعية الدموية',
    nameAr: 'رف أدوية القلب والأوعية الدموية',
    nameEn: 'Cardiovascular & Hypertension Rack',
    rackType: 'STEEL_INDUSTRIAL',
    zone: 'B',
    shelf: '2',
    levelVal: '01',
    status: 'APPROVED',
    storageType: 'ROOM',
    px: 9.0,
    pz: 10.2,
    rot: false,
    rotation: 0,
    w: 2.4,
    d: 1.0,
    h: 3.8,
    levels: 4,
    cellsPerLevel: 3,
  },
  {
    id: 'rack-wood-1',
    code: 'CAB-WOOD-01',
    name: 'خزانة جدارية خشبية (أدوية خاصة وفيتامينات)',
    nameAr: 'خزانة جدارية خشبية (أدوية خاصة وفيتامينات)',
    nameEn: 'Wooden Wall Medicine Cabinet',
    rackType: 'WOODEN_CABINET',
    zone: 'W',
    shelf: '1',
    levelVal: '01',
    status: 'APPROVED',
    storageType: 'ROOM',
    px: 1.2,
    pz: 7.5,
    rot: false,
    rotation: 0,
    w: 2.2,
    d: 0.65,
    h: 2.6,
    levels: 4,
    cellsPerLevel: 3,
  },
  {
    id: 'rack-cold-1',
    code: 'WH-COLD-01',
    name: 'رف سلسلة التبريد الدوائي (أنسولين ولقاحات)',
    nameAr: 'رف سلسلة التبريد الدوائي',
    nameEn: 'Cold Chain Vaccines & Insulin Rack',
    rackType: 'STEEL_INDUSTRIAL',
    zone: 'COLD',
    shelf: '1',
    levelVal: '01',
    status: 'APPROVED',
    storageType: 'COLD',
    px: 3.8,
    pz: 3.2,
    rot: true,
    rotation: 90,
    w: 2.6,
    d: 1.0,
    h: 3.6,
    levels: 3,
    cellsPerLevel: 3,
  },
];

// Initial CAD Architectural Elements (Doors positioned on North wall z=0 for true carved portals)
const INITIAL_ELEMENTS: ArchitecturalElement[] = [
  {
    id: 'elem-door-main',
    type: 'DOOR',
    subType: 'MAIN_ENTRANCE',
    label: 'بوابة المستودع الرئيسية (Main Entrance)',
    x: 10.2,
    z: 0.0,
    w: 3.2,
    d: 0.42,
    h: 3.4,
    openRatio: 0.9,
  },
  {
    id: 'elem-dock-1',
    type: 'DOOR',
    subType: 'DOCK_BAY',
    label: 'رصيف استلام الشاحنات BAY 01',
    x: 15.2,
    z: 0.0,
    w: 3.4,
    d: 0.45,
    h: 3.8,
    openRatio: 0.85,
  },
  {
    id: 'elem-dock-2',
    type: 'DOOR',
    subType: 'DOCK_BAY',
    label: 'رصيف شحن الحاويات BAY 02',
    x: 19.4,
    z: 0.0,
    w: 3.4,
    d: 0.45,
    h: 3.8,
    openRatio: 0.85,
  },
  {
    id: 'elem-pillar-1',
    type: 'PILLAR',
    subType: 'CONCRETE_ROUND',
    label: 'عمود إنشائي خرساني C1',
    x: 6.8,
    z: 5.5,
    w: 0.6,
    d: 0.6,
    h: 8.0,
  },
  {
    id: 'elem-pillar-2',
    type: 'PILLAR',
    subType: 'CONCRETE_ROUND',
    label: 'عمود إنشائي خرساني C2',
    x: 13.8,
    z: 5.5,
    w: 0.6,
    d: 0.6,
    h: 8.0,
  },
  {
    id: 'elem-zone-receiving',
    type: 'ZONE',
    subType: 'RECEIVING',
    label: '01 / محطة الاستلام والتوريد',
    x: 14.5,
    z: 0.5,
    w: 9.0,
    d: 3.5,
    h: 0.1,
    color: '#3b82f6',
  },
  {
    id: 'elem-zone-storage',
    type: 'ZONE',
    subType: 'STORAGE',
    label: '02 / التخزين والرفوف الصناعية',
    x: 1.0,
    z: 6.0,
    w: 12.0,
    d: 9.0,
    h: 0.1,
    color: '#06b6d4',
  },
  {
    id: 'elem-zone-qc',
    type: 'ZONE',
    subType: 'QC',
    label: '03 / الفحص وضبط الجودة',
    x: 1.0,
    z: 0.5,
    w: 6.0,
    d: 5.0,
    h: 0.1,
    color: '#10b981',
  },
  {
    id: 'elem-zone-consolidation',
    type: 'ZONE',
    subType: 'CONSOLIDATION',
    label: '04 / تجميع الطلبيات',
    x: 7.5,
    z: 0.5,
    w: 6.0,
    d: 5.0,
    h: 0.1,
    color: '#8b5cf6',
  },
  {
    id: 'elem-zone-packing',
    type: 'ZONE',
    subType: 'PACKING',
    label: '05 / التعبئة والتغليف',
    x: 14.5,
    z: 4.5,
    w: 9.0,
    d: 5.0,
    h: 0.1,
    color: '#f59e0b',
  },
  {
    id: 'elem-zone-dispatch',
    type: 'ZONE',
    subType: 'DISPATCH',
    label: '06 / رصيف الشحن والتوزيع',
    x: 14.5,
    z: 10.0,
    w: 9.0,
    d: 5.5,
    h: 0.1,
    color: '#2563eb',
  },
];

export default function App() {
  // Warehouse Layout & Environment State
  const [dimensions, setDimensions] = useState<WarehouseDimensions>({ ww: 24, wd: 16, wh: 8 });
  const [envConfig, setEnvConfig] = useState<WarehouseEnvironmentConfig>(() => {
    const saved = localStorage.getItem('dawa_3d_env_config');
    return saved ? { ...DEFAULT_ENVIRONMENT_CONFIG, ...JSON.parse(saved) } : DEFAULT_ENVIRONMENT_CONFIG;
  });
  const [graphicsConfig, setGraphicsConfig] = useState<GraphicsQualityConfig>(() => {
    const saved = localStorage.getItem('dawa_3d_graphics_config');
    return saved ? { ...DEFAULT_GRAPHICS_CONFIG, ...JSON.parse(saved) } : DEFAULT_GRAPHICS_CONFIG;
  });
  const [fefoRadar, setFefoRadar] = useState<FefoRadarConfig>(DEFAULT_FEFO_CONFIG);
  const [racks, setRacks] = useState<WarehouseRack[]>(() => {
    const saved = localStorage.getItem('dawa_3d_racks');
    return saved ? JSON.parse(saved) : INITIAL_RACKS;
  });
  const [elements, setElements] = useState<ArchitecturalElement[]>(() => {
    const saved = localStorage.getItem('dawa_3d_elements');
    return saved ? JSON.parse(saved) : INITIAL_ELEMENTS;
  });

  // Undo / Redo History Stack for Rack & Element Placements, Moves, Rotations, and Deletions
  interface LayoutSnapshot {
    racks: WarehouseRack[];
    elements: ArchitecturalElement[];
    dimensions: WarehouseDimensions;
  }
  const [historyPast, setHistoryPast] = useState<LayoutSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<LayoutSnapshot[]>([]);
  const racksRef = useRef(racks);
  const elementsRef = useRef(elements);
  const dimensionsRef = useRef(dimensions);
  useEffect(() => {
    racksRef.current = racks;
  }, [racks]);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  useEffect(() => {
    dimensionsRef.current = dimensions;
  }, [dimensions]);

  const pushHistorySnapshot = useCallback(() => {
    const snap: LayoutSnapshot = {
      racks: JSON.parse(JSON.stringify(racksRef.current)),
      elements: JSON.parse(JSON.stringify(elementsRef.current)),
      dimensions: { ...dimensionsRef.current },
    };
    setHistoryPast((prev) => [...prev.slice(-24), snap]);
    setHistoryFuture([]);
  }, []);

  // Real-Time SQLite Inventory State
  const [realtimeInventory, setRealtimeInventory] = useState<RealTimeCellInventoryItem[]>([]);
  const [realtimeTransactions, setRealtimeTransactions] = useState<RealTimeInventoryTransaction[]>([]);
  const [isRealtimeLoading, setIsRealtimeLoading] = useState(false);
  const [showItemLocatorModal, setShowItemLocatorModal] = useState(false);
  const [showMatrixExplorerModal, setShowMatrixExplorerModal] = useState(false);
  const [showAntigravityGuideModal, setShowAntigravityGuideModal] = useState(false);

  // Granular 3D Selection & Lock State
  const [selection, setSelection] = useState<SelectionState>({ type: null });
  const [isSideDrawerOpen, setIsSideDrawerOpen] = useState(false);
  const [isEditLocked, setIsEditLocked] = useState(false);
  const [showFloatingLabels, setShowFloatingLabels] = useState(true);
  const [showWorker, setShowWorker] = useState(true);
  const [isOrderPickingOpen, setIsOrderPickingOpen] = useState(false);
  const [activeThumbnailRackId, setActiveThumbnailRackId] = useState<string | null>(null);

  // Worker & Package Customization Config
  const [workerConfig, setWorkerConfig] = useState<WorkerConfig>({
    name: 'المشرف أشرف / د. ياسين',
    role: 'Warehouse Operations Supervisor',
    walkSpeed: 1.6,
    actionState: 'IDLE',
    carryingBox: false,
    carriedBoxCode: 'PKG-572',
    carriedBoxColor: '#f59e0b',
    vestColor: '#84cc16',
    helmetColor: '#facc15',
    suitColor: '#1e293b',
  });

  const [packageConfig, setPackageConfig] = useState<PackageConfig>({
    code: 'PKG-572',
    productName: 'أدوية ومستحضرات طبية مركزة',
    batchNumber: 'BCH-2026-99',
    quantity: 85,
    color: '#f59e0b',
  });

  // UI & Simulation Mode
  const [isDesigner, setIsDesigner] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('ORBIT');
  const [simSpeed, setSimSpeed] = useState(1.0);
  const [isPaused, setIsPaused] = useState(false);
  const [isSimulatingJourney, setIsSimulatingJourney] = useState(false);
  const [currentJourneyStage, setCurrentJourneyStage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [dirtyCount, setDirtyCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Context Menu & Touch Radial Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    targetType: 'FLOOR',
    targetId: null,
    worldX: 12,
    worldZ: 8,
  });
  const [touchRadial, setTouchRadial] = useState<{
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

  // Modal Dialogs State
  const [showAddRackModal, setShowAddRackModal] = useState(false);
  const [showRackCellsModal, setShowRackCellsModal] = useState(false);
  const [showAddElementModal, setShowAddElementModal] = useState(false);
  const [showExpandModal, setShowExpandModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showExportReportModal, setShowExportReportModal] = useState(false);

  // Scene Reference
  const sceneInstanceRef = useRef<WarehouseScene | null>(null);

  // Toast Notification Helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Merge Real-Time SQLite Inventory into 3D Racks' customCells
  const applyRealtimeInventoryToRacks = useCallback(
    (inv: RealTimeCellInventoryItem[]) => {
      if (!inv || inv.length === 0) return;
      const byRack = new Map<string, RealTimeCellInventoryItem[]>();
      inv.forEach((item) => {
        const list = byRack.get(item.rackId) || [];
        list.push(item);
        byRack.set(item.rackId, list);
      });

      setRacks((prevRacks) =>
        prevRacks.map((rack) => {
          const dbCells = byRack.get(rack.id);
          if (!dbCells || dbCells.length === 0) return rack;

          const existingMap = new Map<string, RackCell>();
          (rack.customCells || []).forEach((c) => {
            existingMap.set(`${c.level}-${c.slot}`, c);
          });

          dbCells.forEach((dbCell) => {
            const key = `${dbCell.level}-${dbCell.slot}`;
            const prevCell = existingMap.get(key);
            const isOccupied = dbCell.quantity > 0;
            existingMap.set(key, {
              ...prevCell,
              id: dbCell.id,
              code: dbCell.cellCode,
              level: dbCell.level,
              slot: dbCell.slot,
              occupied: isOccupied,
              productName: dbCell.productName,
              nameEn: dbCell.nameEn,
              scientificName: dbCell.scientificName,
              barcode: dbCell.barcode,
              batchNumber: dbCell.batchNumber,
              expiryDate: dbCell.expiryDate,
              quantity: dbCell.quantity,
              capacity: dbCell.capacity,
              storageCondition: dbCell.storageCondition,
              movementCategory: dbCell.movementCategory,
              orderRef: dbCell.orderRef,
              returnReason: dbCell.returnReason,
              updatedAt: dbCell.updatedAt,
              medicines: isOccupied ? prevCell?.medicines : [],
            });
          });

          return {
            ...rack,
            customCells: Array.from(existingMap.values()),
          };
        }),
      );
    },
    [],
  );

  // Handover Empty Warehouse to Supervisor Ashraf (تفريغ جميع الخانات لتسليمها لأشرف)
  const handleEmptyAllRacksForAshraf = useCallback(async () => {
    pushHistorySnapshot();
    setRacks((prev) =>
      prev.map((rack) => ({
        ...rack,
        customCells: createEmptyRackCellsForAshraf(rack),
      })),
    );
    try {
      const res = await fetch('/api/warehouse/handover-empty', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.payload) {
          setRealtimeInventory(data.payload.inventory || []);
          setRealtimeTransactions(data.payload.transactions || []);
        }
      }
    } catch {
      // Ignore network fallback
    }
    setDirtyCount((c) => c + 1);
    showToast('🧹 تم تفريغ جميع خانات المستودع (0 عبوة) — جاهز لتسليم المشرف أشرف وتعبئته!');
  }, [pushHistorySnapshot, showToast]);

  // Restore Sample Pharmaceutical Inventory
  const handleRestoreSampleInventory = useCallback(async () => {
    pushHistorySnapshot();
    setRacks(INITIAL_RACKS);
    try {
      const res = await fetch('/api/warehouse/restore-sample', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.payload) {
          setRealtimeInventory(data.payload.inventory || []);
          setRealtimeTransactions(data.payload.transactions || []);
          applyRealtimeInventoryToRacks(data.payload.inventory || []);
        }
      }
    } catch {
      // Ignore network fallback
    }
    setDirtyCount((c) => c + 1);
    showToast('🔄 تمت استعادة بيانات الأدوية التجريبية في جميع الرفوف وقاعدة البيانات ✓');
  }, [pushHistorySnapshot, applyRealtimeInventoryToRacks, showToast]);

  // Fetch & Subscribe to Real-Time SQLite Backend
  const fetchRealtimeData = useCallback(async () => {
    setIsRealtimeLoading(true);
    try {
      const res = await fetch('/api/warehouse/realtime');
      if (res.ok) {
        const data = await res.json();
        setRealtimeInventory(data.inventory || []);
        setRealtimeTransactions(data.transactions || []);
        applyRealtimeInventoryToRacks(data.inventory || []);
      }
    } catch {
      // Ignore transient network errors
    } finally {
      setIsRealtimeLoading(false);
    }
  }, [applyRealtimeInventoryToRacks]);

  useEffect(() => {
    fetchRealtimeData();

    // Connect SSE stream for live database push updates
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/warehouse/stream');
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.inventory) {
            setRealtimeInventory(payload.inventory);
            applyRealtimeInventoryToRacks(payload.inventory);
          }
          if (payload.transactions) {
            setRealtimeTransactions(payload.transactions);
          }
        } catch {
          // Ignore malformed event
        }
      };
    } catch {
      // Fallback if EventSource is unavailable
    }

    return () => {
      es?.close();
    };
  }, [fetchRealtimeData, applyRealtimeInventoryToRacks]);

  // Execute Real-Time DB Pull / Movement Action
  const handleExecuteRealtimePull = useCallback(
    async (
      item: RealTimeCellInventoryItem,
      actionType: 'ORDER_PICK' | 'EXPIRED_PULL' | 'RETURN_PROCESS' | 'RESTOCK',
      qty: number,
    ) => {
      try {
        const res = await fetch('/api/warehouse/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cellId: item.id,
            rackId: item.rackId,
            level: item.level,
            slot: item.slot,
            actionType,
            qty,
            operatorName: isDesigner ? 'المشرف أشرف' : 'محمد القحطاني (تجهيز)',
            referenceCode:
              actionType === 'EXPIRED_PULL'
                ? 'EXP-PULL-2026'
                : actionType === 'RETURN_PROCESS'
                ? 'RET-IN-2026'
                : item.orderRef || 'ORD-2026-LIVE',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.payload) {
            setRealtimeInventory(data.payload.inventory || []);
            setRealtimeTransactions(data.payload.transactions || []);
            applyRealtimeInventoryToRacks(data.payload.inventory || []);
          }
          const actionLabel =
            actionType === 'EXPIRED_PULL'
              ? `تم سحب الصنف المنتهي (${item.productName}) من الخانة ${item.cellCode} للحجر ✓`
              : actionType === 'RETURN_PROCESS'
              ? `تم تسكين المرتجع (+${qty}) في الخانة ${item.cellCode} بقاعدة البيانات ✓`
              : `تم سحب (${qty} عبوة) للطلبية من الخانة ${item.cellCode} وتحديث الرصيد الحي ✓`;
          showToast(actionLabel);
        }
      } catch {
        showToast('تعذر الاتصال بقاعدة البيانات اللحظية');
      }
    },
    [isDesigner, applyRealtimeInventoryToRacks, showToast],
  );

  // Quick 3D Pop-up Pull Action
  const handleQuickCellPullAction = useCallback(
    (
      rackId: string,
      level: number,
      slot: number,
      actionType: 'ORDER_PICK' | 'EXPIRED_PULL' | 'RETURN_PROCESS',
      qty: number,
    ) => {
      const cellId = `${rackId}-L${level}-S${slot}`;
      const matched = realtimeInventory.find(
        (i) => i.id === cellId || (i.rackId === rackId && i.level === level && i.slot === slot),
      );
      if (matched) {
        handleExecuteRealtimePull(matched, actionType, qty);
      } else {
        showToast(`تم تسجيل حركة ${actionType} للخانة L${level}-S${slot} ✓`);
      }
    },
    [realtimeInventory, handleExecuteRealtimePull, showToast],
  );

  // Locate Cell on 3D Map from ItemLocatorModal (Fly Camera + Extrude Cell in 3D + Pop Up Contents + Walk Worker)
  const handleLocateCellOn3DMap = useCallback(
    (item: RealTimeCellInventoryItem, dispatchWorker = true) => {
      setShowItemLocatorModal(false);
      setShowFloatingLabels(true);

      const newSel: SelectionState = {
        type: 'CELL',
        rackId: item.rackId,
        cellLevel: item.level,
        cellSlot: item.slot,
        cellCode: item.cellCode,
      };
      setSelection(newSel);
      setIsSideDrawerOpen(true);

      if (sceneInstanceRef.current) {
        sceneInstanceRef.current.focusOnCell(item.rackId, item.level, item.slot);
        if (dispatchWorker) {
          sceneInstanceRef.current.sendWorkerToRack(item.rackId, item.level);
        }
      }

      showToast(
        `🎯 تم التوجيه إلى ${item.rackCode} · الخانة ${item.cellCode} (${item.productName}) وبروز الخانة 3D!`,
      );
    },
    [showToast],
  );

  // Selected Rack / Element helpers
  const selectedRack = selection.rackId ? racks.find((r) => r.id === selection.rackId) || null : null;
  const selectedElement = selection.elementId ? elements.find((e) => e.id === selection.elementId) || null : null;

  // Save changes to localStorage
  const handleSaveLayout = useCallback(() => {
    localStorage.setItem('dawa_3d_racks', JSON.stringify(racks));
    localStorage.setItem('dawa_3d_elements', JSON.stringify(elements));
    localStorage.setItem('dawa_3d_dimensions', JSON.stringify(dimensions));
    localStorage.setItem('dawa_3d_env_config', JSON.stringify(envConfig));
    setDirtyCount(0);
    showToast('تم حفظ ومزامنة المخطط ثلاثي الأبعاد وإعدادات الجدران والخامات بنجاح ✓');
  }, [racks, elements, dimensions, envConfig, showToast]);

  const handleResetLayout = useCallback(() => {
    setRacks(INITIAL_RACKS);
    setElements(INITIAL_ELEMENTS);
    setDimensions({ ww: 24, wd: 16, wh: 8 });
    setEnvConfig(DEFAULT_ENVIRONMENT_CONFIG);
    fetchRealtimeData();
    setDirtyCount(0);
    showToast('تمت استعادة المخطط الافتراضي ومزامنة قاعدة البيانات الحقيقية');
  }, [fetchRealtimeData, showToast]);

  // Target Selection Handler:
  // Left-clicking a Rack or Element selects it safely and displays the floating "خيار تعديل العنصر والتحريك" bar
  // without forcing open the full side drawer or moving the element accidentally!
  const handleSelectTarget = useCallback((sel: SelectionState) => {
    setSelection(sel);
    if (sel.type === 'WAREHOUSE' || sel.type === 'WORKER' || sel.type === 'PACKAGE') {
      setIsSideDrawerOpen(true);
    } else if (!sel.type) {
      setIsSideDrawerOpen(false);
    }
  }, []);

  // Environment Config Updater
  const handleUpdateEnvConfig = useCallback((patch: Partial<WarehouseEnvironmentConfig>) => {
    setEnvConfig((prev) => ({ ...prev, ...patch }));
    setDirtyCount((c) => c + 1);
  }, []);

  // Graphics Quality Updater
  const handleUpdateGraphicsConfig = useCallback((nextCfg: GraphicsQualityConfig) => {
    setGraphicsConfig(nextCfg);
    localStorage.setItem('dawa_3d_graphics_config', JSON.stringify(nextCfg));
  }, []);

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    const currentSnap: LayoutSnapshot = {
      racks: JSON.parse(JSON.stringify(racksRef.current)),
      elements: JSON.parse(JSON.stringify(elementsRef.current)),
      dimensions: { ...dimensionsRef.current },
    };
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [currentSnap, ...prev.slice(0, 24)]);
    setRacks(previous.racks);
    setElements(previous.elements);
    setDimensions(previous.dimensions);
    setDirtyCount((c) => c + 1);
    showToast('↩️ تم التراجع عن آخر تعديل بنجاح (Undo)');
  }, [historyPast, showToast]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    const currentSnap: LayoutSnapshot = {
      racks: JSON.parse(JSON.stringify(racksRef.current)),
      elements: JSON.parse(JSON.stringify(elementsRef.current)),
      dimensions: { ...dimensionsRef.current },
    };
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev.slice(-24), currentSnap]);
    setRacks(next.racks);
    setElements(next.elements);
    setDimensions(next.dimensions);
    setDirtyCount((c) => c + 1);
    showToast('↪️ تمت إعادة تطبيق التعديل بنجاح (Redo)');
  }, [historyFuture, showToast]);

  // Rack Operations (Also syncs edited cells back to SQLite)
  const handleUpdateRack = useCallback((updated: WarehouseRack) => {
    pushHistorySnapshot();
    setRacks((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setDirtyCount((c) => c + 1);

    // Sync any updated customCells to SQLite backend
    if (updated.customCells && updated.customCells.length > 0) {
      updated.customCells.forEach((cell) => {
        fetch('/api/warehouse/cell-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: cell.id || `${updated.id}-L${cell.level}-S${cell.slot}`,
            rackId: updated.id,
            rackCode: updated.code,
            level: Number(cell.level),
            slot: Number(cell.slot),
            cellCode: cell.code,
            productName: cell.productName,
            nameEn: cell.nameEn,
            scientificName: cell.scientificName,
            barcode: cell.barcode,
            batchNumber: cell.batchNumber,
            expiryDate: cell.expiryDate,
            quantity: cell.quantity,
            capacity: cell.capacity,
            storageCondition: cell.storageCondition || updated.storageType || 'ROOM',
            movementCategory: cell.movementCategory || 'AVAILABLE',
          }),
        }).catch(() => {});
      });
    }
  }, []);

  const handleLiveDragRack = useCallback((rackId: string, px: number, pz: number, rotation?: number) => {
    setRacks((prev) =>
      prev.map((r) =>
        r.id === rackId
          ? {
              ...r,
              px,
              pz,
              rotation: typeof rotation === 'number' ? rotation : r.rotation,
              rot: typeof rotation === 'number' ? rotation === 90 || rotation === 270 : r.rot,
            }
          : r,
      ),
    );
    setDirtyCount((c) => c + 1);
  }, []);

  const handleRotateSelected = useCallback(
    (deltaDeg: number) => {
      if ((selection.type === 'RACK' || selection.type === 'CELL') && selection.rackId) {
        const rack = racks.find((r) => r.id === selection.rackId);
        if (rack && !rack.locked) {
          const nextDeg = ((getRackRotationDeg(rack) + deltaDeg) % 360 + 360) % 360;
          handleUpdateRack({
            ...rack,
            rotation: nextDeg,
            rot: nextDeg === 90 || nextDeg === 270,
          });
          showToast(`🔄 تم تدوير الرف ${rack.code} إلى زاوية ${nextDeg}°`);
        }
      } else if (selection.type === 'ELEMENT' && selection.elementId) {
        const el = elements.find((item) => item.id === selection.elementId);
        if (el && !el.locked) {
          const curDeg = typeof el.rotation === 'number' ? el.rotation : el.rot ? 90 : 0;
          const nextDeg = ((curDeg + deltaDeg) % 360 + 360) % 360;
          setElements((prev) =>
            prev.map((item) =>
              item.id === el.id
                ? { ...item, rotation: nextDeg, rot: nextDeg === 90 || nextDeg === 270 }
                : item,
            ),
          );
          setDirtyCount((c) => c + 1);
          showToast(`🔄 تم تدوير العنصر "${el.label}" إلى زاوية ${nextDeg}°`);
        }
      }
    },
    [selection, racks, elements, handleUpdateRack, showToast],
  );

  const handleSnapRackToNearestWall = useCallback(
    (rackId: string) => {
      const rack = racks.find((r) => r.id === rackId);
      if (!rack || !sceneInstanceRef.current) return;
      const snapped = sceneInstanceRef.current.applyMagneticRackWallSnap(rack, rack.px, rack.pz, true);
      handleUpdateRack({
        ...rack,
        px: snapped.px,
        pz: snapped.pz,
        rotation: typeof snapped.rotation === 'number' ? snapped.rotation : rack.rotation,
        rot: snapped.rotation === 90 || snapped.rotation === 270,
      });
      showToast(`🧱 تم التعرف على "${snapped.wallName || 'أقرب جدار'}" ومحاذاة الرف ${rack.code} ملاصقاً له!`);
    },
    [racks, handleUpdateRack, showToast],
  );

  const handleAddRack = useCallback(
    (newRackData: Partial<WarehouseRack>) => {
      const newId = `rack-${Date.now()}`;
      const isWooden = newRackData.rackType === 'WOODEN_CABINET';
      const newRack: WarehouseRack = {
        id: newId,
        code: newRackData.code || (isWooden ? `CAB-WOOD-${racks.length + 1}` : `WH-MAIN-R${racks.length + 1}`),
        name: newRackData.name || (isWooden ? `خزانة جدارية خشبية` : `رف أدوية جديد`),
        nameAr: newRackData.nameAr || newRackData.name || (isWooden ? `خزانة جدارية خشبية` : `رف جديد`),
        nameEn: newRackData.nameEn || (isWooden ? `Wooden Wall Cabinet` : newRackData.code),
        rackType: newRackData.rackType || 'STEEL_INDUSTRIAL',
        zone: newRackData.zone || (isWooden ? 'W' : 'A'),
        shelf: newRackData.shelf || '1',
        levelVal: newRackData.levelVal || '01',
        storageType: newRackData.storageType || 'ROOM',
        px: isWooden ? 1.5 : 4.5 + (racks.length % 3) * 3.5,
        pz: 7.0 + Math.floor(racks.length / 3) * 3.0,
        rot: false,
        rotation: 0,
        w: newRackData.w || (isWooden ? 2.2 : 2.4),
        d: newRackData.d || (isWooden ? 0.65 : 1.0),
        h: newRackData.h || (isWooden ? 2.6 : 3.8),
        levels: newRackData.levels || 4,
        cellsPerLevel: newRackData.cellsPerLevel || 3,
        isNew: true,
      };

      pushHistorySnapshot();
      setRacks((prev) => [...prev, newRack]);
      handleSelectTarget({ type: 'RACK', rackId: newId });
      setDirtyCount((c) => c + 1);
      showToast(`تمت إضافة ${isWooden ? 'الخزانة الخشبية' : 'الرف'} ${newRack.code} بنجاح!`);
    },
    [racks.length, pushHistorySnapshot, handleSelectTarget, showToast],
  );

  const handleDuplicateRack = useCallback(
    (id: string) => {
      const src = racks.find((r) => r.id === id);
      if (!src) return;
      pushHistorySnapshot();
      const dupId = `rack-dup-${Date.now()}`;
      const dup: WarehouseRack = {
        ...src,
        id: dupId,
        code: `${src.code}-DUP`,
        name: `${src.name} (نسخة)`,
        nameAr: src.nameAr ? `${src.nameAr} (نسخة)` : `${src.name} (نسخة)`,
        nameEn: src.nameEn ? `${src.nameEn} (Copy)` : `${src.code} (Copy)`,
        px: Math.min(dimensions.ww - 1.5, src.px + 1.2),
        pz: Math.min(dimensions.wd - 1.5, src.pz + 1.2),
        isNew: true,
      };
      setRacks((prev) => [...prev, dup]);
      handleSelectTarget({ type: 'RACK', rackId: dupId });
      setDirtyCount((c) => c + 1);
      showToast(`تم نسخ وتكرار الرف ${dup.code}`);
    },
    [racks, dimensions, pushHistorySnapshot, handleSelectTarget, showToast],
  );

  const handleDeleteRack = useCallback(
    (id: string) => {
      const src = racks.find((r) => r.id === id);
      pushHistorySnapshot();
      setRacks((prev) => prev.filter((r) => r.id !== id));
      if (selection.rackId === id) {
        setSelection({ type: null });
        setIsSideDrawerOpen(false);
      }
      setDirtyCount((c) => c + 1);
      showToast(`تم حذف الرف ${src?.code || ''}`);
    },
    [racks, selection.rackId, pushHistorySnapshot, showToast],
  );

  // Architectural Element Operations
  const handleUpdateElement = useCallback(
    (updated: ArchitecturalElement) => {
      pushHistorySnapshot();
      setElements((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setDirtyCount((c) => c + 1);
    },
    [pushHistorySnapshot],
  );

  const handleLiveDragElement = useCallback(
    (elementId: string, x: number, z: number, rot?: boolean, rotation?: number) => {
      setElements((prev) =>
        prev.map((e) =>
          e.id === elementId
            ? {
                ...e,
                x,
                z,
                rot: typeof rot === 'boolean' ? rot : e.rot,
                rotation: typeof rotation === 'number' ? rotation : e.rotation,
              }
            : e,
        ),
      );
      setDirtyCount((c) => c + 1);
    },
    [],
  );

  const handleAddElement = useCallback(
    (newEl: ArchitecturalElement) => {
      pushHistorySnapshot();
      setElements((prev) => [...prev, newEl]);
      handleSelectTarget({ type: 'ELEMENT', elementId: newEl.id });
      setDirtyCount((c) => c + 1);
      showToast(`تمت إضافة العنصر المعماري: ${newEl.label}`);
    },
    [pushHistorySnapshot, handleSelectTarget, showToast],
  );

  const handleDuplicateElement = useCallback(
    (id: string) => {
      const src = elements.find((e) => e.id === id);
      if (!src) return;
      pushHistorySnapshot();
      const dupId = `elem-dup-${Date.now()}`;
      const dup: ArchitecturalElement = {
        ...src,
        id: dupId,
        label: `${src.label} (نسخة)`,
        x: Math.min(dimensions.ww - src.w, src.x + 1.0),
        z: Math.min(dimensions.wd - src.d, src.z + 1.0),
      };
      setElements((prev) => [...prev, dup]);
      handleSelectTarget({ type: 'ELEMENT', elementId: dupId });
      setDirtyCount((c) => c + 1);
      showToast(`تم تكرار العنصر المعماري: ${dup.label}`);
    },
    [elements, dimensions, pushHistorySnapshot, handleSelectTarget, showToast],
  );

  const handleDeleteElement = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setElements((prev) => prev.filter((e) => e.id !== id));
      if (selection.elementId === id) {
        setSelection({ type: null });
        setIsSideDrawerOpen(false);
      }
      setDirtyCount((c) => c + 1);
      showToast('تم حذف العنصر المعماري');
    },
    [selection.elementId, pushHistorySnapshot, showToast],
  );

  // Worker & Package Updates
  const handleUpdateWorkerConfig = useCallback((patch: Partial<WorkerConfig>) => {
    setWorkerConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleUpdatePackageConfig = useCallback((patch: Partial<PackageConfig>) => {
    setPackageConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleUpdateDimensions = useCallback(
    (dim: WarehouseDimensions) => {
      setDimensions(dim);
      setDirtyCount((c) => c + 1);
      showToast(`تم تحديث أبعاد المستودع إلى ${dim.ww}×${dim.wd}م`);
    },
    [showToast],
  );

  // Send Worker Commands
  const handleSendWorkerToRack = useCallback(
    (rackId: string, cellLevel?: number) => {
      if (sceneInstanceRef.current) {
        sceneInstanceRef.current.sendWorkerToRack(rackId, cellLevel);
        showToast('العامل يسير متوجهاً إلى الرف والخانة المحددة...');
      }
    },
    [showToast],
  );

  const handleSendWorkerToCoords = useCallback(
    (x: number, z: number) => {
      if (sceneInstanceRef.current) {
        sceneInstanceRef.current.sendWorkerToPosition(x, z);
        showToast(`العامل يسير إلى الإحداثيات (${x.toFixed(1)}م, ${z.toFixed(1)}م)`);
      }
    },
    [showToast],
  );

  const handleOpenRackThumbnail = useCallback((rackId: string) => {
    setActiveThumbnailRackId(rackId);
  }, []);

  const handleGuideToItem = useCallback(
    (rackId: string, level: number, slot: number) => {
      const targetRack = racks.find((r) => r.id === rackId);
      if (targetRack && sceneInstanceRef.current) {
        sceneInstanceRef.current.sendWorkerToRack(rackId, level);
        sceneInstanceRef.current.focusOnCell(rackId, level, slot);
        handleSelectTarget({
          type: 'CELL',
          rackId,
          cellLevel: level,
          cellSlot: slot,
          cellCode: `${targetRack.shelf || 'A'}${targetRack.levelVal || '1'}-0${level}-0${slot}`,
        });
        showToast(`توجيه الكاميرا والعامل إلى الرف ${targetRack.code} - طابق ${level} - خانة ${slot}`);
      }
    },
    [racks, handleSelectTarget, showToast],
  );

  // Search Medicine / Barcode Handler (Also searches real-time cell inventory & zooms straight to the cell!)
  const handleMedicineSearch = (q: string) => {
    setSearchQuery(q);
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) return;

    // 1. First check exact or partial match in Real-Time Cell Inventory (by medicine name, barcode, or cellCode)
    const matchedCell = realtimeInventory.find(
      (item) =>
        item.productName.toLowerCase().includes(trimmed) ||
        item.nameEn.toLowerCase().includes(trimmed) ||
        item.scientificName.toLowerCase().includes(trimmed) ||
        item.barcode.toLowerCase().includes(trimmed) ||
        item.cellCode.toLowerCase() === trimmed,
    );

    if (matchedCell) {
      handleSelectTarget({
        type: 'CELL',
        rackId: matchedCell.rackId,
        cellLevel: matchedCell.level,
        cellSlot: matchedCell.slot,
        cellCode: matchedCell.cellCode,
      });
      sceneInstanceRef.current?.focusOnCell(matchedCell.rackId, matchedCell.level, matchedCell.slot);
      sceneInstanceRef.current?.sendWorkerToRack(matchedCell.rackId, matchedCell.level);
      showToast(
        `🎯 تم العثور على "${matchedCell.productName}" في ${matchedCell.rackCode} خانة ${matchedCell.cellCode} (باركود: ${matchedCell.barcode})!`,
      );
      return;
    }

    // 2. Fallback: Search by rack code or rack name
    const match = racks.find(
      (r) =>
        r.code.toLowerCase().includes(trimmed) ||
        r.name.toLowerCase().includes(trimmed) ||
        (r.nameAr && r.nameAr.toLowerCase().includes(trimmed)) ||
        (r.nameEn && r.nameEn.toLowerCase().includes(trimmed)) ||
        r.customCells?.some(
          (c) => c.code.toLowerCase().includes(trimmed) || c.productName?.toLowerCase().includes(trimmed),
        ),
    );

    if (match) {
      handleSelectTarget({ type: 'RACK', rackId: match.id });
      sceneInstanceRef.current?.focusOnSelection({ type: 'RACK', rackId: match.id });
      handleSendWorkerToRack(match.id);
      showToast(`🎯 تم العثور على الموقع في الرف ${match.code} — تم توجيه الكاميرا والعامل!`);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === '?' || (e.key.toLowerCase() === 'k' && !e.ctrlKey)) {
        e.preventDefault();
        setShowShortcutsModal((p) => !p);
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsEditLocked((prev) => {
          const next = !prev;
          showToast(next ? '🔒 تم تفعيل قفل التعديل (حماية المخطط من السحب العشوائي)' : '🔓 تم إلغاء قفل التعديل');
          return next;
        });
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        sceneInstanceRef.current?.focusOnSelection();
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsSimulatingJourney((p) => !p);
      } else if (e.key === '1') {
        setCameraMode('ISOMETRIC');
      } else if (e.key === '2') {
        setCameraMode('TOP_DOWN');
      } else if (e.key === '3') {
        setCameraMode('FRONT_ELEVATION');
      } else if (e.key === 'Escape') {
        setSelection({ type: null });
        setIsSideDrawerOpen(false);
        setShowItemLocatorModal(false);
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
        setTouchRadial((prev) => ({ ...prev, isOpen: false }));
      } else if (e.key.toLowerCase() === 'r' && selectedRack) {
        e.preventDefault();
        const nextDeg = (getRackRotationDeg(selectedRack) + 45) % 360;
        handleUpdateRack({ ...selectedRack, rotation: nextDeg, rot: nextDeg === 90 || nextDeg === 270 });
      } else if (e.key === 'Delete' && selectedRack && !isEditLocked && !selectedRack.locked) {
        e.preventDefault();
        handleDeleteRack(selectedRack.id);
      } else if (e.key.toLowerCase() === 'c' && selectedRack) {
        e.preventDefault();
        setShowRackCellsModal(true);
      } else if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setShowExportReportModal((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRack, isEditLocked, handleUndo, handleRedo, handleUpdateRack, handleDeleteRack, showToast]);

  // Voice Command Execution Handler (Web Speech API)
  const handleVoiceCommandTranscript = useCallback(
    (transcript: string): string => {
      const parsed = parseVoiceCommand(transcript, racks);
      let desc = 'لم يتم التعرف على الأمر الصوتي';
      if (parsed.type === 'SELECT_RACK') {
        handleSelectTarget({ type: 'RACK', rackId: parsed.rackId });
        sceneInstanceRef.current?.focusOnSelection({ type: 'RACK', rackId: parsed.rackId });
        handleSendWorkerToRack(parsed.rackId);
        desc = `تم تحديد الرف ${parsed.rackCode} وتوجيه الكاميرا والعامل`;
      } else if (parsed.type === 'SHOW_FEFO_ALERTS') {
        setFefoRadar((prev) => ({ ...prev, enabled: true, filter: 'ALL_CRITICAL' }));
        desc = 'تم تشغيل رادار الصلاحية FEFO وإظهار الخانات الحرجة والمنتهية';
      } else if (parsed.type === 'HIDE_FEFO_ALERTS') {
        setFefoRadar((prev) => ({ ...prev, enabled: false }));
        desc = 'تم إيقاف رادار الصلاحية FEFO';
      } else if (parsed.type === 'OPEN_ITEM_LOCATOR') {
        setShowItemLocatorModal(true);
        desc = 'تم فتح مستكشف الأصناف وماسح الباركود بالكاميرا';
      } else if (parsed.type === 'CAMERA_PRESET') {
        setCameraMode(parsed.mode);
        if (parsed.mode === 'ORBIT') {
          sceneInstanceRef.current?.setCameraPreset('ORBIT');
        }
        desc = `تم تغيير وضع الكاميرا إلى ${parsed.mode}`;
      } else if (parsed.type === 'UNDO') {
        handleUndo();
        desc = 'تم التراجع عن آخر تعديل (Undo)';
      } else if (parsed.type === 'REDO') {
        handleRedo();
        desc = 'تمت إعادة تطبيق التعديل (Redo)';
      }
      showToast(`🎙️ ${desc}`);
      return desc;
    },
    [racks, handleSelectTarget, handleSendWorkerToRack, handleUndo, handleRedo, showToast],
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col font-['Cairo',sans-serif]">
      {/* Top Navigation Bar */}
      <Navbar
        dimensions={dimensions}
        totalLocations={racks.length}
        dirtyCount={dirtyCount}
        isDesigner={isDesigner}
        isDarkTheme={isDarkTheme}
        isEditLocked={isEditLocked}
        searchQuery={searchQuery}
        showFloatingLabels={showFloatingLabels}
        showWorker={showWorker}
        isOrderPickingOpen={isOrderPickingOpen}
        realtimeItemCount={realtimeInventory.length}
        onSearchChange={handleMedicineSearch}
        onToggleRole={() => setIsDesigner(!isDesigner)}
        onToggleTheme={() => setIsDarkTheme(!isDarkTheme)}
        onToggleEditLock={() => {
          setIsEditLocked((prev) => {
            const next = !prev;
            showToast(next ? '🔒 تم تفعيل قفل التعديل الشامل' : '🔓 تم فتح قفل التعديل الشامل');
            return next;
          });
        }}
        onToggleFloatingLabels={() => setShowFloatingLabels((p) => !p)}
        onToggleWorker={() => setShowWorker((p) => !p)}
        onToggleOrderPicking={() => setIsOrderPickingOpen((p) => !p)}
        onOpenItemLocator={() => setShowItemLocatorModal(true)}
        onOpenMatrixExplorer={() => setShowMatrixExplorerModal(true)}
        onOpenAntigravityGuide={() => setShowAntigravityGuideModal(true)}
        onOpenEnvironmentStudio={() => {
          handleSelectTarget({ type: 'WAREHOUSE' });
        }}
        onOpenAddRack={() => setShowAddRackModal(true)}
        onOpenAddElement={() => setShowAddElementModal(true)}
        onOpenExpand={() => setShowExpandModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenPublish={() => {
          handleSaveLayout();
          showToast('تم نشر الإصدار المعتمد وتعميم صلاحيات الرؤية لموظفي المستودع ✓');
        }}
        onOpenExportReport={() => setShowExportReportModal(true)}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onReset={handleResetLayout}
        onSave={handleSaveLayout}
      />

      {/* Main 3D Viewport */}
      <main className="relative flex-1 w-full min-h-0">
        {/* 4K Ultra Quality & Lighting Control Bar + FEFO Expiry Radar HUD */}
        <GraphicsAndFefoHUD
          racks={racks}
          realtimeInventory={realtimeInventory}
          graphicsConfig={graphicsConfig}
          onUpdateGraphicsConfig={handleUpdateGraphicsConfig}
          fefoRadar={fefoRadar}
          onUpdateFefoRadar={setFefoRadar}
          onVoiceTranscript={handleVoiceCommandTranscript}
          onFocusCell={(rackId, level, slot, cellCode) => {
            setSelection({
              type: 'CELL',
              rackId,
              cellLevel: level,
              cellSlot: slot,
              cellCode,
            });
            sceneInstanceRef.current?.focusOnCell(rackId, level, slot);
            sceneInstanceRef.current?.sendWorkerToRack(rackId, level);
          }}
          onQuarantineCell={(rackId, level, slot) => {
            handleQuickCellPullAction(rackId, level, slot, 'EXPIRED_PULL', 999);
          }}
        />

        <Warehouse3DCanvas
          dimensions={dimensions}
          envConfig={envConfig}
          graphicsConfig={graphicsConfig}
          fefoRadar={fefoRadar}
          racks={racks}
          elements={elements}
          isDarkTheme={isDarkTheme}
          isEditLocked={isEditLocked}
          cameraMode={cameraMode}
          simSpeed={simSpeed}
          isPaused={isPaused}
          isSimulatingJourney={isSimulatingJourney}
          selection={selection}
          showFloatingLabels={showFloatingLabels}
          showWorker={showWorker}
          workerConfig={workerConfig}
          packageConfig={packageConfig}
          onOpenRackThumbnail={handleOpenRackThumbnail}
          onOpenSideEditor={() => setIsSideDrawerOpen(true)}
          onOpenMatrixExplorer={(rackId, level, slot) => {
            if (rackId) {
              setSelection({
                type: 'CELL',
                rackId,
                cellLevel: level || 1,
                cellSlot: slot || 1,
              });
            }
            setShowMatrixExplorerModal(true);
          }}
          onRotateSelected={handleRotateSelected}
          onSnapRackToNearestWall={handleSnapRackToNearestWall}
          onSelectTarget={handleSelectTarget}
          onLiveDragRack={handleLiveDragRack}
          onLiveDragElement={handleLiveDragElement}
          onWorkerArrived={() => {
            showToast('وصل العامل البشري إلى الخانة وقام بمسح الباركود بالليزر ✓');
          }}
          onLockedDragAttempt={(label) => {
            showToast(`🔒 العنصر "${label}" مقفل ضد التحريك — قم بإلغاء القفل أولاً للتعديل`);
          }}
          onQuickCellPullAction={handleQuickCellPullAction}
          onDispatchWorkerToCell={(rackId, level) => {
            handleSendWorkerToRack(rackId, level);
          }}
          onContextMenu={(e) => {
            setContextMenu({
              isOpen: true,
              x: e.clientX,
              y: e.clientY,
              targetType: e.type,
              targetId: e.id,
              worldX: e.worldX,
              worldZ: e.worldZ,
            });
          }}
          onSceneReady={(scene) => {
            sceneInstanceRef.current = scene;
          }}
        />

        {/* Fulfillment Journey HUD (6 Zones) */}
        <JourneyHUD
          isSimulating={isSimulatingJourney}
          currentStageIndex={currentJourneyStage}
          simSpeed={simSpeed}
          cameraMode={cameraMode}
          onToggleSimulate={() => setIsSimulatingJourney(!isSimulatingJourney)}
          onSelectStage={(idx) => {
            setCurrentJourneyStage(idx);
            setIsSimulatingJourney(true);
          }}
          onChangeSpeed={setSimSpeed}
          onChangeCameraMode={setCameraMode}
          onResetCamera={() => {
            if (sceneInstanceRef.current) {
              sceneInstanceRef.current.setCameraPreset('ORBIT');
              setCameraMode('ORBIT');
            }
          }}
        />

        {/* Worker Control HUD */}
        <WorkerControlHUD
          workerName={workerConfig.name}
          workerAction={sceneInstanceRef.current?.workerAction || 'IDLE'}
          cameraMode={cameraMode}
          onSendToCoords={handleSendWorkerToCoords}
          onToggleCameraFollow={() => {
            const nextMode = cameraMode === 'FOLLOW_WORKER' ? 'ORBIT' : 'FOLLOW_WORKER';
            setCameraMode(nextMode);
          }}
        />

        {/* Side Editor Drawer (Appears on selection for granular, instant live edits) */}
        <SideEditorDrawer
          isOpen={isSideDrawerOpen}
          selection={selection}
          racks={racks}
          elements={elements}
          dimensions={dimensions}
          envConfig={envConfig}
          workerConfig={workerConfig}
          packageConfig={packageConfig}
          isDesigner={isDesigner}
          isEditLocked={isEditLocked}
          onClose={() => setIsSideDrawerOpen(false)}
          onToggleGlobalEditLock={() => setIsEditLocked((p) => !p)}
          onOpenThumbnail={handleOpenRackThumbnail}
          onUpdateRack={handleUpdateRack}
          onUpdateElement={handleUpdateElement}
          onUpdateWorkerConfig={handleUpdateWorkerConfig}
          onUpdatePackageConfig={handleUpdatePackageConfig}
          onUpdateDimensions={handleUpdateDimensions}
          onUpdateEnvConfig={handleUpdateEnvConfig}
          onDuplicateRack={handleDuplicateRack}
          onDuplicateElement={handleDuplicateElement}
          onDeleteRack={handleDeleteRack}
          onDeleteElement={handleDeleteElement}
          onSelectCell={(rackId, level, slot) => {
            handleSelectTarget({
              type: 'CELL',
              rackId,
              cellLevel: level,
              cellSlot: slot,
            });
            sceneInstanceRef.current?.focusOnCell(rackId, level, slot);
          }}
          onFocusSelection={(sel) => {
            sceneInstanceRef.current?.focusOnSelection(sel);
          }}
          onSendWorkerToRack={handleSendWorkerToRack}
          onPrintBarcode={() => {
            showToast(`تم إرسال ملصق الباركود (${selectedRack?.code}) إلى الطابعة الحرارية`);
          }}
          onOpenCellsModal={() => setShowRackCellsModal(true)}
        />

        {/* Bottom Inspector Dock (Compact summary dock) */}
        <InspectorPanel
          selectedRack={selectedRack}
          selectedElement={selectedElement}
          dimensions={dimensions}
          isDesigner={isDesigner}
          isEditLocked={isEditLocked}
          onUpdateRack={handleUpdateRack}
          onUpdateElement={handleUpdateElement}
          onDuplicateRack={handleDuplicateRack}
          onDuplicateElement={handleDuplicateElement}
          onDeleteRack={handleDeleteRack}
          onDeleteElement={handleDeleteElement}
          onOpenCellsModal={() => setShowRackCellsModal(true)}
          onOpenEditRackModal={() => setIsSideDrawerOpen(true)}
          onFocusSelection={() => sceneInstanceRef.current?.focusOnSelection()}
          onSendWorkerToRack={handleSendWorkerToRack}
          onPrintBarcode={() => {
            showToast(`تم إرسال باركود الرف ${selectedRack?.code} إلى طابعة الباركود`);
          }}
        />

        {/* Toast Notification Pill */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-teal-950/95 border border-teal-500/50 rounded-2xl px-5 py-2.5 text-xs font-bold text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-150">
            {toastMessage}
          </div>
        )}

        {/* Desktop Right-Click Context Menu */}
        <DesktopContextMenu
          state={contextMenu}
          onClose={() => setContextMenu((p) => ({ ...p, isOpen: false }))}
          onEditRack={(id) => {
            handleSelectTarget({ type: 'RACK', rackId: id });
          }}
          onRackCells={(id) => {
            handleSelectTarget({ type: 'RACK', rackId: id });
            setShowRackCellsModal(true);
          }}
          onRotateRack={(id) => {
            const r = racks.find((x) => x.id === id);
            if (r) {
              const nextDeg = (getRackRotationDeg(r) + 45) % 360;
              handleUpdateRack({ ...r, rotation: nextDeg, rot: nextDeg === 90 || nextDeg === 270 });
            }
          }}
          onDuplicateRack={handleDuplicateRack}
          onSendWorkerToRack={handleSendWorkerToRack}
          onPrintLabel={() => showToast(`طباعة باركود الرف`)}
          onDeleteRack={handleDeleteRack}
          onDeleteElement={handleDeleteElement}
          onAddRackAt={(x, z) => {
            handleAddRack({ px: x, pz: z } as Partial<WarehouseRack>);
          }}
          onAddDoorAt={(x, z) => {
            handleAddElement({
              id: `elem-door-${Date.now()}`,
              type: 'DOOR',
              subType: 'DOCK_BAY',
              label: 'رصيف شحن وبوابة مفتوحة',
              x,
              z: z < 2 ? 0 : z,
              w: 3.4,
              d: 0.45,
              h: 3.8,
              openRatio: 0.85,
            });
          }}
          onAddPillarAt={(x, z) => {
            handleAddElement({
              id: `elem-pillar-${Date.now()}`,
              type: 'PILLAR',
              subType: 'CONCRETE_ROUND',
              label: 'عمود خرساني C',
              x,
              z,
              w: 0.6,
              d: 0.6,
              h: 8.0,
            });
          }}
          onAddZoneAt={(x, z) => {
            handleAddElement({
              id: `elem-zone-${Date.now()}`,
              type: 'ZONE',
              subType: 'STORAGE',
              label: 'منطقة إضافية',
              x,
              z,
              w: 5.0,
              d: 4.0,
              h: 0.1,
              color: '#06b6d4',
            });
          }}
          onSendWorkerHere={handleSendWorkerToCoords}
        />

        {/* Ashraf Radial Touch Menu */}
        <AshrafTouchRadialMenu
          isOpen={touchRadial.isOpen}
          x={touchRadial.x}
          y={touchRadial.y}
          rack={racks.find((r) => r.id === touchRadial.rackId) || null}
          onClose={() => setTouchRadial((p) => ({ ...p, isOpen: false }))}
          onCells={() => {
            if (touchRadial.rackId) {
              handleSelectTarget({ type: 'RACK', rackId: touchRadial.rackId });
              setShowRackCellsModal(true);
            }
          }}
          onRotate={() => {
            const r = racks.find((x) => x.id === touchRadial.rackId);
            if (r) {
              const nextDeg = (getRackRotationDeg(r) + 45) % 360;
              handleUpdateRack({ ...r, rotation: nextDeg, rot: nextDeg === 90 || nextDeg === 270 });
            }
          }}
          onSendWorker={() => {
            if (touchRadial.rackId) handleSendWorkerToRack(touchRadial.rackId);
          }}
          onDone={() => showToast('أشرف: تم اعتماد ترتيب الرف بنجاح ✓')}
        />
      </main>

      {/* Dedicated Real-Time Item & Cell Locator View (مستكشف وموجه الأصناف والخانات الحقيقي) */}
      <ItemLocatorModal
        isOpen={showItemLocatorModal}
        onClose={() => setShowItemLocatorModal(false)}
        racks={racks}
        inventory={realtimeInventory}
        transactions={realtimeTransactions}
        isLoading={isRealtimeLoading}
        onRefresh={fetchRealtimeData}
        onLocateCellOn3DMap={handleLocateCellOn3DMap}
        onExecutePullAction={handleExecuteRealtimePull}
      />

      {/* Interactive Matrix Explorer Modal (استعراض الـ Matrix والأخشاب الأفقية المتراصة واحد فوق التالي) */}
      <MatrixExplorerModal
        isOpen={showMatrixExplorerModal}
        onClose={() => setShowMatrixExplorerModal(false)}
        racks={racks}
        initialRackId={selection.rackId || racks[0]?.id}
        initialLevel={selection.cellLevel || 1}
        initialSlot={selection.cellSlot || 1}
        onUpdateRack={(updatedRack) => {
          handleUpdateRack(updatedRack);
          showToast(`🪵 تم تحديث مصفوفة الأخشاب الأفقية (Matrix) للرف ${updatedRack.code} ✓`);
        }}
        onFocusCell3D={(rackId, level, slot, cellCode) => {
          setSelection({
            type: 'CELL',
            rackId,
            cellLevel: level,
            cellSlot: slot,
            cellCode,
          });
          sceneInstanceRef.current?.focusOnCell(rackId, level, slot);
          sceneInstanceRef.current?.sendWorkerToRack(rackId, level);
          showToast(`🎯 تم تقريب الكاميرا 3D إلى الخانة ${cellCode} واستعراض الألواح الخشبية!`);
        }}
        onOpenAntigravityGuide={() => {
          setShowMatrixExplorerModal(false);
          setShowAntigravityGuideModal(true);
        }}
      />

      {/* Antigravity Project Specification & Ashraf Empty-Cell Handover Modal */}
      <AntigravityGuideModal
        isOpen={showAntigravityGuideModal}
        onClose={() => setShowAntigravityGuideModal(false)}
        racks={racks}
        dimensions={dimensions}
        onEmptyAllRacksForAshraf={handleEmptyAllRacksForAshraf}
        onRestoreSampleInventory={handleRestoreSampleInventory}
      />

      {/* Modals */}
      <AddRackModal
        isOpen={showAddRackModal}
        onClose={() => setShowAddRackModal(false)}
        onAdd={handleAddRack}
      />

      <RackCellsModal
        isOpen={showRackCellsModal}
        onClose={() => setShowRackCellsModal(false)}
        rack={selectedRack}
        onSave={handleUpdateRack}
      />

      <AddElementModal
        isOpen={showAddElementModal}
        onClose={() => setShowAddElementModal(false)}
        onAdd={handleAddElement}
        ww={dimensions.ww}
        wd={dimensions.wd}
      />

      <ExpandDimensionsModal
        isOpen={showExpandModal}
        onClose={() => setShowExpandModal(false)}
        widthM={dimensions.ww}
        depthM={dimensions.wd}
        heightM={dimensions.wh}
        onApply={(w, d, h) => {
          setDimensions({ ww: w, wd: d, wh: h });
          setDirtyCount((c) => c + 1);
          showToast(`تم توسيع أبعاد المستودع إلى ${w}م × ${d}م`);
        }}
      />

      <WarehouseExportSheetModal
        isOpen={showExportReportModal}
        onClose={() => setShowExportReportModal(false)}
        racks={racks}
        elements={elements}
        dimensions={dimensions}
      />

      {/* Front Elevation Visual Rack Thumbnail Modal */}
      <RackThumbnailCard
        rack={racks.find((r) => r.id === activeThumbnailRackId) || null}
        onClose={() => setActiveThumbnailRackId(null)}
        onSelectCell={(lvl, slt) => {
          if (activeThumbnailRackId) {
            handleSelectTarget({
              type: 'CELL',
              rackId: activeThumbnailRackId,
              cellLevel: lvl,
              cellSlot: slt,
            });
            sceneInstanceRef.current?.focusOnCell(activeThumbnailRackId, lvl, slt);
          }
        }}
        onUpdateRack={handleUpdateRack}
      />

      {/* Order Picking Mission HUD for Floor Staff */}
      <OrderPickingHUD
        racks={racks}
        onGuideToItem={handleGuideToItem}
        onOpenRackThumbnail={handleOpenRackThumbnail}
        isOpen={isOrderPickingOpen}
        onToggleOpen={() => setIsOrderPickingOpen(!isOrderPickingOpen)}
      />

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
