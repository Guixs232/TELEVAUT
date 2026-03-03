import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Archive, Loader2, CheckCircle2, XCircle, Plus } from 'lucide-react';

interface ExtractModalProps {
  fileId: number;
  fileName: string;
  onClose: () => void;
}

export default function ExtractModal({ fileId, fileName, onClose }: ExtractModalProps) {
  const [status, setStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    const user = JSON.parse(localStorage.getItem('tele-vault-user') || '{}');
    if (!user.id) return;

    setStatus('extracting');
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, userId: user.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Extraction failed');
      }

      setStatus('success');
      setTimeout(onClose, 2000);
    } catch (err: any) {
      setStatus('error');
      setError(err.message);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} 
        animate={{ scale: 1, y: 0 }} 
        className="bg-[#141414] border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <Archive className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-xl font-black">Extract Archive</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">MTProto Extraction</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
            <Plus className="w-6 h-6 rotate-45 text-zinc-500" />
          </button>
        </div>

        <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 mb-8">
          <p className="text-sm text-zinc-300 mb-2">You are about to extract:</p>
          <p className="text-sm font-black text-white truncate">{fileName}</p>
          <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed">
            Contents will be extracted and uploaded as individual files to your Telegram storage. This process may take some time depending on the archive size.
          </p>
        </div>

        {status === 'extracting' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-sm font-bold text-zinc-400">Extracting & Uploading...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
            <p className="text-sm font-bold text-emerald-500">Extraction Complete!</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-8">
            <XCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-sm font-bold text-red-500 mb-2">Extraction Failed</p>
            <p className="text-xs text-zinc-500 text-center">{error}</p>
          </div>
        )}

        {status === 'idle' && (
          <div className="flex gap-4">
            <button 
              onClick={onClose} 
              className="flex-1 py-4 bg-zinc-900 rounded-2xl font-black text-sm hover:bg-zinc-800 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleExtract} 
              className="flex-1 py-4 bg-blue-600 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
            >
              Extract Now
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
