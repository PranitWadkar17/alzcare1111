'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Pill, Utensils, Activity, Bell, Clock, Heart, CheckCircle2,
  TrendingUp, Zap, Shield, Phone, MapPin, Send, Droplets,
  Brain, Smile, AlertTriangle, Sparkles,
} from 'lucide-react';
import { useLocationTracker } from '@/hooks/useLocationTracker';
import { LocationStatus } from '@/components/patient/LocationStatus';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
  createTask, getTodaysTasks, subscribeToTasks, SharedTask,
} from '@/lib/task-service';

const supabase = createBrowserSupabaseClient();

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    let id: number, w = (c.width = window.innerWidth), h = (c.height = window.innerHeight);
    const ps = Array.from({ length: 50 }, () => ({
      x: Math.random()*w, y: Math.random()*h,
      vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3, r: Math.random()*1.5+0.5,
    }));
    const draw = () => {
      ctx.clearRect(0,0,w,h);
      ps.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>w) p.vx*=-1; if(p.y<0||p.y>h) p.vy*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle='rgba(16,185,129,0.5)'; ctx.fill();
      });
      ps.forEach((a,i) => ps.slice(i+1).forEach(b => {
        const d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d<130){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
        ctx.strokeStyle=`rgba(16,185,129,${(1-d/130)*0.1})`;ctx.lineWidth=0.5;ctx.stroke();}
      }));
      id=requestAnimationFrame(draw);
    };
    draw();
    const rs=()=>{w=c.width=window.innerWidth;h=c.height=window.innerHeight;};
    window.addEventListener('resize',rs);
    return()=>{cancelAnimationFrame(id);window.removeEventListener('resize',rs);};
  },[]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full opacity-70" />;
}

const QUICK_ITEMS = [
  { name:'Took Medicine', icon:Pill,      grad:'from-emerald-500 to-teal-600',  glow:'shadow-emerald-500/20' },
  { name:'Ate Food',      icon:Utensils,  grad:'from-amber-500 to-orange-600',  glow:'shadow-amber-500/20' },
  { name:'Went Outside',  icon:Activity,  grad:'from-sky-500 to-blue-600',      glow:'shadow-sky-500/20' },
  { name:'Drank Water',   icon:Droplets,  grad:'from-cyan-500 to-sky-600',      glow:'shadow-cyan-500/20' },
  { name:'Brain Activity',icon:Brain,     grad:'from-violet-500 to-purple-600', glow:'shadow-violet-500/20' },
  { name:'Feeling Good',  icon:Smile,     grad:'from-yellow-500 to-amber-600',  glow:'shadow-yellow-500/20' },
];

const TIPS = [
  { title:'Stay Hydrated', desc:'Drink at least 8 glasses of water daily for better brain health.', icon:Droplets, color:'text-cyan-400', bg:'bg-cyan-500/15' },
  { title:'Daily Walk', desc:'A 20-minute walk improves memory and reduces anxiety.', icon:Activity, color:'text-sky-400', bg:'bg-sky-500/15' },
  { title:'Brain Exercise', desc:'Puzzles, reading, and games keep your mind sharp.', icon:Brain, color:'text-violet-400', bg:'bg-violet-500/15' },
  { title:'Healthy Diet', desc:'Omega-3 rich foods like fish support cognitive function.', icon:Heart, color:'text-rose-400', bg:'bg-rose-500/15' },
];

