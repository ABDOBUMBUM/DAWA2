/**
 * DAWA 3D Warehouse Engine — Universal Real-Time Side Editor Drawer
 * Granular, zero-lag editing of all warehouse contents:
 * - Racks (Steel & Wooden Wall Cabinets): Full-wall expansion, 0-360° rotation, material finishes, lock toggle
 * - Individual Medicine Cells: Direct camera zoom-to-cell, live content & barcode editing
 * - Real Openable Doors & Elements: Door open/close ratio (0%-100%), wall portal snapping, 360° rotation
 * - Warehouse Walls, Textures & Backgrounds Studio: 4 walls individual control, HD floor/wall textures, sky presets, open space mode
 */

import React from 'react';
import {
  WarehouseRack,
  RackCell,
  ArchitecturalElement,
  WarehouseDimensions,
  WarehouseEnvironmentConfig,
  WallDisplayMode,
  FloorTexturePreset,
  WallTexturePreset,
  BackgroundPreset,
  RackMaterialFinish,
  SelectionState,
  WorkerConfig,
  PackageConfig,
  StorageCondition,
  CellMedicineItem,
  CellArrangementMode,
  CellAlignmentMode,
  CellFillDirection,
  resolveRackCell,
  getCellMedicines,
  computeCellMatrixLayout,
  getRackRotationDeg,
} from '../types/warehouse';
import {
  generateRackQrDataUrl,
  buildRackSyncUri,
} from '../utils/qrCodeGenerator';
import {
  X,
  Boxes,
  RotateCw,
  Copy,
  Trash2,
  Printer,
  Navigation,
  Sliders,
  Maximize2,
  Layers,
  Package,
  User,
  Building2,
  Check,
  Plus,
  Lock,
  Unlock,
  Focus,
  DoorOpen,
  Palette,
  Sun,
  QrCode,
  Download,
  Grid,
} from 'lucide-react';

interface SideEditorDrawerProps {
  isOpen: boolean;
  selection: SelectionState;
  racks: WarehouseRack[];
  elements: ArchitecturalElement[];
  dimensions: WarehouseDimensions;
  envConfig: WarehouseEnvironmentConfig;
  workerConfig: WorkerConfig;
  packageConfig: PackageConfig;
  isDesigner: boolean;
  isEditLocked: boolean;
  onClose: () => void;
  onToggleGlobalEditLock: () => void;
  onUpdateRack: (updated: WarehouseRack) => void;
  onUpdateElement: (updated: ArchitecturalElement) => void;
  onUpdateWorkerConfig: (updated: Partial<WorkerConfig>) => void;
  onUpdatePackageConfig: (updated: Partial<PackageConfig>) => void;
  onUpdateDimensions: (updated: WarehouseDimensions) => void;
  onUpdateEnvConfig: (patch: Partial<WarehouseEnvironmentConfig>) => void;
  onDuplicateRack: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onDeleteRack: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onSelectCell: (rackId: string, level: number, slot: number) => void;
  onFocusSelection: (sel?: SelectionState) => void;
  onSendWorkerToRack: (rackId: string, cellLevel?: number) => void;
  onPrintBarcode: (rackId: string) => void;
  onOpenCellsModal: () => void;
  onOpenThumbnail?: (rackId: string) => void;
}

