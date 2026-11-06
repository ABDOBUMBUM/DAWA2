/**
 * DAWA 3D Warehouse Engine — Real-Time Item & Cell Locator View (مستكشف وموجه الأصناف والخانات الحقيقي)
 * Synchronizes in real time with the SQLite backend (/api/warehouse/realtime & SSE /api/warehouse/stream).
 * Features:
 * - Browser Camera API real-time barcode scanner (navigator.mediaDevices.getUserMedia + BarcodeDetector)
 * - Structured 3-level hierarchy: Rack Name & Code -> Cell Name & Code -> Subdivided Medicines inside Cell
 * - Filtering by Order Picks (الطلبيات), Expired Medicines (المنتهيات), Returns (المرتجعات), and Available stock
 * - Flying the 3D camera directly to any item's exact cell with 3D cell extrusion & content pop-up
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  MapPin,
  Barcode,
  PackageCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  Navigation,
  Activity,
  Database,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Sparkles,
  Camera,
  CameraOff,
  ScanLine,
} from 'lucide-react';
import {
  MovementCategory,
  RealTimeCellInventoryItem,
  RealTimeInventoryTransaction,
  WarehouseRack,
  resolveRackCell,
  getCellMedicines,
} from '../types/warehouse';

interface ItemLocatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  racks: WarehouseRack[];
  inventory: RealTimeCellInventoryItem[];
  transactions: RealTimeInventoryTransaction[];
  isLoading: boolean;
  onRefresh: () => void;
  onLocateCellOn3DMap: (item: RealTimeCellInventoryItem, dispatchWorker: boolean) => void;
  onExecutePullAction: (
    item: RealTimeCellInventoryItem,
    actionType: 'ORDER_PICK' | 'EXPIRED_PULL' | 'RETURN_PROCESS' | 'RESTOCK',
    qty: number,
  ) => Promise<void>;
}

export const ItemLocatorModal: React.FC<ItemLocatorModalProps> = ({
  isOpen,
  onClose,
  racks,
  inventory,
  transactions,
  isLoading,
  onRefresh,
  onLocateCellOn3DMap,
  onExecutePullAction,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | MovementCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRackFilter, setSelectedRackFilter] = useState<string>('ALL');
  const [busyCellId, setBusyCellId] = useState<string | null>(null);

  // Browser Camera API Barcode Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const rackByIdMap = useMemo(() => {
    const map = new Map<string, WarehouseRack>();
    racks.forEach((r) => map.set(r.id, r));
    return map;
  }, [racks]);

  // Helper to get subdivided medicines for a DB inventory item merged with rack cell config
  const getItemMedicines = useCallback(
    (item: RealTimeCellInventoryItem) => {
      const rack = rackByIdMap.get(item.rackId);
      if (rack) {
        const resolved = resolveRackCell(rack, item.level, item.slot);
        // Merge primary DB quantity & fields with resolved multi-medicine list
        const meds = getCellMedicines({
          ...resolved,
          code: item.cellCode,
          productName: item.productName,
          nameEn: item.nameEn,
          scientificName: item.scientificName,
          barcode: item.barcode,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          movementCategory: item.movementCategory,
        });
        return meds;
      }
      return getCellMedicines({
        id: item.id,
        code: item.cellCode,
        level: item.level,
        slot: item.slot,
        productName: item.productName,
        nameEn: item.nameEn,
        scientificName: item.scientificName,
        barcode: item.barcode,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        movementCategory: item.movementCategory,
      });
    },
    [rackByIdMap],
  );

  // Stop camera stream cleanly
  const stopCameraScanner = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Trigger barcode match -> auto-locate & zoom 3D scene to corresponding cell
  const handleBarcodeDetected = useCallback(
    (rawBarcode: string) => {
      const code = rawBarcode.trim();
      if (!code) return;
      setLastScannedCode(code);
      setSearchQuery(code);

      // Search across primary cell barcode, cellCode, or any subdivided medicine barcode
      const matched = inventory.find((item) => {
        if (
          item.barcode.toLowerCase() === code.toLowerCase() ||
          item.cellCode.toLowerCase() === code.toLowerCase() ||
          item.rackCode.toLowerCase() === code.toLowerCase()
        ) {
          return true;
        }
        const meds = getItemMedicines(item);
        return meds.some((m) => m.barcode.toLowerCase() === code.toLowerCase());
      });

      if (matched) {
        stopCameraScanner();
        setIsScannerOpen(false);
        onLocateCellOn3DMap(matched, true);
      }
    },
    [inventory, getItemMedicines, stopCameraScanner, onLocateCellOn3DMap],
  );

  // Start Browser Camera API + BarcodeDetector loop
  const startCameraScanner = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('واجهة الكاميرا غير مدعومة في هذا المتصفح — يمكنك استخدام أزرار المسح الفوري أدناه.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Use native BarcodeDetector if available
      const BarcodeDetectorCtor = (window as unknown as {
        BarcodeDetector?: new (opts?: { formats: string[] }) => {
          detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
        };
      }).BarcodeDetector;

      if (BarcodeDetectorCtor) {
        const detector = new BarcodeDetectorCtor({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a'],
        });
        scanIntervalRef.current = window.setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleBarcodeDetected(barcodes[0].rawValue);
              }
            } catch {
              // Ignore single-frame detection errors
            }
          }
        }, 350);
      }
    } catch {
      setCameraError(
        'تعذر الوصول للكاميرا الفعلية في بيئة المعاينة الحالية — استخدم المسح الفوري للباركود بالأسفل للتوجيه المباشر 3D.',
      );
      setIsCameraActive(false);
    }
  }, [handleBarcodeDetected]);

  useEffect(() => {
    if (!isOpen) {
      stopCameraScanner();
      setIsScannerOpen(false);
    }
    return () => {
      stopCameraScanner();
    };
  }, [isOpen, stopCameraScanner]);

  const counts = useMemo(() => {
    return {
      ALL: inventory.length,
      ORDER_PICK: inventory.filter((i) => i.movementCategory === 'ORDER_PICK').length,
      EXPIRED: inventory.filter((i) => i.movementCategory === 'EXPIRED').length,
      RETURNED: inventory.filter((i) => i.movementCategory === 'RETURNED').length,
      AVAILABLE: inventory.filter((i) => i.movementCategory === 'AVAILABLE').length,
    };
  }, [inventory]);

  const rackCodes = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((i) => set.add(i.rackCode));
    racks.forEach((r) => set.add(r.code));
    return Array.from(set);
  }, [inventory, racks]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inventory.filter((item) => {
      if (activeTab !== 'ALL' && item.movementCategory !== activeTab) return false;
      if (selectedRackFilter !== 'ALL' && item.rackCode !== selectedRackFilter) return false;
      if (!q) return true;
      const meds = getItemMedicines(item);
      const matchesSubMed = meds.some(
        (m) =>
          m.productName.toLowerCase().includes(q) ||
          m.barcode.toLowerCase().includes(q) ||
          m.batchNumber.toLowerCase().includes(q),
      );
      return (
        matchesSubMed ||
        item.productName.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.scientificName.toLowerCase().includes(q) ||
        item.barcode.toLowerCase().includes(q) ||
        item.cellCode.toLowerCase().includes(q) ||
        item.rackCode.toLowerCase().includes(q) ||
        item.batchNumber.toLowerCase().includes(q) ||
        (item.orderRef && item.orderRef.toLowerCase().includes(q))
      );
    });
  }, [inventory, activeTab, selectedRackFilter, searchQuery, getItemMedicines]);

  if (!isOpen) return null;

  const handleAction = async (
    item: RealTimeCellInventoryItem,
    actionType: 'ORDER_PICK' | 'EXPIRED_PULL' | 'RETURN_PROCESS' | 'RESTOCK',
    qty: number,
  ) => {
    setBusyCellId(item.id);
    try {
      await onExecutePullAction(item, actionType, qty);
    } finally {
      setBusyCellId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-5 select-none"
      dir="rtl"
    >
      <div className="relative flex flex-col w-full max-w-7xl h-[90vh] rounded-2xl border border-cyan-500/30 bg-slate-900/95 text-white shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/80 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 shadow-inner">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  مستكشف وموجه الأصناف والخانات الحقيقي (3D Real-Time Item & Barcode Locator)
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  متصل بقاعدة البيانات الحية (Realtime SQLite)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                عرض منظم: اسم الرف ← اسم الخانة ← كل دواء مقسم داخل الخانة، مع مسح الباركود بالكاميرا للتوجيه والتقريب الفوري ثلاثي الأبعاد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Camera Barcode Scanner Toggle Button */}
            <button
              type="button"
              data-testid="open-camera-barcode-scanner"
              onClick={() => {
                const next = !isScannerOpen;
                setIsScannerOpen(next);
                if (next) {
                  startCameraScanner();
                } else {
                  stopCameraScanner();
                }
              }}
              className={`h-9 px-3.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition shadow ${
                isScannerOpen
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
              }`}
              title="مسح الباركود بالكاميرا للتوجيه الفوري للخانة في المشهد ثلاثي الأبعاد"
            >
              <Camera className="h-4 w-4" />
              <span>{isScannerOpen ? 'إغلاق ماسح الكاميرا' : '📷 مسح باركود بالكاميرا'}</span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              className="h-9 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
              title="مزامنة فورية مع قاعدة البيانات"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>تحديث فوري</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-rose-500/20 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 flex items-center justify-center transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Browser Camera API Live Barcode Scanner Panel */}
        {isScannerOpen && (
          <div
            data-testid="camera-barcode-scanner-panel"
            className="border-b border-cyan-500/40 bg-slate-950/95 px-5 py-3.5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
          >
            {/* Left: Camera Video Viewport */}
            <div className="lg:col-span-5 relative h-44 rounded-2xl overflow-hidden border-2 border-cyan-500/50 bg-slate-900 flex items-center justify-center">
              <video
                ref={videoRef}
                muted
                playsInline
                className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              />
              {!isCameraActive && (
                <div className="flex flex-col items-center justify-center text-center p-4">
                  <CameraOff className="w-8 h-8 text-amber-400 mb-1.5" />
                  <span className="text-xs font-bold text-slate-200">
                    {cameraError || 'جاري تشغيل عدسة الكاميرا لمسح الباركود...'}
                  </span>
                </div>
              )}

              {/* Laser Reticle Overlay */}
              <div className="absolute inset-4 border-2 border-dashed border-cyan-400/60 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-rose-500/90 shadow-lg shadow-rose-500 animate-pulse" />
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                LIVE BARCODE DETECTOR API
              </div>
            </div>

            {/* Right: Instant Barcode Input & Quick-Scan Simulation Triggers */}
            <div className="lg:col-span-7 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-black text-white">
                    المسح الفوري للباركود والتوجيه التلقائي للخانة 3D
                  </h3>
                </div>
                {lastScannedCode && (
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded">
                    آخر باركود ممسوح: {lastScannedCode}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                وجّه الكاميرا نحو باركود الدواء أو الملصق الحراري للخانة، أو اختر باركوداً من القائمة أدناه لمحاكاة القراءة الفورية والانتقال مباشرة للخانة في المشهد ثلاثي الأبعاد:
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualBarcodeInput}
                  onChange={(e) => setManualBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualBarcodeInput.trim()) {
                      handleBarcodeDetected(manualBarcodeInput);
                    }
                  }}
                  placeholder="أدخل أو امسح رقم الباركود (مثال: 6281000111)..."
                  className="flex-1 h-9 rounded-xl bg-slate-900 border border-slate-700 px-3 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleBarcodeDetected(manualBarcodeInput)}
                  className="h-9 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition"
                >
                  توجيه فوري 3D
                </button>
              </div>

              {/* Quick Barcode Test Pills for Instant 1-Click Camera Scan Verification */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block">
                  اختبار مسح باركود سريع (ينقل الكاميرا 3D فوراً إلى الخانة):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {inventory.slice(0, 6).map((sample) => (
                    <button
                      key={`scan-sample-${sample.id}`}
                      type="button"
                      data-testid={`simulate-scan-${sample.barcode}`}
                      onClick={() => handleBarcodeDetected(sample.barcode)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 transition"
                    >
                      <Barcode className="w-3 h-3 text-amber-400" />
                      <span>{sample.barcode}</span>
                      <span className="text-slate-400 font-sans">
                        ({sample.rackCode} · {sample.cellCode})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 bg-slate-900/90 px-5 py-3">
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                activeTab === 'ALL'
                  ? 'bg-teal-500 text-slate-950 border-teal-400 font-extrabold shadow'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              <span>كل الخانات ({counts.ALL})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ORDER_PICK')}
              className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                activeTab === 'ORDER_PICK'
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-extrabold shadow'
                  : 'bg-sky-950/40 text-sky-300 border-sky-500/30 hover:bg-sky-900/40'
              }`}
            >
              <PackageCheck className="h-3.5 w-3.5" />
              <span>سحب الطلبيات ({counts.ORDER_PICK})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('EXPIRED')}
              className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                activeTab === 'EXPIRED'
                  ? 'bg-rose-500 text-white border-rose-400 font-extrabold shadow'
                  : 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/40'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>الأدوية المنتهية ({counts.EXPIRED})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('RETURNED')}
              className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                activeTab === 'RETURNED'
                  ? 'bg-purple-500 text-white border-purple-400 font-extrabold shadow'
                  : 'bg-purple-950/40 text-purple-300 border-purple-500/30 hover:bg-purple-900/40'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>المرتجعات ({counts.RETURNED})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('AVAILABLE')}
              className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                activeTab === 'AVAILABLE'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow'
                  : 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/30'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>المتاح السليم ({counts.AVAILABLE})</span>
            </button>
          </div>

          {/* Search Input & Rack Filter */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الدواء، الباركود 6281...، رقم التشغيلة، كود الخانة..."
                className="w-full h-9 rounded-xl bg-slate-950 border border-slate-700 pr-9 pl-3 text-xs text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <select
              value={selectedRackFilter}
              onChange={(e) => setSelectedRackFilter(e.target.value)}
              className="h-9 rounded-xl bg-slate-950 border border-slate-700 px-2.5 text-xs font-bold text-slate-200 focus:border-cyan-400 focus:outline-none"
            >
              <option value="ALL">كل الرفوف ({rackCodes.length})</option>
              {rackCodes.map((rc) => (
                <option key={rc} value={rc}>
                  رف {rc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content Grid: Left Inventory Cards + Right Real-Time DB Transactions */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Inventory Cell Cards (9 cols) */}
          <div className="lg:col-span-9 overflow-y-auto p-4 space-y-3">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                <Barcode className="h-10 w-10 text-slate-600 mb-2" />
                <p className="text-sm font-bold">لا توجد خانات مطابقة لمعايير البحث الحالية</p>
                <p className="text-xs text-slate-500 mt-1">جرب تغيير التبويب أو مسح كلمة البحث</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {filteredItems.map((item) => {
                  const isOrder = item.movementCategory === 'ORDER_PICK';
                  const isExpired = item.movementCategory === 'EXPIRED';
                  const isReturn = item.movementCategory === 'RETURNED';
                  const fillPct = Math.min(
                    100,
                    Math.round((item.quantity / Math.max(1, item.capacity)) * 100),
                  );
                  const rackObj = rackByIdMap.get(item.rackId);
                  const rackTitle = rackObj?.nameAr || rackObj?.name || `رف ${item.rackCode}`;
                  const cellMeds = getItemMedicines(item);

                  const borderTheme = isExpired
                    ? 'border-rose-500/50 bg-rose-950/15 hover:border-rose-400'
                    : isOrder
                    ? 'border-sky-500/50 bg-sky-950/15 hover:border-sky-400'
                    : isReturn
                    ? 'border-purple-500/50 bg-purple-950/15 hover:border-purple-400'
                    : 'border-slate-800 bg-slate-950/60 hover:border-cyan-500/50';

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-2.5 transition shadow-md ${borderTheme}`}
                    >
                      {/* Hierarchy Level 1 & 2: Rack Name/Code -> Cell Name/Code */}
                      <div className="space-y-1.5 border-b border-slate-800/80 pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 shrink-0">الرف:</span>
                            <span className="rounded-md bg-slate-800 border border-slate-700 px-1.5 py-0.5 font-mono text-[11px] font-extrabold text-teal-300 shrink-0">
                              {item.rackCode}
                            </span>
                            <span className="text-xs font-extrabold text-white truncate">
                              {rackTitle}
                            </span>
                          </div>

                          <span
                            className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-extrabold border ${
                              isExpired
                                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                                : isOrder
                                ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                                : isReturn
                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            }`}
                          >
                            {isExpired
                              ? '⚠️ منتهي'
                              : isOrder
                              ? '📦 طلبية'
                              : isReturn
                              ? '↩️ مرتجع'
                              : '✅ متاح'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400">الخانة:</span>
                            <span className="rounded-md bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 font-mono text-xs font-black text-cyan-200">
                              خانة {item.cellCode}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              (طابق {item.level} · موقع {item.slot})
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            {cellMeds.length} {cellMeds.length > 1 ? 'أدوية مقسمة' : 'دواء بالخانة'}
                          </span>
                        </div>
                      </div>

                      {/* Hierarchy Level 3: Subdivided Medicines List inside this Cell */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-extrabold text-teal-300 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          <span>الأدوية المقسمة داخل الخانة ({item.cellCode}):</span>
                        </span>

                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                          {cellMeds.map((med, mIdx) => (
                            <div
                              key={med.id || mIdx}
                              className="rounded-xl bg-slate-900/95 border border-slate-800/90 p-2 space-y-1"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                                    {med.subSlotCode || `${item.cellCode}/${mIdx + 1}`}
                                  </span>
                                  <span className="text-xs font-extrabold text-white truncate">
                                    {med.productName}
                                  </span>
                                </div>
                                <span className="font-mono text-[10px] font-extrabold text-emerald-300 shrink-0">
                                  {med.quantity} عبوة
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Barcode className="h-3 w-3 text-cyan-400" />
                                  <strong className="text-amber-300">{med.barcode}</strong>
                                </span>
                                <span>LOT: {med.batchNumber}</span>
                                <span
                                  className={
                                    isExpired ? 'text-rose-400 font-bold' : 'text-emerald-400'
                                  }
                                >
                                  EXP: {med.expiryDate}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total Cell Balance Progress Bar */}
                      <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 px-2.5 py-2">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-400">إجمالي الرصيد الفعلي بالخانة:</span>
                          <span className="font-mono font-extrabold text-white">
                            {item.quantity} / {item.capacity} عبوة ({fillPct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isExpired
                                ? 'bg-rose-500'
                                : isOrder
                                ? 'bg-sky-400'
                                : isReturn
                                ? 'bg-purple-400'
                                : 'bg-teal-400'
                            }`}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Primary Action: Fly 3D Camera + Extrude Cell + Pop Up Contents */}
                      <div className="space-y-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => onLocateCellOn3DMap(item, true)}
                          className="w-full h-9 rounded-xl bg-gradient-to-l from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          <span>توجيه للمكان بالخريطة 3D + بروز الخانة وانبثاقها</span>
                        </button>

                        {/* Real-Time DB Movement Actions */}
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            disabled={busyCellId === item.id || item.quantity <= 0}
                            onClick={() => handleAction(item, 'ORDER_PICK', 10)}
                            className="h-7 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-40 transition"
                            title="سحب 10 عبوات للطلبية وتحديث قاعدة البيانات لحظياً"
                          >
                            <ArrowUpFromLine className="h-3 w-3" />
                            <span>سحب طلبية (-10)</span>
                          </button>

                          <button
                            type="button"
                            disabled={busyCellId === item.id || item.quantity <= 0}
                            onClick={() => handleAction(item, 'EXPIRED_PULL', item.quantity)}
                            className="h-7 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-40 transition"
                            title="سحب كامل الكمية كمنتهي الصلاحية للحجر والإتلاف"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span>سحب منتهي</span>
                          </button>

                          <button
                            type="button"
                            disabled={busyCellId === item.id}
                            onClick={() => handleAction(item, 'RETURN_PROCESS', 8)}
                            className="h-7 rounded-lg bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-40 transition"
                            title="إيداع مرتجع دوائي (+8 عبوات) في هذه الخانة"
                          >
                            <ArrowDownToLine className="h-3 w-3" />
                            <span>تسكين مرتجع (+8)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar: Live SQLite Transactions Feed (3 cols) */}
          <div className="lg:col-span-3 border-r border-slate-800 bg-slate-950/90 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-400" />
                <h3 className="text-xs font-extrabold text-white">
                  سجل السحب والتزامن اللحظي (Live DB Log)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {transactions.length} حركة
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {transactions.map((tx) => {
                const isExp = tx.actionType === 'EXPIRED_PULL';
                const isRet = tx.actionType === 'RETURN_PROCESS';
                const matchedItem = inventory.find((i) => i.id === tx.cellId);

                return (
                  <div
                    key={tx.id}
                    className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-2.5 text-xs space-y-1.5 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isExp
                            ? 'bg-rose-500/20 text-rose-300'
                            : isRet
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-sky-500/20 text-sky-300'
                        }`}
                      >
                        {isExp
                          ? 'سحب منتهيات'
                          : isRet
                          ? 'إيداع مرتجع'
                          : 'سحب طلبية'}
                      </span>
                      <span className="font-mono text-[10px] text-cyan-300 font-bold">
                        {tx.rackCode} · {tx.cellCode}
                      </span>
                    </div>

                    <p className="font-bold text-slate-200 text-[11px] line-clamp-1">
                      {tx.productName}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>باركود: {tx.barcode}</span>
                      <span
                        className={`font-extrabold ${
                          tx.qtyDelta < 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {tx.qtyDelta > 0 ? `+${tx.qtyDelta}` : tx.qtyDelta} (المتبقي: {tx.remainingQty})
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                      <span className="truncate max-w-[140px]">{tx.operatorName}</span>
                      {matchedItem && (
                        <button
                          type="button"
                          onClick={() => onLocateCellOn3DMap(matchedItem, false)}
                          className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-0.5"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          <span>عرض بالخريطة</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
