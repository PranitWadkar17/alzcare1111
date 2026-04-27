'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Home,
  Activity,
  Bell,
  Users,
  MapPin,
  HeartPulse,
  Settings,
  LogOut,
  Menu,
  AlertTriangle
} from 'lucide-react';

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  const menuItems = [
    { name: 'Dashboard', icon: Home, path: '/caregiver/dashboard' },
    { name: 'Patient Activity', icon: Activity, path: '/caregiver/activities' },
    { name: 'Reminders', icon: Bell, path: '/caregiver/reminders' },
    { name: 'Alerts', icon: AlertTriangle, path: '/caregiver/alerts' },
    { name: 'Patients', icon: Users, path: '/caregiver/patients' },
    { name: 'Location Tracking', icon: MapPin, path: '/caregiver/location' },
    { name: 'Health Status', icon: HeartPulse, path: '/caregiver/health' },
    { name: 'Settings', icon: Settings, path: '/caregiver/settings' },
  ];

  return (
    <div className="flex min-h-screen bg-[#020617] text-white">

      {/* Sidebar */}
      <div className={`bg-[#020617]/80 backdrop-blur-xl border-r border-white/10 p-4 transition-all duration-300 ${
        open ? 'w-64' : 'w-20'
      }`}>

        {/* Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="mb-6 text-slate-400 hover:text-white"
        >
          <Menu />
        </button>

        {/* Menu */}
        <div className="space-y-3">
          {menuItems.map((item, i) => (
            <div
              key={i}
              onClick={() => router.push(item.path)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-500/10 cursor-pointer"
            >
              <item.icon className="w-5 h-5 text-emerald-400" />
              {open && <span className="text-sm">{item.name}</span>}
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="absolute bottom-6 left-4 right-4">
          <div
            onClick={() => router.push('/')}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            {open && <span>Logout</span>}
          </div>
        </div>

      </div>

      {/* Page Content */}
      <div className="flex-1 p-6">
        {children}
      </div>

    </div>
  );
}