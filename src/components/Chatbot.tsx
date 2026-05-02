import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send, Sparkles, Loader2, User, Bot, Minimize2, Maximize2 } from "lucide-react";
import { generateChatResponse } from "../lib/gemini";
import { cn } from "../lib/utils";

const SYSTEM_INSTRUCTION = `You are the CreateSphere Assistant, a helpful and friendly AI chatbot for the CreateSphere platform.
Your goal is to assist users with information about the platform, its features, pricing, and how to use it.

About CreateSphere:
- It's an all-in-one AI-powered multimodal content creation platform.
- It transforms ideas into videos, images, and voiceovers instantly from text prompts.
- Key Features:
  1. AI-Powered Creation: Generate videos, images, and voiceovers from text.
  2. AI Speaking Agents: Automate tasks using voice commands.
  3. High-Resolution Output: Supports up to 8K resolution.
  4. Real-Time Collaboration: Work with team members simultaneously.
  5. Advanced Customization: Customize templates, avatars, voice tones, and styles.
  6. Instant Generation: Fast AI engine for quick results.
- Pricing Plans:
  1. Free Plan ($0/mo): Basic AI tools, limited templates, standard resolution.
  2. Pro Plan ($29/mo): Advanced AI tools, HD/4K output, more templates, priority support.
  3. Enterprise (Custom): Full features, 8K output, team collaboration, API access.
- Target Audience: Students, Small Businesses, Creators, Enterprises, and Nonprofits.
- Workflow: Enter Idea -> AI Generates -> Customize -> Publish.

Guidelines for your responses:
- Be concise, professional, and encouraging.
- If a user asks how to do something, guide them to the Dashboard.
- If they are not logged in, suggest they Register or Login.
- Use formatting like bullet points for readability.
- If you don't know something specific about a user's account, ask them to check their Settings or Dashboard.
- Mention that CreateSphere is trusted by over 10,000 creators.`;

interface Message {
  role: "user" | "bot";
  text: string;
  timestamp: Date;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hi there! I'm your CreateSphere Assistant. How can I help you create something amazing today?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const QUICK_OPTIONS = [
    "What is CreateSphere?",
    "Show me pricing plans",
    "How to create a video?",
    "Is there a free plan?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      text: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textOverride) setInput("");
    setIsLoading(true);

    try {
      const chatHistory = messages.map(m => ({
        role: m.role === "user" ? "user" : "model" as const,
        parts: [{ text: m.text }]
      }));

      const botText = await generateChatResponse(messageText, chatHistory, SYSTEM_INSTRUCTION);

      const botMessage: Message = {
        role: "bot",
        text: botText || "I'm sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chatbot Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Oops! Something went wrong. Please check your connection and try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? "64px" : "500px",
              width: "380px"
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col mb-4 transition-all duration-300",
              isMinimized && "rounded-full"
            )}
          >
            {/* Header */}
            <div className="p-4 bg-brand-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">CreateSphere Assistant</h3>
                  {!isMinimized && <p className="text-[10px] text-brand-100">Online & Ready to Help</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-2 max-w-[85%]",
                        m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                        m.role === "user" ? "bg-brand-100 text-brand-600" : "bg-white text-slate-600 border border-slate-100"
                      )}>
                        {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl text-sm leading-relaxed",
                        m.role === "user" 
                          ? "bg-brand-600 text-white rounded-tr-none" 
                          : "bg-white text-slate-700 border border-slate-100 shadow-sm rounded-tl-none"
                      )}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  
                  {messages.length === 1 && !isLoading && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {QUICK_OPTIONS.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(opt)}
                          className="px-3 py-1.5 bg-white border border-brand-100 text-brand-600 rounded-full text-xs font-medium hover:bg-brand-50 transition-colors shadow-sm"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {isLoading && (
                    <div className="flex items-start gap-2 mr-auto">
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                        <Bot className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="p-3 bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-none">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                  <div className="relative flex items-center gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSend()}
                      placeholder="Ask me anything..."
                      className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all disabled:opacity-50 disabled:hover:bg-brand-600 shadow-lg shadow-brand-200"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 mt-3">
                    Powered by CreateSphere AI
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className={cn(
          "w-14 h-14 bg-brand-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-brand-700 transition-all group relative",
          isOpen && "scale-0 opacity-0"
        )}
      >
        <MessageCircle className="w-7 h-7 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
      </motion.button>
    </div>
  );
}
