import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Compass, Users, MapPin, CreditCard, ChevronRight, Globe, ArrowRight, Zap } from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: Users,
      title: "Real-Time Collaboration",
      desc: "Co-create itineraries and plan routes side-by-side with your travel companions using active drag-and-drop boards.",
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      icon: MapPin,
      title: "Interactive Itinerary Board",
      desc: "Chronologically sequence attractions, hotels, food spots, and flights across days with category coding.",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: CreditCard,
      title: "Smarter Bill Splitting",
      desc: "Split group hotel bills, transit, and dinners equally or with custom amounts, and settle debts greedily.",
      color: "bg-amber-50 text-amber-600",
    },
    {
      icon: Compass,
      title: "Gemini Smart Suggestions",
      desc: "Receive instant, budget-tailored spot recommendations from local chefs and travel experts for any city on Earth.",
      color: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Navbar */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Globe className="h-6 w-6 animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Co<span className="text-indigo-600">Route</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg"
              id="nav-login-btn"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-100"
              id="nav-register-btn"
            >
              Start Planning
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-6">
            <Zap className="h-3 w-3 h-3 fill-indigo-500" />
            Empowered with Gemini-3.5-Flash
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight mb-6">
            Plan your next collective adventure <span className="text-indigo-600">in real-time</span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto mb-10">
            CoRoute brings friends, itineraries, maps, suggestions, and dinner splits together into a single, cohesive canvas. Stop emailing spreadsheets. Start exploring together.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-8 py-4 rounded-2xl transition-all hover:shadow-xl hover:shadow-indigo-100 group"
              id="hero-cta-register"
            >
              Create Collaborative Trip
              <ArrowRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center bg-white hover:bg-slate-50 text-slate-800 font-medium px-8 py-4 rounded-2xl border border-slate-200 shadow-sm transition-colors"
              id="hero-cta-demo"
            >
              Start Demo
            </Link>
          </div>
        </motion.div>

        {/* Hero Banner Graphic */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-5xl mt-16 rounded-3xl overflow-hidden border border-slate-200 shadow-2xl relative aspect-[16/9]"
        >
          <img
            src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600"
            alt="Travel inspiration"
            className="w-full h-full object-cover filter brightness-[0.8]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-900/10 to-transparent flex flex-col justify-end p-8 md:p-12">
            <div className="max-w-md text-white">
              <span className="text-xs uppercase font-bold tracking-widest text-amber-400">Featured Destination</span>
              <h3 className="text-2xl md:text-3xl font-extrabold mb-2">Autumn Escape</h3>
              <p className="text-sm md:text-base text-slate-200">
                Explore thousands of shrines, tea cafes, and vibrant bamboo groves together with real-time budget synchronization.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Animated Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mt-20 border-t border-slate-200 pt-12">
          <div className="text-center">
            <div className="text-4xl font-extrabold text-indigo-600 mb-1">12,400+</div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Trips Planned</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-extrabold text-indigo-600 mb-1">48,900+</div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Group Members Joined</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-extrabold text-indigo-600 mb-1">99.8%</div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Dinner Settle Accuracy</div>
          </div>
        </div>

        {/* Features Grid */}
        <section className="w-full max-w-6xl mt-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Pack your suitcases. We handle the rest.</h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              Everything couples, groups, and families need for a friction-free itinerary in one beautiful visual canvas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feat, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 ${feat.color}`}>
                    <feat.icon className="h-6 w-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">{feat.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-bold text-indigo-600 cursor-pointer hover:text-indigo-800">
                  Learn more <ChevronRight className="h-3 w-3" />
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-28 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Globe className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              CoRoute
            </span>
          </div>

          <p className="text-xs text-slate-500">
            © 2026 CoRoute Inc. All rights reserved. Crafting beautiful visual travel coordinates across the hemisphere.
          </p>

          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
            <a href="#" className="hover:text-white transition-colors">API Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
