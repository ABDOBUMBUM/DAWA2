/**
 * DAWA Desktop — نوافذ التحكم المعماري والتوسعة وتسكين الخانات وصلاحيات الرؤية
 * (Architectural Elements, Expand Dimensions, Rack & Cell Builder, Yassin's Staff Visibility)
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  ShieldCheck,
  Check,
  DoorOpen,
  Maximize,
  Boxes,
  Camera,
  QrCode,
  Scan,
  Edit3,
  Trash2,
  RotateCw,
  Copy,
  Printer,
  ArrowDownToLine,
  Smartphone,
  Plus,
  Layers,
  Sparkles,
  FileCheck,
  Upload,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import {
  ArchitecturalElement,
  ArchitecturalElementType,
  WarehouseLayoutPlacement,
  RackCell,
  ContextMenuState,
} from './layout-types';
import { DaylightButton } from '../../shell/DaylightControls';
import { CameraState, renderWarehouse3DScene } from './layout-3d-renderer';
import { DEFAULT_ARCHITECTURAL_ELEMENTS } from './layout-types';

// ========================================================
// 1. نافذة إضافة وتعديل العناصر المعمارية (أبواب، نوافذ، جدران، أعمدة، مناطق)
// ========================================================
export function AddElementModal({
  isOpen,
  onClose,
  onAdd,
  ww,
  wd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (element: ArchitecturalElement) => void;
  ww: number;
  wd: number;
}): React.ReactElement | null {
  const [type, setType] = useState<ArchitecturalElementType>('DOOR');
  const [subType, setSubType] = useState('MAIN_ENTRANCE');
  const [label, setLabel] = useState('بوابة الاستلام الرئيسية');
  const [x, setX] = useState(Math.round(ww / 2 - 1.5));
  const [z, setZ] = useState(0.2);
  const [w, setW] = useState(3.0);
  const [d, setD] = useState(0.3);
  const [h, setH] = useState(3.2);
  const [color, setColor] = useState('#10b981');
  const [tempBand, setTempBand] = useState('');

  if (!isOpen) return null;

  const handleTypeSelect = (newType: ArchitecturalElementType) => {
    setType(newType);
    if (newType === 'DOOR') {
      setSubType('DOCK_BAY');
      setLabel('رصيف شحن BAY 01');
      setW(3.5);
      setD(0.4);
      setH(3.6);
      setColor('#2563eb');
    } else if (newType === 'WINDOW') {
      setSubType('CLERESTORY');
      setLabel('نافذة إضاءة علوية');
      setW(4.0);
      setD(0.2);
      setH(1.6);
      setColor('#38bdf8');
    } else if (newType === 'WALL') {
      setSubType('INTERNAL_PARTITION');
      setLabel('قاطع معزول داخلي');
      setW(8.0);
      setD(0.3);
      setH(3.5);
      setColor('#64748b');
    } else if (newType === 'PILLAR') {
      setSubType('CONCRETE_ROUND');
      setLabel('عمود خرساني إنشائي');
      setW(0.6);
      setD(0.6);
      setH(6.0);
      setColor('#94a3b8');
    } else if (newType === 'ZONE') {
      setSubType('COLD_CHAIN');
      setLabel('غرفة التبريد الدوائي');
      setW(8.0);
      setD(6.0);
      setH(3.2);
      setColor('#06b6d4');
      setTempBand('2°C - 8°C');
    }
  };

  const handleConfirm = () => {
    const newEl: ArchitecturalElement = {
      id: `elem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      subType,
      label: label.trim() || 'عنصر معماري',
      x: Number(x) || 1,
      z: Number(z) || 1,
      w: Math.max(0.4, Number(w) || 1),
      d: Math.max(0.2, Number(d) || 1),
      h: Math.max(0.5, Number(h) || 2),
      color,
      temperatureBand: tempBand.trim() || undefined,
    };
    onAdd(newEl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" data-testid="layout-add-element-modal">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
              <DoorOpen className="h-5 w-5" />
            </span>
            <h3 className="text-base font-bold text-white">إضافة عنصر معماري للمستودع (WDA CAD)</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* نوع العنصر المعماري */}
        <div className="mt-4 grid grid-cols-5 gap-2">
          {(['DOOR', 'WINDOW', 'WALL', 'PILLAR', 'ZONE'] as ArchitecturalElementType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeSelect(t)}
              className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-semibold transition ${
                type === t ? 'border border-teal-500 bg-teal-500/20 text-teal-300' : 'border border-slate-800 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="mb-1">
                {t === 'DOOR' && '🚪'}
                {t === 'WINDOW' && '🪟'}
                {t === 'WALL' && '🧱'}
                {t === 'PILLAR' && '🏛️'}
                {t === 'ZONE' && '🗺️'}
              </span>
              {t === 'DOOR' && 'باب/رصيف'}
              {t === 'WINDOW' && 'نافذة'}
              {t === 'WALL' && 'جدار/قاطع'}
              {t === 'PILLAR' && 'عمود إنشائي'}
              {t === 'ZONE' && 'منطقة وظيفية'}
            </button>
          ))}
        </div>

        {/* حقول الإدخال */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">اسم أو تسمية العنصر</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
              placeholder="مثال: رصيف الشحن رقم 1"
              data-testid="add-element-label"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">الإحداثي السيني X (متر)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max={ww}
                value={x}
                onChange={(e) => setX(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">الإحداثي الصادي Z (متر)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max={wd}
                value={z}
                onChange={(e) => setZ(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">العرض W (م)</label>
              <input
                type="number"
                step="0.2"
                min="0.2"
                value={w}
                onChange={(e) => setW(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">العمق D (م)</label>
              <input
                type="number"
                step="0.2"
                min="0.2"
                value={d}
                onChange={(e) => setD(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">الارتفاع H (م)</label>
              <input
                type="number"
                step="0.2"
                min="0.5"
                value={h}
                onChange={(e) => setH(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {type === 'ZONE' && (
            <div>
              <label className="mb-1 block text-xs text-slate-400">نطاق الحرارة (اختياري لسلسلة التبريد)</label>
              <input
                type="text"
                value={tempBand}
                onChange={(e) => setTempBand(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                placeholder="مثال: 2°C - 8°C أو 15°C - 25°C"
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-4">
          <DaylightButton tone="secondary" onClick={onClose}>إلغاء</DaylightButton>
          <DaylightButton tone="primary" onClick={handleConfirm} data-testid="add-element-confirm-btn">
            إضافة للمخطط
          </DaylightButton>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// 2. نافذة توسيع وتعديل أبعاد المستودع (WDA Warehouse Dimensions)
// ========================================================
export function ExpandDimensionsModal({
  isOpen,
  onClose,
  widthM,
  depthM,
  heightM,
  onApply,
}: {
  isOpen: boolean;
  onClose: () => void;
  widthM: number;
  depthM: number;
  heightM: number;
  onApply: (w: number, d: number, h: number) => void;
}): React.ReactElement | null {
  const [w, setW] = useState(widthM);
  const [d, setD] = useState(depthM);
  const [h, setH] = useState(heightM || 8.0);

  if (!isOpen) return null;

  const area = w * d;
  const volume = area * h;

  const handleConfirm = () => {
    onApply(Math.max(10, w), Math.max(10, d), Math.max(3, h));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" data-testid="layout-expand-dimensions-modal">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
              <Maximize className="h-5 w-5" />
            </span>
            <h3 className="text-base font-bold text-white">توسيع أبعاد المستودع (WDA Grid Dimensions)</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>عرض المستودع (Width):</span>
              <span className="font-mono font-bold text-teal-400">{w} متر</span>
            </div>
            <input
              type="range"
              min="16"
              max="100"
              step="2"
              value={w}
              onChange={(e) => setW(Number(e.target.value))}
              className="mt-2 w-full accent-teal-500"
              data-testid="expand-width-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>عمق المستودع (Depth):</span>
              <span className="font-mono font-bold text-teal-400">{d} متر</span>
            </div>
            <input
              type="range"
              min="12"
              max="80"
              step="2"
              value={d}
              onChange={(e) => setD(Number(e.target.value))}
              className="mt-2 w-full accent-teal-500"
              data-testid="expand-depth-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>ارتفاع السقف (Clear Height):</span>
              <span className="font-mono font-bold text-teal-400">{h} متر</span>
            </div>
            <input
              type="range"
              min="4"
              max="16"
              step="0.5"
              value={h}
              onChange={(e) => setH(Number(e.target.value))}
              className="mt-2 w-full accent-teal-500"
            />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-900/60 p-2">
                <span className="text-slate-400">المساحة الإجمالية</span>
                <p className="mt-1 font-mono text-base font-bold text-white">{area.toLocaleString('ar-YE')} م²</p>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-2">
                <span className="text-slate-400">الحجم التخزيني الإجمالي</span>
                <p className="mt-1 font-mono text-base font-bold text-teal-400">{volume.toLocaleString('ar-YE')} م³</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-4">
          <DaylightButton tone="secondary" onClick={onClose}>إلغاء</DaylightButton>
          <DaylightButton tone="primary" onClick={handleConfirm} data-testid="expand-confirm-btn">
            تطبيق الأبعاد الجديدة
          </DaylightButton>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// 3. نافذة تفصيل مستويات وخانات الرف (Rack & Cell Customizer)
// تدعم التسمية ثنائية اللغة (عربي + إنجليزي) والخانات النصية والرقمية بكل الصيغ
// ========================================================
export function RackCellsModal({
  isOpen,
  onClose,
  rack,
  onUpdateRack,
}: {
  isOpen: boolean;
  onClose: () => void;
  rack: WarehouseLayoutPlacement | null;
  onUpdateRack: (updated: WarehouseLayoutPlacement) => void;
}): React.ReactElement | null {
  const [nameAr, setNameAr] = useState(rack?.nameAr || rack?.name || '');
  const [nameEn, setNameEn] = useState(rack?.nameEn || '');
  const [levels, setLevels] = useState(rack?.levels || 4);
  const [cellsPerLevel, setCellsPerLevel] = useState(rack?.cellsPerLevel || 3);
  const [widthM, setWidthM] = useState(rack?.w || 2.2);
  const [depthM, setDepthM] = useState(rack?.d || 0.9);
  const [heightM, setHeightM] = useState(rack?.h || 3.2);

  // الخانات بصيغها النصية والرقمية المتنوعة
  const [cells, setCells] = useState<RackCell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [cellCodeInput, setCellCodeInput] = useState('');
  const [cellOccupied, setCellOccupied] = useState(false);
  const [formatPreset, setFormatPreset] = useState<'ALPHANUMERIC' | 'NUMERIC' | 'TIER_SLOT' | 'PHARMA_COLD' | 'CUSTOM_TEXT'>('ALPHANUMERIC');

  const rackId = rack?.id;
  useEffect(() => {
    if (!isOpen || !rack) return;
    setNameAr(rack.nameAr || rack.name || '');
    setNameEn(rack.nameEn || '');
    const l = rack.levels || 4;
    const c = rack.cellsPerLevel || 3;
    setLevels(l);
    setCellsPerLevel(c);
    setWidthM(rack.w || 2.2);
    setDepthM(rack.d || 0.9);
    setHeightM(rack.h || 3.2);

    if (rack.customCells && rack.customCells.length > 0) {
      setCells(rack.customCells);
      setSelectedCellId(rack.customCells[0]?.id || null);
      setCellCodeInput(rack.customCells[0]?.code || '');
      setCellOccupied(Boolean(rack.customCells[0]?.occupied));
    } else {
      const gen: RackCell[] = [];
      for (let lvl = 1; lvl <= l; lvl++) {
        for (let s = 1; s <= c; s++) {
          const code = `${String.fromCharCode(64 + lvl)}-${String(s).padStart(2, '0')}`;
          gen.push({
            id: `cell-${lvl}-${s}`,
            code,
            level: lvl,
            slot: s,
            occupied: false,
            formatType: 'ALPHANUMERIC',
          });
        }
      }
      setCells(gen);
      setSelectedCellId(gen[0]?.id || null);
      setCellCodeInput(gen[0]?.code || '');
      setCellOccupied(false);
    }
  }, [isOpen, rackId]);

  if (!isOpen || !rack) return null;

  const totalPositions = levels * cellsPerLevel;

  // توليد مصفوفة الخانات بناء على النمط المختار
  const applyPresetFormat = (preset: typeof formatPreset) => {
    setFormatPreset(preset);
    const updated: RackCell[] = [];
    for (let lvl = 1; lvl <= levels; lvl++) {
      for (let s = 1; s <= cellsPerLevel; s++) {
        let code = '';
        if (preset === 'NUMERIC') {
          code = `${String(lvl).padStart(2, '0')}.${String(s).padStart(2, '0')}`;
        } else if (preset === 'ALPHANUMERIC') {
          code = `${String.fromCharCode(64 + lvl)}-${String(s).padStart(2, '0')}`;
        } else if (preset === 'TIER_SLOT') {
          code = `L${lvl}-S${s}`;
        } else if (preset === 'PHARMA_COLD') {
          code = `COLD-${lvl}0${s}`;
        } else {
          code = `خزينة-${lvl}-${s}`;
        }
        updated.push({
          id: `cell-${lvl}-${s}`,
          code,
          level: lvl,
          slot: s,
          occupied: false,
          formatType: preset === 'NUMERIC' ? 'NUMERIC' : preset === 'CUSTOM_TEXT' ? 'CUSTOM' : 'ALPHANUMERIC',
        });
      }
    }
    setCells(updated);
    if (updated[0]) {
      setSelectedCellId(updated[0].id);
      setCellCodeInput(updated[0].code);
      setCellOccupied(false);
    }
  };

  const handleSelectCell = (c: RackCell) => {
    setSelectedCellId(c.id);
    setCellCodeInput(c.code);
    setCellOccupied(Boolean(c.occupied));
  };

  const handleUpdateCellCode = (newVal: string) => {
    setCellCodeInput(newVal);
    setCells((prev) =>
      prev.map((c) => (c.id === selectedCellId ? { ...c, code: newVal } : c)),
    );
  };

  const handleToggleOccupied = () => {
    const next = !cellOccupied;
    setCellOccupied(next);
    setCells((prev) =>
      prev.map((c) => (c.id === selectedCellId ? { ...c, occupied: next } : c)),
    );
  };

  const handleConfirm = () => {
    onUpdateRack({
      ...rack,
      name: nameAr.trim() || rack.name,
      nameAr: nameAr.trim() || rack.name,
      nameEn: nameEn.trim() || undefined,
      levels,
      cellsPerLevel,
      customCells: cells,
      w: widthM,
      d: depthM,
      h: heightM,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" data-testid="layout-rack-cells-modal">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
              <Boxes className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">تفصيل خانات وأبعاد الرف (ثنائي اللغة وتسميات الخانات)</h3>
              <p className="text-xs text-slate-400 font-mono">{rack.code} — {nameAr || rack.name} {nameEn ? `(${nameEn})` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* التسمية ثنائية اللغة */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-3">
            <h4 className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
              <span>🏷️</span> تسمية الرف بالعربية والإنجليزية (Bilingual Rack Naming)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">الاسم بالعربية (Arabic Name)</label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none"
                  placeholder="مثال: رف المحاليل والمضادات أ-01"
                  data-testid="rack-name-ar-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">الاسم بالإنجليزية (English Name)</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                  placeholder="e.g. Solutions Rack A-01"
                  data-testid="rack-name-en-input"
                />
              </div>
            </div>
          </div>

          {/* الأبعاد والمستويات */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">عدد المستويات الرأسية (Tiers)</label>
              <input
                type="number"
                min="1"
                max="8"
                value={levels}
                onChange={(e) => setLevels(Math.max(1, Math.min(8, Number(e.target.value))))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none font-mono"
                data-testid="rack-levels-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">خانات/فتحات لكل مستوى (Bins/Level)</label>
              <input
                type="number"
                min="1"
                max="8"
                value={cellsPerLevel}
                onChange={(e) => setCellsPerLevel(Math.max(1, Math.min(8, Number(e.target.value))))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none font-mono"
                data-testid="rack-cells-per-level-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">عرض الرف (م)</label>
              <input
                type="number"
                step="0.2"
                min="1.0"
                max="6.0"
                value={widthM}
                onChange={(e) => setWidthM(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">عمق الرف (م)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="2.5"
                value={depthM}
                onChange={(e) => setDepthM(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">الارتفاع (م)</label>
              <input
                type="number"
                step="0.2"
                min="1.5"
                max="10.0"
                value={heightM}
                onChange={(e) => setHeightM(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* أنماط وصيغ تسمية الخانات (نصية ورقمية بكل الصيغ) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <span>🔢</span> أنماط تسمية الخانات (Textual & Numeric Formats)
              </h4>
              <span className="text-[11px] text-slate-400">إجمالي {totalPositions} خانة تخزين</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'ALPHANUMERIC', label: 'أبجدي رقمي (A-01)' },
                { id: 'NUMERIC', label: 'رقمي متسلسل (01.01)' },
                { id: 'TIER_SLOT', label: 'طابق وفتحة (L1-S1)' },
                { id: 'PHARMA_COLD', label: 'تبريد وحجر (COLD-01)' },
                { id: 'CUSTOM_TEXT', label: 'نصي حر (خزينة-1)' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPresetFormat(p.id as typeof formatPreset)}
                  className={`rounded-lg p-2 text-center text-[10px] font-semibold transition ${
                    formatPreset === p.id
                      ? 'border border-teal-500 bg-teal-500/20 text-teal-300'
                      : 'border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-850'
                  }`}
                  data-testid={`rack-cell-format-preset-${p.id}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* محرر الخانة المحددة يدوياً */}
            {selectedCellId && (
              <div className="flex items-center gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 p-2 text-xs">
                <span className="font-bold text-teal-300">تعديل الخانة المحددة:</span>
                <input
                  type="text"
                  value={cellCodeInput}
                  onChange={(e) => handleUpdateCellCode(e.target.value)}
                  className="rounded border border-slate-700 bg-slate-850 px-2.5 py-1 text-xs text-white focus:border-teal-400 focus:outline-none font-mono"
                  placeholder="اكتب أي صيغة نصية أو رقمية..."
                  data-testid="cell-code-input"
                />
                <button
                  type="button"
                  onClick={handleToggleOccupied}
                  className={`rounded px-2 py-1 text-[11px] font-bold transition ${
                    cellOccupied ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {cellOccupied ? 'مشغولة بدواء' : 'فارغة'}
                </button>
              </div>
            )}

            {/* مصفوفة الخانات التفاعلية */}
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2.5 space-y-1.5">
              {Array.from({ length: levels }).map((_, lIdx) => {
                const lvlNum = levels - lIdx; // من الأعلى للأسفل
                const rowCells = cells.filter((c) => String(c.level) === String(lvlNum));
                return (
                  <div key={lvlNum} className="flex items-center gap-1.5">
                    <span className="w-12 text-center font-mono text-[11px] font-bold text-slate-500">
                      L{String(lvlNum).padStart(2, '0')}
                    </span>
                    <div
                      className="grid flex-1 gap-1.5"
                      style={{ gridTemplateColumns: `repeat(${cellsPerLevel}, 1fr)` }}
                    >
                      {Array.from({ length: cellsPerLevel }).map((__, cIdx) => {
                        const cell: RackCell = rowCells[cIdx] || {
                          id: `cell-${lvlNum}-${cIdx + 1}`,
                          code: `C${cIdx + 1}`,
                          level: lvlNum,
                          slot: cIdx + 1,
                          occupied: false,
                        };
                        const isSel = selectedCellId === cell.id;
                        return (
                          <div
                            key={cell.id}
                            onClick={() => handleSelectCell(cell)}
                            className={`cursor-pointer rounded border py-1 px-1 text-center font-mono text-[10px] transition ${
                              isSel
                                ? 'border-teal-400 bg-teal-500/30 text-white font-bold ring-1 ring-teal-400'
                                : cell.occupied
                                  ? 'border-amber-700/60 bg-amber-950/40 text-amber-300'
                                  : 'border-slate-800 bg-slate-900/90 text-teal-300 hover:border-slate-700'
                            }`}
                          >
                            <span className="truncate block">{cell.code}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-4">
          <DaylightButton tone="secondary" onClick={onClose}>إلغاء</DaylightButton>
          <DaylightButton tone="primary" onClick={handleConfirm} data-testid="rack-cells-confirm-btn">
            حفظ إعدادات الرف والخانات
          </DaylightButton>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// 4. نافذة التحكم بصلاحيات الرؤية لموظفي ياسين والنشر المعتمد
// ========================================================
export function StaffVisibilityPublishModal({
  isOpen,
  onClose,
  currentVersion,
  onPublish,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: number;
  onPublish: (visibility: { visibleToAll: boolean; allowedUserIds: string[]; allowedRoles: string[] }, notes: string) => void;
}): React.ReactElement | null {
  const [visibleToAll, setVisibleToAll] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([
    'usr-yassin',
    'usr-ashraf',
    'usr-fadi',
    'usr-faisal',
    'usr-awami',
  ]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([
    'WAREHOUSE_OWNER',
    'WAREHOUSE_MANAGER',
    'PICKER',
    'INVENTORY_CONTROLLER',
  ]);
  const [notes, setNotes] = useState('اعتماد المخطط الهيكلي المحدث ثلاثي الأبعاد وتثبيت مسارات السحب');

  if (!isOpen) return null;

  const staffOptions = [
    { id: 'usr-yassin', name: 'د. ياسين فضل عبدالله', role: 'مدير المستودعات والمالك' },
    { id: 'usr-ashraf', name: 'أشرف الجلال', role: 'مدير العمليات المخزنية' },
    { id: 'usr-fadi', name: 'فادي القدسي', role: 'مشرف التجهيز والاستلام' },
    { id: 'usr-faisal', name: 'فيصل قائد', role: 'مسؤول التسكين والرفوف' },
    { id: 'usr-awami', name: 'أحمد العوامي', role: 'أمين مخزن رئيسي' },
    { id: 'usr-marai', name: 'محمد مرعي', role: 'مراقب جودة وسلسلة التبريد' },
    { id: 'usr-rafat', name: 'رأفت هزاع', role: 'محضر طلبيات وفاحص' },
  ];

  const roleOptions = [
    { id: 'WAREHOUSE_OWNER', label: 'مالك ومدير المستودع' },
    { id: 'WAREHOUSE_MANAGER', label: 'إدارة المستودعات والعمليات' },
    { id: 'PICKER', label: 'فرق السحب والتجهيز' },
    { id: 'INVENTORY_CONTROLLER', label: 'مراقبو الجرد والضبط' },
  ];

  const toggleStaff = (id: string) => {
    setSelectedStaff((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleRole = (id: string) => {
    setSelectedRoles((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const handleConfirm = () => {
    onPublish(
      {
        visibleToAll,
        allowedUserIds: selectedStaff,
        allowedRoles: selectedRoles,
      },
      notes.trim(),
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" data-testid="layout-publish-modal">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">نشر التخطيط وإدارة صلاحيات الرؤية لموظفي ياسين</h3>
              <p className="text-xs text-slate-400">الإصدار v{currentVersion + 1} — بإشراف د. ياسين فضل عبدالله</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* خيار الرؤية العامة أو المقيدة */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleToAll}
                onChange={(e) => setVisibleToAll(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 text-teal-500 focus:ring-teal-500 accent-teal-500"
                data-testid="visibility-all-checkbox"
              />
              <div>
                <span className="text-sm font-semibold text-white">إتاحة المخطط لجميع موظفي المستودع المرخصين</span>
                <p className="text-xs text-slate-400">عند إلغاء التحديد، يقتصر ظهور المخطط على الموظفين المحددين أدناه فقط.</p>
              </div>
            </label>
          </div>

          {!visibleToAll && (
            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-300">تحديد الموظفين المصرح لهم بالرؤية:</label>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2 space-y-1">
                  {staffOptions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => toggleStaff(s.id)}
                      className={`flex items-center justify-between rounded-lg p-2 text-xs transition cursor-pointer ${
                        selectedStaff.includes(s.id) ? 'bg-teal-500/10 text-teal-300 border border-teal-500/40' : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-white">{s.name}</span>
                        <span className="mr-2 text-slate-400">({s.role})</span>
                      </div>
                      {selectedStaff.includes(s.id) && <Check className="h-4 w-4 text-teal-400" />}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-300">أدوار الصلاحيات المصرح لها:</label>
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={`rounded-lg border p-2 text-right text-xs transition ${
                        selectedRoles.includes(r.id) ? 'border-teal-500 bg-teal-500/10 text-teal-300' : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-slate-400">ملاحظات الإصدار والاعتماد</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-xs text-white focus:border-teal-500 focus:outline-none"
              placeholder="اكتب ملاحظة توثيقية للإصدار المنشور..."
              data-testid="publish-notes-input"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-4">
          <DaylightButton tone="secondary" onClick={onClose}>إلغاء</DaylightButton>
          <DaylightButton tone="primary" onClick={handleConfirm} data-testid="publish-confirm-btn">
            اعتماد ونشر الإصدار الحقيقي
          </DaylightButton>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// 5. القائمة السياقية للماوس في واجهة د. ياسين (Desktop Context Menu)
// تدعم النقر بالزر الأيمن على الرفوف، العناصر المعمارية، وأرضية المستودع
// ========================================================
export function DesktopContextMenu({
  state,
  onClose,
  onEditRack,
  onRackCells,
  onRotateRack,
  onDuplicateRack,
  onAssignTask,
  onPrintLabel,
  onUnassignRack,
  onDeleteRack,
  onEditElement,
  onRotateElement,
  onDeleteElement,
  onAddRackAt,
  onAddDoorAt,
  onAddPillarAt,
  onAddZoneAt,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onEditRack: (id: string) => void;
  onRackCells: (id: string) => void;
  onRotateRack: (id: string) => void;
  onDuplicateRack: (id: string) => void;
  onAssignTask: (id: string) => void;
  onPrintLabel: (id: string) => void;
  onUnassignRack: (id: string) => void;
  onDeleteRack: (id: string) => void;
  onEditElement: (id: string) => void;
  onRotateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onAddRackAt: (x: number, z: number) => void;
  onAddDoorAt: (x: number, z: number) => void;
  onAddPillarAt: (x: number, z: number) => void;
  onAddZoneAt: (x: number, z: number) => void;
}): React.ReactElement | null {
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-testid="desktop-context-menu"]')) {
        onClose();
      }
    };
    if (state.isOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [state.isOpen, onClose]);

  if (!state.isOpen) return null;

  const wx = state.worldX ?? 5.0;
  const wz = state.worldZ ?? 5.0;
  const top = Math.max(10, Math.min(window.innerHeight - 340, state.y));
  const left = Math.max(10, Math.min(window.innerWidth - 260, state.x));

  return (
    <div
      className="fixed z-50 min-w-[220px] rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 text-xs text-slate-100 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      style={{ top, left }}
      data-testid="desktop-context-menu"
    >
      {state.targetType === 'RACK' && state.targetId && (
        <div className="space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-bold text-teal-400 border-b border-slate-800">
            تحكم الرف الفوري (Mouse Actions)
          </div>
          <button
            type="button"
            onClick={() => { onEditRack(state.targetId!); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
            data-testid="ctx-edit-rack"
          >
            <Edit3 className="h-3.5 w-3.5 text-teal-400" />
            <span>تعديل بيانات الرف (عربي / إنجليزي)</span>
          </button>
          <button
            type="button"
            onClick={() => { onRackCells(state.targetId!); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
            data-testid="ctx-cells-rack"
          >
            <Boxes className="h-3.5 w-3.5 text-blue-400" />
            <span>تفصيل الخانات (نصية ورقمية)</span>
          </button>
          <button
            type="button"
            onClick={() => { onRotateRack(state.targetId!); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
            data-testid="ctx-rotate-rack"
          >
            <RotateCw className="h-3.5 w-3.5 text-amber-400" />
            <span>تدوير الرف 90 درجة</span>
          </button>
          <button
            type="button"
            onClick={() => { onDuplicateRack(state.targetId!); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
            data-testid="ctx-duplicate-rack"
          >
            <Copy className="h-3.5 w-3.5 text-purple-400" />
            <span>نسخ وتكرار الرف</span>
          </button>
          <button
            type="button"
            onClick={() => { onAssignTask(state.targetId!); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
            data-testid="ctx-task-rack"
          >
            <FileCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>إسناد مهمة للمشرف أشرف</span>
          </button>
          <button
            type="button"
            onClick={() => { onPrintLabel(state.targetId!); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
            data-testid="ctx-print-rack"
          >
            <Printer className="h-3.5 w-3.5 text-sky-400" />
            <span>طباعة ملصق الباركود و QR</span>
          </button>
          <div className="my-1 border-t border-slate-800" />
          <button
            type="button"
            onClick={() => { onUnassignRack(state.targetId!); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right text-amber-300 hover:bg-amber-950/40"
            data-testid="ctx-unassign-rack"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            <span>إلغاء التثبيت للصينية</span>
          </button>
          <button
            type="button"
            onClick={() => { onDeleteRack(state.targetId!); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right text-rose-400 hover:bg-rose-950/40"
            data-testid="ctx-delete-rack"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>حذف الرف نهائياً</span>
          </button>
        </div>
      )}

      {state.targetType === 'ELEMENT' && state.targetId && (
        <div className="space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-bold text-teal-400 border-b border-slate-800">
            تحكم العنصر المعماري
          </div>
          <button
            type="button"
            onClick={() => { onEditElement(state.targetId!); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
            data-testid="ctx-edit-element"
          >
            <Edit3 className="h-3.5 w-3.5 text-teal-400" />
            <span>تعديل أبعاد وموقع العنصر</span>
          </button>
          <button
            type="button"
            onClick={() => { onRotateElement(state.targetId!); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
            data-testid="ctx-rotate-element"
          >
            <RotateCw className="h-3.5 w-3.5 text-amber-400" />
            <span>تدوير العنصر 90 درجة</span>
          </button>
          <div className="my-1 border-t border-slate-800" />
          <button
            type="button"
            onClick={() => { onDeleteElement(state.targetId!); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right text-rose-400 hover:bg-rose-950/40"
            data-testid="ctx-delete-element"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>حذف العنصر المعماري</span>
          </button>
        </div>
      )}

      {state.targetType === 'FLOOR' && (
        <div className="space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-bold text-teal-400 border-b border-slate-800">
            إضافة سريعة في موضع النقر ({wx.toFixed(1)}م × {wz.toFixed(1)}م)
          </div>
          <button
            type="button"
            onClick={() => { onAddRackAt(wx, wz); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
            data-testid="ctx-add-rack-here"
          >
            <Boxes className="h-3.5 w-3.5 text-teal-400" />
            <span>إضافة رف أدوية جديد هنا</span>
          </button>
          <button
            type="button"
            onClick={() => { onAddDoorAt(wx, wz); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
            data-testid="ctx-add-door-here"
          >
            <DoorOpen className="h-3.5 w-3.5 text-blue-400" />
            <span>إضافة بوابة أو رصيف شحن</span>
          </button>
          <button
            type="button"
            onClick={() => { onAddPillarAt(wx, wz); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
            data-testid="ctx-add-pillar-here"
          >
            <Layers className="h-3.5 w-3.5 text-amber-400" />
            <span>إضافة عمود إنشائي</span>
          </button>
          <button
            type="button"
            onClick={() => { onAddZoneAt(wx, wz); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
            data-testid="ctx-add-zone-here"
          >
            <Maximize className="h-3.5 w-3.5 text-cyan-400" />
            <span>إضافة غرفة تبريد / حجر صحي</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ========================================================
// 6. القائمة الشعاعية باللمس للمشرف أشرف (Ashraf Touch Radial Menu)
// تظهر فورياً عند اللمس المطول (Long-Press) على أي رف أو خانة
// ========================================================
export function AshrafTouchRadialMenu({
  isOpen,
  x,
  y,
  rack,
  onClose,
  onEdit,
  onCells,
  onPhoto,
  onScan,
  onRotate,
  onDone,
}: {
  isOpen: boolean;
  x: number;
  y: number;
  rack: WarehouseLayoutPlacement | null;
  onClose: () => void;
  onEdit: () => void;
  onCells: () => void;
  onPhoto: () => void;
  onScan: () => void;
  onRotate: () => void;
  onDone: () => void;
}): React.ReactElement | null {
  if (!isOpen || !rack) return null;

  const top = Math.max(20, Math.min(window.innerHeight - 280, y - 100));
  const left = Math.max(20, Math.min(window.innerWidth - 280, x - 100));

  return (
    <div
      className="fixed z-50 rounded-2xl border-2 border-teal-500/60 bg-slate-900/95 p-3 text-white shadow-2xl backdrop-blur-lg animate-in zoom-in-90 duration-150"
      style={{ top, left }}
      data-testid="ashraf-touch-radial-menu"
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div>
          <span className="font-mono font-bold text-xs text-teal-300">{rack.code}</span>
          <p className="text-[10px] text-slate-400">{rack.nameAr || rack.name}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          data-testid="touch-radial-close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => { onEdit(); onClose(); }}
          className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-850 p-2.5 text-[11px] font-bold text-teal-300 hover:bg-teal-500/20 active:scale-95 transition"
          data-testid="touch-radial-edit"
        >
          <Edit3 className="h-5 w-5 mb-1 text-teal-400" />
          <span>تعديل</span>
        </button>
        <button
          type="button"
          onClick={() => { onCells(); onClose(); }}
          className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-850 p-2.5 text-[11px] font-bold text-blue-300 hover:bg-blue-500/20 active:scale-95 transition"
          data-testid="touch-radial-cells"
        >
          <Boxes className="h-5 w-5 mb-1 text-blue-400" />
          <span>خانات</span>
        </button>
        <button
          type="button"
          onClick={() => { onPhoto(); onClose(); }}
          className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-850 p-2.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition"
          data-testid="touch-radial-photo"
        >
          <Camera className="h-5 w-5 mb-1 text-emerald-400" />
          <span>تصوير</span>
        </button>
        <button
          type="button"
          onClick={() => { onScan(); onClose(); }}
          className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-850 p-2.5 text-[11px] font-bold text-sky-300 hover:bg-sky-500/20 active:scale-95 transition"
          data-testid="touch-radial-scan"
        >
          <Scan className="h-5 w-5 mb-1 text-sky-400" />
          <span>باركود</span>
        </button>
        <button
          type="button"
          onClick={() => { onRotate(); onClose(); }}
          className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-850 p-2.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 active:scale-95 transition"
          data-testid="touch-radial-rotate"
        >
          <RotateCw className="h-5 w-5 mb-1 text-amber-400" />
          <span>تدوير</span>
        </button>
        <button
          type="button"
          onClick={() => { onDone(); onClose(); }}
          className="flex flex-col items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-2.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30 active:scale-95 transition"
          data-testid="touch-radial-done"
        >
          <CheckCircle2 className="h-5 w-5 mb-1 text-emerald-400" />
          <span>إتمام</span>
        </button>
      </div>
    </div>
  );
}

// ========================================================
// 7. لوحة التحكم السفلية باللمس لمشرف الترتيب أشرف (Ashraf Touch Bottom Sheet)
// مخصصة للهواتف والأجهزة اللوحية: توثيق بالكاميرا، مسح الباركود، التسميات، والخانات
// ========================================================
export function AshrafTouchBottomSheet({
  isOpen,
  rack,
  onClose,
  onUpdateRack,
  onUploadPhoto,
  onCompleteArrangement,
}: {
  isOpen: boolean;
  rack: WarehouseLayoutPlacement | null;
  onClose: () => void;
  onUpdateRack: (updated: WarehouseLayoutPlacement) => void;
  onUploadPhoto: (photoBase64: string, note?: string) => Promise<void>;
  onCompleteArrangement: () => Promise<void>;
}): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<'cells' | 'photo' | 'scan' | 'complete'>('cells');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [photoNote, setPhotoNote] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rackId = rack?.id;
  useEffect(() => {
    if (!isOpen || !rack) return;
    setNameAr(rack.nameAr || rack.name || '');
    setNameEn(rack.nameEn || '');
    setCapturedPhoto(null);
    setFlashMsg(null);
  }, [isOpen, rackId]);

  if (!isOpen || !rack) return null;

  const handleSaveNames = () => {
    onUpdateRack({
      ...rack,
      name: nameAr.trim() || rack.name,
      nameAr: nameAr.trim() || rack.name,
      nameEn: nameEn.trim() || undefined,
    });
    setFlashMsg('تم حفظ التسميات ثنائية اللغة بنجاح');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setCapturedPhoto(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPhotoSubmit = async () => {
    if (!capturedPhoto || uploading) return;
    setUploading(true);
    try {
      await onUploadPhoto(capturedPhoto, photoNote);
      setFlashMsg('تم رفع وتوثيق صورة الرف بنجاح');
      setCapturedPhoto(null);
      setPhotoNote('');
    } catch {
      setFlashMsg('تعذر رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleCompleteSubmit = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      await onCompleteArrangement();
      setFlashMsg('تم توثيق اكتمال ترتيب الرف بنجاح');
    } catch {
      setFlashMsg('تعذر توثيق إتمام المهمة');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t-2 border-teal-500/50 bg-slate-900/98 p-4 text-white shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-200"
      style={{ maxHeight: '85vh', overflowY: 'auto' }}
      data-testid="ashraf-touch-bottom-sheet"
    >
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-700" />

      {/* الرأس: كود الرف والتسمية */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400">
            <Smartphone className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-teal-300">{rack.code}</span>
              <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[10px] font-bold text-teal-300">
                مشرف الترتيب: أشرف
              </span>
            </div>
            <p className="text-xs text-slate-400">{nameAr || rack.name} {nameEn ? `(${nameEn})` : ''}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          data-testid="touch-sheet-close-btn"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {flashMsg && (
        <div className="mt-2 rounded-lg bg-teal-500/20 border border-teal-500/40 p-2 text-center text-xs font-bold text-teal-300">
          {flashMsg}
        </div>
      )}

      {/* أزرار التبويبات باللمس (Touch Tabs) */}
      <div className="mt-3 grid grid-cols-4 gap-1.5 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('cells')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
            activeTab === 'cells' ? 'bg-teal-500 text-slate-950 shadow-md' : 'bg-slate-800/80 text-slate-300'
          }`}
          data-testid="touch-tab-cells"
        >
          <Boxes className="h-4 w-4" />
          <span>الخانات</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('photo')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
            activeTab === 'photo' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-800/80 text-slate-300'
          }`}
          data-testid="touch-tab-photo"
        >
          <Camera className="h-4 w-4" />
          <span>توثيق صورة</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
            activeTab === 'scan' ? 'bg-sky-500 text-slate-950 shadow-md' : 'bg-slate-800/80 text-slate-300'
          }`}
          data-testid="touch-tab-scan"
        >
          <Scan className="h-4 w-4" />
          <span>مسح باركود</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('complete')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
            activeTab === 'complete' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-800/80 text-slate-300'
          }`}
          data-testid="touch-tab-complete"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>إتمام المهمة</span>
        </button>
      </div>

      {/* محتوى التبويب */}
      <div className="mt-3">
        {activeTab === 'cells' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">الاسم بالعربية</label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                  data-testid="touch-rack-name-ar"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">English Name</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-teal-400 focus:outline-none font-mono"
                  data-testid="touch-rack-name-en"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveNames}
              className="w-full rounded-xl bg-teal-600 py-2 text-xs font-bold text-white hover:bg-teal-500 active:scale-98 transition"
              data-testid="touch-save-names-btn"
            >
              حفظ التسمية ثنائية اللغة
            </button>

            {/* معاينة شبكة الخانات باللمس */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
              <span className="block text-[11px] font-bold text-slate-400 mb-2">
                الخانات المتوفرة بالرف (المس أي خانة للتبديل):
              </span>
              <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto">
                {(rack.customCells && rack.customCells.length > 0
                  ? rack.customCells
                  : Array.from({ length: (rack.levels || 4) * (rack.cellsPerLevel || 3) }).map((_, idx) => ({
                      id: `c-${idx}`,
                      code: `BIN-${idx + 1}`,
                      occupied: idx % 3 === 0,
                    }))
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      const updatedCells = (rack.customCells || []).map((x) =>
                        x.id === c.id ? { ...x, occupied: !x.occupied } : x,
                      );
                      onUpdateRack({ ...rack, customCells: updatedCells });
                    }}
                    className={`rounded-lg border p-2 text-center font-mono text-[11px] font-bold transition active:scale-95 ${
                      c.occupied
                        ? 'border-amber-600 bg-amber-950/40 text-amber-300'
                        : 'border-slate-800 bg-slate-900 text-teal-300 hover:border-teal-500'
                    }`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'photo' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              التقط صورة واقعية للرف بكاميرا الجوال أو ارفع صورة لتوثيق الترتيب الفعلي ومطابقته بالمخطط.
            </p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {capturedPhoto ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-48">
                <img src={capturedPhoto} alt="Captured Shelf" className="w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCapturedPhoto(null)}
                  className="absolute top-2 right-2 rounded-full bg-slate-900/80 p-1 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-500/40 bg-slate-950/60 p-6 text-teal-300 hover:border-teal-400 active:scale-98 transition"
                data-testid="touch-capture-photo-btn"
              >
                <Camera className="h-8 w-8 text-teal-400" />
                <span className="text-xs font-bold">التقاط صورة بكاميرا الجوال أو رفع ملف</span>
              </button>
            )}

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">ملاحظة مشرف الترتيب أشرف</label>
              <input
                type="text"
                value={photoNote}
                onChange={(e) => setPhotoNote(e.target.value)}
                placeholder="اكتب ملاحظة حول نظافة الرف أو ترتيب العبوات..."
                className="w-full rounded-lg border border-slate-700 bg-slate-850 px-3 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                data-testid="touch-photo-note-input"
              />
            </div>

            <button
              type="button"
              onClick={handleUploadPhotoSubmit}
              disabled={!capturedPhoto || uploading}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 active:scale-98 transition disabled:opacity-50"
              data-testid="touch-upload-photo-btn"
            >
              {uploading ? 'جاري رفع وحفظ الصورة...' : 'رفع وحفظ صورة التوثيق في النظام'}
            </button>
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-sky-500/50 bg-sky-950/20 text-sky-400">
              <Scan className="h-12 w-12 animate-pulse" />
            </div>
            <p className="text-xs text-slate-300 font-semibold">
              مسح باركود الرف للتحقق من التسكين الصحيح
            </p>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
              <span className="text-slate-400">الباركود المتوقع للرف:</span>
              <strong className="block text-sm font-mono text-teal-300 mt-1">{rack.code}</strong>
            </div>
            <button
              type="button"
              onClick={() => setFlashMsg(`تم مسح الباركود بنجاح: ${rack.code} — مطابق 100%`)}
              className="w-full rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white hover:bg-sky-500 active:scale-98 transition"
              data-testid="touch-barcode-scan-btn"
            >
              بدء مسح الباركود بالكاميرا
            </button>
          </div>
        )}

        {activeTab === 'complete' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
              <h4 className="text-sm font-bold text-white">تأكيد اكتمال ترتيب وتسكين الرف</h4>
              <p className="text-xs text-slate-400 mt-1">
                تأكيد جاهزية الرف وتسكين كافة الأدوية وفق التسميات المعتمدة بالعربية والإنجليزية ومزامنتها مع د. ياسين فوراً.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCompleteSubmit}
              disabled={completing}
              className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 active:scale-98 transition disabled:opacity-50"
              data-testid="touch-complete-task-btn"
            >
              {completing ? 'جاري الاعتماد والمزامنة...' : 'تأكيد إتمام الترتيب وحفظ المخطط فورا'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================================
// 6. نافذة دليل اختصارات لوحة المفاتيح والماوس الشاملة
// ========================================================
export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      data-testid="layout-shortcuts-modal"
      dir="rtl"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
              <Compass className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">دليل التحكم الشامل — لوحة المفاتيح والفأرة (DAWA CAD)</h3>
              <p className="text-[11px] text-slate-400">تحكم كامل بكل إعدادات عناصر الخريطة (تحريك، تدوير، تغيير أحجام، وتكرار)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="shortcuts-modal-close-btn"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs max-h-[70vh] overflow-y-auto pe-1">
          {/* تحريك وتدوير العناصر */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <h4 className="font-bold text-teal-400 flex items-center gap-1.5">
              <span>🎯</span> تحريك وتدوير العناصر (Move & Rotate)
            </h4>
            <ul className="space-y-1.5 text-slate-300">
              <li className="flex justify-between items-center">
                <span>تحريك الرف / العنصر (0.5م):</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-teal-300">الأسهم ↑ ↓ ← →</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>تحريك دقيق (0.1م):</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-teal-300">Alt + الأسهم</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>قفزة سريعة (1.0م):</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-teal-300">Shift + الأسهم</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>تدوير 90 درجة مع عقارب الساعة:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-teal-300">R</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>تدوير 90 درجة عكس العقارب:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-teal-300">Shift + R</kbd>
              </li>
            </ul>
          </div>

          {/* تغيير الأحجام والأبعاد */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <h4 className="font-bold text-cyan-400 flex items-center gap-1.5">
              <span>📐</span> تغيير الأحجام والأبعاد (Resize & Scale)
            </h4>
            <ul className="space-y-1.5 text-slate-300">
              <li className="flex justify-between items-center">
                <span>زيادة / إنقاص العرض (Width):</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-cyan-300">[</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-cyan-300">]</kbd>
                </div>
              </li>
              <li className="flex justify-between items-center">
                <span>زيادة / إنقاص العمق (Depth):</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-cyan-300">&#123;</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-cyan-300">&#125;</kbd>
                </div>
              </li>
              <li className="flex justify-between items-center">
                <span>زيادة / إنقاص الارتفاع أو المستويات:</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-cyan-300">+</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-cyan-300">-</kbd>
                </div>
              </li>
              <li className="flex justify-between items-center">
                <span>تعديل خانات الرف:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-cyan-300">C أو Enter</kbd>
              </li>
            </ul>
          </div>

          {/* الإجراءات السريعة */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <h4 className="font-bold text-amber-400 flex items-center gap-1.5">
              <span>⚡</span> الإجراءات السريعة (Actions)
            </h4>
            <ul className="space-y-1.5 text-slate-300">
              <li className="flex justify-between items-center">
                <span>تكرار الرف أو العنصر:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-amber-300">Ctrl + D أو D</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>حذف أو إلغاء تثبيت:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-rose-300">Delete / Backspace</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>تعديل الخصائص والتسميات:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-amber-300">E أو نقر مزدوج</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>إلغاء التحديد / إغلاق:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-slate-300">Escape</kbd>
              </li>
            </ul>
          </div>

          {/* تحكم الكاميرا والمشهد */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span>🎥</span> تحكم الكاميرا والمشهد 3D
            </h4>
            <ul className="space-y-1.5 text-slate-300">
              <li className="flex justify-between items-center">
                <span>إزاحة الكاميرا (Pan):</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-emerald-300">WASD أو زر الفأرة الأوسط</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>تدوير زاوية الرؤية (Orbit):</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-emerald-300">Q / E أو سحب الفأرة</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>تكبير / تصغير (Zoom):</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-emerald-300">عجلة الفأرة أو + / -</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>المساقط السريعة:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-emerald-300">1: مجسم | 2: علوي | 3: أمامي | 0: ضبط</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span>محاكاة رحلة الطرد:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-amber-300">المسافة (Space)</kbd>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
          <span>💡 اضغط <strong className="text-teal-400">?</strong> أو <strong className="text-teal-400">K</strong> في أي وقت لفتح هذه اللوحة.</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-teal-600 px-4 py-1.5 font-bold text-white hover:bg-teal-500"
          >
            فهمت، متابعة العمل
          </button>
        </div>
      </div>
    </div>
  );
}


// ========================================================
// 8. نافذة استكشاف موقع الدواء ثلاثية الأبعاد (Medicine Warehouse 3D Map Modal)
// مخصصة لطاقم التجهيز والسحب والجرد (محمد، مرعي، فيصل، العوامي)
// تتيح رؤية الرف والخانة في نموذج ثلاثي الأبعاد واقعي مع المسار الإرشادي
// ========================================================
export interface MedicineWarehouseMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  rackCode: string;
  zone?: string;
  shelf?: string;
  levelVal?: string;
  slotVal?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantityRequested?: number | string;
  workerName?: string;
  orderNumber?: string;
}

export function MedicineWarehouseMapModal({
  isOpen,
  onClose,
  productName,
  rackCode,
  zone = 'A',
  shelf = '1',
  levelVal = '01',
  slotVal = '01',
  batchNumber,
  expiryDate,
  quantityRequested,
  workerName = 'محمد إبراهيم',
  orderNumber,
}: MedicineWarehouseMapModalProps): React.ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState<'DAYLIGHT' | 'DARK'>('DAYLIGHT');

  const cameraState = useRef<CameraState>({
    yaw: -0.55,
    pitch: 0.82,
    zoom: 1.15,
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

  const targetId = 'target-loc-shelf';
  const targetX = 3.5;
  const targetZ = 3.2;

  const placements: WarehouseLayoutPlacement[] = [
    {
      id: targetId,
      code: rackCode || 'WH-MAIN-A1',
      name: productName,
      nameAr: productName,
      nameEn: productName,
      zone: zone || 'A',
      shelf: shelf || '1',
      levelVal: levelVal || '01',
      status: 'APPROVED',
      storageType: 'SHELF',
      px: targetX,
      pz: targetZ,
      levels: 4,
    },
    {
      id: 'rack-neighbor-a2',
      code: 'WH-MAIN-A2',
      name: 'رف مجاور A2',
      zone: 'A',
      shelf: '2',
      levelVal: '01',
      status: 'APPROVED',
      storageType: 'SHELF',
      px: targetX,
      pz: targetZ + 3.2,
      levels: 4,
    },
    {
      id: 'rack-neighbor-b1',
      code: 'WH-MAIN-B1',
      name: 'رف محاليل B1',
      zone: 'B',
      shelf: '1',
      levelVal: '01',
      status: 'APPROVED',
      storageType: 'SHELF',
      px: targetX + 5.0,
      pz: targetZ,
      levels: 4,
    },
    {
      id: 'rack-neighbor-b2',
      code: 'WH-MAIN-B2',
      name: 'رف مسكنات B2',
      zone: 'B',
      shelf: '2',
      levelVal: '01',
      status: 'APPROVED',
      storageType: 'SHELF',
      px: targetX + 5.0,
      pz: targetZ + 3.2,
      levels: 4,
    },
  ];

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const state = cameraState.current;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      state.dirty = true;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = (time: number) => {
      renderWarehouse3DScene({
        ctx,
        canvas,
        state,
        ww: 24,
        wd: 16,
        wh: 8,
        elements: DEFAULT_ARCHITECTURAL_ELEMENTS,
        placements,
        selectedId: targetId,
        selectedType: 'RACK',
        showRoutePath: true,
        selectedRackPos: { x: targetX, z: targetZ },
        journeyStage: null,
        journeyProgress: (Math.sin(time / 600) + 1) / 2,
        simPackagePos: null,
        timeStep: Math.floor(time / 50),
        theme,
      });
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen, theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      cameraState.current.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cameraState.current.dragMoved = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = cameraState.current.ptr.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      cameraState.current.dragMoved += Math.abs(dx) + Math.abs(dy);
      cameraState.current.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (e.buttons === 2 || e.shiftKey) {
        cameraState.current.px += dx;
        cameraState.current.py += dy;
      } else {
        cameraState.current.yaw -= dx * 0.008;
        cameraState.current.pitch = Math.max(0.15, Math.min(1.45, cameraState.current.pitch + dy * 0.008));
      }
      cameraState.current.dirty = true;
    };

    const onPointerUp = (e: PointerEvent) => {
      cameraState.current.ptr.delete(e.pointerId);
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY > 0 ? 0.92 : 1.08;
      cameraState.current.zoom = Math.max(0.5, Math.min(3.5, cameraState.current.zoom * f));
      cameraState.current.dirty = true;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="picking-medicine-map-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col w-full max-w-5xl h-[88vh] rounded-2xl border border-teal-500/40 bg-slate-900 shadow-2xl overflow-hidden text-slate-100">
        {/* شريط العنوان والتحكم العلوي */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  🧭 مستكشف موقع الدواء على خريطة المستودع ثلاثية الأبعاد
                </h3>
                <span className="rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2.5 py-0.5 text-[11px] font-bold">
                  {workerName} · مسار السحب والتجهيز
                </span>
              </div>
              <p className="text-xs text-slate-400">
                رؤية بصرية تفاعلية ثلاثية الأبعاد لموقع الدواء والرف وخانة التخزين مع مسار المشي المباشر
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'DAYLIGHT' ? 'DARK' : 'DAYLIGHT'))}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center gap-1.5"
            >
              {theme === 'DAYLIGHT' ? '☀️ نهاري واقعي' : '🌙 ليلي CAD'}
            </button>
            <button
              type="button"
              onClick={() => {
                cameraState.current.yaw = -0.55;
                cameraState.current.pitch = 0.82;
                cameraState.current.zoom = 1.15;
                cameraState.current.px = 0;
                cameraState.current.py = 0;
                cameraState.current.dirty = true;
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-teal-300"
              title="إعادة ضبط زاوية الكاميرا"
            >
              🔄 ضبط
            </button>
            <button
              type="button"
              data-testid="close-medicine-map-modal-btn"
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* جسم النافذة: الكانفاس ثلاثي الأبعاد + بطاقة تفاصيل الموقع */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* الكانفاس ثلاثي الأبعاد */}
          <div className="relative flex-1 bg-slate-950 min-h-0">
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full block cursor-grab active:cursor-grabbing" />

            {/* شارة الموقع الهدف داخل الكانفاس */}
            <div className="absolute top-3 right-3 z-10 bg-slate-900/90 border border-teal-500/50 backdrop-blur-md rounded-xl p-3 shadow-xl max-w-xs pointer-events-none">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-xs mb-1">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                </span>
                🎯 الهدف المحدد على الخريطة
              </div>
              <div className="text-white font-bold text-sm truncate">{productName}</div>
              <div className="text-emerald-400 font-mono text-xs mt-0.5 font-bold">
                الرف: {rackCode || 'WH-MAIN-A1'} · خانة {slotVal}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>🚶‍♂️ مسار المشي مرسوم باللون الفيروزي على الأرضية</span>
              </div>
            </div>

            {/* أدوات التحكم السريعة أسفل الكانفاس */}
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded-lg p-1 text-xs">
              <span className="text-[10px] text-slate-400 px-1">💡 اسحب بالماوس لتدوير المشهد | عجلة الماوس للتكبير</span>
            </div>
          </div>

          {/* اللوحة الجانبية: تفاصيل بطاقة الدواء والموقع ومسار السحب */}
          <div className="w-80 shrink-0 border-r border-slate-800 bg-slate-900/95 p-4 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              {/* بطاقة الدواء */}
              <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-3.5 space-y-2">
                <div className="text-[11px] text-teal-400 font-bold">💊 الصنف المطلوب تجهيزه</div>
                <div className="text-base font-bold text-white leading-tight">{productName}</div>
                {orderNumber && (
                  <div className="text-[11px] text-slate-400">
                    أمر التحضير: <span className="font-mono font-bold text-slate-200">{orderNumber}</span>
                  </div>
                )}
              </div>

              {/* بطاقة الموقع الجغرافي داخل المستودع */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-3">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>📍</span> إحداثيات الموقع وخانة التخزين
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">كود الرف</span>
                    <span className="font-mono font-bold text-teal-300 text-sm">{rackCode || 'WH-MAIN-A1'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">المنطقة (الممر)</span>
                    <span className="font-mono font-bold text-amber-300 text-sm">Zone {zone}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">رقم الرف</span>
                    <span className="font-mono font-bold text-white text-sm">رف {shelf}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">المستوى / الطبقة</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">مستوى {levelVal}</span>
                  </div>
                </div>

                {/* رقم التشغيلة وتاريخ الانتهاء */}
                {(batchNumber || expiryDate) && (
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2 text-xs space-y-1">
                    {batchNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">التشغيلة:</span>
                        <span className="font-mono font-bold text-slate-200">{batchNumber}</span>
                      </div>
                    )}
                    {expiryDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">الانتهاء (FEFO):</span>
                        <span className="font-mono font-bold text-amber-400">{expiryDate}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* الكمية المطلوبة */}
                {quantityRequested !== undefined && (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-950/30 border border-emerald-500/30 p-2.5 text-xs">
                    <span className="text-emerald-300 font-bold">الكمية المطلوب سحبها:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {quantityRequested} عبوة
                    </span>
                  </div>
                )}
              </div>

              {/* إرشادات السحب */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-300 space-y-1">
                <div className="font-bold text-cyan-400 flex items-center gap-1 text-[11px]">
                  <span>🚶‍♂️</span> مسار المشي الموصى به:
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  انطلق من منطقة التجميع/الاستلام 01 باتجاه الممر <strong className="text-amber-300">{zone}</strong>، ثم توجه إلى الرف <strong className="text-teal-300">{rackCode}</strong> واسحب من المستوى <strong className="text-emerald-300">{levelVal}</strong>.
                </p>
              </div>
            </div>

            {/* زر العودة */}
            <div className="pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-500 transition shadow-lg flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> العودة لشاشة التحضير والسحب
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
