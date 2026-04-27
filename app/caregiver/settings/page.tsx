"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Bell, Volume2, Moon, Smartphone, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [sound, setSound] = useState(true);
  const [reminder, setReminder] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [vibration, setVibration] = useState(false);
  const [theme, setTheme] = useState("emerald");

  // 🎨 Theme styles
  const themes: any = {
    emerald: "from-emerald-500/20 via-[#020617] to-[#020617]",
    blue: "from-blue-500/20 via-[#020617] to-[#020617]",
    purple: "from-purple-500/20 via-[#020617] to-[#020617]",
  };

  // Load settings
  useEffect(() => {
    const s = localStorage.getItem("sound");
    const r = localStorage.getItem("reminder");
    const d = localStorage.getItem("darkMode");
    const v = localStorage.getItem("vibration");
    const t = localStorage.getItem("theme");

    if (s !== null) setSound(s === "true");
    if (r !== null) setReminder(r === "true");
    if (d !== null) setDarkMode(d === "true");
    if (v !== null) setVibration(v === "true");
    if (t) setTheme(t);
  }, []);

  // Save settings
  useEffect(() => localStorage.setItem("sound", sound.toString()), [sound]);
  useEffect(() => localStorage.setItem("reminder", reminder.toString()), [reminder]);
  useEffect(() => localStorage.setItem("darkMode", darkMode.toString()), [darkMode]);
  useEffect(() => localStorage.setItem("vibration", vibration.toString()), [vibration]);
  useEffect(() => localStorage.setItem("theme", theme), [theme]);

  // Clear data
  const clearData = () => {
    localStorage.clear();
    window.location.reload();
  };

  // 🎯 Background class (FULL PAGE THEME APPLY)
  const bgClass = darkMode
    ? `bg-gradient-to-br ${themes[theme]} text-white`
    : "bg-slate-100 text-black";

  return (
    <div className={`min-h-screen p-6 transition-all duration-500 ${bgClass}`}>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="text-emerald-400" />
          Settings
        </h1>
        <p className="text-slate-400 text-sm">Manage your preferences</p>
      </div>

      <div className="space-y-4">

        {/* Sound */}
        <SettingCard
          title="Sound"
          value={sound}
          onToggle={() => setSound(!sound)}
          icon={<Volume2 />}
        />

        {/* Reminder */}
        <SettingCard
          title="Notifications"
          value={reminder}
          onToggle={() => setReminder(!reminder)}
          icon={<Bell />}
        />

        {/* Dark Mode */}
        <SettingCard
          title="Dark Mode"
          value={darkMode}
          onToggle={() => setDarkMode(!darkMode)}
          icon={<Moon />}
        />

        {/* Vibration */}
        <SettingCard
          title="Vibration"
          value={vibration}
          onToggle={() => setVibration(!vibration)}
          icon={<Smartphone />}
        />

        {/* 🎨 Theme Selector */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-5 rounded-2xl bg-white/5 border border-white/10"
        >
          <p className="text-sm mb-3">Theme</p>

          <div className="flex gap-4">
            {Object.keys(themes).map((t) => (
              <div
                key={t}
                onClick={() => setTheme(t)}
                className={`w-10 h-10 rounded-xl cursor-pointer bg-gradient-to-br ${
                  t === "emerald"
                    ? "from-emerald-400 to-teal-600"
                    : t === "blue"
                    ? "from-blue-400 to-indigo-600"
                    : "from-purple-400 to-pink-600"
                } border-2 ${
                  theme === t ? "border-white scale-110" : "border-transparent"
                } transition`}
              />
            ))}
          </div>
        </motion.div>

        {/* Clear Data */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={clearData}
          className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 cursor-pointer flex items-center gap-3"
        >
          <Trash2 className="text-red-400" />
          <span className="text-sm text-red-400">Clear App Data</span>
        </motion.div>

      </div>
    </div>
  );
}

/* 🔹 Reusable Setting Card */
function SettingCard({ title, value, onToggle, icon }: any) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-5 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center"
    >
      <div className="flex items-center gap-3">
        <div className="text-emerald-400">{icon}</div>
        <span className="text-sm">{title}</span>
      </div>

      <button
        onClick={onToggle}
        className={`px-4 py-2 rounded-xl text-sm transition ${
          value
            ? "bg-emerald-500 hover:bg-emerald-600"
            : "bg-slate-600 hover:bg-slate-500"
        }`}
      >
        {value ? "ON" : "OFF"}
      </button>
    </motion.div>
  );
}