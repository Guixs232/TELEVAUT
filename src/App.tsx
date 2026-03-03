import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  File, 
  Upload, 
  Download, 
  Trash2, 
  Search, 
  Plus, 
  Grid, 
  List as ListIcon, 
  HardDrive,
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  MoreVertical,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderPlus,
  ArrowLeft,
  Settings as SettingsIcon,
  Filter,
  Play,
  Share2,
  Gauge,
  Menu,
  X as CloseIcon,
  LogOut,
  Archive,
  Copy,
  Scissors,
  ClipboardPaste,
  Code
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FileData, FolderData, Settings, User } from './types';
import Onboarding from './components/Onboarding';
import CinematicVault from './components/CinematicVault';
import AccountSettingsModal from './components/AccountSettingsModal';
import Login from './components/Login';
import ShareModal from './components/ShareModal';
import SharedFile from './components/SharedFile';
import ExtractModal from './components/ExtractModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const GENRES = ['Action', 'Comedy', 'Romance', 'Suspense', 'Horror', 'Documentary', 'Random'];

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('televault_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [settings, setSettings] = useState<Settings | null>(null);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('televault_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('televault_user');
  };

  const fetchSettings = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/settings?userId=${user.id}`);
      const data = await res.json();
      if (data.api_id && data.session_string) {
        setSettings(data);
      } else {
        setSettings(null);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    fetchSettings();
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/share/:token" element={<SharedFile />} />
        <Route path="/" element={<MainApp user={user} settings={settings} onLogout={handleLogout} onOnboardingComplete={handleOnboardingComplete} onLogin={handleLogin} setSettings={setSettings} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function MainApp({ user, settings, onLogout, onOnboardingComplete, onLogin, setSettings }: { 
  user: User | null, 
  settings: Settings | null, 
  onLogout: () => void,
  onOnboardingComplete: () => void,
  onLogin: (user: User) => void,
  setSettings: (s: Settings | null) => void
}) {
  const [files, setFiles] = useState<FileData[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'application'>('all');
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadGenre, setUploadGenre] = useState('Random');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [shareFile, setShareFile] = useState<FileData | null>(null);
  const [extractFile, setExtractFile] = useState<FileData | null>(null);
  const [clipboard, setClipboard] = useState<{ type: 'copy' | 'cut', files: number[], folders: number[] } | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showPlayerSettings, setShowPlayerSettings] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [telegramMe, setTelegramMe] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);

  const fetchTelegramMe = useCallback(async () => {
    if (!user || !settings) return;
    try {
      const res = await fetch(`/api/telegram/me?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setTelegramMe(data);
      }
    } catch (err) {
      console.error('Failed to fetch Telegram profile:', err);
    }
  }, [user, settings]);

  useEffect(() => {
    if (settings) {
      fetchTelegramMe();
    }
  }, [settings, fetchTelegramMe]);

  const fetchContent = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const folderRes = await fetch(`/api/folders?parentId=${currentFolderId || ''}&userId=${user.id}`);
      let folderData = [];
      if (folderRes.ok && folderRes.headers.get('content-type')?.includes('application/json')) {
        folderData = await folderRes.json();
      }
      setFolders(Array.isArray(folderData) ? folderData : []);

      const fileRes = await fetch(`/api/files?folderId=${currentFolderId || ''}&category=${activeTab}&userId=${user.id}`);
      let fileData = [];
      if (fileRes.ok && fileRes.headers.get('content-type')?.includes('application/json')) {
        fileData = await fileRes.json();
      }
      setFiles(Array.isArray(fileData) ? fileData : []);
    } catch (err) {
      console.error('Failed to fetch content:', err);
      setFiles([]);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (settings && user) {
      fetchContent();
    }
  }, [settings, user, currentFolderId, activeTab]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setPendingFiles(acceptedFiles);
    const hasVideo = acceptedFiles.some(f => f.type.startsWith('video/'));
    if (hasVideo) {
      setShowUploadModal(true);
    } else {
      processUpload(acceptedFiles);
    }
  }, [currentFolderId, uploadGenre]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop } as any);

  const processUpload = async (filesToUpload: File[] = pendingFiles) => {
    setUploading(true);
    setShowUploadModal(false);
    
    const CLIENT_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

    for (const file of filesToUpload) {
      try {
        if (file.size <= CLIENT_CHUNK_SIZE) {
          // Standard upload for small files
          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folderId', currentFolderId?.toString() || '');
            formData.append('genre', file.type.startsWith('video/') ? uploadGenre : 'Random');
            formData.append('userId', user.id.toString());

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percent = (event.loaded / event.total) * 100;
                setUploadProgress(percent);
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                fetchContent();
                resolve(xhr.response);
              } else {
                let errorMsg = 'Upload failed';
                if (xhr.status === 413) {
                  errorMsg = 'File is too large for the server to process. Please try a smaller file (under 2GB).';
                } else {
                  try {
                    const error = JSON.parse(xhr.responseText || '{"error": "Upload failed"}');
                    errorMsg = error.error || errorMsg;
                  } catch (e) {
                    errorMsg = `Server error (${xhr.status}): ${xhr.statusText || 'Unknown error'}`;
                  }
                }
                reject(new Error(errorMsg));
              }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.open('POST', '/api/upload');
            xhr.send(formData);
          });
        } else {
          // Chunked upload for large files
          const uploadId = Math.random().toString(36).substring(2, 15);
          const totalChunks = Math.ceil(file.size / CLIENT_CHUNK_SIZE);

          for (let i = 0; i < totalChunks; i++) {
            const start = i * CLIENT_CHUNK_SIZE;
            const end = Math.min(start + CLIENT_CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            await new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              const formData = new FormData();
              formData.append('chunk', chunk);
              formData.append('uploadId', uploadId);
              formData.append('chunkIndex', i.toString());
              formData.append('totalChunks', totalChunks.toString());

              xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                  const overallPercent = ((start + event.loaded) / file.size) * 100;
                  setUploadProgress(overallPercent);
                }
              };

              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve(xhr.response);
                } else {
                  reject(new Error(`Chunk ${i} failed: ${xhr.statusText}`));
                }
              };

              xhr.onerror = () => reject(new Error('Network error during chunk upload'));
              xhr.open('POST', '/api/upload/chunk');
              xhr.send(formData);
            });
          }

          // Finalize upload
          const finalizeRes = await fetch('/api/upload/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uploadId,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type || 'application/octet-stream',
              folderId: currentFolderId,
              genre: file.type.startsWith('video/') ? uploadGenre : 'Random',
              userId: user.id
            })
          });

          if (!finalizeRes.ok) {
            const errData = await finalizeRes.json();
            throw new Error(errData.error || 'Finalization failed');
          }
          
          fetchContent();
        }
      } catch (err: any) {
        console.error('Upload error:', err);
        alert(`Failed to upload ${file.name}: ${err.message}`);
      }
    }
    
    setUploading(false);
    setUploadProgress(0);
    setPendingFiles([]);
  };

  const handleDeleteFile = async (id: number) => {
    if (!user || !confirm('Delete this file?')) return;
    try {
      const res = await fetch(`/api/files/${id}?userId=${user.id}`, { method: 'DELETE' });
      if (res.ok) fetchContent();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleDeleteFolder = async (id: number) => {
    if (!user || !confirm('Delete this folder and all its contents?')) return;
    try {
      const res = await fetch(`/api/folders/${id}?userId=${user.id}`, { method: 'DELETE' });
      if (res.ok) fetchContent();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleDownload = (id: number, name: string) => {
    if (!user) return;
    window.open(`/api/download/${id}?userId=${user.id}`, '_blank');
  };

  const handlePreview = (file: FileData) => {
    setPreviewFile(file);
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName) return;
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName, parentId: currentFolderId, userId: user.id }),
      });
      if (res.ok) {
        setNewFolderName('');
        setIsCreatingFolder(false);
        fetchContent();
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handlePaste = async () => {
    if (!user || !clipboard) return;
    try {
      if (clipboard.type === 'copy') {
        if (clipboard.files.length > 0) {
          await fetch('/api/files/copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileIds: clipboard.files, targetFolderId: currentFolderId, userId: user.id }),
          });
        }
      } else {
        // Cut/Move
        if (clipboard.files.length > 0) {
          await fetch('/api/files/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileIds: clipboard.files, targetFolderId: currentFolderId, userId: user.id }),
          });
        }
        if (clipboard.folders.length > 0) {
          await fetch('/api/folders/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderIds: clipboard.folders, targetFolderId: currentFolderId, userId: user.id }),
          });
        }
      }
      setClipboard(null);
      fetchContent();
    } catch (err) {
      console.error('Paste error:', err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mime: string) => {
    const m = mime.toLowerCase();
    if (m.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-emerald-500" />;
    if (m.startsWith('video/')) return <Video className="w-5 h-5 text-purple-500" />;
    if (m.startsWith('audio/')) return <Music className="w-5 h-5 text-pink-500" />;
    if (m === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    if (m.includes('zip') || m.includes('archive') || m.includes('tar')) return <Archive className="w-5 h-5 text-amber-500" />;
    if (m.includes('xml') || m.includes('json') || m.includes('javascript') || m.includes('typescript')) return <Code className="w-5 h-5 text-blue-400" />;
    return <FileText className="w-5 h-5 text-zinc-400" />;
  };

  if (!user) {
    return <Login onLogin={onLogin} />;
  }

  if (!settings) {
    return <Onboarding userId={user.id} onComplete={onOnboardingComplete} />;
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Desktop Sidebar (Glassmorphism) */}
      <aside className={cn(
        "hidden lg:flex flex-col w-72 bg-[#141414]/50 backdrop-blur-3xl border-r border-zinc-800/50 transition-all duration-500 z-50",
        !isSidebarOpen && "lg:w-20"
      )}>
        <div className="p-6 flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/40 shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          {isSidebarOpen && (
            <motion.h1 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-black tracking-tighter"
            >
              TeleVault
            </motion.h1>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem icon={<Grid className="w-5 h-5" />} label="All Files" active={activeTab === 'all'} onClick={() => setActiveTab('all')} collapsed={!isSidebarOpen} />
          <NavItem icon={<ImageIcon className="w-5 h-5" />} label="Photos" active={activeTab === 'image'} onClick={() => setActiveTab('image')} collapsed={!isSidebarOpen} />
          <NavItem icon={<Video className="w-5 h-5" />} label="Videos" active={activeTab === 'video'} onClick={() => setActiveTab('video')} collapsed={!isSidebarOpen} />
          <NavItem icon={<FileText className="w-5 h-5" />} label="Documents" active={activeTab === 'application'} onClick={() => setActiveTab('application')} collapsed={!isSidebarOpen} />
          <NavItem icon={<SettingsIcon className="w-5 h-5" />} label="Settings" active={showProfile} onClick={() => setShowProfile(true)} collapsed={!isSidebarOpen} />
        </nav>

        <div className="p-6 border-t border-zinc-800/50">
          {telegramMe && isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500 font-bold border border-blue-500/20">
                  {telegramMe.firstName?.[0] || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black truncate">{telegramMe.firstName} {telegramMe.lastName}</p>
                  <p className="text-[10px] text-zinc-500 truncate">@{telegramMe.username || 'No Username'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">MTProto Active</span>
              </div>
            </motion.div>
          )}
          <button 
            onClick={onLogout}
            className="flex items-center gap-4 text-zinc-500 hover:text-red-400 transition-colors w-full px-4 py-3 rounded-2xl hover:bg-red-400/5 group"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            {isSidebarOpen && <span className="text-sm font-bold uppercase tracking-widest">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (Floating Glass) */}
      <div className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md">
        <nav className="bg-[#141414]/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] h-20 flex items-center justify-around px-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <MobileNavItem icon={<Grid className="w-6 h-6" />} active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
          <MobileNavItem icon={<ImageIcon className="w-6 h-6" />} active={activeTab === 'image'} onClick={() => setActiveTab('image')} />
          
          <div className="relative -top-10">
            <button 
              {...getRootProps()}
              className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_15px_30px_rgba(37,99,235,0.4)] border-8 border-[#0A0A0A] active:scale-90 transition-all group"
            >
              <Plus className="w-10 h-10 text-white group-hover:rotate-90 transition-transform duration-500" />
              <input {...getInputProps()} />
            </button>
          </div>

          <MobileNavItem icon={<Video className="w-6 h-6" />} active={activeTab === 'video'} onClick={() => setActiveTab('video')} />
          <MobileNavItem icon={<SettingsIcon className="w-6 h-6" />} active={showProfile} onClick={() => setShowProfile(true)} />
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden pb-20 lg:pb-0">
        {/* Header (Netflix Style) */}
        <header className="sticky top-0 z-40 px-6 py-4 md:px-10 md:py-6 flex items-center justify-between bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent backdrop-blur-sm">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:flex p-2 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <HardDrive className="w-6 h-6 text-blue-500" />
              <span className="font-black tracking-tighter text-lg">TeleVault</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-sm font-black text-zinc-500 uppercase tracking-widest">
              <ChevronRight className="w-4 h-4" />
              <span>{activeTab === 'all' ? 'Cloud Storage' : activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search your vault..."
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl py-2.5 pl-12 pr-6 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none w-64 backdrop-blur-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800 backdrop-blur-md">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-2 rounded-xl transition-all", viewMode === 'grid' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300")}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-2 rounded-xl transition-all", viewMode === 'list' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300")}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {activeTab === 'video' ? (
          <CinematicVault 
            videos={files.filter(f => f.category === 'video')} 
            userId={user.id}
            onBack={() => setActiveTab('all')}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onDelete={handleDeleteFile}
            onShare={setShareFile}
            onCopy={(id) => setClipboard({ type: 'copy', files: [id], folders: [] })}
            onCut={(id) => setClipboard({ type: 'cut', files: [id], folders: [] })}
          />
        ) : (
          <>
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
              {/* Breadcrumbs & Actions */}
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3 text-sm">
                  {currentFolderId && (
                    <button onClick={() => setCurrentFolderId(null)} className="p-2 hover:bg-zinc-900 rounded-xl transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <span className="text-zinc-500">My Vault</span>
                  <ChevronRight className="w-4 h-4 text-zinc-700" />
                  <span className="font-bold capitalize">{activeTab}</span>
                </div>

                <div className="flex items-center gap-4">
                  {clipboard && (
                    <button 
                      onClick={handlePaste}
                      className="flex items-center gap-2 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20"
                    >
                      <ClipboardPaste className="w-4 h-4" />
                      Paste Here ({clipboard.type === 'copy' ? 'Copy' : 'Move'})
                    </button>
                  )}
                  <button 
                    onClick={() => setIsCreatingFolder(true)}
                    className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                  >
                    <FolderPlus className="w-4 h-4" />
                    New Folder
                  </button>
                  <div {...getRootProps()}>
                    <input {...getInputProps()} />
                    <button 
                      className="flex items-center gap-2 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Files
                    </button>
                  </div>
                  {clipboard && (
                    <button 
                      onClick={handlePaste}
                      className="flex items-center gap-2 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 animate-pulse"
                    >
                      <ClipboardPaste className="w-4 h-4" />
                      Paste {clipboard.files.length + clipboard.folders.length} Items
                    </button>
                  )}
                </div>
              </div>

              {/* Folder Creation Input */}
              <AnimatePresence>
                {isCreatingFolder && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-8 overflow-hidden"
                  >
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
                      <Folder className="w-5 h-5 text-blue-500" />
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Folder name..." 
                        className="flex-1 bg-transparent outline-none text-sm"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                      />
                      <button onClick={handleCreateFolder} className="px-4 py-1.5 bg-blue-600 rounded-lg text-xs font-bold">Create</button>
                      <button onClick={() => setIsCreatingFolder(false)} className="text-xs font-bold text-zinc-500">Cancel</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {loading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                  <p className="text-zinc-500 text-sm font-medium">Accessing your vault...</p>
                </div>
              ) : (
                <div className={cn(
                  viewMode === 'grid' 
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6" 
                    : "flex flex-col gap-2"
                )}>
                  {/* Folders */}
                  {folders.map(folder => (
                    <motion.div 
                      layout
                      key={`folder-${folder.id}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setCurrentFolderId(folder.id)}
                      className={cn(
                        "group cursor-pointer transition-all duration-500",
                        viewMode === 'grid' 
                          ? "bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-4 md:p-6 hover:bg-zinc-900 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10" 
                          : "flex items-center gap-4 p-4 hover:bg-zinc-900/60 rounded-2xl border border-transparent hover:border-zinc-800"
                      )}
                    >
                      <div className={cn(
                        "bg-gradient-to-br from-blue-500/20 to-blue-600/5 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner border border-blue-500/10", 
                        viewMode === 'grid' ? "w-16 h-16 mb-6" : "w-12 h-12 shrink-0"
                      )}>
                        <Folder className="w-8 h-8 text-blue-500 fill-blue-500/20" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black truncate text-zinc-100 group-hover:text-white transition-colors tracking-tight">{folder.name}</h4>
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1 opacity-60">{format(new Date(folder.created_at), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setClipboard({ type: 'cut', files: [], folders: [folder.id] }); }}
                          className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-blue-500 transition-all"
                          title="Move"
                        >
                          <Scissors className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                          className="p-2 hover:bg-red-500/10 rounded-xl text-zinc-500 hover:text-red-500 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}

                  {/* Files */}
                  {files.map(file => (
                    <motion.div 
                      layout
                      key={`file-${file.id}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => handlePreview(file)}
                      className={cn(
                        "group cursor-pointer transition-all duration-500 relative",
                        viewMode === 'grid' 
                          ? "bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-3 md:p-4 hover:bg-zinc-900 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10" 
                          : "flex items-center gap-4 p-3 hover:bg-zinc-900/60 rounded-2xl border border-transparent hover:border-zinc-800"
                      )}
                    >
                      <div className={cn(
                        "bg-zinc-800/30 rounded-[1.5rem] flex items-center justify-center overflow-hidden relative shadow-inner border border-zinc-800/50", 
                        viewMode === 'grid' ? "w-full aspect-square mb-4" : "w-12 h-12 shrink-0"
                      )}>
                        {(file.category === 'image' || file.category === 'video') ? (
                          <>
                            <img 
                              src={`/api/files/${file.id}/thumbnail?userId=${user.id}`} 
                              alt={file.name} 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            {file.category === 'video' && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors duration-500">
                                <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 shadow-2xl">
                                  <Play className="w-4 h-4 text-white fill-white" />
                                </div>
                              </div>
                            )}
                            <div className="hidden absolute inset-0 flex items-center justify-center bg-zinc-900">
                              {getFileIcon(file.mime_type)}
                            </div>
                          </>
                        ) : (
                          <div className="transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                            {getFileIcon(file.mime_type)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 px-1">
                        <h4 className="text-sm font-black truncate text-zinc-100 group-hover:text-white transition-colors tracking-tight">{file.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1 opacity-60">
                          <span>{formatSize(file.size)}</span>
                          <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                          <span>{format(new Date(file.created_at), 'MMM d')}</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons Overlay */}
                      <div className={cn(
                        "flex items-center gap-1 transition-all duration-500",
                        viewMode === 'grid' 
                          ? "absolute top-3 right-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 translate-y-0 lg:translate-y-2 lg:group-hover:translate-y-0 z-20" 
                          : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                      )}>
                        <div className="flex bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 rounded-2xl p-1.5 shadow-2xl">
                          {(file.name.toLowerCase().endsWith('.zip') || 
                            file.name.toLowerCase().endsWith('.tar') || 
                            file.name.toLowerCase().endsWith('.gz') || 
                            file.name.toLowerCase().endsWith('.rar') || 
                            file.name.toLowerCase().endsWith('.7z')) && (
                            <button onClick={(e) => { e.stopPropagation(); setExtractFile(file); }} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-blue-500 transition-colors" title="Extract"><Archive className="w-4 h-4" /></button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setShareFile(file); }} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-emerald-500 transition-colors" title="Share"><Share2 className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setClipboard({ type: 'copy', files: [file.id], folders: [] }); }} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-blue-500 transition-colors" title="Copy"><Copy className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setClipboard({ type: 'cut', files: [file.id], folders: [] }); }} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-blue-500 transition-colors" title="Cut"><Scissors className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDownload(file.id, file.name); }} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-blue-500 transition-colors" title="Download"><Download className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }} className="p-2 hover:bg-red-500/10 rounded-xl text-zinc-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#141414] border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-black mb-6">Upload Settings</h3>
              
              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Select Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {GENRES.map(genre => (
                      <button 
                        key={genre}
                        onClick={() => setUploadGenre(genre)}
                        className={cn(
                          "py-2.5 px-4 rounded-xl text-xs font-bold transition-all border",
                          uploadGenre === genre ? "bg-blue-600 border-blue-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        )}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800">
                  <p className="text-xs font-bold mb-1">{pendingFiles.length} Files Selected</p>
                  <p className="text-[10px] text-zinc-500">Files will be categorized as {uploadGenre}.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowUploadModal(false)} className="flex-1 py-3 bg-zinc-900 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all">Cancel</button>
                <button onClick={() => processUpload()} className="flex-1 py-3 bg-blue-600 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">Start Upload</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-md z-[110] flex items-center justify-center p-4 md:p-12" onClick={() => setPreviewFile(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#141414] rounded-3xl overflow-hidden max-w-6xl w-full max-h-full flex flex-col shadow-2xl border border-zinc-800" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-900 rounded-2xl">{getFileIcon(previewFile.mime_type)}</div>
                  <div>
                    <h3 className="text-lg font-black truncate max-w-md">{previewFile.name}</h3>
                    <p className="text-xs text-zinc-500 font-medium">{formatSize(previewFile.size)} • {format(new Date(previewFile.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleDownload(previewFile.id, previewFile.name)} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-2xl text-zinc-400 hover:text-blue-500 transition-all" title="Download"><Download className="w-6 h-6" /></button>
                  <button 
                    onClick={() => { 
                      if (confirm('Are you sure you want to delete this file?')) {
                        handleDeleteFile(previewFile.id); 
                        setPreviewFile(null); 
                      }
                    }} 
                    className="p-3 bg-zinc-900 hover:bg-red-500/10 rounded-2xl text-zinc-400 hover:text-red-500 transition-all" 
                    title="Delete"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                  <button onClick={() => setPreviewFile(null)} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-all"><Plus className="w-6 h-6 rotate-45" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-black flex items-center justify-center min-h-[400px] relative group/player">
                {previewFile.mime_type.startsWith('image/') ? (
                  <img src={`/api/download/${previewFile.id}?userId=${user.id}`} alt={previewFile.name} className="max-w-full max-h-[75vh] object-contain" />
                ) : previewFile.mime_type.startsWith('audio/') ? (
                  <div className="flex flex-col items-center gap-8 w-full max-w-md p-12 bg-zinc-900/50 rounded-[3rem] border border-zinc-800 shadow-2xl">
                    <div className="w-32 h-32 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center border border-blue-500/20 shadow-2xl shadow-blue-500/10 animate-pulse">
                      <Music className="w-16 h-16 text-blue-500" />
                    </div>
                    <audio 
                      src={`/api/stream/${previewFile.id}?userId=${user.id}`} 
                      controls 
                      autoPlay 
                      className="w-full"
                    />
                  </div>
                ) : previewFile.mime_type === 'application/pdf' ? (
                  <div className="flex-1 w-full h-full min-h-[600px] bg-zinc-900">
                    <iframe 
                      src={`/api/stream/${previewFile.id}?userId=${user.id}`} 
                      className="w-full h-full border-none"
                      title={previewFile.name}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center relative">
                    <video 
                      key={playbackSpeed}
                      src={`/api/stream/${previewFile.id}?userId=${user.id}`} 
                      controls 
                      autoPlay 
                      className="max-w-full max-h-[75vh]" 
                      onLoadedMetadata={(e) => {
                        (e.target as HTMLVideoElement).playbackRate = playbackSpeed;
                      }}
                    />
                    
                    {/* Player Settings */}
                    <div className="absolute top-6 right-6 z-20">
                      <button 
                        onClick={() => setShowPlayerSettings(!showPlayerSettings)}
                        className="p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl text-white hover:bg-black/60 transition-all"
                      >
                        <SettingsIcon className="w-5 h-5" />
                      </button>
                      
                      <AnimatePresence>
                        {showPlayerSettings && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute top-16 right-0 bg-[#141414] border border-zinc-800 rounded-2xl p-4 w-48 shadow-2xl"
                          >
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Playback Speed</p>
                            <div className="grid grid-cols-2 gap-2">
                              {[0.5, 1, 1.5, 2].map(speed => (
                                <button 
                                  key={speed}
                                  onClick={() => {
                                    setPlaybackSpeed(speed);
                                    setShowPlayerSettings(false);
                                  }}
                                  className={cn(
                                    "py-2 rounded-xl text-xs font-bold transition-all border",
                                    playbackSpeed === speed ? "bg-blue-600 border-blue-500 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                                  )}
                                >
                                  {speed}x
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {shareFile && (
          <ShareModal file={shareFile} onClose={() => setShareFile(null)} />
        )}
      </AnimatePresence>

      {/* Extract Modal */}
      <AnimatePresence>
        {extractFile && (
          <ExtractModal fileId={extractFile.id} fileName={extractFile.name} onClose={() => setExtractFile(null)} />
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <AccountSettingsModal 
            userId={user.id} 
            onClose={() => setShowProfile(false)} 
            onLogout={onLogout}
          />
        )}
      </AnimatePresence>

      {/* Global Upload Progress (Background) */}
      <AnimatePresence>
        {uploading && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 50, scale: 0.95 }} 
            className="fixed bottom-8 right-8 bg-[#141414]/90 backdrop-blur-2xl border border-zinc-800 rounded-3xl shadow-2xl p-6 w-80 z-[200]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-black">Uploading...</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Telegram Storage</p>
                </div>
              </div>
              <span className="text-xs font-black text-blue-500">{Math.round(uploadProgress)}%</span>
            </div>
            
            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${uploadProgress}%` }} 
                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
              />
            </div>
            
            <p className="mt-3 text-[10px] text-zinc-500 font-medium text-center italic">
              Running in background...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void, collapsed?: boolean }) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all group relative", 
        active ? "bg-blue-600 text-white shadow-2xl shadow-blue-500/20" : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
      )}
    >
      <span className={cn("transition-colors shrink-0", active ? "text-white" : "text-zinc-600 group-hover:text-zinc-400")}>{icon}</span>
      {!collapsed && label}
      {active && !collapsed && <motion.div layoutId="active-pill" className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full" />}
    </button>
  );
}

function MobileNavItem({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center w-14 h-14 transition-all duration-500",
        active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {active && (
        <motion.div 
          layoutId="mobile-nav-pill"
          className="absolute inset-0 bg-blue-600 rounded-3xl shadow-xl shadow-blue-500/30"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10">{icon}</span>
    </button>
  );
}
