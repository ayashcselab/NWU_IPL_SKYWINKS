import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PackageDetailsModal from '../components/PackageDetailsModal';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Search, PlaneTakeoff, PlaneLanding, Calendar, Users, CheckCircle2, X, Clock, MapPin, ShieldCheck, Info, Globe, Star, ArrowRight } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { MOCK_PACKAGES, Package as PackageType } from '../constants/mockData';

import DatePicker from '../components/DatePicker';

interface Package extends PackageType {
  createdAt?: any;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  active: boolean;
}

export default function Home() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Package[]>([]);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [bookingForm, setBookingForm] = useState({
    fullName: '',
    email: '',
    passportNumber: '',
    destination: '',
    people: '',
    date: '',
    path: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert('Please sign in to make a booking request.');
      return;
    }

    setIsSubmitting(true);
    const requestsPath = 'personal_requests';
    const notificationsPath = 'notifications';
    try {
      // Create personal request
      const requestData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        fullName: bookingForm.fullName,
        email: bookingForm.email,
        passportNumber: bookingForm.passportNumber,
        destination: bookingForm.destination,
        people: bookingForm.people,
        date: bookingForm.date,
        path: bookingForm.path,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, requestsPath), requestData).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, requestsPath);
        throw err;
      });

      // Create notification for admin
      await addDoc(collection(db, notificationsPath), {
        userId: 'admin', // Special ID for admin notifications
        message: `New personal booking request from ${bookingForm.fullName} to ${bookingForm.destination}`,
        type: 'booking_request',
        requestId: docRef.id,
        read: false,
        createdAt: serverTimestamp()
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, notificationsPath);
        throw err;
      });

      setShowSuccess(true);
      setBookingForm({
        fullName: '',
        email: '',
        passportNumber: '',
        destination: '',
        people: '',
        date: '',
        path: ''
      });
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      console.error('Booking error:', error);
      alert('Failed to send booking request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [search, setSearch] = useState({
    departure: '',
    arrival: '',
    date: '',
    people: ''
  });

  useEffect(() => {
    const packagesPath = 'packages';
    const q = query(
      collection(db, packagesPath), 
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const fallbackQ = query(collection(db, packagesPath), orderBy('createdAt', 'desc'));

    let unsubscribe: (() => void) | null = null;
    let isFallbackActive = false;

    const startListener = (currentQuery: any, isFallback: boolean = false) => {
      // Cleanup previous listener if it exists
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      const unsub = onSnapshot(currentQuery, (snapshot) => {
        const packagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Package[];
        
        if (isFallback) {
          // Filter client-side if we're using the fallback query
          setPackages(packagesData.filter(p => p.status === 'active'));
        } else {
          setPackages(packagesData);
        }
        setLoadingPackages(false);
      }, (err) => {
        if (!isFallback && !isFallbackActive && err.message?.includes('requires an index')) {
          console.warn('Firestore index missing for active packages query. Falling back to client-side filtering.');
          isFallbackActive = true;
          startListener(fallbackQ, true);
        } else {
          console.error('Error fetching active packages:', err);
          setLoadingPackages(false);
        }
      });
      
      unsubscribe = unsub;
    };

    startListener(q);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    const socialLinksPath = 'social_links';
    const q = query(collection(db, socialLinksPath), where('active', '==', true));
    const fallbackQ = collection(db, socialLinksPath);

    let unsubscribe: (() => void) | null = null;
    let isFallbackActive = false;

    const startListener = (currentQuery: any, isFallback: boolean = false) => {
      // Cleanup previous listener if it exists
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      const unsub = onSnapshot(currentQuery, (snapshot) => {
        const links = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        if (isFallback) {
          setSocialLinks(links.filter((l: any) => l.active) as SocialLink[]);
        } else {
          setSocialLinks(links as SocialLink[]);
        }
      }, (err) => {
        if (!isFallback && !isFallbackActive && err.message?.includes('requires an index')) {
          isFallbackActive = true;
          startListener(fallbackQ, true);
        } else {
          console.error('Error fetching social links:', err);
        }
      });

      unsubscribe = unsub;
    };

    startListener(q);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const allPackages = packages.length > 0 ? packages : MOCK_PACKAGES;

  const filteredPackages = allPackages.filter(pkg => {
    const matchDeparture = !search.departure || pkg.departure.toLowerCase().includes(search.departure.toLowerCase());
    const matchArrival = !search.arrival || pkg.arrival.toLowerCase().includes(search.arrival.toLowerCase());
    return matchDeparture && matchArrival;
  });

  const displayPackages = filteredPackages.slice(0, 6);

  const availableDepartures = useMemo(() => {
    let departures = allPackages.map(pkg => pkg.departure);
    if (search.arrival) {
      // If arrival is selected, only show departures that go to that arrival
      const validDepartures = allPackages
        .filter(pkg => pkg.arrival === search.arrival)
        .map(pkg => pkg.departure);
      if (validDepartures.length > 0) departures = validDepartures;
    }
    return Array.from(new Set(departures)).sort();
  }, [allPackages, search.arrival]);

  const availableArrivals = useMemo(() => {
    let arrivals = allPackages.map(pkg => pkg.arrival);
    if (search.departure) {
      // If departure is selected, only show arrivals that have a trip from that departure
      const validArrivals = allPackages
        .filter(pkg => pkg.departure === search.departure)
        .map(pkg => pkg.arrival);
      if (validArrivals.length > 0) arrivals = validArrivals;
    }
    return Array.from(new Set(arrivals)).sort();
  }, [allPackages, search.departure]);

  const LocationInput = ({ 
    placeholder, 
    value, 
    onChange, 
    icon: Icon,
    options
  }: { 
    placeholder: string, 
    value: string, 
    onChange: (val: string) => void,
    icon: any,
    options: string[]
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filtered, setFiltered] = useState<string[]>([]);
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
      const matches = options.filter(loc => 
        loc.toLowerCase().includes(value.toLowerCase())
      );
      setFiltered(matches);
    }, [value, options]);

    return (
      <div className="relative" ref={containerRef}>
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5 z-10" />
          <input 
            type="text" 
            name="skybound-location-search"
            autoComplete="off"
            placeholder={placeholder}
            value={value}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              onChange(e.target.value);
              setIsOpen(true);
            }}
            className="w-full bg-white/10 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all outline-none shadow-inner"
          />
        <AnimatePresence>
          {isOpen && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] overflow-hidden pointer-events-auto backdrop-blur-xl"
            >
              <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                {filtered.map((loc) => (
                  <div
                    key={loc}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(loc);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-6 py-4 hover:bg-white/10 transition-colors text-sm font-bold border-b border-white/5 last:border-none cursor-pointer text-white/70 hover:text-white"
                  >
                    {loc}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#6b6b6b] text-white overflow-x-hidden selection:bg-white selection:text-[#6b6b6b]">
      <Navbar />

      {/* Hero Section */}
      <main id="home" className="relative w-full h-screen flex flex-col items-center justify-center pt-32 overflow-hidden">
        
        {/* Combined Hero Image */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="relative w-full max-w-7xl px-6 z-20"
        >
          <img 
            src="https://i.postimg.cc/9QsvsxcX/Group-56.png" 
            alt="Skywinks Hero" 
            className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            referrerPolicy="no-referrer"
          />
        </motion.div>

      </main>

      {/* Package Section */}
      <section id="package" className="relative w-full min-h-screen py-32 px-6 flex flex-col items-center bg-[#121212]">
        <div className="max-w-7xl w-full bg-white/5 backdrop-blur-sm rounded-[60px] p-12 border border-white/5 shadow-2xl">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-6xl md:text-8xl font-black tracking-tighter mb-12"
          >
            EXCLUSIVE <span className="text-white/20">PACKAGES</span>
          </motion.h2>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-4 md:p-6 mb-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative z-50 group focus-within:bg-white/10 transition-all duration-500"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <LocationInput 
                placeholder="Departure City"
                value={search.departure}
                onChange={(val) => setSearch({...search, departure: val})}
                icon={PlaneTakeoff}
                options={availableDepartures.filter(loc => loc !== search.arrival)}
              />
              <LocationInput 
                placeholder="Arrival City"
                value={search.arrival}
                onChange={(val) => setSearch({...search, arrival: val})}
                icon={PlaneLanding}
                options={availableArrivals.filter(loc => loc !== search.departure)}
              />
              <div className="relative group">
                <DatePicker 
                  value={search.date}
                  onChange={(date) => setSearch({...search, date})}
                  className="bg-white/10 border border-white/5 text-white pl-12"
                  placeholder="Travel Date"
                />
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5 group-focus-within:text-white/70 transition-colors pointer-events-none z-10" />
              </div>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                <input 
                  type="text" 
                  name="skybound-people-search"
                  autoComplete="off"
                  placeholder="Number Of People"
                  value={search.people}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setSearch({...search, people: value});
                  }}
                  className="w-full bg-white/10 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all outline-none shadow-inner"
                />
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {loadingPackages ? (
                <div className="col-span-full flex justify-center py-20">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              ) : displayPackages.length > 0 ? (
                displayPackages.map((pkg, i) => (
                  <motion.div
                    key={pkg.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                    className="group relative h-[500px] rounded-3xl overflow-hidden cursor-pointer"
                  >
                    <img src={(pkg as any).image || pkg.img} alt={pkg.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute top-6 right-6 px-4 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                      <span className="text-xs font-bold tracking-widest">{pkg.departure} → {pkg.arrival}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 p-8">
                      <h3 className="text-3xl font-black tracking-tighter mb-2">{pkg.title}</h3>
                      <p className="text-white/60 font-bold mb-4">Starting from {pkg.price}</p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPackage(pkg);
                          setIsModalOpen(true);
                        }}
                        className="px-6 py-2 bg-white text-black font-bold rounded-full text-sm transform transition-all duration-300 hover:scale-105 active:scale-95"
                      >
                        VIEW DETAILS
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center bg-white/5 rounded-[40px] border border-dashed border-white/10">
                  <Globe className="w-16 h-16 text-white/10 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white/20 uppercase tracking-widest">No packages available</h3>
                </div>
              )}
            </AnimatePresence>
          </div>

          {filteredPackages.length > 6 && (
            <div className="mt-16 flex justify-center">
              <button 
                onClick={() => navigate('/packages')}
                className="group flex items-center gap-4 px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all"
              >
                <span className="font-black tracking-[0.2em] uppercase text-sm">See More Packages</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Booking Section */}
      <section id="booking" className="relative w-full min-h-screen py-32 px-6 flex items-center justify-center bg-gradient-to-br from-[#92a8d1] to-[#f7cac9]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl w-full bg-[#7a86a8]/40 backdrop-blur-xl border border-white/30 rounded-[40px] p-8 md:p-12 shadow-2xl flex flex-col lg:flex-row gap-12 items-center"
        >
          {/* Left Side: Airplane Image */}
          <div className="w-full lg:w-1/2 h-[400px] md:h-[600px] rounded-3xl overflow-hidden shadow-xl">
            <img 
              src="https://i.postimg.cc/P5T3BBw9/image-32.png" 
              alt="Airplane in Clouds" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Right Side: Booking Form */}
          <div className="w-full lg:w-1/2 flex flex-col gap-8">
            {/* Form Header Logo */}
            <div className="flex justify-center lg:justify-start">
              <img 
                src="https://i.postimg.cc/nz2c18BY/PERSONAL-RESERVATION-(2).png" 
                alt="PERSONAL RESERVATION" 
                className="h-10 md:h-14 w-auto"
                referrerPolicy="no-referrer"
              />
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-6">
              {showSuccess && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-500/20 border border-green-500/50 rounded-2xl p-4 flex items-center gap-3 text-green-100"
                >
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <p className="font-bold">Request Sent Successfully! Admin will review it soon.</p>
                </motion.div>
              )}

              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90 ml-2">Full Name</label>
                <input 
                  type="text" 
                  name="skybound-full-name"
                  autoComplete="name"
                  required
                  placeholder="Your Name" 
                  value={bookingForm.fullName}
                  onChange={(e) => setBookingForm({...bookingForm, fullName: e.target.value})}
                  className="w-full bg-white border-none rounded-2xl px-6 py-4 text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-white/50 transition-all shadow-sm"
                />
              </div>

              {/* Gmail */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90 ml-2">Gmail</label>
                <input 
                  type="email" 
                  name="skybound-booking-email"
                  autoComplete="email"
                  required
                  pattern=".+@gmail\.com"
                  title="Please enter a valid Gmail address (e.g., user@gmail.com)"
                  placeholder="Username@gmail.com" 
                  value={bookingForm.email}
                  onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})}
                  className="w-full bg-white border-none rounded-2xl px-6 py-4 text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-white/50 transition-all shadow-sm"
                />
              </div>

              {/* Passport Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/90 ml-2">Passport Number</label>
                <input 
                  type="text" 
                  required
                  placeholder="Your Passport Number" 
                  value={bookingForm.passportNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setBookingForm({...bookingForm, passportNumber: value});
                  }}
                  className="w-full bg-white border-none rounded-2xl px-6 py-4 text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-white/50 transition-all shadow-sm"
                />
              </div>

              {/* Destination & Number Of People */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90 ml-2">Destination</label>
                  <input 
                    type="text" 
                    name="skybound-booking-destination"
                    autoComplete="off"
                    required
                    placeholder="Where You Want To Go" 
                    value={bookingForm.destination}
                    onChange={(e) => setBookingForm({...bookingForm, destination: e.target.value})}
                    className="w-full bg-white border-none rounded-2xl px-6 py-4 text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-white/50 transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90 ml-2">Number Of People</label>
                  <input 
                    type="text" 
                    required
                    placeholder="How Many People You Have" 
                    value={bookingForm.people}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setBookingForm({...bookingForm, people: value});
                    }}
                    className="w-full bg-white border-none rounded-2xl px-6 py-4 text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-white/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Date Of Reservation & Your Path */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90 ml-2">Date Of Reservation</label>
                  <DatePicker 
                    value={bookingForm.date}
                    onChange={(date) => setBookingForm({...bookingForm, date})}
                    required
                    placeholder="Select Date"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/90 ml-2">Your Path</label>
                  <select 
                    required
                    value={bookingForm.path}
                    onChange={(e) => setBookingForm({...bookingForm, path: e.target.value})}
                    className="w-full bg-white border-none rounded-2xl px-6 py-4 text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-white/50 transition-all shadow-sm appearance-none"
                  >
                    <option value="" disabled>Select Path</option>
                    <option value="One Way">One Way</option>
                    <option value="Round Trip">Round Trip</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 bg-[#7371ff] text-white font-black tracking-widest rounded-2xl hover:bg-[#6361ff] transition-all transform active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'SENDING...' : 'REQUEST'} <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </motion.div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative w-full min-h-screen bg-black flex flex-col items-center justify-center pt-20 pb-12 px-6 overflow-hidden">
        <div className="max-w-7xl w-full flex flex-col items-center">
          
          {/* Combined Airplane and SKYWINKS Image */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="w-full max-w-6xl mb-12 z-10"
          >
            <img 
              src="https://i.postimg.cc/NjGM5jXR/Group-55.png" 
              alt="Skywinks Airplane" 
              className="w-full h-auto"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          {/* Bottom Grid */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-end mt-auto">
            
            {/* Bottom Left: Text Details Image */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="max-w-md"
            >
              <img 
                src="https://i.postimg.cc/xjPtL67M/Group-16.png" 
                alt="Skywinks Details" 
                className="w-full h-auto"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            {/* Bottom Right: Links and Socials */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-col items-center lg:items-end gap-8"
            >
              {/* Nav Links */}
              <div className="flex flex-wrap justify-center lg:justify-end gap-6 text-[10px] font-bold tracking-widest text-white/60 uppercase">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Team & Condition</a>
                <a href="#" className="hover:text-white transition-colors">About Us</a>
                <a href="#" className="hover:text-white transition-colors">FAQ</a>
              </div>

              {/* Social Icons */}
              <div className="flex gap-4">
                {socialLinks.length > 0 ? (
                  socialLinks.map((social, i) => {
                    const getIcon = (platform: string) => {
                      const p = platform.toLowerCase();
                      if (p.includes('facebook')) return 'https://i.postimg.cc/Gm0fQXrG/Facebook-Icon.png';
                      if (p.includes('gmail') || p.includes('mail')) return 'https://i.postimg.cc/t40c5ByP/Gmail-Icon.png';
                      if (p.includes('apple')) return 'https://i.postimg.cc/Z5kQcwZv/Apple-Icon.png';
                      if (p.includes('youtube')) return 'https://i.postimg.cc/L8dWTxRT/You-Tube-Icon.png';
                      if (p.includes('instagram')) return 'https://i.postimg.cc/zGmQjx5n/Instagram-Icon.png';
                      if (p.includes('twitter') || p.includes('x')) return 'https://i.postimg.cc/qvfFL10s/X-Icon.png';
                      return 'https://i.postimg.cc/Gm0fQXrG/Facebook-Icon.png'; // Default
                    };

                    return (
                      <a 
                        key={social.id}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 hover:border-white/40 transition-all bg-white/5 hover:bg-white/10 backdrop-blur-sm overflow-hidden p-2"
                      >
                        <img 
                          src={getIcon(social.platform)} 
                          alt={social.platform} 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </a>
                    );
                  })
                ) : (
                  [
                    { name: 'Facebook', icon: 'https://i.postimg.cc/Gm0fQXrG/Facebook-Icon.png', url: 'https://facebook.com' },
                    { name: 'Gmail', icon: 'https://i.postimg.cc/t40c5ByP/Gmail-Icon.png', url: 'mailto:contact@skywink.com' },
                    { name: 'Apple', icon: 'https://i.postimg.cc/Z5kQcwZv/Apple-Icon.png', url: 'https://apple.com' },
                    { name: 'YouTube', icon: 'https://i.postimg.cc/L8dWTxRT/You-Tube-Icon.png', url: 'https://youtube.com' },
                    { name: 'Instagram', icon: 'https://i.postimg.cc/zGmQjx5n/Instagram-Icon.png', url: 'https://instagram.com' },
                    { name: 'X', icon: 'https://i.postimg.cc/qvfFL10s/X-Icon.png', url: 'https://x.com' },
                  ].map((social, i) => (
                    <a 
                      key={i}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 hover:border-white/40 transition-all bg-white/5 hover:bg-white/10 backdrop-blur-sm overflow-hidden p-2"
                    >
                      <img 
                        src={social.icon} 
                        alt={social.name} 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </a>
                  ))
                )}
              </div>

              {/* Copyright */}
              <div className="text-[10px] font-bold tracking-widest text-white/20 uppercase text-center lg:text-right">
                © 2026 SKYWINK INC. All Rights Reserved
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer / Bottom Decoration */}
      <PackageDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedPackage={selectedPackage}
      />
      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-10" />
    </div>
  );
}
