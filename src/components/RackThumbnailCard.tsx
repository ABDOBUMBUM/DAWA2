/**
 * DAWA 3D Warehouse Engine — Front Elevation Visual Rack Thumbnail & Inventory Inspector
 * Displays high-fidelity front elevation of steel industrial racks and wooden wall cabinets,
 * detailing all tiers, slots, medicine badges, batch numbers, and vacant cubbies.
 */

import React, { useState } from 'react';
import {
  WarehouseRack,
  resolveRackCell,
  getCellMedicines,
  WarehouseRackCell,
} from '../types/warehouse';
import {
  X,
  Boxes,
  Layers,
  Thermometer,
  Snowflake,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Pill,
  Sparkles,
  QrCode,
  Edit3,
  Plus,
  Save,
} from 'lucide-react';

interface RackThumbnailCardProps {
  rack: WarehouseRack | null;
  onClose: () => void;
  onSelectCell?: (level: number, slot: number) => void;
  onUpdateRack?: (updated: WarehouseRack) => void;
}

export const RackThumbnailCard: React.FC<RackThumbnailCardProps> = ({
  rack,
  onClose,
  onSelectCell,
  onUpdateRack,
}) => {
  if (!rack) return null;

  const isWooden = rack.rackType === 'WOODEN_CABINET';
  const levels = rack.levels || 4;
  const slots = rack.cellsPerLevel || 3;

  const [editingCell, setEditingCell] = useState<{
    level: number;
    slot: number;
    cell: ReturnType<typeof resolveRackCell>;
  } | null>(null);

  const [prodName, setProdName] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expDate, setExpDate] = useState('');
  const [qty, setQty] = useState(50);
  const [isOccupied, setIsOccupied] = useState(true);

  const handleStartEdit = (level: number, slot: number) => {
    const cell = resolveRackCell(rack, level, slot);
    setEditingCell({ level, slot, cell });
    setProdName(cell.productName || '');
    setBatchNo(cell.batchNumber || '');
    setExpDate(cell.expiryDate || '');
    setQty(cell.quantity || 50);
    setIsOccupied(cell.occupied !== false);
  };

  const handleSaveCell = () => {
    if (!editingCell || !onUpdateRack) return;
    const existing = [...(rack.customCells || [])];
    const idx = existing.findIndex(
      (c) => c.level === editingCell.level && c.slot === editingCell.slot,
    );

    const updatedCellData: WarehouseRackCell = {
      id: `${rack.id}-L${editingCell.level}-S${editingCell.slot}`,
      code: `${rack.shelf || 'A'}${rack.levelVal || '1'}-0${editingCell.level}-0${editingCell.slot}`,
      level: editingCell.level,
      slot: editingCell.slot,
      occupied: isOccupied,
      productName: isOccupied ? prodName.trim() || 'مستحضر دوائي' : '',
      batchNumber: isOccupied ? batchNo.trim() || 'MED-2026-X' : '',
      expiryDate: isOccupied ? expDate || '2028-12-31' : '',
      quantity: isOccupied ? Number(qty) : 0,
      capacity: 100,
      color: isOccupied ? editingCell.cell.color || '#3b82f6' : '#64748b',
    };

    if (idx >= 0) {
      existing[idx] = updatedCellData;
    } else {
      existing.push(updatedCellData);
    }

    onUpdateRack({
      ...rack,
      customCells: existing,
    });

    setEditingCell(null);
  };

  // Calculate statistics
  let totalCells = levels * slots;
  let occupiedCount = 0;
  for (let l = 1; l <= levels; l++) {
    for (let s = 1; s <= slots; s++) {
      const c = resolveRackCell(rack, l, s);
      if (c.occupied !== false) occupiedCount++;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-700/80 bg-slate-900/95 text-slate-100 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${
                isWooden ? 'bg-amber-800/40 text-amber-300 border border-amber-600/40' : 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
              }`}
            >
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-teal-300 text-sm md:text-base">
                  {rack.code}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isWooden ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                  }`}
                >
                  {isWooden ? '🪵 خزانة خشبية جدارية' : '🏗️ رف معدني صناعي'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {occupiedCount}/{totalCells} خانة مشغولة ({Math.round((occupiedCount / totalCells) * 100)}%)
                </span>
              </div>
              <h2 className="text-base md:text-lg font-bold text-white mt-0.5">
                {rack.nameAr || rack.name}
              </h2>
              {rack.nameEn && (
                <p className="text-xs font-mono text-slate-400">{rack.nameEn}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 md:p-6 space-y-6 flex-1">
          {/* Quick Specifications Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 block text-[11px] mb-0.5">الأبعاد الهندسية</span>
              <span className="font-mono font-bold text-teal-300">
                {(rack.w || 2.4).toFixed(1)}م عرض × {(rack.h || 3.8).toFixed(1)}م ارتفاع
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 block text-[11px] mb-0.5">التقسيم الداخلي</span>
              <span className="font-mono font-bold text-cyan-300">
                {levels} طوابق (مستويات) × {slots} خانات
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 block text-[11px] mb-0.5">شرط التخزين المعتمد</span>
              <span className="font-bold flex items-center gap-1 text-emerald-400">
                {rack.storageType === 'COLD' ? (
                  <>
                    <Snowflake className="w-3.5 h-3.5 text-cyan-400" /> تبريد (2-8°C)
                  </>
                ) : rack.storageType === 'QUARANTINE' ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> حجر صحي
                  </>
                ) : (
                  <>
                    <Thermometer className="w-3.5 h-3.5 text-emerald-400" /> حرارة الغرفة (15-25°C)
                  </>
                )}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 block text-[11px] mb-0.5">موقع الإحداثيات</span>
              <span className="font-mono font-bold text-slate-200">
                X: {rack.px.toFixed(1)}م | Z: {rack.pz.toFixed(1)}م
              </span>
            </div>
          </div>

          {/* Front Elevation 2D Blueprint Graphic */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  المسقط الأمامي للرف / الخزانة (Front Elevation Blueprint)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                اضغط على أي خانة لعرضها أو تعديل الدواء بداخلها
              </span>
            </div>

            {/* Visual Rack Framework Container */}
            <div
              className={`p-4 md:p-6 rounded-3xl border shadow-inner relative ${
                isWooden
                  ? 'bg-gradient-to-b from-amber-950/40 via-amber-900/20 to-amber-950/50 border-amber-800/60'
                  : 'bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950 border-slate-700/80'
              }`}
            >
              {/* Outer Rack Frame Header Bar */}
              <div
                className={`h-4 rounded-t-lg mb-3 flex items-center justify-center text-[10px] font-mono font-extrabold uppercase tracking-widest ${
                  isWooden ? 'bg-amber-800 text-amber-200' : 'bg-blue-700 text-white'
                }`}
              >
                {rack.code} — FRONT TOP BEAM
              </div>

              {/* Tiers Grid from Level N down to Level 1 */}
              <div className="space-y-3">
                {Array.from({ length: levels }, (_, idx) => levels - idx).map((levelNum) => (
                  <div key={`level-row-${levelNum}`} className="space-y-1.5">
                    {/* Level Label */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="font-mono font-bold text-slate-400 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-slate-800 text-white font-mono text-[10px] flex items-center justify-center">
                          L{levelNum}
                        </span>
                        طابق {levelNum} {levelNum === levels ? '(الأعلى)' : levelNum === 1 ? '(الأدنى)' : ''}
                      </span>
                    </div>

                    {/* Slots in this level */}
                    <div
                      className="grid gap-2.5"
                      style={{
                        gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))`,
                      }}
                    >
                      {Array.from({ length: slots }, (_, sIdx) => sIdx + 1).map((slotNum) => {
                        const cell = resolveRackCell(rack, levelNum, slotNum);
                        const isOcc = cell.occupied !== false;

                        return (
                          <div
                            key={`cell-${levelNum}-${slotNum}`}
                            onClick={() => {
                              onSelectCell?.(levelNum, slotNum);
                              handleStartEdit(levelNum, slotNum);
                            }}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between min-h-[125px] ${
                              isOcc
                                ? isWooden
                                  ? 'bg-amber-950/70 border-amber-700/70 hover:border-amber-400 hover:shadow-lg'
                                  : 'bg-slate-900/90 border-slate-700 hover:border-teal-400 hover:shadow-lg'
                                : 'bg-slate-950/60 border-dashed border-slate-700/60 hover:border-slate-500 hover:bg-slate-900/40'
                            }`}
                          >
                            {/* Slot Header */}
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                              <div>
                                <span className="font-mono font-extrabold text-xs text-teal-300">
                                  {cell.code}
                                </span>
                                <span className="text-[10px] font-bold text-slate-300 mr-1.5">
                                  {cell.cellLabel || `خانة ${cell.code}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {isOcc ? (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                                )}
                                <span className="text-[10px] font-mono text-slate-400">
                                  #{slotNum}
                                </span>
                              </div>
                            </div>

                            {/* Slot Content (Subdivided Medicines inside Cell) */}
                            <div className="my-1.5 space-y-1">
                              {isOcc ? (
                                (() => {
                                  const meds = getCellMedicines(cell);
                                  return (
                                    <div className="space-y-1">
                                      {meds.map((med, mIdx) => (
                                        <div
                                          key={med.id || mIdx}
                                          className="rounded-lg bg-slate-950/80 border border-slate-800 px-2 py-1 space-y-0.5"
                                        >
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="font-mono text-[9px] font-bold text-cyan-300 shrink-0">
                                              {med.subSlotCode || `${cell.code}/${mIdx + 1}`}
                                            </span>
                                            <span className="font-bold text-[11px] text-white truncate flex-1">
                                              {med.productName}
                                            </span>
                                            <span className="font-mono text-[9px] text-emerald-300 shrink-0">
                                              {med.quantity}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                                            <span>{med.batchNumber}</span>
                                            <span>{med.expiryDate}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="text-center py-2 text-slate-500">
                                  <span className="text-[11px] block">مساحة شاغرة</span>
                                  <span className="text-[9px] text-slate-600 block">اضغط لإضافة دواء</span>
                                </div>
                              )}
                            </div>

                            {/* Slot Footer & Capacity bar */}
                            <div className="pt-1.5 border-t border-slate-800/80">
                              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1">
                                <span>{isOcc ? `${cell.quantity || 75}/${cell.capacity || 100}` : 'فارغ'}</span>
                                <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-teal-400 transition-colors" />
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isOcc
                                      ? (cell.quantity || 75) > 85
                                        ? 'bg-rose-500'
                                        : 'bg-emerald-500'
                                      : 'bg-slate-700 w-0'
                                  }`}
                                  style={{
                                    width: isOcc
                                      ? `${Math.min(100, Math.round(((cell.quantity || 75) / (cell.capacity || 100)) * 100))}%`
                                      : '0%',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Beam separator bar */}
                    <div
                      className={`h-2 rounded-sm ${
                        isWooden ? 'bg-amber-900/80' : 'bg-orange-600'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Base Feet Floor Bar */}
              <div
                className={`h-3 rounded-b-lg mt-3 flex items-center justify-between px-4 ${
                  isWooden ? 'bg-amber-950' : 'bg-slate-800'
                }`}
              >
                <div className="w-6 h-full bg-yellow-500/80 rounded-b-sm" />
                <span className="text-[9px] font-mono text-slate-500">EPOXY SEALED FLOOR LINE</span>
                <div className="w-6 h-full bg-yellow-500/80 rounded-b-sm" />
              </div>
            </div>
          </div>

          {/* Quick Slot Edit Sub-Panel (Modal) */}
          {editingCell && (
            <div className="p-4 rounded-2xl border border-cyan-500/50 bg-slate-950 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-sm text-white">
                    تعديل بيانات الخانة: {editingCell.cell.code} (طابق {editingCell.level} · خانة {editingCell.slot})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">اسم المستحضر الدوائي</label>
                  <input
                    type="text"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="مثال: باراسيتامول وريدي 1000mg"
                    className="w-full h-9 rounded-xl bg-slate-900 border border-slate-700 px-3 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">رقم التشغيلة (Batch Number)</label>
                  <input
                    type="text"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    placeholder="مثال: BATCH-2026-88"
                    className="w-full h-9 rounded-xl bg-slate-900 border border-slate-700 px-3 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">تاريخ انتهاء الصلاحية</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full h-9 rounded-xl bg-slate-900 border border-slate-700 px-3 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">الكمية المخزنة ({qty}/100)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full mt-2 accent-cyan-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOccupied}
                    onChange={(e) => setIsOccupied(e.target.checked)}
                    className="rounded accent-cyan-400"
                  />
                  <span>الخانة مشغولة (Uncheck لتفريغ الخانة وجعلها مساحة شاغرة)</span>
                </label>

                <button
                  type="button"
                  onClick={handleSaveCell}
                  className="h-8 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Save className="w-3.5 h-3.5" /> حفظ التعديل فوراً
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
