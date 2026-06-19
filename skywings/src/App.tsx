/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Signin from './pages/Signin';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import PackageBooking from './pages/PackageBooking';
import BookingDetails from './pages/BookingDetails';
import Payment from './pages/Payment';
import BoardingPass from './pages/BoardingPass';
import Packages from './pages/Packages';
import AdminPanel from './pages/AdminPanel';
import AIAssistant from './components/AIAssistant';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/home" element={<Home />} />
        <Route path="/package-booking/:packageId" element={<PackageBooking />} />
        <Route path="/booking-details/:bookingId" element={<BookingDetails />} />
        <Route path="/payment/:bookingId" element={<Payment />} />
        <Route path="/boarding-pass/:bookingId" element={<BoardingPass />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/" element={<Navigate to="/signin" replace />} />
      </Routes>
      <AIAssistant />
    </Router>
  );
}
