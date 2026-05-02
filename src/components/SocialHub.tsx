import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Share2, Instagram, Linkedin, Twitter, Youtube, 
  Plus, Check, ExternalLink, Image as ImageIcon, 
  Video, Calendar, Send, Shield, Globe, Lock,
  Loader2, AlertCircle, Sparkles, Wand2, Layers,
  AlertTriangle
} from "lucide-react";
import { cn } from "../lib/utils";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

interface SocialHubProps {
  projects: any[];
  user: any;
}

const PLATFORMS = [
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "bg-[#0A66C2]" },
  { id: "twitter", name: "X (Twitter)", icon: Twitter, color: "bg-black" },
  { id: "instagram", name: "Instagram", icon: Instagram, color: "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600" },
  { id: "youtube", name: "YouTube", icon: Youtube, color: "bg-[#FF0000]" },
];

export default function SocialHub({ projects, user }: SocialHubProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [showStatus, setShowStatus] = useState<any>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const selectedAsset = projects.find(p => p.id === selectedAssetId);

  useEffect(() => {
    if (!user?.uid) return;
    
    const q = query(collection(db, "users", user.uid, "socialConnections"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const connectionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setConnections(connectionsData);
      setConnectedPlatforms(connectionsData.map(c => c.id));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/socialConnections`);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const [connections, setConnections] = useState<any[]>([]);

  // Handle message from OAuth popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SOCIAL_AUTH_SUCCESS') {
        const { platform } = event.data;
        setIsConnecting(null);
        setShowStatus({ 
          type: "success", 
          title: "Platform Connected!", 
          desc: `${platform.charAt(0).toUpperCase() + platform.slice(1)} joined the hub.` 
        });
        setTimeout(() => setShowStatus(null), 3000);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const togglePlatform = async (id: string) => {
    if (!connectedPlatforms.includes(id)) {
      try {
        setIsConnecting(id);
        const res = await fetch(`/api/auth/url/${id}?userId=${user.uid}`);
        const data = await res.json();
        
        if (data.error) {
          setShowStatus({ type: "warning", title: data.error, desc: data.details || "API keys not configured yet." });
          setTimeout(() => setShowStatus(null), 7000);
          return;
        }

        // Open OAuth Popup
        const width = 600;
        const height = 700;
        const left = window.innerWidth / 2 - width / 2;
        const top = window.innerHeight / 2 - height / 2;
        
        window.open(
          data.url,
          'oauth_popup',
          `width=${width},height=${height},top=${top},left=${left}`
        );
      } catch (err: any) {
        setShowStatus({ type: "error", title: "Connection Failed", desc: err.message });
        setTimeout(() => setShowStatus(null), 5000);
      } finally {
        setIsConnecting(null);
      }
      return;
    }
    
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handlePost = async () => {
    if (!selectedAssetId || selectedPlatforms.length === 0) return;
    
    setIsPosting(true);
    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          platforms: selectedPlatforms,
          caption,
          mediaUrl: selectedAsset?.imageUrl || selectedAsset?.videoUrl
        })
      });

      const data = await res.json();
      
      const failedCount = Object.values(data.results || {}).filter((r: any) => r.status === "failed").length;
      
      if (failedCount === 0) {
        setShowStatus({ type: "success", title: "Shared Successfully!", desc: `Posted to ${selectedPlatforms.length} platforms.` });
        setCaption("");
        setSelectedPlatforms([]);
      } else {
        setShowStatus({ 
          type: "warning", 
          title: "Partial Success", 
          desc: `Posted to ${selectedPlatforms.length - failedCount} platforms. Check logs for details.` 
        });
      }
    } catch (err: any) {
      setShowStatus({ type: "error", title: "Publishing Failed", desc: err.message });
    } finally {
      setIsPosting(false);
      setTimeout(() => setShowStatus(null), 5000);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Left Column: Editor */}
      <div className="lg:col-span-2 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between font-sans">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-100 rounded-xl">
                <Share2 className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Multi-Channel Post Publisher</h3>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Unified Distribution Hub</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <span className="flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-[10px] font-bold">
                 <Shield className="w-3 h-3" /> API v2 Secured
               </span>
            </div>
          </div>

          <div className="p-8 space-y-10">
            {/* Step 1: Platforms */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">1. Choose Destinations</label>
                <p className="text-[10px] text-brand-600 font-bold">{selectedPlatforms.length} Selected</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {PLATFORMS.map((platform) => {
                  const isConnected = connectedPlatforms.includes(platform.id);
                  const isSelected = selectedPlatforms.includes(platform.id);
                  const connecting = isConnecting === platform.id;
                  
                  return (
                    <button
                      key={platform.id}
                      disabled={connecting}
                      onClick={() => togglePlatform(platform.id)}
                      className={cn(
                        "relative group flex flex-col items-center justify-center p-5 rounded-[28px] border-2 transition-all duration-300",
                        isSelected 
                          ? "border-brand-500 bg-brand-50/30 ring-4 ring-brand-500/10" 
                          : "border-slate-100 hover:border-slate-200 bg-white"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                        isConnected ? platform.color + " shadow-lg" : "bg-slate-100"
                      )}>
                        {connecting ? (
                          <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                        ) : (
                          <platform.icon className={cn("w-6 h-6 transition-colors", isConnected ? "text-white" : "text-slate-400")} />
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-tight font-sans",
                        isConnected ? "text-slate-700" : "text-slate-400"
                      )}>
                        {platform.name}
                      </span>
                      
                      {isConnected && (
                        <div className={cn(
                          "absolute top-2 right-2 p-1 rounded-full",
                          isSelected ? "bg-brand-500 text-white" : "bg-slate-200 text-slate-500"
                        )}>
                          {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        </div>
                      )}

                      {!isConnected && !connecting && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[28px]">
                           <span className="bg-slate-900 text-white text-[8px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-xl">
                             <ExternalLink className="w-2 h-2" /> Connect
                           </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Content */}
            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">2. Post Caption</label>
                  <span className="text-[10px] text-slate-400 font-medium">{caption.length} / 2200</span>
                </div>
                <div className="relative group">
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Share your creative journey with the world..."
                    className="w-full h-56 p-6 bg-slate-50 border border-slate-100 rounded-[32px] text-sm font-sans leading-relaxed focus:ring-4 focus:ring-brand-500/10 focus:bg-white focus:border-brand-500 outline-none resize-none transition-all"
                  />
                  <div className="absolute bottom-5 right-5 flex gap-2">
                    <button className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all text-brand-600 hover:scale-110">
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">3. Pick Visual Asset</label>
                {selectedAsset ? (
                   <motion.div 
                     layoutId="media-preview"
                     className="relative group aspect-square rounded-[32px] overflow-hidden border-4 border-white shadow-xl ring-1 ring-slate-200"
                   >
                      {selectedAsset.imageUrl ? (
                        <img src={selectedAsset.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white font-bold">
                          <Video className="w-12 h-12 mb-3 text-brand-400" />
                          <span className="text-[10px] uppercase tracking-widest">Video Post Preview</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                        <button 
                          onClick={() => setSelectedAssetId(null)}
                          className="w-full py-3 bg-white/20 backdrop-blur-md rounded-2xl text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/30 transition-all"
                        >
                          Change Media
                        </button>
                      </div>
                   </motion.div>
                ) : (
                  <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-slate-400 gap-4 group hover:border-brand-300 hover:bg-brand-50/20 transition-all cursor-pointer">
                    <div className="p-5 bg-white rounded-3xl shadow-md border border-slate-100 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-10 h-10 text-slate-300" />
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] font-black uppercase tracking-widest block mb-1">No Media Loaded</span>
                      <p className="text-[10px] text-slate-400 px-8">Select a project from your library on the right to attach it to this post</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-8 py-8 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2.5 px-6 py-4 bg-white border border-slate-200 rounded-[22px] text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all shadow-sm">
                <Calendar className="w-4 h-4 text-brand-500" />
                Schedule for later
              </button>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handlePost}
                disabled={isPosting || !selectedAssetId || selectedPlatforms.length === 0}
                className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-3 px-12 py-4 bg-brand-600 text-white rounded-[22px] font-bold text-sm hover:bg-brand-700 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-brand-200 disabled:opacity-50 disabled:scale-100"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Broadcasting Sync...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Publish Everywhere
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Global Status Banner */}
        <AnimatePresence>
          {showStatus && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "p-6 rounded-[32px] text-white flex items-center justify-between shadow-2xl transition-colors",
                showStatus.type === "success" ? "bg-emerald-600 shadow-emerald-200" : 
                showStatus.type === "warning" ? "bg-amber-600 shadow-amber-200" :
                "bg-rose-600 shadow-rose-200"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-[18px]">
                  {showStatus.type === "success" ? <Check className="w-6 h-6" /> : 
                   showStatus.type === "warning" ? <AlertTriangle className="w-6 h-6" /> :
                   <AlertCircle className="w-6 h-6" />}
                </div>
                <div>
                  <p className="font-bold text-base">{showStatus.title}</p>
                  <p className="text-xs opacity-90">{showStatus.desc}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowStatus(null)}
                className="px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Column: Library & Insights */}
      <div className="space-y-6">
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-7">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-600" />
              Creative Assets
            </h3>
            <span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-bold text-slate-500">
              {projects.filter(p => ["image", "video"].includes(p.type)).length} TOTAL
            </span>
          </div>
          
          <div className="max-h-[480px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {projects.filter(p => ["image", "video"].includes(p.type)).length > 0 ? (
              projects.filter(p => ["image", "video"].includes(p.type)).map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedAssetId(project.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-[24px] border-2 transition-all text-left group relative overflow-hidden",
                    selectedAssetId === project.id 
                      ? "bg-brand-50 border-brand-300 shadow-md ring-4 ring-brand-500/5" 
                      : "bg-slate-50/40 border-transparent hover:border-slate-200 hover:bg-white"
                  )}
                >
                  <div className="w-16 h-16 bg-slate-200 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                    {project.imageUrl ? (
                      <img src={project.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-[8px] text-white">
                         <Video className="w-4 h-4 mb-1" />
                         MP4
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className={cn(
                      "text-xs font-bold truncate mb-1 font-sans",
                      selectedAssetId === project.id ? "text-brand-700" : "text-slate-800"
                    )}>
                      {project.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-white/60 rounded text-[8px] font-bold text-slate-400 group-hover:text-brand-500">
                        {project.type.toUpperCase()}
                      </span>
                      <span className="text-[8px] text-slate-300 font-medium">
                        {new Date(project.createdAt?.seconds * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {selectedAssetId === project.id && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-brand-600 rounded-full p-1 shadow-lg">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="p-10 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                <ImageIcon className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">No Creative Assets</p>
                <p className="text-[10px] text-slate-300 mt-2">Generate media first to build your library.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 rounded-[32px] p-8 text-white overflow-hidden relative shadow-2xl">
          <div className="absolute -top-4 -right-4 p-4 opacity-5">
             <Globe className="w-32 h-32" />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-3 h-3" />
                Network Status
              </h3>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              </div>
            </div>
            
            <div className="space-y-6">
               {PLATFORMS.map(p => {
                 const connected = connectedPlatforms.includes(p.id);
                 return (
                   <div key={p.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          connected ? p.color + " shadow-lg ring-2 ring-white/10" : "bg-white/5 border border-white/10"
                        )}>
                          <p.icon className={cn("w-5 h-5", connected ? "text-white" : "text-white/20")} />
                        </div>
                        <div>
                          <span className={cn(
                            "text-xs font-bold block",
                            connected ? "text-white" : "text-white/30"
                          )}>{p.name}</span>
                          <span className="text-[9px] text-white/40 font-medium tracking-tight">
                            {connected ? (connections.find(c => c.id === p.id)?.profileName || "Connected") : "Not Linked"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {connected ? (
                          <div className="flex items-center gap-1.5 brightness-125">
                            <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                            <span className="text-[10px] font-black text-emerald-400 tracking-tighter">ACTIVE</span>
                          </div>
                        ) : (
                          <button 
                            onClick={() => togglePlatform(p.id)}
                            className="bg-white/10 hover:bg-brand-600 px-4 py-1.5 rounded-lg text-[9px] font-black text-white hover:text-white transition-all uppercase tracking-widest border border-white/10 hover:border-transparent hover:shadow-lg hover:shadow-brand-500/20"
                          >
                            LINK
                          </button>
                        )}
                      </div>
                   </div>
                 );
               })}
            </div>
            
            <div className="mt-10 pt-6 border-t border-white/5">
               <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-4 h-4 text-brand-400" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Privacy Shield</span>
                  </div>
                  <p className="text-[9px] text-white/40 leading-relaxed font-sans">
                    OAuth 2.0 tokens are encrypted and stored in your private hub. Revoke access anytime from the platform dashboard.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
