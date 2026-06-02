import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  ArrowLeft,
  X,
  CreditCard,
  DollarSign,
  Plus,
  TrendingUp,
  PieChart as PieIcon,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Award,
  ChevronRight,
  Utensils,
  Bed,
  Car,
  Sliders,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { fetchTripById } from "../store/tripSlice.js";
import { fetchExpenses, fetchSettlementSummary, addExpenseAsync } from "../store/expenseSlice.js";
import { AppDispatch, RootState } from "../store/index.js";
import { expenseAPI } from "../services/api.js";
import { Expense } from "../types.js";

interface ExpenseFormValue {
  title: string;
  amount: string;
  paidBy: string;
  category: "food" | "transport" | "hotel" | "misc";
  splitType: "EQUAL" | "CUSTOM";
}

export default function ExpenseTracker() {
  const { id: tripId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { currentTrip } = useSelector((state: RootState) => state.trips);
  const { expenses, settlements, loading, error } = useSelector((state: RootState) => state.expenses);

  const [user, setUser] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [category, setCategory] = useState<"food" | "transport" | "hotel" | "misc">("food");
  const [splitType, setSplitType] = useState<"EQUAL" | "CUSTOM">("EQUAL");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({}); // userId -> custom money amount
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (!localUser) {
      navigate("/login");
      return;
    }
    setUser(JSON.parse(localUser));

    if (tripId) {
      dispatch(fetchTripById(tripId));
      dispatch(fetchExpenses(tripId));
      dispatch(fetchSettlementSummary(tripId));
    }
  }, [tripId, dispatch, navigate]);

  // Set default payer on mount
  useEffect(() => {
    if (user) {
      setPaidBy(user.id);
    }
  }, [user]);

  const handleSettleDebt = async (debtorUserId: string, owedToUserId: string) => {
    if (!tripId) return;
    if (confirm("Are you sure you would like to settle this debt path between team partners?")) {
      try {
        await expenseAPI.settleExpense(tripId, owedToUserId, debtorUserId);
        setSuccessMsg("Settlement ledger logged successfully!");
        // Refresh values
        dispatch(fetchExpenses(tripId));
        dispatch(fetchSettlementSummary(tripId));
        setTimeout(() => setSuccessMsg(null), 3500);
      } catch (err) {
        console.error("Failed to post settlement:", err);
      }
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !paidBy || !tripId) {
      setAddError("Please fill out the description, amount, and register the payer.");
      return;
    }

    const totalAmount = Number(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      setAddError("Expense total must reside inside positive numeric values.");
      return;
    }

    let splitsData: any = [];

    if (splitType === "CUSTOM") {
      // Validate splits add up to total
      let splitsSum = 0;
      const mems = currentTrip?.members || [];
      
      splitsData = mems.map((m) => {
        const val = Number(customSplits[m.user_id] || "0");
        splitsSum += val;
        return {
          userId: m.user_id,
          amountOwed: val,
        };
      });

      if (Math.abs(splitsSum - totalAmount) > 0.01) {
        setAddError(`In CUSTOM split mode, user splits sum (currently ${splitsSum}) must equal total expense (${totalAmount}).`);
        return;
      }
    } else {
      // EQUAL Mode splits calculation
      const mems = currentTrip?.members || [];
      const splitVal = totalAmount / (mems.length || 1);
      splitsData = mems.map((m) => ({
        userId: m.user_id,
        amountOwed: Math.round(splitVal * 100) / 100,
      }));
    }

    setAddError(null);
    try {
      await dispatch(
        addExpenseAsync({
          tripId,
          expenseData: {
            title,
            amount: totalAmount,
            paidBy,
            category,
            splits: splitsData,
          },
        })
      );

      // Settle up states
      setShowAddModal(false);
      setTitle("");
      setAmount("");
      setCustomSplits({});
      setSuccessMsg("Expense recorded cleanly!");

      // Trigger dynamic updates
      dispatch(fetchSettlementSummary(tripId));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setAddError("Validation/Connection error posting expense transaction.");
    }
  };

  // Compile calculations metrics
  const totalTripExpensesValue = expenses.reduce((sum, item) => sum + item.amount, 0);
  const budgetValue = currentTrip?.budget || 1;
  const budgetPct = Math.min((totalTripExpensesValue / budgetValue) * 100, 100);

  // Group by category for Beautiful Recharts visualization
  const categoryCounts: Record<string, number> = {};
  expenses.forEach((item) => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + item.amount;
  });

  const chartColors = {
    food: "#F59E0B", // Amber
    hotel: "#6366F1", // Indigo
    transport: "#EF4444", // Rose
    misc: "#10B981", // Emerald
  };

  const chartData = Object.keys(categoryCounts).map((catName) => ({
    name: catName.toUpperCase(),
    value: categoryCounts[catName],
    color: chartColors[catName as keyof typeof chartColors] || "#94A3B8",
  }));

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Tracker Subnav */}
      <header className="glass sticky top-0 z-30 h-16 border-b border-slate-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link
            to={`/trips/${tripId}`}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Accounting Center</span>
            <h1 className="text-sm font-black text-slate-900 line-clamp-1">
              {currentTrip?.title || "Collective Balance Ledger"}
            </h1>
          </div>
        </div>

        <button
          onClick={() => {
            setAddError(null);
            setShowAddModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
          id="add-expense-modal-trigger"
        >
          <Plus className="h-4 w-4" /> Log Custom Expense
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm flex items-center gap-2.5 shadow-sm">
            <CheckCircle className="h-5 w-5 animate-pulse text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TOP LEVEL METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card A: Shared Budget Status Progress Bar */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
            {/* Visual background gradient pulse */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-50/40 via-transparent to-transparent pointer-events-none rounded-bl-full" />
            
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Shared Budget Allocation</span>
              <div className="text-3xl font-black text-slate-900 mt-1 flex items-baseline gap-1.5">
                {totalTripExpensesValue.toLocaleString()} <span className="text-sm font-semibold text-slate-400">/ {budgetValue.toLocaleString()}</span>{" "}
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">{currentTrip?.currency}</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-550 mb-1.5">
                <span className="flex items-center gap-1 font-sans">
                  {totalTripExpensesValue > budgetValue ? (
                    <span className="text-rose-600 inline-flex items-center gap-0.5 font-bold">
                      <ShieldAlert className="h-3.5 w-3.5" /> Over allocation limit!
                    </span>
                  ) : (
                    <span className="text-indigo-650 inline-flex items-center gap-0.5 font-bold">
                      <TrendingUp className="h-3.5 w-3.5" /> Core progression
                    </span>
                  )}
                </span>
                <span className="font-mono text-[11px] font-bold">{Math.round((totalTripExpensesValue / budgetValue) * 100)}%</span>
              </div>

              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                <div
                  style={{ width: `${Math.min((totalTripExpensesValue / budgetValue) * 100, 100)}%` }}
                  className={`h-full rounded-full transition-all duration-700 ${
                    totalTripExpensesValue > budgetValue ? "bg-rose-500 shadow-sm shadow-rose-300 animate-pulse" : (totalTripExpensesValue / budgetValue) * 100 > 75 ? "bg-amber-500" : "bg-indigo-600"
                  }`}
                />
              </div>

              <p className="text-[10px] text-slate-400 font-medium leading-normal mt-2.5">
                {totalTripExpensesValue > budgetValue ? (
                  <span className="text-rose-650 font-bold">Budget exceeded by {(totalTripExpensesValue - budgetValue).toLocaleString()} {currentTrip?.currency}. Please review custom settlements below!</span>
                ) : (
                  <span>{(budgetValue - totalTripExpensesValue).toLocaleString()} {currentTrip?.currency} remains before limit threshold.</span>
                )}
              </p>
            </div>
          </div>

          {/* Card B: Minimum Settlements List */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm col-span-1 md:col-span-2 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-3.5">
                Optimized settlement clearing paths (greedy solver)
              </span>

              {settlements.length === 0 ? (
                <div className="py-7 flex items-center gap-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-2.5xl px-4">
                  <div className="h-11 w-11 bg-emerald-50 text-emerald-650 rounded-2xl flex items-center justify-center shadow-xs">
                    <Award className="h-5.5 w-5.5 animate-bounce" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 leading-snug">All Accounts Perfectly Restored</h5>
                    <p className="text-[10px] text-slate-400 leading-normal">Co-living costs are equalized, with no outstanding debt balances registered.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[148px] overflow-y-auto pr-1">
                  {settlements.map((sett, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50/80 hover:bg-slate-100/60 transition-colors rounded-2xl border border-slate-150 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                          <span className="text-indigo-650 font-bold truncate max-w-[65px]">{sett.fromName.split(" ")[0]}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="text-slate-800 font-bold truncate max-w-[65px]">{sett.toName.split(" ")[0]}</span>
                        </div>
                        <span className="text-[10.5px] text-slate-450 font-mono font-bold block mt-0.5">
                          {sett.amount.toLocaleString()} {currentTrip?.currency}
                        </span>
                      </div>

                      <button
                        onClick={() => handleSettleDebt(sett.from, sett.to)}
                        className="bg-slate-900 hover:bg-indigo-600 text-white font-extrabold text-[9px] uppercase tracking-wider px-3 py-2 rounded-xl shadow-3xs hover:shadow-sm transition-all shrink-0 cursor-pointer"
                      >
                        Settle UP
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DETAIL VIEW PANELS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COL-1: LEDGER LIST (2 COLS) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm col-span-1 lg:col-span-2">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight mb-5">Transactions Register Ledger</h3>

            <div className="space-y-3.5 max-h-[52vh] overflow-y-auto pr-2">
              {expenses.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-450 border border-dashed border-slate-200 rounded-2.5xl bg-slate-50/50">
                  No individual transactions booked yet. Select "Log Custom Expense" above.
                </div>
              ) : (() => {
                const getCategoryTheme = (cat: string) => {
                  switch (cat) {
                    case "food":
                      return { icon: Utensils, bg: "bg-amber-50 text-amber-600 border-amber-250/40", badge: "bg-amber-100 text-amber-800" };
                    case "hotel":
                      return { icon: Bed, bg: "bg-indigo-5 border-indigo-150/40 text-indigo-600", badge: "bg-indigo-100 text-indigo-800" };
                    case "transport":
                      return { icon: Car, bg: "bg-rose-5 border-rose-150/40 text-rose-605", badge: "bg-rose-100 text-rose-800" };
                    default:
                      return { icon: Sliders, bg: "bg-emerald-5 border-emerald-150/40 text-emerald-605", badge: "bg-emerald-100 text-emerald-800" };
                  }
                };

                return expenses.map((item) => {
                  const theme = getCategoryTheme(item.category);
                  const IconComp = theme.icon;
                  const paidByMember = currentTrip?.members?.find((m) => m.user_id === item.paid_by);
                  
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2.5xl border border-slate-200/80 flex items-center justify-between hover:bg-slate-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-3">
                        <span className={`h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center border font-semibold ${theme.bg}`}>
                          <IconComp className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-900 leading-tight mb-0.5 truncate">{item.title}</div>
                          <div className="text-[10px] text-slate-400 font-medium flex flex-wrap items-center gap-1.5">
                            <span>Paid by <span className="font-bold text-slate-655">{paidByMember?.name ? paidByMember.name.split(" ")[0] : "Travel partner"}</span></span>
                            <span>·</span>
                            <span className="capitalize font-mono text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-550 border border-slate-200/30">
                              {item.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-slate-900 leading-none">
                          {item.amount.toLocaleString()} <span className="text-[10px] text-slate-400 uppercase font-bold">{currentTrip?.currency}</span>
                        </div>
                        <span className="text-[8px] font-extrabold text-slate-450 tracking-wider uppercase mt-1 block">
                          {item.split_type === "EQUAL" ? "Split Equally" : "Custom divisions"}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* COL-2: CHARTS BREAKDOWN PANEL */}
          <div className="bg-white border rounded-3xl p-6 shadow-sm col-span-1">
            <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-1">
              <PieIcon className="h-4 w-4 text-indigo-500" />
              Category distribution
            </h3>

            {chartData.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400">
                Awaiting expense data to model charts.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  {chartData.map((d, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span style={{ backgroundColor: d.color }} className="h-3 w-3 rounded-full shrink-0" />
                      <div>
                        <div className="text-[10px] font-bold text-slate-800 leading-none">{d.name}</div>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">
                          {d.value.toLocaleString()} {currentTrip?.currency}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* EXPENSE LOG MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-3xl p-6 border border-slate-200 w-full max-w-lg z-10 shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-500 fill-indigo-100" />
                    Book Bill Transaction
                  </h3>
                  <button onClick={() => setShowAddModal(false)}>
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </div>

                {addError && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4" />
                    <span>{addError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateExpense} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Billing Short description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kyoto Sushi Dinner, Airbnb deposit"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Expense total amount ({currentTrip?.currency})
                      </label>
                      <input
                        type="number"
                        placeholder="180.50"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none h-[38px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Paying traveler
                      </label>
                      <select
                        value={paidBy}
                        onChange={(e) => setPaidBy(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none h-[38px]"
                      >
                        {(currentTrip?.members || []).map((m) => (
                          <option key={m.id} value={m.user_id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Ledger category
                      </label>
                      <select
                        value={category}
                        onChange={(e: any) => setCategory(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none h-[38px]"
                      >
                        <option value="food">Local Dining / Food</option>
                        <option value="hotel">Accommodations / Lodgings</option>
                        <option value="transport">Transportation / Transit</option>
                        <option value="misc">Miscellaneous</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Billing division scheme
                      </label>
                      <select
                        value={splitType}
                        onChange={(e: any) => setSplitType(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none h-[38px]"
                      >
                        <option value="EQUAL">Divide Equally</option>
                        <option value="CUSTOM">Custom Slices ($)</option>
                      </select>
                    </div>
                  </div>

                  {/* Custom split breakdown input cards */}
                  {splitType === "CUSTOM" && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Custom dollar slices specifications
                      </span>

                      {(currentTrip?.members || []).map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-4">
                          <span className="text-xs text-slate-700 font-bold leading-none">{m.name}</span>
                          <input
                            type="number"
                            placeholder="60.0"
                            value={customSplits[m.user_id] || ""}
                            onChange={(e) =>
                              setCustomSplits({
                                ...customSplits,
                                [m.user_id]: e.target.value,
                              })
                            }
                            className="bg-white border rounded-lg px-2 py-1 text-xs text-right w-24 h-[30px]"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 hover:bg-slate-100 rounded-xl text-slate-500 text-xs font-semibold cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow"
                    >
                      Settle Transaction Ledger
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
