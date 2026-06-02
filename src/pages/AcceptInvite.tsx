import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { Globe, ShieldCheck, AlertCircle, Sparkles } from "lucide-react";
import { tripAPI } from "../services/api.js";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [targetTripId, setTargetTripId] = useState("");

  useEffect(() => {
    const userLocal = localStorage.getItem("user");
    if (!userLocal) {
      // Force user to log in or register first, then they can return and accept!
      localStorage.setItem("pendingInviteToken", token || "");
      navigate(`/login?expired=true&invite=${token}`);
      return;
    }

    if (token) {
      tripAPI
        .acceptInvite(token)
        .then((res) => {
          setSuccess(true);
          setTargetTripId(res.tripId);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError(err?.response?.data?.error || "Invitation link is invalid or has already been redeemed.");
          setLoading(false);
        });
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-xl text-center"
      >
        <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-6">
          <Globe className="h-6 w-6 animate-spin" />
        </div>

        {loading ? (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Redeeming Expedition Invitation...</h2>
            <p className="text-xs text-slate-500">Checking credentials and linking permissions inside the database.</p>
          </div>
        ) : error ? (
          <div>
            <div className="h-10 w-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Invitation Link Issue</h2>
            <p className="text-xs text-slate-500 mb-6">{error}</p>
            <Link
              to="/dashboard"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-3 rounded-xl shadow transition-all block"
            >
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-950 mb-1">Joined Successfully! ✨</h2>
            <p className="text-xs text-slate-500 mb-6">
              You are now added as a registered collaborator onto the trip board. Prepare to organize travel coordinates with companions in real-time.
            </p>
            <button
              onClick={() => navigate(`/trips/${targetTripId}`)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-3 rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Open Shared Trip Board
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
