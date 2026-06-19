import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  MapPin, 
  Calendar, 
  Users, 
  Plane, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText,
  Phone,
  Home as HomeIcon,
  ShieldAlert,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { CardIcon } from '../components/CardIcon';

interface Booking {
  id: string;
  userId: string;
  userEmail: string;
  fullName: string;
  email: string;
  destination: string;
  people: string;
  date: string;
  path: string;
  status: 'pending' | 'paynow' | 'accepted' | 'paid' | 'completed' | 'cancelled';
  createdAt: any;
  paymentAmount?: string;
  paymentMethod?: {
    brand: string;
    last4: string;
  };
  price?: number;
  passportNumber?: string;
  // Additional fields from the booking form
  address?: string;
  phone?: string;
  emergencyFirstName?: string;
  emergencyLastName?: string;
  emergencyEmail?: string;
  emergencyPhone?: string;
  bagCount?: number;
}

export default function BookingDetails() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate('/signin');
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    if (!user || !bookingId) return;

    setLoading(true);

    const fetchInitialBooking = async () => {
      try {
        // Try bookings collection first
        let docRef = doc(db, 'bookings', bookingId);
        let docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as Booking;
          if (data.userId !== user.uid) {
            navigate('/dashboard');
            return;
          }
          setBooking({ id: docSnap.id, ...data });
        } else {
          // Try personal_requests collection
          docRef = doc(db, 'personal_requests', bookingId);
          docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Booking;
            if (data.userId !== user.uid) {
              navigate('/dashboard');
              return;
            }
            setBooking({ id: docSnap.id, ...data });
          } else {
            navigate('/dashboard');
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `booking_details/${bookingId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialBooking();
    
    // Real-time listeners
    const unsubscribeBookings = onSnapshot(doc(db, 'bookings', bookingId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Booking;
        if (data.userId === user.uid) {
          setBooking({ id: docSnap.id, ...data });
        }
      }
    });

    const unsubscribeRequests = onSnapshot(doc(db, 'personal_requests', bookingId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Booking;
        if (data.userId === user.uid) {
          setBooking({ id: docSnap.id, ...data });
        }
      }
    });

    return () => {
      unsubscribeBookings();
      unsubscribeRequests();
    };
  }, [bookingId, user, navigate]);

  const handleCancelBooking = async () => {
    if (!booking || !bookingId) return;

    setIsUpdating(true);
    const notificationsPath = 'notifications';
    try {
      // Check which collection the booking belongs to
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      const collectionName = bookingSnap.exists() ? 'bookings' : 'personal_requests';

      await updateDoc(doc(db, collectionName, bookingId), {
        status: 'cancelled'
      });

      // Also cancel associated boarding pass if it exists
      const q = query(collection(db, 'boarding_passes'), where('bookingId', '==', bookingId));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (passDoc) => {
        await updateDoc(doc(db, 'boarding_passes', passDoc.id), { status: 'cancelled' });
      });

      // Notify admin
      await addDoc(collection(db, notificationsPath), {
        userId: 'admin',
        message: `Booking for ${booking.destination} by ${booking.fullName} has been cancelled by the user.`,
        type: 'booking_cancelled',
        bookingId: bookingId,
        read: false,
        createdAt: serverTimestamp()
      });

      // Update local state and navigate
      setBooking(prev => prev ? { ...prev, status: 'cancelled' } : null);
      setShowCancelModal(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#7371ff]/20 border-t-[#7371ff] rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-[#121212] text-white selection:bg-[#7371ff] selection:text-white">
      <Navbar />
      
      <div className="pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white mb-8 transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold uppercase tracking-widest text-[10px]">Back to Previous</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a1a1a] rounded-[40px] overflow-hidden border border-white/5 shadow-2xl"
        >
          {/* Header Section */}
          <div className="p-8 md:p-12 border-b border-white/5 bg-gradient-to-br from-[#1a1a1a] to-[#222]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase ${
                    booking.status === 'accepted' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    booking.status === 'paid' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    booking.status === 'paynow' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                    booking.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    booking.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {booking.status === 'paynow' ? 'Ready for Payment' : booking.status}
                  </div>
                  <span className="text-white/20 text-[10px] font-black tracking-widest uppercase">ID: {booking.id}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-2">Booking Details</h1>
                <p className="text-white/40 font-bold tracking-widest uppercase text-xs">
                  Submitted on {booking.createdAt?.toDate().toLocaleDateString()} at {booking.createdAt?.toDate().toLocaleTimeString()}
                </p>
              </div>

              {['pending', 'paynow', 'accepted', 'paid'].includes(booking.status) && (
                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                  {(booking.status === 'paynow' || (booking.status === 'pending' && !booking.price)) && (
                    <button
                      onClick={() => navigate(`/payment/${booking.id}`)}
                      className="flex-1 md:flex-none px-10 py-5 bg-[#7371ff] hover:bg-[#6361ff] text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#7371ff]/20 uppercase tracking-widest"
                    >
                      <CreditCard className="w-6 h-6" /> PAY NOW
                    </button>
                  )}
                  {booking.status === 'pending' && booking.price && (
                    <div className="flex-1 md:flex-none px-10 py-5 bg-white/5 text-white/40 font-black rounded-2xl border border-white/10 flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]">
                      <Clock className="w-5 h-5" /> Under Review
                    </div>
                  )}
                  {['accepted', 'paid'].includes(booking.status) && (
                    <button
                      onClick={() => navigate(`/boarding-pass/${booking.id}`)}
                      className="flex-1 md:flex-none px-10 py-5 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-500/20 uppercase tracking-widest"
                    >
                      <Plane className="w-6 h-6" /> BOARDING PASS
                    </button>
                  )}
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex-1 md:flex-none px-8 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-black rounded-2xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                  >
                    <XCircle className="w-5 h-5" /> CANCEL BOOKING
                  </button>
                </div>
              )}

              {booking.status === 'completed' && (
                <button
                  onClick={() => navigate(`/boarding-pass/${booking.id}`)}
                  className="flex-1 md:flex-none px-10 py-5 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-500/20 uppercase tracking-widest"
                >
                  <Plane className="w-6 h-6" /> BOARDING PASS
                </button>
              )}
            </div>
          </div>

          <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left Column: Trip & Passenger Info */}
            <div className="space-y-12">
              {/* Trip Details */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#7371ff]">
                  <Plane className="w-6 h-6" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Trip Information</h3>
                </div>
                <div className="bg-white/5 rounded-3xl p-8 border border-white/5 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Destination</p>
                      <p className="text-2xl font-black">{booking.destination}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Travel Path</p>
                      <p className="text-lg font-bold text-white/60">{booking.path}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#7371ff]" />
                        <p className="font-bold">{booking.date}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Group Size</p>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#7371ff]" />
                        <p className="font-bold">{booking.people} People</p>
                      </div>
                    </div>
                  </div>
                  {booking.price && (
                    <div className="pt-6 border-t border-white/5">
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Total Price</p>
                      <p className="text-3xl font-black text-[#7371ff]">${booking.price}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Passenger Details */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#7371ff]">
                  <User className="w-6 h-6" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Passenger Details</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/5">
                    <div className="w-12 h-12 bg-[#7371ff]/10 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#7371ff]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Full Name</p>
                      <p className="font-bold text-lg">{booking.fullName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/5">
                    <div className="w-12 h-12 bg-[#7371ff]/10 rounded-xl flex items-center justify-center">
                      <Mail className="w-6 h-6 text-[#7371ff]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Email Address</p>
                      <p className="font-bold text-lg">{booking.email}</p>
                    </div>
                  </div>
                  {booking.passportNumber && (
                    <div className="flex items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/5">
                      <div className="w-12 h-12 bg-[#7371ff]/10 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-[#7371ff]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Passport Number</p>
                        <p className="font-bold text-lg">{booking.passportNumber}</p>
                      </div>
                    </div>
                  )}
                  {booking.phone && (
                    <div className="flex items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/5">
                      <div className="w-12 h-12 bg-[#7371ff]/10 rounded-xl flex items-center justify-center">
                        <Phone className="w-6 h-6 text-[#7371ff]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Phone Number</p>
                        <p className="font-bold text-lg">{booking.phone}</p>
                      </div>
                    </div>
                  )}
                  {booking.address && (
                    <div className="flex items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/5">
                      <div className="w-12 h-12 bg-[#7371ff]/10 rounded-xl flex items-center justify-center">
                        <HomeIcon className="w-6 h-6 text-[#7371ff]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Address</p>
                        <p className="font-bold text-lg">{booking.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Emergency & Luggage */}
            <div className="space-y-12">
              {/* Emergency Contact */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#7371ff]">
                  <ShieldAlert className="w-6 h-6" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Emergency Contact</h3>
                </div>
                <div className="bg-white/5 rounded-3xl p-8 border border-white/5 space-y-6">
                  {booking.emergencyFirstName ? (
                    <>
                      <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Contact Name</p>
                        <p className="text-xl font-black">{booking.emergencyFirstName} {booking.emergencyLastName}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Email</p>
                          <p className="font-bold text-white/60">{booking.emergencyEmail}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Phone</p>
                          <p className="font-bold text-white/60">{booking.emergencyPhone}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-white/20">
                      <AlertCircle className="w-12 h-12 mb-2 opacity-20" />
                      <p className="text-xs font-black uppercase tracking-widest">No emergency contact provided</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Luggage Information */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#7371ff]">
                  <Clock className="w-6 h-6" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Luggage & Status</h3>
                </div>
                <div className="bg-white/5 rounded-3xl p-8 border border-white/5 space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Checked Bags</p>
                      <p className="text-3xl font-black">{booking.bagCount || 0}</p>
                    </div>
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center">
                      <img 
                        src="https://i.postimg.cc/xjPtL67M/Group-16.png" 
                        alt="Luggage" 
                        className="w-10 h-auto opacity-40"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">Current Status</p>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${
                          booking.status === 'accepted' ? 'bg-green-500' :
                          booking.status === 'paid' ? 'bg-purple-500' :
                          booking.status === 'completed' ? 'bg-blue-500' :
                          booking.status === 'cancelled' ? 'bg-red-500' :
                          'bg-amber-500'
                        }`} />
                        <p className="font-black uppercase tracking-widest text-sm">
                          {booking.status === 'accepted' ? 'Confirmed & Ready' :
                           booking.status === 'paid' ? 'Payment Received' :
                           booking.status === 'completed' ? 'Journey Completed' :
                           booking.status === 'cancelled' ? 'Request Cancelled' :
                           'Awaiting Confirmation'}
                        </p>
                      </div>

                      {booking.paymentMethod && (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 group">
                            <CreditCard className="w-5 h-5 text-[#7371ff]" />
                            <div>
                              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Paid via</p>
                              <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                                {booking.paymentMethod.brand} •••• {booking.paymentMethod.last4}
                              </p>
                            </div>
                            <div className="ml-auto">
                              <CardIcon brand={booking.paymentMethod.brand} className="h-3 opacity-60" />
                            </div>
                          </div>
                          
                          {booking.paymentAmount && (
                            <div className="flex items-center gap-3 p-4 bg-[#7371ff]/10 rounded-2xl border border-[#7371ff]/20">
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                              <div>
                                <p className="text-[10px] font-black text-[#7371ff] uppercase tracking-widest leading-none mb-1">Payment Confirmed</p>
                                <p className="text-lg font-black text-white">{booking.paymentAmount}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#1a1a1a] border border-white/10 rounded-[32px] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-center uppercase tracking-tight mb-2">Cancel Booking?</h3>
              <p className="text-white/40 text-center mb-8">
                Are you sure you want to cancel your booking to <span className="text-white font-bold">{booking.destination}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                  }}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                >
                  No, Keep it
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={isUpdating}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {isUpdating ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
