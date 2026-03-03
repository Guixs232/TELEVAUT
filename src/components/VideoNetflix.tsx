import React from 'react';
import { motion } from 'motion/react';
import { Play, Info, Clock, Star, Download, Trash2, Search, ArrowLeft, Copy, Scissors } from 'lucide-react';
import { FileData } from '../types';
import { format } from 'date-fns';

interface VideoNetflixProps {
  videos: FileData[];
  userId: number;
  onPreview: (file: FileData) => void;
  onDownload: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  onCopy?: (id: number) => void;
  onCut?: (id: number) => void;
  onBack: () => void;
}

const GENRES = ['Action', 'Comedy', 'Romance', 'Suspense', 'Horror', 'Documentary', 'Random'];

export default function VideoNetflix({ videos, userId, onPreview, onDownload, onDelete, onCopy, onCut, onBack }: VideoNetflixProps) {
  const videosByGenre = GENRES.reduce((acc, genre) => {
    const filtered = videos.filter(v => v.genre === genre || (!v.genre && genre === 'Random'));
    if (filtered.length > 0) acc[genre] = filtered;
    return acc;
  }, {} as Record<string, FileData[]>);

  const featuredVideo = videos[0];

  return (
    <div className="flex-1 bg-black overflow-y-auto no-scrollbar pb-32 md:pb-20 relative">
      {/* Back Button (Floating on Mobile) */}
      <div className="fixed md:sticky top-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none">
        <button 
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800/50 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 hover:border-zinc-700 transition-all group shadow-2xl"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Vault
        </button>
      </div>

      {/* Hero Section (Immersive) */}
      {featuredVideo && (
        <div className="relative h-[70vh] md:h-[80vh] w-full mb-12 md:mb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-20" />
          
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
            <img 
              src={`/api/files/${featuredVideo.id}/thumbnail?userId=${userId}`} 
              alt={featuredVideo.name} 
              className="w-full h-full object-cover opacity-60 scale-105 animate-slow-zoom"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="absolute bottom-16 md:bottom-24 left-0 right-0 z-30 flex flex-col items-start px-6 md:px-20 max-w-6xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 mb-4 md:mb-6"
            >
              <div className="w-1 h-6 md:h-8 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)]" />
              <span className="text-[10px] font-black tracking-[0.3em] uppercase text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 backdrop-blur-md">
                Featured
              </span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-8xl font-black mb-6 md:mb-8 tracking-tighter leading-[0.9] drop-shadow-2xl"
            >
              {featuredVideo.name.split('.')[0]}
            </motion.h1>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-4 md:gap-6 mb-8 md:mb-10 text-[10px] font-black text-zinc-400 uppercase tracking-widest"
            >
              <span className="text-emerald-500 flex items-center gap-2">
                <Star className="w-3 h-3 fill-current" />
                98% Match
              </span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <span>{format(new Date(featuredVideo.created_at), 'yyyy')}</span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md text-[8px] text-white">4K</span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <span className="text-zinc-500">{featuredVideo.genre || 'Original'}</span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-3 md:gap-4 w-full md:w-auto"
            >
              <button 
                onClick={() => onPreview(featuredVideo)}
                className="flex-1 md:flex-none px-8 md:px-10 py-3.5 md:py-4 bg-white text-black rounded-2xl font-black text-sm md:text-lg flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-95 shadow-2xl shadow-white/10"
              >
                <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                Play
              </button>
              <button 
                onClick={() => onPreview(featuredVideo)}
                className="flex-1 md:flex-none px-8 md:px-10 py-3.5 md:py-4 bg-zinc-800/40 backdrop-blur-3xl text-white rounded-2xl font-black text-sm md:text-lg flex items-center justify-center gap-3 border border-zinc-700/50 hover:bg-zinc-800 transition-all active:scale-95"
              >
                <Info className="w-5 h-5 md:w-6 md:h-6" />
                Info
              </button>
            </motion.div>
          </div>
        </div>
      )}

      {/* Genre Rows */}
      <div className="px-6 md:px-12 space-y-12 md:space-y-16">
        {Object.entries(videosByGenre).map(([genre, items]) => (
          <div key={genre} className="relative group/row">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-3">
                <div className="w-1 h-6 md:h-8 bg-blue-600 rounded-full" />
                {genre}
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                  {items.length}
                </span>
              </h3>
            </div>
            
            <div className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6 md:mx-0 md:px-0 snap-x">
              {items.map((video) => (
                <motion.div 
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -8 }}
                  className="relative flex-none w-[280px] md:w-[320px] aspect-video bg-zinc-900 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden cursor-pointer group/card shadow-2xl border border-zinc-800/50 hover:border-blue-500/30 transition-all duration-500 snap-start"
                  onClick={() => onPreview(video)}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover/card:opacity-80 transition-opacity z-10" />
                  
                  <img 
                    src={`/api/files/${video.id}/thumbnail?userId=${userId}`} 
                    alt={video.name} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                    referrerPolicy="no-referrer"
                  />

                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 opacity-0 group-hover/card:opacity-100 transition-all duration-500 scale-75 group-hover/card:scale-100 shadow-2xl">
                      <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-white" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 translate-y-0 lg:translate-y-2 lg:group-hover/card:translate-y-0 opacity-100 lg:opacity-0 lg:group-hover/card:opacity-100 transition-all duration-500 z-30">
                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                        HD
                      </span>
                      <span className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {(video.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                    
                    <h4 className="text-white font-black text-sm md:text-lg truncate drop-shadow-lg mb-3 md:mb-4">{video.name}</h4>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onPreview(video); }}
                        className="flex-1 py-2 md:py-2.5 bg-white text-black rounded-xl font-bold text-[10px] md:text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
                      >
                        <Play className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current" />
                        Play
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDownload(video.id, video.name); }}
                        className="p-2 md:p-2.5 bg-zinc-800/60 backdrop-blur-md border border-zinc-700/50 text-white rounded-xl hover:bg-zinc-700 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(video.id); }}
                        className="p-2 md:p-2.5 bg-zinc-800/60 backdrop-blur-md border border-zinc-700/50 text-white rounded-xl hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
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

function ChevronRight(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  )
}
