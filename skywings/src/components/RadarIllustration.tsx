import React from 'react';
import { MapPin } from 'lucide-react';
import { motion } from 'motion/react';

export default function RadarIllustration() {
  const circles = [1, 2, 3, 4];
  const pins = [
    { circle: 0, angle: 45 },
    { circle: 1, angle: -30 },
    { circle: 1, angle: 120 },
    { circle: 2, angle: 180 },
    { circle: 2, angle: 60 },
    { circle: 3, angle: -90 },
    { circle: 3, angle: 210 },
    { circle: 3, angle: 10 },
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Concentric Circles */}
      {circles.map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.1, duration: 0.8 }}
          className="absolute border-2 border-brand/40 rounded-full"
          style={{
            width: `${(i + 1) * 25}%`,
            aspectRatio: '1/1',
          }}
        />
      ))}

      {/* Pins */}
      {pins.map((pin, i) => {
        const radius = (pin.circle + 1) * 12.5; // percentage radius
        const x = Math.cos((pin.angle * Math.PI) / 180) * radius;
        const y = Math.sin((pin.angle * Math.PI) / 180) * radius;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.05 }}
            className="absolute text-brand"
            style={{
              left: `calc(50% + ${x}%)`,
              top: `calc(50% + ${y}%)`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="bg-white rounded-full p-0.5 shadow-sm">
              <MapPin className="w-5 h-5 fill-brand text-white" />
            </div>
          </motion.div>
        );
      })}

      {/* Airplane */}
      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, duration: 1, type: 'spring' }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center"
      >
        <div className="relative">
          <img
            src="https://i.postimg.cc/brctSf0d/Airplane-Png-(1).png"
            alt="Airplane Logo"
            className="w-full h-auto"
            referrerPolicy="no-referrer"
          />
        </div>
      </motion.div>
    </div>
  );
}
