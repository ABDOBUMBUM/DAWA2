/**
 * DAWA 3D Warehouse Engine — Three.js WebGL Canvas & Floating 3D Billboard Labels
 * Mounts WebGL in a stable ref outside re-rendering React UI,
 * synchronizing state changes without re-initializing the scene or dropping frames,
 * and rendering crisp Arabic & English 3D floating labels for Racks, Elements, and Individual Cells.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  WarehouseRack,
  ArchitecturalElement,
  WarehouseDimensions,
  WarehouseEnvironmentConfig,
  GraphicsQualityConfig,
  FefoRadarConfig,
  CameraMode,
  SelectionState,
  FloatingLabelData,
  WorkerConfig,
  PackageConfig,
} from '../types/warehouse';
import { WarehouseScene, SceneCallbacks } from '../three/WarehouseScene';
import {
  ZoomIn,
  ZoomOut,
  Focus,
  RotateCcw,
  Lock,
  Barcode,
  PackageCheck,
  AlertTriangle,
  User,
  X,
  Move,
  Edit3,
  RotateCw,
  Magnet,
  MousePointerClick,
  Layers,
} from 'lucide-react';

interface Warehouse3DCanvasProps {
  dimensions: WarehouseDimensions;
  envConfig: WarehouseEnvironmentConfig;
  graphicsConfig?: GraphicsQualityConfig;
  fefoRadar?: FefoRadarConfig;
  racks: WarehouseRack[];
  elements: ArchitecturalElement[];
  isDarkTheme: boolean;
  isEditLocked: boolean;
  cameraMode: CameraMode;
  simSpeed: number;
  isPaused: boolean;
  isSimulatingJourney: boolean;
  selection: SelectionState;
  showFloatingLabels?: boolean;
  showWorker?: boolean;
  workerConfig?: WorkerConfig;
  packageConfig?: PackageConfig;
  onOpenRackThumbnail?: (rackId: string) => void;
  onOpenSideEditor?: () => void;
  onOpenMatrixExplorer?: (rackId?: string, level?: number, slot?: number) => void;
  onRotateSelected?: (deltaDeg: number) => void;
  onSnapRackToNearestWall?: (rackId: string) => void;
  onSelectTarget: (selection: SelectionState) => void;
  onLiveDragRack: (rackId: string, px: number, pz: number, rotation?: number) => void;
  onLiveDragElement: (elementId: string, x: number, z: number, rot?: boolean, rotation?: number) => void;
  onWorkerArrived: (targetRackId?: string) => void;
  onLockedDragAttempt?: (label: string) => void;
  onQuickCellPullAction?: (
    rackId: string,
    level: number,
    slot: number,
    actionType: 'ORDER_PICK' | 'EXPIRED_PULL' | 'RETURN_PROCESS',
    qty: number,
  ) => void;
  onDispatchWorkerToCell?: (rackId: string, level: number) => void;
  onContextMenu: (e: {
    clientX: number;
    clientY: number;
    type: 'RACK' | 'ELEMENT' | 'FLOOR' | 'WORKER';
    id: string | null;
    worldX: number;
    worldZ: number;
  }) => void;
  onSceneReady?: (scene: WarehouseScene) => void;
}

export const Warehouse3DCanvas: React.FC<Warehouse3DCanvasProps> = ({
  dimensions,
  envConfig,
  graphicsConfig,
  fefoRadar,
  racks,
  elements,
  isDarkTheme,
  isEditLocked,
  cameraMode,
  simSpeed,
  isPaused,
  isSimulatingJourney,
  selection,
  showFloatingLabels = true,
  showWorker = true,
  workerConfig,
  packageConfig,
  onOpenRackThumbnail,
  onOpenSideEditor,
  onOpenMatrixExplorer,
  onRotateSelected,
  onSnapRackToNearestWall,
  onSelectTarget,
  onLiveDragRack,
  onLiveDragElement,
  onWorkerArrived,
  onLockedDragAttempt,
  onQuickCellPullAction,
  onDispatchWorkerToCell,
  onContextMenu,
  onSceneReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<WarehouseScene | null>(null);
  const [floatingLabels, setFloatingLabels] = useState<FloatingLabelData[]>([]);
  const [activeMoveTargetId, setActiveMoveTargetId] = useState<string | null>(null);

  const toggleMoveModeForId = (id: string | null) => {
    const next = activeMoveTargetId === id ? null : id;
    setActiveMoveTargetId(next);
    sceneRef.current?.setActiveMoveTarget(next);
  };

  // 1. Initialize Three.js scene once on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const callbacks: SceneCallbacks = {
      onSelectTarget,
      onLiveDragRack,
      onLiveDragElement,
      onWorkerArrived,
      onLockedDragAttempt,
      onActiveMoveTargetChanged: (id) => setActiveMoveTargetId(id),
      onContextMenu,
    };

    const scene = new WarehouseScene(mountRef.current, callbacks, isDarkTheme);
    sceneRef.current = scene;

    scene.isEditLocked = isEditLocked;
    scene.showFloatingLabels = showFloatingLabels;
    scene.onLabelsUpdated = (labels) => {
      setFloatingLabels(labels);
    };

    scene.syncEnvironmentConfig(envConfig);
    if (graphicsConfig) scene.syncGraphicsQuality(graphicsConfig);
    if (fefoRadar) scene.syncFefoRadar(fefoRadar);
    scene.buildEnvironment(dimensions, elements);
    scene.syncRacks(racks);
    scene.syncElements(elements);
    scene.setSelection(selection, racks);

    if (workerConfig) scene.syncWorkerConfig(workerConfig);
    if (packageConfig) scene.syncPackageConfig(packageConfig);

    if (onSceneReady) {
      onSceneReady(scene);
    }

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // 2. Synchronize dimensions and environment config
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.dimensions = dimensions;
      sceneRef.current.syncEnvironmentConfig(envConfig);
      sceneRef.current.syncRacks(racks);
      sceneRef.current.syncElements(elements);
    }
  }, [dimensions.ww, dimensions.wd, dimensions.wh, envConfig]);

  // 2b. Synchronize 4K Ultra graphics quality config
  useEffect(() => {
    if (sceneRef.current && graphicsConfig) {
      sceneRef.current.syncGraphicsQuality(graphicsConfig);
    }
  }, [graphicsConfig]);

  // 2c. Synchronize FEFO Expiry Radar config
  useEffect(() => {
    if (sceneRef.current && fefoRadar) {
      sceneRef.current.syncFefoRadar(fefoRadar);
    }
  }, [fefoRadar]);

  // 3. Synchronize racks
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.syncRacks(racks);
    }
  }, [racks]);

  // 4. Synchronize elements
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.syncElements(elements);
    }
  }, [elements]);

  // 5. Synchronize theme
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setTheme(isDarkTheme);
    }
  }, [isDarkTheme]);

  // 6. Synchronize edit lock
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.isEditLocked = isEditLocked;
      if (isEditLocked && activeMoveTargetId) {
        setActiveMoveTargetId(null);
        sceneRef.current.setActiveMoveTarget(null);
      }
    }
  }, [isEditLocked]);

  // 7. Synchronize camera mode
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setCameraPreset(cameraMode);
    }
  }, [cameraMode]);

  // 8. Synchronize simulation settings
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.simSpeed = simSpeed;
      sceneRef.current.isPaused = isPaused;
      sceneRef.current.isSimulatingJourney = isSimulatingJourney;
    }
  }, [simSpeed, isPaused, isSimulatingJourney]);

  // 9. Synchronize worker and package configs
  useEffect(() => {
    if (sceneRef.current && workerConfig) {
      sceneRef.current.syncWorkerConfig(workerConfig);
    }
  }, [workerConfig]);

  useEffect(() => {
    if (sceneRef.current && packageConfig) {
      sceneRef.current.syncPackageConfig(packageConfig);
    }
  }, [packageConfig]);

  // 10. Synchronize selection highlight
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setSelection(selection, racks);
      const selectedTargetId =
        selection.type === 'RACK' || selection.type === 'CELL'
          ? selection.rackId || null
          : selection.type === 'ELEMENT'
          ? selection.elementId || null
          : null;
      if (activeMoveTargetId && activeMoveTargetId !== selectedTargetId) {
        setActiveMoveTargetId(null);
        sceneRef.current.setActiveMoveTarget(null);
      }
    }
  }, [selection, racks]);

  // 11. Synchronize floating labels toggle
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.showFloatingLabels = showFloatingLabels;
      if (!showFloatingLabels) {
        setFloatingLabels([]);
      }
    }
  }, [showFloatingLabels]);

  // 12. Synchronize worker visibility
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setWorkerVisible(showWorker);
    }
  }, [showWorker]);

  // Resolve currently selected Rack or Architectural Element for the Explicit Edit/Move Floating Action Bar
  const selectedRackObj =
    (selection.type === 'RACK' || selection.type === 'CELL') && selection.rackId
      ? racks.find((r) => r.id === selection.rackId) || null
      : null;
  const selectedElementObj =
    selection.type === 'ELEMENT' && selection.elementId
      ? elements.find((e) => e.id === selection.elementId) || null
      : null;
  const activeSelectionId = selectedRackObj?.id || selectedElementObj?.id || null;
  const isMoveModeActiveForSelection = Boolean(activeSelectionId && activeMoveTargetId === activeSelectionId);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        data-testid="warehouse-3d-webgl-canvas"
        className={`w-full h-full bg-slate-950 ${
          isMoveModeActiveForSelection
            ? 'cursor-move'
            : isEditLocked
            ? 'cursor-default'
            : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Explicit Selection Action Bar ("خيار تعديل العنصر والتحريك الآمن") — Appears whenever a Rack or Element is left-clicked */}
      {(selectedRackObj || selectedElementObj) && (
        <div
          className="fixed top-28 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/95 border-2 border-cyan-400/90 shadow-2xl shadow-cyan-500/25 text-white backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
          dir="rtl"
        >
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <MousePointerClick className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span className="font-mono text-cyan-300">
                  {selectedRackObj ? selectedRackObj.code : selectedElementObj?.subType}
                </span>
                <span>{selectedRackObj ? selectedRackObj.name : selectedElementObj?.label}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {isMoveModeActiveForSelection
                  ? 'وضع التحريك مفعل: اسحب العنصر بالماوس اليسار أو حاذه للجدار'
                  : 'تم تحديد العنصر بأمان (الماوس يدور الكاميرا ولا يحرك العنصر إلا بطلبك)'}
              </div>
            </div>
          </div>

          {/* 1. Edit Item Properties Button */}
          {onOpenSideEditor && (
            <button
              type="button"
              onClick={onOpenSideEditor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black shadow-md transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>تعديل العنصر</span>
            </button>
          )}

          {/* 1b. Open Wooden Matrix Explorer for Selected Rack/Cell */}
          {selectedRackObj && onOpenMatrixExplorer && (
            <button
              type="button"
              onClick={() =>
                onOpenMatrixExplorer(
                  selectedRackObj.id,
                  selection.cellLevel || 1,
                  selection.cellSlot || 1,
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-md transition-all"
              title="استعراض الـ Matrix والألواح الخشبية الأفقية المتراصة فوق بعضها (واحد فوق التالي)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>🪵 استعراض الـ Matrix</span>
            </button>
          )}

          {/* 2. Explicit Enable/Disable Drag & Move Mode */}
          {!isEditLocked && activeSelectionId && (
            <button
              type="button"
              onClick={() => toggleMoveModeForId(activeSelectionId)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                isMoveModeActiveForSelection
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/30 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
              }`}
              title="تفعيل أو إيقاف تحريك العنصر بالماوس لمنع التحريك الخاطئ"
            >
              <Move className="w-3.5 h-3.5" />
              <span>{isMoveModeActiveForSelection ? 'إيقاف التحريك (تثبيت)' : 'تفعيل السحب والتحريك'}</span>
            </button>
          )}

          {/* 3. Quick 45° / 90° Rotation */}
          {!isEditLocked && onRotateSelected && (
            <button
              type="button"
              onClick={() => onRotateSelected(45)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-extrabold transition-all"
              title="تدوير العنصر 45 درجة (أو اضغط Alt + زر الماوس الأوسط للتدوير الحر 360°)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>تدوير +45°</span>
            </button>
          )}

          {/* 4. Snap Rack Flush to Nearest Wall (Perimeter or Custom New Wall) */}
          {!isEditLocked && selectedRackObj && onSnapRackToNearestWall && (
            <button
              type="button"
              onClick={() => onSnapRackToNearestWall(selectedRackObj.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-600 text-cyan-200 hover:text-white border border-cyan-500/40 text-xs font-extrabold transition-all"
              title="التعرف على أقرب جدار ومحاذاة الرف ملاصقاً له تلقائياً"
            >
              <Magnet className="w-3.5 h-3.5" />
              <span>محاذاة لأقرب جدار</span>
            </button>
          )}

          {/* 5. Close Selection */}
          <button
            type="button"
            onClick={() => {
              toggleMoveModeForId(null);
              onSelectTarget({ type: null });
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/30 text-slate-400 hover:text-rose-200 transition-all"
            title="إلغاء التحديد"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Precision Zoom & Focus Controller Pill (Works in ALL camera modes) */}
      <div className="absolute bottom-32 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl">
        <button
          type="button"
          onClick={() => sceneRef.current?.zoomBy(0.72)}
          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-teal-600 text-white flex items-center justify-center transition"
          title="تكبير الرؤية (Zoom In)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => sceneRef.current?.zoomBy(1.35)}
          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-teal-600 text-white flex items-center justify-center transition"
          title="تصغير الرؤية (Zoom Out)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => sceneRef.current?.focusOnSelection()}
          className="w-8 h-8 rounded-xl bg-cyan-600/30 border border-cyan-500/50 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 flex items-center justify-center transition"
          title="تقريب الكاميرا مباشرة إلى الخانة أو الرف المحدد (Focus Selected Cell/Rack)"
        >
          <Focus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => sceneRef.current?.setCameraPreset('ORBIT')}
          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          title="إعادة ضبط الكاميرا للوضع الشامل"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3D Floating Projected Labels (Bilingual Arabic & English Badges for Racks, Elements, and Cells) */}
      {showFloatingLabels && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {floatingLabels.map((lbl) => {
            if (!lbl.visible) return null;

            // Render Individual Cell Floating Label OR Pop-Up Content Card when selected!
            if (lbl.type === 'CELL') {
              const isCellSelected =
                selection.type === 'CELL' &&
                selection.rackId === lbl.rackId &&
                selection.cellLevel === lbl.cellLevel &&
                selection.cellSlot === lbl.cellSlot;

              if (isCellSelected && lbl.rackId && lbl.cellLevel && lbl.cellSlot) {
                const movCat = lbl.movementCategory || 'AVAILABLE';
                return (
                  <div
                    key={`cell-popup-${lbl.id}`}
                    style={{
                      transform: `translate3d(${lbl.screenX}px, ${lbl.screenY}px, 0) translate(-50%, -112%)`,
                    }}
                    className="absolute top-0 left-0 pointer-events-auto z-50"
                    dir="rtl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-80 rounded-2xl border-2 border-cyan-400 bg-slate-950/95 p-3 text-white shadow-2xl shadow-cyan-500/30 backdrop-blur-md">
                      {/* 1. Rack Name & Code */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400">الرف:</span>
                            <span className="rounded bg-teal-500/20 border border-teal-500/40 px-1.5 py-0.5 font-mono text-[10px] font-black text-teal-300">
                              {lbl.rackCode || selectedRackObj?.code || 'RACK'}
                            </span>
                            <span className="text-[11px] font-extrabold text-white truncate max-w-[145px]">
                              {lbl.rackName || selectedRackObj?.nameAr || selectedRackObj?.name}
                            </span>
                          </div>
                          {/* 2. Cell Name & Code */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold text-slate-400">الخانة:</span>
                            <span className="rounded-md bg-cyan-500 px-1.5 py-0.5 font-mono text-[10px] font-black text-slate-950">
                              {lbl.code}
                            </span>
                            <span className="text-[10px] font-extrabold text-cyan-300">
                              {lbl.cellLabel || `خانة ${lbl.code}`} (دور {lbl.cellLevel} · موقع {lbl.cellSlot})
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectTarget({ type: null })}
                          className="h-5 w-5 rounded-md bg-slate-800 hover:bg-rose-500/30 text-slate-300 flex items-center justify-center shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      {/* 3. Subdivided Medicines inside Cell (الأدوية المقسمة داخل الخانة) */}
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-extrabold text-teal-300 flex items-center gap-1">
                            <span>الأدوية في المصفوفة ({lbl.medicines?.length || 1} صنف):</span>
                            <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                              {lbl.matrixRows || 2}×{lbl.matrixCols || 2} Matrix
                            </span>
                          </span>
                          <span
                            className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold text-white"
                            style={{ backgroundColor: lbl.badgeColor }}
                          >
                            {lbl.badgeText}
                          </span>
                        </div>

                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
                          {(lbl.medicines && lbl.medicines.length > 0
                            ? lbl.medicines
                            : [
                                {
                                  id: lbl.code,
                                  subSlotCode: `${lbl.code}/R1-C1`,
                                  matrixRow: 1,
                                  matrixCol: 1,
                                  productName: lbl.nameAr,
                                  barcode: lbl.barcode || '6281000101',
                                  batchNumber: lbl.batchNumber || 'BCH-26',
                                  expiryDate: lbl.expiryDate || '2027-12',
                                  quantity: lbl.quantity ?? 75,
                                  movementCategory: movCat,
                                },
                              ]
                          ).map((med, idx) => {
                            const row = med.matrixRow || Math.floor(idx / (lbl.matrixCols || 2)) + 1;
                            const col = med.matrixCol || (idx % (lbl.matrixCols || 2)) + 1;
                            return (
                              <div
                                key={med.id || idx}
                                className="rounded-xl bg-slate-900/95 border border-slate-800 p-2 space-y-1 text-[10px]"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                                      {med.subSlotCode || `R${row}-C${col}`}
                                    </span>
                                    <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                                      صف {row}·عمود {col}
                                    </span>
                                    <span className="font-extrabold text-white truncate">
                                      {med.productName}
                                    </span>
                                  </div>
                                  <span className="font-mono font-black text-emerald-300 shrink-0">
                                    {med.quantity} عبوة
                                  </span>
                                </div>
                                <div className="flex items-center justify-between font-mono text-[9px] text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Barcode className="h-2.5 w-2.5 text-cyan-400" />
                                    <strong className="text-amber-300">{med.barcode}</strong>
                                  </span>
                                  <span>LOT: {med.batchNumber}</span>
                                  <span
                                    className={
                                      med.movementCategory === 'EXPIRED'
                                        ? 'text-rose-400 font-bold'
                                        : 'text-emerald-400'
                                    }
                                  >
                                    EXP: {med.expiryDate}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Quick Real-Time DB Actions inside 3D Pop-up */}
                      <div className="mt-2.5 grid grid-cols-3 gap-1">
                        {onQuickCellPullAction && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                onQuickCellPullAction(
                                  lbl.rackId!,
                                  lbl.cellLevel!,
                                  lbl.cellSlot!,
                                  'ORDER_PICK',
                                  10,
                                )
                              }
                              className="h-7 rounded-lg bg-sky-500/20 hover:bg-sky-500/40 border border-sky-500/40 text-sky-200 text-[9px] font-bold flex items-center justify-center gap-0.5"
                            >
                              <PackageCheck className="h-2.5 w-2.5" />
                              <span>سحب طلبية</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onQuickCellPullAction(
                                  lbl.rackId!,
                                  lbl.cellLevel!,
                                  lbl.cellSlot!,
                                  'EXPIRED_PULL',
                                  10,
                                )
                              }
                              className="h-7 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 text-rose-200 text-[9px] font-bold flex items-center justify-center gap-0.5"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              <span>سحب منتهي</span>
                            </button>
                          </>
                        )}
                        {onDispatchWorkerToCell && (
                          <button
                            type="button"
                            onClick={() => onDispatchWorkerToCell(lbl.rackId!, lbl.cellLevel!)}
                            className="h-7 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 text-amber-200 text-[9px] font-bold flex items-center justify-center gap-0.5"
                          >
                            <User className="h-2.5 w-2.5" />
                            <span>إرسال العامل</span>
                          </button>
                        )}
                      </div>

                      {onOpenMatrixExplorer && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenMatrixExplorer(lbl.rackId!, lbl.cellLevel!, lbl.cellSlot!)
                          }
                          className="mt-1.5 w-full h-7 rounded-lg bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-[10px] font-black flex items-center justify-center gap-1 shadow"
                        >
                          <Layers className="h-3 w-3" />
                          <span>🪵 استعراض الـ Matrix والأخشاب الأفقية للخانة</span>
                        </button>
                      )}

                      {/* Downward pointer arrow to extruded cell */}
                      <div className="mx-auto mt-1 h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-cyan-400" />
                    </div>
                  </div>
                );
              }

              const cellScale = Math.max(0.75, Math.min(1.12, 6.5 / Math.max(1.8, lbl.distance)));

              return (
                <div
                  key={`cell-${lbl.id}`}
                  style={{
                    transform: `translate3d(${lbl.screenX}px, ${lbl.screenY}px, 0) translate(-50%, -50%) scale(${cellScale})`,
                  }}
                  className="absolute top-0 left-0 pointer-events-auto cursor-pointer transition-transform z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (lbl.rackId && lbl.cellLevel && lbl.cellSlot) {
                      onSelectTarget({
                        type: 'CELL',
                        rackId: lbl.rackId,
                        cellLevel: lbl.cellLevel,
                        cellSlot: lbl.cellSlot,
                        cellCode: lbl.code,
                      });
                      sceneRef.current?.focusOnCell(lbl.rackId, lbl.cellLevel, lbl.cellSlot);
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5 rounded-lg px-2 py-0.5 border shadow-lg text-right bg-slate-950/90 border-teal-500/60 text-slate-100 hover:border-cyan-300">
                    <span className="font-mono font-extrabold text-[10px] text-cyan-300 bg-slate-900 px-1 rounded">
                      {lbl.code}
                    </span>
                    <span className="text-[10px] font-bold truncate max-w-[115px]">{lbl.nameAr}</span>
                    <span
                      className="text-[8px] font-mono font-bold px-1 rounded text-white"
                      style={{ backgroundColor: lbl.badgeColor }}
                    >
                      {lbl.badgeText}
                    </span>
                  </div>
                </div>
              );
            }

            // Standard Rack & Element Floating Label
            const scale = Math.max(0.68, Math.min(1.05, 18 / Math.max(8, lbl.distance)));
            const opacity = Math.max(0.45, Math.min(1.0, 28 / Math.max(10, lbl.distance)));
            const isSelected =
              (lbl.type === 'RACK' && selection.rackId === lbl.id) ||
              (lbl.type === 'ELEMENT' && selection.elementId === lbl.id);

            return (
              <div
                key={`${lbl.type}-${lbl.id}`}
                style={{
                  transform: `translate3d(${lbl.screenX}px, ${lbl.screenY}px, 0) translate(-50%, -100%) scale(${scale})`,
                  opacity,
                }}
                className={`absolute top-0 left-0 transition-opacity duration-75 pointer-events-auto cursor-pointer ${
                  isSelected ? 'z-30' : 'z-10'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (lbl.type === 'RACK') {
                    onSelectTarget({ type: 'RACK', rackId: lbl.id });
                  } else if (lbl.type === 'ELEMENT') {
                    onSelectTarget({ type: 'ELEMENT', elementId: lbl.id });
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (lbl.type === 'RACK') {
                    sceneRef.current?.focusOnSelection({ type: 'RACK', rackId: lbl.id });
                  } else if (lbl.type === 'ELEMENT') {
                    sceneRef.current?.focusOnSelection({ type: 'ELEMENT', elementId: lbl.id });
                  }
                }}
              >
                <div
                  className={`flex flex-col items-center shadow-xl rounded-xl px-2.5 py-1 text-center border transition-all hover:scale-105 ${
                    isSelected
                      ? 'bg-slate-900/95 border-cyan-400 ring-2 ring-cyan-400/50 shadow-cyan-500/20'
                      : lbl.isWooden
                      ? 'bg-amber-950/95 border-amber-600/70 text-amber-100 hover:border-amber-400'
                      : 'bg-slate-900/90 border-slate-700/80 text-white hover:border-teal-400'
                  }`}
                >
                  {/* Top: Code, Lock Icon & Badge */}
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    {lbl.isLocked && <Lock className="w-3 h-3 text-rose-400 shrink-0" />}
                    <span className="font-mono font-extrabold text-[11px] text-teal-300">
                      {lbl.code}
                    </span>
                    <span
                      className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white shadow-xs"
                      style={{ backgroundColor: lbl.badgeColor }}
                    >
                      {lbl.badgeText}
                    </span>
                  </div>

                  {/* Middle: Arabic and English Name */}
                  <div className="text-[11px] font-bold text-slate-100 max-w-[180px] truncate leading-tight mt-0.5">
                    {lbl.nameAr}
                  </div>
                  {lbl.nameEn && lbl.nameEn !== lbl.nameAr && (
                    <div className="text-[9px] font-mono text-slate-400 max-w-[180px] truncate">
                      {lbl.nameEn}
                    </div>
                  )}

                  {/* Bottom: Capacity stats, Edit / Move Mode buttons, Zoom button & Thumbnail Quick Elevation Button */}
                  <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                    {lbl.statsText && (
                      <span className="text-[9px] font-mono font-bold text-cyan-300">
                        {lbl.statsText}
                      </span>
                    )}
                    {isSelected && onOpenSideEditor && (
                      <button
                        type="button"
                        title="فتح لوحة تعديل خصائص العنصر"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSideEditor();
                        }}
                        className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-teal-600 hover:bg-teal-400 hover:text-slate-950 text-white transition-colors"
                      >
                        ✏️ تعديل العنصر
                      </button>
                    )}
                    {isSelected && !isEditLocked && (
                      <button
                        type="button"
                        title="تفعيل أو إيقاف تحريك العنصر بالماوس"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMoveModeForId(lbl.id);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold transition-colors border ${
                          activeMoveTargetId === lbl.id
                            ? 'bg-amber-500 text-slate-950 border-amber-300'
                            : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border-amber-500/50'
                        }`}
                      >
                        {activeMoveTargetId === lbl.id ? '✓ تثبيت الموقع' : '✥ تحريك'}
                      </button>
                    )}
                    {lbl.type === 'RACK' && (
                      <button
                        type="button"
                        title="تقريب الكاميرا مباشرة لهذا الرف"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTarget({ type: 'RACK', rackId: lbl.id });
                          sceneRef.current?.focusOnSelection({ type: 'RACK', rackId: lbl.id });
                        }}
                        className="px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-teal-900/80 hover:bg-teal-500 hover:text-slate-950 text-teal-200 transition-colors border border-teal-700/80"
                      >
                        🔍 تقريب
                      </button>
                    )}
                    {lbl.type === 'RACK' && onOpenRackThumbnail && (
                      <button
                        type="button"
                        title="عرض المسقط الأمامي للرف (Elevation Thumbnail)"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenRackThumbnail(lbl.id);
                        }}
                        className="px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 transition-colors border border-slate-700/80"
                      >
                        🖼️ المسقط
                      </button>
                    )}
                  </div>

                  {/* Downward indicator triangle */}
                  <div
                    className="w-0 h-0 border-x-4 border-x-transparent border-t-4 mt-0.5"
                    style={{
                      borderTopColor: isSelected
                        ? '#22d3ee'
                        : lbl.isWooden
                        ? '#d97706'
                        : '#334155',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
