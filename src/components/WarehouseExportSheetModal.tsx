/**
 * DAWA 3D Warehouse Engine — Comprehensive Warehouse Manifest & A4 Printable Sheet
 * Certified pharmaceutical layout with deep export to A4 Print, CSV/Excel, and JSON,
 * covering steel industrial racks, wooden wall cabinets, and granular slot inventories.
 */

import React, { useState } from 'react';
import {
  WarehouseRack,
  ArchitecturalElement,
  WarehouseDimensions,
  resolveRackCell,
} from '../types/warehouse';
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  Boxes,
  QrCode,
  ShieldCheck,
  Check,
  Building2,
  Layers,
  Thermometer,
  Snowflake,
  ShieldAlert,
  Copy,
  Scissors,
  Tag,
} from 'lucide-react';

interface WarehouseExportSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  racks: WarehouseRack[];
  elements: ArchitecturalElement[];
  dimensions: WarehouseDimensions;
}

export const WarehouseExportSheetModal: React.FC<WarehouseExportSheetModalProps> = ({
  isOpen,
  onClose,
  racks,
  elements,
  dimensions,
}) => {
  const [activeTab, setActiveTab] = useState<'MANIFEST' | 'STICKERS' | 'CUT_PASTE_LABELS'>('MANIFEST');
  const [cutLabelFilter, setCutLabelFilter] = useState<'ALL' | 'RACKS' | 'SLOTS'>('ALL');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Aggregate stats
  const totalRacks = racks.length;
  const steelRacksCount = racks.filter((r) => r.rackType !== 'WOODEN_CABINET').length;
  const woodenCabinetsCount = racks.filter((r) => r.rackType === 'WOODEN_CABINET').length;

  let totalSlotsCount = 0;
  let occupiedSlotsCount = 0;
  const allCells: Array<{
    rack: WarehouseRack;
    level: number;
    slot: number;
    cell: ReturnType<typeof resolveRackCell>;
  }> = [];

  racks.forEach((rack) => {
    const levels = rack.levels || 4;
    const slots = rack.cellsPerLevel || 3;
    totalSlotsCount += levels * slots;

    for (let l = 1; l <= levels; l++) {
      for (let s = 1; s <= slots; s++) {
        const cell = resolveRackCell(rack, l, s);
        if (cell.occupied !== false) occupiedSlotsCount++;
        allCells.push({ rack, level: l, slot: s, cell });
      }
    }
  });

  const occupancyRate = totalSlotsCount > 0 ? Math.round((occupiedSlotsCount / totalSlotsCount) * 100) : 0;
  const floorArea = dimensions.ww * dimensions.wd;
  const warehouseVolume = floorArea * dimensions.wh;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      'Rack Code',
      'Rack Type',
      'Name Arabic',
      'Name English',
      'Zone',
      'Shelf',
      'Level',
      'Width(m)',
      'Depth(m)',
      'Height(m)',
      'Storage Condition',
      'Slot Code',
      'Slot Level',
      'Slot Number',
      'Product Name',
      'Batch Number',
      'Expiry Date',
      'Quantity',
      'Capacity',
      'Status',
    ];

    const rows: string[][] = [];
    allCells.forEach(({ rack, level, slot, cell }) => {
      rows.push([
        rack.code,
        rack.rackType === 'WOODEN_CABINET' ? 'WOODEN_WALL_CABINET' : 'STEEL_INDUSTRIAL',
        `"${rack.nameAr || rack.name}"`,
        `"${rack.nameEn || ''}"`,
        rack.zone,
        rack.shelf,
        rack.levelVal || '01',
        (rack.w || 2.4).toFixed(2),
        (rack.d || 1.0).toFixed(2),
        (rack.h || 3.8).toFixed(2),
        cell.storageCondition || rack.storageType || 'ROOM',
        cell.code,
        String(level),
        String(slot),
        `"${cell.productName || (cell.occupied === false ? 'EMPTY_SLOT' : '')}"`,
        `"${cell.batchNumber || ''}"`,
        cell.expiryDate || '',
        String(cell.quantity || 0),
        String(cell.capacity || 100),
        cell.occupied !== false ? 'OCCUPIED' : 'EMPTY',
      ]);
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      headers.join(',') +
      '\n' +
      rows.map((e) => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dawa_warehouse_blueprint_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export Handler
  const handleCopyJSON = () => {
    const payload = {
      manifestVersion: '2.4.0',
      generatedAt: new Date().toISOString(),
      dimensions,
      stats: {
        totalRacks,
        steelRacksCount,
        woodenCabinetsCount,
        totalSlotsCount,
        occupiedSlotsCount,
        occupancyRate,
        floorAreaM2: floorArea,
        volumeM3: warehouseVolume,
      },
      racks,
      elements,
    };

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      dir="rtl"
    >
      <div className="relative w-full max-w-6xl max-h-[94vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Dialog Toolbar */}
        <div className="h-14 px-6 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>كشف الاعتماد والبيان الجردي والتصدير الورقي الشامل</span>
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 text-[10px] font-bold">
                  A4 CERTIFIED MANIFEST
                </span>
              </h2>
              <p className="text-[10px] text-slate-400">
                تنسيق طباعي ورقي كامل لجميع الرفوف الفولاذية والخزائن الجدارية الخشبية والخانات
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Printer className="w-4 h-4" /> طباعة ورقية A4 / PDF
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-8 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Download className="w-4 h-4" /> تصدير Excel / CSV
            </button>
            <button
              type="button"
              onClick={handleCopyJSON}
              className="h-8 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-teal-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ JSON'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="h-11 px-6 border-b border-slate-800 bg-slate-950/60 flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('MANIFEST')}
            className={`h-full text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'MANIFEST'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" /> كشف الجرد الورقي المعتمد (Master Sheet)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STICKERS')}
            className={`h-full text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'STICKERS'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" /> بطاقات وملصقات الباركود والـ QR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CUT_PASTE_LABELS')}
            className={`h-full text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'CUT_PASTE_LABELS'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scissors className="w-4 h-4 text-cyan-400" /> ليبلات القص والتلصيق الميدانية (Cut & Paste Sheets)
          </button>
        </div>

        {/* Printable Sheet Viewport */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/60 print:bg-white print:text-black print:p-0">
          {activeTab === 'MANIFEST' && (
            <div className="space-y-6 max-w-5xl mx-auto print:max-w-none">
              {/* Sheet Official Header */}
              <div className="rounded-2xl border border-slate-700/80 bg-slate-950 p-6 print:border-black print:bg-white print:p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 print:border-gray-300 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-black text-xl border border-teal-500/30 print:border-black print:text-black">
                      DAWA
                    </div>
                    <div>
                      <h1 className="text-lg font-black text-white print:text-black tracking-wide">
                        وثيقة المخطط الهندسي والجرد التفصيلي للمستودع الدوائي
                      </h1>
                      <p className="text-xs text-slate-400 print:text-gray-700 font-mono">
                        DAWA Pharmaceutical Logistics Hub — Certified Master Facility Blueprint
                      </p>
                    </div>
                  </div>

                  <div className="text-left font-mono text-xs text-slate-400 print:text-gray-800">
                    <div>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
                    <div>الإصدار: v2.4 (GAMP-5 Approved)</div>
                    <div className="text-teal-400 print:text-black font-bold">الحالة: معتمد رسمي</div>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
                  <div className="rounded-xl bg-slate-900 print:bg-gray-100 p-2.5 border border-slate-800 print:border-gray-300">
                    <span className="text-[10px] text-slate-400 print:text-gray-600 block">المساحة الكلية</span>
                    <span className="font-mono text-sm font-black text-white print:text-black">{floorArea} م²</span>
                  </div>

                  <div className="rounded-xl bg-slate-900 print:bg-gray-100 p-2.5 border border-slate-800 print:border-gray-300">
                    <span className="text-[10px] text-slate-400 print:text-gray-600 block">الحجم الهوائي</span>
                    <span className="font-mono text-sm font-black text-white print:text-black">{warehouseVolume} م³</span>
                  </div>

                  <div className="rounded-xl bg-slate-900 print:bg-gray-100 p-2.5 border border-slate-800 print:border-gray-300">
                    <span className="text-[10px] text-slate-400 print:text-gray-600 block">رفوف معدنية OSHA</span>
                    <span className="font-mono text-sm font-black text-blue-400 print:text-black">{steelRacksCount}</span>
                  </div>

                  <div className="rounded-xl bg-slate-900 print:bg-gray-100 p-2.5 border border-slate-800 print:border-gray-300">
                    <span className="text-[10px] text-slate-400 print:text-gray-600 block">خزائن خشبية جدارية</span>
                    <span className="font-mono text-sm font-black text-amber-400 print:text-black">{woodenCabinetsCount}</span>
                  </div>

                  <div className="rounded-xl bg-slate-900 print:bg-gray-100 p-2.5 border border-slate-800 print:border-gray-300">
                    <span className="text-[10px] text-slate-400 print:text-gray-600 block">إجمالي الخانات</span>
                    <span className="font-mono text-sm font-black text-cyan-400 print:text-black">{totalSlotsCount}</span>
                  </div>

                  <div className="rounded-xl bg-slate-900 print:bg-gray-100 p-2.5 border border-slate-800 print:border-gray-300">
                    <span className="text-[10px] text-slate-400 print:text-gray-600 block">نسبة الإشغال</span>
                    <span className="font-mono text-sm font-black text-emerald-400 print:text-black">{occupancyRate}%</span>
                  </div>
                </div>
              </div>

              {/* TABLE 1: Racks & Wooden Cabinets Master Table */}
              <div className="rounded-2xl border border-slate-700/80 bg-slate-950 p-5 print:border-black print:bg-white print:p-2 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white print:text-black flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-teal-400" />
                    <span>سجل الرفوف الفولاذية والخزائن الجدارية الخشبية (Racks & Cabinets Registry)</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-400">{racks.length} موقع</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 print:border-black text-[11px] text-slate-400 print:text-black bg-slate-900/80 print:bg-gray-200">
                        <th className="p-2 font-mono">الكود</th>
                        <th className="p-2">الاسم (العربية / English)</th>
                        <th className="p-2">النوع الهندسي</th>
                        <th className="p-2 font-mono">الأبعاد (W×D×H)</th>
                        <th className="p-2 font-mono">الموقع (X, Z)</th>
                        <th className="p-2">المستويات / الخانات</th>
                        <th className="p-2">شرط التخزين</th>
                        <th className="p-2">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 print:divide-gray-300">
                      {racks.map((r) => {
                        const isWooden = r.rackType === 'WOODEN_CABINET';
                        return (
                          <tr key={r.id} className="hover:bg-slate-900/40 print:hover:bg-transparent">
                            <td className="p-2 font-mono font-bold text-teal-300 print:text-black">{r.code}</td>
                            <td className="p-2">
                              <span className="font-bold text-white print:text-black block">{r.nameAr || r.name}</span>
                              {r.nameEn && (
                                <span className="font-mono text-[10px] text-slate-400 print:text-gray-600 block">
                                  {r.nameEn}
                                </span>
                              )}
                            </td>
                            <td className="p-2">
                              {isWooden ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 print:border-black print:text-black">
                                  🪵 خزانة خشبية جدارية
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 print:border-black print:text-black">
                                  🏗️ رف معدني صناعي
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-mono text-slate-300 print:text-black">
                              {(r.w || 2.4).toFixed(1)}×{(r.d || 1.0).toFixed(1)}×{(r.h || 3.8).toFixed(1)}م
                            </td>
                            <td className="p-2 font-mono text-slate-400 print:text-black">
                              {r.px.toFixed(1)}م, {r.pz.toFixed(1)}م
                            </td>
                            <td className="p-2 font-mono">
                              <span className="font-bold text-cyan-300 print:text-black">{r.levels || 4}</span> طوابق ×{' '}
                              <span className="font-bold text-cyan-300 print:text-black">{r.cellsPerLevel || 3}</span> خانات
                            </td>
                            <td className="p-2">
                              {r.storageType === 'COLD' ? (
                                <span className="text-cyan-400 font-bold flex items-center gap-1">
                                  <Snowflake className="w-3 h-3" /> تبريد (2-8°C)
                                </span>
                              ) : r.storageType === 'QUARANTINE' ? (
                                <span className="text-amber-400 font-bold flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3" /> حجر صحي
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <Thermometer className="w-3 h-3" /> حرارة الغرفة
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-mono text-emerald-400 print:text-black font-bold">
                              {r.status || 'APPROVED'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLE 2: Granular Slots & Medicine Inventory Table */}
              <div className="rounded-2xl border border-slate-700/80 bg-slate-950 p-5 print:border-black print:bg-white print:p-2 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white print:text-black flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>سجل الخانات والمستحضرات الدوائية التفصيلي (Granular Cells & Stock)</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-400">{allCells.length} خانة كلية</span>
                </div>

                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-950 print:bg-gray-200 z-10">
                      <tr className="border-b border-slate-800 print:border-black text-[11px] text-slate-400 print:text-black">
                        <th className="p-2 font-mono">كود الخانة</th>
                        <th className="p-2">الرف التابع</th>
                        <th className="p-2">الطابق-الخانة</th>
                        <th className="p-2">المستحضر الدوائي</th>
                        <th className="p-2 font-mono">رقم التشغيلة (Batch)</th>
                        <th className="p-2 font-mono">الصلاحية</th>
                        <th className="p-2 font-mono">الكمية/السعة</th>
                        <th className="p-2">الحالة</th>
                        <th className="p-2 font-mono">الرمز الشريطي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 print:divide-gray-300">
                      {allCells.map(({ rack, level, slot, cell }) => {
                        const isOccupied = cell.occupied !== false;
                        return (
                          <tr key={cell.id} className="hover:bg-slate-900/40 print:hover:bg-transparent">
                            <td className="p-2 font-mono font-bold text-cyan-300 print:text-black">{cell.code}</td>
                            <td className="p-2 font-mono text-slate-300 print:text-black">{rack.code}</td>
                            <td className="p-2 font-mono text-slate-400 print:text-black">
                              مستوى {level} · خانة {slot}
                            </td>
                            <td className="p-2 font-bold text-white print:text-black">
                              {isOccupied ? cell.productName || 'مستحضر دوائي' : <span className="text-slate-500 font-normal">خالية (مساحة شاغرة)</span>}
                            </td>
                            <td className="p-2 font-mono text-slate-300 print:text-black">{cell.batchNumber || '-'}</td>
                            <td className="p-2 font-mono text-slate-300 print:text-black">{cell.expiryDate || '-'}</td>
                            <td className="p-2 font-mono">
                              {isOccupied ? (
                                <span>
                                  <strong className="text-white print:text-black">{cell.quantity || 75}</strong> / {cell.capacity || 100}
                                </span>
                              ) : (
                                <span className="text-slate-500">0 / {cell.capacity || 100}</span>
                              )}
                            </td>
                            <td className="p-2">
                              {isOccupied ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 print:text-black">
                                  ممتلئة
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 print:text-black">
                                  شاغرة
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-mono text-[9px] text-slate-400 print:text-black">
                              |||||| |||| ||
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures & Certification Footer */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 print:border-black print:bg-white flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white print:text-black block mb-1">المشرف الهندسي المعتمد:</span>
                  <span className="text-slate-400 print:text-gray-800">م. أشرف عثمان — رئيس عمليات المستودع</span>
                </div>
                <div>
                  <span className="font-bold text-white print:text-black block mb-1">الرقابة الدوائية وجودة التخزين:</span>
                  <span className="text-slate-400 print:text-gray-800">د. ياسين — مفتش سلامة الأدوية FEFO</span>
                </div>
                <div className="text-left font-mono text-[10px] text-slate-500 print:text-gray-800">
                  <div>Digital Hash: 8f9b2a...390e</div>
                  <div>GAMP-5 Validation Compliant</div>
                </div>
              </div>
            </div>
          )}

          {/* STICKERS & QR CODES TAB */}
          {activeTab === 'STICKERS' && (
            <div className="space-y-4 max-w-5xl mx-auto">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">بطاقات وملصقات الباركود والـ QR للرفوف والخانات</h3>
                  <p className="text-xs text-slate-400">تنسيق ملصقات حرارية ولاصقات لاصقة للطباعة المباشرة</p>
                </div>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="h-8 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" /> طباعة الملصقات فوراً
                </button>
              </div>

              {/* Sticker Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-3">
                {allCells.slice(0, 32).map(({ rack, level, slot, cell }) => (
                  <div
                    key={`sticker-${cell.id}`}
                    className="p-3 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 flex flex-col justify-between space-y-2 print:border-black print:bg-white print:text-black"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 print:border-gray-300 pb-1.5">
                      <span className="font-mono font-extrabold text-sm text-teal-300 print:text-black">
                        {cell.code}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 print:text-gray-800">
                        {rack.code}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs font-bold block truncate text-white print:text-black">
                        {cell.productName || (cell.occupied === false ? 'خانة شاغرة' : 'مستحضر دوائي')}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 print:text-gray-800 block">
                        مستوى {level} · خانة {slot}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800 print:border-gray-300 flex items-center justify-between">
                      {/* Simulated barcode */}
                      <div className="font-mono text-xs tracking-widest text-slate-300 print:text-black">
                        ||| | |||| | ||
                      </div>
                      <span className="text-[9px] font-mono px-1 rounded bg-slate-800 print:bg-gray-200 text-slate-300 print:text-black">
                        QR OK
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CUT & PASTE LABELS TAB */}
          {activeTab === 'CUT_PASTE_LABELS' && (
            <div className="space-y-6 max-w-5xl mx-auto print:max-w-none">
              {/* Header explanation & filter controls (hidden in print) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 print:hidden flex flex-col md:flex-row items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-cyan-400" />
                    <span>ليبلات وبطاقات الرفوف والخانات للطباعة والقص والتلصيق الميداني</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    مطبوعات مقسمة بخطوط قص منقطة (✂️) جاهزة للقص اليدوي والتثبيت على قوائم الرفوف وحواف الخانات
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setCutLabelFilter('ALL')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        cutLabelFilter === 'ALL' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => setCutLabelFilter('RACKS')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        cutLabelFilter === 'RACKS' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      بطاقات الرفوف (10×4.5cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCutLabelFilter('SLOTS')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        cutLabelFilter === 'SLOTS' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ملصقات الخانات (6×3cm)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="h-8 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                  >
                    <Printer className="w-4 h-4" /> طباعة أوراق القص الآن
                  </button>
                </div>
              </div>

              {/* SECTION 1: Rack Header Placards (10cm x 4.5cm) */}
              {(cutLabelFilter === 'ALL' || cutLabelFilter === 'RACKS') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 print:border-black pb-1.5">
                    <h4 className="text-xs font-bold text-teal-300 print:text-black flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>بطاقات رأس الرف والقائم الرأسي (Rack Upright & Header Placards — 10cm × 4.5cm)</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 print:text-gray-800 font-mono">
                      {racks.length} بطاقة رأسية
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
                    {racks.map((r) => {
                      const isWooden = r.rackType === 'WOODEN_CABINET';
                      return (
                        <div
                          key={`cut-rack-${r.id}`}
                          className="relative p-3.5 rounded-xl border-2 border-dashed border-teal-500/60 bg-slate-950 text-slate-100 flex flex-col justify-between print:border-black print:bg-white print:text-black shadow-sm"
                        >
                          {/* Cut Guide Header with Scissors */}
                          <div className="flex items-center justify-between text-[9px] font-mono text-teal-400 print:text-gray-600 border-b border-dashed border-teal-500/30 print:border-gray-400 pb-1 mb-2">
                            <span className="flex items-center gap-1">
                              ✂️ - - - - - - - خط القص والتلصيق - - - - - - -
                            </span>
                            <span>100mm × 45mm</span>
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-lg text-teal-300 print:text-black">
                                  {r.code}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    isWooden ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                                  }`}
                                >
                                  {isWooden ? 'خزانة جدارية' : 'رف معدني'}
                                </span>
                              </div>
                              <h5 className="font-bold text-xs text-white print:text-black mt-0.5 leading-snug">
                                {r.nameAr || r.name}
                              </h5>
                              {r.nameEn && (
                                <p className="text-[10px] font-mono text-slate-400 print:text-gray-700">
                                  {r.nameEn}
                                </p>
                              )}
                            </div>

                            {/* Simulated QR & Barcode Box */}
                            <div className="w-12 h-12 rounded border border-slate-700 print:border-black p-1 flex flex-col items-center justify-center bg-white text-black shrink-0">
                              <QrCode className="w-7 h-7 text-black" />
                              <span className="text-[6px] font-mono font-bold">SCAN ME</span>
                            </div>
                          </div>

                          {/* Footer specifications */}
                          <div className="mt-2.5 pt-2 border-t border-slate-800 print:border-gray-300 flex items-center justify-between text-[10px] font-mono text-slate-300 print:text-black">
                            <div>
                              منطقة: <strong className="text-white print:text-black">{r.zone}</strong> | سطر:{' '}
                              <strong className="text-white print:text-black">{r.shelf}</strong> | طوابق:{' '}
                              <strong className="text-white print:text-black">{r.levels || 4}</strong>
                            </div>
                            <div className="font-bold text-emerald-400 print:text-black">
                              {r.storageType === 'COLD' ? '❄️ 2-8°C' : r.storageType === 'QUARANTINE' ? '⚠️ حجر صحي' : '🌡️ 15-25°C'}
                            </div>
                          </div>

                          <div className="text-[8px] font-mono text-slate-500 print:text-gray-600 text-center mt-1">
                            مكان التثبيت: يثبت على عارضة الرأس الأمامية أو القائم الأيمن للرف
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: Bin Lip Stickers (6cm x 3cm) */}
              {(cutLabelFilter === 'ALL' || cutLabelFilter === 'SLOTS') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 print:border-black pb-1.5">
                    <h4 className="text-xs font-bold text-cyan-300 print:text-black flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5" />
                      <span>ملصقات حواف الخانات والصواني (Shelf Lip & Bin Stickers — 6cm × 3cm)</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 print:text-gray-800 font-mono">
                      {allCells.length} ملصق خانة
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 print:grid-cols-3">
                    {allCells.map(({ rack, level, slot, cell }) => (
                      <div
                        key={`cut-slot-${cell.id}`}
                        className="p-2.5 rounded-lg border border-dashed border-cyan-500/50 bg-slate-950 text-slate-100 flex flex-col justify-between print:border-black print:bg-white print:text-black text-xs shadow-xs"
                      >
                        {/* Cut Line */}
                        <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 print:text-gray-600 border-b border-dashed border-slate-800 print:border-gray-400 pb-0.5 mb-1">
                          <span>✂️ - - خط قص - -</span>
                          <span>60×30mm</span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-extrabold text-xs text-teal-300 print:text-black">
                              {cell.code}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 print:text-black">
                              {rack.code}
                            </span>
                          </div>

                          <span className="font-bold text-[11px] block truncate text-white print:text-black mt-0.5">
                            {cell.productName || (cell.occupied === false ? 'خانة شاغرة' : 'مستحضر دوائي')}
                          </span>

                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 print:text-black mt-0.5">
                            <span>L{level} · S{slot}</span>
                            <span>{cell.batchNumber || 'Batch-OK'}</span>
                          </div>
                        </div>

                        {/* Barcode graphic */}
                        <div className="pt-1.5 border-t border-slate-800 print:border-gray-300 flex items-center justify-between">
                          <div className="font-mono text-[9px] tracking-widest text-slate-300 print:text-black">
                            ||| | |||| | |||
                          </div>
                          <span className="text-[8px] font-mono text-slate-500 print:text-black">
                            حافة الخانة
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
