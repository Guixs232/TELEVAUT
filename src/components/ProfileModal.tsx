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
  Award
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProfileModalProps {
  userId: number;
  onClose: () => void;
}

const FRAMES = [
  { id: 'none', name: 'None', class: '' },
  { id: 'blue', name: 'Neon Blue', class: 'ring-4 ring-blue-500 ring-offset-4 ring-offset-[#141414]' },
  { id: 'emerald', name: 'Emerald Glow', class: 'ring-4 ring-emerald-500 ring-offset-4 ring-offset-[#141414]' },
  { id: 'purple', name: 'Royal Purple', class: 'ring-4 ring-purple-500 ring-offset-4 ring-offset-[#141414]' },
  { id: 'gold', name: 'Golden Aura', class: 'ring-4 ring-amber-400 ring-offset-4 ring-offset-[#141414]' },
];

const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'pt', name: 'Português' },
  { id: 'es', name: 'Español' },
];

export default function ProfileModal({ userId, onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState({ bio: '', language: 'en', frame_id: 'none' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'legal'>('profile');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchPhoto();
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...profile, frameId: profile.frame_id }),
      });
      if (res.ok) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const shareProfile = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(`Check out my TeleVault: ${url}`);
    alert('Profile link copied to clipboard!');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4 md:p-10"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} 
        animate={{ scale: 1, y: 0 }} 
        className="bg-[#141414] border border-zinc-800 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter">My Profile</h2>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Manage your identity</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-zinc-800 rounded-2xl transition-colors">
            <X className="w-6 h-6 text-zinc-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-8 border-b border-zinc-800 bg-zinc-900/30">
          <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User className="w-4 h-4" />} label="Profile" />
          <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Globe className="w-4 h-4" />} label="Settings" />
          <TabButton active={activeTab === 'legal'} onClick={() => setActiveTab('legal')} icon={<Shield className="w-4 h-4" />} label="Legal" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-10"
              >
                {/* Photo & Frame */}
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <div className={cn(
                      "w-32 h-32 rounded-[2.5rem] overflow-hidden bg-zinc-900 border border-zinc-800 transition-all duration-500",
                      FRAMES.find(f => f.id === profile.frame_id)?.class
                    )}>
                      {photoUrl ? (
                        <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-12 h-12 text-zinc-700" />
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 p-2 bg-blue-600 rounded-xl shadow-lg border border-blue-500/50">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h3 className="mt-6 text-lg font-black tracking-tight">Select Frame</h3>
                  <div className="flex gap-3 mt-4">
                    {FRAMES.map(frame => (
                      <button 
                        key={frame.id}
                        onClick={() => setProfile({ ...profile, frame_id: frame.id })}
                        className={cn(
                          "w-10 h-10 rounded-xl border-2 transition-all",
                          profile.frame_id === frame.id ? "border-blue-500 scale-110 shadow-lg shadow-blue-500/20" : "border-zinc-800 hover:border-zinc-700"
                        )}
                        style={{ backgroundColor: frame.id === 'none' ? 'transparent' : frame.id }}
                        title={frame.name}
                      >
                        {profile.frame_id === frame.id && <Check className="w-4 h-4 mx-auto text-blue-500" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-4">Bio</label>
                  <div className="relative">
                    <Edit3 className="absolute left-4 top-4 w-5 h-5 text-zinc-600" />
                    <textarea 
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-[2rem] py-4 pl-12 pr-6 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none min-h-[120px] font-medium text-zinc-300"
                      placeholder="Tell us about yourself..."
                      value={profile.bio || ''}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    />
                  </div>
                </div>

                <button 
                  onClick={shareProfile}
                  className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all group"
                >
                  <Share2 className="w-5 h-5 text-zinc-500 group-hover:text-blue-500 transition-colors" />
                  Share My Profile
                </button>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-4">Language</label>
                  <div className="grid grid-cols-1 gap-3">
                    {LANGUAGES.map(lang => (
                      <button 
                        key={lang.id}
                        onClick={() => setProfile({ ...profile, language: lang.id })}
                        className={cn(
                          "flex items-center justify-between p-5 rounded-2xl border transition-all",
                          profile.language === lang.id ? "bg-blue-600/10 border-blue-500/50 text-blue-400" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                        )}
                      >
                        <span className="font-bold">{lang.name}</span>
                        {profile.language === lang.id && <Check className="w-5 h-5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'legal' && (
              <motion.div 
                key="legal"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <LegalSection title="Privacy Policy" content="Your data is stored securely using Telegram's MTProto protocol. We do not store your files on our servers; they are sent directly to your Telegram Saved Messages. We only store metadata required to organize your vault." />
                <LegalSection title="Terms of Service" content="By using TeleVault, you agree to comply with Telegram's Terms of Service. You are responsible for the content you upload. TeleVault is a tool for personal cloud storage and does not facilitate illegal file sharing." />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-zinc-800 bg-zinc-900/50 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 py-5 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest transition-all relative",
        active ? "text-blue-500" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {icon}
      {label}
      {active && (
        <motion.div 
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full"
        />
      )}
    </button>
  );
}

function LegalSection({ title, content }: { title: string, content: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-6">
      <h4 className="text-sm font-black text-zinc-300 mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-500" />
        {title}
      </h4>
      <p className="text-xs text-zinc-500 leading-relaxed font-medium">
        {content}
      </p>
    </div>
  );
}
