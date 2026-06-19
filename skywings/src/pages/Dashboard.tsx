import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../firebase';
import { 
  LogOut, 
  User as UserIcon, 
  Loader2, 
  Plane, 
  Calendar, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Settings, 
  Bell, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Home as HomeIcon,
  Edit2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Activity,
  CreditCard,
  Ticket,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { CardIcon } from '../components/CardIcon';
import { storage } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface Booking {
  id: string;
  destination: string;
  date: string;
  status: 'pending' | 'paynow' | 'paid' | 'accepted' | 'completed' | 'cancelled';
  packagePrice?: number;
  price?: number;
  createdAt: any;
  paymentMethod?: {
    brand: string;
    last4: string;
  };
  paymentAmount?: string;
}

interface BoardingPass {
  id: string;
  bookingId: string;
  userId: string;
  destination: string;
  seatNumber: string;
  status: string;
  createdAt: any;
}

interface PersonalRequest {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  destination: string;
  people: string;
  date: string;
  path: string;
  status: 'pending' | 'paynow' | 'paid' | 'accepted' | 'completed' | 'cancelled';
  price?: number;
  createdAt: any;
  paymentMethod?: {
    brand: string;
    last4: string;
  };
  paymentAmount?: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  address?: string;
  bio?: string;
  avatarUrl?: string;
  preferences?: string[];
  loyaltyPoints?: number;
  createdAt: any;
}

interface Notification {
  id: string;
  message: string;
  type: string;
  createdAt: any;
  read: boolean;
}

export default function Dashboard() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [boardingPasses, setBoardingPasses] = useState<BoardingPass[]>([]);
  const [personalRequests, setPersonalRequests] = useState<PersonalRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    phone: '',
    address: '',
    bio: '',
    avatarUrl: '',
    preferences: [] as string[]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const navigate = useNavigate();

  const travelPreferences = [
    'Beach', 'Mountain', 'City', 'Nature', 'Adventure', 
    'Luxury', 'Budget', 'Solo', 'Family', 'Cultural'
  ];

  const avatarOptions = [
    'Felix', 'Aneka', 'Julian', 'Amaya', 'Jasper', 'Luna', 'Leo', 'Milo'
  ].map(seed => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        navigate('/signin');
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Real-time user profile listener
    const profileRef = doc(db, 'users', user.uid);
    
    // Check if profile exists first to avoid recursive setDoc in onSnapshot
    const checkProfile = async () => {
      try {
        const snapshot = await getDoc(profileRef);
        if (!snapshot.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Traveler',
            loyaltyPoints: 0,
            preferences: [],
            createdAt: serverTimestamp()
          };
          await setDoc(profileRef, newProfile);
        }
      } catch (err) {
        console.error('Error checking user profile:', err);
      }
    };

    checkProfile();

    const unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        const profileData = snapshot.data() as UserProfile;
        setProfile(profileData);
        setEditForm({
          displayName: profileData.displayName || '',
          phone: profileData.phone || '',
          address: profileData.address || '',
          bio: profileData.bio || '',
          avatarUrl: profileData.avatarUrl || '',
          preferences: profileData.preferences || []
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users');
    });

    // Fetch user's bookings
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid)
    );
    
    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      console.log('[DASHBOARD STATE UPDATED] bookings', { count: snapshot.size });
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      
      const sortedBookings = [...bookingsData].sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val.toMillis === 'function') return val.toMillis();
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          return 0;
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      });
      
      setBookings(sortedBookings);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'bookings');
    });

    // Fetch user's boarding passes - Only show active ones
    const boardingPassesQuery = query(
      collection(db, 'boarding_passes'),
      where('userId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribeBoardingPasses = onSnapshot(boardingPassesQuery, (snapshot) => {
      console.log('[DASHBOARD STATE UPDATED] boarding_passes', { count: snapshot.size });
      const passes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BoardingPass[];
      setBoardingPasses(passes);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'boarding_passes');
    });

    // Fetch user's personal requests
    const personalRequestsQuery = query(
      collection(db, 'personal_requests'),
      where('userId', '==', user.uid)
    );

    const unsubscribePersonalRequests = onSnapshot(personalRequestsQuery, (snapshot) => {
      console.log('[DASHBOARD STATE UPDATED] personal_requests', { count: snapshot.size });
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonalRequest[];
      setPersonalRequests(requests);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'personal_requests');
    });

    // Fetch user's notifications (Activity Feed)
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      const sortedNotifs = [...notifs].sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val.toMillis === 'function') return val.toMillis();
          return 0;
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      });
      
      setNotifications(sortedNotifs.slice(0, 5)); // Only show last 5 for activity feed
    });

    setLoading(false);
    return () => {
      unsubscribeProfile();
      unsubscribeBookings();
      unsubscribeBoardingPasses();
      unsubscribePersonalRequests();
      unsubscribeNotifications();
    };
  }, [user, navigate]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setIsSaving(true);
    try {
      const profileRef = doc(db, 'users', user.uid);
      await updateDoc(profileRef, {
        ...editForm,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB.');
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setEditForm(prev => ({ ...prev, avatarUrl: downloadURL }));
      
      // If not in editing mode, update profile directly
      if (!isEditing) {
        const profileRef = doc(db, 'users', user.uid);
        await updateDoc(profileRef, {
          avatarUrl: downloadURL,
          updatedAt: serverTimestamp()
        });
      }
      
      setShowAvatarPicker(false);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      alert('Failed to upload avatar.');
    } finally {
      setIsUploading(false);
    }
  };

  const stats = {
    total: bookings.length + personalRequests.length,
    accepted: [...bookings, ...personalRequests].filter(b => ['accepted', 'paid', 'completed'].includes(b.status)).length,
    pending: [...bookings, ...personalRequests].filter(b => b.status === 'pending').length,
    cancelled: [...bookings, ...personalRequests].filter(b => b.status === 'cancelled').length,
  };

  const allTrips = [
    ...bookings.map(b => ({ ...b, type: 'booking' })),
    ...personalRequests.map(r => ({ ...r, type: 'request' }))
  ].sort((a, b) => {
    const getTime = (val: any) => {
      if (!val) return Date.now(); // Use current time for pending server timestamps
      if (typeof val.toMillis === 'function') return val.toMillis();
      if (typeof val.toDate === 'function') return val.toDate().getTime();
      return 0;
    };
    return getTime(b.createdAt) - getTime(a.createdAt);
  });

  const statusPriority: Record<string, number> = {
    'accepted': 1,
    'paid': 2,
    'pending': 3,
    'completed': 4,
    'cancelled': 5
  };

  const nextAdventure = [...bookings, ...personalRequests]
    .filter(b => ['accepted', 'paid', 'pending'].includes(b.status))
    .sort((a, b) => {
      const statusDiff = (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
      if (statusDiff !== 0) return statusDiff;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    })[0];

  const completedTrips = allTrips.filter(t => t.status === 'completed').length;
  const loyaltyPoints = profile?.loyaltyPoints || 0; // Use stored points from profile
  const loyaltyTarget = 100;
  const loyaltyProgress = (loyaltyPoints / loyaltyTarget) * 100;

  const loyaltyLevel = loyaltyPoints < 10 ? 'Explorer' : 
                       loyaltyPoints < 50 ? 'Voyager' : 'Elite';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <Loader2 className="animate-spin w-12 h-12 text-[#7371ff]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white selection:bg-[#7371ff] selection:text-white">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Profile & Stats (4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Profile Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#1a1a1a] rounded-[40px] p-8 border border-white/5 shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#7371ff]/10 blur-3xl -mr-16 -mt-16 group-hover:bg-[#7371ff]/20 transition-colors" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="relative group/avatar">
                    <div className="w-24 h-24 bg-gradient-to-br from-[#7371ff] to-[#a19fff] rounded-3xl flex items-center justify-center shadow-xl shadow-[#7371ff]/20 overflow-hidden">
                      {profile?.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-12 h-12 text-white" />
                      )}
                    </div>
                    {isEditing && (
                      <button 
                        onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                        className="absolute -bottom-2 -right-2 p-2 bg-[#7371ff] rounded-xl shadow-lg hover:scale-110 transition-transform"
                      >
                        <Settings className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      if (isEditing) {
                        setIsEditing(false);
                      } else {
                        setIsEditing(true);
                      }
                    }}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-white/40 hover:text-white"
                  >
                    {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.form 
                      key="edit"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onSubmit={handleProfileUpdate}
                      className="space-y-4"
                    >
                      {showAvatarPicker && (
                        <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                          <div className="grid grid-cols-4 gap-2">
                            {avatarOptions.map((url, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setEditForm({...editForm, avatarUrl: url});
                                  setShowAvatarPicker(false);
                                }}
                                className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${editForm.avatarUrl === url ? 'border-[#7371ff]' : 'border-transparent hover:border-white/20'}`}
                              >
                                <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                          
                          <div className="pt-4 border-t border-white/10">
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-3 text-center">Or upload your own</p>
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/5 transition-colors">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {isUploading ? (
                                  <Loader2 className="w-6 h-6 text-[#7371ff] animate-spin" />
                                ) : (
                                  <>
                                    <Activity className="w-6 h-6 text-white/20 mb-2" />
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Select Image</p>
                                  </>
                                )}
                              </div>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                disabled={isUploading}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 block">Full Name</label>
                        <input 
                          type="text" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7371ff]/50"
                          value={editForm.displayName}
                          onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 block">Bio</label>
                        <textarea 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7371ff]/50 h-20 resize-none"
                          value={editForm.bio}
                          onChange={e => setEditForm({...editForm, bio: e.target.value})}
                          placeholder="Tell us about your travel style..."
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 block">Travel Preferences</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {travelPreferences.map(pref => (
                            <button
                              key={pref}
                              type="button"
                              onClick={() => {
                                const newPrefs = editForm.preferences.includes(pref)
                                  ? editForm.preferences.filter(p => p !== pref)
                                  : [...editForm.preferences, pref];
                                setEditForm({...editForm, preferences: newPrefs});
                              }}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                                editForm.preferences.includes(pref)
                                  ? 'bg-[#7371ff] border-[#7371ff] text-white'
                                  : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                              }`}
                            >
                              {pref}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 block">Phone</label>
                          <input 
                            type="text" 
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7371ff]/50"
                            value={editForm.phone}
                            onChange={e => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              setEditForm({...editForm, phone: value});
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 block">Address</label>
                          <input 
                            type="text" 
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7371ff]/50"
                            value={editForm.address}
                            onChange={e => setEditForm({...editForm, address: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                          }}
                          className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black tracking-widest uppercase text-xs transition-all flex items-center justify-center gap-2"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          disabled={isSaving}
                          className="flex-[2] py-4 bg-[#7371ff] hover:bg-[#6361ff] rounded-2xl font-black tracking-widest uppercase text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save Changes
                        </button>
                      </div>
                    </motion.form>
                  ) : (
                    <motion.div 
                      key="view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase">{profile?.displayName}</h2>
                        <p className="text-white/40 text-sm font-bold tracking-widest uppercase mt-1">{profile?.email}</p>
                      </div>

                      {profile?.bio && (
                        <p className="text-white/60 text-sm leading-relaxed italic">"{profile.bio}"</p>
                      )}

                      {profile?.preferences && profile.preferences.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {profile.preferences.map(pref => (
                            <span key={pref} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/40">
                              {pref}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="space-y-3 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-3 text-white/40">
                          <Phone className="w-4 h-4" />
                          <span className="text-xs font-bold tracking-widest uppercase">{profile?.phone || 'No phone added'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/40">
                          <MapPin className="w-4 h-4" />
                          <span className="text-xs font-bold tracking-widest uppercase">{profile?.address || 'No address added'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/40">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs font-bold tracking-widest uppercase">Joined {profile?.createdAt?.toDate ? new Date(profile.createdAt.toDate()).toLocaleDateString() : 'Recently'}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Loyalty Status / Complete Count Box */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a1a1a] rounded-[40px] p-8 border border-white/5 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#7371ff]/5 blur-3xl -mr-16 -mt-16 group-hover:bg-[#7371ff]/10 transition-colors" />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-1">Loyalty Status</h3>
                    <p className="text-3xl font-black tracking-tighter uppercase text-[#7371ff]">
                      {loyaltyPoints >= 100 ? 'Elite Voyager' : loyaltyPoints >= 50 ? 'Pro Explorer' : 'Rising Star'}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-[#7371ff]/10 rounded-2xl flex items-center justify-center border border-[#7371ff]/20">
                    <ShieldCheck className="w-7 h-7 text-[#7371ff]" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-5xl font-black text-white leading-none">{loyaltyPoints}</p>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-2">Loyalty Points</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-white/40 leading-none">
                        {loyaltyTarget}
                      </p>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-2">Target PTS</p>
                    </div>
                  </div>
                  
                  <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(loyaltyProgress, 100)}%` }}
                      className="h-full bg-gradient-to-r from-[#7371ff] to-[#a19fff] relative"
                    >
                      {/* Animated shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    </motion.div>
                  </div>
                  
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-[#7371ff]">{loyaltyPoints} PTS Earned</span>
                    <span className="text-white/20">
                      {loyaltyPoints >= loyaltyTarget ? 'Goal Reached!' : `${loyaltyTarget - loyaltyPoints} PTS to Goal`}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 hover:border-[#7371ff]/30 transition-all"
              >
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-2xl font-black">{stats.pending}</p>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Pending</p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 hover:border-green-500/30 transition-all"
              >
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-black">{stats.accepted}</p>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Accepted</p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 hover:border-red-500/30 transition-all"
              >
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-2xl font-black">{stats.cancelled}</p>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Cancelled</p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 hover:border-[#7371ff]/30 transition-all"
              >
                <div className="w-10 h-10 bg-[#7371ff]/10 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-5 h-5 text-[#7371ff]" />
                </div>
                <p className="text-2xl font-black">{stats.total}</p>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total Trips</p>
              </motion.div>
            </div>

            {/* Activity Feed */}
            <div className="bg-[#1a1a1a] rounded-[40px] p-8 border border-white/5">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-5 h-5 text-[#7371ff]" />
                <h3 className="text-sm font-black uppercase tracking-widest">Recent Activity</h3>
              </div>
              <div className="space-y-6">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div key={notif.id} className="flex gap-4 group">
                      <div className="w-1 h-auto bg-white/5 rounded-full group-hover:bg-[#7371ff]/50 transition-colors" />
                      <div>
                        <p className="text-xs text-white/60 leading-relaxed mb-1">{notif.message}</p>
                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                          {notif.createdAt?.toDate ? new Date(notif.createdAt.toDate()).toLocaleTimeString() : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/20 font-bold uppercase tracking-widest text-center py-4">No recent activity</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Booking History (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Next Adventure Highlight */}
            {nextAdventure && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[#7371ff] to-[#a19fff] rounded-[40px] p-8 md:p-12 shadow-2xl shadow-[#7371ff]/20 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -mr-32 -mt-32 group-hover:bg-white/20 transition-colors" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="space-y-4 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest text-white">
                      <Clock className="w-3 h-3" /> Next Adventure
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">
                      {nextAdventure.destination}
                    </h2>
                    <div className="flex items-center justify-center md:justify-start gap-6 text-white/80">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                        <Calendar className="w-4 h-4" /> {nextAdventure.date}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                        <MapPin className="w-4 h-4" /> {nextAdventure.status === 'accepted' ? 'Confirmed' : nextAdventure.status}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-white/20 backdrop-blur-xl rounded-[40px] flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                      <Plane className="w-16 h-16 text-white" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a1a1a] rounded-[40px] p-8 md:p-12 border border-white/5 shadow-2xl"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-2">Trip History</h1>
                  <p className="text-white/40 font-bold tracking-widest uppercase text-xs">Manage your upcoming and past adventures</p>
                </div>
                <Link 
                  to="/home" 
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black tracking-widest uppercase text-xs transition-all flex items-center gap-2"
                >
                  <Plane className="w-4 h-4" /> Book New Trip
                </Link>
              </div>

              <div className="space-y-4">
                {allTrips.length > 0 ? (
                  allTrips.map((trip) => (
                    <motion.div
                      key={trip.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group bg-white/5 hover:bg-white/[0.08] border border-white/5 rounded-3xl p-6 transition-all duration-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-[#7371ff]/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plane className="w-8 h-8 text-[#7371ff]" />
                          </div>
                          <div>
                            <h4 className="text-xl font-black uppercase tracking-tight mb-1">{trip.destination}</h4>
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
                                <Calendar className="w-3 h-3" />
                                {trip.date}
                              </div>
                              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${
                                trip.status === 'accepted' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                trip.status === 'paid' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                trip.status === 'paynow' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                trip.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                trip.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {trip.status === 'paynow' ? 'Ready for Payment' : trip.status}
                              </div>
                              <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-white/10 bg-white/5 text-white/40">
                                {trip.type === 'booking' ? 'Standard' : 'Personal Request'}
                              </div>
                              {trip.paymentMethod && (
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-[#7371ff]/30 bg-[#7371ff]/5 text-[#7371ff]">
                                    <CardIcon brand={trip.paymentMethod.brand} className="h-2.5" />
                                    {trip.paymentMethod.brand} •••• {trip.paymentMethod.last4}
                                  </div>
                                  {trip.paymentAmount && (
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-green-500/30 bg-green-500/5 text-green-400">
                                      {trip.paymentAmount}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {(trip.status === 'paynow' || (trip.status === 'pending' && trip.type === 'booking')) && (
                            <Link
                              to={`/payment/${trip.id}`}
                              className="flex items-center justify-center gap-3 px-6 py-4 bg-[#7371ff]/10 hover:bg-[#7371ff] text-[#7371ff] hover:text-white font-black text-[10px] tracking-[0.2em] uppercase rounded-2xl border border-[#7371ff]/20 hover:border-[#7371ff] transition-all group/btn"
                            >
                              Pay Now
                              <CreditCard className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                          )}
                          {trip.status === 'pending' && trip.type === 'request' && (
                            <div className="px-6 py-4 bg-white/5 text-white/40 font-black text-[10px] tracking-[0.2em] uppercase rounded-2xl border border-white/10">
                              Under Review
                            </div>
                          )}
                          {['accepted', 'paid'].includes(trip.status) && (
                            <Link
                              to={`/boarding-pass/${trip.id}`}
                              className="flex items-center justify-center gap-3 px-6 py-4 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white font-black text-[10px] tracking-[0.2em] uppercase rounded-2xl border border-green-500/20 hover:border-green-500 transition-all group/btn"
                            >
                              Boarding Pass
                              <Plane className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                          )}
                          {['pending', 'paynow', 'accepted'].includes(trip.status) && (
                            <button
                              onClick={() => {
                                // We can't easily show a modal here without adding state for each trip or a global modal
                                // For now, let's just navigate to details where the cancel button is prominent
                                navigate(`/booking-details/${trip.id}`);
                              }}
                              className="flex items-center justify-center gap-3 px-6 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black text-[10px] tracking-[0.2em] uppercase rounded-2xl border border-red-500/20 hover:border-red-500 transition-all group/btn"
                            >
                              Cancel
                              <X className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                          )}
                          <Link
                            to={`/booking-details/${trip.id}`}
                            className="flex items-center justify-center gap-3 px-6 py-4 bg-white/5 hover:bg-[#7371ff] text-white font-black text-[10px] tracking-[0.2em] uppercase rounded-2xl border border-white/10 hover:border-[#7371ff] transition-all group/btn"
                          >
                            View Details
                            <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20 text-center bg-white/5 rounded-[40px] border border-dashed border-white/10">
                    <Plane className="w-16 h-16 text-white/5 mx-auto mb-6" />
                    <p className="text-white/20 font-black uppercase tracking-[0.3em] mb-8">No adventures found yet</p>
                    <Link 
                      to="/home" 
                      className="px-10 py-5 bg-[#7371ff] hover:bg-[#6361ff] rounded-2xl font-black tracking-widest uppercase text-xs transition-all shadow-xl shadow-[#7371ff]/20 inline-flex items-center gap-3"
                    >
                      Start Your Journey <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Boarding Passes */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 text-green-400">
                <Ticket className="w-6 h-6" />
                <h3 className="text-xl font-black uppercase tracking-tight">Boarding Passes</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {boardingPasses.length > 0 ? (
                  boardingPasses.map((pass) => (
                    <motion.div
                      key={pass.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => navigate(`/boarding-pass/${pass.bookingId}`)}
                      className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-6 rounded-3xl border border-green-500/20 hover:border-green-500/40 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                          <Plane className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-green-400/40 uppercase tracking-widest">Seat</p>
                          <p className="text-xl font-black text-green-400">{pass.seatNumber}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Destination</p>
                        <p className="font-bold text-lg group-hover:text-green-400 transition-colors">{pass.destination}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Status: {pass.status}</p>
                        <ArrowRight className="w-4 h-4 text-green-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full bg-white/5 rounded-3xl p-8 text-center border border-dashed border-white/10">
                    <p className="text-white/20 font-bold tracking-widest uppercase text-[10px]">No boarding passes available</p>
                  </div>
                )}
              </div>
            </section>

            {/* Quick Tips / Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-[#7371ff] to-[#a19fff] p-8 rounded-[40px] shadow-xl shadow-[#7371ff]/20">
                <ShieldCheck className="w-10 h-10 text-white mb-6" />
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">Safe Travels</h3>
                <p className="text-white/80 text-sm leading-relaxed">Your safety is our priority. All SkyWinks flights follow strict international safety protocols.</p>
              </div>
              <div className="bg-[#1a1a1a] p-8 rounded-[40px] border border-white/5">
                <Bell className="w-10 h-10 text-[#7371ff] mb-6" />
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">Stay Updated</h3>
                <p className="text-white/40 text-sm leading-relaxed">Enable push notifications to get real-time updates on your flight status and gate changes.</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
