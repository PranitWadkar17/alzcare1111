'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Mic, Volume2, MapPin, Phone,
  Activity, Bell, Sparkles, Loader2, User, Bot,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatbotProps {
  patientContext?: {
    wellnessScore?: number;
    todayActivities?: number;
    pendingReminders?: number;
    location?: { lat: number; lng: number };
    isTracking?: boolean;
  };
  onSendLocation?: () => void;
  onCallCaregiver?: () => void;
  onSendSOS?: () => void;
  onLogActivity?: (activity: string) => void;
  onNavigate?: (path: string) => void;
  onShowReminders?: () => void;
}

export default function AIChatbot({
  patientContext,
  onSendLocation,
  onCallCaregiver,
  onSendSOS,
  onLogActivity,
  onNavigate,
  onShowReminders,
}: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! 👋 I\'m your AlzCare AI assistant. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          patientContext,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        let aiMessageContent = data.message;
        
        // Handle actions in the response
        if (aiMessageContent.includes('ACTION:SEND_LOCATION')) {
          onSendLocation?.();
          aiMessageContent = aiMessageContent.replace('ACTION:SEND_LOCATION', '').trim();
          if (!aiMessageContent) {
            aiMessageContent = '📍 Sending your location to your caregiver now!';
          }
        }
        
        if (aiMessageContent.includes('ACTION:CALL_CAREGIVER')) {
          onCallCaregiver?.();
          aiMessageContent = aiMessageContent.replace('ACTION:CALL_CAREGIVER', '').trim();
          if (!aiMessageContent) {
            aiMessageContent = '📞 Calling your caregiver now!';
          }
        }
        
        if (aiMessageContent.includes('ACTION:SEND_SOS')) {
          onSendSOS?.();
          aiMessageContent = aiMessageContent.replace('ACTION:SEND_SOS', '').trim();
          if (!aiMessageContent) {
            aiMessageContent = '🆘 Emergency SOS alert sent! Your caregiver has been notified via SMS and your location has been shared.';
          }
        }
        
        if (aiMessageContent.includes('ACTION:SHOW_REMINDERS')) {
          onShowReminders?.();
          aiMessageContent = aiMessageContent.replace('ACTION:SHOW_REMINDERS', '').trim();
        }
        
        if (aiMessageContent.includes('ACTION:LOG_ACTIVITY:')) {
          const match = aiMessageContent.match(/ACTION:LOG_ACTIVITY:([^\n]+)/);
          if (match) {
            const activity = match[1].trim();
            onLogActivity?.(activity);
            aiMessageContent = aiMessageContent.replace(match[0], '').trim();
            if (!aiMessageContent) {
              aiMessageContent = `✅ Logged "${activity}" to your activities!`;
            }
          }
        }
        
        if (aiMessageContent.includes('ACTION:NAVIGATE:')) {
          const match = aiMessageContent.match(/ACTION:NAVIGATE:([^\n]+)/);
          if (match) {
            const path = match[1].trim();
            onNavigate?.(path);
            aiMessageContent = aiMessageContent.replace(match[0], '').trim();
          }
        }
        
        // Handle directions request
        if (aiMessageContent.includes('ACTION:DIRECTIONS:')) {
          const match = aiMessageContent.match(/ACTION:DIRECTIONS:([^\n]+)/);
          if (match && patientContext?.location) {
            const destination = match[1].trim();
            const { lat, lng } = patientContext.location;
            const mapsUrl = `https://www.google.com/maps/dir/${lat},${lng}/${encodeURIComponent(destination)}`;
            
            aiMessageContent = aiMessageContent.replace(match[0], '').trim();
            aiMessageContent += `\n\n🗺️ [Click here for directions to ${destination}](${mapsUrl})`;
            
            // Auto-open the map
            setTimeout(() => {
              window.open(mapsUrl, '_blank');
            }, 500);
          }
        }
        
        // Handle open map request
        if (aiMessageContent.includes('ACTION:OPEN_MAP')) {
          if (patientContext?.location) {
            const { lat, lng } = patientContext.location;
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            
            aiMessageContent = aiMessageContent.replace('ACTION:OPEN_MAP', '').trim();
            aiMessageContent += `\n\n🗺️ [Click here to view your location on map](${mapsUrl})`;
            
            // Auto-open the map
            setTimeout(() => {
              window.open(mapsUrl, '_blank');
            }, 500);
          }
        }

        const aiMessage: Message = {
          role: 'assistant',
          content: aiMessageContent,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, I\'m having trouble right now. Please try again. 🙏',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      alert('Voice input is not supported in your browser.');
    }
  };

  const speakMessage = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const quickActions = [
    { label: 'My Location', icon: MapPin, action: () => setInput('What is my current location?') },
    { label: 'Send Location', icon: MapPin, action: () => setInput('Send my location to caregiver') },
    { label: 'Call Help', icon: Phone, action: () => setInput('Call my caregiver') },
    { label: 'SOS Alert', icon: Bell, action: () => setInput('Send emergency SOS alert') },
  ];

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 p-5 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500 text-white shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 transition-all group"
          >
            <MessageCircle className="w-7 h-7" />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] h-[650px] rounded-3xl bg-gradient-to-br from-[#07111f] to-[#050816] border border-white/10 shadow-2xl shadow-black/50 flex flex-col overflow-hidden backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-b border-white/10">
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 blur-xl"
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 shadow-lg shadow-emerald-500/20">
                    <Sparkles className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">AlzCare AI</h3>
                    <p className="text-xs text-emerald-300 font-medium">Your Health Assistant</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-b border-white/5">
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={action.action}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-emerald-400/30 text-xs font-bold text-slate-300 hover:text-white transition-all"
                  >
                    <action.icon className="w-4 h-4 text-emerald-400" />
                    {action.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-emerald-400/20 to-teal-400/20'
                        : 'bg-gradient-to-br from-violet-400/20 to-purple-400/20'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-emerald-300" />
                    ) : (
                      <Bot className="w-4 h-4 text-violet-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div
                      className={`p-4 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 ml-8'
                          : 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 mr-8'
                      }`}
                    >
                      {/* Render message with clickable links */}
                      {msg.content.includes('[Click here') ? (
                        <div className="text-sm text-white leading-relaxed space-y-2">
                          {msg.content.split('\n\n').map((part, idx) => {
                            const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
                            if (linkMatch) {
                              const [fullMatch, linkText, url] = linkMatch;
                              const beforeLink = part.substring(0, part.indexOf(fullMatch));
                              const afterLink = part.substring(part.indexOf(fullMatch) + fullMatch.length);
                              return (
                                <div key={idx}>
                                  {beforeLink}
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
                                  >
                                    {linkText}
                                  </a>
                                  {afterLink}
                                </div>
                              );
                            }
                            return <p key={idx}>{part}</p>;
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => speakMessage(msg.content)}
                        className="ml-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition-all"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="p-2 rounded-xl bg-gradient-to-br from-violet-400/20 to-purple-400/20">
                    <Bot className="w-4 h-4 text-violet-300" />
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span className="text-sm text-slate-400">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-gradient-to-r from-white/[0.02] to-white/[0.01]">
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleVoiceInput}
                  disabled={isListening}
                  className={`p-3 rounded-xl transition-all ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </motion.button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all disabled:opacity-50"
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
