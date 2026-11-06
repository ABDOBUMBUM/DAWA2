/**
 * DAWA 3D Warehouse Engine — Order Picking Mission HUD
 * Designed specifically for warehouse floor staff in Expo Go mobile & desktop:
 * Displays active order dispatch information, itemized picking list, route guidance on the 3D map,
 * exact rack and cell coordinates, real quantities, and picking confirmation.
 */

import React, { useState } from 'react';
import {
  PackageCheck,
  Navigation,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Building2,
  Boxes,
  Eye,
  Sparkles,
  QrCode,
  ShieldCheck,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { WarehouseRack, OrderTask, OrderPickItem } from '../types/warehouse';

interface OrderPickingHUDProps {
  racks: WarehouseRack[];
  onGuideToItem: (rackId: string, level: number, slot: number) => void;
  onOpenRackThumbnail: (rackId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

// Initial realistic dispatch order
const SAMPLE_ORDER: OrderTask = {
  orderId: 'ORD-2026-941',
  customerName: 'مستشفى الأمل التخصصي — قسم الطوارئ والعناية المركزة',
  priority: 'URGENT',
  status: 'IN_PROGRESS',
  items: [
    {
      id: 'item-1',
      productName: 'باراسيتامول وريدي 1000mg (Paracetamol IV)',
      rackId: 'rack-a1',
      rackCode: 'WH-MAIN-A1',
      level: 4,
      slot: 1,
      cellCode: 'A1-04-01',
      quantityRequired: 15,
      quantityPicked: 0,
      confirmed: false,
    },
    {
      id: 'item-2',
      productName: 'سيفوترياكسون حقن 1g (Ceftriaxone Vial)',
      rackId: 'rack-a2',
      rackCode: 'WH-MAIN-A2',
      level: 3,
      slot: 2,
      cellCode: 'A1-03-02',
      quantityRequired: 10,
      quantityPicked: 0,
      confirmed: false,
    },
    {
      id: 'item-3',
      productName: 'كبسولات فيتامين D3 وفيتامين C (خزانة خشبية)',
      rackId: 'rack-wood-1',
      rackCode: 'CAB-WOOD-01',
      level: 4,
      slot: 1,
      cellCode: 'W-01',
      quantityRequired: 8,
      quantityPicked: 0,
      confirmed: false,
    },
    {
      id: 'item-4',
      productName: 'محلول رينجر لاكتات وريدي 500ml',
      rackId: 'rack-b1',
      rackCode: 'WH-MAIN-B1',
      level: 2,
      slot: 1,
      cellCode: 'B1-02-01',
      quantityRequired: 20,
      quantityPicked: 0,
      confirmed: false,
    },
  ],
};

export const OrderPickingHUD: React.FC<OrderPickingHUDProps> = ({
  racks,
  onGuideToItem,
  onOpenRackThumbnail,
  isOpen,
  onToggleOpen,
}) => {
  const [order, setOrder] = useState<OrderTask>(SAMPLE_ORDER);
  const [activeItemId, setActiveItemId] = useState<string | null>('item-1');
  const [isMinimized, setIsMinimized] = useState(false);

  const confirmedCount = order.items.filter((i) => i.confirmed).length;
  const progressPercent = Math.round((confirmedCount / order.items.length) * 100);

  const handleToggleConfirm = (itemId: string) => {
    setOrder((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === itemId) {
          const next = !item.confirmed;
          return {
            ...item,
            confirmed: next,
            quantityPicked: next ? item.quantityRequired : 0,
          };
        }
        return item;
      }),
    }));
  };

  const handleGuide = (item: OrderPickItem) => {
    setActiveItemId(item.id);
    onGuideToItem(item.rackId, item.level, item.slot);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-18 right-3 md:right-5 z-40 max-w-sm w-full transition-all duration-200">
      <div className="rounded-3xl border border-cyan-500/40 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shadow-xs">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-xs text-cyan-300">
                  {order.orderId}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-500 text-white animate-pulse">
                  عاجل إسعافي
                </span>
              </div>
              <h4 className="text-[11px] font-bold text-white truncate max-w-[210px]">
                {order.customerName}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title={isMinimized ? 'توسيع' : 'تصغير'}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onToggleOpen}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-slate-400">الإنجاز:</span>
            <span className="font-bold text-emerald-400">
              {confirmedCount}/{order.items.length} أصناف
            </span>
          </div>
          <div className="w-32 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-mono font-bold text-[11px] text-teal-300">{progressPercent}%</span>
        </div>

        {/* Minimized Compact View */}
        {isMinimized ? (
          <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-between">
            <span>مهمة التجهيز نشطة (تم إنجاز {confirmedCount} من {order.items.length})</span>
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="text-cyan-400 hover:underline font-bold"
            >
              عرض الأصناف
            </button>
          </div>
        ) : (
          /* Detailed Items List */
          <div className="p-3 space-y-2.5 max-h-[60vh] overflow-y-auto">
            {order.items.map((item, idx) => {
              const isActive = activeItemId === item.id;
              const isRackWood = item.rackCode.includes('WOOD');

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    item.confirmed
                      ? 'bg-emerald-950/20 border-emerald-800/50 opacity-80'
                      : isActive
                      ? 'bg-slate-800/90 border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Item Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-extrabold text-[11px] text-teal-300">
                          {item.cellCode}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isRackWood ? 'bg-amber-600/30 text-amber-300' : 'bg-blue-600/30 text-blue-300'
                          }`}
                        >
                          {item.rackCode}
                        </span>
                      </div>
                      <h5 className="font-bold text-xs text-white mt-1 leading-snug">
                        {item.productName}
                      </h5>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleConfirm(item.id)}
                      className={`p-1.5 rounded-xl border transition-all ${
                        item.confirmed
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                      }`}
                      title={item.confirmed ? 'إلغاء التأكيد' : 'تأكيد الالتقاط'}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quantity and Location */}
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="font-mono text-slate-300 text-[11px]">
                      الكمية: <strong className="text-white text-xs">{item.quantityRequired}</strong> عبوة
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Guide Worker Route Button */}
                      <button
                        type="button"
                        onClick={() => handleGuide(item)}
                        className={`h-7 px-2.5 rounded-xl font-bold text-[10px] flex items-center gap-1 transition-all ${
                          isActive
                            ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                            : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
                        }`}
                      >
                        <Navigation className="w-3 h-3" />
                        <span>توجيه المسار</span>
                      </button>

                      {/* Elevation Thumbnail View */}
                      <button
                        type="button"
                        onClick={() => onOpenRackThumbnail(item.rackId)}
                        className="h-7 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold flex items-center gap-1"
                        title="عرض واجهة الرف"
                      >
                        <Eye className="w-3 h-3" />
                        <span>الواجهة</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px] font-mono">
            Expo Go WebApp • وضع الموظفين الميداني
          </span>
          {progressPercent === 100 && (
            <span className="text-emerald-400 font-bold flex items-center gap-1 animate-bounce">
              <ShieldCheck className="w-4 h-4" /> اكتملت الطلبية بنجاح!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
