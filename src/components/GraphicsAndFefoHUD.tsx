import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ShieldAlert,
  Sun,
  Layers,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Flame,
  Clock,
  CheckCircle2,
  Crosshair,
  PackageMinus,
  Sliders,
  Wind,
  Cpu,
  Mic,
  MicOff,
  Volume2,
} from 'lucide-react';
import {
  WarehouseRack,
  GraphicsQualityConfig,
  GraphicsQualityPreset,
  FefoRadarConfig,
  RealTimeCellInventoryItem,
  resolveRackCell,
  computeCellExpiryStatus,
} from '../types/warehouse';

interface GraphicsAndFefoHUDProps {
  racks: WarehouseRack[];
  realtimeInventory?: RealTimeCellInventoryItem[];
  graphicsConfig: GraphicsQualityConfig;
  onUpdateGraphicsConfig: (cfg: GraphicsQualityConfig) => void;
  fefoRadar: FefoRadarConfig;
  onUpdateFefoRadar: (cfg: FefoRadarConfig) => void;
  onFocusCell: (rackId: string, level: number, slot: number, cellCode: string) => void;
  onQuarantineCell?: (rackId: string, level: number, slot: number, qty: number) => void;
  onVoiceTranscript?: (transcript: string) => void;
  externalOpenFefo?: boolean;
}

export interface CriticalCellEntry {
  rackId: string;
  rackCode: string;
  rackName: string;
  level: number;
  slot: number;
  cellCode: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  tier: 'EXPIRED' | 'CRITICAL_30D' | 'WARNING_90D';
  daysRemaining: number;
  badgeTextAr: string;
  colorHex: string;
}

