import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Copy, Check, X, Shield, Eye, Lock } from 'lucide-react';
import { FileData } from '../types';

interface ShareModalProps {
  file: FileData;
  onClose: () => void;
}

export default function ShareModal({ file, onClose }: ShareModalProps) {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [permissions, setPermissions] = useState<'view' | 'edit'>('view');
  const [allowCopy, setAllowCopy] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${file.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions, allowCopy }),
      });
      const data = await res.json();
      if (res.ok) {
        setShareToken(data.shareToken);
      }
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#141414] border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center">
              <Share2 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter">Share File</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Secure Link Generation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!shareToken ? (
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
              <p className="text-sm font-bold mb-1 truncate">{file.name}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">File to share</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Permissions</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setPermissions('view')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${permissions === 'view' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
                >
                  <Eye className="w-4 h-4" />
                  View Only
                </button>
                <button 
                  onClick={() => setPermissions('edit')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${permissions === 'edit' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
                >
                  <Lock className="w-4 h-4" />
                  Restricted
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <div>
                <p className="text-xs font-bold">Allow Copying</p>
                <p className="text-[10px] text-zinc-500">Recipients can save to their vault</p>
              </div>
              <button 
                onClick={() => setAllowCopy(!allowCopy)}
                className={`w-12 h-6 rounded-full transition-all relative ${allowCopy ? 'bg-blue-600' : 'bg-zinc-800'}`}
              >
                <motion.div 
                  animate={{ x: allowCopy ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>

            <button 
              onClick={handleShare}
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-blue-500/20"
            >
              {loading ? 'Generating...' : 'Create Share Link'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-500" />
              <p className="text-xs font-bold text-emerald-500">Link generated successfully!</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4">Shareable Link</label>
              <div className="flex gap-2">
                <input 
                  readOnly
                  type="text" 
                  value={shareUrl}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-medium outline-none"
                />
                <button 
                  onClick={copyToClipboard}
                  className={`p-3 rounded-xl transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800 flex gap-4">
              <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                Anyone with this link can view the file. You can revoke access by deleting the share token in settings.
              </p>
            </div>

            <button onClick={onClose} className="w-full py-4 bg-zinc-900 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all">Done</button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
