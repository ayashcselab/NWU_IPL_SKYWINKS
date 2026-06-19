import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import AuthLayout from '../components/AuthLayout';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { getFriendlyErrorMessage, isValidEmail } from '../lib/auth-utils';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const validateForm = () => {
    if (!email) {
      setFieldError('Email address is required.');
      return false;
    } else if (!isValidEmail(email)) {
      setFieldError('Please enter a valid email address.');
      return false;
    }
    setFieldError('');
    return true;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot Password?" subtitle="No worries, we'll send you reset instructions.">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm border border-green-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="font-medium">Password reset link sent! Please check your email inbox.</p>
          </div>
        )}
        
        {!success ? (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="input-label">Email Address</label>
              <input
                type="email"
                className={`input-field-new ${fieldError ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="username@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError('');
                }}
              />
              {fieldError && (
                <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldError}
                </p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-brand disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span>Sending link...</span>
                </div>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-slate-500 mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button 
              onClick={() => setSuccess(false)}
              className="text-brand font-bold hover:underline"
            >
              Try another email
            </button>
          </div>
        )}

        <div className="pt-4 text-center">
          <Link to="/signin" className="inline-flex items-center gap-2 text-slate-500 hover:text-brand font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
