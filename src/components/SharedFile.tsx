import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Download, HardDrive, FileText, ImageIcon, Video, Music, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function SharedFile() {
  const { token } = useParams<{ token: string }>();
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);
  const [cloned, setCloned] = useState(false);

  const user = JSON.parse(localStorage.getItem('televault_user') || 'null');

  useEffect(() => {
    const fetchSharedFile = async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        const data = await res.json();
        if (res.ok) {
          setFile(data);
        } else {
          setError(data.error || 'File not found');
        }
      } catch (err) {
        setError('Connection error');
      } finally {
        setLoading(false);
      }
    };
    fetchSharedFile();
  }, [token]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <ImageIcon className="w-12 h-12 text-emerald-500" />;
    if (mime.startsWith('video/')) return <Video className="w-12 h-12 text-purple-500" />;
    if (mime.startsWith('audio/')) return <Music className="w-12 h-12 text-pink-500" />;
    return <FileText className="w-12 h-12 text-blue-500" />;
  };

  const handleClone = async () => {
    if (!user) {
      alert('Please login to copy this file to your vault.');
      window.location.href = '/';
      return;
    }
    setCloning(true);
    try {
      const res = await fetch('/api/files/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken: token, userId: user.id }),
      });
      if (res.ok) {
        setCloned(true);
        setTimeout(() => setCloned(false), 3000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to copy file');
      }
    } catch (err) {
      alert('Connection error');
    } finally {
      setCloning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-zinc-500 font-medium">Accessing shared file...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-8">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black mb-2">Access Denied</h1>
        <p className="text-zinc-500 mb-8">{error}</p>
        <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-zinc-900 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all">Go Home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-12 justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <HardDrive className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-tighter">TeleVault</h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#141414] border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl text-center"
        >
          <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-zinc-800 overflow-hidden relative">
            {(file.category === 'image' || file.category === 'video') ? (
              <>
                <img 
                  src={`/api/files/${file.id}/thumbnail?userId=${file.userId}`} 
                  alt={file.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden absolute inset-0 flex items-center justify-center">
                  {getFileIcon(file.mime_type)}
                </div>
              </>
            ) : (
              getFileIcon(file.mime_type)
            )}
          </div>

          <h2 className="text-2xl font-black mb-4 truncate px-4">{file.name}</h2>
          
          <div className="flex items-center justify-center gap-4 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-10">
            <span>{formatSize(file.size)}</span>
            <span className="w-1 h-1 bg-zinc-700 rounded-full" />
            <span>{format(new Date(file.created_at), 'MMM d, yyyy')}</span>
          </div>

          <a 
            href={file.downloadUrl}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 group shadow-xl shadow-blue-500/20 active:scale-95 mb-4"
          >
            <Download className="w-5 h-5" />
            Download File
          </a>

          {file.allowCopy && (
            <button 
              onClick={handleClone}
              disabled={cloning || cloned}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 ${cloned ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 shadow-black/20'}`}
            >
              {cloning ? <Loader2 className="w-5 h-5 animate-spin" /> : cloned ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {cloned ? 'Copied to Vault!' : 'Copy to my Vault'}
            </button>
          )}

          <p className="mt-8 text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-relaxed">
            Securely shared via TeleVault Cloud Infrastructure
          </p>
        </motion.div>
      </div>
    </div>
  );
}
