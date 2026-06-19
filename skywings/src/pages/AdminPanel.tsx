import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, where, getDocs, getDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Plane, 
  User, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowRight,
  Save,
  X,
  Settings,
  Package as PackageIcon,
  Plus,
  Globe,
  Activity,
  CreditCard,
  Facebook,
  DollarSign,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  Star,
  Image as ImageIcon,
  List,
  Mail
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { CardIcon } from '../components/CardIcon';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface BoardingPass {
  id: string;
  bookingId: string;
  userId: string;
  passengerName: string;
  destination: string;
  date: string;
  expiryDate?: string;
  seatNumber: string;
  gate: string;
  class: string;
  status: 'active' | 'used' | 'cancelled';
  createdAt: any;
}

interface Booking {
  id: string;
  userId: string;
  userEmail: string;
  fullName: string;
  email?: string;
  passportNumber?: string;
  destination: string;
  date: string;
  status: 'pending' | 'paynow' | 'paid' | 'accepted' | 'completed' | 'cancelled';
  packagePrice?: number;
  price?: number;
  paymentAmount?: string;
  paymentMethod?: {
    brand: string;
    last4: string;
  };
  createdAt: any;
}

interface PersonalRequest {
  id: string;
  userId: string;
  userEmail: string;
  fullName: string;
  email?: string;
  passportNumber?: string;
  destination: string;
  date: string;
  status: 'pending' | 'paynow' | 'paid' | 'accepted' | 'completed' | 'cancelled';
  price?: number;
  paymentAmount?: string;
  paymentMethod?: {
    brand: string;
    last4: string;
  };
  createdAt: any;
}

interface Package {
  id: string;
  title: string;
  arrival: string;
  departure: string;
  price: number;
  duration: string;
  image: string;
  status: 'active' | 'inactive';
  rating: number;
  description?: string;
  inclusions?: string[];
  createdAt: any;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  active: boolean;
}

