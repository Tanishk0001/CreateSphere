import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Video, Image as ImageIcon, Mic, Zap, Users, 
  Settings, CheckCircle2, XCircle, ArrowRight, Play,
  BarChart3, Globe, ShieldCheck, Rocket, Clock, DollarSign,
  X, PlayCircle, ArrowUpRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { useState } from "react";
import { useAuth } from "../App";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

export default function Home() {
  const [showDemo, setShowDemo] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleFeatureClick = (type: string) => {
    const toolMap: Record<string, string> = {
      image: "image",
      voice: "voice",
      video: "video",
      caption: "caption"
    };
    const targetTool = toolMap[type] || null;
    
    if (user) {
      navigate("/dashboard", { state: { initialTool: targetTool } });
    } else {
      navigate("/register", { state: { initialTool: targetTool } });
    }
  };

  return (
    <div className="overflow-hidden">
      {/* Demo Modal */}
      <AnimatePresence>
        {showDemo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm"
            onClick={() => setShowDemo(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowDemo(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <iframe 
                className="w-full h-full"
                src="https://www.youtube.com/embed/v7H5OTUXhzM?autoplay=1" 
                title="CreateSphere Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-48">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.15),transparent_50%)]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Multimodal Platform</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6"
          >
            Create. Automate. Inspire – <br />
            <span className="gradient-text">All in One Platform</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            CreateSphere is an AI-powered multimodal content creation platform that transforms your ideas into stunning videos, images, and voiceovers — instantly.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to={user ? "/dashboard" : "/register"} className="w-full sm:w-auto px-8 py-4 bg-brand-600 text-white rounded-full font-bold text-lg hover:bg-brand-700 transition-all shadow-xl shadow-brand-200 flex items-center justify-center gap-2 group">
              {user ? "Go to Dashboard" : "Get Started Free"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button 
              onClick={() => setShowDemo(true)}
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <PlayCircle className="w-6 h-6 text-brand-600" />
              Watch Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeIn}>
              <h2 className="text-3xl md:text-4xl mb-6 font-display font-bold">What is CreateSphere?</h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                CreateSphere is an all-in-one AI platform designed to simplify and revolutionize content creation. Whether you're a student, business owner, or content creator, CreateSphere allows you to generate high-quality videos, images, and voiceovers from simple text prompts.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed">
                With advanced AI automation, real-time collaboration, and multilingual support, CreateSphere removes technical barriers and empowers anyone to create professional-level content effortlessly.
              </p>
              <div className="mt-8 flex items-center gap-6">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <img key={i} src={`https://i.pravatar.cc/150?u=${i+10}`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                  ))}
                </div>
                <p className="text-sm font-medium text-slate-500">Trusted by <span className="text-brand-600 font-bold">10,000+</span> creators worldwide</p>
              </div>
            </motion.div>
            <motion.div 
              {...fadeIn}
              className="relative rounded-[40px] overflow-hidden shadow-2xl group"
            >
              <img 
                src="https://picsum.photos/seed/ai-creation/1200/800" 
                alt="CreateSphere Platform" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-900/40 to-transparent"></div>
              <button 
                onClick={() => setShowDemo(true)}
                className="absolute inset-0 flex items-center justify-center group"
              >
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-white fill-current" />
                </div>
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl mb-4 font-display font-bold">Powerful Features</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Everything you need to create world-class content in one place.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { id: "image", icon: Sparkles, title: "AI-Powered Creation", desc: "Generate videos, images, and voiceovers using simple text prompts. No design skills required." },
              { id: "voice", icon: Mic, title: "AI Speaking Agents", desc: "Automate tasks like editing, scheduling, and publishing using voice commands." },
              { id: "video", icon: Video, title: "High-Resolution Output", desc: "Create cinematic-quality visuals with support for up to 8K resolution." },
              { id: "collab", icon: Users, title: "Real-Time Collaboration", desc: "Work with your team simultaneously on projects in real time." },
              { id: "custom", icon: Settings, title: "Advanced Customization", desc: "Customize templates, avatars, voice tones, and styles to match your brand." },
              { id: "instant", icon: Zap, title: "Instant Generation", desc: "Go from idea to final product in seconds with our optimized AI engine." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                {...fadeIn}
                transition={{ delay: i * 0.1 }}
                onClick={() => handleFeatureClick(feature.id)}
                className="p-8 bg-white rounded-[32px] border border-slate-100 hover:border-brand-200 hover:shadow-xl transition-all group cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-5 h-5 text-brand-600" />
                </div>
                <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-600 transition-colors">
                  <feature.icon className="w-7 h-7 text-brand-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-brand-600 transition-colors">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <motion.div {...fadeIn} className="p-10 bg-red-50 rounded-3xl border border-red-100">
              <div className="flex items-center gap-3 mb-6 text-red-600">
                <XCircle className="w-8 h-8" />
                <h2 className="text-3xl font-display font-bold">The Problem</h2>
              </div>
              <ul className="space-y-4">
                {[
                  "Time-consuming content production",
                  "Expensive software and talent costs",
                  "Technically complex workflows",
                  "Tools spread across multiple platforms",
                  "Lack of multilingual support"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2.5"></div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div {...fadeIn} className="p-10 bg-emerald-50 rounded-3xl border border-emerald-100">
              <div className="flex items-center gap-3 mb-6 text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
                <h2 className="text-3xl font-display font-bold">Our Solution</h2>
              </div>
              <ul className="space-y-4">
                {[
                  "Easy-to-use interface for beginners",
                  "AI automation to save up to 70% time",
                  "Affordable pricing including free tier",
                  "Multilingual support for global users",
                  "All-in-one platform for complete creation"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2.5"></div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl mb-4">How It Works</h2>
            <p className="text-slate-400">Four simple steps to transform your ideas into reality.</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Enter Your Idea", desc: "Type your idea or script into the platform." },
              { step: "02", title: "AI Generates", desc: "CreateSphere instantly creates videos, images, and voiceovers." },
              { step: "03", title: "Customize", desc: "Modify templates, avatars, and styles as per your needs." },
              { step: "04", title: "Publish", desc: "Export or directly publish to social media platforms." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                {...fadeIn}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="text-6xl font-display font-black text-white/5 mb-4">{item.step}</div>
                <h3 className="text-xl mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-px bg-slate-700"></div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl mb-4">Who is it for?</h2>
            <p className="text-slate-600">Empowering creators across all industries.</p>
          </div>
          
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { title: "Students", desc: "Engaging presentations & learning content." },
              { title: "Small Business", desc: "Professional marketing on a budget." },
              { title: "Creators", desc: "High-quality content at scale." },
              { title: "Enterprises", desc: "Streamlined team workflows." },
              { title: "Nonprofits", desc: "Impactful campaigns for change." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                {...fadeIn}
                className="p-6 bg-slate-50 rounded-2xl text-center"
              >
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl mb-4">Simple Pricing</h2>
            <p className="text-slate-600">Choose the plan that fits your needs.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Free Plan", price: "$0", features: ["Basic AI tools", "Limited templates", "Standard resolution"] },
              { name: "Pro Plan", price: "$29", features: ["Advanced AI tools", "HD/4K output", "More templates", "Priority support"], popular: true },
              { name: "Enterprise", price: "Custom", features: ["Full features", "8K output", "Team collaboration", "API access"] }
            ].map((plan, i) => (
              <motion.div 
                key={i}
                {...fadeIn}
                className={cn(
                  "p-8 rounded-3xl border transition-all",
                  plan.popular ? "bg-white border-brand-500 shadow-2xl scale-105" : "bg-white border-slate-200"
                )}
              >
                {plan.popular && (
                  <span className="bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block">MOST POPULAR</span>
                )}
                <h3 className="text-2xl mb-2">{plan.name}</h3>
                <div className="text-4xl font-display font-bold mb-6">{plan.price}<span className="text-base font-normal text-slate-500">/mo</span></div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 className="w-5 h-5 text-brand-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link 
                  to={user ? "/dashboard" : "/register"} 
                  className={cn(
                    "w-full py-3 rounded-full font-bold text-center block transition-all",
                    plan.popular ? "bg-brand-600 text-white hover:bg-brand-700" : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                  )}
                >
                  {user ? "Go to Dashboard" : "Get Started"}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-8 h-8 text-brand-500" />
                <span className="text-2xl font-display font-bold">CreateSphere</span>
              </div>
              <p className="text-slate-400 max-w-md mb-8">
                Empowering the future of content creation with AI. Transform your ideas into stunning visuals and audio instantly.
              </p>
              <div className="flex gap-4">
                {/* Social icons placeholder */}
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-6">Platform</h4>
              <ul className="space-y-4 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">Legal</h4>
              <ul className="space-y-4 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
            © 2026 CreateSphere AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
