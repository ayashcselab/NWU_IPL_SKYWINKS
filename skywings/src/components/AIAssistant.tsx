import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  Brain, 
  Zap, 
  History, 
  Trash2,
  User,
  Bot,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, deleteDoc, getDocs } from 'firebase/firestore';
import { generateThinkingResponse, generateQuickResponse } from '../services/gemini';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface Message {
  id: string;
  text: string;
  role: 'user' | 'model';
  mode: 'thinking' | 'quick';
  createdAt: any;
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'thinking' | 'quick'>('quick');
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || !isOpen) return;

    const chatPath = 'chat_history';
    const q = query(
      collection(db, chatPath),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );
    const fallbackQ = query(collection(db, chatPath), where('userId', '==', user.uid));

    let unsubscribe: (() => void) | null = null;
    let isFallbackActive = false;

    const startListener = (currentQuery: any, isFallback: boolean = false) => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      const unsub = onSnapshot(currentQuery, (snapshot) => {
        let history = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        
        if (isFallback) {
          // Sort client-side if we're using the fallback query
          history = history.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
            return timeA - timeB;
          });
        }
        setMessages(history);
      }, (err) => {
        const errorMessage = err.message || '';
        if (!isFallback && !isFallbackActive && (errorMessage.includes('requires an index') || errorMessage.includes('index'))) {
          console.warn('Firestore index missing for chat history. Falling back to client-side sorting.');
          isFallbackActive = true;
          startListener(fallbackQ, true);
        } else {
          handleFirestoreError(err, OperationType.GET, chatPath);
        }
      });
      
      unsubscribe = unsub;
    };

    startListener(q);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Save user message to Firestore
      await addDoc(collection(db, 'chat_history'), {
        userId: user.uid,
        text: userMessage,
        role: 'user',
        mode,
        createdAt: serverTimestamp()
      });

      // Prepare history for Gemini
      const history = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      let aiResponse = '';
      if (mode === 'thinking') {
        aiResponse = await generateThinkingResponse(userMessage, history);
      } else {
        aiResponse = await generateQuickResponse(userMessage, history);
      }

      // Save AI response to Firestore
      await addDoc(collection(db, 'chat_history'), {
        userId: user.uid,
        text: aiResponse || "Sorry, I couldn't process that.",
        role: 'model',
        mode,
        createdAt: serverTimestamp()
      });

    } catch (err) {
      console.error('AI Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'chat_history'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (err) {
      console.error('Clear history error:', err);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-[400px] h-[600px] bg-[#1a1a1a] border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-br from-[#1a1a1a] to-[#222] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#7371ff]/10 rounded-xl flex items-center justify-center border border-[#7371ff]/20">
                  <Sparkles className="w-5 h-5 text-[#7371ff]" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">SkyWinks AI</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Travel Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearHistory}
                  className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-red-400 transition-colors"
                  title="Clear History"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="p-4 bg-white/5 flex gap-2">
              <button
                onClick={() => setMode('quick')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                  mode === 'quick' 
                    ? 'bg-[#7371ff] border-[#7371ff] text-white' 
                    : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                <Zap className="w-3 h-3" /> Quick Mode
              </button>
              <button
                onClick={() => setMode('thinking')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                  mode === 'thinking' 
                    ? 'bg-[#7371ff] border-[#7371ff] text-white' 
                    : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                <Brain className="w-3 h-3" /> Thinking Mode
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                  <Bot className="w-12 h-12" />
                  <p className="text-xs font-black uppercase tracking-widest">How can I help you today?</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      msg.role === 'user' 
                        ? 'bg-white/5 border-white/10' 
                        : 'bg-[#7371ff]/10 border-[#7371ff]/20'
                    }`}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-white/40" /> : <Bot className="w-4 h-4 text-[#7371ff]" />}
                    </div>
                    <div className={`max-w-[80%] space-y-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-[#7371ff] text-white rounded-tr-none' 
                          : 'bg-white/5 text-white/80 border border-white/5 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/20">
                        {msg.mode} • {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-[#7371ff]/10 border border-[#7371ff]/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-[#7371ff]" />
                  </div>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none">
                    <Loader2 className="w-4 h-4 text-[#7371ff] animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-6 border-t border-white/5 bg-white/5">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={mode === 'thinking' ? "Ask a complex travel question..." : "Ask a quick question..."}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 pr-14 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-[#7371ff]/50 focus:bg-white/15 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-[#7371ff] hover:bg-[#6361ff] rounded-xl text-white transition-all disabled:opacity-50 disabled:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl transition-all ${
          isOpen ? 'bg-white text-black' : 'bg-[#7371ff] text-white shadow-[#7371ff]/20'
        }`}
      >
        {isOpen ? <ChevronDown className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
      </motion.button>
    </div>
  );
}
