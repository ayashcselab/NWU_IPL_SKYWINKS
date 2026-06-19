import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, ShieldCheck, Loader2, CheckCircle2, ArrowRight, ArrowLeft, Plane, MapPin, Calendar, Info } from 'lucide-react';
import { CardIcon } from '../components/CardIcon';
import Navbar from '../components/Navbar';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface Booking {
  id: string;
  destination: string;
  date: string;
  packagePrice: string;
  price?: number;
  status: 'pending' | 'paynow' | 'paid' | 'accepted' | 'completed' | 'cancelled';
  userId: string;
  fullName: string;
}

export default function Payment() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
    brand: 'unknown' as string,
    isValid: false
  });

  const validateCardNumber = (number: string) => {
    const rawValue = number.replace(/\s+/g, '');
    if (rawValue.length < 13) return false;

    // Luhn Algorithm
    let sum = 0;
    let shouldDouble = false;
    for (let i = rawValue.length - 1; i >= 0; i--) {
      let digit = parseInt(rawValue.charAt(i));
      if (shouldDouble) {
        if ((digit *= 2) > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
  };

  const validateExpiry = (expiry: string) => {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
    const [month, year] = expiry.split('/').map(Number);
    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
  };

  const getCardType = (number: string) => {
    const re = {
      visa: /^4/,
      mastercard: /^5[1-5]|^222[1-9]|^22[3-9]|^2[3-6]|^27[0-1]|^2720/,
      amex: /^3[47]/,
      discover: /^6(?:011|5|4[4-9]|22)/,
      diners: /^3(?:0[0-5]|[68])/,
      jcb: /^(?:2131|1800|35)/
    };

    if (re.visa.test(number)) return 'visa';
    if (re.mastercard.test(number)) return 'mastercard';
    if (re.amex.test(number)) return 'amex';
    if (re.discover.test(number)) return 'discover';
    if (re.diners.test(number)) return 'diners';
    if (re.jcb.test(number)) return 'jcb';
    return 'unknown';
  };

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId || !auth.currentUser) return;
      try {
        // Try fetching from bookings first
        let docRef = doc(db, 'bookings', bookingId);
        let docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as Booking;
          if (data.userId !== auth.currentUser.uid) {
            navigate('/dashboard');
            return;
          }
          setBooking({ id: docSnap.id, ...data });
        } else {
          // Try fetching from personal_requests
          docRef = doc(db, 'personal_requests', bookingId);
          docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as any;
            if (data.userId !== auth.currentUser.uid) {
              navigate('/dashboard');
              return;
            }
            // Map personal request to booking-like structure for the UI
            setBooking({ 
              id: docSnap.id, 
              ...data,
              fullName: data.fullName || auth.currentUser.displayName || 'Passenger'
            } as Booking);
          } else {
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error fetching booking/request:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, auth.currentUser, navigate]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId || !booking) return;

    console.log('[USER PAYMENT START]', { bookingId, amount: booking.packagePrice || booking.price });
    setProcessing(true);
    
    // Final validation check before "processing"
    if (!validateCardNumber(cardDetails.number)) {
      setError('Invalid card number. Please check the digits.');
      setProcessing(false);
      return;
    }

    if (!validateExpiry(cardDetails.expiry)) {
      setError('Invalid expiry date. Month must be 01-12 and date must be in the future.');
      setProcessing(false);
      return;
    }

    try {
      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('[PAYMENT SUCCESS CALLBACK]');

      // Determine which collection to update
      let collectionName = 'bookings';
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      
      if (!bookingSnap.exists()) {
        collectionName = 'personal_requests';
      }

      const paymentData = {
        status: 'paid',
        transactionStatus: 'success',
        paymentAt: serverTimestamp(),
        paymentAmount: booking.packagePrice || (booking.price ? `$${booking.price}` : 'TBD'),
        paymentMethod: {
          brand: cardDetails.brand,
          last4: cardDetails.number.slice(-4),
        }
      };

      // Update status to 'paid'
      await updateDoc(doc(db, collectionName, bookingId), paymentData);
      console.log('[BOOKING WRITE SUCCESS]', { collectionName, bookingId });

      // Create notification for admin
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        message: `Payment received for ${collectionName === 'bookings' ? 'booking' : 'personal request'} to ${booking.destination}`,
        type: 'payment_confirmed',
        bookingId: bookingId,
        read: false,
        createdAt: serverTimestamp()
      });

      // Create notification for user
      await addDoc(collection(db, 'notifications'), {
        userId: auth.currentUser?.uid,
        message: `Payment successful for your trip to ${booking.destination}! Your booking is now confirmed.`,
        type: 'payment_confirmed',
        bookingId: bookingId,
        read: false,
        createdAt: serverTimestamp()
      });

      // Create Boarding Pass automatically
      const passRef = await addDoc(collection(db, 'boarding_passes'), {
        bookingId: bookingId,
        userId: auth.currentUser?.uid,
        passengerName: booking.fullName || auth.currentUser?.displayName || 'Passenger',
        destination: booking.destination,
        date: booking.date,
        seatNumber: `${Math.floor(Math.random() * 30) + 1}${['A', 'B', 'C', 'D', 'E', 'F'][Math.floor(Math.random() * 6)]}`,
        gate: `G-${Math.floor(Math.random() * 50) + 1}`,
        class: 'Premium Economy',
        status: 'active',
        createdAt: serverTimestamp()
      });
      console.log('[TRANSACTION WRITE SUCCESS]', { passId: passRef.id });

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      console.error('[PAYMENT FLOW ERROR]', err);
      handleFirestoreError(err, OperationType.WRITE, `payment/${bookingId}`);
      setError('Payment failed. Please check your card details and try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#7371ff] animate-spin" />
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-[#121212] text-white selection:bg-[#7371ff] selection:text-white">
      <Navbar />
      
      <div className="pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              key="payment-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 lg:grid-cols-5 gap-8"
            >
              {/* Left: Payment Form */}
              <div className="lg:col-span-3 space-y-8">
                <button 
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back
                </button>
                <div className="space-y-2">
                  <h1 className="text-4xl font-black tracking-tighter uppercase">Secure Payment</h1>
                  <p className="text-white/40 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-500" /> 256-bit SSL Encrypted
                  </p>
                </div>

                <form onSubmit={handlePayment} className="space-y-6">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold uppercase tracking-widest text-center"
                    >
                      {error}
                    </motion.div>
                  )}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Cardholder Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="John Doe"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                        value={cardDetails.name}
                        onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Card Number</label>
                      <div className="relative">
                        <input 
                          type="tel" 
                          inputMode="numeric"
                          required
                          placeholder="0000 0000 0000 0000"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-20 py-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                          value={cardDetails.number}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                            const formattedValue = value.match(/.{1,4}/g)?.join(' ').substring(0, 19) || '';
                            const brand = getCardType(value);
                            const isValid = validateCardNumber(value);
                            setCardDetails({...cardDetails, number: formattedValue, brand, isValid});
                          }}
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {cardDetails.number.length >= 13 && (
                            cardDetails.isValid ? 
                              <CheckCircle2 className="w-4 h-4 text-green-500" /> : 
                              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Invalid</span>
                          )}
                        </div>
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <CardIcon brand={cardDetails.brand} className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Expiry Date</label>
                        <input 
                          type="tel" 
                          inputMode="numeric"
                          required
                          placeholder="MM/YY"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 pr-20 py-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                          value={cardDetails.expiry}
                          onChange={(e) => {
                            let value = e.target.value.replace(/[^0-9]/g, '').substring(0, 4);
                            if (value.length > 2) {
                              value = value.substring(0, 2) + '/' + value.substring(2, 4);
                            }
                            
                            // Real-time month validation logic
                            if (value.length === 2) {
                              const month = parseInt(value);
                              if (month > 12) value = '12';
                              if (month === 0) value = '01';
                            }

                            setCardDetails({...cardDetails, expiry: value});
                          }}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {cardDetails.expiry.length === 5 && !validateExpiry(cardDetails.expiry) && (
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Expired</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">CVC</label>
                        <input 
                          type="tel" 
                          inputMode="numeric"
                          required
                          placeholder="123"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#7371ff]/50 transition-all"
                          value={cardDetails.cvc}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '').substring(0, 4);
                            setCardDetails({...cardDetails, cvc: value});
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-6 bg-[#7371ff] hover:bg-[#6361ff] rounded-3xl font-black tracking-[0.2em] uppercase transition-all shadow-2xl shadow-[#7371ff]/20 flex items-center justify-center gap-3 disabled:opacity-70 group"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Pay {booking.packagePrice || (booking.price ? `$${booking.price}` : 'TBD')} <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <div className="flex flex-col items-center gap-6 pt-8 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => navigate('/packages')}
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white transition-all hover:tracking-[0.3em]"
                    >
                      Cancel & Browse More Packages
                    </button>
                    <div className="flex flex-wrap items-center justify-center gap-8">
                      <CardIcon brand="visa" className="h-3 opacity-20 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-help" />
                      <CardIcon brand="mastercard" className="h-5 opacity-20 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-help" />
                      <CardIcon brand="amex" className="h-4 opacity-20 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-help" />
                      <CardIcon brand="discover" className="h-3 opacity-20 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-help" />
                      <CardIcon brand="jcb" className="h-4 opacity-20 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-help" />
                      <CardIcon brand="diners" className="h-4 opacity-20 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-help" />
                    </div>
                  </div>
                </form>
              </div>

              {/* Right: Order Summary */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6">
                  <h2 className="text-xl font-black uppercase tracking-widest">Order Summary</h2>
                  
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#7371ff]/10 flex items-center justify-center shrink-0 border border-[#7371ff]/20">
                        <Plane className="w-6 h-6 text-[#7371ff]" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Destination</p>
                        <p className="font-bold text-sm leading-tight">{booking.destination}</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                        <Calendar className="w-6 h-6 text-white/40" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Date</p>
                        <p className="font-bold text-sm leading-tight">{booking.date}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Subtotal</span>
                      <span className="font-bold">{booking.packagePrice || (booking.price ? `$${booking.price}` : 'TBD')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Taxes</span>
                      <span className="text-green-500 text-xs font-black uppercase tracking-widest">Included</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <span className="text-white font-black uppercase tracking-widest">Total</span>
                      <span className="text-2xl font-black text-[#7371ff]">{booking.packagePrice || (booking.price ? `$${booking.price}` : 'TBD')}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex gap-4">
                  <Info className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-200/60 font-medium leading-relaxed uppercase tracking-wider">
                    Your booking will be confirmed immediately after payment. You can manage your trip in the dashboard.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center space-y-8 py-20"
            >
              <div className="relative inline-block">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12 }}
                  className="w-32 h-32 bg-green-500 rounded-[40px] flex items-center justify-center shadow-2xl shadow-green-500/20"
                >
                  <CheckCircle2 className="w-16 h-16 text-white" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-green-500 rounded-[40px] -z-10"
                />
              </div>

              <div className="space-y-4">
                <h2 className="text-5xl font-black tracking-tighter uppercase">Payment Success!</h2>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-white/40 font-bold uppercase tracking-widest text-sm">
                    Your journey is officially secured.
                  </p>
                  <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                    <CardIcon brand={cardDetails.brand} className="h-3 opacity-80" showName />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                      Ending in {cardDetails.number.slice(-4)}
                    </span>
                  </div>
                </div>
                <p className="text-white/20 font-bold uppercase tracking-widest text-[10px]">
                  Redirecting to dashboard...
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#7371ff] animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-[#7371ff] animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-[#7371ff] animate-bounce [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
