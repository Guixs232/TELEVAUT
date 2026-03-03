import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  MessageSquare, 
  Wifi, 
  ChevronRight, 
  ChevronLeft, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  Info,
  Cloud,
  ArrowRight,
  Upload,
  Shield,
  Loader2,
  Lock
} from 'lucide-react';

interface OnboardingProps {
  userId: number;
  onComplete: () => void;
}

export default function Onboarding({ userId, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSendCode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/telegram/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, apiId, apiHash, phoneNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        nextStep();
      } else {
        setError(data.error || 'Failed to send code');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/telegram/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requiresPassword) {
          setRequiresPassword(true);
          nextStep();
        } else {
          onComplete();
        }
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FA = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/telegram/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onComplete();
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        {/* Progress Bar */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-blue-500' : 'w-4 bg-zinc-800'}`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="w-24 h-24 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-blue-500/20 shadow-2xl shadow-blue-500/10">
                <Cloud className="w-12 h-12 text-blue-500" />
              </div>
              <h1 className="text-4xl font-black mb-4 tracking-tighter">TeleVault Cloud</h1>
              <p className="text-zinc-500 mb-12 leading-relaxed font-medium">
                Connect your Telegram account to unlock unlimited cloud storage powered by MTProto.
              </p>

              <div className="bg-zinc-900/30 backdrop-blur-xl border border-zinc-800/50 rounded-[2rem] p-8 text-left mb-10 shadow-inner">
                <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-6">Requirements</h3>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 shadow-lg">
                      <Key className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-black">API Credentials</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">From my.telegram.org</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 shadow-lg">
                      <Shield className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-black">Secure Access</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">End-to-end encrypted</p>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={nextStep}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 group shadow-xl shadow-blue-500/20"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-black mb-2 tracking-tighter">API Credentials</h2>
              <p className="text-zinc-500 mb-10 text-sm font-medium">
                Enter your Telegram API details to establish a secure MTProto connection.
              </p>

              <div className="space-y-4 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-4">API ID</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      <Key className="w-5 h-5" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="1234567"
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-bold"
                      value={apiId}
                      onChange={(e) => setApiId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-4">API Hash</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      <Shield className="w-5 h-5" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="abcdef123456..."
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-mono text-sm"
                      value={apiHash}
                      onChange={(e) => setApiHash(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-4">Phone Number</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="+55 11 99999-9999"
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-bold"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-6 bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={prevStep} className="flex-1 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl font-bold hover:bg-zinc-800 transition-all">Back</button>
                <button 
                  onClick={handleSendCode}
                  disabled={isLoading || !apiId || !apiHash || !phoneNumber}
                  className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Send Code
                </button>
              </div>

              <div className="mt-8 text-center">
                <button 
                  onClick={() => {
                    localStorage.removeItem('televault_user');
                    window.location.reload();
                  }}
                  className="text-[10px] font-black text-zinc-600 hover:text-red-500 uppercase tracking-[0.2em] transition-colors"
                >
                  Stale Session? Logout and try again
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-black mb-2 tracking-tighter">Enter Code</h2>
              <p className="text-zinc-500 mb-10 text-sm font-medium">
                Enter the 5-digit code sent to your Telegram account.
              </p>

              <div className="space-y-2 mb-8">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-4">Verification Code</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Key className="w-5 h-5" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="00000"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-6 pl-12 pr-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-center tracking-[1.5em] text-2xl font-black"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={5}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-6 bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={prevStep} className="flex-1 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl font-bold hover:bg-zinc-800 transition-all">Back</button>
                <button 
                  onClick={handleSignIn}
                  disabled={isLoading || code.length < 5}
                  className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Verify Code
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && requiresPassword && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-black mb-2 tracking-tighter">2FA Security</h2>
              <p className="text-zinc-500 mb-10 text-sm font-medium">
                Your account has Two-Step Verification enabled. Please enter your cloud password.
              </p>

              <div className="space-y-2 mb-8">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-4">Cloud Password</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-bold"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-6 bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={prevStep} className="flex-1 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl font-bold hover:bg-zinc-800 transition-all">Back</button>
                <button 
                  onClick={handle2FA}
                  disabled={isLoading || !password}
                  className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Complete Login
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
