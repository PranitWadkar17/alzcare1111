"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Bell, Volume2, Moon, Smartphone, Trash2, Languages,
  User, Shield, MapPin, Heart, Activity, Clock, ChevronDown,
  ChevronUp, Save, CheckCircle2, AlertCircle, Phone, Download,
  Eye, EyeOff, Zap, Target, Volume, Palette, Globe, Lock,
  UserCircle, Mail, Calendar, Sparkles, Info
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

const supabase = createBrowserSupabaseClient();

// Types
interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface UserProfile {
  name: string;
  email: string;
  age: string;
  diagnosis_stage: string;
}

export default function SettingsPage() {
  // User & Profile
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    age: "",
    diagnosis_stage: "Early Stage"
  });
  const [profileSaveStatus, setProfileSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // App Preferences
  const [sound, setSound] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [vibration, setVibration] = useState(false);
  const [theme, setTheme] = useState("emerald");
  const [language, setLanguage] = useState("English");

  // Location & Safety
  const [locationTracking, setLocationTracking] = useState(true);
  const [trackingInterval, setTrackingInterval] = useState("3");
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [fallDetection, setFallDetection] = useState(true);

  // Notifications
  const [medicationNotif, setMedicationNotif] = useState(true);
  const [mealNotif, setMealNotif] = useState(true);
  const [activityNotif, setActivityNotif] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");

  // Accessibility
  const [fontSize, setFontSize] = useState("medium");
  const [highContrast, setHighContrast] = useState(false);
  const [voiceGuidance, setVoiceGuidance] = useState(false);
  const [simplifiedMode, setSimplifiedMode] = useState(false);
  const [largeButtons, setLargeButtons] = useState(false);

  // Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", relationship: "" });

  // UI State
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["profile"]));
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Theme styles
  const themes: any = {
    emerald: "from-emerald-500/20 via-[#020617] to-[#020617]",
    blue: "from-blue-500/20 via-[#020617] to-[#020617]",
    purple: "from-purple-500/20 via-[#020617] to-[#020617]",
  };

  const languages = ["English", "Spanish", "French", "German", "Hindi", "Marathi"];
  const diagnosisStages = ["Early Stage", "Moderate Stage", "Advanced Stage"];
  const relationships = ["Spouse", "Child", "Sibling", "Friend", "Caregiver", "Other"];

  // Load user and settings
  useEffect(() => {
    loadUserData();
    loadSettings();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      
      // Load profile from localStorage
      const savedName = localStorage.getItem("profileName");
      const savedAge = localStorage.getItem("profileAge");
      const savedStage = localStorage.getItem("profileStage");
      
      setProfile({
        name: savedName || user.user_metadata?.name || "",
        email: user.email || "",
        age: savedAge || "",
        diagnosis_stage: savedStage || "early-stage"
      });
      
      // Load emergency contacts from localStorage
      const savedContacts = localStorage.getItem("emergencyContacts");
      if (savedContacts) {
        setEmergencyContacts(JSON.parse(savedContacts));
      }
    }
  };

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Load local storage values first as fallback
    let settings: any = {
      sound: localStorage.getItem("sound"),
      notifications: localStorage.getItem("notifications"),
      darkMode: localStorage.getItem("darkMode"),
      vibration: localStorage.getItem("vibration"),
      theme: localStorage.getItem("theme"),
      language: localStorage.getItem("language"),
      locationTracking: localStorage.getItem("locationTracking"),
      trackingInterval: localStorage.getItem("trackingInterval"),
      geofenceEnabled: localStorage.getItem("geofenceEnabled"),
      fallDetection: localStorage.getItem("fallDetection"),
      medicationNotif: localStorage.getItem("medicationNotif"),
      mealNotif: localStorage.getItem("mealNotif"),
      activityNotif: localStorage.getItem("activityNotif"),
      quietHoursEnabled: localStorage.getItem("quietHoursEnabled"),
      quietStart: localStorage.getItem("quietStart"),
      quietEnd: localStorage.getItem("quietEnd"),
      fontSize: localStorage.getItem("fontSize"),
      highContrast: localStorage.getItem("highContrast"),
      voiceGuidance: localStorage.getItem("voiceGuidance"),
      simplifiedMode: localStorage.getItem("simplifiedMode"),
      largeButtons: localStorage.getItem("largeButtons"),
      profileAge: localStorage.getItem("profileAge"),
      profileStage: localStorage.getItem("profileStage"),
    };

    if (user?.user_metadata?.alzcare_settings) {
      settings = { ...settings, ...user.user_metadata.alzcare_settings };
    }

    if (settings.sound !== null) setSound(settings.sound === "true" || settings.sound === true);
    if (settings.notifications !== null) setNotifications(settings.notifications === "true" || settings.notifications === true);
    if (settings.darkMode !== null) setDarkMode(settings.darkMode === "true" || settings.darkMode === true);
    if (settings.vibration !== null) setVibration(settings.vibration === "true" || settings.vibration === true);
    if (settings.theme) setTheme(settings.theme);
    if (settings.language) setLanguage(settings.language);
    if (settings.locationTracking !== null) setLocationTracking(settings.locationTracking === "true" || settings.locationTracking === true);
    if (settings.trackingInterval) setTrackingInterval(settings.trackingInterval);
    if (settings.geofenceEnabled !== null) setGeofenceEnabled(settings.geofenceEnabled === "true" || settings.geofenceEnabled === true);
    if (settings.fallDetection !== null) setFallDetection(settings.fallDetection === "true" || settings.fallDetection === true);
    if (settings.medicationNotif !== null) setMedicationNotif(settings.medicationNotif === "true" || settings.medicationNotif === true);
    if (settings.mealNotif !== null) setMealNotif(settings.mealNotif === "true" || settings.mealNotif === true);
    if (settings.activityNotif !== null) setActivityNotif(settings.activityNotif === "true" || settings.activityNotif === true);
    if (settings.quietHoursEnabled !== null) setQuietHoursEnabled(settings.quietHoursEnabled === "true" || settings.quietHoursEnabled === true);
    if (settings.quietStart) setQuietStart(settings.quietStart);
    if (settings.quietEnd) setQuietEnd(settings.quietEnd);
    if (settings.fontSize) setFontSize(settings.fontSize);
    if (settings.highContrast !== null) setHighContrast(settings.highContrast === "true" || settings.highContrast === true);
    if (settings.voiceGuidance !== null) setVoiceGuidance(settings.voiceGuidance === "true" || settings.voiceGuidance === true);
    if (settings.simplifiedMode !== null) setSimplifiedMode(settings.simplifiedMode === "true" || settings.simplifiedMode === true);
    if (settings.largeButtons !== null) setLargeButtons(settings.largeButtons === "true" || settings.largeButtons === true);
    if (settings.profileAge) setProfile(prev => ({ ...prev, age: String(settings.profileAge) }));
    if (settings.profileStage) setProfile(prev => ({ ...prev, diagnosis_stage: settings.profileStage }));
  };

  const saveProfile = async () => {
    if (!userId) return;
    
    setProfileSaveStatus("saving");
    
    try {
      localStorage.setItem("profileName", profile.name);
      localStorage.setItem("profileAge", profile.age);
      localStorage.setItem("profileStage", profile.diagnosis_stage);
      
      const { data: { user } } = await supabase.auth.getUser();
      const currentMeta = user?.user_metadata || {};
      const currentSettings = currentMeta.alzcare_settings || {};
      
      const updatedSettings = {
        ...currentSettings,
        profileAge: profile.age,
        profileStage: profile.diagnosis_stage,
      };

      await supabase.auth.updateUser({
        data: {
          ...currentMeta,
          name: profile.name,
          alzcare_settings: updatedSettings
        }
      });
      
      setProfileSaveStatus("saved");
      setTimeout(() => setProfileSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving profile:", error);
      setProfileSaveStatus("error");
      setTimeout(() => setProfileSaveStatus("idle"), 2000);
    }
  };

  const deleteProfile = async () => {
    localStorage.removeItem("profileName");
    localStorage.removeItem("profileAge");
    localStorage.removeItem("profileStage");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const currentMeta = user?.user_metadata || {};
      const currentSettings = currentMeta.alzcare_settings || {};
      delete currentSettings.profileAge;
      delete currentSettings.profileStage;
      
      await supabase.auth.updateUser({
        data: {
          ...currentMeta,
          name: "",
          alzcare_settings: currentSettings
        }
      });
    }

    setProfile({
      name: "",
      email: profile.email,
      age: "",
      diagnosis_stage: "early-stage"
    });
  };

  const saveAllSettings = async () => {
    setSaveStatus("saving");
    
    try {
      // Save to localStorage
      localStorage.setItem("sound", sound.toString());
      localStorage.setItem("notifications", notifications.toString());
      localStorage.setItem("darkMode", darkMode.toString());
      localStorage.setItem("vibration", vibration.toString());
      localStorage.setItem("theme", theme);
      localStorage.setItem("language", language);
      localStorage.setItem("locationTracking", locationTracking.toString());
      localStorage.setItem("trackingInterval", trackingInterval);
      localStorage.setItem("geofenceEnabled", geofenceEnabled.toString());
      localStorage.setItem("fallDetection", fallDetection.toString());
      localStorage.setItem("medicationNotif", medicationNotif.toString());
      localStorage.setItem("mealNotif", mealNotif.toString());
      localStorage.setItem("activityNotif", activityNotif.toString());
      localStorage.setItem("quietHoursEnabled", quietHoursEnabled.toString());
      localStorage.setItem("quietStart", quietStart);
      localStorage.setItem("quietEnd", quietEnd);
      localStorage.setItem("fontSize", fontSize);
      localStorage.setItem("highContrast", highContrast.toString());
      localStorage.setItem("voiceGuidance", voiceGuidance.toString());
      localStorage.setItem("simplifiedMode", simplifiedMode.toString());
      localStorage.setItem("largeButtons", largeButtons.toString());
      localStorage.setItem("profileAge", profile.age);
      localStorage.setItem("profileStage", profile.diagnosis_stage);

      // Save to Supabase auth metadata
      const { data: { user } } = await supabase.auth.getUser();
      const currentMeta = user?.user_metadata || {};
      const updatedSettings = {
        sound,
        notifications,
        darkMode,
        vibration,
        theme,
        language,
        locationTracking,
        trackingInterval,
        geofenceEnabled,
        fallDetection,
        medicationNotif,
        mealNotif,
        activityNotif,
        quietHoursEnabled,
        quietStart,
        quietEnd,
        fontSize,
        highContrast,
        voiceGuidance,
        simplifiedMode,
        largeButtons,
        profileAge: profile.age,
        profileStage: profile.diagnosis_stage,
      };

      await supabase.auth.updateUser({
        data: {
          ...currentMeta,
          name: profile.name,
          alzcare_settings: updatedSettings
        }
      });

      // Apply font size globally
      document.documentElement.style.setProperty(
        "--base-font-size",
        fontSize === "small" ? "14px" : fontSize === "large" ? "18px" : fontSize === "extra-large" ? "22px" : "16px"
      );

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  const addEmergencyContact = async () => {
    if (!newContact.name || !newContact.phone) return;

    const contact = {
      id: Date.now().toString(),
      ...newContact
    };

    const updatedContacts = [...emergencyContacts, contact];
    setEmergencyContacts(updatedContacts);
    
    // Save to localStorage
    localStorage.setItem("emergencyContacts", JSON.stringify(updatedContacts));
    
    setNewContact({ name: "", phone: "", relationship: "" });
    setShowAddContact(false);
  };

  const removeEmergencyContact = async (id: string) => {
    const updatedContacts = emergencyContacts.filter(c => c.id !== id);
    setEmergencyContacts(updatedContacts);
    
    // Save to localStorage
    localStorage.setItem("emergencyContacts", JSON.stringify(updatedContacts));
  };

  const clearAllData = () => {
    localStorage.clear();
    setEmergencyContacts([]);
    window.location.href = "/patient/dashboard";
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const bgClass = darkMode
    ? `bg-gradient-to-br ${themes[theme]} text-white`
    : "bg-slate-100 text-black";

  return (
    <div className={`min-h-screen p-4 sm:p-6 lg:p-8 transition-all duration-500 ${bgClass}`}>
      
      {/* Cinematic Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 max-w-5xl mx-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-transparent blur-3xl opacity-60" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-400/20 shadow-lg shadow-emerald-500/20">
                  <Settings className="w-6 h-6 text-emerald-300" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-white via-emerald-200 to-cyan-300 bg-clip-text text-transparent">
                  Settings
                </h1>
              </div>
              <p className="text-slate-400 text-sm font-medium ml-1">Customize your AlzCare experience</p>
            </div>
          </div>

          {/* Save Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={saveAllSettings}
            disabled={saveStatus === "saving"}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl transition-all ${
              saveStatus === "saved"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                : saveStatus === "error"
                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white"
                : "bg-gradient-to-r from-emerald-400 to-cyan-400 text-white hover:shadow-emerald-500/50"
            }`}
          >
            {saveStatus === "saving" && <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Save className="w-4 h-4" /></motion.div>}
            {saveStatus === "saved" && <CheckCircle2 className="w-4 h-4" />}
            {saveStatus === "error" && <AlertCircle className="w-4 h-4" />}
            {saveStatus === "idle" && <Save className="w-4 h-4" />}
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? "Error" : "Save All"}
          </motion.button>
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto space-y-4">

        {/* Profile & Account Section */}
        <SettingsSection
          title="Profile & Account"
          icon={<UserCircle className="w-5 h-5" />}
          isExpanded={expandedSections.has("profile")}
          onToggle={() => toggleSection("profile")}
          gradient="from-emerald-400/20 to-teal-400/20"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Full Name"
                value={profile.name}
                onChange={(v) => setProfile({ ...profile, name: v })}
                icon={<User className="w-4 h-4" />}
              />
              <InputField
                label="Email"
                value={profile.email}
                onChange={(v) => setProfile({ ...profile, email: v })}
                icon={<Mail className="w-4 h-4" />}
                disabled
              />
              <InputField
                label="Age"
                value={profile.age}
                onChange={(v) => setProfile({ ...profile, age: v })}
                icon={<Calendar className="w-4 h-4" />}
                type="number"
              />
              <SelectField
                label="Diagnosis Stage"
                value={profile.diagnosis_stage}
                onChange={(v) => setProfile({ ...profile, diagnosis_stage: v })}
                options={diagnosisStages}
                icon={<Activity className="w-4 h-4" />}
              />
            </div>

            {/* Save Profile Button */}
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={saveProfile}
                disabled={profileSaveStatus === "saving"}
                className={`flex-1 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                  profileSaveStatus === "saved"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                    : profileSaveStatus === "error"
                    ? "bg-gradient-to-r from-red-500 to-rose-500 text-white"
                    : "bg-gradient-to-r from-emerald-400 to-cyan-400 text-white hover:shadow-emerald-500/50"
                }`}
              >
                {profileSaveStatus === "saving" && (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Save className="w-4 h-4" />
                  </motion.div>
                )}
                {profileSaveStatus === "saved" && <CheckCircle2 className="w-4 h-4" />}
                {profileSaveStatus === "error" && <AlertCircle className="w-4 h-4" />}
                {profileSaveStatus === "idle" && <Save className="w-4 h-4" />}
                {profileSaveStatus === "saving" ? "Saving..." : profileSaveStatus === "saved" ? "Saved!" : profileSaveStatus === "error" ? "Error" : "Save Profile"}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={deleteProfile}
                className="px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </motion.button>
            </div>

            {/* Display Current Profile Info */}
            {(profile.name || profile.age) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs font-bold text-emerald-300">Current Profile</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {profile.name && (
                    <div>
                      <p className="text-slate-400 mb-1">Name:</p>
                      <p className="font-bold text-white">{profile.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-400 mb-1">Email:</p>
                    <p className="font-bold text-white truncate">{profile.email}</p>
                  </div>
                  {profile.age && (
                    <div>
                      <p className="text-slate-400 mb-1">Age:</p>
                      <p className="font-bold text-white">{profile.age} years</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-400 mb-1">Stage:</p>
                    <p className="font-bold text-white">
                      {diagnosisStages.find(s => s.toLowerCase().replace(/\s+/g, '-') === profile.diagnosis_stage) || profile.diagnosis_stage}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Emergency Contacts */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-red-400" />
                  <h3 className="font-bold text-sm">Emergency Contacts</h3>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddContact(!showAddContact)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                >
                  + Add Contact
                </motion.button>
              </div>

              <AnimatePresence>
                {showAddContact && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3"
                  >
                    <input
                      type="text"
                      placeholder="Name"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/50"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/50"
                    />
                    <select
                      value={newContact.relationship}
                      onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-400/50 cursor-pointer appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        paddingRight: '36px'
                      }}
                    >
                      <option value="" className="bg-slate-800 text-slate-400">Select Relationship</option>
                      {relationships.map(r => <option key={r} value={r} className="bg-slate-800 text-white">{r}</option>)}
                    </select>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addEmergencyContact}
                      disabled={!newContact.name || !newContact.phone || !newContact.relationship}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Contact
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {emergencyContacts.map((contact) => (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 group hover:border-emerald-400/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{contact.name}</p>
                        <p className="text-xs text-slate-400">{contact.phone} • {contact.relationship}</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeEmergencyContact(contact.id)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </motion.div>
                ))}
                {emergencyContacts.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No emergency contacts added yet</p>
                )}
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Health & Safety Section */}
        <SettingsSection
          title="Health & Safety"
          icon={<Shield className="w-5 h-5" />}
          isExpanded={expandedSections.has("safety")}
          onToggle={() => toggleSection("safety")}
          gradient="from-cyan-400/20 to-sky-400/20"
        >
          <div className="space-y-4">
            <ToggleCard
              title="Location Tracking"
              description="Share your location with caregiver"
              value={locationTracking}
              onToggle={() => setLocationTracking(!locationTracking)}
              icon={<MapPin className="w-4 h-4" />}
            />
            
            {locationTracking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="pl-4 space-y-3"
              >
                <SelectField
                  label="Tracking Interval"
                  value={trackingInterval}
                  onChange={setTrackingInterval}
                  options={["1 minute", "3 minutes", "5 minutes", "10 minutes"]}
                  icon={<Clock className="w-4 h-4" />}
                />
                <ToggleCard
                  title="Geofence Alert"
                  description="Alert when leaving safe zone"
                  value={geofenceEnabled}
                  onToggle={() => setGeofenceEnabled(!geofenceEnabled)}
                  icon={<MapPin className="w-4 h-4" />}
                  compact
                />
              </motion.div>
            )}

            <ToggleCard
              title="Fall Detection"
              description="Automatic alert on sudden falls"
              value={fallDetection}
              onToggle={() => setFallDetection(!fallDetection)}
              icon={<AlertCircle className="w-4 h-4" />}
            />
          </div>
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection
          title="Notifications & Reminders"
          icon={<Bell className="w-5 h-5" />}
          isExpanded={expandedSections.has("notifications")}
          onToggle={() => toggleSection("notifications")}
          gradient="from-violet-400/20 to-purple-400/20"
        >
          <div className="space-y-4">
            <ToggleCard
              title="All Notifications"
              description="Master notification toggle"
              value={notifications}
              onToggle={() => setNotifications(!notifications)}
              icon={<Bell className="w-4 h-4" />}
            />

            {notifications && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="pl-4 space-y-3"
              >
                <ToggleCard
                  title="Medication Reminders"
                  description="Get notified for medicines"
                  value={medicationNotif}
                  onToggle={() => setMedicationNotif(!medicationNotif)}
                  icon={<Heart className="w-4 h-4" />}
                  compact
                />
                <ToggleCard
                  title="Meal Reminders"
                  description="Get notified for meals"
                  value={mealNotif}
                  onToggle={() => setMealNotif(!mealNotif)}
                  icon={<Activity className="w-4 h-4" />}
                  compact
                />
                <ToggleCard
                  title="Activity Reminders"
                  description="Get notified for activities"
                  value={activityNotif}
                  onToggle={() => setActivityNotif(!activityNotif)}
                  icon={<Zap className="w-4 h-4" />}
                  compact
                />

                <div className="pt-2">
                  <ToggleCard
                    title="Quiet Hours"
                    description="Silence notifications during sleep"
                    value={quietHoursEnabled}
                    onToggle={() => setQuietHoursEnabled(!quietHoursEnabled)}
                    icon={<Moon className="w-4 h-4" />}
                    compact
                  />
                  {quietHoursEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="grid grid-cols-2 gap-3 mt-3 pl-4"
                    >
                      <InputField
                        label="Start Time"
                        value={quietStart}
                        onChange={setQuietStart}
                        type="time"
                        icon={<Clock className="w-4 h-4" />}
                      />
                      <InputField
                        label="End Time"
                        value={quietEnd}
                        onChange={setQuietEnd}
                        type="time"
                        icon={<Clock className="w-4 h-4" />}
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </SettingsSection>

        {/* Accessibility Section */}
        <SettingsSection
          title="Accessibility"
          icon={<Eye className="w-5 h-5" />}
          isExpanded={expandedSections.has("accessibility")}
          onToggle={() => toggleSection("accessibility")}
          gradient="from-amber-400/20 to-orange-400/20"
        >
          <div className="space-y-4">
            <SelectField
              label="Font Size"
              value={fontSize}
              onChange={setFontSize}
              options={["Small", "Medium", "Large", "Extra Large"]}
              icon={<Info className="w-4 h-4" />}
            />
            <ToggleCard
              title="High Contrast Mode"
              description="Increase text visibility"
              value={highContrast}
              onToggle={() => setHighContrast(!highContrast)}
              icon={<Eye className="w-4 h-4" />}
            />
            <ToggleCard
              title="Voice Guidance"
              description="Read reminders aloud"
              value={voiceGuidance}
              onToggle={() => setVoiceGuidance(!voiceGuidance)}
              icon={<Volume className="w-4 h-4" />}
            />
            <ToggleCard
              title="Simplified Interface"
              description="Reduce visual complexity"
              value={simplifiedMode}
              onToggle={() => setSimplifiedMode(!simplifiedMode)}
              icon={<Target className="w-4 h-4" />}
            />
            <ToggleCard
              title="Large Touch Targets"
              description="Bigger buttons for easier tapping"
              value={largeButtons}
              onToggle={() => setLargeButtons(!largeButtons)}
              icon={<Smartphone className="w-4 h-4" />}
            />
          </div>
        </SettingsSection>

        {/* App Preferences Section */}
        <SettingsSection
          title="App Preferences"
          icon={<Palette className="w-5 h-5" />}
          isExpanded={expandedSections.has("preferences")}
          onToggle={() => toggleSection("preferences")}
          gradient="from-pink-400/20 to-rose-400/20"
        >
          <div className="space-y-4">
            <ToggleCard
              title="Sound Effects"
              description="Play sounds for interactions"
              value={sound}
              onToggle={() => setSound(!sound)}
              icon={<Volume2 className="w-4 h-4" />}
            />
            <ToggleCard
              title="Vibration"
              description="Haptic feedback on actions"
              value={vibration}
              onToggle={() => setVibration(!vibration)}
              icon={<Smartphone className="w-4 h-4" />}
            />
            <ToggleCard
              title="Dark Mode"
              description="Use dark color scheme"
              value={darkMode}
              onToggle={() => setDarkMode(!darkMode)}
              icon={<Moon className="w-4 h-4" />}
            />

            {/* Theme Selector */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <p className="font-bold text-sm">Color Theme</p>
              </div>
              <div className="flex gap-3">
                {Object.keys(themes).map((t) => (
                  <motion.div
                    key={t}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTheme(t)}
                    className={`w-14 h-14 rounded-2xl cursor-pointer bg-gradient-to-br ${
                      t === "emerald"
                        ? "from-emerald-400 to-teal-600"
                        : t === "blue"
                        ? "from-blue-400 to-indigo-600"
                        : "from-purple-400 to-pink-600"
                    } border-2 ${
                      theme === t ? "border-white scale-110 shadow-2xl" : "border-transparent opacity-60"
                    } transition-all duration-300`}
                  />
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-cyan-400" />
                <p className="font-bold text-sm">Language</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {languages.map((l) => (
                  <motion.div
                    key={l}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setLanguage(l)}
                    className={`px-3 py-2 rounded-xl cursor-pointer text-center text-xs font-medium transition-all border ${
                      language === l
                        ? "bg-emerald-500 border-emerald-400 text-white shadow-lg"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {l}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Privacy & Data Section */}
        <SettingsSection
          title="Privacy & Data"
          icon={<Lock className="w-5 h-5" />}
          isExpanded={expandedSections.has("privacy")}
          onToggle={() => toggleSection("privacy")}
          gradient="from-slate-400/20 to-gray-400/20"
        >
          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/30 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Download className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Export My Data</p>
                  <p className="text-xs text-slate-400">Download all your health data</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full p-4 rounded-2xl bg-red-500/5 border border-red-500/20 hover:border-red-400/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-red-400">Clear All Data</p>
                  <p className="text-xs text-slate-400">Reset app to default state</p>
                </div>
              </div>
            </motion.button>
          </div>
        </SettingsSection>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <p className="font-black text-lg bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              AlzCare
            </p>
          </div>
          <p className="text-xs text-slate-400">Version 1.0.0 • Made with ❤️ for caregivers</p>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl border border-red-500/30 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-red-500/20">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="font-black text-xl text-white">Clear All Data?</h3>
              </div>
              <p className="text-slate-300 text-sm mb-6">
                This will delete all your settings, preferences, and local data. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={clearAllData}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold shadow-lg shadow-red-500/30"
                >
                  Delete Everything
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Reusable Components
function SettingsSection({
  title,
  icon,
  isExpanded,
  onToggle,
  gradient,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  gradient: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden"
    >
      <motion.div
        whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
        onClick={onToggle}
        className="p-5 cursor-pointer flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
            {icon}
          </div>
          <h2 className="font-black text-lg">{title}</h2>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 border-t border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ToggleCard({
  title,
  description,
  value,
  onToggle,
  icon,
  compact = false,
}: {
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`${compact ? 'p-3' : 'p-4'} rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center hover:border-emerald-400/30 transition-all`}
    >
      <div className="flex items-center gap-3">
        <div className={`${compact ? 'p-1.5' : 'p-2'} rounded-xl bg-emerald-500/10 text-emerald-400`}>
          {icon}
        </div>
        <div>
          <p className={`font-bold ${compact ? 'text-xs' : 'text-sm'}`}>{title}</p>
          <p className={`text-slate-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>{description}</p>
        </div>
      </div>

      <button
        onClick={onToggle}
        className={`relative ${compact ? 'w-11 h-6' : 'w-14 h-8'} rounded-full transition-colors duration-300 ${
          value ? "bg-emerald-500" : "bg-slate-700"
        }`}
      >
        <motion.div
          animate={{ x: value ? (compact ? 20 : 24) : 4 }}
          className={`absolute top-1 ${compact ? 'w-4 h-4' : 'w-6 h-6'} bg-white rounded-full shadow-lg`}
        />
      </button>
    </motion.div>
  );
}

function InputField({
  label,
  value,
  onChange,
  icon,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2">
        {icon}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-emerald-400/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  icon: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2">
        {icon}
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-400/50 transition-colors appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '36px'
        }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt.toLowerCase().replace(/\s+/g, '-')} className="bg-slate-800 text-white py-2">
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
