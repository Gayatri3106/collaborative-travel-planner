import { promises as fs } from "fs";
import path from "path";

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  profile_pic: string;
  created_at: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
  cover_image: string;
  created_by: string;
  created_at: string;
}

export type MemberRole = "OWNER" | "EDITOR" | "VIEWER";

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: MemberRole;
}

export interface ItineraryDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
}

export interface Activity {
  id: string;
  day_id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  category: "food" | "transport" | "hotel" | "attraction";
  position_order: number;
}

export interface Expense {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  paid_by: string; // user_id
  category: "food" | "transport" | "hotel" | "misc";
  date: string;
  split_type: "EQUAL" | "CUSTOM";
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  is_settled: boolean;
}

export interface Message {
  id: string;
  trip_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
}

interface DBData {
  users: User[];
  trips: Trip[];
  trip_members: TripMember[];
  itinerary_days: ItineraryDay[];
  activities: Activity[];
  expenses: Expense[];
  expense_splits: ExpenseSplit[];
  messages: Message[];
  invite_tokens: { token: string; trip_id: string; email: string; role: MemberRole }[];
}

const DB_FILE_PATH = path.join(process.cwd(), "server_db.json");

let cachedData: DBData | null = null;

// Initialize file database
async function loadDB(): Promise<DBData> {
  if (cachedData) return cachedData;
  try {
    const raw = await fs.readFile(DB_FILE_PATH, "utf-8");
    cachedData = JSON.parse(raw);
    return cachedData!;
  } catch (err) {
    // File not found or unreadable -> create initial seeds
    const seed = createSeededData();
    cachedData = seed;
    await saveDB(seed);
    return seed;
  }
}

