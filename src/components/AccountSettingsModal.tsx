import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Camera, 
  Shield, 
  Globe, 
  FileText, 
  Share2, 
  Check, 
  X, 
  Loader2,
  Edit3,
  Award,
  Settings as SettingsIcon,
  Bell,
  Lock,
  Database,
  Smartphone,
  ChevronRight,
  LogOut,
  Trash2,
  Languages,
  Palette
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AccountSettingsModalProps {
  userId: number;
  onClose: () => void;
  onLogout: () => void;
}

const FRAMES = [
  { id: 'none', name: 'Standard', class: '' },
  { id: 'blue', name: 'Cyber Blue', class: 'ring-4 ring-blue-500 ring-offset-4 ring-offset-[#0A0A0A] shadow-[0_0_30px_rgba(59,130,246,0.5)]' },
  { id: 'emerald', name: 'Matrix Green', class: 'ring-4 ring-emerald-500 ring-offset-4 ring-offset-[#0A0A0A] shadow-[0_0_30px_rgba(16,185,129,0.5)]' },
  { id: 'purple', name: 'Neon Purple', class: 'ring-4 ring-purple-500 ring-offset-4 ring-offset-[#0A0A0A] shadow-[0_0_30px_rgba(168,85,247,0.5)]' },
  { id: 'gold', name: 'Royal Gold', class: 'ring-4 ring-amber-400 ring-offset-4 ring-offset-[#0A0A0A] shadow-[0_0_30px_rgba(251,191,36,0.5)]' },
];

const LANGUAGES = [
  { id: 'en', name: 'English', flag: '🇺🇸' },
  { id: 'pt', name: 'Português', flag: '🇧🇷' },
  { id: 'es', name: 'Español', flag: '🇪🇸' },
];