export const GraphicsAndFefoHUD: React.FC<GraphicsAndFefoHUDProps> = ({
  racks,
  realtimeInventory = [],
  graphicsConfig,
  onUpdateGraphicsConfig,
  fefoRadar,
  onUpdateFefoRadar,
  onFocusCell,
  onQuarantineCell,
  onVoiceTranscript,
  externalOpenFefo,
}) => {
  const [openPanel, setOpenPanel] = useState<'NONE' | 'GRAPHICS' | 'FEFO' | 'VOICE'>('NONE');
  const [tourIndex, setTourIndex] = useState(0);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [lastVoiceText, setLastVoiceText] = useState<string>('');
  const [voiceLang, setVoiceLang] = useState<'ar-SA' | 'en-US'>('ar-SA');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (externalOpenFefo) {
      setOpenPanel('FEFO');
    }
  }, [externalOpenFefo]);

  // Scan all warehouse cells in real time for FEFO status, prioritizing SQLite realtimeInventory
  const fefoSummary = useMemo(() => {
    let expiredCount = 0;
    let critical30Count = 0;
    let warning90Count = 0;
    let safeCount = 0;
    const criticalList: CriticalCellEntry[] = [];

    const dbByKey = new Map<string, RealTimeCellInventoryItem>();
    for (const item of realtimeInventory) {
      dbByKey.set(`${item.rackId}-${item.level}-${item.slot}`, item);
    }

    for (const rack of racks) {
      const levels = rack.levels || 4;
      const slots = rack.cellsPerLevel || 3;
      for (let l = 1; l <= levels; l++) {
        for (let s = 1; s <= slots; s++) {
          const dbItem = dbByKey.get(`${rack.id}-${l}-${s}`);
          const cell = resolveRackCell(rack, l, s);
          const qty = dbItem ? dbItem.quantity : (cell.quantity ?? 75);
          if (qty <= 0 || cell.occupied === false) continue;

          const expDate = dbItem ? dbItem.expiryDate : cell.expiryDate;
          const movCat = dbItem ? dbItem.movementCategory : cell.movementCategory;
          const prodName = dbItem ? dbItem.productName : (cell.productName || 'صنف دوائي');
          const batchNum = dbItem ? dbItem.batchNumber : (cell.batchNumber || '-');
          const cellCode = dbItem ? dbItem.cellCode : cell.code;

          const ev = computeCellExpiryStatus(expDate, movCat);
          if (ev.tier === 'EXPIRED') {
            expiredCount++;
            criticalList.push({
              rackId: rack.id,
              rackCode: rack.code,
              rackName: rack.name,
              level: l,
              slot: s,
              cellCode,
              productName: prodName,
              batchNumber: batchNum,
              expiryDate: expDate || '-',
              quantity: qty,
              tier: 'EXPIRED',
              daysRemaining: ev.daysRemaining,
              badgeTextAr: ev.labelAr,
              colorHex: ev.colorHex,
            });
          } else if (ev.tier === 'CRITICAL_30D') {
            critical30Count++;
            criticalList.push({
              rackId: rack.id,
              rackCode: rack.code,
              rackName: rack.name,
              level: l,
              slot: s,
              cellCode,
              productName: prodName,
              batchNumber: batchNum,
              expiryDate: expDate || '-',
              quantity: qty,
              tier: 'CRITICAL_30D',
              daysRemaining: ev.daysRemaining,
              badgeTextAr: ev.labelAr,
              colorHex: ev.colorHex,
            });
          } else if (ev.tier === 'WARNING_90D') {
            warning90Count++;
            criticalList.push({
              rackId: rack.id,
              rackCode: rack.code,
              rackName: rack.name,
              level: l,
              slot: s,
              cellCode,
              productName: prodName,
              batchNumber: batchNum,
              expiryDate: expDate || '-',
              quantity: qty,
              tier: 'WARNING_90D',
              daysRemaining: ev.daysRemaining,
              badgeTextAr: ev.labelAr,
              colorHex: ev.colorHex,
            });
          } else if (ev.tier === 'SAFE') {
            safeCount++;
          }
        }
      }
    }

    criticalList.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      expiredCount,
      critical30Count,
      warning90Count,
      safeCount,
      urgentTotal: expiredCount + critical30Count + warning90Count,
      criticalList,
    };
  }, [racks, realtimeInventory]);

  const filteredCriticalCells = useMemo(() => {
    return fefoSummary.criticalList.filter((item) => {
      if (fefoRadar.filter === 'EXPIRED_ONLY') return item.tier === 'EXPIRED';
      if (fefoRadar.filter === 'WITHIN_30_DAYS') return item.tier === 'EXPIRED' || item.tier === 'CRITICAL_30D';
      return true;
    });
  }, [fefoSummary.criticalList, fefoRadar.filter]);

  const applyPreset = (preset: GraphicsQualityPreset) => {
    if (preset === 'ULTRA_4K') {
      onUpdateGraphicsConfig({
        ...graphicsConfig,
        preset: 'ULTRA_4K',
        dprScale: 2.0,
        shadowMapSize: 4096,
        floorReflectivity: 0.85,
        exposure: 1.18,
        spotlightIntensity: 1.5,
        volumetricBeams: true,
        anisotropyLevel: 16,
      });
    } else if (preset === 'HIGH_2K') {
      onUpdateGraphicsConfig({
        ...graphicsConfig,
        preset: 'HIGH_2K',
        dprScale: 1.5,
        shadowMapSize: 2048,
        floorReflectivity: 0.55,
        exposure: 1.12,
        spotlightIntensity: 1.25,
        volumetricBeams: true,
        anisotropyLevel: 8,
      });
    } else {
      onUpdateGraphicsConfig({
        ...graphicsConfig,
        preset: 'BALANCED_MOBILE',
        dprScale: 1.0,
        shadowMapSize: 1024,
        floorReflectivity: 0.25,
        exposure: 1.05,
        spotlightIntensity: 1.0,
        volumetricBeams: false,
        anisotropyLevel: 4,
      });
    }
  };

  const handleNextCriticalTour = () => {
    if (filteredCriticalCells.length === 0) return;
    if (!fefoRadar.enabled) {
      onUpdateFefoRadar({ ...fefoRadar, enabled: true });
    }
    const idx = tourIndex % filteredCriticalCells.length;
    const target = filteredCriticalCells[idx];
    setTourIndex((prev) => (prev + 1) % Math.max(1, filteredCriticalCells.length));
    onFocusCell(target.rackId, target.level, target.slot, target.cellCode);
  };

  // Web Speech API Voice Recognition Starter
  const toggleVoiceRecognition = () => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (isListeningVoice && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListeningVoice(false);
      return;
    }

    if (!SpeechRec) {
      setOpenPanel(openPanel === 'VOICE' ? 'NONE' : 'VOICE');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = voiceLang;
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListeningVoice(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setLastVoiceText(transcript);
          onVoiceTranscript?.(transcript);
        }
      };

      rec.onerror = () => {
        setIsListeningVoice(false);
        setOpenPanel('VOICE');
      };

      rec.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = rec;
      rec.start();
      setOpenPanel('VOICE');
    } catch {
      setIsListeningVoice(false);
      setOpenPanel('VOICE');
    }
  };

  const executeVoiceSample = (cmd: string) => {
    setLastVoiceText(cmd);
    onVoiceTranscript?.(cmd);
  };

  return (
    <div
      className="fixed top-14 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 w-auto max-w-[94vw] pointer-events-auto"
      dir="rtl"
    >
      {/* Top Bar Buttons: 4K Ultra Graphics + FEFO Expiry Radar + Web Speech Voice Control */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {/* 1. 4K Ultra Quality, Motion Blur & LOD Control Toggle */}
        <button
          type="button"
          onClick={() => setOpenPanel(openPanel === 'GRAPHICS' ? 'NONE' : 'GRAPHICS')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold border shadow-lg backdrop-blur-md transition-all ${
            openPanel === 'GRAPHICS'
              ? 'bg-cyan-600 text-white border-cyan-400 shadow-cyan-500/25'
              : 'bg-slate-900/95 text-white border-slate-700/80 hover:bg-slate-800'
          }`}
          title="إعدادات دقة 4K Ultra وضبابية الحركة (Motion Blur) ونظام LOD"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            {graphicsConfig.preset === 'ULTRA_4K'
              ? 'دقة 4K ULTRA'
              : graphicsConfig.preset === 'HIGH_2K'
              ? 'دقة 2K HIGH'
              : 'أداء متوازن Mobile'}
          </span>
          <span className="text-[10px] font-mono text-cyan-300">
            · {graphicsConfig.shadowMapSize}px
          </span>
          {graphicsConfig.motionBlur && (
            <span className="text-[10px] font-mono text-amber-300">· MotionBlur</span>
          )}
          {openPanel === 'GRAPHICS' ? (
            <ChevronUp className="w-3.5 h-3.5 opacity-80" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          )}
        </button>

        {/* 2. FEFO Expiry Radar Toggle & Live DB Alert Counter */}
        <button
          type="button"
          onClick={() => {
            if (openPanel !== 'FEFO') {
              setOpenPanel('FEFO');
              if (!fefoRadar.enabled) {
                onUpdateFefoRadar({ ...fefoRadar, enabled: true });
              }
            } else {
              setOpenPanel('NONE');
            }
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold border shadow-lg backdrop-blur-md transition-all ${
            fefoRadar.enabled
              ? 'bg-rose-600 text-white border-rose-400 shadow-rose-600/30'
              : openPanel === 'FEFO'
              ? 'bg-slate-800 text-white border-rose-500/60'
              : 'bg-slate-900/95 text-white border-slate-700/80 hover:bg-slate-800'
          }`}
          title="رادار الصلاحية FEFO والتنبيه البصري للخانات المنتهية والمقربة من قاعدة البيانات"
        >
          <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${fefoRadar.enabled ? 'text-white' : 'text-rose-400'}`} />
          <span>رادار الصلاحية FEFO</span>
          <span className="font-mono text-[10px] font-black text-amber-200">
            ({fefoSummary.expiredCount} منتهي · {fefoSummary.critical30Count + fefoSummary.warning90Count} مقرب)
          </span>
        </button>

        {/* 3. Web Speech API Voice Command Interface Button */}
        <button
          type="button"
          onClick={toggleVoiceRecognition}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border shadow-lg backdrop-blur-md transition-all ${
            isListeningVoice
              ? 'bg-emerald-600 text-white border-emerald-400 animate-pulse'
              : openPanel === 'VOICE'
              ? 'bg-indigo-600 text-white border-indigo-400'
              : 'bg-slate-900/95 text-white border-slate-700/80 hover:bg-slate-800'
          }`}
          title="الأوامر الصوتية الذكية (Web Speech API) — تحدث لاختيار الرفوف أو إظهار تنبيهات الصلاحية"
        >
          {isListeningVoice ? (
            <Mic className="w-3.5 h-3.5 text-white animate-bounce" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>{isListeningVoice ? 'جاري الاستماع...' : 'الأوامر الصوتية'}</span>
        </button>
      </div>

      {/* PANEL 1: Adaptive 4K Quality, Motion Blur & LOD Manager Control Bar */}
      {openPanel === 'GRAPHICS' && (
        <div className="w-[360px] bg-slate-950/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-4 shadow-2xl text-white space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <div>
                <h3 className="text-xs font-black text-white">محرك العرض 4K Ultra و Motion Blur و LOD</h3>
                <p className="text-[10px] text-slate-400">تحكم فوري بدقة الخامات وضبابية الحركة ومستوى التفاصيل</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpenPanel('NONE')}
              className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
            >
              إغلاق
            </button>
          </div>

          {/* Preset Selector */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset('ULTRA_4K')}
              className={`py-2 px-2 rounded-xl text-center border transition-all ${
                graphicsConfig.preset === 'ULTRA_4K'
                  ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200 font-black shadow-inner'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-[11px] font-extrabold">4K ULTRA</div>
              <div className="text-[9px] opacity-80">انعكاس كامل + 4096</div>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('HIGH_2K')}
              className={`py-2 px-2 rounded-xl text-center border transition-all ${
                graphicsConfig.preset === 'HIGH_2K'
                  ? 'bg-teal-600/30 border-teal-400 text-teal-200 font-black shadow-inner'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-[11px] font-extrabold">2K HIGH</div>
              <div className="text-[9px] opacity-80">جودة عالية 2048</div>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('BALANCED_MOBILE')}
              className={`py-2 px-2 rounded-xl text-center border transition-all ${
                graphicsConfig.preset === 'BALANCED_MOBILE'
                  ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-black shadow-inner'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-[11px] font-extrabold">BALANCED</div>
              <div className="text-[9px] opacity-80">أعلى سرعة للموبايل</div>
            </button>
          </div>

          {/* Live Sliders */}
          <div className="space-y-2.5 pt-1">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  لمعان وانعكاس الأرضية (Epoxy Clearcoat)
                </span>
                <span className="font-mono text-cyan-300 font-bold">
                  {Math.round(graphicsConfig.floorReflectivity * 100)}%
                </span>
              </div>
              <input
                type="range"
                aria-label="لمعان وانعكاس الأرضية"
                min={0}
                max={1}
                step={0.05}
                value={graphicsConfig.floorReflectivity}
                onChange={(e) =>
                  onUpdateGraphicsConfig({
                    ...graphicsConfig,
                    floorReflectivity: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  السطوع السينمائي (ACES Exposure)
                </span>
                <span className="font-mono text-amber-300 font-bold">
                  {graphicsConfig.exposure.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                aria-label="السطوع السينمائي"
                min={0.65}
                max={1.75}
                step={0.05}
                value={graphicsConfig.exposure}
                onChange={(e) =>
                  onUpdateGraphicsConfig({
                    ...graphicsConfig,
                    exposure: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  شدة كشافات السقف والظلال
                </span>
                <span className="font-mono text-emerald-300 font-bold">
                  {Math.round(graphicsConfig.spotlightIntensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                aria-label="شدة كشافات السقف والظلال"
                min={0.5}
                max={2.2}
                step={0.05}
                value={graphicsConfig.spotlightIntensity}
                onChange={(e) =>
                  onUpdateGraphicsConfig({
                    ...graphicsConfig,
                    spotlightIntensity: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Product & Cell Clarity / Transparency Control (تعديل وضوح وشفافية المنتجات في الخانات) */}
            <div className="rounded-xl bg-slate-900/90 border border-cyan-500/35 p-2.5 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-cyan-300 font-extrabold flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  وضوح وشفافية المنتجات بالخانات (Product Opacity)
                </span>
                <span className="font-mono text-cyan-300 font-black">
                  {Math.round((graphicsConfig.productOpacity ?? 1.0) * 100)}%
                </span>
              </div>
              <input
                type="range"
                data-testid="global-product-opacity-slider"
                aria-label="وضوح وشفافية المنتجات بالخانات"
                min={0.15}
                max={1.0}
                step={0.05}
                value={graphicsConfig.productOpacity ?? 1.0}
                onChange={(e) =>
                  onUpdateGraphicsConfig({
                    ...graphicsConfig,
                    productOpacity: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                <button
                  type="button"
                  data-testid="preset-opacity-xray"
                  onClick={() =>
                    onUpdateGraphicsConfig({
                      ...graphicsConfig,
                      productOpacity: 0.3,
                    })
                  }
                  className={`py-1 rounded-lg text-[10px] font-bold border transition ${
                    Math.abs((graphicsConfig.productOpacity ?? 1.0) - 0.3) < 0.05
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black'
                      : 'bg-slate-950 text-cyan-300 border-slate-800 hover:border-cyan-500/50'
                  }`}
                >
                  شفاف X-Ray (30%)
                </button>
                <button
                  type="button"
                  data-testid="preset-opacity-semi"
                  onClick={() =>
                    onUpdateGraphicsConfig({
                      ...graphicsConfig,
                      productOpacity: 0.6,
                    })
                  }
                  className={`py-1 rounded-lg text-[10px] font-bold border transition ${
                    Math.abs((graphicsConfig.productOpacity ?? 1.0) - 0.6) < 0.05
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black'
                      : 'bg-slate-950 text-cyan-300 border-slate-800 hover:border-cyan-500/50'
                  }`}
                >
                  نصف شفاف (60%)
                </button>
                <button
                  type="button"
                  data-testid="preset-opacity-solid"
                  onClick={() =>
                    onUpdateGraphicsConfig({
                      ...graphicsConfig,
                      productOpacity: 1.0,
                    })
                  }
                  className={`py-1 rounded-lg text-[10px] font-bold border transition ${
                    (graphicsConfig.productOpacity ?? 1.0) >= 0.98
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-black'
                      : 'bg-slate-950 text-emerald-300 border-slate-800 hover:border-emerald-500/50'
                  }`}
                >
                  واضح كامل (100%)
                </button>
              </div>
            </div>

            {/* Volumetric Beams Toggle */}
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-300 font-bold">
                مخاريط الإضاءة الحجمية بالسقف (Volumetric Cones)
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateGraphicsConfig({
                    ...graphicsConfig,
                    volumetricBeams: !graphicsConfig.volumetricBeams,
                  })
                }
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  graphicsConfig.volumetricBeams
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {graphicsConfig.volumetricBeams ? 'مُفعّل ON' : 'مُغلق OFF'}
              </button>
            </div>

            {/* Post-Processing Motion Blur Toggle */}
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-amber-400" />
                <span>ضبابية الحركة السينمائية (Motion Blur)</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateGraphicsConfig({
                    ...graphicsConfig,
                    motionBlur: !graphicsConfig.motionBlur,
                  })
                }
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  graphicsConfig.motionBlur
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {graphicsConfig.motionBlur ? 'مُفعّل ON' : 'مُغلق OFF'}
              </button>
            </div>

            {/* Dynamic LOD Manager Toggle */}
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-teal-400" />
                <span>مدير التفاصيل التكيفي الذكي (Dynamic 3D LOD)</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateGraphicsConfig({
                    ...graphicsConfig,
                    dynamicLod: graphicsConfig.dynamicLod === false ? true : false,
                  })
                }
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  graphicsConfig.dynamicLod !== false
                    ? 'bg-teal-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {graphicsConfig.dynamicLod !== false ? 'نشط تكيفي' : 'مُغلق'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL 2: FEFO Expiry Radar & Live SQLite Database Alert HUD */}
      {openPanel === 'FEFO' && (
        <div className="w-[380px] bg-slate-950/95 backdrop-blur-xl border border-rose-500/50 rounded-2xl p-4 shadow-2xl text-white space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <div>
                <h3 className="text-xs font-black text-white">رادار الصلاحية الحي (FEFO SQLite Sync)</h3>
                <p className="text-[10px] text-slate-400">مزامنة حية مع قاعدة البيانات للمنتهيات والمقربات</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateFefoRadar({ ...fefoRadar, enabled: !fefoRadar.enabled })}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  fefoRadar.enabled
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {fefoRadar.enabled ? 'الرادار نشط 3D' : 'تفعيل الرادار'}
              </button>
              <button
                type="button"
                onClick={() => setOpenPanel('NONE')}
                className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 4-Tier Summary KPI Cards */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <button
              type="button"
              onClick={() =>
                onUpdateFefoRadar({
                  ...fefoRadar,
                  enabled: true,
                  filter: 'EXPIRED_ONLY',
                })
              }
              className={`p-2 rounded-xl border transition-all ${
                fefoRadar.filter === 'EXPIRED_ONLY' && fefoRadar.enabled
                  ? 'bg-rose-950/90 border-rose-400 ring-1 ring-rose-400'
                  : 'bg-rose-950/40 border-rose-800/60 hover:border-rose-500'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400 mx-auto mb-0.5" />
              <div className="text-sm font-black text-rose-300 font-mono">{fefoSummary.expiredCount}</div>
              <div className="text-[9px] text-rose-200 font-bold">منتهي</div>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateFefoRadar({
                  ...fefoRadar,
                  enabled: true,
                  filter: 'WITHIN_30_DAYS',
                })
              }
              className={`p-2 rounded-xl border transition-all ${
                fefoRadar.filter === 'WITHIN_30_DAYS' && fefoRadar.enabled
                  ? 'bg-orange-950/90 border-orange-400 ring-1 ring-orange-400'
                  : 'bg-orange-950/40 border-orange-800/60 hover:border-orange-500'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mx-auto mb-0.5" />
              <div className="text-sm font-black text-orange-300 font-mono">{fefoSummary.critical30Count}</div>
              <div className="text-[9px] text-orange-200 font-bold">&lt; 30 يوم</div>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateFefoRadar({
                  ...fefoRadar,
                  enabled: true,
                  filter: 'WITHIN_90_DAYS',
                })
              }
              className={`p-2 rounded-xl border transition-all ${
                fefoRadar.filter === 'WITHIN_90_DAYS' && fefoRadar.enabled
                  ? 'bg-amber-950/90 border-amber-400 ring-1 ring-amber-400'
                  : 'bg-amber-950/40 border-amber-800/60 hover:border-amber-500'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400 mx-auto mb-0.5" />
              <div className="text-sm font-black text-amber-300 font-mono">{fefoSummary.warning90Count}</div>
              <div className="text-[9px] text-amber-200 font-bold">&lt; 90 يوم</div>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateFefoRadar({
                  ...fefoRadar,
                  enabled: true,
                  filter: 'ALL_CRITICAL',
                })
              }
              className={`p-2 rounded-xl border transition-all ${
                fefoRadar.filter === 'ALL_CRITICAL' && fefoRadar.enabled
                  ? 'bg-emerald-950/90 border-emerald-400 ring-1 ring-emerald-400'
                  : 'bg-emerald-950/30 border-emerald-800/50 hover:border-emerald-500'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-0.5" />
              <div className="text-sm font-black text-emerald-300 font-mono">{fefoSummary.safeCount}</div>
              <div className="text-[9px] text-emerald-200 font-bold">آمن &gt;90</div>
            </button>
          </div>

          {/* 3D Tour & Dim Safe Cells Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNextCriticalTour}
              disabled={filteredCriticalCells.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-l from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-black text-xs shadow-lg shadow-rose-600/25 disabled:opacity-40 transition-all"
            >
              <Crosshair className="w-4 h-4" />
              <span>جولة الخانات الحرجة 3D ({tourIndex + 1}/{Math.max(1, filteredCriticalCells.length)})</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateFefoRadar({
                  ...fefoRadar,
                  enabled: true,
                  dimSafeCells: !fefoRadar.dimSafeCells,
                })
              }
              className={`px-2.5 py-2 rounded-xl text-[10px] font-extrabold border transition-all ${
                fefoRadar.dimSafeCells
                  ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="تعتيم الخانات السليمة لإبراز الخانات الحرجة والمنتهية في الخريطة"
            >
              {fefoRadar.dimSafeCells ? 'عزل بصري: مفعل' : 'عزل بصري: معطل'}
            </button>
          </div>

          {/* Scrollable List of Critical/Expired Cells synced from SQLite */}
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
            {filteredCriticalCells.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">
                لا توجد خانات حرجة ضمن هذا الفلتر حالياً.
              </div>
            ) : (
              filteredCriticalCells.slice(0, 25).map((item) => (
                <div
                  key={`${item.rackId}-${item.level}-${item.slot}`}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-600 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black text-white"
                        style={{ backgroundColor: item.colorHex }}
                      >
                        {item.rackCode} · {item.cellCode}
                      </span>
                      <span className="text-xs font-extrabold text-white truncate">{item.productName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{item.badgeTextAr}</span>
                      <span>·</span>
                      <span className="font-mono">EXP: {item.expiryDate}</span>
                      <span>·</span>
                      <span className="text-cyan-300 font-bold">{item.quantity} عبوة بقاعدة البيانات</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onFocusCell(item.rackId, item.level, item.slot, item.cellCode)}
                      className="px-2 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-[10px] font-black transition-all"
                      title="انتقال وتقريب الكاميرا 4K للخانة"
                    >
                      تقريب 3D
                    </button>
                    {onQuarantineCell && (
                      <button
                        type="button"
                        onClick={() => onQuarantineCell(item.rackId, item.level, item.slot, item.quantity)}
                        className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-all"
                        title="سحب فوري للحجر الصحي وتصفير الكمية بقاعدة البيانات"
                      >
                        <PackageMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PANEL 3: Web Speech API Voice Command Interface */}
      {openPanel === 'VOICE' && (
        <div className="w-[370px] bg-slate-950/95 backdrop-blur-xl border border-indigo-500/60 rounded-2xl p-4 shadow-2xl text-white space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="text-xs font-black text-white">الأوامر الصوتية الذكية (Web Speech API)</h3>
                <p className="text-[10px] text-slate-400">تحكم صوتي مباشر بالعربية والإنجليزية</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setVoiceLang(voiceLang === 'ar-SA' ? 'en-US' : 'ar-SA')}
                className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-mono font-bold text-cyan-300"
              >
                {voiceLang === 'ar-SA' ? 'العربية (ar-SA)' : 'English (en-US)'}
              </button>
              <button
                type="button"
                onClick={() => setOpenPanel('NONE')}
                className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-xs">
              <div className="text-[10px] text-slate-400">آخر أمر صوتي ملتقط:</div>
              <div className="font-mono font-bold text-emerald-300 mt-0.5">
                {lastVoiceText || 'اضغط زر الميكروفون أو اختر أمراً بالأسفل...'}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleVoiceRecognition}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                isListeningVoice
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isListeningVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListeningVoice ? 'إيقاف' : 'تحدث الآن'}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400">
              أوامر صوتية جاهزة للتنفيذ الفوري (أو انطقها عبر الميكروفون):
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => executeVoiceSample('Select Rack A1')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-indigo-950/80 border border-slate-800 hover:border-indigo-500/50 text-right transition-all"
              >
                <div className="text-[11px] font-extrabold text-white">"Select Rack A1"</div>
                <div className="text-[9px] text-slate-400">تحديد وتقريب الرف A1</div>
              </button>
              <button
                type="button"
                onClick={() => executeVoiceSample('Show FEFO alerts')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-500/50 text-right transition-all"
              >
                <div className="text-[11px] font-extrabold text-white">"Show FEFO alerts"</div>
                <div className="text-[9px] text-slate-400">إظهار رادار الصلاحية 3D</div>
              </button>
              <button
                type="button"
                onClick={() => executeVoiceSample('اختر رف B2')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-teal-950/80 border border-slate-800 hover:border-teal-500/50 text-right transition-all"
              >
                <div className="text-[11px] font-extrabold text-white">"اختر رف B2"</div>
                <div className="text-[9px] text-slate-400">توجيه الكاميرا للرف B2</div>
              </button>
              <button
                type="button"
                onClick={() => executeVoiceSample('تتبع العامل')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-amber-950/80 border border-slate-800 hover:border-amber-500/50 text-right transition-all"
              >
                <div className="text-[11px] font-extrabold text-white">"تتبع العامل"</div>
                <div className="text-[9px] text-slate-400">كاميرا 3rd-Person للعامل</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
