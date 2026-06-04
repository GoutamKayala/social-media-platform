import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { User } from "../types";
import { motion } from "motion/react";
import { Mail, Lock, User as UserIcon, Type, ArrowRight, Facebook, Chrome, Key, Eye, EyeOff, Video, ShieldCheck } from "lucide-react";

interface AuthProps {
  onAuthSuccess: (user: User) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function Auth({ onAuthSuccess, showToast }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    setEmail("");
    setPassword("");
    setUsername("");
    setDisplayName("");
    setIsVerifying(false);
  }, [isLogin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {


      if (isLogin) {
        const res = await api.login({ email, password });
        showToast(`Welcome back, ${res.user.displayName}!`, "success");
        onAuthSuccess(res.user);
      } else {
        if (!username || !displayName || !email || !password) {
          showToast("All fields are required", "error");
          setLoading(false);
          return;
        }
        const res = await api.register({ username, displayName, email, password });
        showToast(`Account created! Welcome ${res.user.displayName}`, "success");
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      showToast(err.message || "Authentication failed", "error");
    } finally {
      setLoading(false);
    }
  }



  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-gray-50 dark:bg-gray-950 transition-colors duration-250">
      {/* Visual Identity Left Column (Hidden on mobile) */}
      <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-12 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white overflow-hidden">
        {/* Abstract shapes overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-300 via-indigo-200 to-indigo-900 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/30 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 font-sans font-bold text-2xl tracking-tight">
            <span className="bg-white text-indigo-700 w-9 h-9 rounded-xl flex items-center justify-center font-extrabold shadow-md">C</span>
            ConnectHub
          </div>
        </div>

        <div className="relative z-10 my-auto pr-6">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4 leading-tight">
            Share your thoughts, images, and videos.
          </h1>
          <p className="text-indigo-100 text-lg font-medium leading-relaxed">
            Connect with people around the world, share your daily moments, and discuss what matters to you.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-indigo-200 border-t border-indigo-500/20 pt-6">
          <span>© 2026 ConnectHub Inc.</span>
          <span className="flex gap-4">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Guidelines</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">Privacy</a>
          </span>
        </div>
      </div>

      {/* Forms Right Column */}
      <div className="col-span-12 lg:col-span-7 flex items-center justify-center p-6 sm:p-12 self-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl dark:shadow-2xl backdrop-blur-md"
        >
          {/* Logo on mobile view */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="bg-indigo-600 text-white w-9 h-9 rounded-xl flex items-center justify-center font-extrabold shadow-md">C</div>
            <span className="font-sans font-extrabold text-xl dark:text-white">ConnectHub</span>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
              {isLogin
                ? "Sign in to your account"
                : "Join our social network"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {isLogin
                ? "Connect with people and share your life"
                : "Fill in the parameters below to get started"}
            </p>
          </div>

          {/* Tabs for Login / Register */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6 relative">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isLogin
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              id="tab-login"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isLogin
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              id="tab-signup"
            >
              Sign Up
            </button>
          </div>
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name - SignUp only */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Type className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Liam Sterling"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent dark:text-white text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                    id="input-display-name"
                  />
                </div>
              </div>
            )}

            {/* Username - SignUp only */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. liamdev"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent dark:text-white text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                    id="input-username"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent dark:text-white text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                  id="input-email"
                />
              </div>
            </div>

            {/* Password */}
            {!isLogin && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent dark:text-white text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                    id="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    id="btn-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}


            {/* Password Login special */}
            {isLogin && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent dark:text-white text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                    id="input-password-login"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    id="btn-toggle-password-login"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-semibold shadow-md text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
              id="btn-auth-submit"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isLogin ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>


        </motion.div>
      </div>
    </div>
  );
}
