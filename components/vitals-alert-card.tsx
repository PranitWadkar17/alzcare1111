'use client';

import React from 'react';
import {
  Heart, Activity, Thermometer, Gauge, Brain, Moon, Sparkles, Clock, AlertTriangle, Eye
} from 'lucide-react';

interface VitalsData {
  heartRate: number;
  spo2: number;
  temp: number;
  bpSys: number;
  bpDia: number;
  cogScore: number;
  sleepHrs: number;
  sleepQuality: number;
  timestamp: string;
}

interface VitalsAlertCardProps {
  message: string;
}

export function parseVitals(message: string): VitalsData | null {
  try {
    const clean = message.trim();
    if (!clean.startsWith('{') || !clean.endsWith('}')) {
      return null;
    }
    const parsed = JSON.parse(clean);
    if (parsed && parsed._is_vitals === true) {
      return parsed as VitalsData;
    }
  } catch (e) {
    // Graceful fallback if not a valid JSON or parsing fails
  }
  return null;
}

export default function VitalsAlertCard({ message }: VitalsAlertCardProps) {
  const vitals = parseVitals(message);

  if (!vitals) {
    // Normal text alert
    return <p className="text-sm text-white leading-relaxed">{message}</p>;
  }

  // Helper to determine status and colors
  const getHeartRateStatus = (hr: number) => {
    if (hr < 60) return { label: 'Bradycardia', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    if (hr > 100) return { label: 'Tachycardia', color: 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse' };
    return { label: 'Normal', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  const getSpO2Status = (spo2: number) => {
    if (spo2 < 92) return { label: 'Critical Low', color: 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse' };
    if (spo2 < 95) return { label: 'Low', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Optimal', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  const getTempStatus = (temp: number) => {
    if (temp >= 100.4) return { label: 'Fever', color: 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse' };
    if (temp >= 99.0 || temp < 96.0) return { label: 'Sub-optimal', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Normal', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  const getBPStatus = (sys: number, dia: number) => {
    if (sys >= 140 || dia >= 90) return { label: 'Hypertension Stage 2', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    if (sys >= 130 || dia >= 80) return { label: 'Hypertension Stage 1', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    if (sys >= 120 && sys < 130 && dia < 80) return { label: 'Elevated', color: 'text-amber-300 bg-amber-500/5 border-amber-500/10' };
    return { label: 'Normal', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  const getCogStatus = (score: number) => {
    if (score < 60) return { label: 'Needs Support', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    if (score < 75) return { label: 'Slight Decline', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Stable', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  const getSleepStatus = (hrs: number, quality: number) => {
    if (hrs < 5 || quality < 50) return { label: 'Poor Sleep', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    if (hrs < 7 || quality < 70) return { label: 'Restless', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Excellent', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  const hrStatus = getHeartRateStatus(vitals.heartRate);
  const spo2Status = getSpO2Status(vitals.spo2);
  const tempStatus = getTempStatus(vitals.temp);
  const bpStatus = getBPStatus(vitals.bpSys, vitals.bpDia);
  const cogStatus = getCogStatus(vitals.cogScore);
  const sleepStatus = getSleepStatus(vitals.sleepHrs, vitals.sleepQuality);

  return (
    <div className="w-full mt-2 rounded-2xl bg-slate-950/80 border border-slate-800/80 p-4 overflow-hidden relative shadow-2xl backdrop-blur-xl">
      {/* Background radial highlight */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative" />
        </div>
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">🩺 Automated Vitals Check-in</span>
        <span className="text-[10px] text-slate-500 ml-auto flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(vitals.timestamp || vitals.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        
        {/* Heart Rate */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/20">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-500/10" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Heart Rate</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white">{vitals.heartRate}</span>
              <span className="text-[10px] text-slate-500 font-medium">bpm</span>
            </div>
            <span className={`inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-md border ${hrStatus.color}`}>
              {hrStatus.label}
            </span>
          </div>
        </div>

        {/* SpO2 */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/20">
              <Activity className="w-4 h-4 text-sky-400" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Oxygen Level</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white">{vitals.spo2}</span>
              <span className="text-[10px] text-slate-500 font-medium">% SpO₂</span>
            </div>
            <span className={`inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-md border ${spo2Status.color}`}>
              {spo2Status.label}
            </span>
          </div>
        </div>

        {/* Temperature */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/20">
              <Thermometer className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Temperature</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white">{vitals.temp}</span>
              <span className="text-[10px] text-slate-500 font-medium">°F</span>
            </div>
            <span className={`inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-md border ${tempStatus.color}`}>
              {tempStatus.label}
            </span>
          </div>
        </div>

        {/* Blood Pressure */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-violet-500/15 border border-violet-500/20">
              <Gauge className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Blood Pressure</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white">{vitals.bpSys}/{vitals.bpDia}</span>
              <span className="text-[10px] text-slate-500 font-medium">mmHg</span>
            </div>
            <span className={`inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-md border ${bpStatus.color}`}>
              {bpStatus.label}
            </span>
          </div>
        </div>

        {/* Cognitive Score */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-teal-500/15 border border-teal-500/20">
              <Brain className="w-4 h-4 text-teal-400" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Cognition Score</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white">{vitals.cogScore}</span>
              <span className="text-[10px] text-slate-500 font-medium">/100</span>
            </div>
            <span className={`inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-md border ${cogStatus.color}`}>
              {cogStatus.label}
            </span>
          </div>
        </div>

        {/* Sleep Monitoring */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/20">
              <Moon className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Rest & Sleep</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-white">{vitals.sleepHrs}h</span>
              <span className="text-xs font-bold text-slate-300 flex items-center gap-0.5">
                <Sparkles className="w-3 h-3 text-amber-400 fill-amber-500/10" />
                {vitals.sleepQuality}%
              </span>
            </div>
            <span className={`inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-md border ${sleepStatus.color}`}>
              {sleepStatus.label}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
