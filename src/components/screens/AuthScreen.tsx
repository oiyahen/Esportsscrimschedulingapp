import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Chrome, Swords } from 'lucide-react';
import { supabase } from '../../lib/supabaseclient';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type Mode = 'login' | 'signup';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const isLogin = mode === 'login';

  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit =
    !loading &&
    !!email.trim() &&
    password.length >= 6 &&
    (isLogin ? true : !!name.trim());

  const handleLogin = async () => {
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setMessage(null);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: trimmedName ? { data: { full_name: trimmedName } } : undefined,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Account created. You can now log in.');
    setMode('login');
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessage('Enter your email above first.');
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Password reset email sent (if that address exists).');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (isLogin) await handleLogin();
    else await handleSignup();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/20">
              <div className="w-12 h-12 border-2 border-white rounded-lg" />
            </div>
            <h1 className="text-3xl mb-2">Scrim Center</h1>
            <p className="text-gray-400">The Scrim OS for Challengers</p>
          </div>

          {/* Card */}
          <Card className="p-6 lg:p-8 w-full">
            {/* Toggle */}
            <div className="flex gap-2 p-1 bg-gray-900/50 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-lg transition-all text-sm ${
                  isLogin
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Log In
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-lg transition-all text-sm ${
                  !isLogin
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-sm text-gray-400 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              {/* Email (icon INSIDE bubble, left of text) */}
              <div>
                <label htmlFor="email" className="block text-sm text-gray-400 mb-2">
                  Email
                </label>
                <div className="flex items-center gap-3 w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl focus-within:border-blue-500 transition-colors">
                  <Mail className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password (icon + input + eye all INSIDE bubble) */}
              <div>
                <label htmlFor="password" className="block text-sm text-gray-400 mb-2">
                  Password
                </label>
                <div className="flex items-center gap-3 w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl focus-within:border-blue-500 transition-colors">
                  <Lock className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-gray-500 hover:text-gray-400 transition-colors flex-shrink-0"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Min 6 characters.</p>
              </div>

              {/* Forgot password */}
              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {message && <p className="text-sm text-gray-300">{message}</p>}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-purple-500"
                disabled={!canSubmit}
              >
                {loading ? 'Please wait…' : isLogin ? 'Log In' : 'Create Account'}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-sm text-gray-500">or continue with</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Social */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 hover:bg-gray-900 transition-all"
              >
                <Chrome className="w-5 h-5 text-gray-300" />
                <span className="text-sm text-gray-200">Google</span>
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 hover:bg-gray-900 transition-all"
              >
                <Swords className="w-5 h-5 text-gray-300" />
                <span className="text-sm text-gray-200">Faceit</span>
              </button>
            </div>

            {!isLogin && (
              <p className="text-xs text-gray-500 text-center mt-6">
                By signing up, you agree to our{' '}
                <button type="button" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Privacy Policy
                </button>
                .
              </p>
            )}
          </Card>

          {/* Demo */}
          <div className="mt-6 p-4 bg-gray-900/30 border border-gray-800/50 rounded-xl">
            <p className="text-xs text-gray-500 text-center">
              <span className="text-gray-400">Demo:</span> demo@scrimcenter.com / password123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
