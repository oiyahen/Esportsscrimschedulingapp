import { useState } from 'react';
import { supabase } from '../../lib/supabaseclient';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type Mode = 'login' | 'signup';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
    
  const handleLogin = async () => {
    setLoading(true);
    setMessage(null);

    console.log('[Auth] Attempting login…');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      console.error('[Auth] Login error:', error);
      setMessage(error.message);
      return;
    }

    console.log('[Auth] Login successful.');
  };

  const handleSignup = async () => {
  setLoading(true);
  setMessage(null);

  console.log('[Auth] Attempting signup…');

  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  setLoading(false);

  if (error) {
    console.error('[Auth] Signup error:', error);
    setMessage(error.message);
    return;
  }

  setMessage('Account created. You can now log in.');
};


  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-6 lg:p-8">
          <div className="mb-5">
            <h1 className="text-2xl">{mode === 'login' ? 'Log in' : 'Sign up'}</h1>
            <p className="text-gray-400 text-sm mt-1">
              {mode === 'login'
                ? 'Welcome back. Log in to continue.'
                : 'Create an account to start using Scrim Center.'}
            </p>
          </div>

          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm border ${
                mode === 'login'
                  ? 'bg-white/10 border-gray-700'
                  : 'bg-transparent border-gray-800 text-gray-400'
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm border ${
                mode === 'signup'
                  ? 'bg-white/10 border-gray-700'
                  : 'bg-transparent border-gray-800 text-gray-400'
              }`}
            >
              Sign up
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                className="w-full px-3 py-2 rounded-xl bg-gray-900/50 border border-gray-800 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Password</label>
              <input
                className="w-full px-3 py-2 rounded-xl bg-gray-900/50 border border-gray-800 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <p className="text-xs text-gray-500 mt-1">Min 6 characters.</p>
            </div>
          </div>

          {message && <p className="text-sm text-gray-300 mt-4">{message}</p>}

          <div className="mt-6">
            <Button
              className="w-full"
              onClick={mode === 'login' ? handleLogin : handleSignup}
              disabled={loading || !email.trim() || password.length < 6}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
