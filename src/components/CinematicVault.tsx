import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Info, 
  Download, 
  Trash2, 
  ArrowLeft, 
  Copy, 
  Scissors, 
  Star, 
  Clock, 
  ChevronRight,
  Maximize2,
  Volume2,
  Share2
} from 'lucide-react';
import { FileData } from '../types';
import { format } from 'date-fns';

interface CinematicVaultProps {
  videos: FileData[];
  userId: number;
  onPreview: (file: FileData) => void;
  onDownload: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  onCopy?: (id: number) => void;
  onCut?: (id: number) => void;
  onShare?: (file: FileData) => void;
  onBack: () => void;
}

const GENRES = ['Action', 'Comedy', 'Romance', 'Suspense', 'Horror', 'Documentary', 'Random'];

export default function CinematicVault({ 
  videos, 
  userId, 
  onPreview, 
  onDownload, 
  onDelete, 
  onCopy, 
  onCut, 
  onShare,
  onBack 
}: CinematicVaultProps) {
  const [hoveredVideo, setHoveredVideo] = useState<FileData | null>(null);

  const videosByGenre = GENRES.reduce((acc, genre) => {
    const filtered = videos.filter(v => v.genre === genre || (!v.genre && genre === 'Random'));
    if (filtered.length > 0) acc[genre] = filtered;
    return acc;
  }, {} as Record<string, FileData[]>);

  const featuredVideo = videos[0];

  return (
    <div className="flex-1 bg-[#050505] overflow-y-auto no-scrollbar pb-40 relative selection:bg-blue-500/30">
      {/* Immersive Header */}
      <div className="fixed top-0 left-0 right-0 z-[60] p-6 flex items-center justify-between pointer-events-none">
        <motion.button 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 hover:border-white/20 transition-all group shadow-2xl"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Exit Theater
        </motion.button>
      </div>

      {/* Hero Spotlight */}
      {featuredVideo && (
        <div className="relative h-[85vh] w-full mb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/40 to-transparent z-20" />
          
          <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <img 
              src={`/api/files/${featuredVideo.id}/thumbnail?userId=${userId}`} 
              alt={featuredVideo.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <div className="absolute bottom-20 left-0 right-0 z-30 px-8 md:px-24 max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-md shadow-lg shadow-blue-500/40">
                  New Release
                </span>
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </div>
              </div>

              <h1 className="text-6xl md:text-[10rem] font-black tracking-tighter leading-[0.85] text-white drop-shadow-2xl">
                {featuredVideo.name.split('.')[0]}
              </h1>

              <div className="flex flex-wrap items-center gap-8 text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">
                <span className="text-emerald-400">99% Relevant</span>
                <span>{format(new Date(featuredVideo.created_at), 'yyyy')}</span>
                <span className="px-2 py-0.5 border border-zinc-800 rounded text-[10px]">Ultra HD</span>
                <span>{featuredVideo.genre || 'Cinematic'}</span>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  onClick={() => onPreview(featuredVideo)}
                  className="px-12 py-5 bg-white text-black rounded-2xl font-black text-lg flex items-center gap-4 hover:bg-zinc-200 transition-all active:scale-95 shadow-2xl shadow-white/10"
                >
                  <Play className="w-6 h-6 fill-current" />
                  Watch Now
                </button>
                <button 
                  onClick={() => onPreview(featuredVideo)}
                  className="p-5 bg-white/5 backdrop-blur-2xl border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-all active:scale-95"
                >
                  <Info className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Cinematic Rows */}
      <div className="px-8 md:px-24 space-y-24 max-w-[1600px] mx-auto">
        {Object.entries(videosByGenre).map(([genre, items]) => (
          <div key={genre} className="relative">
            <div className="flex items-end justify-between mb-8">
              <div className="space-y-1">
                <h3 className="text-3xl font-black tracking-tighter text-white flex items-center gap-4">
                  {genre}
                  <span className="text-xs font-bold text-zinc-600 bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-800">
                    {items.length} Titles
                  </span>
                </h3>
                <div className="w-20 h-1 bg-blue-600 rounded-full" />
              </div>
              <button className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors flex items-center gap-2 group">
                View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {items.map((video) => (
                <motion.div 
                  key={video.id}
                  layoutId={`video-${video.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative aspect-video bg-zinc-900 rounded-[2.5rem] overflow-hidden cursor-pointer border border-white/5 hover:border-blue-500/50 transition-all duration-700 shadow-2xl"
                  onClick={() => onPreview(video)}
                >
                  <img 
                    src={`/api/files/${video.id}/thumbnail?userId=${userId}`} 
                    alt={video.name} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100"
                    referrerPolicy="no-referrer"
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 p-8 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/40 backdrop-blur-[2px]">
                    <div className="flex items-center gap-3 mb-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onPreview(video); }}
                        className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
                      >
                        <Play className="w-5 h-5 fill-current" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDownload(video.id, video.name); }}
                        className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onShare?.(video); }}
                        className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onCopy?.(video.id); }}
                        className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
                        title="Copy"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onCut?.(video.id); }}
                        className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
                        title="Move"
                      >
                        <Scissors className="w-5 h-5" />
                      </button>
                      <div className="flex-1" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(video.id); }}
                        className="w-12 h-12 bg-red-500/10 backdrop-blur-xl border border-red-500/20 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500/20 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <h4 className="text-xl font-black text-white truncate mb-2">{video.name}</h4>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      <span className="text-emerald-400">Match 98%</span>
                      <span>{format(new Date(video.created_at), 'yyyy')}</span>
                      <span className="px-1.5 py-0.5 border border-zinc-800 rounded text-[8px]">4K</span>
                    </div>
                  </div>

                  {/* Static Info */}
                  <div className="absolute bottom-6 left-8 right-8 group-hover:opacity-0 transition-opacity duration-300">
                    <h4 className="text-lg font-black text-white truncate drop-shadow-lg">{video.name}</h4>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
