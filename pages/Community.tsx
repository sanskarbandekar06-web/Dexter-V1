
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Radio, Scan, QrCode, Wifi, 
  Share2, Zap, Shield, Crown, BarChart3, 
  X, Check, ExternalLink, Activity, ChevronRight, Loader2
} from 'lucide-react';
import QRCode from 'qrcode';
import { ThemeColors, UserProfile, UserData } from '../types';
import { db, collection, query, where, onSnapshot, orderBy, limit } from '../lib/firebase';

interface CommunityPageProps {
  isDarkMode: boolean;
  theme: ThemeColors;
  userProfile: UserProfile;
  userData: UserData;
}

interface Peer extends UserProfile {
  id: string;
  metrics?: UserData;
}

const CommunityPage: React.FC<CommunityPageProps> = ({ isDarkMode, theme, userProfile, userData }) => {
  const [activeTab, setActiveTab] = useState<'radar' | 'broadcast'>('radar');
  const [peers, setPeers] = useState<Peer[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [duelStatus, setDuelStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Reset duel status when peer selection changes
  useEffect(() => {
    setDuelStatus('idle');
  }, [selectedPeer]);

  // Generate QR Code on mount
  useEffect(() => {
    // Exclude avatar/banner to keep data size small enough for QR Code
    const payload = {
      name: userProfile.name,
      score: userData.score,
      level: userProfile.level,
      title: userProfile.title,
      // avatar: userProfile.avatar // Removed to prevent "Data too big" error
    };
    
    QRCode.toDataURL(JSON.stringify(payload), {
      color: {
        dark: isDarkMode ? '#818cf8' : '#f97316', // Indigo (Dark) or Orange (Light)
        light: '#00000000' // Transparent
      },
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'L' // Lower error correction allows for more data capacity if needed
    }).then(url => setQrCodeUrl(url)).catch(err => {
        console.error("QR Generation Error:", err);
    });
  }, [userProfile, userData, isDarkMode]);

  // Listen for active peers
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'users'),
      where('lastActiveDate', '==', todayStr),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activePeers: Peer[] = [];
      snapshot.forEach(doc => {
        // Don't include self
        // Note: In a real app we'd filter by auth.currentUser.uid, 
        // but here we just filter by name to keep props simple
        const data = doc.data() as UserProfile;
        if (data.name !== userProfile.name) {
           activePeers.push({ id: doc.id, ...data });
        }
      });
      // Sort by level/score descending
      activePeers.sort((a, b) => (b.level || 0) - (a.level || 0));
      setPeers(activePeers);
    });

    return () => unsubscribe();
  }, [userProfile.name]);

  const handleDuel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (duelStatus !== 'idle') return;
    
    setDuelStatus('sending');
    
    // Simulate network/socket latency
    setTimeout(() => {
      setDuelStatus('sent');
    }, 1500);
  };

  const RadarRing = ({ delay, duration }: { delay: number, duration: number }) => (
    <motion.div
      animate={{ scale: [0.8, 2.5], opacity: [0.6, 0] }}
      transition={{ duration, repeat: Infinity, delay, ease: "easeOut" }}
      className={`absolute inset-0 m-auto rounded-full border ${isDarkMode ? 'border-indigo-500/30' : 'border-orange-500/30'}`}
    />
  );

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
           className={`absolute -top-[50%] -right-[50%] w-[100vw] h-[100vw] opacity-[0.03] ${isDarkMode ? 'text-indigo-500' : 'text-orange-500'}`}
           style={{ backgroundImage: 'conic-gradient(from 0deg, transparent 0%, currentColor 10%, transparent 20%)' }}
         />
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 relative z-10 gap-4">
        <div>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-orange-500/10 text-orange-600'}`}>
             <Wifi size={12} className="animate-pulse" /> Local Grid Active
          </div>
          <h1 className={`text-4xl md:text-5xl font-black cinematic-text ${theme.text}`}>The Hive</h1>
          <p className={`text-sm opacity-60 font-medium ${theme.text}`}>Synchronize with active operatives in your sector.</p>
        </div>

        <div className={`flex p-1.5 rounded-2xl border ${theme.cardBorder} ${isDarkMode ? 'bg-white/5' : 'bg-black/5'} shadow-inner`}>
          <button 
            onClick={() => setActiveTab('radar')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'radar' ? 'bg-indigo-500 text-white shadow-lg' : `opacity-50 hover:opacity-100 ${theme.text}`}`}
          >
            <Radio size={16} /> Radar
          </button>
          <button 
            onClick={() => setActiveTab('broadcast')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'broadcast' ? 'bg-orange-500 text-white shadow-lg' : `opacity-50 hover:opacity-100 ${theme.text}`}`}
          >
            <QrCode size={16} /> Broadcast
          </button>
        </div>
      </header>

      <div className="flex-1 relative z-10 flex flex-col md:flex-row gap-6 overflow-hidden">
        
        {/* LEFT PANEL: CONTENT SWITCHER */}
        <AnimatePresence mode="wait">
          {activeTab === 'radar' ? (
            <motion.div 
              key="radar"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`flex-1 ${theme.card} p-0 overflow-hidden relative flex flex-col`}
            >
               {/* Radar Visualizer */}
               <div className="h-64 shrink-0 relative flex items-center justify-center overflow-hidden border-b border-white/5 bg-black/5 dark:bg-black/20">
                  <div className={`w-1 h-1 rounded-full z-20 ${isDarkMode ? 'bg-white' : 'bg-black'}`} />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className={`w-64 h-64 rounded-full border border-dashed opacity-20 ${isDarkMode ? 'border-indigo-500' : 'border-orange-500'}`} />
                     <div className={`absolute w-40 h-40 rounded-full border border-dashed opacity-30 ${isDarkMode ? 'border-indigo-500' : 'border-orange-500'}`} />
                  </div>
                  <RadarRing delay={0} duration={3} />
                  <RadarRing delay={1} duration={3} />
                  <RadarRing delay={2} duration={3} />
                  
                  {/* Rotating Scan Line */}
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className={`absolute inset-0 w-full h-full bg-gradient-to-t from-transparent via-transparent to-white/10`}
                    style={{ clipPath: 'polygon(50% 50%, 100% 50%, 100% 0, 50% 0)' }}
                  />

                  {/* Operative Count */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white">
                     <Users size={14} className="text-emerald-400" />
                     <span className="text-xs font-bold tabular-nums">{peers.length} Detected</span>
                  </div>
               </div>

               {/* Peer List */}
               <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                  {peers.map((peer, i) => (
                    <motion.div 
                      key={peer.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedPeer(peer)}
                      className={`p-4 rounded-2xl border ${theme.cardBorder} ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-gray-50'} transition-all cursor-pointer group flex items-center gap-4`}
                    >
                       <div className="relative">
                          <img src={peer.avatar} className="w-12 h-12 rounded-xl object-cover border-2 border-white/10" />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                             <h4 className={`font-bold truncate ${theme.text}`}>{peer.name}</h4>
                             <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 opacity-60">Lvl {peer.level || 0}</span>
                          </div>
                          <p className="text-xs opacity-50 truncate">{peer.title}</p>
                       </div>
                       <ChevronRight size={18} className="opacity-30 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                  {peers.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-40 py-10">
                       <Scan size={40} className="mb-4 animate-pulse" />
                       <p className="text-sm font-bold">Scanning Sector...</p>
                       <p className="text-xs">No active signals found nearby.</p>
                    </div>
                  )}
               </div>
            </motion.div>
          ) : (
            <motion.div 
              key="broadcast"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`flex-1 ${theme.card} p-8 flex flex-col items-center justify-center text-center relative overflow-hidden`}
            >
               <div className={`absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]`} />
               
               <div className="relative z-10 bg-white p-4 rounded-3xl shadow-2xl mb-8">
                  {qrCodeUrl ? <img src={qrCodeUrl} className="w-64 h-64 mix-blend-multiply" /> : <div className="w-64 h-64 bg-gray-100 animate-pulse rounded-2xl" />}
                  <div className="absolute -bottom-4 -right-4 bg-orange-500 text-white p-3 rounded-2xl shadow-lg border-4 border-white">
                     <Share2 size={24} />
                  </div>
               </div>

               <h2 className={`text-2xl font-black ${theme.text} mb-2`}>Signal Beacon Active</h2>
               <p className={`text-sm opacity-60 max-w-sm mx-auto ${theme.text}`}>
                 Show this glyph to a fellow operative to instantly synchronize your neuro-data securely.
               </p>

               <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-xs">
                  <div className={`p-4 rounded-2xl bg-black/5 dark:bg-white/5 border ${theme.cardBorder}`}>
                     <div className="text-xs font-black uppercase opacity-40 mb-1">Score</div>
                     <div className="text-2xl font-black text-orange-500">{Math.round(userData.score || 0)}</div>
                  </div>
                  <div className={`p-4 rounded-2xl bg-black/5 dark:bg-white/5 border ${theme.cardBorder}`}>
                     <div className="text-xs font-black uppercase opacity-40 mb-1">Level</div>
                     <div className="text-2xl font-black text-indigo-500">{userProfile.level || 0}</div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RIGHT PANEL: SELECTED PEER DETAILS (OR PLACEHOLDER) */}
        <div className={`hidden md:block w-96 ${theme.card} p-0 overflow-hidden relative transition-all duration-500 ${selectedPeer ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-50 grayscale'}`}>
           {selectedPeer ? (
             <div className="h-full flex flex-col">
                <div className="relative h-40 bg-black/20">
                   <img src={selectedPeer.banner} className="w-full h-full object-cover opacity-50" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                   <div className="absolute bottom-4 left-6 flex items-end gap-4">
                      <img src={selectedPeer.avatar} className="w-16 h-16 rounded-2xl border-4 border-black/50 shadow-xl" />
                      <div className="mb-1 text-white">
                         <h3 className="text-lg font-black leading-none">{selectedPeer.name}</h3>
                         <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Active Now</span>
                      </div>
                   </div>
                   <button 
                     onClick={() => setSelectedPeer(null)} 
                     className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-white/20 transition-all"
                   >
                     <X size={16} />
                   </button>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                   {/* Comparison Stats */}
                   <div className="space-y-4">
                      <h4 className={`text-xs font-black uppercase tracking-widest opacity-40 ${theme.text}`}>Synergy Analysis</h4>
                      
                      {/* Level Compare */}
                      <div className="space-y-2">
                         <div className="flex justify-between text-xs font-bold">
                            <span>Level</span>
                            <span className="text-indigo-500">You: {userProfile.level} vs {selectedPeer.level}</span>
                         </div>
                         <div className="flex h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10 gap-1">
                            <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(100, (userProfile.level || 1) * 2)}%` }} />
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, (selectedPeer.level || 1) * 2)}%` }} />
                         </div>
                      </div>

                      {/* Streak Compare */}
                      <div className="space-y-2">
                         <div className="flex justify-between text-xs font-bold">
                            <span>Streak</span>
                            <span className="text-emerald-500">{selectedPeer.streak} Days</span>
                         </div>
                         <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (selectedPeer.streak || 0) * 5)}%` }} />
                         </div>
                      </div>
                   </div>

                   <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-rose-500/10 border border-orange-500/20 text-center space-y-3">
                      <Zap size={24} className="mx-auto text-orange-500" />
                      <div>
                         <h4 className="font-black text-sm">Challenge Invite</h4>
                         <p className="text-xs opacity-60 mt-1">Send a focus challenge request.</p>
                      </div>
                      <button 
                        onClick={handleDuel}
                        disabled={duelStatus !== 'idle'}
                        className={`w-full py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
                            duelStatus === 'sent' 
                                ? 'bg-emerald-500 text-white' 
                                : duelStatus === 'sending'
                                    ? 'bg-orange-500/50 text-white cursor-wait'
                                    : 'bg-orange-500 text-white hover:bg-orange-600'
                        }`}
                      >
                         {duelStatus === 'sending' && <Loader2 size={14} className="animate-spin" />}
                         {duelStatus === 'sent' ? 'Challenge Pending' : duelStatus === 'sending' ? 'Transmitting...' : 'Initialize Duel'}
                      </button>
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center opacity-30 p-8 text-center">
                <Activity size={48} className="mb-4" />
                <h3 className="font-bold text-lg">Awaiting Target</h3>
                <p className="text-sm">Select an operative from the radar to analyze performance delta.</p>
             </div>
           )}
        </div>

      </div>

      {/* MOBILE MODAL FOR PEER DETAILS */}
      <AnimatePresence>
        {selectedPeer && (
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }} 
            className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end"
            onClick={() => setSelectedPeer(null)}
          >
             <div 
               className={`w-full h-[80vh] ${theme.cardBg} rounded-t-[2.5rem] overflow-hidden flex flex-col relative`}
               onClick={e => e.stopPropagation()}
             >
                <div className="relative h-40 shrink-0">
                   <img src={selectedPeer.banner} className="w-full h-full object-cover opacity-80" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                   <div className="absolute bottom-6 left-6 flex items-end gap-4">
                      <img src={selectedPeer.avatar} className="w-20 h-20 rounded-2xl border-4 border-black shadow-xl" />
                      <div className="text-white mb-1">
                         <h2 className="text-2xl font-black">{selectedPeer.name}</h2>
                         <p className="text-sm opacity-80">{selectedPeer.title}</p>
                      </div>
                   </div>
                   <button onClick={() => setSelectedPeer(null)} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full"><X size={20}/></button>
                </div>
                
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                   <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl border ${theme.cardBorder} bg-black/5 dark:bg-white/5 text-center`}>
                         <span className="block text-xs font-black uppercase opacity-40 mb-1">Level</span>
                         <span className="text-3xl font-black text-indigo-500">{selectedPeer.level}</span>
                      </div>
                      <div className={`p-4 rounded-2xl border ${theme.cardBorder} bg-black/5 dark:bg-white/5 text-center`}>
                         <span className="block text-xs font-black uppercase opacity-40 mb-1">Streak</span>
                         <span className="text-3xl font-black text-emerald-500">{selectedPeer.streak}</span>
                      </div>
                   </div>
                   
                   <button 
                     onClick={handleDuel}
                     disabled={duelStatus !== 'idle'}
                     className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${
                        duelStatus === 'sent' 
                            ? 'bg-emerald-500 text-white' 
                            : duelStatus === 'sending'
                                ? 'bg-orange-500/50 text-white cursor-wait'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                     }`}
                   >
                      {duelStatus === 'sending' && <Loader2 size={18} className="animate-spin" />}
                      {duelStatus === 'sent' ? 'Kudos Sent!' : duelStatus === 'sending' ? 'Sending...' : 'Send Kudos'}
                   </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommunityPage;
