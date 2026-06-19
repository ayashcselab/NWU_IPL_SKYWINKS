import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Send, User as UserIcon, LogOut, Menu, X, Bell, Check, X as XIcon, Info, ShieldCheck, Plane, Clock, Eye, Trash2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface Notification {
  id: string;
  message: string;
  type: 'booking_request' | 'booking_accepted' | 'booking_cancelled' | 'payment_confirmed' | 'trip_completed' | 'package_booking';
  bookingId?: string;
  read: boolean;
  createdAt: any;
}

export default function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }

    const notificationsPath = 'notifications';
    const userUid = user.uid;
    
    // Listen to notifications for this user
    const q = query(
      collection(db, notificationsPath),
      where('userId', '==', userUid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      // Sort client-side to avoid requiring a composite index
      notifs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      setNotifications(notifs);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, notificationsPath);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    if (unreadNotifs.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      unreadNotifs.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
      setIsNotificationsOpen(false);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { name: 'HOME', id: 'home' },
    { name: 'PACKAGE', id: 'package' },
    { name: 'BOOKING', id: 'booking' },
    { name: 'CONTACT US', id: 'contact' },
  ];

  const scrollToSection = (id: string) => {
    if (location.pathname !== '/home') {
      navigate('/home');
      // After navigation, we need to wait for the home page to mount
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 ease-in-out ${
      scrolled 
        ? 'py-3 bg-slate-950/90 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)]' 
        : 'py-8 bg-transparent'
    } px-6`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => scrollToSection('home')} className="flex-shrink-0 transition-all duration-500 hover:scale-105 active:scale-95">
          <img 
            src="https://i.postimg.cc/gjhkRwzB/Sky-Winks-(1).png" 
            alt="SkyWinks Logo" 
            className={`transition-all duration-500 ease-in-out ${scrolled ? 'h-8 md:h-10' : 'h-12 md:h-16'} w-auto`}
            referrerPolicy="no-referrer"
          />
        </button>

        {/* Center Menu - Desktop */}
        <div className={`hidden md:flex items-center backdrop-blur-xl border border-white/20 rounded-full px-2 py-1.5 shadow-2xl transition-all duration-500 ease-in-out ${
          scrolled ? 'bg-white/5 scale-90' : 'bg-white/10'
        }`}>
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.id)}
                className={`px-8 py-3 rounded-full text-sm font-bold tracking-wider transition-all duration-300 text-white/70 hover:text-white hover:bg-white/5`}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="pl-4 pr-6 border-l border-white/10 ml-2">
            <button className="text-white/70 hover:text-white transition-colors">
              <Search className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsProfileOpen(false);
              }}
              className={`relative flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-500 ${
                scrolled ? 'w-10 h-10' : 'w-12 h-12'
              }`}
            >
              <Bell className={`${scrolled ? 'w-5 h-5' : 'w-6 h-6'} transition-all duration-500`} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900" />
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-80 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-50"
                >
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#7371ff] animate-pulse" />
                        <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-white/80">Notifications</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              markAllAsRead();
                            }}
                            className="text-[9px] font-black uppercase tracking-widest text-[#7371ff] hover:text-white transition-colors flex items-center gap-1.5 group/btn"
                          >
                            <Check className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                            Mark all read
                          </button>
                        )}
                        <div className="w-px h-3 bg-white/10" />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            clearAllNotifications();
                          }}
                          className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 transition-colors flex items-center gap-1.5 group/btn"
                        >
                          <XIcon className="w-3 h-3 group-hover/btn:rotate-90 transition-transform" />
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id}
                            onClick={() => {
                              markAsRead(notif.id);
                              if (notif.bookingId) {
                                navigate(`/booking-details/${notif.bookingId}`);
                                setIsNotificationsOpen(false);
                              }
                            }}
                            className={`p-5 border-b border-white/5 cursor-pointer transition-all hover:bg-white/10 relative group ${!notif.read ? 'bg-[#7371ff]/5' : ''}`}
                          >
                            {!notif.read && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#7371ff]" />
                            )}
                            <div className="flex gap-4">
                              <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center border transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                                notif.type === 'booking_request' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                notif.type === 'booking_accepted' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                notif.type === 'payment_confirmed' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                notif.type === 'trip_completed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                notif.type === 'package_booking' ? 'bg-[#7371ff]/10 text-[#7371ff] border-[#7371ff]/20' :
                                'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {notif.type === 'booking_request' ? <Info className="w-5 h-5" /> :
                                 notif.type === 'booking_accepted' ? <Check className="w-5 h-5" /> :
                                 notif.type === 'payment_confirmed' ? <ShieldCheck className="w-5 h-5" /> :
                                 notif.type === 'trip_completed' ? <Plane className="w-5 h-5" /> :
                                 notif.type === 'package_booking' ? <Plane className="w-5 h-5" /> :
                                 <XIcon className="w-5 h-5" />}
                              </div>
                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <p className={`text-xs leading-relaxed tracking-tight break-words ${!notif.read ? 'text-white font-bold' : 'text-white/50'}`}>
                                    {notif.message}
                                  </p>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <p className="text-[9px] text-white/20 font-black uppercase tracking-widest flex items-center gap-1.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    {notif.createdAt?.toDate ? new Date(notif.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                  </p>
                                  
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!notif.read && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsRead(notif.id);
                                        }}
                                        className="p-1.5 hover:bg-white/10 rounded-lg text-[#7371ff] transition-colors"
                                        title="Mark as read"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                    )}
                                    {notif.bookingId && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsRead(notif.id);
                                          navigate(`/booking-details/${notif.bookingId}`);
                                          setIsNotificationsOpen(false);
                                        }}
                                        className="p-1.5 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                                        title="View Details"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notif.id);
                                      }}
                                      className="p-1.5 hover:bg-white/10 rounded-lg text-red-400 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>

                                  {!notif.read && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#7371ff] shadow-[0_0_10px_rgba(115,113,255,0.5)] group-hover:hidden" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                      <div className="p-8 text-center">
                        <Bell className="w-8 h-8 text-white/10 mx-auto mb-2" />
                        <p className="text-xs text-white/20 font-bold uppercase tracking-widest">No notifications</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button 
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationsOpen(false);
              }}
              className={`flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-500 ${
                scrolled ? 'w-10 h-10' : 'w-12 h-12'
              }`}
            >
              <UserIcon className={`${scrolled ? 'w-5 h-5' : 'w-6 h-6'} transition-all duration-500`} />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-4 w-48 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-200 z-50">
                <div className="px-4 py-2 border-b border-white/5 mb-2">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Account</p>
                  <p className="text-sm text-white font-bold truncate">{auth.currentUser?.email}</p>
                </div>

                <Link 
                  to="/dashboard"
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors font-bold"
                >
                  <UserIcon className="w-4 h-4" />
                  My Dashboard
                </Link>

                {auth.currentUser?.email === "ayashcselab@gmail.com" && (
                  <Link 
                    to="/admin"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#7371ff] hover:bg-white/5 transition-colors font-bold"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin Panel
                  </Link>
                )}

                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors font-bold"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className={`md:hidden fixed inset-0 ${scrolled ? 'top-16' : 'top-28'} bg-slate-900/95 backdrop-blur-2xl z-40 p-8 animate-in slide-in-from-top duration-300`}>
          <div className="flex flex-col gap-6">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.id)}
                className={`text-2xl font-black tracking-tighter text-white/40 hover:text-white text-left`}
              >
                {item.name}
              </button>
            ))}
            <div className="h-px bg-white/10 my-4" />
            <div className="flex items-center gap-6">
              <button className="text-white/60"><Search className="w-8 h-8" /></button>
              <button className="text-white/60"><Send className="w-8 h-8" /></button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