async function saveDB(data: DBData): Promise<void> {
  cachedData = data;
  await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function createSeededData(): DBData {
  const nowStr = new Date().toISOString();

  // Create initial beautiful seeded users
  const seededUsers: User[] = [
    {
      id: "u-1",
      name: "Alex Rivera",
      email: "alex@travelplanner.com",
      password: "password123", // fallback plain text password logic for debug / easy demo logins
      profile_pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      created_at: nowStr,
    },
    {
      id: "u-2",
      name: "Bob Tanaka",
      email: "bob@travelplanner.com",
      password: "password123",
      profile_pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      created_at: nowStr,
    },
    {
      id: "u-3",
      name: "Chloe Dupont",
      email: "chloe@travelplanner.com",
      password: "password123",
      profile_pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      created_at: nowStr,
    },
  ];

  // Primary Trip: Autumn in Kyoto
  const seededTrips: Trip[] = [
    {
      id: "t-1",
      title: "Autumn Escape in Kyoto",
      destination: "Kyoto, Japan",
      start_date: "2026-11-10",
      end_date: "2026-11-12",
      budget: 3500,
      currency: "USD",
      cover_image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800",
      created_by: "u-1",
      created_at: nowStr,
    },
  ];

  // Trip memberships
  const seededMembers: TripMember[] = [
    { id: "tm-1", trip_id: "t-1", user_id: "u-1", role: "OWNER" },
    { id: "tm-2", trip_id: "t-1", user_id: "u-2", role: "EDITOR" },
    { id: "tm-3", trip_id: "t-1", user_id: "u-3", role: "VIEWER" },
  ];

  // Days for Kyoto
  const seededDays: ItineraryDay[] = [
    { id: "d-1", trip_id: "t-1", day_number: 1, date: "2026-11-10" },
    { id: "d-2", trip_id: "t-1", day_number: 2, date: "2026-11-11" },
    { id: "d-3", trip_id: "t-1", day_number: 3, date: "2026-11-12" },
  ];

  // Activities
  const seededActivities: Activity[] = [
    {
      id: "act-1",
      day_id: "d-1",
      title: "Hotel Check-in at Mimaru Kyoto",
      description: "Drop off luggage and quick refresh",
      location: "Mimaru Hotel Kyoto Station",
      start_time: "14:00",
      end_time: "15:00",
      category: "hotel",
      position_order: 1,
    },
    {
      id: "act-2",
      day_id: "d-1",
      title: "Fushimi Inari Shrine Visit",
      description: "Hike through the thousands of vermilion torii gates as the sun drops.",
      location: "Fushimi Inari-taisha",
      start_time: "16:00",
      end_time: "18:30",
      category: "attraction",
      position_order: 2,
    },
    {
      id: "act-3",
      day_id: "d-1",
      title: "Ramen Dinner at Kyoto Engine Ramen",
      description: "Warm spicy ramen in central Kyoto",
      location: "Engine Ramen, Kawaramachi",
      start_time: "19:00",
      end_time: "20:30",
      category: "food",
      position_order: 3,
    },
    {
      id: "act-4",
      day_id: "d-2",
      title: "Kinkaku-ji (Golden Pavilion)",
      description: "Beat the crowds to see the shimmering temple reflected in the pond.",
      location: "Kinkaku-ji",
      start_time: "09:00",
      end_time: "11:00",
      category: "attraction",
      position_order: 1,
    },
    {
      id: "act-5",
      day_id: "d-2",
      title: "Zen Garden Tea & Matcha Cafe",
      description: "Sip ceremonial class matcha with traditional sweet wagashi",
      location: "Uji Tea Salon",
      start_time: "12:00",
      end_time: "13:30",
      category: "food",
      position_order: 2,
    },
    {
      id: "act-6",
      day_id: "d-3",
      title: "Arashiyama Bamboo Grove Scenic Walk",
      description: "Stroll along the historic grove, listen to the rustling bamboo stalks.",
      location: "Arashiyama Bamboo Forest",
      start_time: "10:00",
      end_time: "12:30",
      category: "attraction",
      position_order: 1,
    },
  ];

  // Some seeded expenses
  const seededExpenses: Expense[] = [
    {
      id: "e-1",
      trip_id: "t-1",
      title: "Cozy Kyoto Mimaru Hotel Booking",
      amount: 1500,
      paid_by: "u-1",
      category: "hotel",
      date: "2026-11-10",
      split_type: "EQUAL",
    },
    {
      id: "e-2",
      trip_id: "t-1",
      title: "Kyoto Engine Ramen Dinner",
      amount: 120,
      paid_by: "u-2",
      category: "food",
      date: "2026-11-10",
      split_type: "EQUAL",
    },
    {
      id: "e-3",
      trip_id: "t-1",
      title: "Matcha Sweets Treat",
      amount: 60,
      paid_by: "u-3",
      category: "food",
      date: "2026-11-11",
      split_type: "CUSTOM",
    },
  ];

  // Splits:
  // e-1: $1500 split equally among 3 users ($500 each)
  // e-2: $120 split equally among 3 users ($40 each)
  // e-3: $60 custom splits (Alex owes 10, Bob owes 30, Chloe paid and owes 20)
  const seededSplits: ExpenseSplit[] = [
    { id: "es-1", expense_id: "e-1", user_id: "u-1", amount_owed: 500, is_settled: false },
    { id: "es-2", expense_id: "e-1", user_id: "u-2", amount_owed: 500, is_settled: false },
    { id: "es-3", expense_id: "e-1", user_id: "u-3", amount_owed: 500, is_settled: false },

    { id: "es-4", expense_id: "e-2", user_id: "u-1", amount_owed: 40, is_settled: false },
    { id: "es-5", expense_id: "e-2", user_id: "u-2", amount_owed: 40, is_settled: false },
    { id: "es-6", expense_id: "e-2", user_id: "u-3", amount_owed: 40, is_settled: false },

    { id: "es-7", expense_id: "e-3", user_id: "u-1", amount_owed: 10, is_settled: false },
    { id: "es-8", expense_id: "e-3", user_id: "u-2", amount_owed: 30, is_settled: false },
    { id: "es-9", expense_id: "e-3", user_id: "u-3", amount_owed: 20, is_settled: false },
  ];

  // Seeded chat messages
  const seededMessages: Message[] = [
    {
      id: "msg-1",
      trip_id: "t-1",
      sender_id: "u-1",
      content: "Welcome to our Autumn in Kyoto trip planner! 🍁 Feel free to add itinerary ideas.",
      sent_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "msg-2",
      trip_id: "t-1",
      sender_id: "u-2",
      content: "Amazing! I added Golden Pavilion under Day 2. Should we do a traditional Zen dinner there?",
      sent_at: new Date(Date.now() - 1800000).toISOString(),
    },
  ];

  return {
    users: seededUsers,
    trips: seededTrips,
    trip_members: seededMembers,
    itinerary_days: seededDays,
    activities: seededActivities,
    expenses: seededExpenses,
    expense_splits: seededSplits,
    messages: seededMessages,
    invite_tokens: [],
  };
}

export const db = {
  // --- USERS ---
  async getUsers() {
    const data = await loadDB();
    return data.users;
  },

  async addUser(user: Omit<User, "id" | "created_at"> & { id?: string }) {
    const data = await loadDB();
    const newUser: User = {
      ...user,
      id: user.id || `u-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    };
    data.users.push(newUser);
    await saveDB(data);
    return newUser;
  },

  async findUserById(id: string) {
    const data = await loadDB();
    return data.users.find((u) => u.id === id) || null;
  },

  async findUserByEmail(email: string) {
    const data = await loadDB();
    return data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  // --- TRIPS ---
  async getTrips() {
    const data = await loadDB();
    return data.trips;
  },

  async getTripById(id: string) {
    const data = await loadDB();
    return data.trips.find((t) => t.id === id) || null;
  },

  async getUserTrips(userId: string) {
    const data = await loadDB();
    // find memberships
    const tripIds = data.trip_members
      .filter((tm) => tm.user_id === userId)
      .map((tm) => tm.trip_id);
    return data.trips.filter((t) => tripIds.includes(t.id));
  },

  async addTrip(trip: Omit<Trip, "id" | "created_at">) {
    const data = await loadDB();
    const newTrip: Trip = {
      ...trip,
      id: `t-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    };
    data.trips.push(newTrip);

    // Automatically add owner to trip members
    const newMember: TripMember = {
      id: `tm-${Math.random().toString(36).substr(2, 9)}`,
      trip_id: newTrip.id,
      user_id: trip.created_by,
      role: "OWNER",
    };
    data.trip_members.push(newMember);

    // Automatically seed day entries between start_date and end_date
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    let dayNum = 1;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split("T")[0];
      const newDay: ItineraryDay = {
        id: `d-${Math.random().toString(36).substr(2, 9)}`,
        trip_id: newTrip.id,
        day_number: dayNum++,
        date: dateString,
      };
      data.itinerary_days.push(newDay);
    }

    await saveDB(data);
    return newTrip;
  },

  // --- TRIP MEMBERS ---
  async getMembersForTrip(tripId: string) {
    const data = await loadDB();
    const members = data.trip_members.filter((tm) => tm.trip_id === tripId);
    // attach user data
    return members.map((tm) => {
      const u = data.users.find((user) => user.id === tm.user_id)!;
      return {
        ...tm,
        name: u?.name || "Unknown User",
        email: u?.email || "",
        profile_pic: u?.profile_pic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      };
    });
  },

  async addTripMember(tripId: string, userId: string, role: MemberRole) {
    const data = await loadDB();
    // Check if membership already exists
    const exists = data.trip_members.find((tm) => tm.trip_id === tripId && tm.user_id === userId);
    if (exists) {
      exists.role = role;
    } else {
      const newMember: TripMember = {
        id: `tm-${Math.random().toString(36).substr(2, 9)}`,
        trip_id: tripId,
        user_id: userId,
        role,
      };
      data.trip_members.push(newMember);
    }
    await saveDB(data);
  },

  async updateMemberRole(tripId: string, userId: string, role: MemberRole) {
    const data = await loadDB();
    const tm = data.trip_members.find((m) => m.trip_id === tripId && m.user_id === userId);
    if (tm) {
      tm.role = role;
      await saveDB(data);
      return true;
    }
    return false;
  },

  async removeMember(tripId: string, userId: string) {
    const data = await loadDB();
    data.trip_members = data.trip_members.filter(
      (tm) => !(tm.trip_id === tripId && tm.user_id === userId)
    );
    await saveDB(data);
  },

  // --- ITINERARY DAYS ---
  async getDaysForTrip(tripId: string) {
    const data = await loadDB();
    return data.itinerary_days
      .filter((d) => d.trip_id === tripId)
      .sort((a, b) => a.day_number - b.day_number);
  },

  async addItineraryDay(tripId: string, dayNumber: number, date: string) {
    const data = await loadDB();
    const newDay: ItineraryDay = {
      id: `d-${Math.random().toString(36).substr(2, 9)}`,
      trip_id: tripId,
      day_number: dayNumber,
      date,
    };
    data.itinerary_days.push(newDay);
    await saveDB(data);
    return newDay;
  },

  // --- ACTIVITIES ---
  async getActivitiesForDay(dayId: string) {
    const data = await loadDB();
    return data.activities
      .filter((act) => act.day_id === dayId)
      .sort((a, b) => a.position_order - b.position_order);
  },

  async getActivitiesForTrip(tripId: string) {
    const data = await loadDB();
    const days = data.itinerary_days.filter((d) => d.trip_id === tripId);
    const dayIds = days.map((d) => d.id);
    return data.activities.filter((act) => dayIds.includes(act.day_id));
  },

  async addActivity(act: Omit<Activity, "id">) {
    const data = await loadDB();
    const newAct: Activity = {
      ...act,
      id: `act-${Math.random().toString(36).substr(2, 9)}`,
    };
    data.activities.push(newAct);
    await saveDB(data);
    return newAct;
  },

  async updateActivity(id: string, updates: Partial<Omit<Activity, "id">>) {
    const data = await loadDB();
    const actIndex = data.activities.findIndex((act) => act.id === id);
    if (actIndex === -1) return null;
    const updated = { ...data.activities[actIndex], ...updates };
    data.activities[actIndex] = updated;
    await saveDB(data);
    return updated;
  },

  async deleteActivity(id: string) {
    const data = await loadDB();
    data.activities = data.activities.filter((act) => act.id !== id);
    await saveDB(data);
    return true;
  },

  async reorderActivities(dayId: string, orderedIds: string[]) {
    const data = await loadDB();
    // Update position_order and day_id for target list
    orderedIds.forEach((id, index) => {
      const act = data.activities.find((a) => a.id === id);
      if (act) {
        act.day_id = dayId;
        act.position_order = index + 1;
      }
    });
    await saveDB(data);
    return true;
  },

  // --- EXPENSES ---
  async getExpensesForTrip(tripId: string) {
    const data = await loadDB();
    return data.expenses.filter((e) => e.trip_id === tripId);
  },

  async addExpense(expense: Omit<Expense, "id">, splits: Omit<ExpenseSplit, "id" | "expense_id">[]) {
    const data = await loadDB();
    const newExp: Expense = {
      ...expense,
      id: `e-${Math.random().toString(36).substr(2, 9)}`,
    };
    data.expenses.push(newExp);

    const generatedSplits: ExpenseSplit[] = splits.map((s) => ({
      ...s,
      id: `es-${Math.random().toString(36).substr(2, 9)}`,
      expense_id: newExp.id,
    }));

    data.expense_splits.push(...generatedSplits);
    await saveDB(data);
    return { expense: newExp, splits: generatedSplits };
  },

  async getSplitsForTrip(tripId: string) {
    const data = await loadDB();
    const expenses = data.expenses.filter((e) => e.trip_id === tripId);
    if (expenses.length === 0) return [];
    const expIds = expenses.map((e) => e.id);
    return data.expense_splits.filter((s) => expIds.includes(s.expense_id));
  },

  async getSplitsForExpense(expenseId: string) {
    const data = await loadDB();
    return data.expense_splits.filter((s) => s.expense_id === expenseId);
  },

  async settleSplitsForUserInTrip(tripId: string, owedToUserId: string, debterUserId: string) {
    // Settle splits between two people in a trip
    const data = await loadDB();
    const expensesPaidByOwed = data.expenses.filter((e) => e.trip_id === tripId && e.paid_by === owedToUserId);
    const expIds = expensesPaidByOwed.map((e) => e.id);
    
    // Find splits of these expenses that belong to the debtor and are not settled
    const splits = data.expense_splits.filter(
      (s) => expIds.includes(s.expense_id) && s.user_id === debterUserId && !s.is_settled
    );

    splits.forEach((s) => {
      s.is_settled = true;
    });

    await saveDB(data);
    return splits.length;
  },

  // --- MESSAGES ---
  async getMessagesForTrip(tripId: string) {
    const data = await loadDB();
    const messages = data.messages.filter((m) => m.trip_id === tripId);
    return messages.map((m) => {
      const u = data.users.find((user) => user.id === m.sender_id);
      return {
        ...m,
        sender_name: u?.name || "Unknown Traveler",
        sender_pic: u?.profile_pic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      };
    });
  },

  async addMessage(msg: Omit<Message, "id" | "sent_at">) {
    const data = await loadDB();
    const newMsg: Message = {
      ...msg,
      id: `msg-${Math.random().toString(36).substr(2, 9)}`,
      sent_at: new Date().toISOString(),
    };
    data.messages.push(newMsg);
    await saveDB(data);

    // attach sender profile info
    const u = data.users.find((user) => user.id === newMsg.sender_id);
    return {
      ...newMsg,
      sender_name: u?.name || "Unknown Traveler",
      sender_pic: u?.profile_pic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    };
  },

  // --- INVITATION TOKENS ---
  async createInvite(tripId: string, email: string, role: MemberRole) {
    const data = await loadDB();
    const token = `inv-${Math.random().toString(36).substr(2, 12)}`;
    data.invite_tokens.push({ token, trip_id: tripId, email, role });
    await saveDB(data);
    return token;
  },

  async findInviteAndConsume(token: string, actualJoinedEmail: string) {
    const data = await loadDB();
    const invIndex = data.invite_tokens.findIndex((inv) => inv.token === token);
    if (invIndex === -1) return null;
    const inv = data.invite_tokens[invIndex];
    
    // Check user matching by email or register
    const u = data.users.find((user) => user.email.toLowerCase() === actualJoinedEmail.toLowerCase());
    if (!u) return null;

    // Add to trip
    await this.addTripMember(inv.trip_id, u.id, inv.role);

    // Consume invite token
    data.invite_tokens.splice(invIndex, 1);
    await saveDB(data);

    return inv.trip_id;
  },
};
