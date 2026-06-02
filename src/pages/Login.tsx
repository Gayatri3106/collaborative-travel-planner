import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { LogIn, Mail, Lock, Globe, AlertCircle, ArrowRight, UserCheck } from "lucide-react";
import { authAPI } from "../services/api.js";

interface DemoAccount {
  name: string;
  email: string;
  pic: string;
  role: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("expired")) {
      setError("Your login token has expired. Please sign in again.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await authAPI.login({ email, password });
      
      // Save credentials locally
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setSuccessMsg(`Welcome back, ${data.user.name}!`);
      setTimeout(() => {
        navigate("/dashboard");
      }, 800);
    } catch (err: any) {
      console.error("Login failure:", err);
      setError(err?.response?.data?.error || "Invalid email or master password combination.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authAPI.login({ email: demoEmail, password: "password123" });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setSuccessMsg(`Logged in as ${data.user.name} (Demo Partner)!`);
      setTimeout(() => {
        navigate("/dashboard");
      }, 800);
    } catch (err: any) {
      setError("Demo credentials authorization issue.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInSimulate = () => {
    setLoading(true);
    setError(null);
    // Seamless simulation of OAuth redirect callback
    setTimeout(() => {
      handleQuickLogin("alex@travelplanner.com");
    }, 600);
  };

  const demoAccounts: DemoAccount[] = [
    {
      name: "Alex (Trip Creator & Owner)",
      email: "alex@travelplanner.com",
      pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
      role: "OWNER",
    },
    {
      name: "Bob (Collaborative Editor)",
      email: "bob@travelplanner.com",
      pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50",
      role: "EDITOR",
    },
    {
      name: "Chloe (Spectator & Viewer)",
      email: "chloe@travelplanner.com",
      pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50",
      role: "VIEWER",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Decorative left panel for wide screens */}
      <div className="hidden md:flex md:w-5/12 bg-indigo-600 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800"
            alt="Scenic Kyoto"
            className="w-full h-full object-cover opacity-20 transform scale-110"
          />
          <div className="absolute inset-0 bg-indigo-900/60 mix-blend-multiply" />
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-white text-indigo-600 flex items-center justify-center font-black">
            <Globe className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">CoRoute</span>
        </div>

        <div className="relative z-10">
          <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-200">Shared Memories</span>
          <h2 className="text-4xl font-extrabold mt-2 mb-4 leading-tight">
            Connect. Schedule. Explore together.
          </h2>
          <p className="text-indigo-100 text-base leading-relaxed">
            Planning with companions shouldn't be work. Join thousands of travelers sharing day boards, real-time chats, and smart meal budget splits instantly.
          </p>
        </div>

        <p className="relative z-10 text-xs text-indigo-200">
          © 2026 CoRoute Inc. All rights reserved.
        </p>
      </div>

      {/* Right form container */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 lg:p-24">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo element for mobile */}
          <div className="flex md:hidden items-center gap-2 mb-8 justify-center">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Globe className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-950">CoRoute</span>
          </div>

          <div className="text-center md:text-left mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Welcome Back</h1>
            <p className="text-sm text-slate-500">
              Sign in with your email or use our instant demo travelers below.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm flex items-start gap-2.5">
              <UserCheck className="h-5 w-5 shrink-0 mt-0.5 animate-bounce" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  placeholder="alex@travelplanner.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm shadow-sm"
                  id="email-input"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Password
                </label>
                <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  placeholder="Enter your master password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm shadow-sm"
                  id="password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-medium py-4 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              id="login-submit-btn"
            >
              {loading ? "Authenticating..." : "Sign In"}
              <LogIn className="h-4 w-4" />
            </button>
          </form>

          {/* Styled Google OAuth button */}
          <div className="relative my-8 text-center">
            <span className="absolute inset-0 border-t border-slate-200 top-1/2 transform -translate-y-1/2" />
            <span className="relative z-10 px-4 bg-[#F8FAFC] text-xs font-bold tracking-widest text-slate-400 uppercase">
              Or Connect With
            </span>
          </div>

          <button
            onClick={handleGoogleSignInSimulate}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3.5 px-4 rounded-2xl border border-slate-200 shadow-sm transition-all focus:outline-none cursor-pointer text-sm"
            id="google-oauth-btn"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google Identity Context
          </button>

          {/* Quick Logins for demo convenience */}
          <div className="mt-10 p-5 rounded-2xl border border-slate-200/60 bg-slate-50/50">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-4 text-center">
              CoRoute Quick-Login Demo Partners
            </h4>
            <div className="space-y-3">
              {demoAccounts.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickLogin(acc.email)}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 shadow-sm text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={acc.pic}
                      alt={acc.name}
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-full border border-slate-100 object-cover"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">{acc.name}</div>
                      <div className="text-[10px] text-slate-400 group-hover:text-indigo-500 font-mono">
                        {acc.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold tracking-wider capitalize">
                      {acc.role.toLowerCase()}
                    </span>
                    <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              New to CoRoute?{" "}
              <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                Create free trial account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
