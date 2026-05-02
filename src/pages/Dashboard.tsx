import { useState, useEffect } from "react";
import { useAuth } from "../App";
import { motion, AnimatePresence } from "motion/react";
import { 
  Video, Image as ImageIcon, Mic, BarChart3, 
  Plus, Clock, Settings, Zap, ArrowUpRight,
  Search, Bell, ChevronRight, Type, Send, Loader2,
  Download, Play, Pause, Volume2, Sparkles, MessageSquare,
  Users, Layers, Sliders, Monitor, Share2, MoreVertical,
  Trash2, ExternalLink, Copy, Key, Menu, X
} from "lucide-react";
import { cn } from "../lib/utils";
import { GoogleGenAI, Modality } from "@google/genai";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import SocialHub from "../components/SocialHub";
import { 
  collection, query, where, onSnapshot, addDoc, 
  serverTimestamp, deleteDoc, doc, orderBy 
} from "firebase/firestore";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface Project {
  id: string;
  name: string;
  type: "video" | "image" | "voice" | "caption" | "social";
  status: "completed" | "processing" | "failed";
  createdAt: any;
  result?: string;
  audioUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // AI State
  const [activeTool, setActiveTool] = useState<"caption" | "voice" | "image" | "video" | "social" | null>(
    location.state?.initialTool || null
  );
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Customization State
  const [quality, setQuality] = useState("1080p");
  const [style, setStyle] = useState("cinematic");
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setError(null);
    setLastResult(null);
  }, [activeTool]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "projects"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "projects");
    });

    return () => unsubscribe();
  }, [user]);

  const saveProject = async (type: string, name: string, resultData: any) => {
    if (!user) return;
    const path = "projects";
    const data = {
      userId: user.uid,
      name,
      type,
      status: "completed",
      createdAt: serverTimestamp(),
      ...resultData
    };

    // Check size (approximate)
    const size = JSON.stringify(data).length;
    if (size > 1000000) {
      console.warn("Project data too large for Firestore, saving metadata only.");
      const metadataOnly = { ...data };
      // Remove potentially large fields
      delete (metadataOnly as any).imageUrl;
      delete (metadataOnly as any).audioUrl;
      delete (metadataOnly as any).result;
      metadataOnly.name = `${name} (Result too large to save)`;
      
      try {
        await addDoc(collection(db, path), metadataOnly);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
      return;
    }

    try {
      await addDoc(collection(db, path), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt || !user) return;
    setIsGenerating(true);
    setGenerationProgress("Generating your image...");
    setError(null);
    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API key not found. Please configure it in settings.");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `${prompt}. Style: ${style}. High resolution, detailed.` }],
        },
        config: {
          imageConfig: { aspectRatio: "1:1" },
        },
      });

      let imageUrl = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setLastResult(imageUrl);
        await saveProject("image", prompt.substring(0, 20) + "...", { imageUrl });
        setPrompt("");
      }
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || "Failed to generate image.";
      try {
        if (typeof errorMessage === 'string' && errorMessage.trim().startsWith('{')) {
          const parsed = JSON.parse(errorMessage);
          if (parsed.error?.message) errorMessage = parsed.error.message;
        }
      } catch (e) {}
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };

  const handleGenerateVideo = async () => {
    if (!prompt || !user) return;
    
    setIsGenerating(true);
    setGenerationProgress("Requesting video generation from backend...");
    setError(null);
    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate video.");
      }
      
      // If we had a real URL, we'd set it here
      // setLastResult(data.videoUrl);
      // await saveProject("video", prompt.substring(0, 20) + "...", { videoUrl: data.videoUrl });
      
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };

  const handleDownload = async (url: string, type: string, name: string) => {
    try {
      if (type === "video") {
        const response = await fetch(url, {
          headers: { 'x-goog-api-key': process.env.API_KEY || process.env.GEMINI_API_KEY! }
        });
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${name}.mp4`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
      } else if (type === "voice") {
        // If it's base64 (from Firestore) or data URL (from Live Preview)
        let blob;
        if (url.startsWith('data:')) {
          const response = await fetch(url);
          blob = await response.blob();
        } else {
          const binary = atob(url);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          blob = new Blob([bytes], { type: "audio/mp3" });
        }
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${name}.mp3`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
      } else if (type === "image") {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${name}.png`;
        a.click();
      } else if (type === "caption") {
        const blob = new Blob([url], { type: "text/plain" });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${name}.txt`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const deleteProject = async (id: string) => {
    const path = "projects";
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleGenerateCaption = async () => {
    if (!prompt || !user) return;
    setIsGenerating(true);
    setError(null);
    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API key not found. Please configure it in settings.");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a creative and engaging social media caption for: ${prompt}. Style: ${style}. Include relevant hashtags.`,
      });
      const resultText = response.text || "Failed to generate caption.";
      setLastResult(resultText);
      await saveProject("caption", prompt.substring(0, 20) + "...", { result: resultText });
      setPrompt("");
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || "Failed to generate caption.";
      try {
        if (typeof errorMessage === 'string' && errorMessage.trim().startsWith('{')) {
          const parsed = JSON.parse(errorMessage);
          if (parsed.error?.message) errorMessage = parsed.error.message;
        }
      } catch (e) {}
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVoice = async () => {
    if (!prompt || !user) return;
    setIsGenerating(true);
    setGenerationProgress("Generating voiceover...");
    setError(null);
    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API key not found. Please configure it in settings.");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        // Convert PCM to WAV for playback
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        
        // Gemini TTS returns 16-bit PCM at 24kHz
        const samples = new Int16Array(bytes.buffer);
        const wavBlob = encodeWAV(samples, 24000);
        const audioUrl = URL.createObjectURL(wavBlob);
        
        setLastResult(audioUrl);
        await saveProject("voice", prompt.substring(0, 20) + "...", { audioUrl: base64Audio });
        setPrompt("");
      }
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || "Failed to generate voiceover.";
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };

  const encodeWAV = (samples: Int16Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    for (let i = 0; i < samples.length; i++) {
      view.setInt16(44 + i * 2, samples[i], true);
    }

    return new Blob([view], { type: 'audio/wav' });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Sidebar Toggle - Visible only on mobile when sidebar is hidden */}
      {!isSidebarOpen && (
        <div className="md:hidden fixed top-20 left-4 z-[50]">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-3 bg-brand-600 text-white rounded-xl shadow-lg ring-4 ring-brand-500/20"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 p-6 z-[70] transition-transform duration-300 md:static md:translate-x-0 flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex md:hidden items-center justify-between mb-8">
           <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Dashboard Menu</span>
           <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
             <X className="w-6 h-6" />
           </button>
        </div>

        <div className="space-y-1 mb-8 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">Main Menu</p>
          {[
            { icon: BarChart3, label: "Overview", active: !activeTool, onClick: () => { setActiveTool(null); setIsSidebarOpen(false); } },
            { icon: MessageSquare, label: "AI Captions", active: activeTool === "caption", onClick: () => { setActiveTool("caption"); setIsSidebarOpen(false); } },
            { icon: Mic, label: "AI Speaking Agent", active: activeTool === "voice", onClick: () => { setActiveTool("voice"); setIsSidebarOpen(false); } },
            { icon: ImageIcon, label: "AI Image Gen", active: activeTool === "image", onClick: () => { setActiveTool("image"); setIsSidebarOpen(false); } },
            { icon: Video, label: "AI Video Gen", active: activeTool === "video", onClick: () => { setActiveTool("video"); setIsSidebarOpen(false); } },
            { icon: Share2, label: "Social Hub", active: activeTool === "social", onClick: () => { setActiveTool("social"); setIsSidebarOpen(false); } },
          ].map((item, i) => (
            <button 
              key={i}
              onClick={item.onClick}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                item.active ? "bg-brand-600 text-white shadow-lg shadow-brand-200" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-1 mb-8">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">Workspace</p>
          {[
            { icon: Users, label: "Team Library" },
            { icon: Clock, label: "Recent Projects" },
            { icon: Settings, label: "Settings" },
          ].map((item, i) => (
            <button key={i} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-auto p-5 bg-gradient-to-br from-brand-600 to-purple-700 rounded-2xl text-white shadow-xl shadow-brand-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold">Pro Plan</span>
          </div>
          <p className="text-xs text-brand-100 mb-4 leading-relaxed">Unlock 8K rendering, real-time collaboration, and advanced AI models.</p>
          <button className="w-full py-2.5 bg-white text-brand-600 rounded-xl text-xs font-bold hover:bg-brand-50 transition-colors">
            Upgrade Now
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-10 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold">
              {activeTool === "caption" ? "AI Powered Captions" : 
               activeTool === "voice" ? "AI Speaking Agent" : 
               activeTool === "image" ? "AI Image Generation" :
               activeTool === "video" ? "AI Video Generation" :
               activeTool === "social" ? "Social Hub & Publisher" :
               `Welcome back, ${user?.name}!`}
            </h1>
            <p className="text-slate-500 mt-1">
              {activeTool === "caption" ? "Generate high-engagement captions with advanced NLP." : 
               activeTool === "voice" ? "Professional voiceovers with natural speech synthesis." : 
               activeTool === "image" ? "Create stunning visuals from text descriptions." :
               activeTool === "video" ? "Cinematic video generation from text prompts." :
               activeTool === "social" ? "Publish and schedule across multiple platforms." :
               "Manage your creative projects and AI generations."}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden xl:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search projects..."
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none w-64 shadow-sm"
              />
            </div>
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button 
              onClick={() => setActiveTool("caption")}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-all shadow-lg shadow-brand-200"
            >
              <Plus className="w-4 h-4" />
              Create New
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTool === "social" ? (
             <motion.div
               key="social"
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.98 }}
               className="max-w-6xl mx-auto"
             >
               <SocialHub projects={projects} user={user} />
             </motion.div>
          ) : activeTool ? (
            <motion.div
              key="tool"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-5xl mx-auto"
            >
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Editor Area */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <Layers className="w-4 h-4 text-brand-600" />
                        Prompt Editor
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 text-slate-400 hover:text-brand-600 transition-colors">
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-brand-600 transition-colors">
                          <Users className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-8">
                      <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full p-0 bg-transparent border-none focus:ring-0 outline-none min-h-[200px] text-lg text-slate-800 placeholder:text-slate-300 resize-none"
                        placeholder="Describe your vision here..."
                      />
                    </div>
                    <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map(i => (
                            <img key={i} src={`https://i.pravatar.cc/150?u=${i}`} className="w-8 h-8 rounded-full border-2 border-white" />
                          ))}
                          <div className="w-8 h-8 rounded-full bg-brand-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-brand-600">+2</div>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">Collaborating in real-time</span>
                      </div>
                      <button 
                        onClick={
                          activeTool === "caption" ? handleGenerateCaption : 
                          activeTool === "voice" ? handleGenerateVoice : 
                          activeTool === "image" ? handleGenerateImage :
                          handleGenerateVideo
                        }
                        disabled={isGenerating || !prompt}
                        className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Generating...
                            </div>
                            {generationProgress && <span className="text-[10px] opacity-70 mt-1 font-normal">{generationProgress}</span>}
                          </div>
                        ) : (
                          <>
                            <Zap className="w-5 h-5" />
                            Instant Generation
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Customization Sidebar */}
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-brand-600" />
                      Advanced Customization
                    </h3>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Output Quality</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(activeTool === "video" ? ["720p", "1080p", "4K"] : ["1080p", "4K", "8K (Pro)", "Lossless"]).map(q => (
                            <button 
                              key={q}
                              onClick={() => setQuality(q)}
                              className={cn(
                                "px-3 py-2 rounded-lg text-xs font-bold border transition-all",
                                quality === q ? "bg-brand-50 border-brand-200 text-brand-600" : "border-slate-100 text-slate-500 hover:bg-slate-50"
                              )}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Visual Style</label>
                        <select 
                          value={style}
                          onChange={(e) => setStyle(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="cinematic">Cinematic</option>
                          <option value="minimalist">Minimalist</option>
                          <option value="vibrant">Vibrant</option>
                          <option value="professional">Professional</option>
                          <option value="artistic">Artistic</option>
                        </select>
                      </div>

                      {activeTool === "video" && (
                        <div className="pt-4 border-t border-slate-100">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">API Configuration</label>
                          <button 
                            onClick={async () => {
                              if (window.aistudio) {
                                await window.aistudio.openSelectKey();
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <Key className="w-3.5 h-3.5" />
                            Change Video API Key
                          </button>
                          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                            Video generation requires a paid Google Cloud project API key. 
                            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-brand-600 hover:underline ml-1">Learn more</a>
                          </p>
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">Real-time Collab</span>
                          </div>
                          <button 
                            onClick={() => setIsCollaborative(!isCollaborative)}
                            className={cn(
                              "w-10 h-5 rounded-full transition-colors relative",
                              isCollaborative ? "bg-brand-600" : "bg-slate-200"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                              isCollaborative ? "right-1" : "left-1"
                            )}></div>
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">Enable this to allow team members to edit and view generation progress in real-time.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-brand-50 rounded-3xl p-6 border border-brand-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-brand-700 font-bold text-sm">
                        <Monitor className="w-4 h-4" />
                        Live Preview
                      </div>
                      {lastResult && (
                        <button 
                          onClick={() => setLastResult(null)}
                          className="text-[10px] font-bold text-slate-400 hover:text-brand-600 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    <div className={cn(
                      "bg-white rounded-2xl border border-brand-100 flex items-center justify-center overflow-hidden shadow-inner relative group",
                      activeTool === "caption" ? "min-h-[400px]" : "aspect-video"
                    )}>
                      {isGenerating ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
                            <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-brand-600 animate-pulse" />
                          </div>
                          <p className="text-xs font-bold text-brand-600 animate-pulse">{generationProgress}</p>
                        </div>
                      ) : error ? (
                        <div className="flex flex-col items-center gap-4 p-8 text-center">
                          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                            <Zap className="w-6 h-6 text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 mb-1">Generation Failed</p>
                            <p className="text-xs text-slate-500 max-w-[200px]">{error}</p>
                          </div>
                          <button 
                            onClick={() => activeTool === "video" ? handleGenerateVideo() : activeTool === "image" ? handleGenerateImage() : activeTool === "voice" ? handleGenerateVoice() : handleGenerateCaption()}
                            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            Try Again
                          </button>
                        </div>
                      ) : lastResult ? (
                        <div className="w-full h-full">
                          {activeTool === "image" && (
                            <img src={lastResult} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          )}
                          {activeTool === "video" && (
                            <video src={lastResult} controls className="w-full h-full object-cover" />
                          )}
                          {activeTool === "voice" && (
                            <div className="flex flex-col items-center gap-4 p-6 text-center">
                              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center">
                                <Volume2 className="w-8 h-8 text-brand-600" />
                              </div>
                              <audio src={lastResult} controls autoPlay className="w-full max-w-[200px]" />
                              <p className="text-xs font-medium text-slate-500">Voiceover generated successfully</p>
                            </div>
                          )}
                          {activeTool === "caption" && (
                            <div className="p-8 h-full overflow-y-auto relative z-10 flex flex-col">
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3 text-brand-600">
                                  <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                                    <Type className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest block leading-none mb-1">AI Generated</span>
                                    <h4 className="text-sm font-bold text-slate-900">Social Media Caption</h4>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(lastResult!);
                                    const btn = document.getElementById('copy-btn');
                                    if (btn) {
                                      const originalContent = btn.innerHTML;
                                      btn.innerHTML = "Copied!";
                                      btn.classList.add('bg-emerald-600');
                                      setTimeout(() => {
                                        btn.innerHTML = originalContent;
                                        btn.classList.remove('bg-emerald-600');
                                      }, 2000);
                                    }
                                  }}
                                  id="copy-btn"
                                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition-all shadow-lg active:scale-95"
                                >
                                  <Copy className="w-4 h-4" />
                                  Copy Caption
                                </button>
                              </div>
                              <div className="flex-1 bg-white rounded-2xl p-6 border-2 border-brand-50 shadow-sm cursor-text group/text">
                                <p className="text-lg text-slate-800 leading-relaxed font-medium whitespace-pre-wrap select-text selection:bg-brand-200 selection:text-brand-900 outline-none">
                                  {lastResult}
                                </p>
                              </div>
                              <p className="mt-4 text-[10px] text-slate-400 font-medium text-center">
                                Click and drag to select specific parts of the text
                              </p>
                            </div>
                          )}
                          
                          {/* Quick Actions Overlay - Only for non-caption tools */}
                          {activeTool !== "caption" && (
                            <div className="absolute inset-0 bg-brand-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px] z-20">
                              <button 
                                onClick={() => handleDownload(lastResult!, activeTool!, `generation-${Date.now()}`)}
                                className="p-3 bg-white text-brand-600 rounded-xl shadow-xl hover:scale-110 transition-transform"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (lastResult) {
                                    try {
                                      let url = lastResult;
                                      if (activeTool === "video") {
                                        const response = await fetch(lastResult, {
                                          headers: { 'x-goog-api-key': process.env.API_KEY || process.env.GEMINI_API_KEY! }
                                        });
                                        const blob = await response.blob();
                                        url = URL.createObjectURL(blob);
                                      } else if (lastResult.startsWith('data:')) {
                                        const response = await fetch(lastResult);
                                        const blob = await response.blob();
                                        url = URL.createObjectURL(blob);
                                      }
                                      window.open(url, "_blank");
                                    } catch (e) {
                                      window.open(lastResult, "_blank");
                                    }
                                  }
                                }}
                                className="p-3 bg-white text-slate-600 rounded-xl shadow-xl hover:scale-110 transition-transform"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-slate-300">
                          <Monitor className="w-10 h-10" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Generation</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                  { label: "Videos Generated", value: projects.filter(p => p.type === "video").length, icon: Video, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Images Created", value: projects.filter(p => p.type === "image").length, icon: ImageIcon, color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Voiceovers", value: projects.filter(p => p.type === "voice").length, icon: Mic, color: "text-orange-600", bg: "bg-orange-50" },
                  { label: "Storage Used", value: `${(projects.length * 0.1).toFixed(1)} MB`, icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50" },
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", stat.bg)}>
                      <stat.icon className={cn("w-6 h-6", stat.color)} />
                    </div>
                    <p className="text-sm text-slate-500 font-semibold">{stat.label}</p>
                    <p className="text-3xl font-display font-bold mt-2">{stat.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Projects Table */}
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <h2 className="text-xl font-display font-bold">Recent Projects</h2>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 text-sm font-bold text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">View All Projects</button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                        <th className="px-8 py-4">Project Name</th>
                        <th className="px-8 py-4">Type</th>
                        <th className="px-8 py-4">Created</th>
                        <th className="px-8 py-4">Status</th>
                        <th className="px-8 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-600" />
                            Loading your projects...
                          </td>
                        </tr>
                      ) : projects.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium">
                            No projects yet. Start creating to see them here!
                          </td>
                        </tr>
                      ) : (
                        projects.map((project) => (
                          <tr key={project.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden",
                                  project.type === "video" ? "bg-blue-50 text-blue-600" :
                                  project.type === "image" ? "bg-purple-50 text-purple-600" :
                                  project.type === "voice" ? "bg-orange-50 text-orange-600" :
                                  "bg-brand-50 text-brand-600"
                                )}>
                                  {project.type === "image" && project.imageUrl ? (
                                    <img src={project.imageUrl} className="w-full h-full object-cover" />
                                  ) : project.type === "video" ? (
                                    <Video className="w-5 h-5" />
                                  ) : project.type === "image" ? (
                                    <ImageIcon className="w-5 h-5" />
                                  ) : project.type === "voice" ? (
                                    <Mic className="w-5 h-5" />
                                  ) : (
                                    <MessageSquare className="w-5 h-5" />
                                  )}
                                </div>
                                <span className="font-bold text-slate-700">{project.name}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <span className="text-sm font-medium text-slate-500 capitalize">{project.type}</span>
                            </td>
                            <td className="px-8 py-5">
                              <span className="text-sm text-slate-500 font-medium">
                                {project.createdAt?.toDate ? project.createdAt.toDate().toLocaleDateString() : "Just now"}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                {project.status}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {project.type === "voice" && project.audioUrl && (
                                  <button 
                                    onClick={() => {
                                      setActiveTool("voice");
                                      // Convert base64 to playable WAV blob URL
                                      const binary = atob(project.audioUrl!);
                                      const bytes = new Uint8Array(binary.length);
                                      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                                      const samples = new Int16Array(bytes.buffer);
                                      const wavBlob = encodeWAV(samples, 24000);
                                      const audioUrl = URL.createObjectURL(wavBlob);
                                      setLastResult(audioUrl);
                                      // Scroll to top to see preview
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white rounded-lg shadow-sm transition-all border border-slate-100"
                                    title="Preview Audio"
                                  >
                                    <Play className="w-4 h-4" />
                                  </button>
                                )}
                                {project.type === "image" && project.imageUrl && (
                                  <button 
                                    onClick={() => {
                                      setActiveTool("image");
                                      setLastResult(project.imageUrl!);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white rounded-lg shadow-sm transition-all border border-slate-100"
                                    title="Preview Image"
                                  >
                                    <ImageIcon className="w-4 h-4" />
                                  </button>
                                )}
                                {project.type === "video" && project.videoUrl && (
                                  <button 
                                    onClick={() => {
                                      setActiveTool("video");
                                      setLastResult(project.videoUrl!);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white rounded-lg shadow-sm transition-all border border-slate-100"
                                    title="Preview Video"
                                  >
                                    <Video className="w-4 h-4" />
                                  </button>
                                )}
                                {project.type === "caption" && project.result && (
                                  <button 
                                    onClick={() => {
                                      setActiveTool("caption");
                                      setLastResult(project.result!);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white rounded-lg shadow-sm transition-all border border-slate-100"
                                    title="Preview Caption"
                                  >
                                    <Type className="w-4 h-4" />
                                  </button>
                                )}
                                {project.type === "image" && project.imageUrl && (
                                  <button 
                                    onClick={() => handleDownload(project.imageUrl!, "image", project.name)}
                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white rounded-lg shadow-sm transition-all border border-slate-100"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                                {project.type === "voice" && project.audioUrl && (
                                  <button 
                                    onClick={() => handleDownload(project.audioUrl!, "voice", project.name)}
                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white rounded-lg shadow-sm transition-all border border-slate-100"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                                {project.type === "video" && project.videoUrl && (
                                  <button 
                                    onClick={() => handleDownload(project.videoUrl!, "video", project.name)}
                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white rounded-lg shadow-sm transition-all border border-slate-100"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                                {project.type === "caption" && project.result && (
                                  <button 
                                    onClick={() => handleDownload(project.result!, "caption", project.name)}
                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white rounded-lg shadow-sm transition-all border border-slate-100"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                                  <button 
                                    onClick={async () => {
                                      if (project.type === "image" && project.imageUrl) {
                                        try {
                                          const response = await fetch(project.imageUrl);
                                          const blob = await response.blob();
                                          const url = URL.createObjectURL(blob);
                                          window.open(url, "_blank");
                                        } catch (e) {
                                          window.open(project.imageUrl, "_blank");
                                        }
                                      }
                                      if (project.type === "video" && project.videoUrl) {
                                        try {
                                          const response = await fetch(project.videoUrl, {
                                            headers: { 'x-goog-api-key': process.env.API_KEY || process.env.GEMINI_API_KEY! }
                                          });
                                          const blob = await response.blob();
                                          const url = URL.createObjectURL(blob);
                                          window.open(url, "_blank");
                                        } catch (e) {
                                          window.open(project.videoUrl, "_blank");
                                        }
                                      }
                                      if (project.type === "caption" && project.result) {
                                        // Copy to clipboard or show in a nice way
                                        navigator.clipboard.writeText(project.result);
                                        alert("Caption copied to clipboard!");
                                      }
                                    }}
                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white rounded-lg shadow-sm transition-all border border-transparent hover:border-slate-100"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                <button 
                                  onClick={() => deleteProject(project.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg shadow-sm transition-all border border-transparent hover:border-slate-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
