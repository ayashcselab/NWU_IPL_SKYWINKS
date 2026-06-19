import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowLeft, MapPin, DollarSign, Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import PackageDetailsModal from '../components/PackageDetailsModal';
import { MOCK_PACKAGES, Package } from '../constants/mockData';

const Packages = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, 'packages'),
      where('status', '==', 'active'),
      orderBy('title', 'asc')
    );
    const fallbackQ = query(collection(db, 'packages'), orderBy('title', 'asc'));

    let unsubscribe: (() => void) | null = null;
    let isFallbackActive = false;

    const startListener = (currentQuery: any, isFallback: boolean = false) => {
      // Cleanup previous listener if it exists
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      const unsub = onSnapshot(currentQuery, (snapshot) => {
        const pkgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Package[];
        
        if (isFallback) {
          setPackages(pkgs.filter(p => p.status === 'active'));
        } else {
          setPackages(pkgs);
        }
        setLoading(false);
      }, (err) => {
        if (!isFallback && !isFallbackActive && err.message?.includes('requires an index')) {
          console.warn('Firestore index missing for active packages query. Falling back to client-side filtering.');
          isFallbackActive = true;
          startListener(fallbackQ, true);
        } else {
          console.error('Error fetching active packages:', err);
          setLoading(false);
        }
      });

      unsubscribe = unsub;
    };

    startListener(q);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const filteredPackages = (packages.length > 0 ? packages : MOCK_PACKAGES).filter(pkg => 
    pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.departure.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.arrival.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black">
      <Navbar />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div>
              <button 
                onClick={() => navigate('/home')}
                className="group flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-bold tracking-widest uppercase">Back to Home</span>
              </button>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
                ALL <span className="text-white/20">PACKAGES</span>
              </h1>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              <input 
                type="text"
                placeholder="Search destinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-white/30 transition-colors font-bold"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="col-span-full flex justify-center py-40">
                  <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin" />
                </div>
              ) : filteredPackages.length > 0 ? (
                filteredPackages.map((pkg, i) => (
                  <motion.div
                    key={pkg.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative h-[600px] rounded-[40px] overflow-hidden bg-white/5 border border-white/10"
                  >
                    <img 
                      src={(pkg as any).image || pkg.img} 
                      alt={pkg.title} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-60 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    
                    {/* Content */}
                    <div className="absolute inset-0 p-10 flex flex-col justify-end">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="px-4 py-1 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
                          <span className="text-[10px] font-black tracking-[0.2em] uppercase">{pkg.departure}</span>
                        </div>
                        <div className="w-4 h-[1px] bg-white/20" />
                        <div className="px-4 py-1 bg-white/10 backdrop-blur-xl rounded-full border border-white/20">
                          <span className="text-[10px] font-black tracking-[0.2em] uppercase">{pkg.arrival}</span>
                        </div>
                      </div>

                      <h3 className="text-4xl font-black tracking-tighter mb-4 leading-tight group-hover:translate-x-2 transition-transform duration-500">
                        {pkg.title}
                      </h3>

                      <div className="flex items-center justify-between pt-6 border-t border-white/10">
                        <div>
                          <p className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase mb-1">Starting From</p>
                          <p className="text-2xl font-black tracking-tighter">{pkg.price}</p>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setIsModalOpen(true);
                          }}
                          className="px-8 py-4 bg-white text-black font-black text-xs tracking-[0.2em] rounded-2xl hover:bg-[#7371ff] hover:text-white transition-all duration-300 active:scale-95"
                        >
                          BOOK NOW
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-40 text-center bg-white/5 rounded-[60px] border border-dashed border-white/10"
                >
                  <Globe className="w-20 h-20 text-white/10 mx-auto mb-6" />
                  <h3 className="text-3xl font-black tracking-tighter text-white/20 uppercase">No matching packages</h3>
                  <p className="text-white/40 mt-2">Try searching for a different destination or location.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <PackageDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedPackage={selectedPackage}
      />
    </div>
  );
};

export default Packages;
