import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Plane, MapPin, Calendar, User, Clock, ArrowLeft, Download, Share2, QrCode, FileCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { domToCanvas } from 'modern-screenshot';
import { jsPDF } from 'jspdf';

interface BoardingPassData {
  id: string;
  bookingId: string;
  userId: string;
  destination: string;
  seatNumber: string;
  gate: string;
  class: string;
  passengerName: string;
  date: string;
  expiryDate?: string;
  status: string;
  createdAt: any;
}

export default function BoardingPass() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [pass, setPass] = useState<BoardingPassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!ticketRef.current || !pass) {
      console.error('Download failed: Ticket reference or pass data missing');
      return;
    }
    
    setIsDownloading(true);
    try {
      console.log('Starting PDF generation with modern-screenshot...');
      
      const canvas = await domToCanvas(ticketRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        // modern-screenshot handles OKLCH/OKLAB better
      });
      
      if (!canvas || canvas.width === 0) {
        throw new Error('Canvas generation failed or returned empty');
      }

      console.log('Canvas generated successfully:', canvas.width, 'x', canvas.height);
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
        hotfixes: ['px_scaling']
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`SkyWink-BoardingPass-${pass.bookingId.substring(0, 8).toUpperCase()}.pdf`);
      
      console.log('PDF saved successfully');
    } catch (error) {
      console.error('Download error details:', error);
      alert(`Critical error during PDF generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    let unsubscribePass: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/signin');
        return;
      }

      if (bookingId) {
        const q = query(
          collection(db, 'boarding_passes'),
          where('bookingId', '==', bookingId)
        );

        unsubscribePass = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as BoardingPassData;
            
            // Security check
            if (data.userId !== user.uid) {
              navigate('/dashboard');
              return;
            }
            
            setPass(data);
          } else {
            // Fallback: check if booking or request exists but pass isn't created yet
            const checkExistence = async () => {
              let docRef = doc(db, 'bookings', bookingId);
              let docSnap = await getDoc(docRef);
              
              if (!docSnap.exists()) {
                docRef = doc(db, 'personal_requests', bookingId);
                docSnap = await getDoc(docRef);
              }

              if (!docSnap.exists() || docSnap.data().userId !== user.uid) {
                navigate('/dashboard');
              }
            };
            checkExistence();
          }
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, 'boarding_passes');
          setLoading(false);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribePass) unsubscribePass();
    };
  }, [bookingId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#7371ff]/20 border-t-[#7371ff] rounded-full animate-spin" />
      </div>
    );
  }

  if (!pass) {
    return (
      <div className="min-h-screen bg-[#121212] text-white">
        <Navbar />
        <div className="pt-32 px-4 text-center">
          <Plane className="w-16 h-16 text-white/10 mx-auto mb-6" />
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Boarding Pass Not Ready</h2>
          <p className="text-white/40 mb-8">Your boarding pass is being prepared by our team. Please check back soon.</p>
          <button onClick={() => navigate('/home')} className="px-8 py-4 bg-white/5 rounded-2xl font-black uppercase tracking-widest text-xs">Go Back Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white selection:bg-[#7371ff] selection:text-white">
      <Navbar />
      
      <div className="pt-32 pb-20 px-4 md:px-8 max-w-2xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white mb-8 transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold uppercase tracking-widest text-[10px]">Back to Previous</span>
        </button>

        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black tracking-tighter uppercase">Boarding Pass</h1>
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Your journey is confirmed. Safe travels!</p>
          </div>

          {/* Physical Ticket Style */}
          <div ref={ticketRef}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white text-black rounded-[40px] overflow-hidden shadow-2xl shadow-[#7371ff]/20"
            >
              {/* Top Section */}
              <div className="bg-[#7371ff] p-8 text-white">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Plane className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black uppercase tracking-widest text-sm">SkyBound Airways</span>
                      {pass.status === 'active' && (!pass.expiryDate || new Date(pass.expiryDate) >= new Date()) ? (
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-white/20 px-2 py-0.5 rounded-full w-fit">Valid Pass</span>
                      ) : (
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-red-500/40 px-2 py-0.5 rounded-full w-fit">Expired / Invalid</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Class</p>
                    <p className="font-black uppercase tracking-tight">{pass.class || 'Premium Economy'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">From</p>
                    <h2 className="text-4xl font-black tracking-tighter uppercase">DAC</h2>
                    <p className="text-xs font-bold opacity-80">Dhaka, BD</p>
                  </div>
                  <div className="flex flex-col items-center gap-2 mb-2">
                    <Plane className="w-6 h-6 rotate-90 opacity-40" />
                    <div className="w-24 h-[2px] bg-white/20 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full" />
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">To</p>
                    <h2 className="text-4xl font-black tracking-tighter uppercase">{pass.destination.substring(0, 3).toUpperCase()}</h2>
                    <p className="text-xs font-bold opacity-80">{pass.destination}</p>
                  </div>
                </div>
              </div>

              {/* Perforation Line */}
              <div className="relative h-8 bg-white flex items-center px-4">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-[#121212] rounded-r-full" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-[#121212] rounded-l-full" />
                <div className="w-full border-t-2 border-dashed border-black/10" />
              </div>

              {/* Bottom Section */}
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Passenger</p>
                    <p className="font-black uppercase tracking-tight">{pass.passengerName}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Date</p>
                    <p className="font-black uppercase tracking-tight">{pass.date}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Gate</p>
                    <p className="font-black uppercase tracking-tight">{pass.gate || 'G-24'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Seat</p>
                    <p className="font-black uppercase tracking-tight">{pass.seatNumber}</p>
                  </div>
                  {pass.expiryDate && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Expires</p>
                      <p className="font-black uppercase tracking-tight text-red-500">{pass.expiryDate}</p>
                    </div>
                  )}
                </div>

                <div className="pt-8 border-t border-black/5 flex flex-col items-center gap-6">
                  <div className="p-4 bg-black/5 rounded-3xl">
                    <QrCode className="w-32 h-32 text-black opacity-80" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Booking Reference</p>
                    <p className="font-mono font-black text-lg tracking-widest">{pass.bookingId.substring(0, 8).toUpperCase()}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 py-5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black tracking-widest uppercase text-xs transition-all flex items-center justify-center gap-3 border border-white/10"
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Download PDF
                </>
              )}
            </button>
            <button className="flex-1 py-5 bg-[#7371ff] hover:bg-[#6361ff] rounded-2xl font-black tracking-widest uppercase text-xs transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#7371ff]/20">
              <Share2 className="w-4 h-4" /> Share Pass
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
