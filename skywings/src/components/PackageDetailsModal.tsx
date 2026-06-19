import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, PlaneTakeoff, Loader2, Star, Clock, Info, CheckCircle2, Send } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import DatePicker from './DatePicker';

interface PackageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: any;
}

export default function PackageDetailsModal({ isOpen, onClose, selectedPackage }: PackageDetailsModalProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (isOpen && selectedPackage) {
      // Reset form when modal opens
      setDetailsForm({
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
      setBagCount(1);
    }
  }, [isOpen, selectedPackage]);

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

      onClose();
      navigate(`/payment/${docRef.id}`);
    } catch (error) {
      console.error('Booking error:', error);
      alert('Failed to process booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedPackage) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-6xl max-h-[90vh] bg-[#1a1a1a] rounded-[40px] overflow-hidden shadow-2xl border border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="p-8 md:p-10 border-b border-white/5 bg-gradient-to-r from-[#7371ff]/10 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 px-3 py-1 bg-[#7371ff] rounded-full">
                    <Star className="w-3 h-3 text-white fill-white" />
                    <span className="text-[10px] font-black text-white">{selectedPackage.rating}</span>
                  </div>
                  <span className="px-3 py-1 bg-white/5 text-white/60 text-[10px] font-black tracking-widest rounded-full uppercase border border-white/10">
                    Package Details
                  </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white uppercase leading-tight">
                  {selectedPackage.title}
                </h2>
                <div className="flex items-center gap-6 text-white/40 text-xs font-bold uppercase tracking-widest">
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
              
              <div className="flex items-center gap-8">
                <div className="text-left md:text-right">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Package Price</p>
                  <p className="text-4xl font-black text-[#7371ff]">{selectedPackage.price}</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center text-white transition-all active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
              <form onSubmit={handleConfirmBooking} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Left Column */}
                <div className="space-y-10">
                  <section className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/5">
                    <h3 className="text-xl font-bold text-[#7371ff] flex items-center gap-2">
                      <Info className="w-5 h-5" /> Overview
                    </h3>
                    <p className="text-white/60 leading-relaxed text-sm">
                      {selectedPackage.description}
                    </p>
                    
                    <div className="pt-6 border-t border-white/10">
                      <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4">What's Included</h4>
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

                  <section className="space-y-6">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Passenger Information</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Full Name</label>
                        <input 
                          type="text" 
                          required
                          placeholder="As shown on passport"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 outline-none focus:border-[#7371ff]/50 transition-all"
                          value={detailsForm.passengerName}
                          onChange={(e) => setDetailsForm({...detailsForm, passengerName: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Passport Number</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Passport ID"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 outline-none focus:border-[#7371ff]/50 transition-all"
                            value={detailsForm.passportNumber}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              setDetailsForm({...detailsForm, passportNumber: value});
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Email Address</label>
                          <input 
                            type="email" 
                            required
                            pattern=".+@gmail\.com"
                            title="Please enter a valid Gmail address (e.g., user@gmail.com)"
                            placeholder="Username@gmail.com"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 outline-none focus:border-[#7371ff]/50 transition-all"
                            value={detailsForm.email}
                            onChange={(e) => setDetailsForm({...detailsForm, email: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Date of Birth</label>
                          <DatePicker 
                            value={detailsForm.bookingDate}
                            onChange={(date) => setDetailsForm({...detailsForm, bookingDate: date})}
                            required
                            className="bg-white/5 border border-white/10 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Phone Number</label>
                          <input 
                            type="tel" 
                            required
                            placeholder="+1 (555) 000-0000"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 outline-none focus:border-[#7371ff]/50 transition-all"
                            value={detailsForm.phone}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              setDetailsForm({...detailsForm, phone: value});
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Right Column */}
                <div className="space-y-10">
                  <section className="space-y-6">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        required
                        placeholder="First Name"
                        className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 outline-none focus:border-[#7371ff]/50 transition-all"
                        value={detailsForm.emergencyFirstName}
                        onChange={(e) => setDetailsForm({...detailsForm, emergencyFirstName: e.target.value})}
                      />
                      <input 
                        type="text" 
                        required
                        placeholder="Last Name"
                        className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 outline-none focus:border-[#7371ff]/50 transition-all"
                        value={detailsForm.emergencyLastName}
                        onChange={(e) => setDetailsForm({...detailsForm, emergencyLastName: e.target.value})}
                      />
                      <input 
                        type="email" 
                        required
                        placeholder="Email Address"
                        className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 outline-none focus:border-[#7371ff]/50 transition-all"
                        value={detailsForm.emergencyEmail}
                        onChange={(e) => setDetailsForm({...detailsForm, emergencyEmail: e.target.value})}
                      />
                      <input 
                        type="tel" 
                        required
                        placeholder="Emergency Phone"
                        className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 outline-none focus:border-[#7371ff]/50 transition-all"
                        value={detailsForm.emergencyPhone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setDetailsForm({...detailsForm, emergencyPhone: value});
                        }}
                      />
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h3 className="text-xl font-bold text-[#7371ff] uppercase tracking-tight">Baggage</h3>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-bold text-white">Checked bags</p>
                          <p className="text-xs text-white/40 uppercase tracking-widest">Standard size allowed</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            type="button"
                            onClick={() => setBagCount(Math.max(0, bagCount - 1))}
                            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all active:scale-90"
                          >
                            <Minus className="w-4 h-4 text-white" />
                          </button>
                          <span className="text-xl font-black w-6 text-center">{bagCount}</span>
                          <button 
                            type="button"
                            onClick={() => setBagCount(bagCount + 1)}
                            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all active:scale-90"
                          >
                            <Plus className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="pt-6 space-y-6">
                    <div className="p-6 bg-[#7371ff]/5 rounded-3xl border border-[#7371ff]/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white/40 text-xs font-black uppercase tracking-widest">Total Package Price</span>
                        <span className="text-2xl font-black text-white">{selectedPackage.price}</span>
                      </div>
                      <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">All taxes and fees included</p>
                    </div>

                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-5 border border-white/10 hover:bg-white/5 rounded-2xl font-black tracking-widest uppercase transition-all text-xs"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-5 bg-[#7371ff] hover:bg-[#6361ff] rounded-2xl font-black tracking-widest uppercase transition-all shadow-xl shadow-[#7371ff]/10 flex items-center justify-center gap-3 disabled:opacity-70 text-xs"
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Booking'} 
                        {!isSubmitting && <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
