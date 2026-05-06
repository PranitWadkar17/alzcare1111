"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Bell, Volume2, Moon, Smartphone, Trash2, Languages } from "lucide-react";

export default function SettingsPage() {
  const [sound, setSound] = useState(true);
  const [reminder, setReminder] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [vibration, setVibration] = useState(false);
  const [theme, setTheme] = useState("emerald");
  const [language, setLanguage] = useState("English");

  // 🎨 Theme styles
  const themes: any = {
    emerald: "from-emerald-500/20 via-[#020617] to-[#020617]",
    blue: "from-blue-500/20 via-[#020617] to-[#020617]",
    purple: "from-purple-500/20 via-[#020617] to-[#020617]",
  };

  const languages = ["English", "Spanish", "French", "German", "Hindi", "Marathi"];

  // Load settings
  useEffect(() => {
    const s = localStorage.getItem("sound");
    const r = localStorage.getItem("reminder");
    const d = localStorage.getItem("darkMode");
    const v = localStorage.getItem("vibration");
    const t = localStorage.getItem("theme");
    const l = localStorage.getItem("language");

    if (s !== null) setSound(s === "true");
    if (r !== null) setReminder(r === "true");
    if (d !== null) setDarkMode(d === "true");
    if (v !== null) setVibration(v === "true");
    if (t) setTheme(t);
    if (l) setLanguage(l);
  }, []);

  // Save settings
  useEffect(() => localStorage.setItem("sound", sound.toString()), [sound]);
  useEffect(() => localStorage.setItem("reminder", reminder.toString()), [reminder]);
  useEffect(() => localStorage.setItem("darkMode", darkMode.toString()), [darkMode]);
  useEffect(() => localStorage.setItem("vibration", vibration.toString()), [vibration]);
  useEffect(() => localStorage.setItem("theme", theme), [theme]);
  useEffect(() => localStorage.setItem("language", language), [language]);

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

      <div className="space-y-4 max-w-2xl mx-auto">

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

        {/* 🌐 Language Selector */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="p-6 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Languages className="w-5 h-5" />
            </div>
            <p className="font-bold text-lg">Language</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {languages.map((l) => (
              <div
                key={l}
                onClick={() => setLanguage(l)}
                className={`px-4 py-3 rounded-2xl cursor-pointer text-center text-sm font-medium transition-all border ${
                  language === l
                    ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                }`}
              >
                {l}
              </div>
            ))}
          </div>
        </motion.div>

        {/* 🎨 Theme Selector */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="p-6 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl"
        >
          <p className="font-bold text-lg mb-4">Theme</p>

          <div className="flex gap-4">
            {Object.keys(themes).map((t) => (
              <div
                key={t}
                onClick={() => setTheme(t)}
                className={`w-12 h-12 rounded-2xl cursor-pointer bg-gradient-to-br ${
                  t === "emerald"
                    ? "from-emerald-400 to-teal-600 shadow-emerald-500/20"
                    : t === "blue"
                    ? "from-blue-400 to-indigo-600 shadow-blue-500/20"
                    : "from-purple-400 to-pink-600 shadow-purple-500/20"
                } border-2 ${
                  theme === t ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
                } transition-all duration-300 shadow-lg`}
              />
            ))}
          </div>
        </motion.div>

        {/* Clear Data */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          onClick={clearData}
          className="p-6 rounded-[32px] bg-red-500/5 border border-red-500/20 cursor-pointer flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 group-hover:bg-red-500/20 transition-colors">
              <Trash2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-red-400">Clear App Data</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-red-500/40">Reset Everything</span>
        </motion.div>

      </div>
    </div>
  );
}

/* 🔹 Reusable Setting Card */
function SettingCard({ title, value, onToggle, icon }: any) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="p-6 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl flex justify-between items-center"
    >
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
          {icon}
        </div>
        <span className="font-bold text-lg">{title}</span>
      </div>

      <button
        onClick={onToggle}
        className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
          value ? "bg-emerald-500" : "bg-slate-700"
        }`}
      >
        <motion.div
          animate={{ x: value ? 24 : 4 }}
          className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
        />
      </button>
    </motion.div>
  );
}