const ADMIN_EMAIL = "ayashcselab@gmail.com";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'passes' | 'bookings' | 'requests' | 'packages' | 'social' | 'users'>('passes');
  const [passes, setPasses] = useState<BoardingPass[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<PersonalRequest[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingPass, setEditingPass] = useState<BoardingPass | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editingRequest, setEditingRequest] = useState<PersonalRequest | null>(null);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [editingSocialLink, setEditingSocialLink] = useState<SocialLink | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [showAddSocial, setShowAddSocial] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: string} | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    const allPaid = [...bookings, ...requests].filter(item => item.status === 'paid');
    const total = allPaid.reduce((acc, item) => {
      const amountStr = item.paymentAmount || '0';
      const amount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;
      return acc + amount;
    }, 0);
    setRevenue(total);
    if (bookings.length > 0 || requests.length > 0) {
      console.log('[REVENUE SUMMARY UPDATED]', { total, count: allPaid.length });
    }
  }, [bookings, requests]);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user && user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        if (user) navigate('/dashboard');
        else navigate('/signin');
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);

    // Boarding Passes
    const qPasses = query(collection(db, 'boarding_passes'), orderBy('createdAt', 'desc'));
    const unsubscribePasses = onSnapshot(qPasses, (snapshot) => {
      console.log('[ADMIN SNAPSHOT FIRED] boarding_passes', { count: snapshot.size });
      setPasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BoardingPass[]);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'boarding_passes'));

    // Bookings
    const qBookings = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
      console.log('[ADMIN SNAPSHOT FIRED] bookings', { count: snapshot.size });
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[]);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'bookings'));

    // Personal Requests
    const qRequests = query(collection(db, 'personal_requests'), orderBy('createdAt', 'desc'));
    const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
      console.log('[ADMIN SNAPSHOT FIRED] personal_requests', { count: snapshot.size });
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PersonalRequest[]);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'personal_requests'));

    // Packages
    const qPackages = query(collection(db, 'packages'), orderBy('createdAt', 'desc'));
    const unsubscribePackages = onSnapshot(qPackages, (snapshot) => {
      setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Package[]);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'packages'));

    // Social Links
    const qSocial = query(collection(db, 'social_links'));
    const unsubscribeSocial = onSnapshot(qSocial, (snapshot) => {
      setSocialLinks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SocialLink[]);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'social_links');
    });

    // Users
    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users');
      setLoading(false);
    });

    return () => {
      unsubscribePasses();
      unsubscribeBookings();
      unsubscribeRequests();
      unsubscribePackages();
      unsubscribeSocial();
      unsubscribeUsers();
    };
  }, [isAdmin]);

  const handleUpdateStatus = async (id: string, collectionName: string, newStatus: string) => {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;
      
      const oldData = docSnap.data();
      const oldStatus = oldData.status;

      // Award points if status changed to completed
      if (newStatus === 'completed' && oldStatus !== 'completed') {
        if (oldData.userId) {
          try {
            // Award 1 loyalty point per completed trip
            await updateDoc(doc(db, 'users', oldData.userId), {
              loyaltyPoints: increment(1)
            });
            
            // Send a notification about the points
            await addDoc(collection(db, 'notifications'), {
              userId: oldData.userId,
              message: `Congratulations! You've earned 1 loyalty point for completing your trip to ${oldData.destination}.`,
              type: 'payment_confirmed',
              read: false,
              createdAt: serverTimestamp()
            });
            
            console.log(`Successfully awarded 1 loyalty point to user ${oldData.userId}`);
          } catch (pointErr) {
            console.error('Error awarding loyalty point:', pointErr);
            // We don't throw here to allow the status update to proceed
          }
        }

        // Also mark boarding pass as used
        const q = query(collection(db, 'boarding_passes'), where('bookingId', '==', id));
        const snapshot = await getDocs(q);
        for (const passDoc of snapshot.docs) {
          await updateDoc(doc(db, 'boarding_passes', passDoc.id), { status: 'used' });
        }
      }

      await updateDoc(docRef, { status: newStatus });
      
      // If status is set to 'cancelled', also cancel the boarding pass
      if (newStatus === 'cancelled') {
        const q = query(collection(db, 'boarding_passes'), where('bookingId', '==', id));
        const snapshot = await getDocs(q);
        for (const passDoc of snapshot.docs) {
          await updateDoc(doc(db, 'boarding_passes', passDoc.id), { status: 'cancelled' });
        }
      }

      // If status is set to 'paid' or 'accepted', check if a boarding pass exists
      if (['paid', 'accepted'].includes(newStatus) && !['paid', 'accepted'].includes(oldStatus)) {
        const q = query(collection(db, 'boarding_passes'), where('bookingId', '==', id));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          // Fetch the booking/request details
          const docSnap = await getDoc(doc(db, collectionName, id));
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Calculate a default expiry date (e.g., 7 days after the travel date)
            // If data.date is a string like "2026-04-15", we can parse it
            let expiryDate = '';
            if (data.date) {
              try {
                const travelDate = new Date(data.date);
                const expiry = new Date(travelDate);
                expiry.setDate(expiry.getDate() + 7);
                expiryDate = expiry.toISOString().split('T')[0];
              } catch (e) {
                // Fallback to 30 days from now if date parsing fails
                const now = new Date();
                now.setDate(now.getDate() + 30);
                expiryDate = now.toISOString().split('T')[0];
              }
            }

            // Create Boarding Pass automatically
            await addDoc(collection(db, 'boarding_passes'), {
              bookingId: id,
              userId: data.userId,
              passengerName: data.fullName || data.passengerName || 'Passenger',
              destination: data.destination,
              date: data.date,
              expiryDate: expiryDate,
              seatNumber: `${Math.floor(Math.random() * 30) + 1}${['A', 'B', 'C', 'D', 'E', 'F'][Math.floor(Math.random() * 6)]}`,
              gate: `G-${Math.floor(Math.random() * 50) + 1}`,
              class: 'Premium Economy',
              status: 'active',
              createdAt: serverTimestamp()
            });

            // Send a notification that the boarding pass is ready
            if (data.userId) {
              await addDoc(collection(db, 'notifications'), {
                userId: data.userId,
                message: `Great news! Your trip to ${data.destination} has been ${newStatus}. Your boarding pass is now available in your dashboard.`,
                type: 'payment_confirmed',
                read: false,
                createdAt: serverTimestamp()
              });
            }
          }
        } else {
          // If pass exists but was cancelled, reactivate it
          snapshot.forEach(async (passDoc) => {
            if (passDoc.data().status === 'cancelled') {
              await updateDoc(doc(db, 'boarding_passes', passDoc.id), { status: 'active' });
            }
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, itemToDelete.type, itemToDelete.id));
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${itemToDelete.type}/${itemToDelete.id}`);
    }
  };

  const handleUpdatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPass) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'boarding_passes', editingPass.id), {
        passengerName: editingPass.passengerName,
        destination: editingPass.destination,
        date: editingPass.date,
        expiryDate: editingPass.expiryDate || '',
        gate: editingPass.gate,
        seatNumber: editingPass.seatNumber,
        class: editingPass.class,
        status: editingPass.status
      });
      setEditingPass(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `boarding_passes/${editingPass.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    setIsSaving(true);
    try {
      const bookingRef = doc(db, 'bookings', editingBooking.id);
      const oldDoc = await getDoc(bookingRef);
      const oldStatus = oldDoc.exists() ? oldDoc.data().status : '';
      
      await updateDoc(bookingRef, {
        fullName: editingBooking.fullName,
        email: editingBooking.email || '',
        passportNumber: editingBooking.passportNumber || '',
        destination: editingBooking.destination,
        date: editingBooking.date,
        status: editingBooking.status,
        price: editingBooking.price || 0,
        paymentAmount: editingBooking.paymentAmount || ""
      });

      // Award points if status changed to completed
      if (editingBooking.status === 'completed' && oldStatus !== 'completed') {
        const data = oldDoc.data();
        if (data && data.userId) {
          try {
            await updateDoc(doc(db, 'users', data.userId), {
              loyaltyPoints: increment(1)
            });
            
            await addDoc(collection(db, 'notifications'), {
              userId: data.userId,
              message: `Congratulations! You've earned 1 loyalty point for completing your trip to ${data.destination}.`,
              type: 'payment_confirmed',
              read: false,
              createdAt: serverTimestamp()
            });
            console.log(`Successfully awarded 1 loyalty point to user ${data.userId} via edit modal`);
          } catch (pointErr) {
            console.error('Error awarding loyalty point via edit modal:', pointErr);
          }
        }
        
        // Also mark boarding pass as used
        const q = query(collection(db, 'boarding_passes'), where('bookingId', '==', editingBooking.id));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (passDoc) => {
          await updateDoc(doc(db, 'boarding_passes', passDoc.id), { status: 'used' });
        });
      }

      setEditingBooking(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `bookings/${editingBooking.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;
    setIsSaving(true);
    try {
      const requestRef = doc(db, 'personal_requests', editingRequest.id);
      const oldDoc = await getDoc(requestRef);
      const oldStatus = oldDoc.exists() ? oldDoc.data().status : '';

      await updateDoc(requestRef, {
        fullName: editingRequest.fullName,
        email: editingRequest.email || '',
        passportNumber: editingRequest.passportNumber || '',
        destination: editingRequest.destination,
        date: editingRequest.date,
        status: editingRequest.status,
        price: editingRequest.price || 0,
        paymentAmount: editingRequest.paymentAmount || ""
      });

      // Award points if status changed to completed
      if (editingRequest.status === 'completed' && oldStatus !== 'completed') {
        const data = oldDoc.data();
        if (data && data.userId) {
          try {
            await updateDoc(doc(db, 'users', data.userId), {
              loyaltyPoints: increment(1)
            });
            
            await addDoc(collection(db, 'notifications'), {
              userId: data.userId,
              message: `Congratulations! You've earned 1 loyalty point for completing your trip to ${data.destination}.`,
              type: 'payment_confirmed',
              read: false,
              createdAt: serverTimestamp()
            });
            console.log(`Successfully awarded 1 loyalty point to user ${data.userId} via request edit modal`);
          } catch (pointErr) {
            console.error('Error awarding loyalty point via request edit modal:', pointErr);
          }
        }

        // Also mark boarding pass as used
        const q = query(collection(db, 'boarding_passes'), where('bookingId', '==', editingRequest.id));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (passDoc) => {
          await updateDoc(doc(db, 'boarding_passes', passDoc.id), { status: 'used' });
        });
      }

      setEditingRequest(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `personal_requests/${editingRequest.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'packages', editingPackage.id), {
        title: editingPackage.title,
        arrival: editingPackage.arrival,
        departure: editingPackage.departure,
        price: Number(editingPackage.price),
        duration: editingPackage.duration,
        image: editingPackage.image,
        status: editingPackage.status || 'active',
        rating: Number(editingPackage.rating),
        description: editingPackage.description || '',
        inclusions: editingPackage.inclusions || []
      });
      setEditingPackage(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `packages/${editingPackage.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      await addDoc(collection(db, 'packages'), {
        title: formData.get('title'),
        arrival: formData.get('arrival'),
        departure: formData.get('departure'),
        price: Number(formData.get('price')),
        duration: formData.get('duration'),
        image: formData.get('image'),
        status: 'active',
        rating: Number(formData.get('rating')),
        description: formData.get('description'),
        inclusions: formData.get('inclusions')?.toString().split(',').map(s => s.trim()) || [],
        createdAt: serverTimestamp()
      });
      setShowAddPackage(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'packages');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSocialLink) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'social_links', editingSocialLink.id), {
        platform: editingSocialLink.platform,
        url: editingSocialLink.url,
        active: editingSocialLink.active
      });
      setEditingSocialLink(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `social_links/${editingSocialLink.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        loyaltyPoints: Number(editingUser.loyaltyPoints)
      });
      setEditingUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${editingUser.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncPoints = async (userId: string) => {
    try {
      setIsSaving(true);
      // Fetch all completed bookings for this user
      const qBookings = query(
        collection(db, 'bookings'), 
        where('userId', '==', userId), 
        where('status', '==', 'completed')
      );
      const bookingsSnap = await getDocs(qBookings);
      
      // Fetch all completed requests for this user
      const qRequests = query(
        collection(db, 'personal_requests'), 
        where('userId', '==', userId), 
        where('status', '==', 'completed')
      );
      const requestsSnap = await getDocs(qRequests);
      
      const totalCompleted = bookingsSnap.size + requestsSnap.size;
      
      // Update user points
      await updateDoc(doc(db, 'users', userId), {
        loyaltyPoints: totalCompleted
      });
      
      alert(`Synced! User now has ${totalCompleted} loyalty points based on their trip history.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/sync`);
      alert('Failed to sync points.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedSocialLinks = async () => {
    setIsSaving(true);
    const defaults = [
      { platform: 'Facebook', url: 'https://facebook.com', active: true },
      { platform: 'Gmail', url: 'mailto:contact@skywink.com', active: true },
      { platform: 'Apple', url: 'https://apple.com', active: true },
      { platform: 'YouTube', url: 'https://youtube.com', active: true },
      { platform: 'Instagram', url: 'https://instagram.com', active: true },
      { platform: 'X', url: 'https://x.com', active: true },
    ];

    try {
      for (const link of defaults) {
        const q = query(collection(db, 'social_links'), where('platform', '==', link.platform));
        const snap = await getDocs(q);
        if (snap.empty) {
          await addDoc(collection(db, 'social_links'), link);
        }
      }
      alert('Default social links seeded successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'social_links/seed');
      alert('Failed to seed social links.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      await addDoc(collection(db, 'social_links'), {
        platform: formData.get('platform'),
        url: formData.get('url'),
        active: true
      });
      setShowAddSocial(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'social_links');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = () => {
    if (activeTab === 'passes') {
      return passes.filter(p => 
        (p.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) || p.destination.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterStatus === 'all' || p.status === filterStatus)
      );
    } else if (activeTab === 'bookings') {
      return bookings.filter(b => 
        (b.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || b.destination.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterStatus === 'all' || b.status === filterStatus)
      );
    } else if (activeTab === 'requests') {
      return requests.filter(r => 
        (r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || r.destination.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterStatus === 'all' || r.status === filterStatus)
      );
    } else if (activeTab === 'packages') {
      return packages.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else if (activeTab === 'social') {
      return socialLinks.filter(s => 
        s.platform.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      return users.filter(u => 
        (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#7371ff]/20 border-t-[#7371ff] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white selection:bg-[#7371ff] selection:text-white">
      <Navbar />
      
      <div className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#7371ff]/10 rounded-xl flex items-center justify-center border border-[#7371ff]/20">
                <ShieldCheck className="w-6 h-6 text-[#7371ff]" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter uppercase">Admin Panel</h1>
            </div>
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Manage and edit all boarding passes</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 bg-[#7371ff]/5 border border-[#7371ff]/20 px-6 py-4 rounded-3xl">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#7371ff]/60">Total Revenue</p>
                <p className="text-2xl font-black text-white">${revenue.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-[#7371ff]/10 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#7371ff]" />
              </div>
            </div>

            <div className="flex flex-wrap bg-white/5 p-1 rounded-2xl border border-white/10">
              <button 
                onClick={() => setActiveTab('passes')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'passes' ? 'bg-[#7371ff] text-white' : 'text-white/40 hover:text-white'}`}
              >
                Passes
              </button>
              <button 
                onClick={() => setActiveTab('bookings')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'bookings' ? 'bg-[#7371ff] text-white' : 'text-white/40 hover:text-white'}`}
              >
                Bookings
              </button>
              <button 
                onClick={() => setActiveTab('requests')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-[#7371ff] text-white' : 'text-white/40 hover:text-white'}`}
              >
                Requests
              </button>
              <button 
                onClick={() => setActiveTab('packages')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'packages' ? 'bg-[#7371ff] text-white' : 'text-white/40 hover:text-white'}`}
              >
                Packages
              </button>
              <button 
                onClick={() => setActiveTab('social')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'social' ? 'bg-[#7371ff] text-white' : 'text-white/40 hover:text-white'}`}
              >
                Social
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-[#7371ff] text-white' : 'text-white/40 hover:text-white'}`}
              >
                Users
              </button>
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[#7371ff] transition-colors" />
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`}
                className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <Filter className="w-4 h-4 text-white/20" />
              <select 
                className="bg-transparent outline-none text-sm font-bold uppercase tracking-widest cursor-pointer"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all" className="bg-slate-900">All Status</option>
                {activeTab === 'passes' ? (
                  <>
                    <option value="active" className="bg-slate-900">Active</option>
                    <option value="used" className="bg-slate-900">Used</option>
                    <option value="cancelled" className="bg-slate-900">Cancelled</option>
                  </>
                ) : (
                  <>
                    <option value="pending" className="bg-slate-900">Pending</option>
                    <option value="paid" className="bg-slate-900">Paid</option>
                    <option value="accepted" className="bg-slate-900">Accepted</option>
                    <option value="completed" className="bg-slate-900">Completed</option>
                    <option value="cancelled" className="bg-slate-900">Cancelled</option>
                  </>
                )}
              </select>
            </div>

            {activeTab === 'packages' && (
              <button 
                onClick={() => setShowAddPackage(true)}
                className="bg-[#7371ff] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[#7371ff]/20 hover:scale-105 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add Package
              </button>
            )}

            {activeTab === 'social' && (
              <div className="flex gap-2">
                <button 
                  onClick={handleSeedSocialLinks}
                  disabled={isSaving}
                  className="bg-white/5 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Activity className="w-4 h-4" /> Seed Defaults
                </button>
                <button 
                  onClick={() => setShowAddSocial(true)}
                  className="bg-[#7371ff] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[#7371ff]/20 hover:scale-105 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Add Social Link
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredData().map((item: any) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-6 hover:bg-white/[0.07] transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#7371ff]/10 flex items-center justify-center border border-[#7371ff]/20">
                      {activeTab === 'passes' ? <Plane className="w-5 h-5 text-[#7371ff]" /> : 
                       activeTab === 'packages' ? <PackageIcon className="w-5 h-5 text-[#7371ff]" /> :
                       activeTab === 'social' ? <Globe className="w-5 h-5 text-[#7371ff]" /> :
                       <User className="w-5 h-5 text-[#7371ff]" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                        {activeTab === 'passes' ? 'Booking ID' : 
                         activeTab === 'packages' ? 'Package ID' :
                         activeTab === 'social' ? 'Platform' :
                         'Booking ID'}
                      </p>
                      <p className="font-mono font-bold text-xs uppercase truncate max-w-[120px]">
                        {activeTab === 'passes' ? item.bookingId : 
                         activeTab === 'packages' ? item.id :
                         activeTab === 'social' ? item.platform :
                         item.id}
                      </p>
                    </div>
                  </div>
                  {activeTab !== 'packages' && activeTab !== 'social' && (
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      ['active', 'accepted', 'completed'].includes(item.status) ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      item.status === 'paid' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      item.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {item.status}
                    </div>
                  )}
                  {activeTab === 'social' && (
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      item.active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {item.active ? 'Active' : 'Inactive'}
                    </div>
                  )}
                </div>

                {activeTab === 'packages' ? (
                  <div className="space-y-4">
                    <div className="aspect-video rounded-2xl overflow-hidden border border-white/10">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Title</p>
                        <p className="font-bold text-sm truncate">{item.title}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Price</p>
                        <p className="font-bold text-sm">${item.price}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Duration</p>
                        <p className="font-bold text-sm">{item.duration}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Rating</p>
                        <p className="font-bold text-sm flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {item.rating}</p>
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'social' ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">URL</p>
                      <p className="font-bold text-sm truncate text-[#7371ff]">{item.url}</p>
                    </div>
                  </div>
                ) : activeTab === 'users' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                        <User className="w-3 h-3" /> Display Name
                      </p>
                      <p className="font-bold text-sm truncate">{item.displayName || 'Traveler'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                        <Star className="w-3 h-3" /> Loyalty Points
                      </p>
                      <p className="font-bold text-sm text-[#7371ff]">{item.loyaltyPoints || 0} PTS</p>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> Email
                      </p>
                      <p className="font-bold text-sm truncate">{item.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                        <User className="w-3 h-3" /> {activeTab === 'passes' ? 'Passenger' : 'Full Name'}
                      </p>
                      <p className="font-bold text-sm truncate">{activeTab === 'passes' ? item.passengerName : item.fullName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> Destination
                      </p>
                      <p className="font-bold text-sm truncate">{item.destination}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> Date
                      </p>
                      <p className="font-bold text-sm">{item.date}</p>
                    </div>
                    <div className="space-y-1 col-span-2 p-3 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                          <DollarSign className="w-3 h-3 text-[#7371ff]" /> Amount/Price
                        </p>
                        <p className="font-black text-[#7371ff] text-base">{item.packagePrice || (item.price ? `$${item.price}` : 'TBD')}</p>
                      </div>
                    </div>
                    {activeTab === 'passes' && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> Gate/Seat
                        </p>
                        <p className="font-bold text-sm">{item.gate} / {item.seatNumber}</p>
                      </div>
                    )}
                    {item.paymentMethod && (
                      <div className="space-y-3 col-span-2 p-3 bg-[#7371ff]/5 rounded-2xl border border-[#7371ff]/10">
                        <div className="flex justify-between items-start">
                          <p className="text-[10px] font-black text-[#7371ff] uppercase tracking-widest flex items-center gap-1.5">
                            <ShieldCheck className="w-3 h-3" /> Payment Verified
                          </p>
                          {item.paymentAmount && (
                            <p className="text-sm font-black text-white">{item.paymentAmount}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardIcon brand={item.paymentMethod.brand} className="h-3 opacity-80" />
                            <p className="text-xs font-bold text-white/80 uppercase tracking-widest leading-none">
                              {item.paymentMethod.brand} •••• {item.paymentMethod.last4}
                            </p>
                          </div>
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-tighter">
                            {item.paymentAt?.toDate()?.toLocaleString() || 'Refreshed'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-6 border-t border-white/5 flex flex-wrap items-center gap-3">
                  {activeTab === 'passes' ? (
                    <button 
                      onClick={() => setEditingPass(item)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-white/10"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Pass
                    </button>
                  ) : activeTab === 'packages' ? (
                    <button 
                      onClick={() => setEditingPackage(item)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-white/10"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Package
                    </button>
                  ) : activeTab === 'social' ? (
                    <button 
                      onClick={() => setEditingSocialLink(item)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-white/10"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Link
                    </button>
                  ) : activeTab === 'users' ? (
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <button 
                        onClick={() => setEditingUser(item)}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-white/10"
                      >
                        <Edit3 className="w-3 h-3" /> Edit Points
                      </button>
                      <button 
                        onClick={() => handleSyncPoints(item.id)}
                        disabled={isSaving}
                        className="flex-1 py-3 bg-[#7371ff]/10 hover:bg-[#7371ff] text-[#7371ff] hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-[#7371ff]/20 disabled:opacity-50"
                      >
                        <Activity className="w-3 h-3" /> Sync Points
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <button 
                        onClick={() => activeTab === 'bookings' ? setEditingBooking(item) : setEditingRequest(item)}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-white/10"
                      >
                        <Edit3 className="w-3 h-3" /> Edit {activeTab === 'bookings' ? 'Booking' : 'Request'}
                      </button>
                      <select 
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-[#7371ff] min-w-[120px]"
                        value={item.status}
                        onChange={(e) => handleUpdateStatus(item.id, activeTab === 'bookings' ? 'bookings' : 'personal_requests', e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="paynow">Pay Now</option>
                        <option value="paid">Paid</option>
                        <option value="accepted">Accepted</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  )}
                  <button 
                    onClick={() => setItemToDelete({
                      id: item.id, 
                      type: activeTab === 'passes' ? 'boarding_passes' : 
                            activeTab === 'bookings' ? 'bookings' : 
                            activeTab === 'requests' ? 'personal_requests' : 
                            activeTab === 'packages' ? 'packages' : 'social_links'
                    })}
                    className="w-10 h-10 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all flex items-center justify-center border border-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredData().length === 0 && (
          <div className="py-20 text-center space-y-4">
            <Plane className="w-16 h-16 text-white/5 mx-auto" />
            <p className="text-white/20 font-black uppercase tracking-widest">No {activeTab} found</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToDelete(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl p-8 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-[32px] flex items-center justify-center mx-auto border border-red-500/20">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">Delete Item?</h3>
                <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] leading-relaxed">
                  This action is permanent and cannot be undone.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setItemToDelete(null);
                    navigate('/home');
                  }}
                  className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteItem}
                  className="flex-1 py-5 bg-red-500 hover:bg-red-600 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-red-500/20"
                >
                  Delete Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Booking Modal */}
      <AnimatePresence>
        {editingBooking && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingBooking(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#7371ff]/10 rounded-xl flex items-center justify-center border border-[#7371ff]/20">
                    <Edit3 className="w-5 h-5 text-[#7371ff]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Edit Booking</h3>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">ID: {editingBooking.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setEditingBooking(null);
                    navigate('/home');
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateBooking} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Full Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingBooking.fullName}
                      onChange={(e) => setEditingBooking({...editingBooking, fullName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Gmail</label>
                    <input 
                      type="email" 
                      required
                      pattern=".+@gmail\.com"
                      title="Please enter a valid Gmail address (e.g., user@gmail.com)"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingBooking.email || ''}
                      onChange={(e) => setEditingBooking({...editingBooking, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Passport Number</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingBooking.passportNumber || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setEditingBooking({...editingBooking, passportNumber: value});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Destination</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingBooking.destination}
                      onChange={(e) => setEditingBooking({...editingBooking, destination: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingBooking.date}
                      onChange={(e) => setEditingBooking({...editingBooking, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Status</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingBooking.status}
                      onChange={(e) => setEditingBooking({...editingBooking, status: e.target.value as any})}
                    >
                      <option value="pending" className="bg-slate-900">Pending</option>
                      <option value="paynow" className="bg-slate-900">Pay Now</option>
                      <option value="paid" className="bg-slate-900">Paid</option>
                      <option value="accepted" className="bg-slate-900">Accepted</option>
                      <option value="completed" className="bg-slate-900">Completed</option>
                      <option value="cancelled" className="bg-slate-900">Cancelled</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Price ($)</label>
                    <input 
                      type="number" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingBooking.price || ''}
                      onChange={(e) => setEditingBooking({...editingBooking, price: Number(e.target.value)})}
                      placeholder="Enter price..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Paid Amount</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingBooking.paymentAmount || ''}
                      onChange={(e) => setEditingBooking({...editingBooking, paymentAmount: e.target.value})}
                      placeholder="e.g. $12,000.00"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBooking(null);
                      navigate('/home');
                    }}
                    className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-5 bg-[#7371ff] hover:bg-[#6361ff] rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-[#7371ff]/20 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Request Modal */}
      <AnimatePresence>
        {editingRequest && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingRequest(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#7371ff]/10 rounded-xl flex items-center justify-center border border-[#7371ff]/20">
                    <Edit3 className="w-5 h-5 text-[#7371ff]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Edit Personal Request</h3>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">ID: {editingRequest.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setEditingRequest(null);
                    navigate('/home');
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateRequest} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Full Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingRequest.fullName}
                      onChange={(e) => setEditingRequest({...editingRequest, fullName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Gmail</label>
                    <input 
                      type="email" 
                      required
                      pattern=".+@gmail\.com"
                      title="Please enter a valid Gmail address (e.g., user@gmail.com)"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingRequest.email || ''}
                      onChange={(e) => setEditingRequest({...editingRequest, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Passport Number</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingRequest.passportNumber || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setEditingRequest({...editingRequest, passportNumber: value});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Destination</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingRequest.destination}
                      onChange={(e) => setEditingRequest({...editingRequest, destination: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingRequest.date}
                      onChange={(e) => setEditingRequest({...editingRequest, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Price ($)</label>
                    <input 
                      type="number" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingRequest.price || ''}
                      onChange={(e) => setEditingRequest({...editingRequest, price: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Paid Amount</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingRequest.paymentAmount || ''}
                      onChange={(e) => setEditingRequest({...editingRequest, paymentAmount: e.target.value})}
                      placeholder="e.g. $12,000.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Status</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingRequest.status}
                      onChange={(e) => setEditingRequest({...editingRequest, status: e.target.value as any})}
                    >
                      <option value="pending" className="bg-slate-900">Pending</option>
                      <option value="paynow" className="bg-slate-900">Pay Now</option>
                      <option value="paid" className="bg-slate-900">Paid</option>
                      <option value="accepted" className="bg-slate-900">Accepted</option>
                      <option value="completed" className="bg-slate-900">Completed</option>
                      <option value="cancelled" className="bg-slate-900">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRequest(null);
                      navigate('/home');
                    }}
                    className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-5 bg-[#7371ff] hover:bg-[#6361ff] rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-[#7371ff]/20 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Pass Modal */}
      <AnimatePresence>
        {editingPass && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPass(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#7371ff]/10 rounded-xl flex items-center justify-center border border-[#7371ff]/20">
                    <Edit3 className="w-5 h-5 text-[#7371ff]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Edit Boarding Pass</h3>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">ID: {editingPass.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setEditingPass(null);
                    navigate('/home');
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdatePass} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Passenger Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingPass.passengerName}
                      onChange={(e) => setEditingPass({...editingPass, passengerName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Destination</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingPass.destination}
                      onChange={(e) => setEditingPass({...editingPass, destination: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Travel Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingPass.date}
                      onChange={(e) => setEditingPass({...editingPass, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Expiry Date</label>
                    <input 
                      type="date" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingPass.expiryDate || ''}
                      onChange={(e) => setEditingPass({...editingPass, expiryDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Gate</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingPass.gate}
                      onChange={(e) => setEditingPass({...editingPass, gate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Seat Number</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingPass.seatNumber}
                      onChange={(e) => setEditingPass({...editingPass, seatNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Class</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingPass.class}
                      onChange={(e) => setEditingPass({...editingPass, class: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Status</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={editingPass.status}
                      onChange={(e) => setEditingPass({...editingPass, status: e.target.value as any})}
                    >
                      <option value="active" className="bg-slate-900">Active</option>
                      <option value="used" className="bg-slate-900">Used</option>
                      <option value="cancelled" className="bg-slate-900">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPass(null);
                      navigate('/home');
                    }}
                    className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-5 bg-[#7371ff] hover:bg-[#6361ff] rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-[#7371ff]/20 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Package Modal */}
      <AnimatePresence>
        {showAddPackage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddPackage(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#7371ff]/10 rounded-xl flex items-center justify-center border border-[#7371ff]/20">
                    <Plus className="w-5 h-5 text-[#7371ff]" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Add New Package</h3>
                </div>
                <button 
                  onClick={() => {
                    setShowAddPackage(false);
                    navigate('/home');
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddPackage} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Title</label>
                    <input name="title" type="text" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Price ($)</label>
                    <input name="price" type="number" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Arrival</label>
                    <input name="arrival" type="text" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Departure</label>
                    <input name="departure" type="text" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Duration</label>
                    <input name="duration" type="text" required placeholder="e.g. 7 Days, 6 Nights" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Rating (1-5)</label>
                    <input name="rating" type="number" step="0.1" min="1" max="5" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Image URL</label>
                  <input name="image" type="url" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Description</label>
                  <textarea name="description" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all h-32 resize-none"></textarea>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Inclusions (comma separated)</label>
                  <input name="inclusions" type="text" placeholder="Flight, Hotel, Breakfast" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => {
                    setShowAddPackage(false);
                    navigate('/home');
                  }} className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all">Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-[#7371ff] hover:bg-[#6361ff] rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-[#7371ff]/20 flex items-center justify-center gap-2 disabled:opacity-70">
                    {isSaving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Package
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Package Modal */}
      <AnimatePresence>
        {editingPackage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPackage(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#7371ff]/10 rounded-xl flex items-center justify-center border border-[#7371ff]/20">
                    <Edit3 className="w-5 h-5 text-[#7371ff]" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Edit Package</h3>
                </div>
                <button 
                  onClick={() => {
                    setEditingPackage(null);
                    navigate('/home');
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdatePackage} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Title</label>
                    <input type="text" required value={editingPackage.title} onChange={(e) => setEditingPackage({...editingPackage, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Price ($)</label>
                    <input type="number" required value={editingPackage.price} onChange={(e) => setEditingPackage({...editingPackage, price: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Arrival</label>
                    <input type="text" required value={editingPackage.arrival} onChange={(e) => setEditingPackage({...editingPackage, arrival: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Departure</label>
                    <input type="text" required value={editingPackage.departure} onChange={(e) => setEditingPackage({...editingPackage, departure: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Duration</label>
                    <input type="text" required value={editingPackage.duration} onChange={(e) => setEditingPackage({...editingPackage, duration: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Rating</label>
                    <input type="number" step="0.1" required value={editingPackage.rating} onChange={(e) => setEditingPackage({...editingPackage, rating: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Image URL</label>
                  <input type="url" required value={editingPackage.image} onChange={(e) => setEditingPackage({...editingPackage, image: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Description</label>
                  <textarea value={editingPackage.description} onChange={(e) => setEditingPackage({...editingPackage, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all h-32 resize-none"></textarea>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Inclusions (comma separated)</label>
                  <input type="text" value={editingPackage.inclusions?.join(', ')} onChange={(e) => setEditingPackage({...editingPackage, inclusions: e.target.value.split(',').map(s => s.trim())})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Status</label>
                  <select 
                    value={editingPackage.status || 'active'} 
                    onChange={(e) => setEditingPackage({...editingPackage, status: e.target.value as 'active' | 'inactive'})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all appearance-none"
                  >
                    <option value="active" className="bg-slate-900">Active</option>
                    <option value="inactive" className="bg-slate-900">Inactive</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => {
                    setEditingPackage(null);
                    navigate('/home');
                  }} className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all">Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-[#7371ff] hover:bg-[#6361ff] rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-[#7371ff]/20 flex items-center justify-center gap-2 disabled:opacity-70">
                    {isSaving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Social Modal */}
      <AnimatePresence>
        {showAddSocial && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddSocial(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#7371ff]/10 rounded-xl flex items-center justify-center border border-[#7371ff]/20">
                    <Plus className="w-5 h-5 text-[#7371ff]" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Add Social Link</h3>
                </div>
                <button 
                  onClick={() => {
                    setShowAddSocial(false);
                    navigate('/home');
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSocialLink} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Platform</label>
                  <select name="platform" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all">
                    <option value="Facebook" className="bg-slate-900">Facebook</option>
                    <option value="Twitter" className="bg-slate-900">Twitter</option>
                    <option value="X" className="bg-slate-900">X</option>
                    <option value="Instagram" className="bg-slate-900">Instagram</option>
                    <option value="Youtube" className="bg-slate-900">YouTube</option>
                    <option value="Gmail" className="bg-slate-900">Gmail</option>
                    <option value="Apple" className="bg-slate-900">Apple</option>
                    <option value="Linkedin" className="bg-slate-900">LinkedIn</option>
                    <option value="Github" className="bg-slate-900">GitHub</option>
                    <option value="Website" className="bg-slate-900">Website</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">URL</label>
                  <input name="url" type="url" required placeholder="https://..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => {
                    setShowAddSocial(false);
                    navigate('/home');
                  }} className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all">Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-[#7371ff] hover:bg-[#6361ff] rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-[#7371ff]/20 flex items-center justify-center gap-2 disabled:opacity-70">
                    {isSaving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Link
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Social Modal */}
      <AnimatePresence>
        {editingSocialLink && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingSocialLink(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#7371ff]/10 rounded-xl flex items-center justify-center border border-[#7371ff]/20">
                    <Edit3 className="w-5 h-5 text-[#7371ff]" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Edit Social Link</h3>
                </div>
                <button 
                  onClick={() => {
                    setEditingSocialLink(null);
                    navigate('/home');
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateSocialLink} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Platform</label>
                  <select value={editingSocialLink.platform} onChange={(e) => setEditingSocialLink({...editingSocialLink, platform: e.target.value})} required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all">
                    <option value="Facebook" className="bg-slate-900">Facebook</option>
                    <option value="Twitter" className="bg-slate-900">Twitter</option>
                    <option value="X" className="bg-slate-900">X</option>
                    <option value="Instagram" className="bg-slate-900">Instagram</option>
                    <option value="Youtube" className="bg-slate-900">YouTube</option>
                    <option value="Gmail" className="bg-slate-900">Gmail</option>
                    <option value="Apple" className="bg-slate-900">Apple</option>
                    <option value="Linkedin" className="bg-slate-900">LinkedIn</option>
                    <option value="Github" className="bg-slate-900">GitHub</option>
                    <option value="Website" className="bg-slate-900">Website</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">URL</label>
                  <input type="url" required value={editingSocialLink.url} onChange={(e) => setEditingSocialLink({...editingSocialLink, url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" />
                </div>
                <div className="flex items-center gap-3 ml-2">
                  <input type="checkbox" id="active" checked={editingSocialLink.active} onChange={(e) => setEditingSocialLink({...editingSocialLink, active: e.target.checked})} className="w-4 h-4 rounded bg-white/5 border-white/10 text-[#7371ff] focus:ring-[#7371ff]" />
                  <label htmlFor="active" className="text-[10px] font-black uppercase tracking-widest text-white/60">Active</label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => {
                    setEditingSocialLink(null);
                    navigate('/home');
                  }} className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all">Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-[#7371ff] hover:bg-[#6361ff] rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-[#7371ff]/20 flex items-center justify-center gap-2 disabled:opacity-70">
                    {isSaving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#7371ff]/10 rounded-xl flex items-center justify-center border border-[#7371ff]/20">
                    <Star className="w-5 h-5 text-[#7371ff]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Edit User Points</h3>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest truncate max-w-[200px]">{editingUser.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingUser(null)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Loyalty Points</label>
                  <input 
                    type="number" 
                    required 
                    value={editingUser.loyaltyPoints || 0} 
                    onChange={(e) => setEditingUser({...editingUser, loyaltyPoints: Number(e.target.value)})} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all" 
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all">Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-[#7371ff] hover:bg-[#6361ff] rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-[#7371ff]/20 flex items-center justify-center gap-2 disabled:opacity-70">
                    {isSaving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
