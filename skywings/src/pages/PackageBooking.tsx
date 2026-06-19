import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { X, Plus, Minus, PlaneTakeoff, Loader2, Star, Clock, Info, CheckCircle2, Send } from 'lucide-react';
import Navbar from '../components/Navbar';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { MOCK_PACKAGES } from '../constants/mockData';

import DatePicker from '../components/DatePicker';

export default function PackageBooking() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bagCount, setBagCount] = useState(1);
  const [detailsForm, setDetailsForm] = useState({
    passengerName: '',
    email: '',
    passportNumber: '',
    bookingDate: '',
    address: '',
    phone: '',
    emergencyFirstName: '',
    emergencyLastName: '',
    emergencyEmail: '',
    emergencyPhone: '',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/signin');
        return;
      }
      
      if (packageId) {
        try {
          // Check mock data first
          const mockPkg = MOCK_PACKAGES.find(p => p.id === packageId);
          if (mockPkg) {
            setSelectedPackage(mockPkg);
            setDetailsForm(prev => ({
              ...prev,
              passengerName:  ''
            }));
            setLoading(false);
            return;
          }

          const docRef = doc(db, 'packages', packageId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setSelectedPackage({ id: docSnap.id, ...docSnap.data() });
            setDetailsForm(prev => ({
              ...prev,
              passengerName:  ''
            }));
          } else {
            navigate('/home');
          }
        } catch (error) {
          console.error('Error fetching package:', error);
          navigate('/home');
        }
      } else {
        navigate('/home');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [packageId, navigate]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedPackage) return;

    setIsSubmitting(true);
    const bookingsPath = 'bookings';
    const notificationsPath = 'notifications';

    try {
      const bookingData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        fullName: detailsForm.passengerName,
        email: detailsForm.email,
        passportNumber: detailsForm.passportNumber,
        destination: `${selectedPackage.departure} to ${selectedPackage.arrival}`,
        date: detailsForm.bookingDate,
        address: detailsForm.address,
        phone: detailsForm.phone,
        emergencyContact: {
          firstName: detailsForm.emergencyFirstName,
          lastName: detailsForm.emergencyLastName,
          email: detailsForm.emergencyEmail,
          phone: detailsForm.emergencyPhone,
        },
        bagCount: bagCount,
        packageId: selectedPackage.id,
        packageTitle: selectedPackage.title,
        packagePrice: selectedPackage.price,
        type: 'package_booking',
        status: 'pending',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, bookingsPath), bookingData).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, bookingsPath);
        throw err;
      });

      await addDoc(collection(db, notificationsPath), {
        userId: 'admin',
        message: `New PACKAGE booking: ${selectedPackage.title} by ${detailsForm.passengerName}`,
        type: 'package_booking',
        bookingId: docRef.id,
        read: false,
        createdAt: serverTimestamp()
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, notificationsPath);
        throw err;
      });

      // Redirect to payment page instead of dashboard
      navigate(`/payment/${docRef.id}`);
    } catch (error) {
      console.error('Booking error:', error);
      alert('Failed to process booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#7371ff] animate-spin" />
      </div>
    );
  }

  if (!selectedPackage) return null;

  return (
    <div className="min-h-screen bg-[#121212] text-white selection:bg-[#7371ff] selection:text-white">
      <Navbar />
      
      <div className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#2a2a2a] rounded-[40px] overflow-hidden shadow-2xl border border-white/5"
        >
          {/* Simple Header */}
          <div className="p-8 md:p-12 border-b border-white/5 bg-gradient-to-r from-[#7371ff]/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-8 relative">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 px-3 py-1 bg-[#7371ff] rounded-full">
                  <Star className="w-3 h-3 text-white fill-white" />
                  <span className="text-[10px] font-black text-white">{selectedPackage.rating}</span>
                </div>
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white text-[10px] font-black tracking-widest rounded-full uppercase border border-white/10">
                  Package Booking
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-tight uppercase">
                {selectedPackage.title}
              </h1>
              <div className="flex items-center gap-6 text-white/40 text-sm font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <PlaneTakeoff className="w-4 h-4 text-[#7371ff]" />
                  {selectedPackage.departure} → {selectedPackage.arrival}
                </div>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#7371ff]" />
                  {selectedPackage.duration}
                </div>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm font-black text-white/20 uppercase tracking-widest mb-1">Package Price</p>
              <p className="text-5xl font-black text-[#7371ff]">{selectedPackage.price}</p>
            </div>
            
            <button 
              onClick={() => navigate(-1)}
              className="absolute top-8 right-8 w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center text-white transition-all active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 md:p-12">
            <form onSubmit={handleConfirmBooking} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Left Column: Forms */}
              <div className="space-y-12">
                {showSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-green-500/20 border border-green-500/50 rounded-2xl p-6 flex items-center gap-4 text-green-100"
                  >
                    <CheckCircle2 className="w-8 h-8 shrink-0" />
                    <div>
                      <p className="font-bold text-lg">Booking Confirmed!</p>
                      <p className="text-sm opacity-80">Redirecting to your dashboard...</p>
                    </div>
                  </motion.div>
                )}

                {/* Package Overview - Moved to main column */}
                <section className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-[#7371ff] flex items-center gap-2">
                      <Info className="w-6 h-6" /> Package Overview
                    </h3>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                      <Clock className="w-4 h-4 text-[#7371ff]" />
                      <span className="text-xs font-bold uppercase tracking-widest">{selectedPackage.duration}</span>
                    </div>
                  </div>
                  <p className="text-white/60 leading-relaxed">
                    {selectedPackage.description}
                  </p>
                  
                  <div className="pt-6 border-t border-white/10">
                    <h4 className="text-sm font-black uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#7371ff]" /> What's Included
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedPackage.inclusions?.map((item: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 text-xs text-white/60 font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#7371ff]" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Passenger Information */}
                <section className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">Passenger information</h3>
                  <p className="text-sm text-white/40">Enter the required information for each traveler and be sure that it exactly matches the government-issued ID presented at the airport.</p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-2">Passenger Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Full Name"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                        value={detailsForm.passengerName}
                        onChange={(e) => setDetailsForm({...detailsForm, passengerName: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-2">Passport Number</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Passport Number "
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                          value={detailsForm.passportNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setDetailsForm({...detailsForm, passportNumber: value});
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-2">Gmail</label>
                        <input 
                          type="email" 
                          required
                          pattern=".+@gmail\.com"
                          title="Please enter a valid Gmail address (e.g., user@gmail.com)"
                          placeholder="Username@gmail.com"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                          value={detailsForm.email}
                          onChange={(e) => setDetailsForm({...detailsForm, email: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-2">Date of Birth</label>
                        <DatePicker 
                          value={detailsForm.bookingDate}
                          onChange={(date) => setDetailsForm({...detailsForm, bookingDate: date})}
                          required
                          className="bg-white/5 border border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-2">Phone Number</label>
                        <input 
                          type="text" 
                          required
                          placeholder="123-456-7890"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                          value={detailsForm.phone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setDetailsForm({...detailsForm, phone: value});
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-2">Address</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Your Full Address"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                        value={detailsForm.address}
                        onChange={(e) => setDetailsForm({...detailsForm, address: e.target.value})}
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Emergency & Bags */}
              <div className="space-y-12">
                {/* Emergency Contact */}
                <section className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">Emergency contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      required
                      placeholder="First Name"
                      className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={detailsForm.emergencyFirstName}
                      onChange={(e) => setDetailsForm({...detailsForm, emergencyFirstName: e.target.value})}
                    />
                    <input 
                      type="text" 
                      required
                      placeholder="Last Name"
                      className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={detailsForm.emergencyLastName}
                      onChange={(e) => setDetailsForm({...detailsForm, emergencyLastName: e.target.value})}
                    />
                    <input 
                      type="email" 
                      required
                      placeholder="Email address*"
                      className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={detailsForm.emergencyEmail}
                      onChange={(e) => setDetailsForm({...detailsForm, emergencyEmail: e.target.value})}
                    />
                    <input 
                      type="text" 
                      required
                      placeholder="Emergency Phone"
                      className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                      value={detailsForm.emergencyPhone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setDetailsForm({...detailsForm, emergencyPhone: value});
                      }}
                    />
                  </div>
                </section>

                {/* Bag Information */}
                <section className="space-y-6">
                  <h3 className="text-2xl font-bold text-[#7371ff]">Bag information</h3>
                  <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-white">Checked bags</p>
                        <p className="text-sm text-white/40">Standard size allowed</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <button 
                          type="button"
                          onClick={() => setBagCount(Math.max(0, bagCount - 1))}
                          className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all active:scale-90"
                        >
                          <Minus className="w-5 h-5 text-white" />
                        </button>
                        <span className="text-2xl font-black w-6 text-center">{bagCount}</span>
                        <button 
                          type="button"
                          onClick={() => setBagCount(bagCount + 1)}
                          className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all active:scale-90"
                        >
                          <Plus className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="pt-8 space-y-4">
                  <div className="p-6 bg-[#7371ff]/10 rounded-3xl border border-[#7371ff]/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/60 font-medium">Package Price</span>
                      <span className="text-xl font-black text-white">{selectedPackage.price}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-white/40">Taxes & Fees</span>
                      <span className="text-white/60">Included</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      type="button"
                      onClick={() => navigate(-1)}
                      className="flex-1 py-5 border border-white/10 hover:bg-white/5 rounded-2xl font-black tracking-widest uppercase transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-5 bg-[#7371ff] hover:bg-[#6361ff] rounded-2xl font-black tracking-widest uppercase transition-all shadow-xl shadow-[#7371ff]/20 flex items-center justify-center gap-3 disabled:opacity-70"
                    >
                      {isSubmitting ? 'Processing...' : 'Confirm Booking'} <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