export default function PatientDashboard() {
  const [patientId,setPatientId] = useState('');
  const [tasks,setTasks] = useState<SharedTask[]>([]);
  const [logged,setLogged] = useState<Set<string>>(new Set());
  const [time,setTime] = useState('');
  const [greeting,setGreeting] = useState('');
  const [calling,setCalling] = useState(false);
  const [locSent,setLocSent] = useState(false);
  const [tipIdx,setTipIdx] = useState(0);
  const router = useRouter();

  useEffect(()=>{supabase.auth.getUser().then(({data:{user}})=>{if(user)setPatientId(user.id);});},[]);

  useEffect(()=>{
    const u=()=>{const n=new Date();setTime(n.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));
    const h=n.getHours();setGreeting(h<12?'Good Morning':h<18?'Good Afternoon':'Good Evening');};
    u();const id=setInterval(u,1000);return()=>clearInterval(id);
  },[]);

  useEffect(()=>{setTasks(getTodaysTasks());const u=subscribeToTasks(()=>setTasks(getTodaysTasks()));return u;},[]);
  useEffect(()=>{setTipIdx(Math.floor(Math.random()*TIPS.length));},[]);

  const {lat,lng,accuracy,lastUpdated,isTracking,error,refreshLocation} =
    useLocationTracker({patientId,interval:3000,enabled:!!patientId});

  const logActivity=(name:string)=>{
    if(logged.has(name))return;const now=new Date();
    createTask({patient_label:'patient',caregiver_label:'patient',message:name,
      scheduled_time:now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
      date:now.toISOString().split('T')[0]});
    setLogged(p=>new Set(p).add(name));setTasks(getTodaysTasks());
  };

  const callCaregiver=()=>{setCalling(true);setTimeout(()=>setCalling(false),3000);};
  const sendLocation=()=>{refreshLocation();setLocSent(true);setTimeout(()=>setLocSent(false),3000);};

  const caregiverTasks=tasks.filter(t=>t.caregiver_label!=='patient');
  const selfLogs=tasks.filter(t=>t.caregiver_label==='patient');
  const nextReminder=caregiverTasks.find(t=>t.status==='pending');
  const pendingCount=caregiverTasks.filter(t=>t.status==='pending').length;
  const doneCount=caregiverTasks.filter(t=>t.status==='done').length;
  const totalToday=selfLogs.length;
  const tip=TIPS[tipIdx];

  const wellnessScore = Math.min(100, totalToday * 18 + doneCount * 15 + (isTracking?10:0));

  return (
    <div className="relative min-h-screen text-white overflow-hidden bg-[#020617]">
      <ParticleCanvas />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[450px] h-[450px] bg-emerald-500/8 rounded-full blur-[120px]"/>
        <div className="absolute bottom-0 right-1/3 w-[350px] h-[350px] bg-teal-500/6 rounded-full blur-[100px]"/>
        <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-violet-500/6 rounded-full blur-[90px]"/>
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── HEADER ── */}
        <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"/>
              </span>
              <span className="text-xs text-emerald-400 font-semibold tracking-wide uppercase">Your Dashboard</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-emerald-100 to-emerald-400 bg-clip-text text-transparent">
              {greeting} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">Here&apos;s your daily overview</p>
          </div>
          <motion.div whileHover={{scale:1.03}}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/10">
            <div className="p-2 rounded-xl bg-emerald-500/20"><Clock className="w-4 h-4 text-emerald-400"/></div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Current Time</p>
              <p className="text-xl font-bold font-mono text-white">{time}</p>
            </div>
          </motion.div>
        </motion.div>

        {/* ── WELLNESS + EMERGENCY ROW ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Wellness Score */}
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.08}}
            className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-emerald-500/10 blur-2xl"/>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-emerald-500/20"><Sparkles className="w-4 h-4 text-emerald-400"/></div>
              <div>
                <p className="text-xs text-slate-500">Daily Wellness</p>
                <p className="text-sm font-semibold text-white">Score</p>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-extrabold text-emerald-400 tabular-nums">{wellnessScore}</span>
              <span className="text-sm text-slate-500 mb-1">/100</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div initial={{width:0}} animate={{width:`${wellnessScore}%`}} transition={{duration:1,delay:0.5}}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"/>
            </div>
            <p className="text-[10px] text-slate-600 mt-2">Log activities & complete reminders to improve</p>
          </motion.div>

          {/* Call Caregiver */}
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.14}}
            whileHover={{scale:1.02,y:-2}} whileTap={{scale:0.98}} onClick={callCaregiver}
            className={`p-5 rounded-2xl cursor-pointer relative overflow-hidden transition-all ${
              calling ? 'bg-emerald-500/15 border border-emerald-400/30' : 'bg-white/5 backdrop-blur-xl border border-white/10 hover:border-emerald-400/20'
            }`}>
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-emerald-500/8 blur-2xl"/>
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`p-4 rounded-2xl ${calling?'bg-emerald-500/30 animate-pulse':'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25'}`}>
                <Phone className="w-7 h-7 text-white"/>
              </div>
              <div>
                <p className="text-sm font-semibold">{calling?'Calling...':'Call Caregiver'}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{calling?'Connecting you now':'Tap to call for help'}</p>
              </div>
              {calling && (
                <motion.div initial={{scale:0}} animate={{scale:1}} className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"/></span>
                  Ringing caregiver...
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Send Location */}
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}}
            whileHover={{scale:1.02,y:-2}} whileTap={{scale:0.98}} onClick={sendLocation}
            className={`p-5 rounded-2xl cursor-pointer relative overflow-hidden transition-all ${
              locSent ? 'bg-sky-500/15 border border-sky-400/30' : 'bg-white/5 backdrop-blur-xl border border-white/10 hover:border-sky-400/20'
            }`}>
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-sky-500/8 blur-2xl"/>
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`p-4 rounded-2xl ${locSent?'bg-sky-500/30':'bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/25'}`}>
                {locSent ? <CheckCircle2 className="w-7 h-7 text-white"/> : <Send className="w-7 h-7 text-white"/>}
              </div>
              <div>
                <p className="text-sm font-semibold">{locSent?'Location Sent!':'Send My Location'}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{locSent?'Caregiver can see you':'Share live location now'}</p>
              </div>
              {isTracking && !locSent && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <MapPin className="w-3 h-3"/> GPS Active
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── EMERGENCY SOS ── */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.25}}
          className="p-4 rounded-2xl bg-gradient-to-r from-red-500/10 to-rose-500/5 border border-red-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/20"><AlertTriangle className="w-5 h-5 text-red-400"/></div>
            <div>
              <p className="text-sm font-semibold text-red-300">Emergency SOS</p>
              <p className="text-xs text-slate-500">Alert your caregiver immediately</p>
            </div>
          </div>
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
            onClick={()=>{callCaregiver();sendLocation();}}
            className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition flex items-center gap-2">
            <Phone className="w-4 h-4"/> SOS
          </motion.button>
        </motion.div>

        {/* ── LOCATION ── */}
        <LocationStatus lat={lat} lng={lng} accuracy={accuracy} lastUpdated={lastUpdated}
          isTracking={isTracking} error={error} onRefresh={refreshLocation}/>

        {/* ── QUICK LOG ── */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/20"><Zap className="w-4 h-4 text-emerald-400"/></div>
            <h2 className="text-base font-semibold text-white">Quick Log</h2>
            <p className="text-xs text-slate-500 ml-1">Tap to log an activity</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_ITEMS.map((a,i)=>{
              const done=logged.has(a.name);
              return(
                <motion.div key={i} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1+i*0.05}}
                  whileHover={{scale:done?1:1.05,y:done?0:-3}} whileTap={{scale:done?1:0.97}}
                  onClick={()=>logActivity(a.name)}
                  className={`relative p-4 rounded-2xl cursor-pointer overflow-hidden group transition-all ${
                    done?'bg-emerald-500/15 border border-emerald-400/30':'bg-white/[0.04] border border-white/[0.08] hover:border-emerald-400/30'}`}>
                  {!done&&<div className={`absolute inset-0 bg-gradient-to-br ${a.grad} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}/>}
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className={`p-2.5 rounded-xl ${done?'bg-emerald-500/20':`bg-gradient-to-br ${a.grad} shadow-lg ${a.glow}`}`}>
                      <a.icon className={`w-5 h-5 ${done?'text-emerald-400':'text-white'}`}/>
                    </div>
                    <span className="text-[11px] font-medium leading-tight text-center">{a.name}</span>
                    {done&&<motion.span initial={{scale:0}} animate={{scale:1}} className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3 h-3"/>Done</motion.span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── BOTTOM GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Today's Activity */}
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.35}}
            className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-teal-500 rounded-l-2xl"/>
            <div className="flex items-center gap-2.5 mb-4 pl-2">
              <div className="p-2 rounded-xl bg-emerald-500/20"><TrendingUp className="w-4 h-4 text-emerald-400"/></div>
              <div><h3 className="font-semibold text-sm">Today&apos;s Activity</h3><p className="text-xs text-slate-500">{selfLogs.length} logged</p></div>
            </div>
            {selfLogs.length>0?(
              <div className="space-y-2 pl-2 max-h-[200px] overflow-y-auto pr-1">
                {selfLogs.map(t=>(
                  <motion.div key={t.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0"/>
                    <p className="text-sm flex-1 truncate">{t.message}</p>
                    <span className="text-xs text-slate-500 shrink-0">{t.scheduled_time}</span>
                  </motion.div>))}
              </div>
            ):(
              <div className="flex flex-col items-center py-5 text-center">
                <div className="p-3 rounded-full bg-white/5 mb-3"><Activity className="w-6 h-6 text-slate-600"/></div>
                <p className="text-sm text-slate-500">No activity logged yet</p>
                <p className="text-xs text-slate-600 mt-1">Tap a card above to log</p>
              </div>
            )}
          </motion.div>

          {/* Reminders */}
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.42}}
            className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-violet-500/15 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-400 to-purple-500 rounded-l-2xl"/>
            <div className="flex items-center justify-between mb-4 pl-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/20"><Bell className="w-4 h-4 text-violet-400"/></div>
                <div><h3 className="font-semibold text-sm">Reminders</h3><p className="text-xs text-slate-500">From caregiver</p></div>
              </div>
              <div className="flex items-center gap-2">
                {pendingCount>0&&<motion.span initial={{scale:0}} animate={{scale:1}}
                  className="flex items-center gap-1.5 text-[11px] bg-violet-500 text-white px-2.5 py-1 rounded-full font-bold shadow-lg shadow-violet-500/30">
                  <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"/><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"/></span>
                  {pendingCount} pending</motion.span>}
                {doneCount>0&&<span className="text-[11px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">{doneCount} done</span>}
              </div>
            </div>
            {nextReminder?(
              <div className="space-y-3 pl-2">
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/15">
                  <p className="text-xs text-violet-400 mb-1 font-semibold uppercase tracking-wide">Next Up</p>
                  <p className="text-sm leading-relaxed">{nextReminder.message}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20">
                      <Clock className="w-3.5 h-3.5 text-violet-400"/><span className="text-xs text-violet-300 font-medium">{nextReminder.scheduled_time}</span>
                    </div>
                  </div>
                </div>
                {pendingCount>1&&<motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                  onClick={()=>router.push('/patient/reminders')}
                  className="w-full py-2.5 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/8 transition-all flex items-center justify-center gap-1.5">
                  View all {pendingCount} reminders →</motion.button>}
              </div>
            ):(
              <div className="flex flex-col items-center py-5 text-center">
                <div className="p-3 rounded-full bg-emerald-500/10 mb-3"><Shield className="w-6 h-6 text-emerald-600"/></div>
                <p className="text-sm text-slate-500">No upcoming reminders</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── HEALTH TIP ── */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.5}}
          className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-emerald-500/5 blur-3xl"/>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${tip.bg} shrink-0`}><tip.icon className={`w-6 h-6 ${tip.color}`}/></div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">💡 Daily Health Tip</p>
              <p className="text-sm font-semibold text-white">{tip.title}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{tip.desc}</p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}