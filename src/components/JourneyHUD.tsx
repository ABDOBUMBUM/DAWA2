/**
 * DAWA 3D Warehouse Engine — Customizable Horizontal & Multi-Mode 6 Fulfillment Stations HUD
 * (واجهة المحطات الست الأفقية القابلة للتخصيص الكامل والإخفاء)
 * Controls parcel PKG-572 simulation across 6 warehouse fulfillment zones
 * with full user control over arrangement orientation (Horizontal 6x1, Compact Bar, Grid 3x2, Grid 2x3, Vertical 1x6),
 * dock position (Top, Bottom, Left, Right), card scale, spacing, opacity, and visible fields.
 */

import React, { useState, useEffect } from 'react';
import {
  JOURNEY_STAGES,
  CameraMode,
  SixStationsLayoutConfig,
  DEFAULT_SIX_STATIONS_LAYOUT,
  StationsArrangementOrientation,
  StationsDockPosition,
} from '../types/warehouse';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Compass,
  EyeOff,
  Layers,
  Sliders,
  LayoutGrid,
  Columns,
  Rows,
  ArrowLeftRight,
  Check,
} from 'lucide-react';

interface JourneyHUDProps {
  isSimulating: boolean;
  currentStageIndex: number;
  simSpeed: number;
  cameraMode: CameraMode;
  onToggleSimulate: () => void;
  onSelectStage: (idx: number) => void;
  onChangeSpeed: (spd: number) => void;
  onChangeCameraMode: (mode: CameraMode) => void;
  onResetCamera: () => void;
}

const STORAGE_KEY_STATIONS_LAYOUT = 'dawa_3d_six_stations_layout_v2';

