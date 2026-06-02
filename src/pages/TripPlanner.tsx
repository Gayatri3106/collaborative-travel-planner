import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  ArrowLeft,
  Users,
  Plus,
  Compass,
  MapPin,
  Calendar,
  DollarSign,
  Send,
  MessageSquare,
  Sparkles,
  Map,
  X,
  CreditCard,
  Trash2,
  Edit2,
  Check,
  ChevronRight,
  Clock,
  UserPlus,
  Utensils,
  Bed,
  Car,
  Camera,
  Play,
  Pause,
  Search,
  Info
} from "lucide-react";

import { fetchTripById, addMemberToCurrentTrip, updateMemberInCurrentTrip, removeMemberFromCurrentTrip } from "../store/tripSlice.js";
import { setDays, moveActivityOptimistic, optimisticReorder } from "../store/itinerarySlice.js";
import { AppDispatch, RootState } from "../store/index.js";
import { itineraryAPI, tripAPI, chatAPI } from "../services/api.js";
import { useWebSocket } from "../hooks/useWebSocket.js";
import { usePlaceSuggestions } from "../hooks/usePlaceSuggestions.js";
import { Activity, TripMember } from "../types.js";

export default function TripPlanner() {
  const { id: tripId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { currentTrip, loading, error } = useSelector((state: RootState) => state.trips);
  const { days } = useSelector((state: RootState) => state.itinerary);

  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"itinerary" | "map" | "suggestions">("itinerary");

  // Chat Section
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Invite Section
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("EDITOR");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [lastToken, setLastToken] = useState("");

  // Suggestion filters
  const [suggCategory, setSuggCategory] = useState<string>("attraction");
  const [suggBudget, setSuggBudget] = useState<string>("$$");

  // Activity Edit Form Modal
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [targetDayId, setTargetDayId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actLoc, setActLoc] = useState("");
  const [actStart, setActStart] = useState("12:00");
  const [actEnd, setActEnd] = useState("13:00");
  const [actCategory, setActCategory] = useState<"food" | "transport" | "hotel" | "attraction">("attraction");

  // HTML5 Drag States
  const [draggedActId, setDraggedActId] = useState<string | null>(null);
  const [draggedSourceDayId, setDraggedSourceDayId] = useState<string | null>(null);
  const [dragOverDayId, setDragOverDayId] = useState<string | null>(null);

  // Active Map Pin select
  const [selectedMapPin, setSelectedMapPin] = useState<string | null>(null);

  // New Interactive states (Map filtering, active vector path animation, Gemini guide query filter)
  const [mapDayFilter, setMapDayFilter] = useState<string>("all");
  const [isSimulatingRoute, setIsSimulatingRoute] = useState(false);
  const [simulatingIndex, setSimulatingIndex] = useState(-1);
  const [geminiSearchQuery, setGeminiSearchQuery] = useState("");

  // WebSocket Integration
  const handleItineraryReload = () => {
    if (tripId) {
      dispatch(fetchTripById(tripId));
    }
  };

  const handleNewChatMessage = (msg: any) => {
    setMessages((prev) => [...prev, msg].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i));
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const { onlineUserIds, isConnected, sendMessage: wsSendMessage } = useWebSocket(
    tripId,
    user?.id,
    handleItineraryReload,
    handleNewChatMessage
  );

  // Read User and Load Trip details
  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (!localUser) {
      navigate("/login");
      return;
    }
    setUser(JSON.parse(localUser));

    if (tripId) {
      dispatch(fetchTripById(tripId));
      chatAPI.getMessages(tripId).then((res) => {
        setMessages(res);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      });
    }
  }, [tripId, dispatch, navigate]);

  // Sync state with Itinerary slices
  useEffect(() => {
    if (currentTrip && currentTrip.itinerary) {
      dispatch(setDays(currentTrip.itinerary));
    }
  }, [currentTrip, dispatch]);

  // Read suggestions debounced
  const destinationName = currentTrip?.destination || "";
  const { data: suggestions, loading: suggestionsLoading } = usePlaceSuggestions(
    destinationName,
    suggCategory,
    suggBudget
  );

  // Permissions validation
  const currentUserRole = currentTrip?.members?.find((m) => m.user_id === user?.id)?.role || "VIEWER";
  const isWritable = currentUserRole === "OWNER" || currentUserRole === "EDITOR";

  // Compile coordinates map list for pins visualization with descriptions included
  const pinsList = (days || []).flatMap((day) =>
    (day.activities || []).map((act) => ({
      id: act.id,
      title: act.title,
      description: act.description,
      time: act.start_time,
      location: act.location,
      category: act.category,
      dayNum: day.day_number,
    }))
  ).filter((p) => p.location);

  // Handle route simulation sequence
  useEffect(() => {
    let interval: any = null;
    if (isSimulatingRoute) {
      const currentPins = pinsList.filter(
        (p) => mapDayFilter === "all" || p.dayNum.toString() === mapDayFilter
      );
      if (currentPins.length === 0) {
        setIsSimulatingRoute(false);
        setSimulatingIndex(-1);
        return;
      }
      setSelectedMapPin(currentPins[0].id);
      setSimulatingIndex(0);

      interval = setInterval(() => {
        setSimulatingIndex((prev) => {
          const nextIndex = prev + 1;
          if (nextIndex >= currentPins.length) {
            setIsSimulatingRoute(false);
            return -1;
          }
          setSelectedMapPin(currentPins[nextIndex].id);
          return nextIndex;
        });
      }, 1800);
    } else {
      setSimulatingIndex(-1);
    }
    return () => clearInterval(interval);
  }, [isSimulatingRoute, mapDayFilter, days, pinsList]);

  // --- ACTIONS ---
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !tripId) return;

    try {
      const res = await tripAPI.inviteMember(tripId, { email: inviteEmail, role: inviteRole });
      setInviteStatus(`Dispatched custom email invite link to ${inviteEmail}!`);
      setLastToken(res.inviteToken);
      setInviteEmail("");
    } catch (err) {
      setInviteStatus("Failed to send invitations.");
    }
  };

  const handleAddDay = async () => {
    if (!tripId || !isWritable) return;
    const nextDayNum = days.length + 1;
    
    // Calculate next day's date string nicely
    let dateStr = new Date().toISOString().split("T")[0];
    if (days.length > 0) {
      const lastDayDate = new Date(days[days.length - 1].date);
      lastDayDate.setDate(lastDayDate.getDate() + 1);
      dateStr = lastDayDate.toISOString().split("T")[0];
    }

    try {
      await itineraryAPI.createDay(tripId, nextDayNum, dateStr);
      dispatch(fetchTripById(tripId));
      wsSendMessage("ITINERARY_UPDATE", { tripId });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAddActivityModal = (dayId: string) => {
    setEditingActivity(null);
    setTargetDayId(dayId);
    setActTitle("");
    setActDesc("");
    setActLoc("");
    setActStart("12:00");
    setActEnd("13:00");
    setActCategory("attraction");
    setActivityModalOpen(true);
  };

  const handleOpenEditActivityModal = (act: Activity) => {
    setEditingActivity(act);
    setTargetDayId(act.day_id);
    setActTitle(act.title);
    setActDesc(act.description);
    setActLoc(act.location);
    setActStart(act.start_time);
    setActEnd(act.end_time);
    setActCategory(act.category);
    setActivityModalOpen(true);
  };

  const handleActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle || !targetDayId || !tripId) return;

    const payload = {
      title: actTitle,
      description: actDesc,
      location: actLoc,
      startTime: actStart,
      endTime: actEnd,
      category: actCategory,
    };

    try {
      if (editingActivity) {
        // Edit Mode
        await itineraryAPI.updateActivity(editingActivity.id, payload);
      } else {
        // Create Mode
        await itineraryAPI.addActivity(targetDayId, payload);
      }
      setActivityModalOpen(false);
      dispatch(fetchTripById(tripId));
      wsSendMessage("ITINERARY_UPDATE", { tripId });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSuggToItinerary = async (sugg: any, targetDay: any) => {
    if (!isWritable || !tripId) return;
    try {
      await itineraryAPI.addActivity(targetDay.id, {
        title: sugg.name,
        description: sugg.description,
        location: sugg.location,
        startTime: "13:00",
        endTime: "14:30",
        category: sugg.category || "attraction",
      });
      // Notify WebSocket and update store
      dispatch(fetchTripById(tripId));
      wsSendMessage("ITINERARY_UPDATE", { tripId });
    } catch (err) {
      console.error("Failed to add suggestion:", err);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!isWritable || !tripId) return;
    if (confirm("Are you sure you want to remove this activity from your itinerary?")) {
      try {
        await itineraryAPI.deleteActivity(id);
        dispatch(fetchTripById(tripId));
        wsSendMessage("ITINERARY_UPDATE", { tripId });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- HTML5 Drag & Drop implementations ---
  const handleDragStart = (e: React.DragEvent, id: string, sourceDayId: string) => {
    if (!isWritable) {
      e.preventDefault();
      return;
    }
    setDraggedActId(id);
    setDraggedSourceDayId(sourceDayId);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverDay = (e: React.DragEvent, dayId: string) => {
    e.preventDefault();
    if (dragOverDayId !== dayId) {
      setDragOverDayId(dayId);
    }
  };

  const handleDropOnDay = async (e: React.DragEvent, destDayId: string) => {
    e.preventDefault();
    setDragOverDayId(null);
    if (!draggedActId || !draggedSourceDayId || !tripId) return;

    if (draggedSourceDayId === destDayId) {
      // Reordering within the same column -> skip complex server updates if we can
      return;
    }

    // Optimistically update frontend Redux states to prevent lagging screens
    dispatch(
      moveActivityOptimistic({
        sourceDayId: draggedSourceDayId,
        destDayId,
        activityId: draggedActId,
        destIndex: 999, // append
      })
    );

    try {
      // Shift activity day reference
      await itineraryAPI.updateActivity(draggedActId, { dayId: destDayId });
      
      // Load and broadcast updates to room
      dispatch(fetchTripById(tripId));
      wsSendMessage("ITINERARY_UPDATE", { tripId });
    } catch (err) {
      console.error("Failed to persist slide action:", err);
      dispatch(fetchTripById(tripId)); // rollback
    } finally {
      setDraggedActId(null);
      setDraggedSourceDayId(null);
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user || !tripId) return;

    wsSendMessage("CHAT_SEND", {
      tripId,
      senderId: user.id,
      content: chatInput,
    });

    setChatInput("");
  };

  // Map category code to elegant colored dots and interactive visual guidelines
  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case "food":
        return {
          dot: "bg-amber-500 shadow-md shadow-amber-200",
          card: "border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/40 via-amber-50/10 to-transparent hover:from-amber-50/60",
          text: "text-amber-750 font-bold",
          icon: Utensils,
          badge: "bg-amber-50 text-amber-700 border border-amber-200/50"
        };
      case "hotel":
        return {
          dot: "bg-indigo-500 shadow-md shadow-indigo-200",
          card: "border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50/40 via-indigo-50/10 to-transparent hover:from-indigo-50/60",
          text: "text-indigo-750 font-bold",
          icon: Bed,
          badge: "bg-indigo-50 text-indigo-700 border border-indigo-200/50"
        };
      case "transport":
        return {
          dot: "bg-rose-500 shadow-md shadow-rose-200",
          card: "border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-50/40 via-rose-50/10 to-transparent hover:from-rose-50/60",
          text: "text-rose-750 font-bold",
          icon: Car,
          badge: "bg-rose-50 text-rose-700 border border-rose-200/50"
        };
      default:
        return {
          dot: "bg-emerald-500 shadow-md shadow-emerald-200",
          card: "border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50/40 via-emerald-50/10 to-transparent hover:from-emerald-50/60",
          text: "text-emerald-750 font-bold",
          icon: Camera,
          badge: "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
        };
    }
  };

  if (loading && !currentTrip) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <Globe className="h-10 w-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-600">Loading trip itinerary...</p>
        </div>
      </div>
    );
  }

  if (error || !currentTrip) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center mt-20 bg-white border border-slate-200 rounded-3xl shadow">
        <h3 className="text-xl font-bold text-slate-800 mb-2">Trip Board Not Available</h3>
        <p className="text-sm text-slate-500 mb-6">{error || "Failed loading data from sandbox."}</p>
        <Link to="/dashboard" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col relative">
      {/* 1. TOP HEADER BAR */}
      <header className="glass sticky top-0 z-30 h-16 shrink-0 border-b border-slate-200/60 shadow-sm flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-sm font-black text-slate-900 line-clamp-1">{currentTrip.title}</h1>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <MapPin className="h-3 w-3" /> {currentTrip.destination}
            </div>
          </div>
        </div>

        {/* Real-time Online markers indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-indigo-50/60 border border-indigo-100/60 pl-3 pr-4 py-1.5 rounded-full">
            <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500 animate-ping" : "bg-amber-400"}`} />
            <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest">
              {isConnected ? "Synchronized Live" : "Offline Cache"}
            </span>
            <span className="text-xs text-indigo-600 font-bold font-mono">({onlineUserIds.length} active)</span>
          </div>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl relative shadow-sm cursor-pointer"
            id="open-group-chat-drawer"
          >
            <MessageSquare className="h-4 w-4 text-slate-700" />
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-amber-500 rounded-full text-[8px] font-extrabold text-white flex items-center justify-center">
              !
            </span>
          </button>
        </div>
      </header>

      {/* 2. THREE-PANEL CORE INTERACTIVE PLOT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT BAR: Trip Specs & Members */}
        <aside className="hidden lg:flex w-72 shrink-0 bg-white border-r border-slate-200/60 flex-col justify-between p-6 overflow-y-auto">
          <div>
            {/* Cover image mini */}
            <div className="rounded-2xl overflow-hidden aspect-[16/10] mb-6 shadow-sm relative">
              <img src={currentTrip.cover_image} alt="Itinerary cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-indigo-900/30" />
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">Shared Budget Limit</span>
                <div className="text-2xl font-black text-indigo-600 flex items-center gap-0.5 mt-0.5">
                  <DollarSign className="h-5 w-5" />
                  {currentTrip.budget.toLocaleString()}{" "}
                  <span className="text-xs text-slate-400 font-bold ml-1">{currentTrip.currency}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">Scheduling Epoch</span>
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mt-1">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                  {new Date(currentTrip.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} —{" "}
                  {new Date(currentTrip.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>

              {/* Members List */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase block">Expedition Members</span>
                  <button
                    onClick={() => {
                      setInviteStatus(null);
                      setInviteOpen(true);
                    }}
                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    id="trigger-invite-modal"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(currentTrip.members || []).map((m) => {
                    const online = onlineUserIds.includes(m.user_id);
                    return (
                      <div key={m.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <img
                              src={m.profile_pic}
                              alt={m.name}
                              referrerPolicy="no-referrer"
                              className="h-8 w-8 rounded-full object-cover border border-slate-100"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                                online ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-700 leading-none">{m.name}</div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              {m.role.toLowerCase()}
                            </span>
                          </div>
                        </div>

                        {online && (
                          <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">
                            active
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6">
            <Link
              to={`/trips/${tripId}/expenses`}
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 font-bold py-3.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <CreditCard className="h-4 w-4" />
              Manage Expense splits
            </Link>
          </div>
        </aside>

        {/* MAIN DRAWER AREA: Itinerary timeline and interactive controls */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Internal sub-header navigation tabs */}
          <div className="bg-white border-b border-slate-200/60 p-4 shrink-0 flex items-center justify-between gap-4">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setActiveTab("itinerary")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "itinerary" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Itinerary board
              </button>
              <button
                onClick={() => setActiveTab("map")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "map" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Interactive Map
              </button>
              <button
                onClick={() => setActiveTab("suggestions")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "suggestions" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Gemini Guides
              </button>
            </div>

            {/* Float day addition action */}
            {isWritable && (
              <button
                onClick={handleAddDay}
                className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Day Column
              </button>
            )}
          </div>

          <div className="flex-1 overflow-x-auto p-6 flex gap-6 items-start scroll-smooth">
            {activeTab === "itinerary" ? (
              // BOARD TIMELINE
              days.map((day) => {
                const isOver = dragOverDayId === day.id;
                
                return (
                  <div
                    key={day.id}
                    onDragOver={(e) => handleDragOverDay(e, day.id)}
                    onDrop={(e) => handleDropOnDay(e, day.id)}
                    className={`w-80 shrink-0 bg-white border rounded-3xl p-5 flex flex-col justify-between max-h-[80vh] shadow-sm transition-all ${
                      isOver ? "ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/[0.1]" : "border-slate-200"
                    }`}
                  >
                    <div>
                      {/* Day Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                        <div>
                          <div className="text-sm font-black text-slate-900">Day {day.day_number}</div>
                          <span className="text-[11px] font-bold text-slate-400">
                            {new Date(day.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                          </span>
                        </div>
                        {isWritable && (
                          <button
                            onClick={() => handleOpenAddActivityModal(day.id)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Day Activity cards */}
                      <div className="space-y-3.5 overflow-y-auto max-h-[50vh] pr-1.5 pb-2">
                        {!day.activities || day.activities.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-450 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/60 p-4">
                            No activities slated yet.
                          </div>
                        ) : (
                          day.activities.map((act) => {
                            const theme = getCategoryTheme(act.category);
                            const IconComponent = theme.icon;
                            
                            return (
                              <motion.div
                                key={act.id}
                                layoutId={act.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                draggable={isWritable}
                                onDragStart={(e) => handleDragStart(e, act.id, day.id)}
                                className={`p-4 rounded-2xl border border-slate-100 flex flex-col justify-between ${theme.card} hover:shadow-lg transition-all group relative cursor-grab active:cursor-grabbing hover:-translate-y-[2px] duration-200`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`p-1 rounded-md ${theme.badge} inline-flex items-center justify-center`}>
                                        <IconComponent className="h-3.5 w-3.5 shrink-0" />
                                      </span>
                                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                                        {act.category}
                                      </span>
                                    </div>

                                    <span className="text-[9px] font-bold text-slate-500 font-mono flex items-center gap-1 bg-white border border-slate-200/50 px-1.5 py-0.5 rounded-md shadow-2xs">
                                      <Clock className="h-3 w-3 inline text-slate-400" /> {act.start_time}
                                    </span>
                                  </div>

                                  <h4 className="text-xs font-bold text-slate-805 leading-snug mb-1 group-hover:text-indigo-900 transition-colors">
                                    {act.title}
                                  </h4>
                                  
                                  {act.location && (
                                    <div className="inline-flex items-center gap-1 text-[9px] font-medium text-indigo-600/90 mt-1 hover:underline cursor-pointer" onClick={() => { setActiveTab("map"); setSelectedMapPin(act.id); }}>
                                      <MapPin className="h-3 w-3 shrink-0 text-indigo-500" />
                                      <span className="line-clamp-1">{act.location}</span>
                                    </div>
                                  )}
                                </div>

                                {act.description && (
                                  <p className="text-[10px] text-slate-500 mt-2.5 border-t border-slate-100 pt-2 leading-relaxed">
                                    {act.description}
                                  </p>
                                )}

                                {/* Hover actions list */}
                                {isWritable && (
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white border border-slate-200/80 rounded-xl p-1 shadow-md z-10">
                                    <button
                                      onClick={() => handleOpenEditActivityModal(act)}
                                      className="p-1 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 rounded"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteActivity(act.id)}
                                      className="p-1 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {isWritable && (
                      <button
                        onClick={() => handleOpenAddActivityModal(day.id)}
                        className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 text-xs font-bold border border-slate-100 hover:border-slate-200 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add card
                      </button>
                    )}
                  </div>
                );
              })
            ) : activeTab === "map" ? (
              // HIGH-FIDELITY MISSION CONTROL GEOMETRIC LOCATOR WITH REAL-TIME DAY FILTER & PATH SIMULATION
              <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 p-1 text-slate-800">
                {/* 2/3 COLUMN: Interactive Vector Map Deck */}
                <div className="lg:col-span-2 bg-white border border-slate-250/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[520px]">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 font-sans">
                          <Map className="h-5 w-5 text-indigo-600 animate-pulse" />
                          Expedition Space Plotter
                        </h3>
                        <p className="text-[11px] text-slate-450">Chronological landmarks sequenced on relative geometric grids.</p>
                      </div>

                      {/* Day Segment Filters */}
                      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 rounded-xl self-start border border-slate-200/40">
                        <button
                          onClick={() => { setMapDayFilter("all"); setIsSimulatingRoute(false); }}
                          className={`text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            mapDayFilter === "all" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          All Days
                        </button>
                        {days.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => { setMapDayFilter(d.day_number.toString()); setIsSimulatingRoute(false); }}
                            className={`text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                              mapDayFilter === d.day_number.toString() ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Day {d.day_number}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Simulation Control Ribbon */}
                    <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100/50 rounded-2xl px-4 py-2.5 mb-6">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${isSimulatingRoute ? "bg-emerald-500 animate-ping" : "bg-indigo-300"}`} />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-950 font-mono">
                          {isSimulatingRoute ? `Simulating waypoint ${simulatingIndex + 1}...` : "Route simulator ready"}
                        </span>
                      </div>

                      <button
                        onClick={() => setIsSimulatingRoute(!isSimulatingRoute)}
                        className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer ${
                          isSimulatingRoute
                            ? "bg-rose-100 text-rose-750 hover:bg-rose-200 border border-rose-200"
                            : "bg-indigo-650 text-white hover:bg-indigo-755 hover:shadow-md"
                        }`}
                      >
                        {isSimulatingRoute ? (
                          <>
                            <Pause className="h-3 w-3 fill-rose-700" /> Stop Simulation
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 fill-white" /> Simulate Route Voyage
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Styled mock SVG map canvas viewport */}
                  <div className="bg-slate-950 rounded-2xl relative aspect-[16/9] overflow-hidden border border-slate-900 shadow-inner">
                    {/* Glowing coordinate labels */}
                    <div className="absolute top-3 left-4 text-[9px] font-bold text-slate-700 font-mono uppercase tracking-[0.2em] select-none z-10">
                      SYS LANDING CODE // {currentTrip.currency} BD
                    </div>
                    
                    {/* Modern grid overlay */}
                    <div className="absolute inset-0 opacity-15 bg-[linear-gradient(rgba(129,140,248,0.08)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(129,140,248,0.08)_1px,_transparent_1px)] bg-[size:30px_30px]" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] font-black text-slate-800 tracking-[0.34em] font-mono select-none uppercase pointer-events-none">
                      {currentTrip.destination} CANVAS
                    </div>

                    {pinsList.filter((p) => mapDayFilter === "all" || p.dayNum.toString() === mapDayFilter).length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-500 font-medium">
                        Add events with location details to plot coordinates.
                      </div>
                    ) : (
                      <>
                        {/* Dynamic Path lines */}
                        <svg className="absolute inset-0 h-full w-full pointer-events-none">
                          {pinsList
                            .filter((p) => mapDayFilter === "all" || p.dayNum.toString() === mapDayFilter)
                            .map((pin, i, arr) => {
                              if (i === 0) return null;
                              const stepRatio = (100 / (arr.length + 1));
                              const prevX = i * stepRatio;
                              const prevY = 40 + (i % 2 === 0 ? 25 : -15);
                              const currX = (i + 1) * stepRatio;
                              const currY = 40 + ((i + 1) % 2 === 0 ? 25 : -15);
                              return (
                                <g key={i}>
                                  <line
                                    x1={`${prevX}%`}
                                    y1={`${prevY}%`}
                                    x2={`${currX}%`}
                                    y2={`${currY}%`}
                                    stroke="rgba(99, 102, 241, 0.45)"
                                    strokeWidth="2.5"
                                    strokeDasharray="4 6"
                                  />
                                  <line
                                    x1={`${prevX}%`}
                                    y1={`${prevY}%`}
                                    x2={`${currX}%`}
                                    y2={`${currY}%`}
                                    stroke="#818CF8"
                                    strokeWidth="1.5"
                                    className="animate-pulse"
                                  />
                                </g>
                              );
                            })}
                        </svg>

                        {/* Animated Laser Traveling Sequence Element */}
                        {isSimulatingRoute && simulatingIndex !== -1 && (
                          (() => {
                            const arr = pinsList.filter((p) => mapDayFilter === "all" || p.dayNum.toString() === mapDayFilter);
                            if (simulatingIndex < arr.length) {
                              const pctX = (simulatingIndex + 1) * (100 / (arr.length + 1));
                              const pctY = 40 + ((simulatingIndex + 1) % 2 === 0 ? 25 : -15);
                              return (
                                <div
                                  style={{ left: `${pctX}%`, top: `${pctY}%` }}
                                  className="absolute transform -translate-x-1/2 -translate-y-1/2 h-10 w-10 pointer-events-none z-20 flex items-center justify-center transition-all duration-700"
                                >
                                  <span className="absolute h-10 w-10 rounded-full bg-rose-500 opacity-20 animate-ping" />
                                  <span className="absolute h-6 w-6 rounded-full bg-rose-500 opacity-40 animate-pulse" />
                                  <span className="h-2 w-2 rounded-full bg-rose-600 shadow-lg shadow-rose-300" />
                                </div>
                              );
                            }
                            return null;
                          })()
                        )}

                        {/* Pins rendering with Category Icons inside the glowing pin */}
                        {pinsList
                          .filter((p) => mapDayFilter === "all" || p.dayNum.toString() === mapDayFilter)
                          .map((pin, i, arr) => {
                            const stepRatio = (100 / (arr.length + 1));
                            const pctX = (i + 1) * stepRatio;
                            const pctY = 40 + ((i + 1) % 2 === 0 ? 25 : -15);
                            const isSelected = selectedMapPin === pin.id;
                            const theme = getCategoryTheme(pin.category);
                            const IconComponent = theme.icon;

                            return (
                              <div
                                key={pin.id}
                                style={{ left: `${pctX}%`, top: `${pctY}%` }}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 hover:scale-110 transition-transform"
                                onClick={() => setSelectedMapPin(isSelected ? null : pin.id)}
                              >
                                {/* Animated active ripple */}
                                {isSelected ? (
                                  <div className="absolute h-8 w-8 -left-2 -top-2 bg-indigo-400/30 rounded-full animate-ping" />
                                ) : (
                                  <div className="absolute h-6 w-6 -left-1 -top-1 bg-slate-400/10 rounded-full hover:scale-110 transition-all" />
                                )}

                                <div className={`h-6 w-6 rounded-full border-2 shadow flex items-center justify-center transition-all ${
                                  isSelected ? "bg-rose-500 border-white text-white scale-110" : "bg-indigo-600 border-white text-white hover:bg-indigo-750"
                                }`}>
                                  <IconComponent className="h-3 w-3 shrink-0" />
                                </div>

                                {/* Floating Day coordinate marker label */}
                                <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-slate-900/90 text-white font-semibold text-[8px] px-1 rounded shadow select-none whitespace-nowrap opacity-60">
                                  D{pin.dayNum} #{i+1}
                                </div>

                                {/* Popup Detail Info Glassbox overlay */}
                                <AnimatePresence>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                      className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-56 bg-slate-900 border border-slate-750/70 rounded-2xl p-3.5 shadow-2xl z-30"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="text-[8px] font-extrabold text-indigo-400 font-mono uppercase tracking-wider">
                                          Day {pin.dayNum} — {pin.time}
                                        </div>
                                        <div className="text-[8px] px-1 py-0.5 rounded bg-slate-800 text-slate-350 font-mono">
                                          #{i+1}
                                        </div>
                                      </div>
                                      <h5 className="text-[11px] font-bold text-white line-clamp-1 mb-0.5">{pin.title}</h5>
                                      {pin.description && (
                                        <p className="text-[9px] text-slate-400 line-clamp-2 leading-relaxed mb-1.5 font-sans">
                                          {pin.description}
                                        </p>
                                      )}
                                      <div className="inline-flex items-center gap-1 text-[9px] text-indigo-300">
                                        <MapPin className="h-2.5 w-2.5 text-indigo-400" />
                                        <span className="line-clamp-1">{pin.location}</span>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                      </>
                    )}
                  </div>

                  <div className="text-slate-450 text-[10px] font-mono leading-relaxed bg-slate-50 border border-dashed border-slate-200/60 p-3.5 rounded-2xl flex items-start gap-1.5 mt-4">
                    <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>
                      Plotted routes illustrate chronological sequences. Use the day filter above to narrow your focus, or click the simulation trigger to automatically cruise step-by-step through coordinates.
                    </span>
                  </div>
                </div>

                {/* 1/3 COLUMN: Realist directions sequence tracker sidebar */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between max-h-[520px] overflow-hidden">
                  <div className="shrink-0">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">expedition timeline</h4>
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Plotted Sequence</h3>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {pinsList.filter((p) => mapDayFilter === "all" || p.dayNum.toString() === mapDayFilter).length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400 py-12">
                        No locations slotted for your selection.
                      </div>
                    ) : (
                      pinsList
                        .filter((p) => mapDayFilter === "all" || p.dayNum.toString() === mapDayFilter)
                        .map((pin, idx) => {
                          const isSelected = selectedMapPin === pin.id;
                          const theme = getCategoryTheme(pin.category);
                          const IconComponent = theme.icon;

                          return (
                            <div
                              key={pin.id}
                              onClick={() => setSelectedMapPin(isSelected ? null : pin.id)}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-3 items-start ${
                                isSelected
                                  ? "bg-slate-900 border-slate-950 text-white shadow-md shadow-slate-105"
                                  : "bg-slate-50/50 hover:bg-slate-100 border-slate-200/60 text-slate-800"
                              }`}
                            >
                              <div className={`h-7 w-7 rounded-lg shrink-0 flex items-center justify-center transition-colors ${
                                isSelected ? "bg-indigo-600 text-white animate-pulse" : "bg-white border border-slate-205 text-slate-500"
                              }`}>
                                <IconComponent className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-[8px] font-bold font-mono tracking-wider ${
                                  isSelected ? "text-indigo-305 font-black" : "text-slate-400"
                                }`}>
                                  D{pin.dayNum} // CLOCK: {pin.time}
                                </div>
                                <h4 className="text-xs font-bold truncate leading-snug mt-0.5">{pin.title}</h4>
                                <p className={`text-[9.5px] truncate mt-0.5 flex items-center gap-0.5 ${
                                  isSelected ? "text-slate-300" : "text-slate-400"
                                }`}>
                                  <MapPin className="h-2.5 w-2.5" /> {pin.location}
                                </p>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // GEMINI TRAVEL GUIDES PANEL WITH MULTI-LAYER FILTERS
              <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
                {/* Search / filter board */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Sparkles className="h-5 w-5 text-indigo-500 fill-indigo-100 animate-pulse" />
                    Gemini Intelligence Guides
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Dynamic local travel suggestions structured automatically by AI based on your destination: "{currentTrip.destination}".
                  </p>
 
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">
                        Category Query Type
                      </label>
                      <select
                        value={suggCategory}
                        onChange={(e) => { setSuggCategory(e.target.value); setGeminiSearchQuery(""); }}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-550 transition-colors"
                      >
                        <option value="attraction">Historic Attractions</option>
                        <option value="food">Local Dining & Cafes</option>
                        <option value="hotel">Boutique Hotels</option>
                        <option value="transport">Public Schedulers</option>
                      </select>
                    </div>
 
                    <div>
                      <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">
                        Pricing Tier
                      </label>
                      <select
                        value={suggBudget}
                        onChange={(e) => setSuggBudget(e.target.value)}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-550 transition-colors"
                      >
                        <option value="$">Budget ($)</option>
                        <option value="$$">Moderate ($$)</option>
                        <option value="$$$">Premium ($$$)</option>
                        <option value="$$$$">Ultra-Luxury ($$$$)</option>
                      </select>
                    </div>

                    {/* NEW real-time keyword filter input */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">
                        Quick Keyword Filter
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                          <Search className="h-3.5 w-3.5" />
                        </span>
                        <input
                          type="text"
                          value={geminiSearchQuery}
                          onChange={(e) => setGeminiSearchQuery(e.target.value)}
                          placeholder="Search name, description, parameters..."
                          className="w-full bg-slate-50 border border-slate-200/80 rounded-lg text-xs pl-8.5 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
 
                {/* Suggestions items */}
                {suggestionsLoading ? (
                  <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-xs">
                    <Sparkles className="h-7 w-7 text-indigo-600 animate-spin mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-650">Querying Gemini travel coordinates...</p>
                  </div>
                ) : (() => {
                  const filtered = (suggestions || []).filter((sugg) => {
                    if (!geminiSearchQuery) return true;
                    const q = geminiSearchQuery.toLowerCase();
                    return (
                      sugg.name.toLowerCase().includes(q) ||
                      (sugg.description && sugg.description.toLowerCase().includes(q)) ||
                      (sugg.location && sugg.location.toLowerCase().includes(q))
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-white border rounded-3xl p-16 text-center text-xs text-slate-450 shadow-xs">
                        No relevant recommendations fetched matching current triggers & filters. Try shifting keyword search.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filtered.map((sugg, idx) => (
                        <div key={idx} className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 p-4.5 flex gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                          <img
                            src={sugg.photo}
                            alt={sugg.name}
                            className="h-24 w-24 rounded-2xl object-cover shrink-0 bg-slate-100 shadow-sm"
                          />
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-2.5 mb-1">
                                <h4 className="text-xs font-black text-slate-905 capitalize leading-tight">{sugg.name}</h4>
                                <div className="text-[10px] text-amber-550 font-bold font-mono bg-amber-50 border border-amber-200/40 px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-0.5 shadow-3xs">
                                  ★ {sugg.rating || "4.5"}
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                                {sugg.description}
                              </p>
                            </div>
 
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 font-mono">
                              <span className="text-[9.5px] font-bold text-slate-450 line-clamp-1 max-w-[120px]">
                                {sugg.location || "Central"} ({"$".repeat(sugg.price_level || 2)})
                              </span>
 
                              {isWritable && (
                                <select
                                  onChange={(e) => {
                                    const day = days.find((d) => d.id === e.target.value);
                                    if (day) handleAddSuggToItinerary(sugg, day);
                                  }}
                                  defaultValue=""
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-755 font-bold text-[9px] rounded-lg px-2.5 py-1.5 focus:outline-none appearance-none transition-colors border border-indigo-100/50 cursor-pointer shadow-3xs"
                                >
                                  <option value="" disabled>Add to board...</option>
                                  {days.map((d) => (
                                    <option key={d.id} value={d.id}>Day {d.day_number}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 4. MOCK SLIDING GROUP CHAT DRAWER */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col justify-between transition-transform duration-300 ${
        chatOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        {/* Chat Drawer Header */}
        <div className="p-4 border-b border-slate-200/60 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 leading-none">
              <MessageSquare className="h-4.5 w-4.5 text-indigo-600" />
              Expedition Chat
            </h3>
            <span className="text-[10px] text-slate-400">Syncs message bubbles in real-time.</span>
          </div>
          <button
            onClick={() => setChatOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chat messages listing */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400 p-8">
              No chat logs registered. Blast a message bubble to greet your travel partners!
            </div>
          ) : (
            messages.map((msg) => {
              const mine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex gap-2.5 max-w-[85%] ${mine ? "ml-auto flex-row-reverse text-right" : ""}`}>
                  <img
                    src={msg.sender_pic}
                    alt={msg.sender_name}
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 rounded-full object-cover shrink-0 bg-slate-100"
                  />
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 leading-none mb-1 capitalize">
                      {msg.sender_name.split(" ")[0]}
                    </div>
                    <div className={`p-2.5 rounded-2xl text-xs leading-relaxed ${
                      mine ? "bg-indigo-600 text-white rounded-tr-none text-left" : "bg-slate-100 text-slate-800 rounded-tl-none"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat form */}
        <form onSubmit={handleSendChatMessage} className="p-4 border-t border-slate-200 bg-slate-50/50 flex gap-2">
          <input
            type="text"
            placeholder="Type message bubble..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 shadow-sm"
          />
          <button
            type="submit"
            className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow cursor-pointer transition-all"
          >
            <Send className="h-3 w-3" />
          </button>
        </form>
      </div>

      {/* 5. ADD & EDIT ACTIVITY FORM MODAL */}
      <AnimatePresence>
        {activityModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivityModalOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            />
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-3xl p-6 border border-slate-250 w-full max-w-md z-10"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                  <h3 className="text-base font-bold text-slate-950 flex items-center gap-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
                    {editingActivity ? "Revise Itinerary Event" : "Create Itinerary Event"}
                  </h3>
                  <button onClick={() => setActivityModalOpen(false)}>
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleActivitySubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Event Heading
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flight to Central Kyoto, Tea Dinner"
                      value={actTitle}
                      onChange={(e) => setActTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-indigo-500 focus:outline"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Venue Location Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Nishiki Market, Fushimi Shrine"
                      value={actLoc}
                      onChange={(e) => setActLoc(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Start Hour
                      </label>
                      <input
                        type="time"
                        value={actStart}
                        onChange={(e) => setActStart(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        End Hour
                      </label>
                      <input
                        type="time"
                        value={actEnd}
                        onChange={(e) => setActEnd(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Category Style
                      </label>
                      <select
                        value={actCategory}
                        onChange={(e: any) => setActCategory(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none appearance-none h-[38px]"
                      >
                        <option value="attraction">Attraction</option>
                        <option value="food">Dining & Food</option>
                        <option value="hotel">Lodge / Hotel</option>
                        <option value="transport">Transit</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Event Details / Brief (Optional)
                    </label>
                    <textarea
                      placeholder="e.g. Try standard sushi, beat crowds early."
                      value={actDesc}
                      onChange={(e) => setActDesc(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none h-16 resize-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActivityModalOpen(false)}
                      className="px-4 py-2 hover:bg-slate-100 rounded-xl text-slate-500 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow"
                    >
                      {editingActivity ? "Persist edits" : "Add to timeline"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. INVITE MEMBER MODAL */}
      <AnimatePresence>
        {inviteOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInviteOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            />
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-3xl p-6 border border-slate-200 w-full max-w-md z-10 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <UserPlus className="h-4.5 w-4.5 text-indigo-600 animate-bounce" />
                    Share Travel Planner Invitation
                  </h3>
                  <button onClick={() => setInviteOpen(false)}>
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                </div>

                {inviteStatus && (
                  <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs rounded-xl">
                    {inviteStatus}
                  </div>
                )}

                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Companion's Registered Email
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. teammate@coroute.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Access Role Privilege Select
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none h-[38px]"
                    >
                      <option value="EDITOR">Editor (Can drag cards and edit details)</option>
                      <option value="VIEWER">Viewer (Can read boards and charts only)</option>
                    </select>
                  </div>

                  {lastToken && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-left font-mono text-[9px] text-slate-500">
                      <div>Direct Accept invitation Dev Link:</div>
                      <div className="text-indigo-600 font-bold select-all mt-1">
                        {window.location.origin}/accept-invite/{lastToken}
                      </div>
                      <div className="text-[8px] text-slate-400 mt-2 italic">
                        Demo tip: Disconnect active profiles, sign in as another traveler inside register sheets, then paste this invite link in browser to join of team!
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setInviteOpen(false)}
                      className="px-4 py-2 hover:bg-slate-100 rounded-xl text-slate-500 text-xs font-semibold cursor-pointer"
                    >
                      Close Drawers
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow"
                    >
                      Send Invite
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