export default function AccountSettingsModal({ userId, onClose, onLogout }: AccountSettingsModalProps) {
  const [profile, setProfile] = useState({ bio: '', language: 'en', frame_id: 'none' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'settings' | 'security' | 'legal'>('account');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [telegramMe, setTelegramMe] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
    fetchPhoto();
    fetchTelegramMe();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/profile?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhoto = async () => {
    try {
      const res = await fetch(`/api/telegram/photo?userId=${userId}`);
      if (res.ok) {
        const blob = await res.blob();
        setPhotoUrl(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.error('Failed to fetch photo:', err);
    }
  };

  const fetchTelegramMe = async () => {
    try {
      const res = await fetch(`/api/telegram/me?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setTelegramMe(data);
      }
    } catch (err) {
      console.error('Failed to fetch Telegram profile:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...profile, frameId: profile.frame_id }),
      });
      if (res.ok) {
        // Optional: show success toast
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-0 md:p-10"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 30, opacity: 0 }} 
        animate={{ scale: 1, y: 0, opacity: 1 }} 
        className="bg-[#0A0A0A] border border-white/5 w-full max-w-5xl h-full md:h-[85vh] md:rounded-[4rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar Navigation */}
        <div className="w-full md:w-80 bg-white/5 border-b md:border-b-0 md:border-r border-white/5 p-8 flex flex-col">
          <div className="flex items-center gap-4 mb-12">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter text-white">Settings</h2>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">System Config</p>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <NavButton active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={<User className="w-5 h-5" />} label="Account" />
            <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Palette className="w-5 h-5" />} label="Appearance" />
            <NavButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<Lock className="w-5 h-5" />} label="Security" />
            <NavButton active={activeTab === 'legal'} onClick={() => setActiveTab('legal')} icon={<Shield className="w-5 h-5" />} label="Legal" />
          </div>

          <button 
            onClick={onLogout}
            className="mt-auto flex items-center gap-4 p-5 rounded-3xl text-red-500 hover:bg-red-500/10 transition-all font-black uppercase tracking-widest text-[10px]"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-transparent to-blue-500/5">
          <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-1">
            <AnimatePresence mode="wait">
              {activeTab === 'account' && (
                <motion.div 
                  key="account"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-2xl space-y-12"
                >
                  {/* Profile Header */}
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="relative group">
                      <div className={cn(
                        "w-40 h-40 rounded-[3.5rem] overflow-hidden bg-zinc-900 border border-white/5 transition-all duration-700",
                        FRAMES.find(f => f.id === profile.frame_id)?.class
                      )}>
                        {photoUrl ? (
                          <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-16 h-16 text-zinc-800" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 p-3 bg-blue-600 rounded-2xl shadow-2xl border border-blue-400/50">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    
                    <div className="text-center md:text-left space-y-2">
                      <h3 className="text-4xl font-black tracking-tighter text-white">
                        {telegramMe?.firstName || 'User'} {telegramMe?.lastName}
                      </h3>
                      <p className="text-blue-500 font-black uppercase tracking-[0.3em] text-xs">
                        @{telegramMe?.username || 'televault_user'}
                      </p>
                      <div className="flex items-center justify-center md:justify-start gap-3 pt-4">
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          MTProto v2.0
                        </span>
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                          Active Session
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bio Editor */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-6">Personal Bio</label>
                    <div className="relative group">
                      <Edit3 className="absolute left-6 top-6 w-5 h-5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                      <textarea 
                        className="w-full bg-white/5 border border-white/5 rounded-[2.5rem] py-6 pl-16 pr-8 focus:border-blue-500/50 focus:bg-white/10 transition-all outline-none min-h-[160px] font-bold text-lg text-white placeholder:text-zinc-700"
                        placeholder="Write something about yourself..."
                        value={profile.bio || ''}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard icon={<Database className="w-5 h-5" />} label="Cloud Storage" value="Unlimited" />
                    <StatCard icon={<Smartphone className="w-5 h-5" />} label="Devices" value="1 Active" />
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div 
                  key="settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-2xl space-y-12"
                >
                  {/* Frame Selection */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-6">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Profile Frames</label>
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Premium Active</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {FRAMES.map(frame => (
                        <button 
                          key={frame.id}
                          onClick={() => setProfile({ ...profile, frame_id: frame.id })}
                          className={cn(
                            "flex items-center justify-between p-6 rounded-[2rem] border transition-all group",
                            profile.frame_id === frame.id 
                              ? "bg-blue-600/10 border-blue-500/50 text-white" 
                              : "bg-white/5 border-white/5 text-zinc-500 hover:border-white/20"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn("w-10 h-10 rounded-xl border border-white/10", frame.class)} />
                            <span className="font-black uppercase tracking-widest text-xs">{frame.name}</span>
                          </div>
                          {profile.frame_id === frame.id && <Check className="w-5 h-5 text-blue-500" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language Selection */}
                  <div className="space-y-6">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] ml-6">App Language</label>
                    <div className="grid grid-cols-3 gap-4">
                      {LANGUAGES.map(lang => (
                        <button 
                          key={lang.id}
                          onClick={() => setProfile({ ...profile, language: lang.id })}
                          className={cn(
                            "flex flex-col items-center gap-3 p-6 rounded-[2rem] border transition-all",
                            profile.language === lang.id 
                              ? "bg-blue-600/10 border-blue-500/50 text-white" 
                              : "bg-white/5 border-white/5 text-zinc-500 hover:border-white/20"
                          )}
                        >
                          <span className="text-3xl">{lang.flag}</span>
                          <span className="font-black uppercase tracking-widest text-[10px]">{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div 
                  key="security"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-2xl space-y-8"
                >
                  <SecurityItem icon={<Lock className="w-5 h-5" />} title="Two-Step Verification" description="Add an extra layer of security to your account." active />
                  <SecurityItem icon={<Smartphone className="w-5 h-5" />} title="Active Sessions" description="Manage all devices currently logged into your vault." />
                  <SecurityItem icon={<Trash2 className="w-5 h-5" />} title="Delete Account" description="Permanently remove your vault and all stored data." danger />
                </motion.div>
              )}

              {activeTab === 'legal' && (
                <motion.div 
                  key="legal"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-2xl space-y-6"
                >
                  <LegalSection title="Privacy Policy" content="Your data is stored securely using Telegram's MTProto protocol. We do not store your files on our servers; they are sent directly to your Telegram Saved Messages. We only store metadata required to organize your vault." />
                  <LegalSection title="Terms of Service" content="By using TeleVault, you agree to comply with Telegram's Terms of Service. You are responsible for the content you upload. TeleVault is a tool for personal cloud storage and does not facilitate illegal file sharing." />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Bar */}
          <div className="p-8 md:p-12 border-t border-white/5 bg-white/5 flex items-center justify-between">
            <button onClick={onClose} className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white transition-colors">
              Discard Changes
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-12 py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-[2rem] font-black text-sm text-white transition-all flex items-center gap-3 shadow-2xl shadow-blue-500/40 active:scale-95"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Save Configuration
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-5 rounded-3xl transition-all group",
        active ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
      )}
    >
      <div className="flex items-center gap-4">
        {icon}
        <span className="font-black uppercase tracking-widest text-[10px]">{label}</span>
      </div>
      <ChevronRight className={cn("w-4 h-4 transition-transform", active ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
    </button>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 space-y-4">
      <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function SecurityItem({ icon, title, description, active, danger }: { icon: React.ReactNode, title: string, description: string, active?: boolean, danger?: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-6 rounded-[2rem] border transition-all",
      danger ? "bg-red-500/5 border-red-500/10" : "bg-white/5 border-white/5"
    )}>
      <div className="flex items-center gap-6">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", danger ? "bg-red-500/10 text-red-500" : "bg-blue-600/10 text-blue-500")}>
          {icon}
        </div>
        <div>
          <h4 className={cn("font-black uppercase tracking-widest text-xs", danger ? "text-red-500" : "text-white")}>{title}</h4>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{description}</p>
        </div>
      </div>
      {active && <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Enabled</div>}
    </div>
  );
}

function LegalSection({ title, content }: { title: string, content: string }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 space-y-4">
      <h4 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
        <FileText className="w-4 h-4 text-blue-500" />
        {title}
      </h4>
      <p className="text-xs text-zinc-500 leading-relaxed font-bold uppercase tracking-widest opacity-60">
        {content}
      </p>
    </div>
  );
}