export const JourneyHUD: React.FC<JourneyHUDProps> = ({
  isSimulating,
  currentStageIndex,
  simSpeed,
  cameraMode,
  onToggleSimulate,
  onSelectStage,
  onChangeSpeed,
  onChangeCameraMode,
  onResetCamera,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  const [layout, setLayout] = useState<SixStationsLayoutConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATIONS_LAYOUT);
      if (saved) {
        return { ...DEFAULT_SIX_STATIONS_LAYOUT, ...JSON.parse(saved) };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_SIX_STATIONS_LAYOUT;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATIONS_LAYOUT, JSON.stringify(layout));
    } catch {
      // ignore storage errors
    }
  }, [layout]);

  const currentStage = JOURNEY_STAGES[currentStageIndex];

  const orderedStages = layout.reverseOrder
    ? [...JOURNEY_STAGES].map((stg, idx) => ({ stg, originalIdx: idx })).reverse()
    : JOURNEY_STAGES.map((stg, idx) => ({ stg, originalIdx: idx }));

  // Container positioning classes based on dockPosition
  const getDockContainerClasses = (pos: StationsDockPosition): string => {
    switch (pos) {
      case 'TOP_CENTER':
        return 'fixed top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[96vw]';
      case 'BOTTOM_CENTER':
        return 'fixed bottom-16 left-1/2 -translate-x-1/2 z-20 flex flex-col-reverse items-center max-w-[96vw]';
      case 'LEFT_SIDE':
        return 'fixed top-20 left-0 z-20 flex flex-row items-start max-w-[92vw]';
      case 'RIGHT_SIDE':
        return 'fixed top-20 right-0 z-20 flex flex-row-reverse items-start max-w-[92vw]';
    }
  };

  // Grid/Flex classes for the 6 stations based on orientation
  const getStagesGridClasses = (orient: StationsArrangementOrientation): string => {
    switch (orient) {
      case 'HORIZONTAL':
        return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 items-stretch';
      case 'COMPACT_BAR':
        return 'flex flex-row flex-wrap items-center justify-center';
      case 'GRID_3X2':
        return 'grid grid-cols-3 items-stretch';
      case 'GRID_2X3':
        return 'grid grid-cols-2 items-stretch';
      case 'VERTICAL':
        return 'flex flex-col w-72';
    }
  };

  const isHorizontalStyle =
    layout.orientation === 'HORIZONTAL' ||
    layout.orientation === 'COMPACT_BAR' ||
    layout.orientation === 'GRID_3X2';

  return (
    <>
      {/* 1. Active Stage Banner (Shown during active journey simulation) */}
      {isSimulating && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center pointer-events-none text-center bg-slate-950/90 border border-cyan-500/40 rounded-2xl px-5 py-2 shadow-xl backdrop-blur-md">
          <div className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 font-extrabold">
            DAWA NEXUS 3D · محاكاة المسار النشط
          </div>
          <h2 className="text-sm font-black text-white">
            {currentStage.stageNumber} / {currentStage.titleEn} · {currentStage.titleAr}
          </h2>
          <p className="text-[10px] text-slate-300 max-w-md">{currentStage.descriptionAr}</p>
        </div>
      )}

      {/* 2. Configurable 6 Fulfillment Stations Dock (أفقية افتراضياً مع إعدادات تفصيلية كاملة) */}
      <div
        className={`${getDockContainerClasses(layout.dockPosition)} pointer-events-none select-none`}
        dir="rtl"
      >
        {/* Main Stations Panel */}
        <div
          data-testid="journey-six-stations-panel"
          className={`pointer-events-auto transition-all duration-300 ease-in-out ${
            isCollapsed
              ? 'w-0 h-0 opacity-0 scale-95 overflow-hidden pointer-events-none'
              : 'opacity-100 scale-100'
          }`}
          style={{
            transform: !isCollapsed ? `scale(${layout.cardScale})` : undefined,
            transformOrigin:
              layout.dockPosition === 'TOP_CENTER'
                ? 'top center'
                : layout.dockPosition === 'BOTTOM_CENTER'
                ? 'bottom center'
                : layout.dockPosition === 'LEFT_SIDE'
                ? 'top left'
                : 'top right',
          }}
        >
          <div
            className={`rounded-2xl p-2.5 border shadow-2xl flex flex-col gap-2 backdrop-blur-xl ${
              isHorizontalStyle ? 'w-auto max-w-[95vw]' : 'w-80 max-h-[78vh] overflow-y-auto'
            }`}
            style={{
              background: `rgba(15, 23, 42, ${layout.panelOpacity})`,
              borderColor: 'rgba(56, 189, 248, 0.38)',
              color: '#f8fafc',
            }}
          >
            {/* Header Bar: Title + Quick Orientation Switcher + Detailed Settings Button + Hide Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5 border-slate-700/70">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400 shrink-0" />
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-white">
                    مسار المحطات الست بالمستودع (6 Stations)
                  </h3>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold">
                    {layout.orientation === 'HORIZONTAL'
                      ? 'ترتيب أفقي 6×1'
                      : layout.orientation === 'COMPACT_BAR'
                      ? 'شريط أفقي مدمج'
                      : layout.orientation === 'GRID_3X2'
                      ? 'شبكة أفقية 3×2'
                      : layout.orientation === 'GRID_2X3'
                      ? 'شبكة 2×3'
                      : 'ترتيب رأسي 1×6'}
                  </span>
                </div>
              </div>

              {/* Instant Orientation & Settings Controls */}
              <div className="flex items-center gap-1">
                {/* Quick 1-Click Horizontal / Grid / Vertical Switchers */}
                <button
                  type="button"
                  onClick={() =>
                    setLayout((prev) => ({
                      ...prev,
                      orientation: 'HORIZONTAL',
                      dockPosition:
                        prev.dockPosition === 'LEFT_SIDE' || prev.dockPosition === 'RIGHT_SIDE'
                          ? 'TOP_CENTER'
                          : prev.dockPosition,
                    }))
                  }
                  className={`px-2 py-1 rounded-lg border text-[10px] font-extrabold flex items-center gap-1 transition ${
                    layout.orientation === 'HORIZONTAL'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow'
                      : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title="ترتيب المحطات الست بشكل أفقي ممتد (6×1)"
                >
                  <Columns className="w-3 h-3" />
                  <span>أفقي 6×1</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setLayout((prev) => ({
                      ...prev,
                      orientation: 'GRID_3X2',
                    }))
                  }
                  className={`px-2 py-1 rounded-lg border text-[10px] font-extrabold flex items-center gap-1 transition ${
                    layout.orientation === 'GRID_3X2'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow'
                      : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title="ترتيب المحطات في شبكة أفقية (3 أعمدة × صفين)"
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>شبكة 3×2</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setLayout((prev) => ({
                      ...prev,
                      orientation: 'VERTICAL',
                      dockPosition: 'LEFT_SIDE',
                    }))
                  }
                  className={`px-2 py-1 rounded-lg border text-[10px] font-extrabold flex items-center gap-1 transition ${
                    layout.orientation === 'VERTICAL'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow'
                      : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title="ترتيب المحطات بشكل رأسي جانبي (1×6)"
                >
                  <Rows className="w-3 h-3" />
                  <span>رأسي</span>
                </button>

                {/* Detailed Layout Customizer Toggle */}
                <button
                  type="button"
                  data-testid="toggle-stations-layout-settings"
                  onClick={() => setShowLayoutSettings((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-extrabold flex items-center gap-1 transition ${
                    showLayoutSettings
                      ? 'bg-teal-500 text-slate-950 border-teal-300 shadow-md'
                      : 'bg-slate-800/90 hover:bg-slate-700 border-cyan-500/40 text-cyan-300'
                  }`}
                  title="التحكم الكامل في إعدادات شكل وترتيب المحطات بالتفصيل"
                >
                  <Sliders className="w-3 h-3" />
                  <span>إعدادات الترتيب بالتفصيل</span>
                </button>

                {/* Hide / Collapse Button */}
                <button
                  type="button"
                  data-testid="toggle-hide-six-stations"
                  onClick={() => setIsCollapsed(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-rose-500/25 border border-slate-700 hover:border-rose-500/40 text-[10px] font-bold text-slate-300 hover:text-rose-200 transition"
                  title="إخفاء واجهة المحطات الست لتوسيع مساحة الرؤية 3D"
                >
                  <EyeOff className="w-3 h-3 text-cyan-400" />
                  <span>إخفاء</span>
                </button>
              </div>
            </div>

            {/* Detailed Arrangement & Appearance Settings Drawer (إعدادات شكل الترتيب بالتفصيل الممل الكامل) */}
            {showLayoutSettings && (
              <div
                data-testid="stations-detailed-settings-panel"
                className="rounded-xl bg-slate-900/95 border border-teal-500/40 p-3 space-y-3 text-[11px]"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-black text-teal-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>تخصيص شكل وترتيب المحطات بالتفصيل الكامل</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setLayout(DEFAULT_SIX_STATIONS_LAYOUT)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold"
                  >
                    استعادة الافتراضي (أفقي)
                  </button>
                </div>

                {/* 1. Arrangement Mode (5 Modes) */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">
                    1. نمط وشكل هندسة الترتيب (Arrangement Pattern):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {[
                      { id: 'HORIZONTAL', label: 'أفقي ممتد (6×1)' },
                      { id: 'COMPACT_BAR', label: 'شريط كبسولات أفقي' },
                      { id: 'GRID_3X2', label: 'مصفوفة أفقية (3×2)' },
                      { id: 'GRID_2X3', label: 'مصفوفة عمودية (2×3)' },
                      { id: 'VERTICAL', label: 'قائمة رأسية (1×6)' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setLayout((prev) => ({
                            ...prev,
                            orientation: opt.id as StationsArrangementOrientation,
                          }))
                        }
                        className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold transition ${
                          layout.orientation === opt.id
                            ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Screen Dock Position & Sequence Direction */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">
                      2. موقع التثبيت على الشاشة (Dock Position):
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'TOP_CENTER', label: 'أعلى الوسط' },
                        { id: 'BOTTOM_CENTER', label: 'أسفل الوسط' },
                        { id: 'LEFT_SIDE', label: 'يسار الشاشة' },
                        { id: 'RIGHT_SIDE', label: 'يمين الشاشة' },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() =>
                            setLayout((prev) => ({
                              ...prev,
                              dockPosition: pos.id as StationsDockPosition,
                            }))
                          }
                          className={`py-1 px-1.5 rounded border text-[9px] font-bold transition ${
                            layout.dockPosition === pos.id
                              ? 'bg-teal-500/30 border-teal-400 text-teal-200'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">
                      3. اتجاه تسلسل المحطات (Sequence Order):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLayout((prev) => ({ ...prev, reverseOrder: false }))}
                        className={`py-1 px-2 rounded border text-[10px] font-bold flex items-center justify-center gap-1 ${
                          !layout.reverseOrder
                            ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>تصاعدي (01 ← 06)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayout((prev) => ({ ...prev, reverseOrder: true }))}
                        className={`py-1 px-2 rounded border text-[10px] font-bold flex items-center justify-center gap-1 ${
                          layout.reverseOrder
                            ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>عكسي (06 ← 01)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Sliders for Scale, Spacing (Gap), and Background Opacity */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800">
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">حجم الواجهة (Scale):</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {Math.round(layout.cardScale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.2"
                      step="0.05"
                      value={layout.cardScale}
                      onChange={(e) =>
                        setLayout((prev) => ({ ...prev, cardScale: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">تباعد المحطات (Gap):</span>
                      <span className="font-mono font-bold text-cyan-300">{layout.gapPx}px</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="16"
                      step="2"
                      value={layout.gapPx}
                      onChange={(e) =>
                        setLayout((prev) => ({ ...prev, gapPx: parseInt(e.target.value) || 6 }))
                      }
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">شفافية اللوحة (Opacity):</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {Math.round(layout.panelOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.35"
                      max="1.0"
                      step="0.05"
                      value={layout.panelOpacity}
                      onChange={(e) =>
                        setLayout((prev) => ({ ...prev, panelOpacity: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* 4. Granular Visibility Toggles */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold">عناصر البطاقة:</span>
                  {[
                    { key: 'showStageNumber', label: 'رقم المحطة (01-06)' },
                    { key: 'showEnglishTitle', label: 'الاسم الإنجليزي' },
                    { key: 'showDescription', label: 'الوصف التفصيلي' },
                    { key: 'showSimulateButton', label: 'زر محاكاة الطرد' },
                    { key: 'showCameraControls', label: 'أزرار تتبع الكاميرا' },
                  ].map((item) => {
                    const active = Boolean(layout[item.key as keyof SixStationsLayoutConfig]);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          setLayout((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key as keyof SixStationsLayoutConfig],
                          }))
                        }
                        className={`px-2 py-1 rounded-lg border text-[9px] font-bold flex items-center gap-1 transition ${
                          active
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        {active && <Check className="w-2.5 h-2.5" />}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6 Stage Buttons Container (Horizontal 6x1 by default!) */}
            <div
              className={getStagesGridClasses(layout.orientation)}
              style={{ gap: `${layout.gapPx}px` }}
            >
              {orderedStages.map(({ stg, originalIdx }) => {
                const isActive = isSimulating && currentStageIndex === originalIdx;
                return (
                  <button
                    key={stg.id}
                    type="button"
                    onClick={() => onSelectStage(originalIdx)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl transition text-start border ${
                      layout.orientation === 'HORIZONTAL' ? 'min-w-[140px]' : ''
                    } ${
                      isActive
                        ? 'border-cyan-400 bg-cyan-950/80 text-cyan-300 shadow-md ring-1 ring-cyan-400'
                        : 'border-slate-800 bg-slate-900/75 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800/90'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {layout.showStageNumber && (
                        <span className="font-mono text-[10px] font-bold text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded border border-cyan-500/25 shrink-0">
                          {stg.stageNumber}
                        </span>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-[11px] text-white truncate">
                          {stg.titleAr}
                        </span>
                        {layout.showEnglishTitle && (
                          <span className="text-[9px] text-slate-400 font-mono truncate">
                            {stg.titleEn}
                          </span>
                        )}
                        {layout.showDescription && (
                          <span className="text-[8px] text-slate-400 line-clamp-1 mt-0.5">
                            {stg.descriptionAr}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Controls inside HUD (Simulate + Camera Quick Switch) */}
            {(layout.showSimulateButton || layout.showCameraControls) && (
              <div
                className={`flex ${
                  isHorizontalStyle
                    ? 'flex-wrap items-center justify-between gap-2'
                    : 'flex-col gap-2'
                } pt-1 border-t border-slate-800/80`}
              >
                {layout.showSimulateButton && (
                  <button
                    type="button"
                    onClick={onToggleSimulate}
                    className={`${
                      isHorizontalStyle ? 'px-4 h-7' : 'w-full h-8'
                    } rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-lg transition bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500`}
                  >
                    {isSimulating ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isSimulating ? 'إيقاف محاكاة الطرد' : '▶ محاكاة رحلة الطرد PKG-572'}
                    </span>
                  </button>
                )}

                {layout.showCameraControls && (
                  <div className="flex items-center gap-1 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => onChangeCameraMode('FOLLOW_PACKAGE')}
                      className={`px-2.5 py-1 rounded-lg border transition ${
                        cameraMode === 'FOLLOW_PACKAGE'
                          ? 'bg-cyan-600 text-white border-cyan-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                      }`}
                    >
                      📦 تتبع الطرد
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeCameraMode('FOLLOW_WORKER')}
                      className={`px-2.5 py-1 rounded-lg border transition ${
                        cameraMode === 'FOLLOW_WORKER'
                          ? 'bg-cyan-600 text-white border-cyan-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                      }`}
                    >
                      🚶‍♂️ تتبع العامل
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeCameraMode('ORBIT')}
                      className={`px-2.5 py-1 rounded-lg border transition ${
                        cameraMode === 'ORBIT'
                          ? 'bg-cyan-600 text-white border-cyan-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                      }`}
                    >
                      🌐 كاميرا حرة
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Toggle Tab when collapsed (or subtle handle when open) */}
        {isCollapsed && (
          <button
            type="button"
            data-testid="toggle-six-stations-tab"
            onClick={() => setIsCollapsed(false)}
            className="pointer-events-auto flex items-center gap-2 py-1.5 px-4 rounded-b-2xl bg-slate-950/95 border border-cyan-400/60 text-cyan-300 hover:bg-slate-900 shadow-2xl transition-all backdrop-blur-xl"
            title="إظهار شريط المحطات الست"
          >
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs font-extrabold">إظهار المحطات الست (6 Stations)</span>
            <ChevronDown className="w-4 h-4 text-cyan-400 animate-bounce" />
          </button>
        )}
      </div>

      {/* 3. Bottom Playback HUD (Speed, Play/Pause, Reset) */}
      <div
        className="absolute bottom-20 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-xl border border-slate-700/60 text-white text-xs font-bold pointer-events-auto"
        style={{ background: 'rgba(15, 23, 42, 0.92)' }}
      >
        <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase">
          PLAYBACK
        </span>
        <button
          type="button"
          onClick={onToggleSimulate}
          className="p-1 rounded text-cyan-300 hover:text-white"
        >
          {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <div className="flex items-center gap-0.5 border-s border-e px-1.5 border-slate-700">
          {[1, 2, 4, 8].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => onChangeSpeed(spd)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition ${
                simSpeed === spd
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onResetCamera}
          className="p-1 rounded text-slate-400 hover:text-white"
          title="إعادة ضبط الكاميرا (R)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <Compass className="w-3.5 h-3.5 text-teal-400 ml-0.5" />
      </div>
    </>
  );
};
