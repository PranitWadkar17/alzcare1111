'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  ClipboardList,
  Bell,
  AlertTriangle,
  Users,
  MapPin,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  Heart,
} from 'lucide-react';

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { name: 'Home', icon: Home, path: '/patient/dashboard' },
    { name: 'My Activities', icon: ClipboardList, path: '/patient/activities' },
    { name: 'Reminders', icon: Bell, path: '/patient/reminders' },
    { name: 'Alerts', icon: AlertTriangle, path: '/patient/alerts' },
    { name: 'Caregiver', icon: Users, path: '/patient/caregiver' },
    { name: 'Location', icon: MapPin, path: '/patient/location' },
    { name: 'Settings', icon: Settings, path: '/patient/settings' },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex min-h-screen bg-[#020617] text-white">

      {/* ── Sidebar ── */}
      <aside
        className={`
          relative flex flex-col
          bg-[#020617]/80 backdrop-blur-xl
          border-r border-white/10
          transition-all duration-300 ease-in-out
          ${open ? 'w-64' : 'w-[72px]'}
        `}
      >
        {/* Brand / Toggle */}
        <div className={`flex items-center ${open ? 'justify-between' : 'justify-center'} px-4 py-5 border-b border-white/5`}>
          {open && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold bg-gradient-to-r from-white to-emerald-300 bg-clip-text text-transparent">AlzCare</span>
            </div>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-colors"
            aria-label="Toggle sidebar"
          >
            {open ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item, i) => {
            const active = isActive(item.path);
            return (
              <div
                key={i}
                onClick={() => router.push(item.path)}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                  transition-all duration-200
                  ${active
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <div className={`
                  p-1.5 rounded-lg transition-colors
                  ${active
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-emerald-400'
                  }
                `}>
                  <item.icon className="w-4 h-4" />
                </div>
                {open && (
                  <span className={`text-sm font-medium transition-colors ${active ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'}`}>
                    {item.name}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 mt-auto border-t border-white/5 pt-3">
          <div
            onClick={() => router.push('/')}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-red-500/10 transition-all duration-200 border border-transparent hover:border-red-500/20"
          >
            <div className="p-1.5 rounded-lg bg-white/5 text-slate-400 group-hover:bg-red-500/20 group-hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </div>
            {open && <span className="text-sm font-medium text-slate-400 group-hover:text-red-400 transition-colors">Logout</span>}
          </div>
        </div>
      </aside>

      {/* ── Page Content ── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

    </div>
  );
}
