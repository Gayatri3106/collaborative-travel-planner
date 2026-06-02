import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  Plus,
  MapPin,
  Calendar,
  DollarSign,
  Compass,
  LogOut,
  ChevronRight,
  Sparkles,
  HelpCircle,
  FolderPlus,
  X
} from "lucide-react";

import { fetchTrips, createNewTrip } from "../store/tripSlice.js";
import { AppDispatch, RootState } from "../store/index.js";
import { Trip } from "../types.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { trips, loading, error } = useSelector((state: RootState) => state.trips);
  const [user, setUser] = useState<any>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("2000");
  const [currency, setCurrency] = useState("USD");
  const [coverImage, setCoverImage] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (!localUser) {
      navigate("/login");
      return;
    }
    setUser(JSON.parse(localUser));
    dispatch(fetchTrips());
  }, [dispatch, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleCreateTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !destination || !startDate || !endDate) {
      setCreateError("All core trip parameters (title, location, and dates) are required.");
      return;
    }

    setCreateError(null);
    try {
      const resultAction = await dispatch(
        createNewTrip({
          title,
          destination,
          startDate,
          endDate,
          budget: Number(budget),
          currency,
          coverImage,
        })
      );

      if (createNewTrip.fulfilled.match(resultAction)) {
        const newlyCreated: Trip = resultAction.payload;
        setShowModal(false);
        // Clear params
        setTitle("");
        setDestination("");
        setStartDate("");
        setEndDate("");
        setBudget("2000");
        setCoverImage("");
        
        // Redirect right into the interactive trip planner!
        navigate(`/trips/${newlyCreated.id}`);
      } else {
        setCreateError(resultAction.payload as string);
      }
    } catch (err) {
      setCreateError("Connection failure while logging the trip.");
    }
  };

  // Preset travel backgrounds for quick select on cover image
  const coverPresets = [
    { name: "Bamboo Forest", url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800" },
    { name: "Roman Coliseum", url: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800" },
    { name: "Parisian Arch", url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800" },
    { name: "Sandy Coastline", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Dashboard Top Header bar */}
      <header className="sticky top-0 z-40 glass shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              <Globe className="h-5 w-5 animate-pulse" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">CoRoute</span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3 bg-white/60 pl-3 pr-4 py-1.5 rounded-full border border-slate-200">
                <img
                  src={user.profilePic}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 rounded-full shadow-sm object-cover"
                />
                <span className="text-xs font-bold text-slate-800">{user.name}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2.5 bg-white hover:bg-red-50 hover:text-red-600 rounded-xl text-slate-400 border border-slate-200 hover:border-red-100 transition-all cursor-pointer"
              title="Logout session"
              id="dashboard-logout-btn"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
              Where to next{user ? `, ${user.name.split(" ")[0]}` : ""}? ✈️
            </h1>
            <p className="text-sm text-slate-500">
              Co-create coordinates, schedule events, and divide billing with friends.
            </p>
          </div>

          <button
            onClick={() => {
              setCreateError(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5  py-3.5 rounded-2xl shadow-md shadow-indigo-100 hover:shadow-lg transition-all cursor-pointer"
            id="create-trip-modal-trigger"
          >
            <Plus className="h-5 w-5" />
            Plan New Trip
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            {error}. Try refreshing the page.
          </div>
        )}

        {/* Trips Load states / lists */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((skeleton) => (
              <div key={skeleton} className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm animate-pulse h-80 flex flex-col justify-between p-6">
                <div className="h-32 bg-slate-100 rounded-2xl mb-4" />
                <div className="h-6 bg-slate-100 rounded mb-2 w-2/3" />
                <div className="h-4 bg-slate-100 rounded mb-4 w-1/3" />
                <div className="h-10 bg-slate-100 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl max-w-2xl mx-auto shadow-sm">
            <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FolderPlus className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Journeys Yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-8">
              Every beautiful memory starts with a plan. Invite partners, outline days, and settle budgets securely by creating your first trip layout.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3.5 rounded-2xl transition-all cursor-pointer"
            >
              <Plus className="h-5 w-5" />
              Build Itinerary Layout
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trips.map((trip) => {
              // Format dates beautifully
              const start = new Date(trip.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const end = new Date(trip.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              
              return (
                <motion.div
                  key={trip.id}
                  whileHover={{ y: -6 }}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all h-full"
                >
                  {/* Card Cover with Overlay */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={trip.cover_image}
                      alt={trip.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-slate-900/10 to-transparent" />
                    
                    {/* Glassmorphic budget tag on image */}
                    <div className="absolute top-4 right-4 glass px-3 py-1.5 rounded-full text-xs font-bold text-slate-900 flex items-center gap-1 shadow-sm">
                      <DollarSign className="h-3 w-3" />
                      {trip.budget.toLocaleString()} {trip.currency}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 mb-2">
                        <MapPin className="h-3.5 w-3.5" />
                        {trip.destination}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug mb-1">
                        {trip.title}
                      </h3>

                      <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-6">
                        <Calendar className="h-3.5 w-3.5" />
                        {start} — {end}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                      {/* Stacked Member Avatars */}
                      <div className="flex items-center">
                        <div className="flex -space-x-2.5 overflow-hidden">
                          {/* Kyoto mock static backup avatar overlays if custom members aren't fetched */}
                          {[
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50",
                            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50",
                            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50",
                          ].slice(0, 3).map((avatarUrl, idx) => (
                            <img
                              key={idx}
                              src={avatarUrl}
                              alt="travel companion"
                              className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 ml-2">
                          Group
                        </span>
                      </div>

                      {/* Go into dashboard */}
                      <button
                        onClick={() => navigate(`/trips/${trip.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors group cursor-pointer"
                      >
                        Open Planner
                        <ChevronRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Slide-in Create Trip Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200/60 z-10"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-indigo-500 fill-indigo-100" />
                      Setup New Expedition
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Let's coordinate destinations, budgets and dates.</p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {createError && (
                  <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    <span>{createError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateTripSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      Trip Name / Occasion
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Summer Kyoto Adventure"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      Destination City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kyoto, Japan"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                        Total Shared Budget estimate
                      </label>
                      <input
                        type="number"
                        placeholder="3500"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner animate-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                        Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner appearance-none h-[46px]"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="JPY">JPY (¥)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>
                  </div>

                  {/* Aesthetic Pre-selected Covers */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                      Cover Picture Accent
                    </label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {coverPresets.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCoverImage(preset.url)}
                          className={`h-11 rounded-lg overflow-hidden border-2 transition-all relative ${
                            coverImage === preset.url ? "border-indigo-600 scale-[1.03]" : "border-transparent"
                          }`}
                        >
                          <img src={preset.url} alt={preset.name} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Paste Unsplash URL for custom background"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-xs focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-5 py-3 hover:bg-slate-100 rounded-xl text-slate-500 text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow transition-all cursor-pointer"
                    >
                      Validate & Build Plan
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
