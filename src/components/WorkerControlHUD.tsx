/**
 * DAWA 3D Warehouse Engine — Human Worker Control HUD
 * Enables direct task commands for the articulated human worker,
 * destination selection, and camera tracking.
 */

import React from 'react';
import {
  Navigation,
  Eye,
  Camera,
  CheckCircle2,
  Scan,
  Compass,
  Boxes,
  User,
} from 'lucide-react';
import { CameraMode } from '../types/warehouse';

interface WorkerControlHUDProps {
  workerName: string;
  workerAction: 'IDLE' | 'WALKING' | 'SCANNING' | 'PICKING' | 'REACHING_HIGH' | 'BENDING_LOW';
  cameraMode: CameraMode;
  onSendToCoords: (x: number, z: number) => void;
  onToggleCameraFollow: () => void;
}

export const WorkerControlHUD: React.FC<WorkerControlHUDProps> = ({
  workerName,
  workerAction,
  cameraMode,
  onSendToCoords,
  onToggleCameraFollow,
}) => {
  const isFollowing = cameraMode === 'FOLLOW_WORKER';

  return (
    <div
      className="absolute top-14 right-4 z-20 w-64 rounded-2xl p-3 border shadow-2xl backdrop-blur-xl pointer-events-auto text-xs"
      style={{
        background: 'rgba(15, 23, 42, 0.92)',
        borderColor: 'rgba(20, 184, 166, 0.3)',
        color: '#f8fafc',
      }}
    >
      <div className="flex items-center justify-between border-b pb-2 border-slate-700/60 mb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
            <User className="w-3.5 h-3.5" />
          </span>
          <div>
            <div className="text-[10px] text-slate-400 font-bold">عامل المستودع البشري</div>
            <div className="text-xs font-black text-white">{workerName}</div>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            workerAction === 'WALKING'
              ? 'bg-cyan-500/20 text-cyan-300 animate-pulse'
              : workerAction === 'SCANNING'
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-emerald-500/20 text-emerald-300'
          }`}
        >
          {workerAction === 'WALKING'
            ? '🚶‍♂️ يسير بين الممرات'
            : workerAction === 'SCANNING'
            ? '⚡ مسح بالليزر'
            : workerAction === 'REACHING_HIGH'
            ? '📦 فحص مستوى علوي'
            : workerAction === 'BENDING_LOW'
            ? '📦 فحص مستوى سفلي'
            : 'جاهز للأوامر'}
        </span>
      </div>

      {/* Quick Walk destinations */}
      <div className="space-y-1">
        <span className="text-[10px] text-slate-400 font-bold block mb-1">أوامر المشي السريع:</span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onSendToCoords(18.5, 2.2)}
            className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 text-right truncate"
          >
            01. رصيف الاستلام
          </button>
          <button
            type="button"
            onClick={() => onSendToCoords(7.2, 7.8)}
            className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 text-right truncate"
          >
            02. ممر التخزين A
          </button>
          <button
            type="button"
            onClick={() => onSendToCoords(4.2, 3.2)}
            className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 text-right truncate"
          >
            03. محطة الجودة QC
          </button>
          <button
            type="button"
            onClick={() => onSendToCoords(21.0, 2.5)}
            className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 text-right truncate"
          >
            06. رصيف الشحن
          </button>
        </div>
      </div>

      {/* Camera Follow Toggle */}
      <button
        type="button"
        onClick={onToggleCameraFollow}
        className={`mt-2.5 w-full py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
          isFollowing
            ? 'bg-teal-600 text-white shadow-lg'
            : 'border border-slate-700 bg-slate-800 text-teal-300 hover:bg-slate-700'
        }`}
      >
        <Camera className="w-3.5 h-3.5" />
        <span>{isFollowing ? 'إلغاء تتبع العامل' : 'تتبع كاميرا العامل (3rd Person)'}</span>
      </button>
    </div>
  );
};
