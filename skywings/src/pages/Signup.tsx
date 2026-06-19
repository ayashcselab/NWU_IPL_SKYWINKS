import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import AuthLayout from '../components/AuthLayout';
import { Loader2, AlertCircle } from 'lucide-react';
import { getFriendlyErrorMessage, isValidEmail, isValidPassword } from '../lib/auth-utils';
import { Tooltip } from '../components/Tooltip';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ displayName: '', email: '', password: '' });
  const navigate = useNavigate();

  const validateForm = () => {
    const errors = { displayName: '', email: '', password: '' };
    let isValid = true;

    if (!displayName.trim()) {
      errors.displayName = 'Full name is required.';
      isValid = false;
    }

    if (!email) {
      errors.email = 'Email address is required.';
      isValid = false;
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address.';
      isValid = false;
    }

    if (!password) {
      errors.password = 'Password is required.';
      isValid = false;
    } else if (!isValidPassword(password)) {
      errors.password = 'Password must be at least 6 characters.';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName });

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        loyaltyPoints: 0,
        preferences: [],
        createdAt: serverTimestamp(),
      });

      navigate('/home');
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          loyaltyPoints: 0,
          preferences: [],
          createdAt: serverTimestamp(),
        });
      }

      navigate('/home');
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Join us Now!!" subtitle="Let's Create your account">
      <form onSubmit={handleSignup} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}
        
        <div>
          <label className="input-label">Full Name</label>
          <input
            type="text"
            className={`input-field-new ${fieldErrors.displayName ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="John Doe"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (fieldErrors.displayName) setFieldErrors({ ...fieldErrors, displayName: '' });
            }}
          />
          {fieldErrors.displayName && (
            <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {fieldErrors.displayName}
            </p>
          )}
        </div>

        <div>
          <label className="input-label">Email Address</label>
          <input
            type="email"
            className={`input-field-new ${fieldErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="username@gmail.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
            }}
          />
          {fieldErrors.email && (
            <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label className="input-label">Password</label>
          <input
            type="password"
            className={`input-field-new ${fieldErrors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="*******"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
            }}
          />
          {fieldErrors.password && (
            <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {fieldErrors.password}
            </p>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-brand disabled:opacity-70 disabled:cursor-not-allowed">
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin w-5 h-5" />
              <span>Creating account...</span>
            </div>
          ) : (
            'Sign Up'
          )}
        </button>

        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-slate-400 text-sm font-medium">OR</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <Tooltip content="Sign up with Google for faster access and profile synchronization across all your devices.">
          <button 
            type="button" 
            onClick={handleGoogleSignin} 
            disabled={loading} 
            className="btn-outline disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
            Continue with Google
          </button>
        </Tooltip>

        <p className="text-center text-slate-500 text-sm mt-8">
          Already have an Account!?{' '}
          <Link to="/signin" className="text-brand font-bold hover:underline">
            Sign-in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
