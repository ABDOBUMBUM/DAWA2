/**
 * DAWA 3D Warehouse Engine — Antigravity Technical Handover & Ashraf Empty-Cells Mode Modal
 * Provides a comprehensive interactive & downloadable specification for Antigravity,
 * API integration blueprints, and 1-click handover of the warehouse with empty cells for Supervisor Ashraf.
 */

import React, { useState } from 'react';
import {
  X,
  FileCode2,
  Download,
  RefreshCw,
  CheckCircle2,
  Database,
  Layers,
  Server,
  PackageOpen,
  Copy,
  Sparkles,
} from 'lucide-react';
import {
  WarehouseRack,
  WarehouseDimensions,
  createEmptyRackCellsForAshraf,
} from '../types/warehouse';

interface AntigravityGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  racks: WarehouseRack[];
  dimensions: WarehouseDimensions;
  onEmptyAllRacksForAshraf: () => void;
  onRestoreSampleInventory: () => void;
}

export const AntigravityGuideModal: React.FC<AntigravityGuideModalProps> = ({
  isOpen,
  onClose,
  racks,
  dimensions,
  onEmptyAllRacksForAshraf,
  onRestoreSampleInventory,
}) => {
  const [activeTab, setActiveTab] = useState<
    'PROMPT_READY' | 'OVERVIEW' | 'ASHRAF_HANDOVER' | 'API_CONTRACT' | 'JSON_SCHEMA'
  >('PROMPT_READY');
  const [copiedBanner, setCopiedBanner] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalCells = racks.reduce(
    (sum, r) => sum + (r.levels || 4) * (r.cellsPerLevel || 3),
    0,
  );

  const antigravityMasterPrompt = `أنت مهندس برمجيات رئيسي (Principal Systems Architect) تعمل داخل بيئة Antigravity.
مهمتك هي استبدال خريطة ومحرك المستودع القديم في مشروعي السابق بهذا المحرك ثلاثي الأبعاد الجديد بالكامل (DAWA 3D Warehouse Engine & Horizontal Wooden Matrix Twin)، مع إعادة ربط جميع البيانات والـ APIs بشكل صحيح، وتسليم المستودع للمشرف "أشرف" بخانات فارغة جاهزة للتعبئة حسب مشروع المخزن الفعلي.

⚠️ القاعدة الذهبية قبل كتابة أي سطر كود (Phase 1: Study & Audit First):
يجب عليك أولاً فحص ودراسة مشروعي السابق بالكامل قبل البدء بأي عملية استبدال، وذلك عبر الخطوات الإلزامية التالية:

1. المرحلة الأولى — الفحص الشامل للمشروع السابق (Audit Existing Project):
   - افحص جميع ملفات الخريطة/المخزن القديمة في المشروع السابق (الواجهات، المكونات، الجداول، الـ Routes، والـ Controllers/Services).
   - استخرج قائمة دقيقة بـ:
     أ) جداول قاعدة البيانات الحالية الخاصة بالمخازن، الرفوف (Racks/Shelves)، الخانات (Bins/Locations/Cells)، الأصناف الدوائية (Products/Items/Batches)، وحركات المخزون (Orders/Picking/Returns/Expired).
     ب) جميع نقاط الربط (API Endpoints) والدوال التي كانت تغذي الخريطة القديمة أو تستقبل منها التحديثات.
     ج) صلاحيات المستخدمين (خصوصاً صلاحية المصمم/المشرف "أشرف" وصلاحية موظفي التحضير "محمد ومرعي").
   - اعرض لي ملخصاً سريعاً لما وجدته في المشروع السابق وخطة الربط قبل تنفيذ الاستبدال.

2. المرحلة الثانية — دراسة المحرك الجديد (Read New 3D Engine Blueprint):
   - اقرأ ملف \`/ANTIGRAVITY_PROJECT_GUIDE.md\` في المحرك الجديد، وافحص الملفات الأساسية:
     - \`src/types/warehouse.ts\`: هيكل \`WarehouseRack\`، \`RackCell\`، \`CellMedicineItem\`، دالة مصفوفة الأخشاب الأفقية \`computeCellMatrixLayout\`، دالة التنبيهات اللونية \`computeCellStockAlert\` (أحمر حرج ≤25%، أصفر تحذيري ≤55%، أخضر آمن >55%، وفارغ 0%)، ودالة تفريغ الخانات لأشرف \`createEmptyRackCellsForAshraf\`.
     - \`src/three/proceduralModels.ts\` و \`src/three/WarehouseScene.ts\`: محرك الـ 3D المبني بالكامل بـ Three.js بدون أي ملفات خارجية، حيث تترتب الأدوية داخل الخانة واحداً فوق التالي (Y-axis) على ألواح خشبية أفقية متراصة فوق بعضها (Horizontal Stacked Wooden Boards).
     - \`src/components/MatrixExplorerModal.tsx\`: نافذة استعراض الـ Matrix والتنبيهات المرئية لإعادة التوريد (Quantity vs Capacity).
     - \`src/components/JourneyHUD.tsx\`: شريط المحطات الـ 6 الأفقي الكامل مع إعدادات الترتيب التفصيلية.
     - \`src/components/SideEditorDrawer.tsx\`: لوحة التحكم الهندسية الشاملة بالرفوف، الخانات، الشفافية، الجدران، وإعدادات الـ Matrix.

3. المرحلة الثالثة — خطة الاستبدال النظيف (Clean Replacement Execution):
   - انقل ملفات المحرك الجديد (\`src/types/warehouse.ts\`، \`src/three/*\`، \`src/components/*\`، \`src/utils/*\`) لتحل محل مكون الخريطة القديم في المشروع.
   - حافظ على كافة ميزات المحرك الجديد دون حذف أو تبسيط:
     - ترتيب الأدوية على ألواح خشبية أفقية فوق بعضها (واحد فوق التالي) داخل كل خانة.
     - نافذة استعراض الـ Matrix مع تغير لون الخانة تلقائياً للأحمر أو الأصفر حسب نسبة استهلاك الكمية مقارنة بالسعة القصوى (\`Quantity vs Capacity\`).
     - التحكم بدرجة وضوح وشفافية المنتجات والخانات (\`opacity\` / \`cellOpacity\`).
     - الترتيب الأفقي للمحطات الـ 6 مع التحكم الكامل بإعدادات الشكل.

4. المرحلة الرابعة — إعادة الربط الكامل مع قاعدة بيانات ونظام المشروع (Full Data & API Re-binding):
   - اربط المحرك الجديد بقاعدة بيانات مشروعي الفعلية عبر توفير أو تكييف المسارات التالية:
     1) \`GET /api/warehouse/realtime\`: يُرجع مصفوفة \`inventory\` (بيانات الخانات الحية من قاعدة بيانات المشروع) و\`transactions\` (سجل الحركات).
     2) \`GET /api/warehouse/stream\`: بث حي (SSE) يدفع أي تغيير في المخزون أو السحب فوراً إلى الخريطة ثلاثية الأبعاد.
     3) \`POST /api/warehouse/cell-sync\`: يحفظ أي تعديل يقوم به المشرف "أشرف" عند تعبئة الخانة أو تقسيم الألواح الخشبية (\`matrixRows\`, \`matrixCols\`, \`medicines\`, \`quantity\`, \`capacity\`, \`barcode\`, \`expiryDate\`) مباشرة في قاعدة بيانات المشروع.
     4) \`POST /api/warehouse/pull\`: ينفذ عمليات سحب الطلبيات (\`ORDER_PICK\`)، سحب المنتهيات (\`EXPIRED_PULL\`)، المرتجعات (\`RETURN_PROCESS\`)، وإعادة التوريد (\`RESTOCK\`) ويخصم/يضيف للرصيد الحقيقي في النظام.
     5) \`POST /api/warehouse/handover-empty\`: يصفر محتويات الخانات لتسليم المستودع فارغاً للمشرف أشرف.

5. المرحلة الخامسة — تسليم المستودع للمشرف أشرف بخانات فارغة (Ashraf Empty-Cell Handover Mode):
   - اضبط الحالة الابتدائية لتسليم المشروع للمشرف "أشرف" بحيث:
     - تبقى جميع الرفوف، الطوابق، الأبواب، المناطق الـ 6، وأكواد الخانات (\`A-01\`, \`B-01\`, \`W1-01\`...) والسعات القصوى (\`capacity\`) وتقسيمات الألواح الخشبية الأفقية مهيأة بالكامل.
     - تكون جميع الخانات فارغة تماماً من الأدوية (\`occupied: false, quantity: 0, medicines: []\`) وجاهزة ليقوم المشرف أشرف بتعبئتها بنفسه صنفاً بصنف حسب مشروع المخزن الفعلي، مع بقاء خيار استيراد أو مزامنة الأصناف من قاعدة البيانات متاحاً بضغطة زر.
   - تحقق من عمل البناء (\`npm run build\`) والاختبارات وعدم وجود أي أخطاء TypeScript بعد الاستبدال والربط.`;

  const handleDownloadMarkdownGuide = () => {
    const markdownContent = `# 📘 دليل Antigravity الشامل لمعمارية محرك المستودع 3D والربط البرمجي وتسليم المشرف أشرف (بخانات فارغة)
# DAWA 3D Warehouse Engine — Antigravity Technical Specification & Ashraf Empty-Cell Handover Guide

## 1. نظرة عامة على النظام (System Architecture)
- **محرك الـ 3D (Three.js Procedural WebGL)**:
  - مبني بالكامل في \`src/three/WarehouseScene.ts\` و \`src/three/proceduralModels.ts\` بدون أي أصول خارجية.
  - الأدوية داخل كل خانة تترتب **واحداً فوق التالي (Y-axis)** على **ألواح خشبية أفقية متراصة فوق بعضها (Horizontal Stacked Wooden Boards)** وليس بشكل قواطع عمودية.
- **نظام التنبيهات المرئية (Visual Stock Alerts — Quantity vs Capacity)**:
  - الدالة \`computeCellStockAlert\` في \`src/types/warehouse.ts\` تحول لون الخانة تلقائياً إلى:
    - 🔴 **الأحمر (CRITICAL_RED)**: عند استهلاك >= 75% من السعة (المتبقي <= 25%).
    - 🟡 **الأصفر (WARNING_YELLOW)**: عند استهلاك 45% - 74% من السعة (المتبقي 26% - 55%).
    - 🟢 **الأخضر (SAFE_GREEN)**: عند توفر مخزون آمن (> 55%).
    - ⚪ **فارغة (EMPTY)**: عند تسليم المستودع للمشرف أشرف بخانات فارغة (0 عبوة).

## 2. وضع التسليم للمشرف أشرف بخانات فارغة (Ashraf Empty-Cells Handover)
- يجب أن يُسلّم المستودع للمشرف **أشرف** وهو بكامل رفوفه، طوابقه، وأكواد خاناته (\`A-01, B-01, W1-01...\`) وسعاته القصوى (\`capacity: 120\`) ولكن **بخانات فارغة تماماً (\`occupied: false, quantity: 0, medicines: []\`)**.
- لتفريغ قاعدة البيانات والواجهة بضغطة واحدة لتسليمها لأشرف:
  - عبر الـ API: \`POST /api/warehouse/handover-empty\`
  - عبر الكود: \`createEmptyRackCellsForAshraf(rack)\` في \`src/types/warehouse.ts\` و \`localStorage.setItem('dawa_3d_racks', ...)\`.

## 3. نقاط الربط البرمجي (Backend API Endpoints in /server.ts)
1. \`GET /api/warehouse/realtime\` — جلب كافة الخانات والحركات اللحظية وملخص الجرد.
2. \`GET /api/warehouse/stream\` — بث حي مباشر (SSE) لأي تحديث في الخانات أو الكميات.
3. \`POST /api/warehouse/cell-sync\` — إضافة أو تعديل بيانات خانة يملؤها المشرف أشرف (اسم الصنف، الباركود، التشغيلة، الصلاحية، الكمية، السعة).
4. \`POST /api/warehouse/pull\` — تنفيذ حركة سحب طلبية (\`ORDER_PICK\`)، سحب منتهي (\`EXPIRED_PULL\`)، تسكين مرتجع (\`RETURN_PROCESS\`)، أو إعادة توريد (\`RESTOCK\`).
5. \`POST /api/warehouse/handover-empty\` — تصفير جميع الخانات لتسليم المستودع فارغاً للمشرف أشرف.
6. \`POST /api/warehouse/restore-sample\` — استعادة البيانات الدوائية التجريبية.
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ANTIGRAVITY_PROJECT_GUIDE.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadEmptyAshrafJson = () => {
    const emptyRacksPayload = {
      project: 'DAWA 3D Pharmaceutical Warehouse Engine',
      handoverTarget: 'Supervisor Ashraf (المشرف أشرف - خانات فارغة جاهزة للتعبئة)',
      generatedAt: new Date().toISOString(),
      dimensions,
      totalRacks: racks.length,
      totalCells,
      racks: racks.map((r) => ({
        ...r,
        customCells: createEmptyRackCellsForAshraf(r),
      })),
    };
    const blob = new Blob([JSON.stringify(emptyRacksPayload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ASHRAF_EMPTY_WAREHOUSE_HANDOVER.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedBanner(label);
    setTimeout(() => setCopiedBanner(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-3xl border-2 border-indigo-500/60 bg-slate-900 text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-gradient-to-l from-indigo-950/80 via-slate-900 to-teal-950/60 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-400/50 text-indigo-300 shadow-inner">
              <FileCode2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  📘 ملف تعريف المشروع لـ Antigravity & وضع التسليم للمشرف أشرف (خانات فارغة)
                </h2>
                <span className="rounded-lg bg-indigo-500/20 border border-indigo-400/40 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-200">
                  ANTIGRAVITY_PROJECT_GUIDE.md
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                الدليل الهندسي الكامل لكيفية عمل المحرك ثلاثي الأبعاد، ربط الـ API وقاعدة البيانات، وتسليم المستودع للمشرف أشرف بخانات فارغة ليقوم بتعبئتها.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadMarkdownGuide}
              className="h-9 px-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Download className="w-4 h-4" />
              <span>تحميل ملف ANTIGRAVITY_PROJECT_GUIDE.md</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-rose-500/30 text-slate-300 hover:text-rose-200 flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Banner for Ashraf Handover */}
        <div className="border-b border-slate-800 bg-gradient-to-l from-amber-950/60 via-slate-950 to-emerald-950/50 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <PackageOpen className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-black text-white">
                وضع تسليم المستودع للمشرف أشرف (إجمالي {racks.length} رفوف · {totalCells} خانة مهيأة بالألواح الخشبية)
              </div>
              <div className="text-[11px] text-slate-300">
                يمكنك بضغطة واحدة تفريغ جميع الخانات في الخريطة 3D وقاعدة البيانات لتسليمها لأشرف فارغة ليبدأ بتعبئتها، أو تصدير قالب الـ JSON الفارغ.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-testid="empty-all-warehouse-ashraf-btn"
              onClick={onEmptyAllRacksForAshraf}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg transition"
            >
              <PackageOpen className="w-4 h-4" />
              <span>🧹 تفريغ جميع الخانات لتسليمها لأشرف (0 عبوة)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadEmptyAshrafJson}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-extrabold text-xs flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير JSON فارغ لأشرف</span>
            </button>

            <button
              type="button"
              data-testid="restore-sample-warehouse-btn"
              onClick={onRestoreSampleInventory}
              className="px-3 py-2 rounded-xl bg-teal-600/30 hover:bg-teal-600/50 border border-teal-500/50 text-teal-200 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>استعادة بيانات الأدوية التجريبية</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950/80 px-5 py-2 shrink-0 overflow-x-auto">
          {[
            { id: 'PROMPT_READY', label: '📋 الـ Prompt الجاهز لـ Antigravity (للفحص والاستبدال)', icon: Copy },
            { id: 'OVERVIEW', label: '1. معمارية النظام والـ Matrix', icon: Layers },
            { id: 'ASHRAF_HANDOVER', label: '2. خطوات التسليم والتعبئة لأشرف', icon: Sparkles },
            { id: 'API_CONTRACT', label: '3. نقاط الربط البرمجي (API & DB)', icon: Server },
            { id: 'JSON_SCHEMA', label: '4. هيكل البيانات (JSON Schema)', icon: Database },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition shrink-0 ${
                  activeTab === t.id
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}

          {copiedBanner && (
            <span className="mr-auto text-xs font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>تم نسخ {copiedBanner} ✓</span>
            </span>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed">
          {activeTab === 'PROMPT_READY' && (
            <div className="rounded-2xl border-2 border-indigo-500/50 bg-slate-950/90 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-indigo-300">
                    📋 الأمر الكامل (Master Prompt) الجاهز للنسخ واللصق في Antigravity
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    يُلزم Antigravity بفحص ودراسة مشروعك السابق أولاً (الخريطة القديمة، الجداول، والـ APIs) ثم استبدالها بهذا المحرك الجديد وإعادة ربطها بالكامل وتسليمها للمشرف أشرف بخانات فارغة.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="copy-antigravity-prompt-btn"
                  onClick={() => copyText(antigravityMasterPrompt, 'الـ Prompt الكامل لـ Antigravity')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-l from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg transition"
                >
                  <Copy className="w-4 h-4" />
                  <span>نسخ الـ Prompt الكامل لـ Antigravity</span>
                </button>
              </div>

              <pre
                dir="rtl"
                className="rounded-2xl bg-slate-900 border border-slate-800 p-4 font-sans text-xs text-slate-200 whitespace-pre-wrap leading-7 select-all overflow-x-auto"
              >
                {antigravityMasterPrompt}
              </pre>
            </div>
          )}

          {activeTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2.5">
                <h3 className="text-sm font-black text-indigo-300">
                  🏗️ كيف يعمل محرك المستودع ثلاثي الأبعاد (3D Engine Architecture)
                </h3>
                <ul className="space-y-2 text-slate-300 list-disc pr-4">
                  <li>
                    <strong>بناء إجرائي كامل (Zero External Assets)</strong>: يتم بناء جميع الرفوف الفولاذية (`STEEL_INDUSTRIAL`) والخزائن الخشبية (`WOODEN_CABINET`) والأبواب والمحطات الـ 6 والعامل البشري برمجياً عبر `Three.js` في `src/three/proceduralModels.ts`.
                  </li>
                  <li>
                    <strong>الألواح الخشبية الأفقية المتراصة (واحد فوق التالي)</strong>: داخل كل خانة (`RackCell`)، يتم تقسيم الارتفاع الرأسي (`Y-axis`) إلى ألواح خشبية أفقية متراصة فوق بعضها (`matrixRows`)، وتوضع كراتين الأدوية جنباً إلى جنب أفقياً (`matrixCols`) فوق كل لوح خشبي.
                  </li>
                  <li>
                    <strong>التنبيهات المرئية التلقائية (Visual Alerts)</strong>: تعتمد واجهة الـ Matrix على مقارنة `quantity` مع `capacity` عبر الدالة `computeCellStockAlert`:
                    <ul className="mt-1 space-y-1 pr-4 text-[11px]">
                      <li className="text-rose-300">🔴 <strong>الأحمر (CRITICAL_RED)</strong>: المتبقي ≤ 25% (استهلاك ≥ 75%) — يتطلب إعادة توريد فوري.</li>
                      <li className="text-amber-300">🟡 <strong>الأصفر (WARNING_YELLOW)</strong>: المتبقي 26% إلى 55% — تنبيه باقتراب إعادة التوريد.</li>
                      <li className="text-emerald-300">🟢 <strong>الأخضر (SAFE_GREEN)</strong>: المتبقي &gt; 55% — رصيد آمن.</li>
                      <li className="text-slate-300">⚪ <strong>فارغة (EMPTY)</strong>: الرصيد 0 — جاهزة لتعبئة المشرف أشرف.</li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2.5">
                <h3 className="text-sm font-black text-teal-300">
                  🗂️ خريطة الملفات الرئيسية لـ Antigravity
                </h3>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-amber-300 font-bold">/ANTIGRAVITY_PROJECT_GUIDE.md</span>
                    <p className="font-sans text-slate-400 mt-0.5">
                      الملف التعريفي المرجعي الشامل في جذر المشروع لـ Antigravity.
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-cyan-300 font-bold">/server.ts</span>
                    <p className="font-sans text-slate-400 mt-0.5">
                      خادم Express + قاعدة بيانات SQLite + بث SSE + مسار `/api/warehouse/handover-empty`.
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-emerald-300 font-bold">/src/types/warehouse.ts</span>
                    <p className="font-sans text-slate-400 mt-0.5">
                      نماذج البيانات + `computeCellStockAlert` + `createEmptyRackCellsForAshraf`.
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-purple-300 font-bold">/src/components/MatrixExplorerModal.tsx</span>
                    <p className="font-sans text-slate-400 mt-0.5">
                      مستعرض الـ Matrix والألواح الخشبية الأفقية ونظام التنبيهات المرئية (الأحمر/الأصفر).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ASHRAF_HANDOVER' && (
            <div className="rounded-2xl border border-amber-500/40 bg-slate-950/90 p-4 space-y-3">
              <h3 className="text-sm font-black text-amber-300">
                👷‍♂️ بروتوكول تسليم المستودع للمشرف أشرف بخانات فارغة وكيفية تعبئته
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 space-y-1.5">
                  <div className="text-xs font-black text-amber-300">الخطوة 1: التصفير والتسليم الهيكلي</div>
                  <p className="text-slate-300 text-[11px]">
                    عند الضغط على زر <strong>«تفريغ جميع الخانات لتسليمها لأشرف»</strong> أو استدعاء `POST /api/warehouse/handover-empty`، يحتفظ المستودع بكامل تصميمه الهندسي (الرفوف، الطوابق، أكواد الخانات `A-01`، باركود المواقع، والألواح الخشبية) ولكن تصبح جميع الخانات فارغة (`quantity: 0, occupied: false, medicines: []`).
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 space-y-1.5">
                  <div className="text-xs font-black text-cyan-300">الخطوة 2: تعبئة الخانات وتقسيم الأخشاب</div>
                  <p className="text-slate-300 text-[11px]">
                    يقوم المشرف أشرف بفتح <strong>«🪵 استعراض الـ Matrix»</strong> أو النقر على أي خانة في الـ 3D، ثم يحدد عدد الألواح الخشبية الأفقية فوق بعضها (`Rows`) وعدد الأدوية على كل لوح (`Cols`)، ويضغط <strong>«+ تعبئة دواء هنا»</strong> لإدخال اسم الصنف والكمية والسعة القصوى (`Capacity`).
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 space-y-1.5">
                  <div className="text-xs font-black text-emerald-300">الخطوة 3: المراقبة الآلية وإعادة التوريد</div>
                  <p className="text-slate-300 text-[11px]">
                    بمجرد تعبئة الخانات وبدء عمليات السحب للطلبيات (`ORDER_PICK`)، يراقب النظام نسبة `Quantity vs Capacity`؛ فإذا هبط الرصيد إلى ≤ 55% تتحول الخانة للأصفر، وإذا هبط إلى ≤ 25% تتحول للأحمر الحرج ليتخذ أشرف قرار إعادة التوريد الفوري.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'API_CONTRACT' && (
            <div className="space-y-3">
              {[
                {
                  method: 'POST',
                  path: '/api/warehouse/handover-empty',
                  desc: 'تصفير جميع الخانات في قاعدة البيانات لتسليم المستودع فارغاً للمشرف أشرف مع الحفاظ على أكواد الرفوف والخانات.',
                  body: '{}',
                },
                {
                  method: 'POST',
                  path: '/api/warehouse/cell-sync',
                  desc: 'حفظ ومزامنة بيانات الخانة التي يقوم المشرف أشرف بتعبئتها أو تعديلها (الاسم، الباركود، التشغيلة، الصلاحية، الكمية، السعة).',
                  body: JSON.stringify(
                    {
                      id: 'rack-a1-L1-S1',
                      rackId: 'rack-a1',
                      rackCode: 'WH-MAIN-A1',
                      level: 1,
                      slot: 1,
                      cellCode: 'A-01',
                      productName: 'أوجمنتين 1 جم',
                      barcode: '628100010111',
                      batchNumber: 'BCH-2026-01',
                      expiryDate: '2028-05-30',
                      quantity: 100,
                      capacity: 120,
                      storageCondition: 'ROOM',
                      movementCategory: 'AVAILABLE',
                    },
                    null,
                    2,
                  ),
                },
                {
                  method: 'POST',
                  path: '/api/warehouse/pull',
                  desc: 'تنفيذ حركات المخزون اللحظية (سحب طلبية ORDER_PICK، سحب منتهي EXPIRED_PULL، مرتجع RETURN_PROCESS، أو توريد RESTOCK).',
                  body: JSON.stringify(
                    {
                      cellId: 'rack-a1-L1-S1',
                      rackId: 'rack-a1',
                      level: 1,
                      slot: 1,
                      actionType: 'RESTOCK',
                      qty: 40,
                      operatorName: 'المشرف أشرف',
                      referenceCode: 'PO-RESTOCK-2026',
                    },
                    null,
                    2,
                  ),
                },
              ].map((ep) => (
                <div
                  key={ep.path}
                  className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/40 font-mono text-[11px] font-black text-indigo-300">
                        {ep.method}
                      </span>
                      <span className="font-mono text-xs font-black text-cyan-300">{ep.path}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(ep.body, ep.path)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>نسخ JSON</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300">{ep.desc}</p>
                  <pre
                    dir="ltr"
                    className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 font-mono text-[10px] text-emerald-300 overflow-x-auto"
                  >
                    {ep.body}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'JSON_SCHEMA' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-cyan-300">
                  نموذج بيانات الخانة ومصفوفة الأخشاب الأفقية (RackCell & Horizontal Wooden Matrix Schema)
                </h4>
                <button
                  type="button"
                  onClick={handleDownloadEmptyAshrafJson}
                  className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[11px]"
                >
                  تحميل JSON الكامل للمستودع الفارغ
                </button>
              </div>
              <pre
                dir="ltr"
                className="rounded-xl bg-slate-900 border border-slate-800 p-3 font-mono text-[11px] text-amber-200 overflow-x-auto"
              >
                {JSON.stringify(
                  {
                    id: 'rack-a1-L1-S1',
                    code: 'A-01',
                    level: 1,
                    slot: 1,
                    occupied: false,
                    capacity: 120,
                    quantity: 0,
                    arrangementMode: 'MATRIX_2D',
                    matrixRows: 2, // عدد الألواح الخشبية الأفقية فوق بعضها (واحد فوق التالي)
                    matrixCols: 2, // عدد الأدوية المرتبة أفقياً على كل لوح خشبي
                    showInternalDividers: true,
                    medicines: [], // يملؤها المشرف أشرف عند استلام المستودع
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
