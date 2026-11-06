/**
 * DAWA 3D Warehouse Engine — Desktop Context Menu & Ashraf Radial Touch Menu
 * Enables immediate mouse right-click options and touch long-press radial actions.
 */

import React, { useEffect } from 'react';
import {
  Edit3,
  Boxes,
  RotateCw,
  Copy,
  Trash2,
  Printer,
  Navigation,
  DoorOpen,
  Layers,
  Maximize,
  CheckCircle2,
  Camera,
  Scan,
  X,
} from 'lucide-react';
import { ContextMenuState, WarehouseRack } from '../types/warehouse';

interface DesktopContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onEditRack: (id: string) => void;
  onRackCells: (id: string) => void;
  onRotateRack: (id: string) => void;
  onDuplicateRack: (id: string) => void;
  onSendWorkerToRack: (id: string) => void;
  onPrintLabel: (id: string) => void;
  onDeleteRack: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onAddRackAt: (x: number, z: number) => void;
  onAddDoorAt: (x: number, z: number) => void;
  onAddPillarAt: (x: number, z: number) => void;
  onAddZoneAt: (x: number, z: number) => void;
  onSendWorkerHere: (x: number, z: number) => void;
}

export const DesktopContextMenu: React.FC<DesktopContextMenuProps> = ({
  state,
  onClose,
  onEditRack,
  onRackCells,
  onRotateRack,
  onDuplicateRack,
  onSendWorkerToRack,
  onPrintLabel,
  onDeleteRack,
  onDeleteElement,
  onAddRackAt,
  onAddDoorAt,
  onAddPillarAt,
  onAddZoneAt,
  onSendWorkerHere,
}) => {
  useEffect(() => {
    const handleClick = () => onClose();
    if (state.isOpen) {
      window.addEventListener('click', handleClick);
    }
    return () => window.removeEventListener('click', handleClick);
  }, [state.isOpen, onClose]);

  if (!state.isOpen) return null;

  const top = Math.max(10, Math.min(window.innerHeight - 340, state.y));
  const left = Math.max(10, Math.min(window.innerWidth - 260, state.x));

  return (
    <div
      className="fixed z-50 min-w-[220px] rounded-2xl border border-slate-700 bg-slate-900/98 p-1.5 text-xs text-slate-100 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none"
      style={{ top, left }}
      onClick={(e) => e.stopPropagation()}
      dir="rtl"
    >
      {state.targetType === 'RACK' && state.targetId && (
        <div className="space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-bold text-teal-400 border-b border-slate-800">
            تحكم الرف الفوري (Mouse Actions)
          </div>
          <button
            type="button"
            onClick={() => {
              onSendWorkerToRack(state.targetId!);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
          >
            <Navigation className="h-3.5 w-3.5 text-teal-400" />
            <span>توجيه العامل للمشي إلى هذا الرف 🚶‍♂️</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onRackCells(state.targetId!);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
          >
            <Boxes className="h-3.5 w-3.5 text-cyan-400" />
            <span>تفصيل الخانات (نصية ورقمية)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onRotateRack(state.targetId!);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
          >
            <RotateCw className="h-3.5 w-3.5 text-amber-400" />
            <span>تدوير الرف 90 درجة</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onDuplicateRack(state.targetId!);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
          >
            <Copy className="h-3.5 w-3.5 text-purple-400" />
            <span>نسخ وتكرار الرف (Ctrl+D)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onPrintLabel(state.targetId!);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
          >
            <Printer className="h-3.5 w-3.5 text-sky-400" />
            <span>طباعة ملصق الباركود و QR</span>
          </button>
          <div className="my-1 border-t border-slate-800" />
          <button
            type="button"
            onClick={() => {
              onDeleteRack(state.targetId!);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right text-rose-400 hover:bg-rose-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>حذف الرف نهائياً</span>
          </button>
        </div>
      )}

      {state.targetType === 'ELEMENT' && state.targetId && (
        <div className="space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-bold text-amber-400 border-b border-slate-800">
            تحكم العنصر المعماري
          </div>
          <button
            type="button"
            onClick={() => {
              onDeleteElement(state.targetId!);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right text-rose-400 hover:bg-rose-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>حذف العنصر المعماري</span>
          </button>
        </div>
      )}

      {state.targetType === 'FLOOR' && (
        <div className="space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-bold text-teal-400 border-b border-slate-800">
            الموضع المحدد ({state.worldX.toFixed(1)}م × {state.worldZ.toFixed(1)}م)
          </div>
          <button
            type="button"
            onClick={() => {
              onSendWorkerHere(state.worldX, state.worldZ);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right text-cyan-300 hover:bg-cyan-950/40"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>توجيه العامل للمشي هنا 🚶‍♂️</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onAddRackAt(state.worldX, state.worldZ);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
          >
            <Boxes className="h-3.5 w-3.5 text-teal-400" />
            <span>إضافة رف أدوية جديد هنا</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onAddDoorAt(state.worldX, state.worldZ);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
          >
            <DoorOpen className="h-3.5 w-3.5 text-blue-400" />
            <span>إضافة بوابة أو رصيف شحن</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onAddPillarAt(state.worldX, state.worldZ);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
          >
            <Layers className="h-3.5 w-3.5 text-amber-400" />
            <span>إضافة عمود إنشائي</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onAddZoneAt(state.worldX, state.worldZ);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-right hover:bg-slate-800 hover:text-white"
          >
            <Maximize className="h-3.5 w-3.5 text-emerald-400" />
            <span>إضافة منطقة تشغيلية / تبريد</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ========================================================
// Ashraf Radial Touch Menu (for Mobile / Tablet)
// ========================================================
interface AshrafTouchRadialMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  rack: WarehouseRack | null;
  onClose: () => void;
  onCells: () => void;
  onRotate: () => void;
  onSendWorker: () => void;
  onDone: () => void;
}

export const AshrafTouchRadialMenu: React.FC<AshrafTouchRadialMenuProps> = ({
  isOpen,
  x,
  y,
  rack,
  onClose,
  onCells,
  onRotate,
  onSendWorker,
  onDone,
}) => {
  if (!isOpen || !rack) return null;

  const top = Math.max(20, Math.min(window.innerHeight - 280, y - 100));
  const left = Math.max(20, Math.min(window.innerWidth - 280, x - 100));

  return (
    <div
      className="fixed z-50 rounded-2xl border-2 border-teal-500/60 bg-slate-900/98 p-3 text-white shadow-2xl backdrop-blur-lg animate-in zoom-in-90 duration-150 select-none"
      style={{ top, left }}
      dir="rtl"
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div>
          <span className="font-mono font-bold text-xs text-teal-300">{rack.code}</span>
          <p className="text-[10px] text-slate-400">{rack.nameAr || rack.name}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            onSendWorker();
            onClose();
          }}
          className="flex flex-col items-center justify-center rounded-xl border border-teal-500/40 bg-teal-500/20 p-2.5 text-[11px] font-bold text-teal-300 active:scale-95 transition"
        >
          <Navigation className="h-5 w-5 mb-1 text-teal-400" />
          <span>توجيه العامل 🚶‍♂️</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onCells();
            onClose();
          }}
          className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-850 p-2.5 text-[11px] font-bold text-cyan-300 active:scale-95 transition"
        >
          <Boxes className="h-5 w-5 mb-1 text-cyan-400" />
          <span>خانات</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onRotate();
            onClose();
          }}
          className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-850 p-2.5 text-[11px] font-bold text-amber-300 active:scale-95 transition"
        >
          <RotateCw className="h-5 w-5 mb-1 text-amber-400" />
          <span>تدوير 90°</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onDone();
            onClose();
          }}
          className="flex flex-col items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-2.5 text-[11px] font-bold text-emerald-300 active:scale-95 transition"
        >
          <CheckCircle2 className="h-5 w-5 mb-1 text-emerald-400" />
          <span>إتمام الترتيب</span>
        </button>
      </div>
    </div>
  );
};