export const SideEditorDrawer: React.FC<SideEditorDrawerProps> = ({
  isOpen,
  selection,
  racks,
  elements,
  dimensions,
  envConfig,
  workerConfig,
  packageConfig,
  isDesigner,
  isEditLocked,
  onClose,
  onToggleGlobalEditLock,
  onOpenThumbnail,
  onUpdateRack,
  onUpdateElement,
  onUpdateWorkerConfig,
  onUpdatePackageConfig,
  onUpdateDimensions,
  onUpdateEnvConfig,
  onDuplicateRack,
  onDuplicateElement,
  onDeleteRack,
  onDeleteElement,
  onSelectCell,
  onFocusSelection,
  onSendWorkerToRack,
  onPrintBarcode,
  onOpenCellsModal,
}) => {
  const [showQrPrintModal, setShowQrPrintModal] = React.useState(false);

  if (!isOpen && !selection.type) return null;

  const selectedRack = selection.rackId ? racks.find((r) => r.id === selection.rackId) || null : null;
  const selectedElement = selection.elementId ? elements.find((e) => e.id === selection.elementId) || null : null;

  const selectedCellData: RackCell | null =
    selectedRack && selection.cellLevel && selection.cellSlot
      ? resolveRackCell(selectedRack, selection.cellLevel, selection.cellSlot)
      : null;

  const handleUpdateCurrentCell = (patch: Partial<RackCell>) => {
    if (!selectedRack || !selection.cellLevel || !selection.cellSlot) return;
    const currentCells = selectedRack.customCells ? [...selectedRack.customCells] : [];
    const idx = currentCells.findIndex(
      (c) => Number(c.level) === selection.cellLevel && Number(c.slot) === selection.cellSlot,
    );

    const baseCell = selectedCellData || {
      id: `${selectedRack.id}-L${selection.cellLevel}-S${selection.cellSlot}`,
      code: `${String.fromCharCode(64 + selection.cellLevel)}-${String(selection.cellSlot).padStart(2, '0')}`,
      level: selection.cellLevel,
      slot: selection.cellSlot,
    };

    const updatedCell: RackCell = {
      ...baseCell,
      ...patch,
    };

    if (idx >= 0) {
      currentCells[idx] = updatedCell;
    } else {
      currentCells.push(updatedCell);
    }

    onUpdateRack({
      ...selectedRack,
      customCells: currentCells,
    });
  };

  const currentRackDeg = selectedRack ? getRackRotationDeg(selectedRack) : 0;

  return (
    <aside
      className={`fixed top-14 bottom-0 left-0 z-30 w-full sm:w-[440px] bg-slate-900/98 border-r border-slate-800 shadow-2xl flex flex-col text-slate-100 transition-transform duration-200 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      dir="rtl"
    >
      {/* Drawer Header */}
      <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/80">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            {selection.type === 'CELL' ? (
              <Package className="h-4 w-4" />
            ) : selection.type === 'RACK' ? (
              <Boxes className="h-4 w-4" />
            ) : selection.type === 'WORKER' ? (
              <User className="h-4 w-4" />
            ) : selection.type === 'ELEMENT' ? (
              <DoorOpen className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </span>
          <div>
            <h2 className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <span>
                {selection.type === 'CELL'
                  ? 'تعديل الخانة والتقريب المباشر'
                  : selection.type === 'RACK'
                  ? selectedRack?.rackType === 'WOODEN_CABINET'
                    ? 'خزانة جدارية خشبية (تحكم كامل)'
                    : 'رف أدوية صناعي OSHA (تحكم كامل)'
                  : selection.type === 'WORKER'
                  ? 'المشرف / العامل البشري 3D'
                  : selection.type === 'PACKAGE'
                  ? 'طرد التوزيع الدوائي PKG-572'
                  : selection.type === 'ELEMENT'
                  ? selectedElement?.type === 'DOOR'
                    ? 'تحكم البوابة والمدخل الحقيقي'
                    : 'عنصر إنشائي / معدات المستودع'
                  : 'استوديو الجدران والخامات والخلفيات'}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-teal-500/20 text-teal-300">
                360° LIVE
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              {selection.type === 'CELL'
                ? `الرف: ${selectedRack?.code} · المستوى ${selection.cellLevel} · خانة ${selection.cellSlot}`
                : selectedRack?.code || selectedElement?.label || 'تحكم شامل بالمعمل والمستودع'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Camera Focus Button */}
          <button
            type="button"
            onClick={() => onFocusSelection(selection)}
            className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition"
            title="تقريب الكاميرا مباشرة إلى العنصر المحدد"
          >
            <Focus className="w-3.5 h-3.5" />
            <span>تقريب</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="إغلاق لوحة التعديل"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Global Edit Lock Banner if active */}
      {isEditLocked && (
        <div className="bg-rose-950/90 border-b border-rose-500/40 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-rose-200 font-bold">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>قفل التعديل الشامل مفعل (السحب مغلق)</span>
          </div>
          <button
            type="button"
            onClick={onToggleGlobalEditLock}
            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
          >
            إلغاء القفل 🔓
          </button>
        </div>
      )}

      {/* Drawer Body Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs divide-y divide-slate-800/80">
        {/* ========================================================= */}
        {/* 1. RACK EDITOR (Full-Wall Expansion, 360° Rotation, Lock) */}
        {/* ========================================================= */}
        {selection.type === 'RACK' && selectedRack && (
          <div className="space-y-4 pt-1">
            {/* Per-Rack Lock & Quick Elevation Thumbnail Row */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateRack({ ...selectedRack, locked: !selectedRack.locked })}
                className={`flex-1 h-8.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  selectedRack.locked
                    ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                    : 'bg-slate-950 border-slate-700 text-emerald-300 hover:border-emerald-500/50'
                }`}
              >
                {selectedRack.locked ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>الرف مقفل (إلغاء القفل)</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>الرف مفتوح (قفل الموضع)</span>
                  </>
                )}
              </button>

              {onOpenThumbnail && (
                <button
                  type="button"
                  onClick={() => onOpenThumbnail(selectedRack.id)}
                  className="flex-1 h-8.5 rounded-xl border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <span>🖼️ المسقط الأمامي</span>
                </button>
              )}
            </div>

            {/* Quick Type Switcher & Material Finish */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 space-y-2.5">
              <label className="text-[10px] text-slate-400 font-bold block">نوع الرف والخامة (Texture & Finish):</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateRack({
                      ...selectedRack,
                      rackType: 'STEEL_INDUSTRIAL',
                    })
                  }
                  className={`py-2 px-2.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
                    selectedRack.rackType !== 'WOODEN_CABINET'
                      ? 'bg-blue-600/30 border-blue-500 text-blue-200 shadow-sm'
                      : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5 text-blue-400" />
                  <span>رف معدني صناعي</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateRack({
                      ...selectedRack,
                      rackType: 'WOODEN_CABINET',
                      d: selectedRack.d || 0.65,
                      h: selectedRack.h || 2.6,
                    })
                  }
                  className={`py-2 px-2.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
                    selectedRack.rackType === 'WOODEN_CABINET'
                      ? 'bg-amber-600/30 border-amber-500 text-amber-200 shadow-sm'
                      : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>خزانة خشبية جدارية</span>
                </button>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">خامة وتشطيب السطح (PBR Texture):</label>
                <select
                  value={
                    selectedRack.materialFinish ||
                    (selectedRack.rackType === 'WOODEN_CABINET' ? 'WALNUT_WOOD' : 'POWDER_STEEL')
                  }
                  onChange={(e) =>
                    onUpdateRack({
                      ...selectedRack,
                      materialFinish: e.target.value as RackMaterialFinish,
                    })
                  }
                  className="w-full h-8 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-white font-bold text-xs"
                >
                  <option value="POWDER_STEEL">🔩 فولاذ صناعي مطلي (OSHA Powder Steel)</option>
                  <option value="BRUSHED_STAINLESS">✨ ستانلس ستيل طبي مصقول (Brushed Stainless)</option>
                  <option value="GALVANIZED">🛡️ حديد مجلفن مقاوم للصدأ (Galvanized Metal)</option>
                  <option value="WALNUT_WOOD">🪵 خشب جوز فاخر عالي الدقة (Walnut Wood)</option>
                  <option value="OAK_WOOD">🌳 خشب بلوط طبيعي (Natural Oak Wood)</option>
                  <option value="PHARMA_WHITE">🥼 لامينيت طبي أبيض معقم (Cleanroom White)</option>
                </select>
              </div>
            </div>

            {/* Names & Codes */}
            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">رمز الرف (Code):</label>
                <input
                  type="text"
                  value={selectedRack.code}
                  onChange={(e) => onUpdateRack({ ...selectedRack, code: e.target.value })}
                  className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono font-bold text-teal-300 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">الاسم بالعربية:</label>
                  <input
                    type="text"
                    value={selectedRack.nameAr || selectedRack.name}
                    onChange={(e) =>
                      onUpdateRack({
                        ...selectedRack,
                        name: e.target.value,
                        nameAr: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">الاسم بالإنجليزية:</label>
                  <input
                    type="text"
                    value={selectedRack.nameEn || ''}
                    onChange={(e) => onUpdateRack({ ...selectedRack, nameEn: e.target.value })}
                    className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-slate-200 font-mono text-[11px] focus:border-teal-500 focus:outline-none"
                    placeholder="e.g. Antibiotics Rack"
                  />
                </div>
              </div>
            </div>

            {/* Full-Wall Span & Open Dimensions (Unrestricted Width, Depth, Height) */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" /> الأبعاد المفتوحة وتمديد الجدار الكامل
                </span>
                <span className="text-[10px] font-mono text-cyan-400">مفتوح بلا حدود (m)</span>
              </div>

              {/* One-Click Full Wall Span Buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateRack({
                      ...selectedRack,
                      w: Math.max(2, dimensions.ww - 0.6),
                      px: dimensions.ww / 2,
                      rotation: 0,
                      rot: false,
                      cellsPerLevel: Math.max(selectedRack.cellsPerLevel || 3, Math.round(dimensions.ww / 2.2)),
                    })
                  }
                  className="py-1.5 px-2 rounded-lg bg-teal-600/25 hover:bg-teal-600/40 border border-teal-500/50 text-teal-200 font-bold text-[10px] flex items-center justify-center gap-1 transition"
                  title="توسيع الرف ليغطي كامل عرض جدار المستودع الشمالي/الجنوبي"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>تمديد لجدار كامل X ({dimensions.ww}م)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateRack({
                      ...selectedRack,
                      w: Math.max(2, dimensions.wd - 0.6),
                      pz: dimensions.wd / 2,
                      rotation: 90,
                      rot: true,
                      cellsPerLevel: Math.max(selectedRack.cellsPerLevel || 3, Math.round(dimensions.wd / 2.2)),
                    })
                  }
                  className="py-1.5 px-2 rounded-lg bg-cyan-600/25 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-200 font-bold text-[10px] flex items-center justify-center gap-1 transition"
                  title="توسيع الرف ليغطي كامل عمق جدار المستودع الغربي/الشرقي"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>تمديد لجدار كامل Z ({dimensions.wd}م)</span>
                </button>
              </div>

              {/* Width W (Up to 50m+ or direct input) */}
              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-slate-400">العرض المفتوح (Width - W):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.2"
                      min="0.6"
                      max="100"
                      value={selectedRack.w || 2.4}
                      onChange={(e) =>
                        onUpdateRack({ ...selectedRack, w: Math.max(0.6, parseFloat(e.target.value) || 2.4) })
                      }
                      className="w-16 h-6 rounded border border-slate-700 bg-slate-900 px-1.5 font-mono font-bold text-white text-center text-[11px]"
                    />
                    <span className="font-mono text-slate-400">م</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max={Math.max(36, dimensions.ww * 1.5)}
                  step="0.2"
                  value={selectedRack.w || 2.4}
                  onChange={(e) => onUpdateRack({ ...selectedRack, w: parseFloat(e.target.value) })}
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              {/* Depth D */}
              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-slate-400">العمق (Depth - D):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.3"
                      max="25"
                      value={selectedRack.d || 1.0}
                      onChange={(e) =>
                        onUpdateRack({ ...selectedRack, d: Math.max(0.3, parseFloat(e.target.value) || 1.0) })
                      }
                      className="w-16 h-6 rounded border border-slate-700 bg-slate-900 px-1.5 font-mono font-bold text-white text-center text-[11px]"
                    />
                    <span className="font-mono text-slate-400">م</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="8.0"
                  step="0.05"
                  value={selectedRack.d || 1.0}
                  onChange={(e) => onUpdateRack({ ...selectedRack, d: parseFloat(e.target.value) })}
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              {/* Height H */}
              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-slate-400">الارتفاع (Height - H):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.2"
                      min="1.0"
                      max="25"
                      value={selectedRack.h || 2.2 + (selectedRack.levels || 4) * 0.4}
                      onChange={(e) =>
                        onUpdateRack({ ...selectedRack, h: Math.max(1.0, parseFloat(e.target.value) || 3.8) })
                      }
                      className="w-16 h-6 rounded border border-slate-700 bg-slate-900 px-1.5 font-mono font-bold text-white text-center text-[11px]"
                    />
                    <span className="font-mono text-slate-400">م</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max={Math.max(12, dimensions.wh)}
                  step="0.1"
                  value={selectedRack.h || 2.2 + (selectedRack.levels || 4) * 0.4}
                  onChange={(e) => onUpdateRack({ ...selectedRack, h: parseFloat(e.target.value) })}
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              {/* Levels & Slots count (Expanded range up to 25 tiers and 30 slots per tier!) */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">عدد الطوابق (Tiers):</span>
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRack({ ...selectedRack, levels: Math.max(1, (selectedRack.levels || 4) - 1) })
                      }
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="25"
                      value={selectedRack.levels || 4}
                      onChange={(e) =>
                        onUpdateRack({ ...selectedRack, levels: Math.max(1, parseInt(e.target.value) || 4) })
                      }
                      className="w-10 text-center bg-transparent font-mono font-bold text-cyan-300 text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRack({ ...selectedRack, levels: Math.min(25, (selectedRack.levels || 4) + 1) })
                      }
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">خانات كل طابق (Slots):</span>
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRack({
                          ...selectedRack,
                          cellsPerLevel: Math.max(1, (selectedRack.cellsPerLevel || 3) - 1),
                        })
                      }
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={selectedRack.cellsPerLevel || 3}
                      onChange={(e) =>
                        onUpdateRack({
                          ...selectedRack,
                          cellsPerLevel: Math.max(1, parseInt(e.target.value) || 3),
                        })
                      }
                      className="w-10 text-center bg-transparent font-mono font-bold text-cyan-300 text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateRack({
                          ...selectedRack,
                          cellsPerLevel: Math.min(40, (selectedRack.cellsPerLevel || 3) + 1),
                        })
                      }
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Position X, Z & Full 360-Degree Rotation Control */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-3">
              <span className="text-[11px] font-bold text-white block">
                الموضع والتدوير الحر 360 درجة (360° Continuous Rotation)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">المحور X (عرض):</label>
                  <input
                    type="number"
                    step="0.2"
                    value={selectedRack.px}
                    onChange={(e) => onUpdateRack({ ...selectedRack, px: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 font-mono text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">المحور Z (عمق):</label>
                  <input
                    type="number"
                    step="0.2"
                    value={selectedRack.pz}
                    onChange={(e) => onUpdateRack({ ...selectedRack, pz: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 font-mono text-white text-xs"
                  />
                </div>
              </div>

              {/* 360 Degree Slider + Number Input */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>زاوية دوران الرف (0° - 360°):</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="360"
                      step="1"
                      value={Math.round(currentRackDeg)}
                      onChange={(e) => {
                        const deg = ((parseFloat(e.target.value) || 0) % 360 + 360) % 360;
                        onUpdateRack({
                          ...selectedRack,
                          rotation: deg,
                          rot: deg >= 45 && deg < 135,
                        });
                      }}
                      className="w-16 h-6 rounded border border-amber-500/40 bg-slate-900 px-1.5 font-mono font-bold text-amber-300 text-center text-xs"
                    />
                    <span className="text-[10px] font-mono text-amber-300">°</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={currentRackDeg}
                  onChange={(e) => {
                    const deg = parseFloat(e.target.value);
                    onUpdateRack({
                      ...selectedRack,
                      rotation: deg,
                      rot: deg >= 45 && deg < 135,
                    });
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                {/* Quick Angle Presets (0, 45, 90, 135, 180, 225, 270, 315) */}
                <div className="grid grid-cols-8 gap-1 pt-1">
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
                    <button
                      key={ang}
                      type="button"
                      onClick={() =>
                        onUpdateRack({
                          ...selectedRack,
                          rotation: ang,
                          rot: ang === 90 || ang === 270,
                        })
                      }
                      className={`py-1 rounded font-mono text-[9px] font-bold border transition ${
                        Math.round(currentRackDeg) === ang
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/50'
                      }`}
                    >
                      {ang}°
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Storage Condition & Color */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">شرط الحفظ والتخزين:</label>
                <select
                  value={selectedRack.storageType || 'ROOM'}
                  onChange={(e) =>
                    onUpdateRack({
                      ...selectedRack,
                      storageType: e.target.value as StorageCondition,
                    })
                  }
                  className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-white font-bold text-xs"
                >
                  <option value="ROOM">🌡️ حرارة الغرفة (15-25°C)</option>
                  <option value="COLD">❄️ سلسلة تبريد (2-8°C)</option>
                  <option value="QUARANTINE">⚠️ حجر صحي (Quarantine)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">لون الطلاء / الخشب:</label>
                <div className="flex items-center gap-2 h-8">
                  <input
                    type="color"
                    value={
                      selectedRack.customColor ||
                      (selectedRack.rackType === 'WOODEN_CABINET' ? '#854d0e' : '#1d4ed8')
                    }
                    onChange={(e) => onUpdateRack({ ...selectedRack, customColor: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-400">
                    {selectedRack.customColor || 'افتراضي'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => onSendWorkerToRack(selectedRack.id)}
                className="w-full h-8 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Navigation className="w-3.5 h-3.5" /> توجيه العامل إلى الرف 🚶‍♂️
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowQrPrintModal(true);
                    onPrintBarcode(selectedRack.id);
                  }}
                  className="h-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-400" /> ملصق QR
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicateRack(selectedRack.id)}
                  className="h-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" /> تكرار
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRack(selectedRack.id)}
                  className="h-8 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> حذف
                </button>
              </div>
            </div>

            {/* Printable Rack QR Code Generator Card (متزامن مع المحرك ثلاثي الأبعاد) */}
            {(() => {
              const qrDataUrl = generateRackQrDataUrl(selectedRack, 240);
              const syncUri = buildRackSyncUri(selectedRack);
              return (
                <div
                  data-testid="rack-qr-code-card"
                  className="rounded-xl bg-slate-950/90 border border-cyan-500/40 p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-cyan-300 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-cyan-400" />
                      <span>رمز QR للرف متزامن مع المحرك 3D</span>
                    </span>
                    <span className="text-[9px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      LIVE 3D SYNC
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {qrDataUrl && (
                      <img
                        src={qrDataUrl}
                        alt={`QR ${selectedRack.code}`}
                        className="w-24 h-24 rounded-lg border border-slate-700 bg-white p-1 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="text-xs font-extrabold text-white truncate">
                        {selectedRack.nameAr || selectedRack.name}
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 break-all bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        {syncUri}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <button
                          type="button"
                          data-testid="open-qr-print-preview"
                          onClick={() => setShowQrPrintModal(true)}
                          className="h-7 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] flex items-center justify-center gap-1 transition"
                        >
                          <Printer className="w-3 h-3" />
                          <span>طباعة QR</span>
                        </button>
                        <a
                          href={qrDataUrl}
                          download={`QR-${selectedRack.code}.png`}
                          className="h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-[10px] flex items-center justify-center gap-1 transition"
                        >
                          <Download className="w-3 h-3 text-teal-400" />
                          <span>تحميل PNG</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Printable QR Thermal Label Preview Modal */}
                  {showQrPrintModal && (
                    <div className="rounded-xl bg-white text-slate-950 p-3 border-2 border-cyan-500 shadow-2xl space-y-2 mt-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <div>
                          <div className="text-[10px] font-mono font-bold text-slate-500">
                            DAWA 3D DIGITAL TWIN · ملصق تتبع الرف
                          </div>
                          <div className="text-sm font-black text-slate-900">
                            {selectedRack.code} — {selectedRack.nameAr || selectedRack.name}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowQrPrintModal(false)}
                          className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold"
                        >
                          إغلاق
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <img
                          src={qrDataUrl}
                          alt={`Printable QR ${selectedRack.code}`}
                          className="w-28 h-28 border border-slate-300 rounded p-1"
                        />
                        <div className="space-y-1 text-[10px] font-mono text-slate-700">
                          <div>المنطقة: <strong>{selectedRack.zone}</strong></div>
                          <div>الطوابق: <strong>{selectedRack.levels || 4}</strong> × خانات: <strong>{selectedRack.cellsPerLevel || 3}</strong></div>
                          <div>الإحداثيات 3D: <strong>X={selectedRack.px}m, Z={selectedRack.pz}m</strong></div>
                          <div>شرط التخزين: <strong>{selectedRack.storageType || 'ROOM'}</strong></div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="w-full h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>إرسال للطابعة الحرارية الآن (Print Label)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Slots / Compartment Matrix Inside Rack (Clicking zooms directly to the cell!) */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-amber-400" />
                  <span>خانات الرف (انقر للتقريب المباشر وتعديل الدواء)</span>
                </span>
                <button
                  type="button"
                  onClick={onOpenCellsModal}
                  className="text-[10px] text-teal-400 hover:underline font-bold"
                >
                  جدول شامل
                </button>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {Array.from({ length: selectedRack.levels || 4 }).map((_, lIdx) => {
                  const levelNum = (selectedRack.levels || 4) - lIdx;
                  return (
                    <div key={`lvl-${levelNum}`} className="flex items-center gap-1.5">
                      <span className="w-10 text-[9px] font-mono text-slate-400 shrink-0">
                        طابق {levelNum}
                      </span>
                      <div className="flex-1 grid grid-cols-3 gap-1">
                        {Array.from({ length: selectedRack.cellsPerLevel || 3 }).map((_, sIdx) => {
                          const slotNum = sIdx + 1;
                          const cell = resolveRackCell(selectedRack, levelNum, slotNum);
                          const isOccupied = cell.occupied !== false;
                          const isSel =
                            selection.cellLevel === levelNum && selection.cellSlot === slotNum;

                          return (
                            <button
                              key={`slot-${levelNum}-${slotNum}`}
                              type="button"
                              onClick={() => {
                                onSelectCell(selectedRack.id, levelNum, slotNum);
                                onFocusSelection({
                                  type: 'CELL',
                                  rackId: selectedRack.id,
                                  cellLevel: levelNum,
                                  cellSlot: slotNum,
                                });
                              }}
                              className={`p-1 rounded text-center border transition flex flex-col items-center justify-center ${
                                isSel
                                  ? 'bg-cyan-500/30 border-cyan-400 ring-1 ring-cyan-400 text-white font-bold'
                                  : isOccupied
                                  ? 'bg-slate-800/90 border-slate-700/80 text-slate-200 hover:border-cyan-400'
                                  : 'bg-amber-950/20 border-dashed border-amber-600/40 text-amber-400/80 hover:bg-amber-950/40'
                              }`}
                            >
                              <span className="font-mono text-[9px] font-bold text-cyan-300 block">
                                🔍 {cell.code}
                              </span>
                              <span className="text-[8px] truncate max-w-[80px] block">
                                {isOccupied ? cell.productName || 'دواء' : '+ إضافة دواء'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. CELL / MEDICINE SLOT EDITOR (With Direct Zoom to Slot) */}
        {/* ========================================================= */}
        {selection.type === 'CELL' && selectedRack && selectedCellData && (
          <div className="space-y-3.5 pt-1">
            {/* Direct Zoom to Cell & Return to Rack */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onFocusSelection(selection)}
                className="flex-1 h-8.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <Focus className="w-4 h-4" />
                <span>🔍 تقريب الكاميرا لاسم وموقع الخانة</span>
              </button>
            </div>

            {/* Structured 3-Tier Hierarchy Banner: 1. Rack Name -> 2. Cell Name & Code */}
            <div className="rounded-xl bg-slate-950/90 border border-teal-500/40 p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400">1. اسم الرف:</span>
                  <span className="px-1.5 py-0.5 rounded bg-teal-500/20 border border-teal-500/40 font-mono text-[10px] font-black text-teal-300">
                    {selectedRack.code}
                  </span>
                  <span className="text-xs font-extrabold text-white">
                    {selectedRack.nameAr || selectedRack.name}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div>
                  <span className="text-[10px] text-cyan-300 font-bold block">2. كود الخانة:</span>
                  <input
                    type="text"
                    value={selectedCellData.code}
                    onChange={(e) => handleUpdateCurrentCell({ code: e.target.value })}
                    className="mt-0.5 w-full h-7 rounded border border-slate-700 bg-slate-900 px-2 text-xs font-mono font-extrabold text-cyan-300"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-cyan-300 font-bold block">اسم الخانة التنظيمي:</span>
                  <input
                    type="text"
                    value={selectedCellData.cellLabel || `خانة ${selectedCellData.code}`}
                    onChange={(e) => handleUpdateCurrentCell({ cellLabel: e.target.value })}
                    className="mt-0.5 w-full h-7 rounded border border-slate-700 bg-slate-900 px-2 text-xs font-bold text-white"
                    placeholder="مثال: خانة المسكنات أ-01"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400">حالة إشغال الخانة:</span>
                <button
                  type="button"
                  onClick={() => handleUpdateCurrentCell({ occupied: !selectedCellData.occupied })}
                  className={`px-3 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1 ${
                    selectedCellData.occupied !== false
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                      : 'bg-amber-600/20 border-amber-500 text-amber-300'
                  }`}
                >
                  {selectedCellData.occupied !== false ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> ممتلئة بالدواء
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" /> خانة فارغة
                    </>
                  )}
                </button>
              </div>
            </div>

            {selectedCellData.occupied !== false ? (
              <div className="space-y-3">
                {/* 3. Multi-Medicine Full Arrangement & 2D/3D Matrix Manager inside this Cell (تنظيم وترتيب الأدوية بالتفصيل الكامل) */}
                {(() => {
                  const cellMeds = getCellMedicines(selectedCellData);
                  const activeMode: CellArrangementMode =
                    selectedCellData.arrangementMode || 'MATRIX_2D';
                  const matrixLayout = computeCellMatrixLayout(
                    cellMeds.length,
                    selectedCellData.matrixCols,
                    selectedCellData.matrixRows,
                    activeMode,
                    selectedCellData.matrixLayersY,
                  );
                  const activeCols = matrixLayout.cols;
                  const activeRows = matrixLayout.rows;
                  const activeLayersY = matrixLayout.layersY;

                  const syncMedicinesList = (
                    nextMeds: CellMedicineItem[],
                    newCols?: number,
                    newRows?: number,
                    newMode?: CellArrangementMode,
                    newLayersY?: number,
                    extraCellProps?: Partial<RackCell>,
                  ) => {
                    const effMode = newMode ?? activeMode;
                    const computed = computeCellMatrixLayout(
                      nextMeds.length,
                      newCols ?? selectedCellData.matrixCols,
                      newRows ?? selectedCellData.matrixRows,
                      effMode,
                      newLayersY ?? selectedCellData.matrixLayersY,
                    );
                    const effCols = newCols ?? computed.cols;
                    const effRows = newRows ?? computed.rows;
                    const effLayersY = newLayersY ?? computed.layersY;

                    const safeMeds = nextMeds.map((m, idx) => {
                      let row =
                        m.matrixRow && m.matrixRow >= 1 && m.matrixRow <= effRows
                          ? m.matrixRow
                          : Math.min(effRows, Math.floor(idx / effCols) + 1);
                      let col =
                        m.matrixCol && m.matrixCol >= 1 && m.matrixCol <= effCols
                          ? m.matrixCol
                          : Math.min(effCols, (idx % effCols) + 1);
                      let layerY =
                        m.matrixLayerY && m.matrixLayerY >= 1 && m.matrixLayerY <= effLayersY
                          ? m.matrixLayerY
                          : 1;

                      if (effMode === 'HORIZONTAL_ROW') {
                        row = 1;
                        col = Math.min(effCols, idx + 1);
                        layerY = 1;
                      } else if (effMode === 'DEPTH_FILE') {
                        col = 1;
                        row = Math.min(effRows, idx + 1);
                        layerY = 1;
                      } else if (effMode === 'VERTICAL_STACK') {
                        row = 1;
                        col = 1;
                        layerY = Math.min(effLayersY, idx + 1);
                      } else if (newCols !== undefined || newRows !== undefined) {
                        row = Math.min(effRows, Math.floor(idx / effCols) + 1);
                        col = Math.min(effCols, (idx % effCols) + 1);
                      }

                      return {
                        ...m,
                        matrixRow: row,
                        matrixCol: col,
                        matrixLayerY: layerY,
                        subSlotCode: `${selectedCellData.code}/R${row}-C${col}`,
                      };
                    });

                    const totalQty = safeMeds.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
                    const primary = safeMeds[0];
                    handleUpdateCurrentCell({
                      ...extraCellProps,
                      arrangementMode: effMode,
                      medicines: safeMeds,
                      matrixCols: effCols,
                      matrixRows: effRows,
                      matrixLayersY: effLayersY,
                      productName: primary ? primary.productName : selectedCellData.productName,
                      barcode: primary ? primary.barcode : selectedCellData.barcode,
                      batchNumber: primary ? primary.batchNumber : selectedCellData.batchNumber,
                      expiryDate: primary ? primary.expiryDate : selectedCellData.expiryDate,
                      quantity: totalQty,
                    });
                  };

                  // Apply current cell's arrangement settings to all cells in this rack
                  const handleApplyArrangementToEntireRack = () => {
                    const levelsCount = selectedRack.levels || 4;
                    const slotsCount = selectedRack.cellsPerLevel || 3;
                    const updatedCells: RackCell[] = [];
                    for (let l = 1; l <= levelsCount; l++) {
                      for (let s = 1; s <= slotsCount; s++) {
                        const existingCell = resolveRackCell(selectedRack, l, s);
                        const meds = getCellMedicines(existingCell).map((m, idx) => {
                          const r =
                            activeMode === 'HORIZONTAL_ROW'
                              ? 1
                              : Math.min(activeRows, Math.floor(idx / activeCols) + 1);
                          const c =
                            activeMode === 'HORIZONTAL_ROW'
                              ? Math.min(activeCols, idx + 1)
                              : Math.min(activeCols, (idx % activeCols) + 1);
                          return {
                            ...m,
                            matrixRow: r,
                            matrixCol: c,
                            subSlotCode: `${existingCell.code}/R${r}-C${c}`,
                          };
                        });
                        updatedCells.push({
                          ...existingCell,
                          arrangementMode: activeMode,
                          matrixCols: activeCols,
                          matrixRows: activeRows,
                          matrixLayersY: activeLayersY,
                          gapX: selectedCellData.gapX,
                          gapZ: selectedCellData.gapZ,
                          gapY: selectedCellData.gapY,
                          cartonScale: selectedCellData.cartonScale,
                          cartonRotationDeg: selectedCellData.cartonRotationDeg,
                          cellAlignment: selectedCellData.cellAlignment,
                          fillDirection: selectedCellData.fillDirection,
                          showInternalDividers: selectedCellData.showInternalDividers,
                          dividerHeightRatio: selectedCellData.dividerHeightRatio,
                          staggerOffsetRatio: selectedCellData.staggerOffsetRatio,
                          medicines: meds,
                        });
                      }
                    }
                    onUpdateRack({ ...selectedRack, customCells: updatedCells });
                  };

                  return (
                    <div className="rounded-xl bg-slate-950/90 border border-cyan-500/40 p-3 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-extrabold text-teal-300 flex items-center gap-1.5">
                            <Grid className="w-3.5 h-3.5 text-cyan-400" />
                            <span>إعدادات شكل وترتيب الأدوية بالتفصيل الكامل</span>
                          </span>
                          <span className="text-[9px] text-slate-400 block">
                            تحكم كامل باتجاه الرص (أفقي، مصفوفة، عمودي، متداخل) والمسافات والحجم والفواصل
                          </span>
                        </div>
                        <button
                          type="button"
                          data-testid="add-sub-medicine-to-cell"
                          onClick={() => {
                            const nextIdx = cellMeds.length + 1;
                            let assignedRow = 1;
                            let assignedCol = 1;
                            let foundEmpty = false;
                            for (let r = 1; r <= activeRows; r++) {
                              for (let c = 1; c <= activeCols; c++) {
                                if (!cellMeds.some((m) => m.matrixRow === r && m.matrixCol === c)) {
                                  assignedRow = r;
                                  assignedCol = c;
                                  foundEmpty = true;
                                  break;
                                }
                              }
                              if (foundEmpty) break;
                            }
                            if (!foundEmpty) {
                              assignedRow = Math.min(activeRows, Math.floor((nextIdx - 1) / activeCols) + 1);
                              assignedCol = ((nextIdx - 1) % activeCols) + 1;
                            }

                            const newMed: CellMedicineItem = {
                              id: `${selectedCellData.id || selectedCellData.code}-med-${Date.now()}`,
                              subSlotCode: `${selectedCellData.code}/R${assignedRow}-C${assignedCol}`,
                              matrixRow: assignedRow,
                              matrixCol: assignedCol,
                              productName: `صنف دوائي فرعي #${nextIdx}`,
                              nameEn: `Sub Medicine #${nextIdx}`,
                              scientificName: 'Active Compound',
                              barcode: `6281099${String(nextIdx).padStart(3, '0')}`,
                              batchNumber: `BCH-26-M${nextIdx}`,
                              expiryDate: '2027-09-30',
                              quantity: 20,
                              movementCategory: 'AVAILABLE',
                              color: nextIdx % 2 === 0 ? '#06b6d4' : '#f59e0b',
                            };
                            syncMedicinesList(
                              [...cellMeds, newMed],
                              activeMode === 'HORIZONTAL_ROW' ? nextIdx : activeCols,
                              activeMode === 'DEPTH_FILE' ? nextIdx : activeRows,
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-[10px] flex items-center gap-1 shadow transition"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ إضافة دواء</span>
                        </button>
                      </div>

                      {/* 1. Primary Arrangement Mode Selector (5 Geometric Modes — Horizontal First!) */}
                      <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5 space-y-2.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-extrabold text-cyan-300">
                            1. نمط وشكل هندسة الترتيب (Arrangement Pattern):
                          </span>
                          <span className="font-mono font-black text-teal-300 bg-slate-950 px-1.5 py-0.5 rounded border border-teal-500/30">
                            {activeRows} صف × {activeCols} عمود × {activeLayersY} طبقة
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            {
                              mode: 'HORIZONTAL_ROW' as CellArrangementMode,
                              title: 'أفقي ممتد (صف واحد جنب بعض)',
                              desc: `${cellMeds.length} أعمدة × 1 صف`,
                              cols: Math.max(2, cellMeds.length),
                              rows: 1,
                              layers: 1,
                            },
                            {
                              mode: 'MATRIX_2D' as CellArrangementMode,
                              title: 'مصفوفة 2D (عرضي × طولي)',
                              desc: 'صفوف بالعمق × أعمدة بالعرض',
                              cols: 2,
                              rows: 2,
                              layers: 1,
                            },
                            {
                              mode: 'DEPTH_FILE' as CellArrangementMode,
                              title: 'طولي في العمق (رتل خلفي)',
                              desc: `1 عمود × ${cellMeds.length} صفوف`,
                              cols: 1,
                              rows: Math.max(2, cellMeds.length),
                              layers: 1,
                            },
                            {
                              mode: 'VERTICAL_STACK' as CellArrangementMode,
                              title: 'تكديس رأسي طابقي (فوق بعض)',
                              desc: `${cellMeds.length} طبقات فوق بعضها`,
                              cols: 1,
                              rows: 1,
                              layers: Math.max(2, cellMeds.length),
                            },
                            {
                              mode: 'STAGGERED_HEX' as CellArrangementMode,
                              title: 'ترتيب سداسي / متداخل متناوب',
                              desc: 'صفوف متداخلة بإزاحة أفقية',
                              cols: 3,
                              rows: 2,
                              layers: 1,
                            },
                          ].map((item) => {
                            const isSelected = activeMode === item.mode;
                            return (
                              <button
                                key={item.mode}
                                type="button"
                                onClick={() =>
                                  syncMedicinesList(
                                    cellMeds,
                                    item.cols,
                                    item.rows,
                                    item.mode,
                                    item.layers,
                                  )
                                }
                                className={`p-1.5 rounded-lg text-right border transition flex flex-col justify-between ${
                                  item.mode === 'HORIZONTAL_ROW' ? 'col-span-2' : ''
                                } ${
                                  isSelected
                                    ? 'bg-cyan-500/25 border-cyan-400 text-white ring-1 ring-cyan-400 shadow'
                                    : 'bg-slate-950/90 border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                <span className="text-[10px] font-black text-cyan-300">
                                  {item.title}
                                </span>
                                <span className="text-[8px] font-mono text-slate-400">
                                  {item.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* 2. Quick Matrix Presets (Horizontal & Grid Presets) */}
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block mb-1">
                            قوالب سريعة للأبعاد (أفقي / شبكي):
                          </span>
                          <div className="grid grid-cols-4 gap-1">
                            {[
                              { label: 'أفقي 4×1', cols: 4, rows: 1, mode: 'HORIZONTAL_ROW' as CellArrangementMode },
                              { label: 'أفقي 6×1', cols: 6, rows: 1, mode: 'HORIZONTAL_ROW' as CellArrangementMode },
                              { label: 'أفقي 3×2', cols: 3, rows: 2, mode: 'MATRIX_2D' as CellArrangementMode },
                              { label: 'أفقي 4×2', cols: 4, rows: 2, mode: 'MATRIX_2D' as CellArrangementMode },
                              { label: 'مربع 2×2', cols: 2, rows: 2, mode: 'MATRIX_2D' as CellArrangementMode },
                              { label: 'مربع 3×3', cols: 3, rows: 3, mode: 'MATRIX_2D' as CellArrangementMode },
                              { label: 'عمودي 2×3', cols: 2, rows: 3, mode: 'MATRIX_2D' as CellArrangementMode },
                              { label: 'طولي 1×4', cols: 1, rows: 4, mode: 'DEPTH_FILE' as CellArrangementMode },
                            ].map((preset) => {
                              const isSel =
                                activeCols === preset.cols &&
                                activeRows === preset.rows &&
                                activeMode === preset.mode;
                              return (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() =>
                                    syncMedicinesList(
                                      cellMeds,
                                      preset.cols,
                                      preset.rows,
                                      preset.mode,
                                      1,
                                    )
                                  }
                                  className={`py-1 px-1 rounded text-[9px] font-bold border transition ${
                                    isSel
                                      ? 'bg-teal-500/30 border-teal-400 text-teal-200'
                                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 3. Custom Spinners: Exact Columns (X), Rows (Z), Vertical Layers (Y) */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-800">
                          <div>
                            <label className="text-[8px] text-slate-400 font-bold block mb-0.5">
                              الأعمدة أفقياً (X):
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={activeCols}
                              onChange={(e) => {
                                const c = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                                syncMedicinesList(cellMeds, c, activeRows, activeMode, activeLayersY);
                              }}
                              className="w-full h-6 rounded bg-slate-950 border border-slate-700 text-center font-mono text-[11px] font-black text-cyan-300"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-slate-400 font-bold block mb-0.5">
                              الصفوف بالعمق (Z):
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="8"
                              value={activeRows}
                              onChange={(e) => {
                                const r = Math.max(1, Math.min(8, parseInt(e.target.value) || 1));
                                syncMedicinesList(cellMeds, activeCols, r, activeMode, activeLayersY);
                              }}
                              className="w-full h-6 rounded bg-slate-950 border border-slate-700 text-center font-mono text-[11px] font-black text-cyan-300"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] text-slate-400 font-bold block mb-0.5">
                              الطبقات رأسياً (Y):
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={activeLayersY}
                              onChange={(e) => {
                                const ly = Math.max(1, Math.min(5, parseInt(e.target.value) || 1));
                                syncMedicinesList(cellMeds, activeCols, activeRows, activeMode, ly);
                              }}
                              className="w-full h-6 rounded bg-slate-950 border border-slate-700 text-center font-mono text-[11px] font-black text-amber-300"
                            />
                          </div>
                        </div>

                        {/* 4. Granular Sliders: Gap X, Gap Z, Carton Scale, Carton Rotation */}
                        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                          <div>
                            <div className="flex justify-between text-[9px] mb-0.5">
                              <span className="text-slate-400">تباعد أفقي (Gap X):</span>
                              <span className="font-mono text-cyan-300">
                                {Math.round((selectedCellData.gapX ?? 0.018) * 100)} سم
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="0.10"
                              step="0.005"
                              value={selectedCellData.gapX ?? 0.018}
                              onChange={(e) =>
                                handleUpdateCurrentCell({ gapX: parseFloat(e.target.value) })
                              }
                              className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[9px] mb-0.5">
                              <span className="text-slate-400">تباعد بالعمق (Gap Z):</span>
                              <span className="font-mono text-cyan-300">
                                {Math.round((selectedCellData.gapZ ?? 0.02) * 100)} سم
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="0.10"
                              step="0.005"
                              value={selectedCellData.gapZ ?? 0.02}
                              onChange={(e) =>
                                handleUpdateCurrentCell({ gapZ: parseFloat(e.target.value) })
                              }
                              className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[9px] mb-0.5">
                              <span className="text-slate-400">حجم الكرتون (Scale):</span>
                              <span className="font-mono text-emerald-300">
                                {Math.round((selectedCellData.cartonScale ?? 1.0) * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.45"
                              max="1.15"
                              step="0.05"
                              value={selectedCellData.cartonScale ?? 1.0}
                              onChange={(e) =>
                                handleUpdateCurrentCell({ cartonScale: parseFloat(e.target.value) })
                              }
                              className="w-full accent-emerald-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[9px] mb-0.5">
                              <span className="text-slate-400">زاوية الكرتون (Rotation):</span>
                              <span className="font-mono text-amber-300">
                                {selectedCellData.cartonRotationDeg ?? 0}°
                              </span>
                            </div>
                            <input
                              type="range"
                              min="-90"
                              max="90"
                              step="15"
                              value={selectedCellData.cartonRotationDeg ?? 0}
                              onChange={(e) =>
                                handleUpdateCurrentCell({
                                  cartonRotationDeg: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full accent-amber-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* 5. Cell Alignment & Internal 3D Dividers Control */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                          <div>
                            <label className="text-[8px] text-slate-400 font-bold block mb-0.5">
                              محاذاة الكراتين بالخانة:
                            </label>
                            <select
                              value={selectedCellData.cellAlignment || 'CENTER'}
                              onChange={(e) =>
                                handleUpdateCurrentCell({
                                  cellAlignment: e.target.value as CellAlignmentMode,
                                })
                              }
                              className="w-full h-6 rounded bg-slate-950 border border-slate-700 text-white text-[10px] px-1 font-bold"
                            >
                              <option value="CENTER">توسيط كامل (Center)</option>
                              <option value="FRONT">مقدمة الرف (Front)</option>
                              <option value="BACK">عمق الرف (Back)</option>
                              <option value="LEFT">أقصى اليسار (Left)</option>
                              <option value="RIGHT">أقصى اليمين (Right)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[8px] text-slate-400 font-bold block mb-0.5">
                              اتجاه التعبئة التلقائي:
                            </label>
                            <select
                              value={selectedCellData.fillDirection || 'ROW_FIRST'}
                              onChange={(e) =>
                                handleUpdateCurrentCell({
                                  fillDirection: e.target.value as CellFillDirection,
                                })
                              }
                              className="w-full h-6 rounded bg-slate-950 border border-slate-700 text-white text-[10px] px-1 font-bold"
                            >
                              <option value="ROW_FIRST">أفقياً (صفاً بصف)</option>
                              <option value="COL_FIRST">عمودياً (عموداً بعمود)</option>
                              <option value="MANUAL">تخصيص يدوي حر</option>
                            </select>
                          </div>
                        </div>

                        {/* Internal 3D Dividers Toggle & Height */}
                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateCurrentCell({
                                showInternalDividers:
                                  selectedCellData.showInternalDividers === false ? true : false,
                              })
                            }
                            className={`px-2 py-1 rounded-lg border text-[9px] font-bold flex items-center gap-1 transition ${
                              selectedCellData.showInternalDividers !== false
                                ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                                : 'bg-slate-950 border-slate-800 text-slate-500'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>إظهار الفواصل 3D</span>
                          </button>

                          <div className="flex-1 flex items-center gap-1.5">
                            <span className="text-[8px] text-slate-400 shrink-0">ارتفاع الفاصل:</span>
                            <input
                              type="range"
                              min="0.25"
                              max="1.0"
                              step="0.05"
                              value={selectedCellData.dividerHeightRatio ?? 0.85}
                              onChange={(e) =>
                                handleUpdateCurrentCell({
                                  dividerHeightRatio: parseFloat(e.target.value),
                                })
                              }
                              className="w-full accent-teal-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Apply Arrangement to All Cells in Rack Button */}
                        <button
                          type="button"
                          onClick={handleApplyArrangementToEntireRack}
                          className="w-full py-1.5 px-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-[10px] font-extrabold flex items-center justify-center gap-1.5 transition"
                        >
                          <Copy className="w-3 h-3 text-cyan-400" />
                          <span>تعميم إعدادات هذا الترتيب على جميع خانات الرف ({selectedRack.code})</span>
                        </button>

                        {/* Interactive Visual 2D Matrix Mini-Map */}
                        <div className="pt-1.5 border-t border-slate-800">
                          <div className="text-[9px] text-slate-400 font-bold mb-1">
                            مخطط توزع الأدوية في الخانة ({activeRows}×{activeCols}):
                          </div>
                          <div
                            className="grid gap-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800"
                            style={{
                              gridTemplateColumns: `repeat(${activeCols}, minmax(0, 1fr))`,
                            }}
                          >
                            {Array.from({ length: activeRows }).map((_, rIdx) => {
                              const rowNum = rIdx + 1;
                              return Array.from({ length: activeCols }).map((_, cIdx) => {
                                const colNum = cIdx + 1;
                                const occupiedMed = cellMeds.find(
                                  (m, idx) =>
                                    (m.matrixRow || Math.floor(idx / activeCols) + 1) === rowNum &&
                                    (m.matrixCol || (idx % activeCols) + 1) === colNum,
                                );
                                return (
                                  <div
                                    key={`mat-${rowNum}-${colNum}`}
                                    className={`p-1 rounded border text-center transition flex flex-col justify-between min-h-[44px] ${
                                      occupiedMed
                                        ? 'bg-slate-900 border-teal-500/60 shadow-sm'
                                        : 'bg-slate-950/60 border-dashed border-slate-700/60 text-slate-500'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-[8px] font-mono text-cyan-400 border-b border-slate-800 pb-0.5">
                                      <span>ص{rowNum}·ع{colNum}</span>
                                      {occupiedMed && (
                                        <span
                                          className="w-2 h-2 rounded-full inline-block"
                                          style={{ backgroundColor: occupiedMed.color || '#06b6d4' }}
                                        />
                                      )}
                                    </div>
                                    <div className="text-[8px] font-bold text-white truncate my-auto">
                                      {occupiedMed ? occupiedMed.productName : 'فارغ'}
                                    </div>
                                    <div className="text-[7px] font-mono text-emerald-400">
                                      {occupiedMed ? `${occupiedMed.quantity} عبوة` : '-'}
                                    </div>
                                  </div>
                                );
                              });
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Medicines List with Matrix Slot Selectors */}
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
                        {cellMeds.map((med, mIdx) => {
                          const currentMedRow =
                            med.matrixRow && med.matrixRow >= 1
                              ? med.matrixRow
                              : Math.min(activeRows, Math.floor(mIdx / activeCols) + 1);
                          const currentMedCol =
                            med.matrixCol && med.matrixCol >= 1
                              ? med.matrixCol
                              : Math.min(activeCols, (mIdx % activeCols) + 1);

                          return (
                            <div
                              key={med.id || mIdx}
                              className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 space-y-2"
                            >
                              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 font-mono text-[10px] font-black text-cyan-300">
                                    {med.subSlotCode || `${selectedCellData.code}/R${currentMedRow}-C${currentMedCol}`}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-300">
                                    الدواء #{mIdx + 1}
                                  </span>
                                </div>
                                {cellMeds.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const filtered = cellMeds.filter((_, i) => i !== mIdx);
                                      syncMedicinesList(filtered);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 text-[9px] font-bold flex items-center gap-0.5"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                    <span>حذف</span>
                                  </button>
                                )}
                              </div>

                              {/* Matrix Position Assignment: Row (طولي) & Column (عرضي) */}
                              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                <div>
                                  <label className="text-[8px] text-cyan-400 font-bold block mb-0.5">
                                    الصف (طولي Z):
                                  </label>
                                  <select
                                    value={currentMedRow}
                                    onChange={(e) => {
                                      const next = [...cellMeds];
                                      const newRow = parseInt(e.target.value) || 1;
                                      next[mIdx] = {
                                        ...med,
                                        matrixRow: newRow,
                                        subSlotCode: `${selectedCellData.code}/R${newRow}-C${currentMedCol}`,
                                      };
                                      syncMedicinesList(next);
                                    }}
                                    className="w-full h-6 rounded bg-slate-900 border border-slate-700 text-white font-mono text-[10px] px-1 font-bold"
                                  >
                                    {Array.from({ length: activeRows }).map((_, r) => (
                                      <option key={r + 1} value={r + 1}>
                                        صف {r + 1} ({r === 0 ? 'أمامي' : r === activeRows - 1 ? 'خلفي' : 'أوسط'})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[8px] text-cyan-400 font-bold block mb-0.5">
                                    العمود (عرضي X):
                                  </label>
                                  <select
                                    value={currentMedCol}
                                    onChange={(e) => {
                                      const next = [...cellMeds];
                                      const newCol = parseInt(e.target.value) || 1;
                                      next[mIdx] = {
                                        ...med,
                                        matrixCol: newCol,
                                        subSlotCode: `${selectedCellData.code}/R${currentMedRow}-C${newCol}`,
                                      };
                                      syncMedicinesList(next);
                                    }}
                                    className="w-full h-6 rounded bg-slate-900 border border-slate-700 text-white font-mono text-[10px] px-1 font-bold"
                                  >
                                    {Array.from({ length: activeCols }).map((_, c) => (
                                      <option key={c + 1} value={c + 1}>
                                        عمود {c + 1} ({c === 0 ? 'يسار' : c === activeCols - 1 ? 'يمين' : 'وسط'})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="text-[9px] text-slate-400 font-bold block mb-0.5">
                                  اسم الدواء #{mIdx + 1}:
                                </label>
                                <input
                                  type="text"
                                  value={med.productName}
                                  onChange={(e) => {
                                    const next = [...cellMeds];
                                    next[mIdx] = { ...med, productName: e.target.value };
                                    syncMedicinesList(next);
                                  }}
                                  className="w-full h-7 rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-white text-xs font-bold focus:border-teal-500 focus:outline-none"
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-1.5">
                                <div>
                                  <label className="text-[9px] text-slate-400 block mb-0.5">الباركود:</label>
                                  <input
                                    type="text"
                                    value={med.barcode}
                                    onChange={(e) => {
                                      const next = [...cellMeds];
                                      next[mIdx] = { ...med, barcode: e.target.value };
                                      syncMedicinesList(next);
                                    }}
                                    className="w-full h-7 rounded border border-slate-700 bg-slate-950 px-1.5 text-amber-300 font-mono text-[10px]"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-400 block mb-0.5">التشغيلة:</label>
                                  <input
                                    type="text"
                                    value={med.batchNumber}
                                    onChange={(e) => {
                                      const next = [...cellMeds];
                                      next[mIdx] = { ...med, batchNumber: e.target.value };
                                      syncMedicinesList(next);
                                    }}
                                    className="w-full h-7 rounded border border-slate-700 bg-slate-950 px-1.5 text-white font-mono text-[10px]"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-400 block mb-0.5">الكمية (عبوة):</label>
                                  <input
                                    type="number"
                                    value={med.quantity}
                                    onChange={(e) => {
                                      const next = [...cellMeds];
                                      next[mIdx] = {
                                        ...med,
                                        quantity: Math.max(0, parseInt(e.target.value) || 0),
                                      };
                                      syncMedicinesList(next);
                                    }}
                                    className="w-full h-7 rounded border border-slate-700 bg-slate-950 px-1.5 text-emerald-300 font-mono font-bold text-[10px]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <label className="text-[9px] text-slate-400 block mb-0.5">تاريخ الصلاحية:</label>
                                  <input
                                    type="date"
                                    value={med.expiryDate || '2027-12-31'}
                                    onChange={(e) => {
                                      const next = [...cellMeds];
                                      next[mIdx] = { ...med, expiryDate: e.target.value };
                                      syncMedicinesList(next);
                                    }}
                                    className="w-full h-7 rounded border border-slate-700 bg-slate-950 px-1.5 text-white font-mono text-[10px]"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-400 block mb-0.5">لون كرتون القسم:</label>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="color"
                                      value={med.color || selectedCellData.color || '#f59e0b'}
                                      onChange={(e) => {
                                        const next = [...cellMeds];
                                        next[mIdx] = { ...med, color: e.target.value };
                                        syncMedicinesList(next);
                                      }}
                                      className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                                    />
                                    <span className="text-[9px] font-mono text-slate-400">
                                      {med.color || '#f59e0b'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Individual Medicine Clarity / Transparency Slider */}
                              <div className="pt-1 border-t border-slate-800/80">
                                <div className="flex items-center justify-between text-[9px] mb-0.5">
                                  <span className="text-cyan-300 font-bold">
                                    وضوح وشفافية هذا الدواء (Opacity):
                                  </span>
                                  <span className="font-mono font-bold text-cyan-300">
                                    {Math.round((med.opacity ?? selectedCellData.cellOpacity ?? 1.0) * 100)}%
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="0.15"
                                  max="1.0"
                                  step="0.05"
                                  value={med.opacity ?? selectedCellData.cellOpacity ?? 1.0}
                                  onChange={(e) => {
                                    const next = [...cellMeds];
                                    next[mIdx] = { ...med, opacity: parseFloat(e.target.value) };
                                    syncMedicinesList(next);
                                  }}
                                  className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Per-Cell Transparency & Clarity Control Card (تعديل الشفافية والوضوح في الخانة) */}
                <div className="rounded-xl bg-slate-950/90 border border-teal-500/40 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-cyan-300">
                      وضوح وشفافية الخانة بالكامل (Cell Transparency):
                    </span>
                    <span className="font-mono font-black text-cyan-300">
                      {Math.round((selectedCellData.cellOpacity ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    data-testid="cell-opacity-slider"
                    min="0.15"
                    max="1.0"
                    step="0.05"
                    value={selectedCellData.cellOpacity ?? 1.0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const updatedMeds = (selectedCellData.medicines || []).map((m) => ({
                        ...m,
                        opacity: val,
                      }));
                      handleUpdateCurrentCell({
                        cellOpacity: val,
                        ...(updatedMeds.length > 0 ? { medicines: updatedMeds } : {}),
                      });
                    }}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    {[
                      { label: 'شفاف X-Ray (30%)', val: 0.3 },
                      { label: 'نصف شفاف (60%)', val: 0.6 },
                      { label: 'واضح كامل (100%)', val: 1.0 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => {
                          const updatedMeds = (selectedCellData.medicines || []).map((m) => ({
                            ...m,
                            opacity: preset.val,
                          }));
                          handleUpdateCurrentCell({
                            cellOpacity: preset.val,
                            ...(updatedMeds.length > 0 ? { medicines: updatedMeds } : {}),
                          });
                        }}
                        className={`py-1 rounded-lg text-[10px] font-bold border transition ${
                          Math.abs((selectedCellData.cellOpacity ?? 1.0) - preset.val) < 0.05
                            ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-cyan-500/50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      إجمالي الكمية بالخانة:
                    </label>
                    <input
                      type="number"
                      value={selectedCellData.quantity || 50}
                      onChange={(e) =>
                        handleUpdateCurrentCell({ quantity: parseInt(e.target.value) || 0 })
                      }
                      className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 font-mono text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      السعة القصوى للخانة (Capacity):
                    </label>
                    <input
                      type="number"
                      value={selectedCellData.capacity || 100}
                      onChange={(e) =>
                        handleUpdateCurrentCell({ capacity: parseInt(e.target.value) || 100 })
                      }
                      className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 font-mono text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-amber-600/50 bg-amber-950/20 p-4 text-center space-y-2">
                <p className="text-xs text-amber-200 font-bold">
                  هذه الخانة فارغة وجاهزة لاستقبال مستحضر دوائي جديد!
                </p>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateCurrentCell({
                      occupied: true,
                      productName: 'دواء جديد معتمد',
                      quantity: 50,
                      capacity: 100,
                    })
                  }
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> إضافة كرتون دواء إلى هذه الخانة
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => onSendWorkerToRack(selectedRack.id, selection.cellLevel || undefined)}
              className="w-full h-8 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
            >
              <Navigation className="w-3.5 h-3.5" /> توجيه العامل لمسح وفحص هذه الخانة بالليزر 🔍
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. ARCHITECTURAL ELEMENT & REAL DOORWAY EDITOR            */}
        {/* ========================================================= */}
        {selection.type === 'ELEMENT' && selectedElement && (
          <div className="space-y-3.5 pt-1">
            {/* Lock toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-amber-300 font-bold">
                {selectedElement.type} · {selectedElement.subType}
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateElement({ ...selectedElement, locked: !selectedElement.locked })
                }
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${
                  selectedElement.locked
                    ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                    : 'bg-slate-950 border-slate-700 text-emerald-300'
                }`}
              >
                {selectedElement.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                <span>{selectedElement.locked ? 'مقفل' : 'مفتوح للتعديل'}</span>
              </button>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">اسم / تسمية العنصر:</label>
              <input
                type="text"
                value={selectedElement.label}
                onChange={(e) => onUpdateElement({ ...selectedElement, label: e.target.value })}
                className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-3 text-white text-xs font-bold focus:border-teal-500 focus:outline-none"
              />
            </div>

            {/* REAL DOORWAY ENTRANCE CONTROLS */}
            {selectedElement.type === 'DOOR' && (
              <div className="rounded-xl bg-teal-950/30 border border-teal-500/40 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-teal-300 flex items-center gap-1.5">
                    <DoorOpen className="w-4 h-4" /> تحكم المدخل المفتوح الحقيقي في الجدار
                  </span>
                  <span className="font-mono text-xs font-bold text-white">
                    {Math.round((selectedElement.openRatio ?? 0.85) * 100)}% مفتوح
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedElement.openRatio ?? 0.85}
                  onChange={(e) =>
                    onUpdateElement({ ...selectedElement, openRatio: parseFloat(e.target.value) })
                  }
                  className="w-full accent-teal-400 cursor-pointer"
                />

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateElement({ ...selectedElement, openRatio: 1.0 })}
                    className="py-1 rounded bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 font-bold text-[10px]"
                  >
                    مفتوح 100%
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateElement({ ...selectedElement, openRatio: 0.5 })}
                    className="py-1 rounded bg-amber-600/30 border border-amber-500/50 text-amber-200 font-bold text-[10px]"
                  >
                    نصف مفتوح 50%
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateElement({ ...selectedElement, openRatio: 0.0 })}
                    className="py-1 rounded bg-rose-600/30 border border-rose-500/50 text-rose-200 font-bold text-[10px]"
                  >
                    مغلق 0%
                  </button>
                </div>

                <div>
                  <label className="text-[10px] text-slate-300 block mb-1">طراز البوابة المعمارية:</label>
                  <select
                    value={selectedElement.subType}
                    onChange={(e) => onUpdateElement({ ...selectedElement, subType: e.target.value })}
                    className="w-full h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-white font-bold text-xs"
                  >
                    <option value="MAIN_ENTRANCE">🚪 مدخل رئيسي بأبواب زجاجية مزدوجة ومظلة</option>
                    <option value="DOCK_BAY">🚛 بوابة رصيف شحن شاحنات رول أب (Dock Bay)</option>
                    <option value="EMERGENCY_EXIT">🚨 بوابة طوارئ معتمدة</option>
                  </select>
                </div>
              </div>
            )}

            {/* Dimensions & 360 Rotation */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-2.5">
              <span className="text-[11px] font-bold text-white block">الأبعاد والتدوير 360° بالمتر</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">العرض W:</label>
                  <input
                    type="number"
                    step="0.2"
                    value={selectedElement.w}
                    onChange={(e) =>
                      onUpdateElement({ ...selectedElement, w: Math.max(0.2, parseFloat(e.target.value) || 1) })
                    }
                    className="w-full h-7 rounded border border-slate-700 bg-slate-900 px-1.5 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">العمق D:</label>
                  <input
                    type="number"
                    step="0.2"
                    value={selectedElement.d}
                    onChange={(e) =>
                      onUpdateElement({ ...selectedElement, d: Math.max(0.2, parseFloat(e.target.value) || 1) })
                    }
                    className="w-full h-7 rounded border border-slate-700 bg-slate-900 px-1.5 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">الارتفاع H:</label>
                  <input
                    type="number"
                    step="0.2"
                    value={selectedElement.h}
                    onChange={(e) =>
                      onUpdateElement({ ...selectedElement, h: Math.max(0.2, parseFloat(e.target.value) || 1) })
                    }
                    className="w-full h-7 rounded border border-slate-700 bg-slate-900 px-1.5 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400">زاوية التدوير الحر (0° - 360°):</span>
                  <span className="font-mono font-bold text-amber-300">{selectedElement.rotation || 0}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={selectedElement.rotation || 0}
                  onChange={(e) => onUpdateElement({ ...selectedElement, rotation: parseInt(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Position X, Z & Color */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">الموضع X:</label>
                <input
                  type="number"
                  step="0.2"
                  value={selectedElement.x}
                  onChange={(e) => onUpdateElement({ ...selectedElement, x: parseFloat(e.target.value) || 0 })}
                  className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 font-mono text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">الموضع Z:</label>
                <input
                  type="number"
                  step="0.2"
                  value={selectedElement.z}
                  onChange={(e) => onUpdateElement({ ...selectedElement, z: parseFloat(e.target.value) || 0 })}
                  className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 font-mono text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">اللون:</label>
                <input
                  type="color"
                  value={selectedElement.color || '#2563eb'}
                  onChange={(e) => onUpdateElement({ ...selectedElement, color: e.target.value })}
                  className="w-full h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => onDuplicateElement(selectedElement.id)}
                className="flex-1 h-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" /> تكرار
              </button>
              <button
                type="button"
                onClick={() => onDeleteElement(selectedElement.id)}
                className="h-8 px-4 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 font-bold text-xs flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> حذف
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. WORKER EDITOR                                          */}
        {/* ========================================================= */}
        {selection.type === 'WORKER' && (
          <div className="space-y-3.5 pt-1">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">اسم المشرف / المجهز:</label>
              <input
                type="text"
                value={workerConfig.name}
                onChange={(e) => onUpdateWorkerConfig({ name: e.target.value })}
                className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-3 text-white text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                سرعة المشي ({workerConfig.walkSpeed.toFixed(1)} م/ث):
              </label>
              <input
                type="range"
                min="0.8"
                max="3.5"
                step="0.1"
                value={workerConfig.walkSpeed}
                onChange={(e) => onUpdateWorkerConfig({ walkSpeed: parseFloat(e.target.value) })}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">الوضعية الحركية (Pose):</label>
              <select
                value={workerConfig.actionState}
                onChange={(e) =>
                  onUpdateWorkerConfig({
                    actionState: e.target.value as any,
                  })
                }
                className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-white font-bold text-xs"
              >
                <option value="IDLE">وقوف عادي (Idle)</option>
                <option value="SCANNING">مسح بالليزر الأحمر (Scanning)</option>
                <option value="PICKING">التقاط وحمل كرتون (Picking)</option>
                <option value="REACHING_HIGH">مد اليد للرفوف العلوية (Reaching High)</option>
                <option value="BENDING_LOW">انحناء للرفوف السفلية (Bending Low)</option>
              </select>
            </div>

            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={workerConfig.carryingBox}
                  onChange={(e) => onUpdateWorkerConfig({ carryingBox: e.target.checked })}
                  className="rounded accent-teal-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-white">يحمل كرتون دواء بين يديه</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">سترة السلامة (Vest):</label>
                <input
                  type="color"
                  value={workerConfig.vestColor}
                  onChange={(e) => onUpdateWorkerConfig({ vestColor: e.target.value })}
                  className="w-full h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">الخوذة (Helmet):</label>
                <input
                  type="color"
                  value={workerConfig.helmetColor}
                  onChange={(e) => onUpdateWorkerConfig({ helmetColor: e.target.value })}
                  className="w-full h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. PACKAGE EDITOR                                         */}
        {/* ========================================================= */}
        {selection.type === 'PACKAGE' && (
          <div className="space-y-3.5 pt-1">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">كود الطرد:</label>
              <input
                type="text"
                value={packageConfig.code}
                onChange={(e) => onUpdatePackageConfig({ code: e.target.value })}
                className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono font-bold text-amber-300"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">اسم الصنف:</label>
              <input
                type="text"
                value={packageConfig.productName}
                onChange={(e) => onUpdatePackageConfig({ productName: e.target.value })}
                className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-3 text-white font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">الكمية:</label>
                <input
                  type="number"
                  value={packageConfig.quantity}
                  onChange={(e) => onUpdatePackageConfig({ quantity: parseInt(e.target.value) || 1 })}
                  className="w-full h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 font-mono text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">لون الكرتون:</label>
                <input
                  type="color"
                  value={packageConfig.color}
                  onChange={(e) => onUpdatePackageConfig({ color: e.target.value })}
                  className="w-full h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. WAREHOUSE WALLS, TEXTURES, BACKGROUNDS & OPEN SPACE    */}
        {/* ========================================================= */}
        {selection.type === 'WAREHOUSE' && (
          <div className="space-y-4 pt-1">
            {/* Open Space Mode Toggle */}
            <div className="rounded-xl bg-teal-950/30 border border-teal-500/40 p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-teal-300 block">
                  وضع المساحة المفتوحة الحرة (Open Space Mode)
                </span>
                <span className="text-[10px] text-slate-300">
                  يسمح بتوسيع الرفوف وتحريكها بحرية تامة دون قيود الحدود
                </span>
              </div>
              <input
                type="checkbox"
                checked={envConfig.openSpaceMode}
                onChange={(e) => onUpdateEnvConfig({ openSpaceMode: e.target.checked })}
                className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
              />
            </div>

            {/* Warehouse Overall Dimensions */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-2.5">
              <span className="text-xs font-bold text-white block">أبعاد أرضية وسقف المستودع بالمتر</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">العرض X (م):</label>
                  <input
                    type="number"
                    min="6"
                    max="150"
                    value={dimensions.ww}
                    onChange={(e) =>
                      onUpdateDimensions({ ...dimensions, ww: Math.max(6, parseInt(e.target.value) || 24) })
                    }
                    className="w-full h-8 rounded border border-slate-700 bg-slate-900 px-2 font-mono text-white font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">العمق Z (م):</label>
                  <input
                    type="number"
                    min="6"
                    max="150"
                    value={dimensions.wd}
                    onChange={(e) =>
                      onUpdateDimensions({ ...dimensions, wd: Math.max(6, parseInt(e.target.value) || 16) })
                    }
                    className="w-full h-8 rounded border border-slate-700 bg-slate-900 px-2 font-mono text-white font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">الارتفاع H (م):</label>
                  <input
                    type="number"
                    min="3"
                    max="30"
                    value={dimensions.wh}
                    onChange={(e) =>
                      onUpdateDimensions({ ...dimensions, wh: Math.max(3, parseInt(e.target.value) || 8) })
                    }
                    className="w-full h-8 rounded border border-slate-700 bg-slate-900 px-2 font-mono text-white font-bold text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Individual Control Over All 4 Perimeter Walls */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>التحكم الفردي بجدران المستودع الأربعة</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateEnvConfig({
                      northWall: 'OPEN',
                      southWall: 'OPEN',
                      westWall: 'OPEN',
                      eastWall: 'OPEN',
                    })
                  }
                  className="py-1.5 px-2 rounded-lg bg-amber-600/25 hover:bg-amber-600/40 border border-amber-500/40 text-amber-200 font-bold text-[10px]"
                >
                  🔓 إخفاء كل الجدران (مفتوح)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateEnvConfig({
                      northWall: 'SOLID',
                      southWall: 'SOLID',
                      westWall: 'SOLID',
                      eastWall: 'SOLID',
                    })
                  }
                  className="py-1.5 px-2 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 font-bold text-[10px]"
                >
                  🧱 إظهار كل الجدران الأربعة
                </button>
              </div>

              {(
                [
                  { key: 'northWall', label: 'الجدار الشمالي (المدخل الرئيسي)' },
                  { key: 'southWall', label: 'الجدار الجنوبي (الأمامي)' },
                  { key: 'westWall', label: 'الجدار الغربي (الأيسر)' },
                  { key: 'eastWall', label: 'الجدار الشرقي (الأيمن)' },
                ] as const
              ).map((wItem) => (
                <div key={wItem.key} className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-300 font-bold">{wItem.label}:</span>
                  <select
                    value={envConfig[wItem.key]}
                    onChange={(e) =>
                      onUpdateEnvConfig({ [wItem.key]: e.target.value as WallDisplayMode })
                    }
                    className="h-7 rounded-lg border border-slate-700 bg-slate-900 px-2 text-white text-[11px] font-bold"
                  >
                    <option value="SOLID">🧱 جدار كامل (مع فتحات الأبواب)</option>
                    <option value="GLASS">🪟 جدار زجاجي بانورامي</option>
                    <option value="CURB">📏 حاجز أرضي منخفض</option>
                    <option value="OPEN">🌌 مفتوح تماماً (مخفي)</option>
                  </select>
                </div>
              ))}

              {/* Wall Thickness & Color */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    سماكة الجدران ({envConfig.wallThickness.toFixed(2)}م):
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.04"
                    value={envConfig.wallThickness}
                    onChange={(e) => onUpdateEnvConfig({ wallThickness: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">لون الجدران:</label>
                  <input
                    type="color"
                    value={envConfig.wallColor || '#ffffff'}
                    onChange={(e) => onUpdateEnvConfig({ wallColor: e.target.value })}
                    className="w-full h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Textures & Backdrops Studio */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-teal-400" />
                <span>الخامات عالية الدقة (HD Textures) والخلفيات</span>
              </span>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  خامة أرضية المستودع (Floor Texture):
                </label>
                <select
                  value={envConfig.floorTexture}
                  onChange={(e) =>
                    onUpdateEnvConfig({ floorTexture: e.target.value as FloorTexturePreset })
                  }
                  className="w-full h-8 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-white font-bold text-xs"
                >
                  <option value="POLISHED_CONCRETE">🏗️ خرسانة صناعية مصقولة بفواصل تمدد</option>
                  <option value="EPOXY_PHARMA">🧪 إيبوكسي طبي معقم لامع (Pharma Cleanroom)</option>
                  <option value="MARBLE_TILES">🏛️ بلاط رخام وسيراميك مخبري عالي الدقة</option>
                  <option value="WOOD_PARQUET">🪵 أرضية باركيه خشب بلوط دافئة</option>
                  <option value="DARK_ASPHALT">🌑 أرضية بازلتية داكنة مضادة للانزلاق</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  خامة كسوة الجدران (Wall Cladding Texture):
                </label>
                <select
                  value={envConfig.wallTexture}
                  onChange={(e) =>
                    onUpdateEnvConfig({ wallTexture: e.target.value as WallTexturePreset })
                  }
                  className="w-full h-8 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-white font-bold text-xs"
                >
                  <option value="INSULATED_PANELS">🛡️ ألواح ساندوتش بانل عازلة للحرارة</option>
                  <option value="CLEANROOM_CLADDING">❄️ تكسيات غرف نظيفة طبية (Cleanroom Panels)</option>
                  <option value="PAINTED_BRICK">🧱 طوب معماري مطلي عالي الدقة</option>
                  <option value="CONCRETE_SLAB">🏢 ألواح خرسانية مسبقة الصب</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  خلفية السماء والبيئة المحيطة (3D Skybox Backdrop):
                </label>
                <select
                  value={envConfig.backgroundPreset}
                  onChange={(e) =>
                    onUpdateEnvConfig({ backgroundPreset: e.target.value as BackgroundPreset })
                  }
                  className="w-full h-8 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-white font-bold text-xs"
                >
                  <option value="OUTDOOR_HORIZON">🌤️ أفق خارجي نهاري وساحة شحن واقعية</option>
                  <option value="DAYLIGHT_STUDIO">☀️ أستوديو نهاري ساطع ومتوازن</option>
                  <option value="SUNSET_GOLDEN">🌅 غروب ذهبي دافئ (Golden Sunset)</option>
                  <option value="CLEAN_WHITE">⬜ أستوديو أبيض نقي للمخططات الهندسية</option>
                  <option value="NIGHT_CYBER">🌌 ليلي هندسي داكن (Cyber CAD Night)</option>
                </select>
              </div>
            </div>

            {/* Lighting & Architectural Details Toggles */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>شدة الإضاءة والتفاصيل الإنشائية</span>
                </span>
                <span className="font-mono text-xs text-amber-300">
                  {Math.round((envConfig.lightIntensity || 1) * 100)}%
                </span>
              </div>

              <input
                type="range"
                min="0.4"
                max="2.2"
                step="0.1"
                value={envConfig.lightIntensity || 1.0}
                onChange={(e) => onUpdateEnvConfig({ lightIntensity: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={envConfig.showRoofTrusses}
                    onChange={(e) => onUpdateEnvConfig({ showRoofTrusses: e.target.checked })}
                    className="accent-teal-500 rounded"
                  />
                  <span className="text-[11px] text-slate-300">جمالونات السقف</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={envConfig.showLights}
                    onChange={(e) => onUpdateEnvConfig({ showLights: e.target.checked })}
                    className="accent-teal-500 rounded"
                  />
                  <span className="text-[11px] text-slate-300">كشافات السقف LED</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={envConfig.showExteriorYard}
                    onChange={(e) => onUpdateEnvConfig({ showExteriorYard: e.target.checked })}
                    className="accent-teal-500 rounded"
                  />
                  <span className="text-[11px] text-slate-300">ساحة الشحن الخارجية</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={envConfig.showFloorMarkings}
                    onChange={(e) => onUpdateEnvConfig({ showFloorMarkings: e.target.checked })}
                    className="accent-teal-500 rounded"
                  />
                  <span className="text-[11px] text-slate-300">خطوط السلامة الأرضية</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
