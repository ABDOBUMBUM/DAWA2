/**
 * DAWA 3D Warehouse Engine — Architectural CAD & Shelf Modals
 * Supports bilingual shelf creation, bin customization, warehouse expansion,
 * CAD elements (Doors, Docks, Pillars, Zones), and version publishing.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  DoorOpen,
  Maximize,
  Boxes,
  ShieldCheck,
  Compass,
  Check,
  RotateCw,
  Trash2,
  Copy,
  Printer,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  WarehouseRack,
  RackCell,
  ArchitecturalElement,
  ArchitecturalElementType,
  StorageCondition,
} from '../types/warehouse';

// ========================================================
// 1. Add Rack Modal (Bilingual Arabic / English)
// ========================================================
interface AddRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (rack: Partial<WarehouseRack>) => void;
  defaultZone?: string;
  defaultShelf?: string;
}

export const AddRackModal: React.FC<AddRackModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  defaultZone = 'A',
  defaultShelf = '1',
}) => {
  const [code, setCode] = useState(`WH-MAIN-${defaultZone}${defaultShelf}`);
  const [rackType, setRackType] = useState<'STEEL_INDUSTRIAL' | 'WOODEN_CABINET'>('STEEL_INDUSTRIAL');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [zone, setZone] = useState(defaultZone);
  const [shelf, setShelf] = useState(defaultShelf);
  const [levelVal, setLevelVal] = useState('01');
  const [storageType, setStorageType] = useState<StorageCondition>('ROOM');
  const [levels, setLevels] = useState(4);
  const [cellsPerLevel, setCellsPerLevel] = useState(3);
  const [widthM, setWidthM] = useState(2.4);
  const [depthM, setDepthM] = useState(1.0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    onAdd({
      code: code.trim(),
      name: nameAr.trim() || code.trim(),
      nameAr: nameAr.trim() || undefined,
      nameEn: nameEn.trim() || undefined,
      zone: zone.trim().toUpperCase(),
      shelf: shelf.trim(),
      levelVal: levelVal.trim() || '01',
      rackType,
      storageType,
      levels,
      cellsPerLevel,
      w: widthM,
      d: depthM,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
              <Boxes className="h-5 w-5" />
            </span>
            <h3 className="text-base font-bold text-white">إضافة رف أدوية جديد (Bilingual Rack)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {/* Rack Type Selector */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-bold">نوع التخزين والرف:*</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRackType('STEEL_INDUSTRIAL');
                  setWidthM(2.4);
                  setDepthM(1.0);
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  rackType === 'STEEL_INDUSTRIAL'
                    ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Boxes className="w-4 h-4 text-blue-400" />
                <span>رف فولاذي صناعي (OSHA)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRackType('WOODEN_CABINET');
                  setWidthM(2.2);
                  setDepthM(0.65);
                  setLevels(4);
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  rackType === 'WOODEN_CABINET'
                    ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span>خزانة جدارية خشبية للأدوية</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">رمز الرف (كود الباركود)*</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white font-mono focus:border-teal-500 focus:outline-none"
              placeholder="WH-MAIN-A3"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">الاسم بالعربية (Arabic)</label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white focus:border-teal-500 focus:outline-none"
                placeholder="رف المحاليل والمضادات"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">الاسم بالإنجليزية (English)</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white focus:border-teal-500 focus:outline-none font-mono"
                placeholder="IV Solutions & Antibiotics"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">الممر (Zone)</label>
              <input
                type="text"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-center text-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">الرف (Shelf)</label>
              <input
                type="text"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-center text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">المستوى</label>
              <input
                type="text"
                value={levelVal}
                onChange={(e) => setLevelVal(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-center text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">نوع التخزين والحرارة</label>
              <select
                value={storageType}
                onChange={(e) => setStorageType(e.target.value as StorageCondition)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white"
              >
                <option value="ROOM">🌡️ حرارة الغرفة (15°C - 25°C)</option>
                <option value="COLD">❄️ سلسلة تبريد (2°C - 8°C)</option>
                <option value="QUARANTINE">⚠️ منطقة حجر صحي</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">عدد المستويات الرأسية</label>
              <input
                type="number"
                min={2}
                max={8}
                value={levels}
                onChange={(e) => setLevels(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-center text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg"
            >
              إضافة الرف للمخطط 3D
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ========================================================
// 2. Rack Cells & Multi-Tier Customizer
// ========================================================
interface RackCellsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rack: WarehouseRack | null;
  onSave: (updated: WarehouseRack) => void;
}

export const RackCellsModal: React.FC<RackCellsModalProps> = ({
  isOpen,
  onClose,
  rack,
  onSave,
}) => {
  const [cells, setCells] = useState<RackCell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [cellCode, setCellCode] = useState('');
  const [isOccupied, setIsOccupied] = useState(false);

  useEffect(() => {
    if (!rack || !isOpen) return;
    const l = rack.levels || 4;
    const c = rack.cellsPerLevel || 3;

    if (rack.customCells && rack.customCells.length > 0) {
      setCells(rack.customCells);
      setSelectedCellId(rack.customCells[0]?.id || null);
      setCellCode(rack.customCells[0]?.code || '');
      setIsOccupied(Boolean(rack.customCells[0]?.occupied));
    } else {
      const generated: RackCell[] = [];
      for (let lvl = 1; lvl <= l; lvl++) {
        for (let s = 1; s <= c; s++) {
          generated.push({
            id: `c-${lvl}-${s}`,
            code: `${String.fromCharCode(64 + lvl)}-${String(s).padStart(2, '0')}`,
            level: lvl,
            slot: s,
            occupied: false,
          });
        }
      }
      setCells(generated);
      setSelectedCellId(generated[0]?.id || null);
      setCellCode(generated[0]?.code || '');
      setIsOccupied(false);
    }
  }, [rack, isOpen]);

  if (!isOpen || !rack) return null;

  const applyPreset = (preset: 'ALPHANUMERIC' | 'NUMERIC' | 'TIER_SLOT' | 'COLD' | 'CUSTOM') => {
    const l = rack.levels || 4;
    const c = rack.cellsPerLevel || 3;
    const next: RackCell[] = [];

    for (let lvl = 1; lvl <= l; lvl++) {
      for (let s = 1; s <= c; s++) {
        let codeStr = '';
        if (preset === 'NUMERIC') codeStr = `${String(lvl).padStart(2, '0')}.${String(s).padStart(2, '0')}`;
        else if (preset === 'ALPHANUMERIC') codeStr = `${String.fromCharCode(64 + lvl)}-${String(s).padStart(2, '0')}`;
        else if (preset === 'TIER_SLOT') codeStr = `L${lvl}-S${s}`;
        else if (preset === 'COLD') codeStr = `COLD-${lvl}0${s}`;
        else codeStr = `خزينة-${lvl}-${s}`;

        next.push({
          id: `c-${lvl}-${s}`,
          code: codeStr,
          level: lvl,
          slot: s,
          occupied: false,
        });
      }
    }
    setCells(next);
    if (next[0]) {
      setSelectedCellId(next[0].id);
      setCellCode(next[0].code);
    }
  };

  const handleSave = () => {
    onSave({
      ...rack,
      customCells: cells,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
              <Boxes className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">تفصيل خانات الرف: {rack.code}</h3>
              <p className="text-xs text-slate-400">{rack.nameAr || rack.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preset Format Buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-bold me-2">أنماط الترقيم:</span>
          {[
            { id: 'ALPHANUMERIC', label: 'أبجدي (A-01)' },
            { id: 'NUMERIC', label: 'رقمي (01.01)' },
            { id: 'TIER_SLOT', label: 'طابق وفتحة (L1-S1)' },
            { id: 'COLD', label: 'تبريد (COLD-01)' },
            { id: 'CUSTOM', label: 'نصي حر (خزينة-1)' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id as any)}
              className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Selected Cell Editor */}
        {selectedCellId && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/10 p-2 text-xs">
            <span className="font-bold text-teal-300">تعديل كود الخانة:</span>
            <input
              type="text"
              value={cellCode}
              onChange={(e) => {
                const val = e.target.value;
                setCellCode(val);
                setCells((prev) => prev.map((c) => (c.id === selectedCellId ? { ...c, code: val } : c)));
              }}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-1 font-mono text-white text-xs"
            />
            <button
              type="button"
              onClick={() => {
                const next = !isOccupied;
                setIsOccupied(next);
                setCells((prev) => prev.map((c) => (c.id === selectedCellId ? { ...c, occupied: next } : c)));
              }}
              className={`px-2.5 py-1 rounded text-xs font-bold ${
                isOccupied ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isOccupied ? 'مشغولة بدواء ✓' : 'فارغة'}
            </button>
          </div>
        )}

        {/* Interactive Cell Grid */}
        <div className="mt-3 max-h-52 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
          {Array.from({ length: rack.levels || 4 }).map((_, lIdx) => {
            const lvl = (rack.levels || 4) - lIdx;
            const rowCells = cells.filter((c) => Number(c.level) === lvl);
            return (
              <div key={lvl} className="flex items-center gap-2">
                <span className="w-10 text-center font-mono text-xs font-bold text-slate-500">
                  L{String(lvl).padStart(2, '0')}
                </span>
                <div className="grid flex-1 grid-cols-3 gap-2">
                  {rowCells.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCellId(c.id);
                        setCellCode(c.code);
                        setIsOccupied(Boolean(c.occupied));
                      }}
                      className={`py-1.5 px-2 rounded border text-center font-mono text-xs font-bold transition ${
                        selectedCellId === c.id
                          ? 'border-teal-400 bg-teal-500/30 text-white ring-1 ring-teal-400'
                          : c.occupied
                          ? 'border-amber-600/50 bg-amber-950/40 text-amber-300'
                          : 'border-slate-800 bg-slate-900 text-teal-300 hover:border-slate-700'
                      }`}
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg"
          >
            حفظ إعدادات الخانات
          </button>
        </div>
      </div>
    </div>
  );
};

// ========================================================
// 3. Add Architectural Element Modal (WDA CAD)
// ========================================================
interface AddElementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (element: ArchitecturalElement) => void;
  ww: number;
  wd: number;
}

export const AddElementModal: React.FC<AddElementModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  ww,
  wd,
}) => {
  const [type, setType] = useState<ArchitecturalElementType>('DOOR');
  const [label, setLabel] = useState('رصيف شحن BAY 03');
  const [x, setX] = useState(15.0);
  const [z, setZ] = useState(0.2);
  const [w, setW] = useState(3.4);
  const [d, setD] = useState(0.4);
  const [h, setH] = useState(3.6);

  if (!isOpen) return null;

  const handleTypeSelect = (t: ArchitecturalElementType) => {
    setType(t);
    if (t === 'DOOR') {
      setLabel('رصيف استلام BAY 03');
      setW(3.4);
      setD(0.4);
      setH(3.6);
    } else if (t === 'PILLAR') {
      setLabel('عمود خرساني C3');
      setW(0.6);
      setD(0.6);
      setH(7.5);
    } else if (t === 'WALL') {
      setLabel('قاطع معزول داخلي');
      setW(6.0);
      setD(0.3);
      setH(3.5);
    } else if (t === 'ZONE') {
      setLabel('غرفة تبريد إضافية');
      setW(7.0);
      setD(5.0);
      setH(0.1);
    }
  };

  const handleConfirm = () => {
    onAdd({
      id: `elem-${Date.now()}`,
      type,
      subType: 'CUSTOM',
      label: label.trim() || 'عنصر معماري',
      x,
      z,
      w,
      d,
      h,
      color: type === 'DOOR' ? '#2563eb' : type === 'ZONE' ? '#06b6d4' : '#64748b',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
              <DoorOpen className="h-5 w-5" />
            </span>
            <h3 className="text-base font-bold text-white">إضافة عنصر معماري للمستودع (WDA CAD)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {(['DOOR', 'PILLAR', 'WALL', 'ZONE'] as ArchitecturalElementType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeSelect(t)}
              className={`p-2 rounded-xl text-xs font-bold border transition ${
                type === t ? 'border-teal-400 bg-teal-500/20 text-teal-300' : 'border-slate-800 bg-slate-800/60 text-slate-400'
              }`}
            >
              {t === 'DOOR' && '🚪 باب/رصيف'}
              {t === 'PILLAR' && '🏛️ عمود'}
              {t === 'WALL' && '🧱 جدار'}
              {t === 'ZONE' && '🗺️ منطقة'}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">اسم العنصر</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">الموقع X (م)</label>
              <input
                type="number"
                step="0.5"
                value={x}
                onChange={(e) => setX(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">الموقع Z (م)</label>
              <input
                type="number"
                step="0.5"
                value={z}
                onChange={(e) => setZ(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">العرض W</label>
              <input
                type="number"
                step="0.2"
                value={w}
                onChange={(e) => setW(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">العمق D</label>
              <input
                type="number"
                step="0.2"
                value={d}
                onChange={(e) => setD(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">الارتفاع H</label>
              <input
                type="number"
                step="0.2"
                value={h}
                onChange={(e) => setH(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-white"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg"
          >
            إضافة العنصر
          </button>
        </div>
      </div>
    </div>
  );
};

// ========================================================
// 4. Expand Dimensions Modal (Warehouse Floor CAD)
// ========================================================
interface ExpandDimensionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  widthM: number;
  depthM: number;
  heightM: number;
  onApply: (w: number, d: number, h: number) => void;
}

export const ExpandDimensionsModal: React.FC<ExpandDimensionsModalProps> = ({
  isOpen,
  onClose,
  widthM,
  depthM,
  heightM,
  onApply,
}) => {
  const [w, setW] = useState(widthM);
  const [d, setD] = useState(depthM);
  const [h, setH] = useState(heightM);

  if (!isOpen) return null;

  const area = w * d;
  const volume = area * h;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
              <Maximize className="h-5 w-5" />
            </span>
            <h3 className="text-base font-bold text-white">توسيع أبعاد ومساحة المستودع (WDA Grid)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
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
              className="w-full accent-teal-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
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
              className="w-full accent-teal-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>الارتفاع الصافي (Clear Height):</span>
              <span className="font-mono font-bold text-teal-400">{h} متر</span>
            </div>
            <input
              type="range"
              min="4"
              max="16"
              step="0.5"
              value={h}
              onChange={(e) => setH(Number(e.target.value))}
              className="w-full accent-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
            <div>
              <span className="text-[10px] text-slate-400">المساحة الإجمالية</span>
              <div className="font-mono font-bold text-white text-base mt-0.5">{area} م²</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400">الحجم التخزيني الصافي</span>
              <div className="font-mono font-bold text-teal-400 text-base mt-0.5">{volume.toLocaleString()} م³</div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(w, d, h);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg"
          >
            تطبيق الأبعاد الجديدة
          </button>
        </div>
      </div>
    </div>
  );
};

// ========================================================
// 5. Keyboard & Mouse Shortcuts Guide Modal
// ========================================================
interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
              <Compass className="h-5 w-5" />
            </span>
            <h3 className="text-base font-bold text-white">دليل التحكم الشامل — لوحة المفاتيح والماوس 3D</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
            <h4 className="font-bold text-teal-400">تحريك وتدوير الرفوف</h4>
            <ul className="space-y-1 text-slate-300">
              <li className="flex justify-between">
                <span>تحريك الرف:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-teal-300">الأسهم ↑ ↓ ← →</kbd>
              </li>
              <li className="flex justify-between">
                <span>تدوير 90 درجة:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-teal-300">R</kbd>
              </li>
              <li className="flex justify-between">
                <span>تكرار الرف:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-teal-300">Ctrl + D</kbd>
              </li>
              <li className="flex justify-between">
                <span>حذف الرف المحدد:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-rose-300">Delete</kbd>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
            <h4 className="font-bold text-cyan-400">تغيير الأبعاد والمستويات</h4>
            <ul className="space-y-1 text-slate-300">
              <li className="flex justify-between">
                <span>تغيير العرض:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-cyan-300">[ أو ]</kbd>
              </li>
              <li className="flex justify-between">
                <span>تغيير العمق:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-cyan-300">&#123; أو &#125;</kbd>
              </li>
              <li className="flex justify-between">
                <span>تغيير المستويات:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-cyan-300">+ أو -</kbd>
              </li>
              <li className="flex justify-between">
                <span>إدارة الخانات:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-cyan-300">C</kbd>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
            <h4 className="font-bold text-amber-400">تحكم الكاميرا والمشهد 3D</h4>
            <ul className="space-y-1 text-slate-300">
              <li className="flex justify-between">
                <span>تدوير زاوية الرؤية:</span>
                <span className="text-slate-400">سحب بالزر الأيسر</span>
              </li>
              <li className="flex justify-between">
                <span>إزاحة المشهد (Pan):</span>
                <span className="text-slate-400">سحب بالزر الأيمن أو Shift</span>
              </li>
              <li className="flex justify-between">
                <span>تكبير / تصغير:</span>
                <span className="text-slate-400">عجلة الفأرة (Scroll)</span>
              </li>
              <li className="flex justify-between">
                <span>مساقط الكاميرا:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-amber-300">1: مجسم | 2: علوي | 3: أمامي</kbd>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
            <h4 className="font-bold text-emerald-400">توجيه العامل البشري الحقيقي</h4>
            <ul className="space-y-1 text-slate-300">
              <li className="flex justify-between">
                <span>توجيه العامل لأي موضع:</span>
                <span className="text-slate-400">نقر مباشر على الأرضية</span>
              </li>
              <li className="flex justify-between">
                <span>المشي لرف محدد:</span>
                <span className="text-slate-400">زر "توجيه العامل إلى الرف"</span>
              </li>
              <li className="flex justify-between">
                <span>محاكاة رحلة الطرد:</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-emerald-300">Space</kbd>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold"
          >
            فهمت، متابعة العمل
          </button>
        </div>
      </div>
    </div>
  );
};
