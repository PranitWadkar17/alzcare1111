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
import AIChatbot from '@/components/patient/AIChatbot';
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
    const ps = Array.from({ length: 80 }, () => ({
      x: Math.random()*w, y: Math.random()*h,
      vx: (Math.random()-0.5)*0.25, vy: (Math.random()-0.5)*0.25, r: Math.random()*1.8+0.4,
    }));
    const draw = () => {
      ctx.clearRect(0,0,w,h);
      ps.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>w) p.vx*=-1; if(p.y<0||p.y>h) p.vy*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*2);
        gradient.addColorStop(0, 'rgba(16,185,129,0.6)');
        gradient.addColorStop(0.5, 'rgba(6,182,212,0.4)');
        gradient.addColorStop(1, 'rgba(16,185,129,0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      });
      ps.forEach((a,i) => ps.slice(i+1).forEach(b => {
        const d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d<140){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
        ctx.strokeStyle=`rgba(6,182,212,${(1-d/140)*0.12})`;ctx.lineWidth=0.8;ctx.stroke();}
      }));
      id=requestAnimationFrame(draw);
    };
    draw();
    const rs=()=>{w=c.width=window.innerWidth;h=c.height=window.innerHeight;};
    window.addEventListener('resize',rs);
    return()=>{cancelAnimationFrame(id);window.removeEventListener('resize',rs);};
  },[]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full opacity-40" />;
}

const QUICK_ITEMS = [
  { name:'Took Medicine', icon:Pill,      grad:'from-emerald-400 via-emerald-500 to-teal-500',  glow:'shadow-emerald-400/30' },
  { name:'Ate Food',      icon:Utensils,  grad:'from-amber-400 via-orange-500 to-orange-600',  glow:'shadow-amber-400/30' },
  { name:'Went Outside',  icon:Activity,  grad:'from-sky-400 via-cyan-500 to-blue-500',      glow:'shadow-cyan-400/30' },
  { name:'Drank Water',   icon:Droplets,  grad:'from-cyan-400 via-cyan-500 to-sky-500',      glow:'shadow-cyan-400/30' },
  { name:'Brain Activity',icon:Brain,     grad:'from-violet-400 via-purple-500 to-purple-600', glow:'shadow-violet-400/30' },
  { name:'Feeling Good',  icon:Smile,     grad:'from-yellow-400 via-amber-500 to-amber-600',  glow:'shadow-yellow-400/30' },
];

