/**
 * DAWA 3D Warehouse Engine — Ergonomic Bottom Inspector Dock
 * Conforms to Viewport-First Controls directives: compact, collapsible,
 * supports 360-degree rotation, unbounded width expansion, lock toggle, and direct camera zoom.
 */

import React, { useState } from 'react';
import {
  WarehouseRack,
  ArchitecturalElement,
  WarehouseDimensions,
  getRackRotationDeg,
} from '../types/warehouse';
import {
  Boxes,
  RotateCw,
  Copy,
  Trash2,
  Printer,
  Navigation,
  ChevronDown,
  ChevronUp,
  Snowflake,
  Thermometer,
  ShieldAlert,
  Pencil,
  Sparkles,
  Lock,
  Unlock,
  Focus,
  Maximize2,
} from 'lucide-react';

interface InspectorPanelProps {
  selectedRack: WarehouseRack | null;
  selectedElement: ArchitecturalElement | null;
  dimensions: WarehouseDimensions;
  isDesigner: boolean;
  isEditLocked?: boolean;
  onUpdateRack: (updated: WarehouseRack) => void;
  onUpdateElement: (updated: ArchitecturalElement) => void;
  onDuplicateRack: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onDeleteRack: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onOpenCellsModal: () => void;
  onOpenEditRackModal: () => void;
  onFocusSelection?: () => void;
  onSendWorkerToRack: (rackId: string) => void;
  onPrintBarcode: (rackId: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedRack,
  selectedElement,
  dimensions,
  isDesigner,
  isEditLocked = false,
  onUpdateRack,
  onUpdateElement,
  onDuplicateRack,
  onDuplicateElement,
  onDeleteRack,
  onDeleteElement,
  onOpenCellsModal,
  onOpenEditRackModal,
  onFocusSelection,
  onSendWorkerToRack,
  onPrintBarcode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!selectedRack && !selectedElement) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900/95 border border-slate-700/60 shadow-xl text-xs text-slate-300">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span>
            المستودع: <strong className="text-white">{dimensions.ww}م × {dimensions.wd}م</strong>
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-400 font-mono">
            انقر على أي رف أو خانة أو بوابة للتحكم الكامل والتقريب المباشر (نقر مزدوج للتقريب الفوري)
          </span>
        </div>
      </div>
    );
  }

  const rackDeg = selectedRack ? getRackRotationDeg(selectedRack) : 0;

  return (
    <div
      className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-4xl transition-transform duration-200 pointer-events-auto ${
        isCollapsed ? 'translate-y-[calc(100%-32px)]' : 'translate-y-0'
      }`}
    >
      <div className="rounded-2xl border border-teal-500/30 bg-slate-900/95 shadow-2xl p-3 text-slate-100">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
              {selectedRack ? <Boxes className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </span>
            {selectedRack ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-teal-300 text-sm">{selectedRack.code}</span>
                <span className="text-xs text-slate-300 font-bold">
                  {selectedRack.nameAr || selectedRack.name}
                  {selectedRack.nameEn ? ` (${selectedRack.nameEn})` : ''}
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
                  style={{
                    background:
                      selectedRack.storageType === 'COLD'
                        ? 'rgba(6, 182, 212, 0.2)'
                        : selectedRack.storageType === 'QUARANTINE'
                        ? 'rgba(217, 119, 6, 0.2)'
                        : 'rgba(16, 185, 129, 0.2)',
                    color:
                      selectedRack.storageType === 'COLD'
                        ? '#38bdf8'
                        : selectedRack.storageType === 'QUARANTINE'
                        ? '#fbbf24'
                        : '#34d399',
                  }}
                >
                  {selectedRack.storageType === 'COLD' ? (
                    <>
                      <Snowflake className="w-3 h-3" /> تبريد (2°C - 8°C)
                    </>
                  ) : selectedRack.storageType === 'QUARANTINE' ? (
                    <>
                      <ShieldAlert className="w-3 h-3" /> حجر صحي
                    </>
                  ) : (
                    <>
                      <Thermometer className="w-3 h-3" /> حرارة الغرفة
                    </>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-300 text-sm">{selectedElement?.label}</span>
                <span className="text-[10px] uppercase font-mono text-slate-400">
                  {selectedElement?.type} · {selectedElement?.subType}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onFocusSelection && (
              <button
                type="button"
                onClick={onFocusSelection}
                className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 text-[10px] font-bold flex items-center gap-1"
              >
                <Focus className="w-3 h-3" /> تقريب الكاميرا
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title={isCollapsed ? 'توسيع اللوحة' : 'طي اللوحة'}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Selected Rack Controls */}
        {selectedRack && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            {/* 1. Location Coordinates & Worker Walking */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">الموقع الهندسي بالمتر</span>
                <div className="font-mono text-xs text-white">
                  X: {selectedRack.px.toFixed(1)}m · Z: {selectedRack.pz.toFixed(1)}m · {Math.round(rackDeg)}°
                </div>
                <div className="text-[11px] text-teal-300 mt-1">
                  الممر {selectedRack.zone} · الرف {selectedRack.shelf} · مستوى {selectedRack.levelVal || '01'}
                </div>
              </div>

              <button
                type="button"
                data-testid="send-worker-to-rack-btn"
                onClick={() => onSendWorkerToRack(selectedRack.id)}
                className="mt-2 w-full h-7 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Navigation className="w-3.5 h-3.5" /> توجيه العامل إلى الرف 🚶‍♂️
              </button>
            </div>

            {/* 2. Open Dimensions & 360 Rotation Steppers */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-400 font-bold">الأبعاد والتدوير 360°</span>
                {isDesigner && !isEditLocked && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateRack({
                        ...selectedRack,
                        w: Math.max(2, dimensions.ww - 0.6),
                        px: dimensions.ww / 2,
                      })
                    }
                    className="text-[9px] text-teal-400 hover:underline font-bold flex items-center gap-0.5"
                    title="تمديد الرف بعرض الجدار بالكامل"
                  >
                    <Maximize2 className="w-2.5 h-2.5" /> جدار كامل
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded bg-slate-900 border border-slate-800 p-1">
                  <span className="text-[9px] text-slate-400 block">العرض W</span>
                  <div className="flex items-center justify-between mt-0.5">
                    {isDesigner && !isEditLocked && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateRack({ ...selectedRack, w: Math.max(0.6, (selectedRack.w || 2.4) - 0.4) })
                        }
                        className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px]"
                      >
                        -
                      </button>
                    )}
                    <span className="font-mono text-[10px] font-bold">{(selectedRack.w || 2.4).toFixed(1)}m</span>
                    {isDesigner && !isEditLocked && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateRack({ ...selectedRack, w: (selectedRack.w || 2.4) + 0.4 })
                        }
                        className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px]"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded bg-slate-900 border border-slate-800 p-1">
                  <span className="text-[9px] text-slate-400 block">العمق D</span>
                  <div className="flex items-center justify-between mt-0.5">
                    {isDesigner && !isEditLocked && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateRack({ ...selectedRack, d: Math.max(0.3, (selectedRack.d || 1.0) - 0.2) })
                        }
                        className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px]"
                      >
                        -
                      </button>
                    )}
                    <span className="font-mono text-[10px] font-bold">{(selectedRack.d || 1.0).toFixed(1)}m</span>
                    {isDesigner && !isEditLocked && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateRack({ ...selectedRack, d: (selectedRack.d || 1.0) + 0.2 })
                        }
                        className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px]"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded bg-slate-900 border border-slate-800 p-1">
                  <span className="text-[9px] text-slate-400 block">الطوابق</span>
                  <div className="flex items-center justify-between mt-0.5">
                    {isDesigner && !isEditLocked && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateRack({ ...selectedRack, levels: Math.max(1, (selectedRack.levels || 4) - 1) })
                        }
                        className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px]"
                      >
                        -
                      </button>
                    )}
                    <span className="font-mono text-[10px] font-bold">{selectedRack.levels || 4}</span>
                    {isDesigner && !isEditLocked && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateRack({ ...selectedRack, levels: Math.min(25, (selectedRack.levels || 4) + 1) })
                        }
                        className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-[9px]"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isDesigner && !isEditLocked && (
                <div className="flex items-center gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const nextDeg = (rackDeg - 15 + 360) % 360;
                      onUpdateRack({ ...selectedRack, rotation: nextDeg, rot: nextDeg >= 45 && nextDeg < 135 });
                    }}
                    className="h-6 px-2 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-amber-300"
                  >
                    -15°
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextDeg = (rackDeg + 90) % 360;
                      onUpdateRack({ ...selectedRack, rotation: nextDeg, rot: nextDeg >= 45 && nextDeg < 135 });
                    }}
                    className="flex-1 h-6 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold flex items-center justify-center gap-1"
                  >
                    <RotateCw className="w-3 h-3 text-amber-400" /> تدوير ({Math.round(rackDeg)}°)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextDeg = (rackDeg + 15) % 360;
                      onUpdateRack({ ...selectedRack, rotation: nextDeg, rot: nextDeg >= 45 && nextDeg < 135 });
                    }}
                    className="h-6 px-2 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-amber-300"
                  >
                    +15°
                  </button>
                </div>
              )}
            </div>

            {/* 3. Cell Configuration */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">تخصيص خانات الرف والباركود</span>
                <p className="text-[10px] text-slate-300">
                  خانات نصية ورقمية عالية الدقة مع ليبلات 3D مباشرة على العوارض
                </p>
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  data-testid="open-cells-modal-btn"
                  onClick={onOpenCellsModal}
                  className="flex-1 h-7 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Boxes className="w-3.5 h-3.5" /> تفصيل الخانات
                </button>
                <button
                  type="button"
                  onClick={() => onPrintBarcode(selectedRack.id)}
                  className="h-7 px-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1"
                  title="طباعة ملصق الرف و QR"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-400" />
                </button>
              </div>
            </div>

            {/* 4. Actions: Lock, Edit, Duplicate, Delete */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-400 font-bold">العمليات والقفل</span>
                <button
                  type="button"
                  onClick={() => onUpdateRack({ ...selectedRack, locked: !selectedRack.locked })}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${
                    selectedRack.locked
                      ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40'
                      : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {selectedRack.locked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                  <span>{selectedRack.locked ? 'مقفل' : 'مفتوح'}</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {isDesigner && (
                  <>
                    <button
                      type="button"
                      onClick={onOpenEditRackModal}
                      className="flex-1 h-7 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center justify-center gap-1"
                    >
                      <Pencil className="w-3 h-3 text-teal-400" /> تعديل شامل
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateRack(selectedRack.id)}
                      className="h-7 px-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center justify-center gap-1"
                      title="نسخ وتكرار الرف"
                    >
                      <Copy className="w-3 h-3 text-amber-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRack(selectedRack.id)}
                      className="h-7 px-2.5 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 text-xs font-bold flex items-center justify-center gap-1"
                      title="حذف الرف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Selected Architectural Element Controls */}
        {selectedElement && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">إحداثيات الموضع</span>
              <div className="font-mono text-xs text-white">
                X: {selectedElement.x.toFixed(1)}m · Z: {selectedElement.z.toFixed(1)}m
              </div>
              <div className="flex items-center gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => onUpdateElement({ ...selectedElement, x: selectedElement.x - 0.5 })}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]"
                >
                  X-
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateElement({ ...selectedElement, x: selectedElement.x + 0.5 })}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]"
                >
                  X+
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateElement({ ...selectedElement, z: selectedElement.z - 0.5 })}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]"
                >
                  Z-
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateElement({ ...selectedElement, z: selectedElement.z + 0.5 })}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]"
                >
                  Z+
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">
                الأبعاد والتدوير 360° {selectedElement.type === 'DOOR' ? 'وفتح البوابة' : ''}
              </span>
              <div className="font-mono text-xs text-white">
                {selectedElement.w.toFixed(1)}م × {selectedElement.d.toFixed(1)}م × {selectedElement.h.toFixed(1)}م
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateElement({
                      ...selectedElement,
                      rotation: ((selectedElement.rotation || 0) + 45) % 360,
                    })
                  }
                  className="flex-1 h-6 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold flex items-center justify-center gap-1"
                >
                  <RotateCw className="w-3 h-3 text-amber-400" /> تدوير ({selectedElement.rotation || 0}°)
                </button>
                {selectedElement.type === 'DOOR' && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateElement({
                        ...selectedElement,
                        openRatio: (selectedElement.openRatio ?? 0.85) > 0.2 ? 0.0 : 0.9,
                      })
                    }
                    className="flex-1 h-6 rounded bg-teal-600/30 border border-teal-500/50 text-teal-200 text-[10px] font-bold"
                  >
                    {(selectedElement.openRatio ?? 0.85) > 0.2 ? 'إغلاق الباب' : 'فتح المدخل'}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onOpenEditRackModal}
                className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1"
              >
                <Pencil className="w-3.5 h-3.5 text-teal-400" /> خصائص
              </button>
              <button
                type="button"
                onClick={() => onDuplicateElement(selectedElement.id)}
                className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" /> تكرار
              </button>
              <button
                type="button"
                onClick={() => onDeleteElement(selectedElement.id)}
                className="h-8 px-3 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 text-xs font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> حذف
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
