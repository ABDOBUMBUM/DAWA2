/**
 * DAWA 3D Warehouse Engine — Interactive Matrix Explorer Modal (استعراض الـ Matrix والأخشاب الأفقية)
 * Visualizes and edits how medicines inside any rack and cell are arranged one above the next
 * (واحد فوق التالي) on horizontal stacked wooden shelf boards (بشكل أخشاب فوق بعضها وليست عمودية).
 * Includes automatic Visual Alerts (Red / Yellow / Green / Empty) based on Quantity vs Capacity consumption ratio
 * for instant restock decision-making, plus Ashraf Empty Handover controls.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  Plus,
  Trash2,
  Focus,
  CheckCircle2,
  Sparkles,
  Package,
  Barcode,
  Eye,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  RefreshCw,
  TrendingDown,
  PackagePlus,
  FileCode2,
} from 'lucide-react';
import {
  WarehouseRack,
  RackCell,
  CellMedicineItem,
  CellArrangementMode,
  StockAlertTier,
  resolveRackCell,
  getCellMedicines,
  computeCellMatrixLayout,
  computeCellStockAlert,
  createEmptyRackCellsForAshraf,
} from '../types/warehouse';

interface MatrixExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  racks: WarehouseRack[];
  initialRackId?: string | null;
  initialLevel?: number | null;
  initialSlot?: number | null;
  onUpdateRack: (updated: WarehouseRack) => void;
  onFocusCell3D: (rackId: string, level: number, slot: number, cellCode: string) => void;
  onOpenAntigravityGuide?: () => void;
}

const CARTON_COLORS = [
  '#0284c7',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#e11d48',
  '#0d9488',
  '#2563eb',
  '#ea580c',
];

export const MatrixExplorerModal: React.FC<MatrixExplorerModalProps> = ({
  isOpen,
  onClose,
  racks,
  initialRackId,
  initialLevel,
  initialSlot,
  onUpdateRack,
  onFocusCell3D,
  onOpenAntigravityGuide,
}) => {
  const [selectedRackId, setSelectedRackId] = useState<string>(
    initialRackId || racks[0]?.id || 'rack-a1',
  );
  const [selectedLevel, setSelectedLevel] = useState<number>(initialLevel || 1);
  const [selectedSlot, setSelectedSlot] = useState<number>(initialSlot || 1);
  const [viewScope, setViewScope] = useState<'SINGLE_CELL' | 'FULL_RACK'>('SINGLE_CELL');
  const [editingMedId, setEditingMedId] = useState<string | null>(null);

  // Visual Alert Thresholds (Remaining Stock % below which cell turns Red or Yellow)
  const [criticalRemainingPct, setCriticalRemainingPct] = useState<number>(25); // <= 25% remaining (>= 75% consumed) -> RED
  const [warningRemainingPct, setWarningRemainingPct] = useState<number>(55); // <= 55% remaining (>= 45% consumed) -> YELLOW
  const [alertFilter, setAlertFilter] = useState<'ALL' | StockAlertTier>('ALL');

  // Sync when modal opens with a specific selection
  React.useEffect(() => {
    if (isOpen) {
      if (initialRackId && racks.some((r) => r.id === initialRackId)) {
        setSelectedRackId(initialRackId);
      }
      if (initialLevel && initialLevel >= 1) {
        setSelectedLevel(initialLevel);
      }
      if (initialSlot && initialSlot >= 1) {
        setSelectedSlot(initialSlot);
      }
    }
  }, [isOpen, initialRackId, initialLevel, initialSlot, racks]);

  const activeRack = useMemo(
    () => racks.find((r) => r.id === selectedRackId) || racks[0] || null,
    [racks, selectedRackId],
  );

  const rackLevels: number = activeRack?.levels || 4;
  const rackCellsPerLevel: number = activeRack?.cellsPerLevel || 3;

  const safeLevel = activeRack ? Math.min(rackLevels, Math.max(1, selectedLevel)) : 1;
  const safeSlot = activeRack ? Math.min(rackCellsPerLevel, Math.max(1, selectedSlot)) : 1;

  const activeCell = useMemo(() => {
    if (!activeRack) return null;
    return resolveRackCell(activeRack, safeLevel, safeSlot);
  }, [activeRack, safeLevel, safeSlot]);

  // Evaluate visual alert statistics across all cells of the active rack
  const rackAlertSummary = useMemo(() => {
    if (!activeRack) {
      return { redCount: 0, yellowCount: 0, greenCount: 0, emptyCount: 0, totalShortage: 0 };
    }
    let redCount = 0;
    let yellowCount = 0;
    let greenCount = 0;
    let emptyCount = 0;
    let totalShortage = 0;

    for (let lv = 1; lv <= rackLevels; lv++) {
      for (let sl = 1; sl <= rackCellsPerLevel; sl++) {
        const c = resolveRackCell(activeRack, lv, sl);
        const st = computeCellStockAlert(
          c.quantity,
          c.capacity,
          c.occupied !== false,
          criticalRemainingPct,
          warningRemainingPct,
        );
        if (st.tier === 'CRITICAL_RED') {
          redCount++;
          totalShortage += st.shortageQty;
        } else if (st.tier === 'WARNING_YELLOW') {
          yellowCount++;
          totalShortage += st.shortageQty;
        } else if (st.tier === 'EMPTY') {
          emptyCount++;
          totalShortage += st.shortageQty;
        } else {
          greenCount++;
        }
      }
    }
    return { redCount, yellowCount, greenCount, emptyCount, totalShortage };
  }, [activeRack, rackLevels, rackCellsPerLevel, criticalRemainingPct, warningRemainingPct]);

  if (!isOpen || !activeRack || !activeCell) return null;

  const cellMeds = getCellMedicines(activeCell);
  const arrangementMode: CellArrangementMode = activeCell.arrangementMode || 'MATRIX_2D';
  const matrixLayout = computeCellMatrixLayout(
    Math.max(1, cellMeds.length),
    activeCell.matrixCols,
    activeCell.matrixRows,
    arrangementMode,
    activeCell.matrixLayersY,
  );

  const cols = Math.max(1, matrixLayout.cols);
  const verticalTiers = Math.max(1, Math.max(matrixLayout.rows, matrixLayout.layersY));

  const activeCellAlert = computeCellStockAlert(
    activeCell.quantity,
    activeCell.capacity,
    activeCell.occupied !== false,
    criticalRemainingPct,
    warningRemainingPct,
  );

  const upsertActiveCell = (patch: Partial<RackCell>) => {
    const existing = [...(activeRack.customCells || [])];
    const idx = existing.findIndex((c) => c.level === safeLevel && c.slot === safeSlot);
    const updatedCell: RackCell = {
      ...activeCell,
      ...patch,
      level: safeLevel,
      slot: safeSlot,
    };
    if (idx >= 0) {
      existing[idx] = updatedCell;
    } else {
      existing.push(updatedCell);
    }
    onUpdateRack({
      ...activeRack,
      customCells: existing,
    });
  };

  // Set a specific stock level (e.g. restock to 100%, or simulate Red 15% / Yellow 42% / Empty 0%)
  const handleSetCellStockRatio = (targetFillRatio: number, targetLv = safeLevel, targetSl = safeSlot) => {
    const targetCell = resolveRackCell(activeRack, targetLv, targetSl);
    const cap = Math.max(10, targetCell.capacity || 120);

    if (targetFillRatio <= 0) {
      const existing = [...(activeRack.customCells || [])];
      const idx = existing.findIndex((c) => c.level === targetLv && c.slot === targetSl);
      const emptied: RackCell = {
        ...targetCell,
        level: targetLv,
        slot: targetSl,
        occupied: false,
        quantity: 0,
        medicines: [],
      };
      if (idx >= 0) existing[idx] = emptied;
      else existing.push(emptied);
      onUpdateRack({ ...activeRack, customCells: existing });
      return;
    }

    const newTotalQty = Math.max(4, Math.round(cap * targetFillRatio));
    let currentMeds = getCellMedicines(targetCell);
    if (currentMeds.length === 0) {
      // Populate 4 default medicines on the 2x2 wooden boards if cell was empty
      currentMeds = getCellMedicines({
        ...targetCell,
        occupied: true,
        quantity: newTotalQty,
        medicines: undefined,
      });
    }

    const count = Math.max(1, currentMeds.length);
    const basePerMed = Math.floor(newTotalQty / count);
    const remainder = newTotalQty - basePerMed * count;

    const scaledMeds = currentMeds.map((m, i) => ({
      ...m,
      quantity: basePerMed + (i === 0 ? remainder : 0),
    }));

    const existing = [...(activeRack.customCells || [])];
    const idx = existing.findIndex((c) => c.level === targetLv && c.slot === targetSl);
    const updatedCell: RackCell = {
      ...targetCell,
      level: targetLv,
      slot: targetSl,
      occupied: true,
      capacity: cap,
      quantity: newTotalQty,
      productName: scaledMeds[0]?.productName || targetCell.productName || 'صنف دوائي معتمد',
      medicines: scaledMeds,
    };
    if (idx >= 0) existing[idx] = updatedCell;
    else existing.push(updatedCell);

    onUpdateRack({
      ...activeRack,
      customCells: existing,
    });
  };

  // Restock ALL Red & Yellow cells across the active rack to 100% capacity
  const handleRestockAllLowCellsInRack = () => {
    const nextCells: RackCell[] = [];
    for (let lv = 1; lv <= rackLevels; lv++) {
      for (let sl = 1; sl <= rackCellsPerLevel; sl++) {
        const baseCell = resolveRackCell(activeRack, lv, sl);
        const cap = Math.max(10, baseCell.capacity || 120);
        const st = computeCellStockAlert(
          baseCell.quantity,
          cap,
          baseCell.occupied !== false,
          criticalRemainingPct,
          warningRemainingPct,
        );
        if (st.tier === 'CRITICAL_RED' || st.tier === 'WARNING_YELLOW' || st.tier === 'EMPTY') {
          let meds = getCellMedicines(baseCell);
          if (meds.length === 0) {
            meds = getCellMedicines({
              ...baseCell,
              occupied: true,
              quantity: cap,
              medicines: undefined,
            });
          }
          const perMed = Math.floor(cap / Math.max(1, meds.length));
          const rem = cap - perMed * meds.length;
          nextCells.push({
            ...baseCell,
            occupied: true,
            capacity: cap,
            quantity: cap,
            productName: meds[0]?.productName || baseCell.productName || 'مستحضر دوائي',
            medicines: meds.map((m, i) => ({
              ...m,
              quantity: perMed + (i === 0 ? rem : 0),
            })),
          });
        } else {
          nextCells.push(baseCell);
        }
      }
    }
    onUpdateRack({
      ...activeRack,
      customCells: nextCells,
    });
  };

  // Empty all cells in active rack for Ashraf handover
  const handleEmptyRackForAshraf = () => {
    const emptyCells = createEmptyRackCellsForAshraf(activeRack);
    onUpdateRack({
      ...activeRack,
      customCells: emptyCells,
    });
  };

  const applyMatrixPreset = (
    nextCols: number,
    nextVerticalBoards: number,
    nextMode: CellArrangementMode = 'MATRIX_2D',
  ) => {
    const updatedMeds = cellMeds.map((med, i) => {
      const cIdx = (i % nextCols) + 1;
      const rIdx = (Math.floor(i / nextCols) % nextVerticalBoards) + 1;
      return {
        ...med,
        matrixCol: cIdx,
        matrixRow: rIdx,
        matrixLayerY: rIdx,
        subSlotCode: `${activeCell.code}/R${rIdx}-C${cIdx}`,
      };
    });
    upsertActiveCell({
      arrangementMode: nextMode,
      matrixCols: nextCols,
      matrixRows: nextVerticalBoards,
      matrixLayersY: nextMode === 'VERTICAL_STACK' ? nextVerticalBoards : 1,
      showInternalDividers: true,
      medicines: updatedMeds,
    });
  };

  const applyConfigurationToWholeRack = () => {
    const nextCells: RackCell[] = [];
    for (let lv = 1; lv <= rackLevels; lv++) {
      for (let sl = 1; sl <= rackCellsPerLevel; sl++) {
        const baseCell = resolveRackCell(activeRack, lv, sl);
        const meds = getCellMedicines(baseCell).map((m, idx) => {
          const cIdx = (idx % cols) + 1;
          const rIdx = (Math.floor(idx / cols) % verticalTiers) + 1;
          return {
            ...m,
            matrixCol: cIdx,
            matrixRow: rIdx,
            matrixLayerY: rIdx,
            subSlotCode: `${baseCell.code}/R${rIdx}-C${cIdx}`,
            opacity: activeCell.cellOpacity ?? m.opacity ?? 1.0,
          };
        });
        nextCells.push({
          ...baseCell,
          arrangementMode: activeCell.arrangementMode || 'MATRIX_2D',
          matrixCols: cols,
          matrixRows: verticalTiers,
          matrixLayersY: activeCell.matrixLayersY || 1,
          gapX: activeCell.gapX ?? 0.018,
          gapY: activeCell.gapY ?? 0.01,
          gapZ: activeCell.gapZ ?? 0.02,
          cartonScale: activeCell.cartonScale ?? 1.0,
          cartonRotationDeg: activeCell.cartonRotationDeg ?? 0,
          cellAlignment: activeCell.cellAlignment || 'CENTER',
          fillDirection: activeCell.fillDirection || 'ROW_FIRST',
          showInternalDividers: activeCell.showInternalDividers !== false,
          dividerHeightRatio: activeCell.dividerHeightRatio ?? 0.85,
          cellOpacity: activeCell.cellOpacity ?? 1.0,
          medicines: meds,
        });
      }
    }
    onUpdateRack({
      ...activeRack,
      customCells: nextCells,
    });
  };

  const handleAddMedicineToBoard = (targetBoardRow: number, targetCol: number) => {
    const newIndex = cellMeds.length + 1;
    const newMed: CellMedicineItem = {
      id: `${activeCell.id}-M${Date.now()}`,
      subSlotCode: `${activeCell.code}/R${targetBoardRow}-C${targetCol}`,
      matrixRow: targetBoardRow,
      matrixCol: targetCol,
      matrixLayerY: targetBoardRow,
      productName: `مستحضر دوائي جديد #${newIndex}`,
      nameEn: `Pharmaceutical Item #${newIndex}`,
      scientificName: 'Active Compound',
      barcode: `628100${Math.floor(1000 + Math.random() * 8999)}`,
      batchNumber: `BCH-26-R${targetBoardRow}C${targetCol}`,
      expiryDate: '2028-03-30',
      quantity: 25,
      movementCategory: 'AVAILABLE',
      color: CARTON_COLORS[(newIndex - 1) % CARTON_COLORS.length],
      opacity: activeCell.cellOpacity ?? 1.0,
    };
    const nextMeds = [...cellMeds, newMed];
    const nextTotal = nextMeds.reduce((s, m) => s + (m.quantity || 0), 0);
    upsertActiveCell({
      occupied: true,
      productName: activeCell.productName || newMed.productName,
      medicines: nextMeds,
      quantity: nextTotal,
      matrixRows: Math.max(verticalTiers, targetBoardRow),
      matrixCols: Math.max(cols, targetCol),
    });
    setEditingMedId(newMed.id);
  };

  const handleUpdateMedicine = (medId: string, patch: Partial<CellMedicineItem>) => {
    const nextMeds = cellMeds.map((m) => {
      if (m.id !== medId) return m;
      const updated = { ...m, ...patch };
      const r = updated.matrixRow || 1;
      const c = updated.matrixCol || 1;
      updated.subSlotCode = `${activeCell.code}/R${r}-C${c}`;
      return updated;
    });
    const nextTotal = nextMeds.reduce((s, m) => s + (m.quantity || 0), 0);
    upsertActiveCell({
      occupied: nextTotal > 0,
      medicines: nextMeds,
      quantity: nextTotal,
    });
  };

  const handleDeleteMedicine = (medId: string) => {
    const nextMeds = cellMeds.filter((m) => m.id !== medId);
    const nextTotal = nextMeds.reduce((s, m) => s + (m.quantity || 0), 0);
    upsertActiveCell({
      occupied: nextMeds.length > 0 && nextTotal > 0,
      medicines: nextMeds,
      quantity: nextTotal,
    });
  };

  // Build wooden boards from top board (verticalTiers) down to bottom board (1)
  const woodenBoardsTopToBottom = Array.from(
    { length: verticalTiers },
    (_, idx) => verticalTiers - idx,
  );

  // Dynamic visual styling for the active cell based on Stock Alert Tier (Red / Yellow / Green / Empty)
  const getAlertBannerStyles = (tier: StockAlertTier) => {
    switch (tier) {
      case 'CRITICAL_RED':
        return {
          container:
            'border-2 border-rose-500 bg-gradient-to-l from-rose-950/90 via-rose-900/50 to-slate-900 shadow-lg shadow-rose-500/20',
          cabinetBorder: 'border-rose-500 shadow-rose-500/25',
          badge: 'bg-rose-600 text-white border-rose-400 animate-pulse',
          barColor: 'bg-rose-500',
          textColor: 'text-rose-200',
        };
      case 'WARNING_YELLOW':
        return {
          container:
            'border-2 border-amber-400 bg-gradient-to-l from-amber-950/85 via-amber-900/40 to-slate-900 shadow-lg shadow-amber-500/15',
          cabinetBorder: 'border-amber-400 shadow-amber-500/20',
          badge: 'bg-amber-500 text-slate-950 border-amber-300',
          barColor: 'bg-amber-400',
          textColor: 'text-amber-200',
        };
      case 'EMPTY':
        return {
          container:
            'border-2 border-dashed border-slate-600 bg-slate-900/90',
          cabinetBorder: 'border-slate-700',
          badge: 'bg-slate-700 text-slate-200 border-slate-500',
          barColor: 'bg-slate-600',
          textColor: 'text-slate-300',
        };
      default:
        return {
          container:
            'border border-emerald-500/50 bg-gradient-to-l from-emerald-950/50 via-slate-900 to-slate-900',
          cabinetBorder: 'border-amber-800/80',
          badge: 'bg-emerald-600 text-white border-emerald-400',
          barColor: 'bg-emerald-500',
          textColor: 'text-emerald-200',
        };
    }
  };

  const activeStyles = getAlertBannerStyles(activeCellAlert.tier);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl rounded-3xl border-2 border-amber-500/50 bg-slate-900 text-white shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-gradient-to-l from-amber-950/70 via-slate-900 to-teal-950/50 px-5 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-inner">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white">
                  🪵 استعراض الـ Matrix ونظام التنبيهات المرئية لإعادة التوريد (Quantity vs Capacity)
                </h2>
                <span className="rounded-lg bg-rose-500/20 border border-rose-400/40 px-2 py-0.5 text-[10px] font-extrabold text-rose-300">
                  تنبيهات التوريد الأحمر والأصفر تلقائياً
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                يتغير لون الخانة تلقائياً إلى <strong className="text-rose-400">الأحمر (رصيد حرج)</strong> أو{' '}
                <strong className="text-amber-300">الأصفر (تنبيه استهلاك)</strong> حسب نسبة استهلاك الكمية المخزنة لسهولة اتخاذ قرارات التوريد.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenAntigravityGuide && (
              <button
                type="button"
                onClick={onOpenAntigravityGuide}
                className="h-8 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/50 text-indigo-200 font-extrabold text-xs flex items-center gap-1.5 transition"
                title="فتح ملف تعريف Antigravity الشامل ووضع التسليم للمشرف أشرف بخانات فارغة"
              >
                <FileCode2 className="w-3.5 h-3.5 text-indigo-300" />
                <span>📘 دليل Antigravity وتسليم أشرف</span>
              </button>
            )}

            {/* Scope Switcher: Single Cell Matrix vs Full Rack Matrix */}
            <div className="flex items-center rounded-xl bg-slate-950/90 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setViewScope('SINGLE_CELL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition ${
                  viewScope === 'SINGLE_CELL'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🪵 استعراض الخانة بالتفصيل
              </button>
              <button
                type="button"
                data-testid="matrix-full-rack-tab"
                onClick={() => setViewScope('FULL_RACK')}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition ${
                  viewScope === 'FULL_RACK'
                    ? 'bg-teal-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🏗️ خريطة تنبيهات الرف ({rackLevels * rackCellsPerLevel} خانة)
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onFocusCell3D(activeRack.id, safeLevel, safeSlot, activeCell.code);
                onClose();
              }}
              className="h-8 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md transition"
            >
              <Focus className="w-3.5 h-3.5" />
              <span>تقريب 3D</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-rose-500/30 text-slate-300 hover:text-rose-200 flex items-center justify-center transition"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* VISUAL ALERTS DASHBOARD BAR (شريط تنبيهات الاستهلاك وإعادة التوريد التلقائي) */}
        <div className="border-b border-slate-800 bg-slate-950/90 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Live Alert Counters & Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-black text-slate-300 flex items-center gap-1 ml-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>مؤشر التوريد بالرف ({activeRack.code}):</span>
            </span>

            <button
              type="button"
              onClick={() => {
                setAlertFilter('ALL');
                setViewScope('FULL_RACK');
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border transition ${
                alertFilter === 'ALL'
                  ? 'bg-slate-800 text-white border-slate-600'
                  : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              الكل ({rackLevels * rackCellsPerLevel})
            </button>

            <button
              type="button"
              data-testid="filter-critical-red-btn"
              onClick={() => {
                setAlertFilter('CRITICAL_RED');
                setViewScope('FULL_RACK');
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black border transition flex items-center gap-1 ${
                alertFilter === 'CRITICAL_RED'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/30'
                  : 'bg-rose-950/60 text-rose-300 border-rose-500/50 hover:bg-rose-900/50'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
              <span>🔴 حرج للتوريد الفوري: {rackAlertSummary.redCount}</span>
            </button>

            <button
              type="button"
              data-testid="filter-warning-yellow-btn"
              onClick={() => {
                setAlertFilter('WARNING_YELLOW');
                setViewScope('FULL_RACK');
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black border transition flex items-center gap-1 ${
                alertFilter === 'WARNING_YELLOW'
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/50 hover:bg-amber-900/50'
              }`}
            >
              <span>🟡 تنبيه استهلاك (أصفر): {rackAlertSummary.yellowCount}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAlertFilter('SAFE_GREEN');
                setViewScope('FULL_RACK');
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                alertFilter === 'SAFE_GREEN'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
              }`}
            >
              🟢 آمن: {rackAlertSummary.greenCount}
            </button>

            <button
              type="button"
              onClick={() => {
                setAlertFilter('EMPTY');
                setViewScope('FULL_RACK');
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                alertFilter === 'EMPTY'
                  ? 'bg-slate-600 text-white border-slate-400'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              ⚪ فارغ لأشرف: {rackAlertSummary.emptyCount}
            </button>
          </div>

          {/* Threshold Controls & Bulk Restock / Empty Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-[10px]">
              <span className="text-rose-300 font-bold">حد الأحمر: ≤{criticalRemainingPct}%</span>
              <input
                type="range"
                min={10}
                max={40}
                step={5}
                value={criticalRemainingPct}
                onChange={(e) => setCriticalRemainingPct(Number(e.target.value))}
                className="w-14 accent-rose-500 h-1 bg-slate-800 rounded"
                title="تغيير النسبة المئوية المتبقية التي يتحول عندها لون الخانة إلى الأحمر الحرج"
              />
              <span className="text-amber-300 font-bold mr-1">حد الأصفر: ≤{warningRemainingPct}%</span>
              <input
                type="range"
                min={35}
                max={75}
                step={5}
                value={warningRemainingPct}
                onChange={(e) => setWarningRemainingPct(Number(e.target.value))}
                className="w-14 accent-amber-400 h-1 bg-slate-800 rounded"
                title="تغيير النسبة المئوية المتبقية التي يتحول عندها لون الخانة إلى الأصفر التحذيري"
              />
            </div>

            {rackAlertSummary.totalShortage > 0 && (
              <button
                type="button"
                data-testid="restock-all-rack-btn"
                onClick={handleRestockAllLowCellsInRack}
                className="h-7 px-3 rounded-xl bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-md transition"
                title="إصدار أمر إعادة توريد فوري لجميع الخانات الحمراء والصفراء والفارغة في هذا الرف للوصول إلى 100% من السعة"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>توريد كل النواقص بالرف (+{rackAlertSummary.totalShortage} عبوة)</span>
              </button>
            )}

            <button
              type="button"
              data-testid="empty-rack-ashraf-btn"
              onClick={handleEmptyRackForAshraf}
              className="h-7 px-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 font-bold text-[10px] flex items-center gap-1 transition"
              title="تفريغ خانات هذا الرف بالكامل لتسليمها للمشرف أشرف فارغة وجاهزة للتعبئة"
            >
              <RefreshCw className="w-3 h-3" />
              <span>تفريغ الرف لأشرف (0%)</span>
            </button>
          </div>
        </div>

        {/* Rack, Level & Slot Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/60 px-5 py-2 shrink-0">
          {/* Rack Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-extrabold text-slate-400">اختر الرف:</span>
            {racks.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedRackId(r.id);
                  setSelectedLevel(1);
                  setSelectedSlot(1);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border transition flex items-center gap-1.5 ${
                  r.id === activeRack.id
                    ? 'bg-teal-500/25 border-teal-400 text-teal-200 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="font-mono text-[11px]">{r.code}</span>
                <span className="hidden sm:inline text-[10px] opacity-85">({r.nameAr || r.name})</span>
              </button>
            ))}
          </div>

          {/* Floor (Level) & Cell (Slot) Selector with mini color dots */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400">الطابق:</span>
              {Array.from({ length: rackLevels }, (_, i) => i + 1).map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setSelectedLevel(lv)}
                  className={`w-7 h-7 rounded-lg text-xs font-black transition border ${
                    safeLevel === lv
                      ? 'bg-amber-500 text-slate-950 border-amber-300'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {lv}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400">الخانة:</span>
              {Array.from({ length: rackCellsPerLevel }, (_, i) => i + 1).map((sl) => {
                const slotCell = resolveRackCell(activeRack, safeLevel, sl);
                const slotAlert = computeCellStockAlert(
                  slotCell.quantity,
                  slotCell.capacity,
                  slotCell.occupied !== false,
                  criticalRemainingPct,
                  warningRemainingPct,
                );
                const dotColor =
                  slotAlert.tier === 'CRITICAL_RED'
                    ? 'bg-rose-500'
                    : slotAlert.tier === 'WARNING_YELLOW'
                    ? 'bg-amber-400'
                    : slotAlert.tier === 'EMPTY'
                    ? 'bg-slate-500'
                    : 'bg-emerald-400';

                return (
                  <button
                    key={sl}
                    type="button"
                    onClick={() => setSelectedSlot(sl)}
                    className={`px-2.5 h-7 rounded-lg text-xs font-black transition border flex items-center gap-1.5 ${
                      safeSlot === sl
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span>موقع {sl}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {viewScope === 'SINGLE_CELL' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* RIGHT / MAIN COLUMN (7 cols): Live Stacked Horizontal Wooden Boards Matrix View */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* Active Cell Alert & Consumption Banner (يتغير لونه للأحمر أو الأصفر تلقائياً) */}
                <div
                  data-testid="active-cell-alert-banner"
                  className={`rounded-2xl p-3.5 transition-all ${activeStyles.container}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-lg bg-cyan-500 px-2 py-0.5 font-mono text-xs font-black text-slate-950">
                        {activeCell.code}
                      </span>
                      <h3 className="text-sm font-black text-white">
                        الرف {activeRack.code} · الطابق {safeLevel} · الخانة {safeSlot}
                      </h3>
                      <span
                        data-testid="active-cell-alert-badge"
                        className={`rounded-lg border px-2.5 py-0.5 text-[11px] font-black ${activeStyles.badge}`}
                      >
                        {activeCellAlert.labelAr}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {activeCellAlert.shortageQty > 0 && (
                        <button
                          type="button"
                          data-testid="restock-active-cell-btn"
                          onClick={() => handleSetCellStockRatio(1.0)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow-md transition"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                          <span>إعادة توريد فوراً (+{activeCellAlert.shortageQty})</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddMedicineToBoard(verticalTiers, 1)}
                        className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold flex items-center gap-1 shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة دواء</span>
                      </button>
                    </div>
                  </div>

                  {/* Quantity vs Capacity Consumption Progress Bar */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-extrabold ${activeStyles.textColor}`}>
                        📊 قرار التوريد: {activeCellAlert.actionRecommendationAr}
                      </span>
                      <span className="font-mono font-black text-white">
                        الرصيد: <strong className="text-cyan-300">{activeCellAlert.remainingQty}</strong> /{' '}
                        {activeCellAlert.capacity} عبوة (استهلاك {activeCellAlert.consumptionPercent}%)
                      </span>
                    </div>

                    <div className="h-3 w-full rounded-full bg-slate-950/90 border border-slate-800 overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${activeStyles.barColor}`}
                        style={{ width: `${Math.max(3, activeCellAlert.fillPercent)}%` }}
                      />
                    </div>

                    {/* Quick Consumption Simulator & Capacity Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px]">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-slate-400 font-bold flex items-center gap-1">
                          <TrendingDown className="w-3 h-3 text-amber-400" />
                          <span>محاكاة الاستهلاك والتنبيه اللوني:</span>
                        </span>
                        <button
                          type="button"
                          data-testid="simulate-red-alert-btn"
                          onClick={() => handleSetCellStockRatio(0.15)}
                          className="px-2 py-0.5 rounded-md bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/50 font-extrabold transition"
                        >
                          🔴 استهلاك حرج (15% متبقي)
                        </button>
                        <button
                          type="button"
                          data-testid="simulate-yellow-alert-btn"
                          onClick={() => handleSetCellStockRatio(0.42)}
                          className="px-2 py-0.5 rounded-md bg-amber-500/25 hover:bg-amber-500 text-amber-200 hover:text-slate-950 border border-amber-400/50 font-extrabold transition"
                        >
                          🟡 استهلاك متوسط (42% متبقي)
                        </button>
                        <button
                          type="button"
                          data-testid="simulate-green-safe-btn"
                          onClick={() => handleSetCellStockRatio(0.95)}
                          className="px-2 py-0.5 rounded-md bg-emerald-600/25 hover:bg-emerald-500 text-emerald-200 hover:text-slate-950 border border-emerald-500/50 font-extrabold transition"
                        >
                          🟢 توريد آمن (95%)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetCellStockRatio(0)}
                          className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold transition"
                        >
                          ⚪ تفريغ لأشرف (0%)
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">السعة القصوى (Capacity):</span>
                        <input
                          type="number"
                          min={10}
                          max={1000}
                          step={10}
                          value={activeCell.capacity ?? 120}
                          onChange={(e) =>
                            upsertActiveCell({
                              capacity: Math.max(10, parseInt(e.target.value, 10) || 120),
                            })
                          }
                          className="w-16 h-6 rounded bg-slate-950 border border-slate-700 px-1.5 text-center font-mono text-[11px] font-bold text-amber-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* THE VISUAL WOODEN SHELF MATRIX CABINET (الأخشاب الأفقية فوق بعضها واحد فوق التالي) */}
                <div
                  className={`rounded-3xl border-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 shadow-2xl relative transition-all ${activeStyles.cabinetBorder}`}
                >
                  {/* Top Wooden Crown Header */}
                  <div className="mb-3 rounded-xl bg-gradient-to-r from-amber-900 via-amber-700 to-amber-900 px-4 py-2 border border-amber-500/50 flex items-center justify-between shadow-md">
                    <span className="text-xs font-black text-amber-100 flex items-center gap-1.5">
                      <span>🪵</span>
                      <span>
                        منظور الـ Matrix الأمامي للخانة ({activeCell.code}) — أخشاب أفقية متراصة واحد فوق التالي
                      </span>
                    </span>
                    <span className="font-mono text-[11px] font-black text-amber-200 bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-400/30">
                      {verticalTiers} Boards × {cols} Cols
                    </span>
                  </div>

                  {/* Stacked Horizontal Wooden Tiers (From Top Wooden Board down to Bottom Wooden Board) */}
                  <div className="space-y-4">
                    {woodenBoardsTopToBottom.map((boardRowNum) => {
                      return (
                        <div key={boardRowNum} className="relative">
                          {/* Tier Header Badge */}
                          <div className="flex items-center justify-between mb-1.5 px-1">
                            <span className="text-[11px] font-extrabold text-amber-300 flex items-center gap-1.5">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/20 border border-amber-400/40 font-mono text-[10px] font-black text-amber-200">
                                R{boardRowNum}
                              </span>
                              <span>
                                اللوح الخشبي الأفقي رقم #{boardRowNum}{' '}
                                {boardRowNum === verticalTiers
                                  ? '(اللوح العلوي)'
                                  : boardRowNum === 1
                                  ? '(اللوح السفلي الأساسي)'
                                  : `(اللوح الأوسط ${boardRowNum})`}
                              </span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              مرتب أفقياً فوق اللوح الخشبي #{boardRowNum}
                            </span>
                          </div>

                          {/* Medicines Sitting on This Horizontal Wooden Board */}
                          <div
                            className="grid gap-2.5 px-2 pt-2 pb-1"
                            style={{
                              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                            }}
                          >
                            {Array.from({ length: cols }, (_, cIdx) => {
                              const colNum = cIdx + 1;
                              const matchedMed =
                                cellMeds.find((m, idx) => {
                                  const r =
                                    m.matrixRow ||
                                    Math.min(verticalTiers, Math.floor(idx / cols) + 1);
                                  const c = m.matrixCol || (idx % cols) + 1;
                                  return r === boardRowNum && c === colNum;
                                }) || null;

                              if (!matchedMed) {
                                return (
                                  <div
                                    key={`empty-r${boardRowNum}-c${colNum}`}
                                    className="min-h-[104px] rounded-2xl border-2 border-dashed border-slate-700/80 bg-slate-900/50 hover:border-amber-500/60 hover:bg-slate-900 transition flex flex-col items-center justify-center p-2 text-center group"
                                  >
                                    <span className="font-mono text-[10px] font-bold text-slate-400">
                                      R{boardRowNum}-C{colNum} (موضع فارغ جاهز لتعبئة أشرف)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleAddMedicineToBoard(boardRowNum, colNum)}
                                      className="mt-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[10px] font-extrabold border border-amber-500/40 transition flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>تعبئة دواء هنا</span>
                                    </button>
                                  </div>
                                );
                              }

                              const isEditingThis = editingMedId === matchedMed.id;
                              const medOpacity = matchedMed.opacity ?? activeCell.cellOpacity ?? 1.0;
                              const slotShareCap = Math.max(
                                10,
                                Math.round((activeCell.capacity || 120) / Math.max(1, cols * verticalTiers)),
                              );
                              const medAlert = computeCellStockAlert(
                                matchedMed.quantity,
                                slotShareCap,
                                true,
                                criticalRemainingPct,
                                warningRemainingPct,
                              );

                              const cardAlertClass =
                                medAlert.tier === 'CRITICAL_RED'
                                  ? 'bg-rose-950/60 border-rose-500'
                                  : medAlert.tier === 'WARNING_YELLOW'
                                  ? 'bg-amber-950/50 border-amber-400'
                                  : 'bg-slate-900/95';

                              return (
                                <div
                                  key={matchedMed.id}
                                  onClick={() => setEditingMedId(matchedMed.id)}
                                  style={{
                                    borderColor: isEditingThis
                                      ? '#22d3ee'
                                      : medAlert.tier === 'CRITICAL_RED'
                                      ? '#f43f5e'
                                      : medAlert.tier === 'WARNING_YELLOW'
                                      ? '#fbbf24'
                                      : matchedMed.color || '#0284c7',
                                    opacity: Math.max(0.35, medOpacity),
                                  }}
                                  className={`cursor-pointer rounded-2xl border-2 p-2.5 shadow-lg transition hover:scale-[1.01] ${cardAlertClass} ${
                                    isEditingThis ? 'ring-2 ring-cyan-400/60' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 border-b border-slate-800/80 pb-1.5">
                                    <span
                                      className="px-1.5 py-0.5 rounded-md font-mono text-[10px] font-black text-white shadow-sm"
                                      style={{ backgroundColor: matchedMed.color || '#0284c7' }}
                                    >
                                      R{boardRowNum}-C{colNum}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {boardRowNum < verticalTiers && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUpdateMedicine(matchedMed.id, {
                                              matrixRow: boardRowNum + 1,
                                              matrixLayerY: boardRowNum + 1,
                                            });
                                          }}
                                          className="p-0.5 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300"
                                          title="نقل للوح الخشبي الأعلى"
                                        >
                                          <ArrowUp className="w-3 h-3" />
                                        </button>
                                      )}
                                      {boardRowNum > 1 && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUpdateMedicine(matchedMed.id, {
                                              matrixRow: boardRowNum - 1,
                                              matrixLayerY: boardRowNum - 1,
                                            });
                                          }}
                                          className="p-0.5 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300"
                                          title="نقل للوح الخشبي الأسفل"
                                        >
                                          <ArrowDown className="w-3 h-3" />
                                        </button>
                                      )}
                                      <span
                                        className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded border ${
                                          medAlert.tier === 'CRITICAL_RED'
                                            ? 'bg-rose-600 text-white border-rose-400'
                                            : medAlert.tier === 'WARNING_YELLOW'
                                            ? 'bg-amber-500 text-slate-950 border-amber-300'
                                            : 'text-emerald-300 bg-emerald-950/60 border-emerald-500/30'
                                        }`}
                                      >
                                        {matchedMed.quantity} عبوة
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-1.5">
                                    <div className="text-xs font-extrabold text-white line-clamp-1">
                                      {matchedMed.productName}
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-300">
                                      <span className="flex items-center gap-0.5 text-amber-300">
                                        <Barcode className="w-3 h-3" />
                                        {matchedMed.barcode}
                                      </span>
                                      <span className="text-emerald-400">{matchedMed.expiryDate}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* HORIZONTAL WOODEN SHELF BOARD (اللوح الخشبي الأفقي الحامل للأدوية) */}
                          <div className="h-4 w-full rounded-b-xl rounded-t-sm bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900 border-t-2 border-amber-400/70 border-b-4 border-amber-950 shadow-lg flex items-center justify-between px-3">
                            <span className="text-[9px] font-black text-amber-950 tracking-wider uppercase">
                              ═══ لوح خشبي أفقي حامل #{boardRowNum} (Horizontal Wooden Plank R{boardRowNum}) ═══
                            </span>
                            <span className="text-[9px] font-mono font-bold text-amber-100">
                              OAK / WALNUT 3D
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* LEFT COLUMN (5 cols): Quick Presets + Granular Matrix & Medicine Editor */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* 1. Ready-Made Wooden Board Matrix Presets */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>قوالب ترتيب الأخشاب الأفقية (واحد فوق التالي)</span>
                    </h4>
                    <span className="text-[10px] text-slate-400">تطبيق فوري 3D</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => applyMatrixPreset(1, 4, 'VERTICAL_STACK')}
                      className={`p-2.5 rounded-xl border text-right transition ${
                        cols === 1 && verticalTiers >= 3
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black text-white">🪵 واحد فوق التالي (1×4)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        4 ألواح خشبية أفقية فوق بعضها (دواء فوق دواء)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyMatrixPreset(2, 2, 'MATRIX_2D')}
                      className={`p-2.5 rounded-xl border text-right transition ${
                        cols === 2 && verticalTiers === 2
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black text-white">🪵 مصفوفة أخشاب 2×2</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        لوحين خشبيين فوق بعضهما × عمودين بكل لوح
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyMatrixPreset(2, 3, 'MATRIX_2D')}
                      className={`p-2.5 rounded-xl border text-right transition ${
                        cols === 2 && verticalTiers === 3
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black text-white">🪵 مصفوفة أخشاب 2×3</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        3 ألواح خشبية فوق بعضها × عمودين بكل لوح
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyMatrixPreset(3, 2, 'MATRIX_2D')}
                      className={`p-2.5 rounded-xl border text-right transition ${
                        cols === 3 && verticalTiers === 2
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black text-white">🪵 مصفوفة أخشاب 3×2</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        لوحين خشبيين فوق بعضهما × 3 أدوية أفقية
                      </div>
                    </button>
                  </div>

                  {/* Manual Spinners for Horizontal Wooden Boards & Columns */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                    <div className="rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                      <label className="block text-[10px] font-bold text-amber-300 mb-1">
                        عدد الألواح الخشبية فوق بعضها (Rows Y)
                      </label>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            upsertActiveCell({ matrixRows: Math.max(1, verticalTiers - 1) })
                          }
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 font-black text-sm"
                        >
                          -
                        </button>
                        <span className="font-mono text-sm font-black text-white">
                          {verticalTiers} ألواح
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            upsertActiveCell({ matrixRows: Math.min(6, verticalTiers + 1) })
                          }
                          className="w-7 h-7 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 font-black text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                      <label className="block text-[10px] font-bold text-cyan-300 mb-1">
                        عدد الأدوية بكل لوح خشبي (Cols X)
                      </label>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => upsertActiveCell({ matrixCols: Math.max(1, cols - 1) })}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 font-black text-sm"
                        >
                          -
                        </button>
                        <span className="font-mono text-sm font-black text-white">
                          {cols} أعمدة
                        </span>
                        <button
                          type="button"
                          onClick={() => upsertActiveCell({ matrixCols: Math.min(6, cols + 1) })}
                          className="w-7 h-7 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 font-black text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Fine-tuning Sliders (Scale, Gaps, Opacity, Wooden Plank Toggle) */}
                  <div className="space-y-2 pt-2 border-t border-slate-800 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-bold">إظهار الألواح الخشبية الأفقية 3D:</span>
                      <button
                        type="button"
                        onClick={() =>
                          upsertActiveCell({
                            showInternalDividers: activeCell.showInternalDividers === false,
                          })
                        }
                        className={`px-3 py-1 rounded-lg font-extrabold text-[10px] transition ${
                          activeCell.showInternalDividers !== false
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {activeCell.showInternalDividers !== false ? '🪵 الألواح الخشبية ظاهرة' : 'مخفية'}
                      </button>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>حجم كراتين الأدوية على اللوح الخشبي:</span>
                        <span className="font-mono text-amber-300">
                          {Math.round((activeCell.cartonScale ?? 1.0) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={1.15}
                        step={0.05}
                        value={activeCell.cartonScale ?? 1.0}
                        onChange={(e) =>
                          upsertActiveCell({ cartonScale: parseFloat(e.target.value) })
                        }
                        className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>وضوح وشفافية الأدوية في الخانة:</span>
                        </span>
                        <span className="font-mono text-cyan-300">
                          {Math.round((activeCell.cellOpacity ?? 1.0) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.15}
                        max={1.0}
                        step={0.05}
                        value={activeCell.cellOpacity ?? 1.0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          const updatedMeds = cellMeds.map((m) => ({ ...m, opacity: val }));
                          upsertActiveCell({ cellOpacity: val, medicines: updatedMeds });
                        }}
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Apply to Whole Rack Button */}
                  <button
                    type="button"
                    onClick={applyConfigurationToWholeRack}
                    className="w-full py-2 rounded-xl bg-gradient-to-l from-amber-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تعميم ترتيب الألواح الخشبية ({verticalTiers}×{cols}) على كل خانات الرف</span>
                  </button>
                </div>

                {/* 2. Selected Medicine Inspector on Wooden Board */}
                {(() => {
                  const selectedMed =
                    cellMeds.find((m) => m.id === editingMedId) || cellMeds[0] || null;
                  if (!selectedMed) {
                    return (
                      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-4 text-center space-y-2">
                        <div className="text-xs font-extrabold text-slate-300">
                          ⚪ هذه الخانة فارغة حالياً (وضع تسليم المشرف أشرف)
                        </div>
                        <p className="text-[11px] text-slate-400">
                          انقر على أي موضع فوق الألواح الخشبية لإضافة دواء وتعبئة الخانة، أو اضغط على زر التوريد الفوري.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleAddMedicineToBoard(1, 1)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>تعبئة أول دواء في الخانة (R1-C1)</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="rounded-2xl border border-cyan-500/40 bg-slate-950/90 p-4 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-black text-white">
                            تحرير الصنف المحدد ({selectedMed.subSlotCode})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMedicine(selectedMed.id)}
                          className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>حذف</span>
                        </button>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">
                            اسم الدواء (عربي / إنجليزي):
                          </label>
                          <input
                            type="text"
                            value={selectedMed.productName}
                            onChange={(e) =>
                              handleUpdateMedicine(selectedMed.id, {
                                productName: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded-xl bg-slate-900 border border-slate-700 px-2.5 text-xs text-white"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] text-amber-300 mb-0.5">
                              اللوح الخشبي (Row):
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={verticalTiers}
                              value={selectedMed.matrixRow || 1}
                              onChange={(e) => {
                                const r = Math.max(1, parseInt(e.target.value, 10) || 1);
                                handleUpdateMedicine(selectedMed.id, {
                                  matrixRow: r,
                                  matrixLayerY: r,
                                });
                              }}
                              className="w-full h-8 rounded-xl bg-slate-900 border border-slate-700 px-2 text-xs font-mono text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-cyan-300 mb-0.5">
                              العمود الأفقي (Col):
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={cols}
                              value={selectedMed.matrixCol || 1}
                              onChange={(e) => {
                                const c = Math.max(1, parseInt(e.target.value, 10) || 1);
                                handleUpdateMedicine(selectedMed.id, { matrixCol: c });
                              }}
                              className="w-full h-8 rounded-xl bg-slate-900 border border-slate-700 px-2 text-xs font-mono text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-emerald-300 mb-0.5">
                              الكمية (عبوة):
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={selectedMed.quantity}
                              onChange={(e) =>
                                handleUpdateMedicine(selectedMed.id, {
                                  quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                                })
                              }
                              className="w-full h-8 rounded-xl bg-slate-900 border border-slate-700 px-2 text-xs font-mono text-white"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-400">لون العبوة في الـ 3D:</span>
                          <div className="flex items-center gap-1.5">
                            {CARTON_COLORS.map((hex) => (
                              <button
                                key={hex}
                                type="button"
                                onClick={() =>
                                  handleUpdateMedicine(selectedMed.id, { color: hex })
                                }
                                style={{ backgroundColor: hex }}
                                className={`w-5 h-5 rounded-full border ${
                                  selectedMed.color === hex
                                    ? 'border-white scale-110 ring-2 ring-cyan-400'
                                    : 'border-slate-700 opacity-80'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* FULL RACK MATRIX ELEVATION VIEW WITH AUTOMATIC RED/YELLOW VISUAL ALERTS */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2.5">
                <div className="text-xs font-bold text-slate-300">
                  🏗️ خريطة تنبيهات التوريد والـ Matrix للرف{' '}
                  <strong className="text-teal-300">{activeRack.code}</strong> (
                  {activeRack.nameAr || activeRack.name}) — الخانات الحمراء والصفراء تحتاج لإعادة توريد حسب نسبة الاستهلاك
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span className="px-2 py-0.5 rounded bg-rose-600/30 border border-rose-500 text-rose-200">
                    🔴 أحمر ≤ {criticalRemainingPct}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/30 border border-amber-400 text-amber-200">
                    🟡 أصفر ≤ {warningRemainingPct}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-600/30 border border-emerald-500 text-emerald-200">
                    🟢 أخضر &gt; {warningRemainingPct}%
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {Array.from({ length: rackLevels }, (_, idx) => rackLevels - idx).map(
                  (lv) => (
                    <div
                      key={lv}
                      className="rounded-2xl border-2 border-slate-800 bg-slate-950/90 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-black text-amber-300">
                          الطابق الرئيسي #{lv} (Level 0{lv})
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {rackCellsPerLevel} خانات على هذا الطابق
                        </span>
                      </div>

                      <div
                        className="grid gap-3"
                        style={{
                          gridTemplateColumns: `repeat(${rackCellsPerLevel}, minmax(0, 1fr))`,
                        }}
                      >
                        {Array.from({ length: rackCellsPerLevel }, (_, sIdx) => sIdx + 1).map(
                          (sl) => {
                            const cell = resolveRackCell(activeRack, lv, sl);
                            const meds = getCellMedicines(cell);
                            const cellAlert = computeCellStockAlert(
                              cell.quantity,
                              cell.capacity,
                              cell.occupied !== false,
                              criticalRemainingPct,
                              warningRemainingPct,
                            );

                            if (alertFilter !== 'ALL' && cellAlert.tier !== alertFilter) {
                              return (
                                <div
                                  key={`${lv}-${sl}-dimmed`}
                                  onClick={() => {
                                    setAlertFilter('ALL');
                                    setSelectedLevel(lv);
                                    setSelectedSlot(sl);
                                    setViewScope('SINGLE_CELL');
                                  }}
                                  className="cursor-pointer rounded-2xl border border-slate-800/50 bg-slate-950/40 p-2.5 opacity-35 hover:opacity-75 transition flex items-center justify-between text-[10px] text-slate-500"
                                >
                                  <span>{cell.code}</span>
                                  <span>{cellAlert.fillPercent}%</span>
                                </div>
                              );
                            }

                            const layout = computeCellMatrixLayout(
                              Math.max(1, meds.length),
                              cell.matrixCols,
                              cell.matrixRows,
                              cell.arrangementMode || 'MATRIX_2D',
                              cell.matrixLayersY,
                            );
                            const cCols = Math.max(1, layout.cols);
                            const cBoards = Math.max(1, Math.max(layout.rows, layout.layersY));
                            const boardsDesc = Array.from(
                              { length: cBoards },
                              (_, bIdx) => cBoards - bIdx,
                            );

                            const cardTheme =
                              cellAlert.tier === 'CRITICAL_RED'
                                ? 'border-rose-500 bg-rose-950/60 shadow-lg shadow-rose-600/20 ring-1 ring-rose-500/50'
                                : cellAlert.tier === 'WARNING_YELLOW'
                                ? 'border-amber-400 bg-amber-950/55 shadow-lg shadow-amber-500/15 ring-1 ring-amber-400/40'
                                : cellAlert.tier === 'EMPTY'
                                ? 'border-dashed border-slate-700 bg-slate-900/70'
                                : 'border-emerald-500/50 bg-slate-900 hover:border-cyan-400';

                            const badgeTheme =
                              cellAlert.tier === 'CRITICAL_RED'
                                ? 'bg-rose-600 text-white animate-pulse'
                                : cellAlert.tier === 'WARNING_YELLOW'
                                ? 'bg-amber-400 text-slate-950'
                                : cellAlert.tier === 'EMPTY'
                                ? 'bg-slate-700 text-slate-300'
                                : 'bg-emerald-600 text-white';

                            const barTheme =
                              cellAlert.tier === 'CRITICAL_RED'
                                ? 'bg-rose-500'
                                : cellAlert.tier === 'WARNING_YELLOW'
                                ? 'bg-amber-400'
                                : cellAlert.tier === 'EMPTY'
                                ? 'bg-slate-600'
                                : 'bg-emerald-500';

                            return (
                              <div
                                key={`${lv}-${sl}`}
                                data-testid={`matrix-rack-cell-${lv}-${sl}`}
                                onClick={() => {
                                  setSelectedLevel(lv);
                                  setSelectedSlot(sl);
                                  setViewScope('SINGLE_CELL');
                                }}
                                className={`cursor-pointer rounded-2xl border-2 p-2.5 transition flex flex-col justify-between ${cardTheme}`}
                              >
                                {/* Cell Header with Visual Alert Badge */}
                                <div className="space-y-1.5 mb-2">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="rounded bg-cyan-500/20 border border-cyan-500/40 px-1.5 py-0.5 font-mono text-[10px] font-black text-cyan-300">
                                      {cell.code}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[9px] font-black ${badgeTheme}`}
                                    >
                                      {cellAlert.tier === 'CRITICAL_RED'
                                        ? `🔴 حرج (${cellAlert.fillPercent}%)`
                                        : cellAlert.tier === 'WARNING_YELLOW'
                                        ? `🟡 تحذير (${cellAlert.fillPercent}%)`
                                        : cellAlert.tier === 'EMPTY'
                                        ? '⚪ فارغة (0%)'
                                        : `🟢 آمن (${cellAlert.fillPercent}%)`}
                                    </span>
                                  </div>

                                  {/* Consumption Progress Bar inside Cell Card */}
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-300">
                                      <span>
                                        الرصيد: <strong>{cellAlert.remainingQty}</strong>/{cellAlert.capacity}
                                      </span>
                                      <span>استهلاك: {cellAlert.consumptionPercent}%</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${barTheme}`}
                                        style={{ width: `${Math.max(2, cellAlert.fillPercent)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Mini Stacked Wooden Boards inside each Cell */}
                                <div className="space-y-1.5">
                                  {boardsDesc.map((bNum) => (
                                    <div key={bNum}>
                                      <div
                                        className="grid gap-1 px-1"
                                        style={{
                                          gridTemplateColumns: `repeat(${cCols}, minmax(0, 1fr))`,
                                        }}
                                      >
                                        {Array.from({ length: cCols }, (_, cI) => {
                                          const colN = cI + 1;
                                          const m =
                                            meds.find((item, i) => {
                                              const r =
                                                item.matrixRow ||
                                                Math.min(cBoards, Math.floor(i / cCols) + 1);
                                              const c = item.matrixCol || (i % cCols) + 1;
                                              return r === bNum && c === colN;
                                            }) || null;
                                          return (
                                            <div
                                              key={colN}
                                              style={{
                                                backgroundColor: m
                                                  ? `${m.color || '#0284c7'}33`
                                                  : '#0f172a',
                                                borderColor: m ? m.color || '#0284c7' : '#334155',
                                              }}
                                              className="rounded border px-1.5 py-0.5 text-[9px] truncate font-bold text-white flex items-center justify-between gap-1"
                                            >
                                              <span className="truncate">
                                                {m ? m.productName : 'فارغ'}
                                              </span>
                                              {m && (
                                                <span className="font-mono text-[8px] text-amber-200 shrink-0">
                                                  {m.quantity}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      {/* Mini Horizontal Wooden Plank */}
                                      <div className="h-2 w-full rounded-b bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900 border-t border-amber-400/60 mt-0.5" />
                                    </div>
                                  ))}
                                </div>

                                {/* Quick Restock Action Footer on Red / Yellow / Empty Cards */}
                                {cellAlert.shortageQty > 0 && (
                                  <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1">
                                    <span className="text-[9px] text-slate-300 truncate">
                                      ينقصها {cellAlert.shortageQty} عبوة
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetCellStockRatio(1.0, lv, sl);
                                      }}
                                      className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9px] flex items-center gap-0.5 shrink-0 shadow"
                                    >
                                      <PackagePlus className="w-2.5 h-2.5" />
                                      <span>توريد 100%</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
