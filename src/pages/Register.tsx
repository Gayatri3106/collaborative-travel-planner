import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { UserPlus, User, Mail, Lock, Globe, AlertCircle, Sparkles } from "lucide-react";
import { authAPI } from "../services/api.js";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", // Alex
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", // Bob
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", // Chloe
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150", // Generic Male
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150", // Generic Female
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", // Boy
];

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please complete all fields to establish a user profile.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await authAPI.register({
        name,
        email,
        password,
        profilePic: selectedAvatar,
      });

      // Secure local login instantly
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Registration failed:", err);
      setError(err?.response?.data?.error || "Registration error. Email might already be loaded.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Visual side panel */}
      <div className="hidden md:flex md:w-5/12 bg-emerald-600 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800"
            alt="Beautiful shrine"
            className="w-full h-full object-cover opacity-20 transform scale-110"
          />
          <div className="absolute inset-0 bg-emerald-950/60 mix-blend-multiply" />
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-white text-emerald-600 flex items-center justify-center font-black">
            <Globe className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">CoRoute</span>
        </div>

        <div className="relative z-10">
          <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-200">Interactive Canvas</span>
          <h2 className="text-4xl font-extrabold mt-2 mb-4 leading-tight">
            Plan travels with absolute ease.
          </h2>
          <p className="text-emerald-100 text-sm leading-relaxed">
            Register your travel persona to craft drag-and-drop itinerary timelines, share real-time chat insights with friends, configure split expenses, and get instant suggestions from Gemini.
          </p>
        </div>

        <p className="relative z-10 text-xs text-emerald-200">
          © 2026 CoRoute Inc. All rights reserved.
        </p>
      </div>

      {/* Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 lg:p-24">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 mb-8 justify-center">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <Globe className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-950">CoRoute</span>
          </div>

          <div className="text-center md:text-left mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Create New Account</h1>
            <p className="text-sm text-slate-500">
              Complete details and match your avatar.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Travel Avatar selection card */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2.5">
                Select Your Travel Avatar
              </label>
              <div className="flex items-center justify-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 mb-1">
                <div className="relative">
                  <img
                    src={selectedAvatar}
                    alt="Active Avatar"
                    className="h-16 w-16 rounded-full ring-4 ring-indigo-500 shadow-md object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-indigo-500 rounded-full flex items-center justify-center text-white text-[10px] shadow">
                    <Sparkles className="h-3 w-3 h-3 fill-white" />
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((pic, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedAvatar(pic)}
                      className={`h-9 w-9 rounded-full overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 ${
                        selectedAvatar === pic ? "border-indigo-600 scale-105" : "border-transparent"
                      }`}
                    >
                      <img src={pic} alt="Avatar item" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Your Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm shadow-sm"
                  id="reg-name-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  placeholder="e.g. explorer@coroute.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm shadow-sm"
                  id="reg-email-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Choose Secure Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  placeholder="Master password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm shadow-sm"
                  id="reg-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-medium py-4 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              id="register-submit-btn"
            >
              {loading ? "Creating Account..." : "Create Account"}
              <UserPlus className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                Sign In instead
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
