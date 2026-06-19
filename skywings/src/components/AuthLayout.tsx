import React from 'react';
import { motion } from 'motion/react';
import RadarIllustration from './RadarIllustration';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Left Column: Illustration */}
      <div className="hidden md:flex md:w-1/2 bg-white items-center justify-center p-12 overflow-hidden">
        <div className="w-full max-w-2xl aspect-square relative">
          <RadarIllustration />
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-24">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-800 mb-2">{title}</h1>
            <p className="text-slate-400 text-lg font-medium">{subtitle}</p>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