const TIPS = [
  { title:'Stay Hydrated', desc:'Drink at least 8 glasses of water daily for better brain health.', icon:Droplets, color:'text-cyan-300', bg:'bg-cyan-500/10' },
  { title:'Daily Walk', desc:'A 20-minute walk improves memory and reduces anxiety.', icon:Activity, color:'text-sky-300', bg:'bg-sky-500/10' },
  { title:'Brain Exercise', desc:'Puzzles, reading, and games keep your mind sharp.', icon:Brain, color:'text-violet-300', bg:'bg-violet-500/10' },
  { title:'Healthy Diet', desc:'Omega-3 rich foods like fish support cognitive function.', icon:Heart, color:'text-rose-300', bg:'bg-rose-500/10' },
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

  useEffect(()=>{supabase.auth.getUser().then(({data:{user}}: {data:{user: any}})=>{if(user)setPatientId(user.id);});},[]);

  useEffect(()=>{
    const u=()=>{const n=new Date();setTime(n.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));
    const h=n.getHours();setGreeting(h<12?'Good Morning':h<18?'Good Afternoon':'Good Evening');};
    u();const id=setInterval(u,1000);return()=>clearInterval(id);
  },[]);

  useEffect(()=>{setTasks(getTodaysTasks());const u=subscribeToTasks(()=>setTasks(getTodaysTasks()));return u;},[]);
  useEffect(()=>{setTipIdx(Math.floor(Math.random()*TIPS.length));},[]);

  const {lat,lng,accuracy,lastUpdated,isTracking,error,refreshLocation} =
    useLocationTracker({patientId,interval:3000,enabled:true});

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
    <div className="relative min-h-screen text-white overflow-hidden bg-gradient-to-br from-[#050816] via-[#07111f] to-[#050816]">
      <ParticleCanvas />
      
      {/* Cinematic Ambient Lighting */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.08, 0.12, 0.08],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-[140px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.06, 0.1, 0.06],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 right-1/3 w-[500px] h-[500px] bg-cyan-400/8 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.05, 0.08, 0.05],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-violet-400/6 rounded-full blur-[100px]"
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 py-8 space-y-8">

        {/* ── CINEMATIC HEADER ── */}
        <motion.div 
          initial={{opacity:0,y:-30}} 
          animate={{opacity:1,y:0}}
          transition={{duration:0.6}}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        >
          <div className="relative">
            {/* Glow effect behind text */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-transparent blur-3xl opacity-60" />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 shadow-lg shadow-emerald-400/50"/>
                </span>
                <span className="text-xs text-emerald-300 font-bold tracking-[0.2em] uppercase">Live Dashboard</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black bg-gradient-to-r from-white via-emerald-200 to-cyan-300 bg-clip-text text-transparent leading-tight tracking-tight">
                {greeting} 👋
              </h1>
              <p className="text-slate-400 text-base mt-2 font-medium">Your personalized health overview</p>
            </div>
          </div>
          
          {/* Floating Clock Widget */}
          <motion.div 
            whileHover={{scale:1.03, y:-2}}
            className="flex items-center gap-4 px-6 py-4 rounded-3xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/20 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 relative">
              <Clock className="w-5 h-5 text-emerald-300"/>
            </div>
            <div className="relative">
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-bold mb-0.5">Current Time</p>
              <p className="text-2xl font-black font-mono text-white tracking-tight">{time}</p>
            </div>
          </motion.div>
        </motion.div>

        {/* ── PREMIUM STATS ROW ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Wellness Score - Cinematic Card */}
          <motion.div 
            initial={{opacity:0,y:30}} 
            animate={{opacity:1,y:0}} 
            transition={{delay:0.1, duration:0.5}}
            whileHover={{y:-4, scale:1.01}}
            className="group p-7 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 relative overflow-hidden shadow-2xl shadow-emerald-500/10"
          >
            {/* Animated gradient overlay */}
            <motion.div 
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundSize: '200% 200%' }}
            />
            
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-emerald-400/10 blur-3xl group-hover:bg-emerald-400/20 transition-all duration-500"/>
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-400/20 shadow-lg shadow-emerald-500/20">
                  <Sparkles className="w-5 h-5 text-emerald-300"/>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Daily Wellness</p>
                  <p className="text-sm font-black text-white">Score</p>
                </div>
              </div>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-5xl font-black text-transparent bg-gradient-to-br from-emerald-300 to-cyan-300 bg-clip-text tabular-nums">{wellnessScore}</span>
                <span className="text-lg text-slate-500 mb-2 font-bold">/100</span>
              </div>
              <div className="relative h-2.5 rounded-full bg-white/5 overflow-hidden shadow-inner">
                <motion.div 
                  initial={{width:0}} 
                  animate={{width:`${wellnessScore}%`}} 
                  transition={{duration:1.2,delay:0.5, ease:"easeOut"}}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-400 shadow-lg shadow-emerald-500/50"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-3 font-medium">Log activities & complete reminders to improve</p>
            </div>
          </motion.div>

          {/* Call Caregiver - Premium Action Card */}
          <motion.div 
            initial={{opacity:0,y:30}} 
            animate={{opacity:1,y:0}} 
            transition={{delay:0.15, duration:0.5}}
            whileHover={{scale:1.02,y:-4}} 
            whileTap={{scale:0.98}} 
            onClick={callCaregiver}
            className={`group p-7 rounded-3xl cursor-pointer relative overflow-hidden transition-all duration-300 shadow-2xl ${
              calling 
                ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-emerald-400/40 shadow-emerald-500/30' 
                : 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 hover:border-emerald-400/30 shadow-black/20'
            }`}
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-emerald-400/10 blur-3xl group-hover:bg-emerald-400/20 transition-all duration-500"/>
            
            <div className="relative flex flex-col items-center text-center gap-4">
              <div className={`p-5 rounded-3xl transition-all duration-300 ${
                calling
                  ?'bg-gradient-to-br from-emerald-400/30 to-teal-400/30 animate-pulse shadow-2xl shadow-emerald-500/40'
                  :'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500 shadow-2xl shadow-emerald-500/40 group-hover:shadow-emerald-500/60 group-hover:scale-110'
              }`}>
                <Phone className="w-8 h-8 text-white"/>
              </div>
              <div>
                <p className="text-base font-black text-white mb-1">{calling?'Calling...':'Call Caregiver'}</p>
                <p className="text-xs text-slate-400 font-medium">{calling?'Connecting you now':'Tap to call for help'}</p>
              </div>
              {calling && (
                <motion.div 
                  initial={{scale:0, opacity:0}} 
                  animate={{scale:1, opacity:1}} 
                  className="flex items-center gap-2 text-xs text-emerald-300 font-bold"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"/>
                  </span>
                  Ringing caregiver...
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Send Location - Premium Action Card */}
          <motion.div 
            initial={{opacity:0,y:30}} 
            animate={{opacity:1,y:0}} 
            transition={{delay:0.2, duration:0.5}}
            whileHover={{scale:1.02,y:-4}} 
            whileTap={{scale:0.98}} 
            onClick={sendLocation}
            className={`group p-7 rounded-3xl cursor-pointer relative overflow-hidden transition-all duration-300 shadow-2xl ${
              locSent 
                ? 'bg-gradient-to-br from-cyan-500/20 to-sky-500/10 border-2 border-cyan-400/40 shadow-cyan-500/30' 
                : 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 hover:border-cyan-400/30 shadow-black/20'
            }`}
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-cyan-400/10 blur-3xl group-hover:bg-cyan-400/20 transition-all duration-500"/>
            
            <div className="relative flex flex-col items-center text-center gap-4">
              <div className={`p-5 rounded-3xl transition-all duration-300 ${
                locSent
                  ?'bg-gradient-to-br from-cyan-400/30 to-sky-400/30 shadow-2xl shadow-cyan-500/40'
                  :'bg-gradient-to-br from-cyan-400 via-cyan-500 to-sky-500 shadow-2xl shadow-cyan-500/40 group-hover:shadow-cyan-500/60 group-hover:scale-110'
              }`}>
                {locSent ? <CheckCircle2 className="w-8 h-8 text-white"/> : <Send className="w-8 h-8 text-white"/>}
              </div>
              <div>
                <p className="text-base font-black text-white mb-1">{locSent?'Location Sent!':'Send My Location'}</p>
                <p className="text-xs text-slate-400 font-medium">{locSent?'Caregiver can see you':'Share live location now'}</p>
              </div>
              {isTracking && !locSent && (
                <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
                  <MapPin className="w-3.5 h-3.5"/> GPS Active
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── CINEMATIC EMERGENCY SOS ── */}
        <motion.div 
          initial={{opacity:0,y:30}} 
          animate={{opacity:1,y:0}} 
          transition={{delay:0.25, duration:0.5}}
          whileHover={{scale:1.01, y:-2}}
          className="group p-6 rounded-3xl bg-gradient-to-br from-red-500/15 via-red-500/10 to-rose-500/5 backdrop-blur-xl border-2 border-red-500/30 flex items-center justify-between relative overflow-hidden shadow-2xl shadow-red-500/20"
        >
          {/* Pulsing glow effect */}
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-rose-500/10 blur-xl"
          />
          
          <div className="relative flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-red-400/30 to-rose-400/30 shadow-lg shadow-red-500/30">
              <AlertTriangle className="w-6 h-6 text-red-300"/>
            </div>
            <div>
              <p className="text-base font-black text-red-200">Emergency SOS</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Alert your caregiver immediately</p>
            </div>
          </div>
          
          <motion.button 
            whileHover={{scale:1.05}} 
            whileTap={{scale:0.95}}
            onClick={()=>{callCaregiver();sendLocation();}}
            className="relative px-6 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-sm font-black text-white shadow-2xl shadow-red-500/40 transition-all flex items-center gap-2.5 group-hover:shadow-red-500/60"
          >
            <Phone className="w-4 h-4"/> 
            <span>SOS</span>
          </motion.button>
        </motion.div>

        {/* ── LOCATION STATUS ── */}
        <motion.div
          initial={{opacity:0,y:30}} 
          animate={{opacity:1,y:0}} 
          transition={{delay:0.3, duration:0.5}}
        >
          <LocationStatus 
            lat={lat} 
            lng={lng} 
            accuracy={accuracy} 
            lastUpdated={lastUpdated}
            isTracking={isTracking} 
            error={error} 
            onRefresh={refreshLocation}
          />
        </motion.div>

        {/* ── PREMIUM QUICK LOG ── */}
        <motion.div
          initial={{opacity:0,y:30}} 
          animate={{opacity:1,y:0}} 
          transition={{delay:0.35, duration:0.5}}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-400/20 shadow-lg shadow-emerald-500/20">
              <Zap className="w-5 h-5 text-emerald-300"/>
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Quick Log</h2>
              <p className="text-xs text-slate-400 font-medium">Tap to log an activity</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {QUICK_ITEMS.map((a,i)=>{
              const done=logged.has(a.name);
              return(
                <motion.div 
                  key={i} 
                  initial={{opacity:0,y:20}} 
                  animate={{opacity:1,y:0}} 
                  transition={{delay:0.4+i*0.05, duration:0.4}}
                  whileHover={{scale:done?1:1.06,y:done?0:-6}} 
                  whileTap={{scale:done?1:0.96}}
                  onClick={()=>logActivity(a.name)}
                  className={`group relative p-5 rounded-3xl cursor-pointer overflow-hidden transition-all duration-300 ${
                    done
                      ?'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-emerald-400/40 shadow-xl shadow-emerald-500/20'
                      :'bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/[0.08] hover:border-emerald-400/40 shadow-xl shadow-black/10 hover:shadow-emerald-500/20'
                  }`}
                >
                  {/* Hover gradient overlay */}
                  {!done&&<div className={`absolute inset-0 bg-gradient-to-br ${a.grad} opacity-0 group-hover:opacity-15 transition-opacity duration-500`}/>}
                  
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className={`p-3 rounded-2xl transition-all duration-300 ${
                      done
                        ?'bg-emerald-400/20 shadow-lg shadow-emerald-500/30'
                        :`bg-gradient-to-br ${a.grad} shadow-2xl ${a.glow} group-hover:scale-110 group-hover:shadow-2xl`
                    }`}>
                      <a.icon className={`w-6 h-6 ${done?'text-emerald-300':'text-white'}`}/>
                    </div>
                    <span className="text-xs font-bold leading-tight text-center text-white">{a.name}</span>
                    {done&&(
                      <motion.span 
                        initial={{scale:0, opacity:0}} 
                        animate={{scale:1, opacity:1}} 
                        className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-black"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5"/>Done
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── PREMIUM ACTIVITY & REMINDERS GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Today's Activity - Cinematic Card */}
          <motion.div 
            initial={{opacity:0,y:30}} 
            animate={{opacity:1,y:0}} 
            transition={{delay:0.45, duration:0.5}}
            whileHover={{y:-4}}
            className="group p-7 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 relative overflow-hidden shadow-2xl shadow-black/20"
          >
            {/* Accent gradient bar */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-500 rounded-l-3xl shadow-lg shadow-emerald-500/50"/>
            
            {/* Glow effect */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-400/10 blur-3xl group-hover:bg-emerald-400/15 transition-all duration-500"/>
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-6 pl-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-400/20 shadow-lg shadow-emerald-500/20">
                  <TrendingUp className="w-5 h-5 text-emerald-300"/>
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Today&apos;s Activity</h3>
                  <p className="text-xs text-slate-400 font-medium">{selfLogs.length} logged</p>
                </div>
              </div>
              
              {selfLogs.length>0?(
                <div className="space-y-3 pl-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                  {selfLogs.map(t=>(
                    <motion.div 
                      key={t.id} 
                      initial={{opacity:0,x:-15}} 
                      animate={{opacity:1,x:0}}
                      whileHover={{x:4}}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 backdrop-blur-sm shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0"/>
                      <p className="text-sm flex-1 truncate text-white font-medium">{t.message}</p>
                      <span className="text-xs text-slate-400 shrink-0 font-mono">{t.scheduled_time}</span>
                    </motion.div>
                  ))}
                </div>
              ):(
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="p-4 rounded-full bg-white/5 mb-4 shadow-inner">
                    <Activity className="w-7 h-7 text-slate-500"/>
                  </div>
                  <p className="text-sm text-slate-400 font-medium">No activity logged yet</p>
                  <p className="text-xs text-slate-500 mt-1.5">Tap a card above to log</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Reminders - Cinematic Card */}
          <motion.div 
            initial={{opacity:0,y:30}} 
            animate={{opacity:1,y:0}} 
            transition={{delay:0.5, duration:0.5}}
            whileHover={{y:-4}}
            className="group p-7 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-violet-500/20 relative overflow-hidden shadow-2xl shadow-violet-500/10"
          >
            {/* Accent gradient bar */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-violet-400 via-violet-500 to-purple-500 rounded-l-3xl shadow-lg shadow-violet-500/50"/>
            
            {/* Glow effect */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-violet-400/10 blur-3xl group-hover:bg-violet-400/15 transition-all duration-500"/>
            
            <div className="relative">
              <div className="flex items-center justify-between mb-6 pl-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-400/20 to-purple-400/20 shadow-lg shadow-violet-500/20">
                    <Bell className="w-5 h-5 text-violet-300"/>
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Reminders</h3>
                    <p className="text-xs text-slate-400 font-medium">From caregiver</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pendingCount>0&&(
                    <motion.span 
                      initial={{scale:0}} 
                      animate={{scale:1}}
                      className="flex items-center gap-2 text-xs bg-gradient-to-r from-violet-500 to-purple-500 text-white px-3 py-1.5 rounded-full font-black shadow-lg shadow-violet-500/40"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"/>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"/>
                      </span>
                      {pendingCount} pending
                    </motion.span>
                  )}
                  {doneCount>0&&(
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold">
                      {doneCount} done
                    </span>
                  )}
                </div>
              </div>
              
              {nextReminder?(
                <div className="space-y-4 pl-3">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/20 backdrop-blur-sm shadow-lg shadow-violet-500/10">
                    <p className="text-xs text-violet-300 mb-2 font-black uppercase tracking-wider">Next Up</p>
                    <p className="text-sm leading-relaxed text-white font-medium">{nextReminder.message}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 shadow-lg shadow-violet-500/10">
                        <Clock className="w-4 h-4 text-violet-300"/>
                        <span className="text-xs text-violet-200 font-bold">{nextReminder.scheduled_time}</span>
                      </div>
                    </div>
                  </div>
                  {pendingCount>1&&(
                    <motion.button 
                      whileHover={{scale:1.02, y:-2}} 
                      whileTap={{scale:0.98}}
                      onClick={()=>router.push('/patient/reminders')}
                      className="w-full py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-white/[0.08] to-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.12] hover:border-violet-400/30 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-violet-500/20"
                    >
                      View all {pendingCount} reminders →
                    </motion.button>
                  )}
                </div>
              ):(
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="p-4 rounded-full bg-emerald-500/10 mb-4 shadow-lg shadow-emerald-500/20">
                    <Shield className="w-7 h-7 text-emerald-400"/>
                  </div>
                  <p className="text-sm text-slate-400 font-medium">No upcoming reminders</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── PREMIUM HEALTH TIP ── */}
        <motion.div 
          initial={{opacity:0,y:30}} 
          animate={{opacity:1,y:0}} 
          transition={{delay:0.55, duration:0.5}}
          whileHover={{y:-4, scale:1.01}}
          className="group p-7 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/10 relative overflow-hidden shadow-2xl shadow-black/20"
        >
          {/* Animated glow */}
          <motion.div
            animate={{
              opacity: [0.05, 0.1, 0.05],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-400/10 blur-3xl"
          />
          
          <div className="relative flex items-start gap-5">
            <div className={`p-4 rounded-2xl ${tip.bg} shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-300`}>
              <tip.icon className={`w-7 h-7 ${tip.color}`}/>
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 uppercase tracking-[0.15em] font-black mb-2">💡 Daily Health Tip</p>
              <p className="text-base font-black text-white mb-2">{tip.title}</p>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">{tip.desc}</p>
            </div>
          </div>
        </motion.div>

      </div>

      {/* AI Chatbot */}
      <AIChatbot
        patientContext={{
          wellnessScore,
          todayActivities: selfLogs.length,
          pendingReminders: pendingCount,
          location: lat && lng ? { lat, lng } : undefined,
          isTracking,
        }}
        onSendLocation={sendLocation}
        onCallCaregiver={callCaregiver}
        onLogActivity={logActivity}
        onNavigate={(path) => router.push(path)}
        onShowReminders={() => router.push('/patient/reminders')}
      />
    </div>
  );
}