/**
 * DAWA 3D Warehouse Engine — Top Navigation Bar & Action Toolbar
 * Includes medicine search, Real-Time DB Item Locator view, Global Edit Lock toggle,
 * Walls & Textures Studio shortcut, CAD tools, worker dispatch, persona switcher,
 * 3D floating labels toggle, certified A4 printable manifest export, and day/night themes.
 */

import React from 'react';
import {
  Plus,
  DoorOpen,
  Maximize,
  RotateCcw,
  Save,
  Sun,
  Moon,
  Keyboard,
  ShieldCheck,
  Search,
  UserCheck,
  Compass,
  FileSpreadsheet,
  Tag,
  User,
  PackageCheck,
  Lock,
  Unlock,
  Database,
  Palette,
  Undo2,
  Redo2,
  Layers,
  FileCode2,
} from 'lucide-react';
import { WarehouseDimensions } from '../types/warehouse';

interface NavbarProps {
  dimensions: WarehouseDimensions;
  totalLocations: number;
  dirtyCount: number;
  isDesigner: boolean;
  isDarkTheme: boolean;
  isEditLocked?: boolean;
  searchQuery: string;
  showFloatingLabels: boolean;
  showWorker: boolean;
  isOrderPickingOpen: boolean;
  realtimeItemCount?: number;
  onSearchChange: (q: string) => void;
  onToggleRole: () => void;
  onToggleTheme: () => void;
  onToggleEditLock?: () => void;
  onToggleFloatingLabels: () => void;
  onToggleWorker: () => void;
  onToggleOrderPicking: () => void;
  onOpenItemLocator?: () => void;
  onOpenMatrixExplorer?: () => void;
  onOpenAntigravityGuide?: () => void;
  onOpenEnvironmentStudio?: () => void;
  onOpenAddRack: () => void;
  onOpenAddElement: () => void;
  onOpenExpand: () => void;
  onOpenShortcuts: () => void;
  onOpenPublish: () => void;
  onOpenExportReport: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onReset: () => void;
  onSave: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  dimensions,
  totalLocations,
  dirtyCount,
  isDesigner,
  isDarkTheme,
  isEditLocked = false,
  searchQuery,
  showFloatingLabels,
  showWorker,
  isOrderPickingOpen,
  realtimeItemCount = 0,
  onSearchChange,
  onToggleRole,
  onToggleTheme,
  onToggleEditLock,
  onToggleFloatingLabels,
  onToggleWorker,
  onToggleOrderPicking,
  onOpenItemLocator,
  onOpenMatrixExplorer,
  onOpenAntigravityGuide,
  onOpenEnvironmentStudio,
  onOpenAddRack,
  onOpenAddElement,
  onOpenExpand,
  onOpenShortcuts,
  onOpenPublish,
  onOpenExportReport,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onReset,
  onSave,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/95 px-3 sm:px-4 flex items-center justify-between gap-2 text-white select-none z-30 shrink-0 backdrop-blur-md">
      {/* Brand & Stats */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40 shadow-sm">
          <Compass className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-xs sm:text-sm text-white tracking-wide">
              محرك المستودع 3D والرحلة الحية
            </h1>
            <span className="hidden xl:inline-block rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 text-[10px] font-bold">
              Realtime 3D CAD
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <span>الأبعاد: {dimensions.ww}×{dimensions.wd}م</span>
            <span>·</span>
            <span>الرفوف: {totalLocations}</span>
            {dirtyCount > 0 && (
              <span className="text-amber-400 font-bold">· ({dirtyCount} غير محفوظ)</span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Search Medicine / Barcode */}
      <div className="relative flex-1 max-w-xs hidden lg:block">
        <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ابحث عن دواء، باركود، رقم رف، كود خانة..."
          className="w-full h-8 rounded-xl bg-slate-800/90 border border-slate-700/80 pr-8 pl-3 text-xs text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {/* Matrix Explorer Button (استعراض الـ Matrix والأخشاب الأفقية) */}
        {onOpenMatrixExplorer && (
          <button
            type="button"
            data-testid="navbar-matrix-explorer-btn"
            onClick={onOpenMatrixExplorer}
            className="h-8 px-2.5 rounded-xl bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition shrink-0"
            title="استعراض الـ Matrix — ترتيب الأدوية على ألواح خشبية أفقية فوق بعضها ونظام التنبيهات المرئية للتوريد"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>🪵 استعراض الـ Matrix</span>
          </button>
        )}

        {/* Antigravity Guide & Ashraf Empty Handover Button */}
        {onOpenAntigravityGuide && (
          <button
            type="button"
            data-testid="navbar-antigravity-guide-btn"
            onClick={onOpenAntigravityGuide}
            className="h-8 px-2.5 rounded-xl bg-indigo-600/35 hover:bg-indigo-600/55 border border-indigo-400/50 text-indigo-200 font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition shrink-0"
            title="ملف تعريف Antigravity الشامل ووضع تسليم المستودع للمشرف أشرف بخانات فارغة"
          >
            <FileCode2 className="w-3.5 h-3.5 text-indigo-300" />
            <span>📘 دليل Antigravity وتسليم أشرف</span>
          </button>
        )}

        {/* Dedicated Real-Time Item Locator & DB Sync View */}
        {onOpenItemLocator && (
          <button
            type="button"
            onClick={onOpenItemLocator}
            className="h-8 px-2.5 rounded-xl bg-gradient-to-l from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition shrink-0"
            title="فتح مستكشف وموجه الأصناف والخانات الحقيقي (طلبيات / منتهيات / مرتجعات / باركود) والتوجيه المباشر على الخريطة 3D"
          >
            <Database className="w-3.5 h-3.5" />
            <span>مستكشف الأصناف ({realtimeItemCount || 69})</span>
          </button>
        )}

        {/* Global Edit Lock Toggle */}
        {onToggleEditLock && (
          <button
            type="button"
            onClick={onToggleEditLock}
            className={`h-8 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border shrink-0 ${
              isEditLocked
                ? 'bg-rose-600/30 text-rose-200 border-rose-500/60 hover:bg-rose-600/40'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="قفل أو فتح تحريك وتعديل الرفوف والعناصر (اختصار L)"
          >
            {isEditLocked ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isEditLocked ? 'التعديل: مقفل' : 'التعديل: متاح'}</span>
          </button>
        )}

        {/* Warehouse Walls, Textures & Backgrounds Studio */}
        {onOpenEnvironmentStudio && (
          <button
            type="button"
            onClick={onOpenEnvironmentStudio}
            className="h-8 px-2.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 font-bold text-xs flex items-center gap-1.5 transition shrink-0"
            title="التحكم بجدران المستودع، الخامات (Textures)، الخلفيات، والمساحة المفتوحة"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-300" />
            <span className="hidden md:inline">الجدران والخامات</span>
          </button>
        )}

        {/* Toggle 3D Bilingual Floating Labels */}
        <button
          type="button"
          onClick={onToggleFloatingLabels}
          className={`h-8 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border shrink-0 ${
            showFloatingLabels
              ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50 hover:bg-cyan-600/40'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title="إظهار أو إخفاء التسميات ثلاثية الأبعاد العائمة فوق كل رفوخانة"
        >
          <Tag className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">تسميات 3D</span>
        </button>

        {/* Toggle 3D Human Worker on Map */}
        <button
          type="button"
          onClick={onToggleWorker}
          className={`h-8 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border shrink-0 ${
            showWorker
              ? 'bg-amber-600/30 text-amber-300 border-amber-500/50 hover:bg-amber-600/40'
              : 'bg-slate-800/80 text-slate-500 border-slate-700 hover:text-slate-300'
          }`}
          title="إظهار أو إخفاء العامل البشري ومسارات حركته في الخريطة ثلاثية الأبعاد"
        >
          <User className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">{showWorker ? 'العامل: ظاهر' : 'العامل: مخفي'}</span>
        </button>

        {/* Order Picking Mission HUD */}
        <button
          type="button"
          onClick={onToggleOrderPicking}
          className={`h-8 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border shrink-0 ${
            isOrderPickingOpen
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-md'
              : 'bg-slate-800/90 text-cyan-300 border-slate-700 hover:border-cyan-500/50'
          }`}
          title="فتح لوحة مهمة تجهيز وتجميع الطلبية وتوجيه الموظفين"
        >
          <PackageCheck className="w-3.5 h-3.5" />
          <span className="hidden md:inline">مهمة الطلبية</span>
        </button>

        {/* Master Manifest / Export A4 Sheet */}
        <button
          type="button"
          onClick={onOpenExportReport}
          className="h-8 px-2.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-sm transition shrink-0"
          title="فتح كشف الجرد والاعتماد الورقي A4 والتصدير الكامل لـ Excel و CSV"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">كشف A4</span>
        </button>

        {/* Role Switcher */}
        <button
          type="button"
          onClick={onToggleRole}
          className={`h-8 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border shrink-0 ${
            isDesigner
              ? 'bg-teal-600/30 text-teal-300 border-teal-500/50 hover:bg-teal-600/40'
              : 'bg-amber-600/30 text-amber-300 border-amber-500/50 hover:bg-amber-600/40'
          }`}
          title="تبديل الصلاحية بين المشرف أشرف (تصميم CAD كامل) وبين المجهزين محمد ومرعي (استكشاف وسحب)"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">{isDesigner ? 'أشرف (تصميم)' : 'محمد ومرعي'}</span>
        </button>

        {/* CAD Tools (Only for Ashraf / Designer) */}
        {isDesigner && (
          <>
            <button
              type="button"
              onClick={onOpenAddRack}
              className="h-8 px-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm shrink-0"
              title="إضافة رف معدني صناعي أو خزانة جدارية خشبية للأدوية"
            >
              <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">إضافة رف</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddElement}
              className="h-8 px-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 shrink-0"
            >
              <DoorOpen className="w-3.5 h-3.5 text-blue-400" /> <span className="hidden sm:inline">عناصر CAD</span>
            </button>
            <button
              type="button"
              onClick={onOpenExpand}
              className="h-8 px-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 shrink-0"
              title="توسيع أبعاد المستودع بالمتر"
            >
              <Maximize className="w-3.5 h-3.5 text-cyan-400" />
            </button>
            <button
              type="button"
              onClick={onOpenPublish}
              className="h-8 px-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 shrink-0"
              title="نشر الإصدار المعتمد وإدارة صلاحيات الرؤية"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> <span className="hidden xl:inline">نشر</span>
            </button>
          </>
        )}

        {/* Undo / Redo History Stack Buttons */}
        {onUndo && (
          <div className="flex items-center gap-1 border-x border-slate-800 px-1.5 shrink-0">
            <button
              type="button"
              data-testid="navbar-undo-btn"
              disabled={!canUndo}
              onClick={onUndo}
              className="h-8 px-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-cyan-300 font-bold text-xs flex items-center gap-1 transition"
              title="تراجع عن آخر تعديل أو إضافة أو حذف (Ctrl + Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">تراجع</span>
            </button>
            <button
              type="button"
              data-testid="navbar-redo-btn"
              disabled={!canRedo}
              onClick={onRedo}
              className="h-8 px-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-teal-300 font-bold text-xs flex items-center gap-1 transition"
              title="إعادة تطبيق التعديل المتراجع عنه (Ctrl + Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">إعادة</span>
            </button>
          </div>
        )}

        {/* Daylight / Night CAD Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="h-8 w-8 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center justify-center shrink-0"
          title={isDarkTheme ? 'التبديل إلى النمط النهاري الواقعي' : 'التبديل إلى النمط الداكن الهندسي CAD'}
        >
          {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Shortcuts Guide */}
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="h-8 w-8 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-teal-300 flex items-center justify-center shrink-0"
          title="دليل اختصارات لوحة المفاتيح والماوس (? / K)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Reset & Save */}
        {dirtyCount > 0 && (
          <>
            <button
              type="button"
              onClick={onReset}
              className="h-8 px-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" /> تراجع
            </button>
            <button
              type="button"
              onClick={onSave}
              className="h-8 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow shrink-0"
            >
              <Save className="w-3.5 h-3.5" /> حفظ ({dirtyCount})
            </button>
          </>
        )}
      </div>
    </header>
  );
};
