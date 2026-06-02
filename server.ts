import express, { Response } from "express";
import { createServer } from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocket, WebSocketServer } from "ws";

import { db, MemberRole } from "./server/db.js";
import { authenticateToken, generateToken, AuthenticatedRequest } from "./server/auth.js";
import { calculateSettlements } from "./server/settlement.js";
import { generateSuggestions } from "./server/gemini.js";

// Setup Express and HTTP Server
const app = express();
const PORT = 3000;
const server = createServer(app);

// Use JSON body parsing
app.use(express.json());

// WebSocket Room tracking: Map from trip_id -> Set of active WebSockets
const tripRooms = new Map<string, Set<WebSocket & { userId?: string }>>();

// Setup WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// Custom upgrade logic to match Express port and forward ws handshakes
server.on("upgrade", (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : "";
  if (pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws: WebSocket & { userId?: string; tripId?: string }) => {
  console.log("New WebSocket client connected.");

  ws.on("message", async (rawMessage) => {
    try {
      const message = JSON.parse(rawMessage.toString());
      console.log("WS Received message Type:", message.type);

      switch (message.type) {
        case "SUBSCRIBE": {
          const { tripId, userId } = message.payload;
          ws.tripId = tripId;
          ws.userId = userId;

          if (!tripRooms.has(tripId)) {
            tripRooms.set(tripId, new Set());
          }
          tripRooms.get(tripId)!.add(ws);

          // Broadcast active online members to the room
          broadcastMemberList(tripId);
          break;
        }

        case "CHAT_SEND": {
          const { tripId, senderId, content } = message.payload;
          const savedMsg = await db.addMessage({ trip_id: tripId, sender_id: senderId, content });
          
          broadcastToRoom(tripId, {
            type: "CHAT_RECEIVE",
            payload: savedMsg,
          });
          break;
        }

        case "ITINERARY_UPDATE": {
          const { tripId } = message.payload;
          // Notify other clients to refresh their drag-and-drop itinerary board state
          broadcastToRoom(tripId, {
            type: "ITINERARY_LOAD",
            payload: { timestamp: Date.now() },
          });
          break;
        }

        default:
          console.warn("Unhandled WS Message type:", message.type);
      }
    } catch (err) {
      console.error("WS error processing message:", err);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected.");
    if (ws.tripId && tripRooms.has(ws.tripId)) {
      const room = tripRooms.get(ws.tripId)!;
      room.delete(ws);
      if (room.size === 0) {
        tripRooms.delete(ws.tripId);
      } else {
        broadcastMemberList(ws.tripId);
      }
    }
  });
});

// Helper: Broadcast to all connected clients in a specific trip room
function broadcastToRoom(tripId: string, payload: any) {
  const room = tripRooms.get(tripId);
  if (!room) return;
  const jsonStr = JSON.stringify(payload);
  room.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonStr);
    }
  });
}

// Helper: Broadcast list of User IDs currently online in a trip
async function broadcastMemberList(tripId: string) {
  const room = tripRooms.get(tripId);
  if (!room) return;
  const onlineUserIds = Array.from(room)
    .filter((client) => client.readyState === WebSocket.OPEN && client.userId)
    .map((client) => client.userId!);

  broadcastToRoom(tripId, {
    type: "ONLINE_MEMBERS",
    payload: { onlineUserIds },
  });
}


// ========================================== API ENDPOINTS ==========================================

// Health Check API
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// --- AUTH API ---
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, profilePic } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required inputs." });
    return;
  }

  try {
    const existing = await db.findUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: "An account is already registered with this email address." });
      return;
    }

    const avatarUrl = profilePic || `https://images.unsplash.com/photo-${[
      "1534528741775-53994a69daeb",
      "1507003211169-0a1dd7228f2d",
      "1494790108377-be9c29b29330",
      "1535713875002-d1d0cf377fde",
      "1438761681033-6461ffad8d80"
    ][Math.floor(Math.random() * 5)]}?w=150`;

    const user = await db.addUser({
      name,
      email: email.toLowerCase(),
      password, // in a simple sandboxed environment, we maintain clean demonstrations
      profile_pic: avatarUrl,
    });

    const token = generateToken({ id: user.id, email: user.email });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profilePic: user.profile_pic,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required credentials." });
    return;
  }

  try {
    const user = await db.findUserByEmail(email);
    if (!user || user.password !== password) {
      res.status(401).json({ error: "Invalid email or master password combination." });
      return;
    }

    const token = generateToken({ id: user.id, email: user.email });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profilePic: user.profile_pic,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id!;
  try {
    const user = await db.findUserById(userId);
    if (!user) {
      res.status(404).json({ error: "Active user account not found." });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      profilePic: user.profile_pic,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- TRIPS API ---
app.get("/api/trips", authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id!;
  try {
    const userTrips = await db.getUserTrips(userId);
    res.json(userTrips);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/trips", authenticateToken, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id!;
  const { title, destination, startDate, endDate, budget, currency, coverImage } = req.body;

  if (!title || !destination || !startDate || !endDate) {
    res.status(400).json({ error: "Title, destination, start date, and end date are mandatory fields." });
    return;
  }

  try {
    const defaultCover = coverImage || `https://images.unsplash.com/photo-${[
      "1493976040374-85c8e12f0c0e", // Kyoto
      "1552832230-c0197dd311b5", // Rome
      "1502602898657-3e91760cbb34", // Paris
      "1476514525535-07fb3b4ae5f1"  // generic travel
    ][Math.floor(Math.random() * 4)]}?w=800`;

    const newTrip = await db.addTrip({
      title,
      destination,
      start_date: startDate,
      end_date: endDate,
      budget: Number(budget) || 1000,
      currency: currency || "USD",
      cover_image: defaultCover,
      created_by: userId,
    });

    res.status(201).json(newTrip);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/trips/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
  const tripId = req.params.id;
  const userId = req.user?.id!;

  try {
    const trip = await db.getTripById(tripId);
    if (!trip) {
      res.status(404).json({ error: "Trip planner page not found." });
      return;
    }

    const members = await db.getMembersForTrip(tripId);
    const isMember = members.some((m) => m.user_id === userId);
    if (!isMember) {
      res.status(403).json({ error: "Access denied. You are not a member of this trip." });
      return;
    }

    const days = await db.getDaysForTrip(tripId);
    // Gather all activities for trip
    const activitiesList = await db.getActivitiesForTrip(tripId);

    // Map days with attached activities
    const itinerary = days.map((day) => ({
      ...day,
      activities: activitiesList.filter((a) => a.day_id === day.id),
    }));

    res.json({
      ...trip,
      members,
      itinerary,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/trips/:id/invite", authenticateToken, async (req: AuthenticatedRequest, res) => {
  const tripId = req.params.id;
  const { email, role } = req.body;

  if (!email) {
    res.status(400).json({ error: "Invitee email address is required." });
    return;
  }

  try {
    const inviteToken = await db.createInvite(tripId, email, (role as MemberRole) || "EDITOR");
    
    // Simulate email dispatch in development. Log invitation tokens so they can easily be verified.
    console.log(`[MAIL SERVICE] Sending invite to "${email}" on trip ${tripId}. Link: /accept-invite/${inviteToken}`);
    
    res.json({
      success: true,
      message: `Invitation successfully dispatched! Email link created cleanly.`,
      inviteToken, // returned to the user for direct linking convenience
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/trips/accept-invite/:token", authenticateToken, async (req: AuthenticatedRequest, res) => {
  const inviteToken = req.params.token;
  const userEmail = req.user?.email!;

  try {
    const tripId = await db.findInviteAndConsume(inviteToken, userEmail);
    if (!tripId) {
      res.status(400).json({ error: "Invitiation token is expired, consumed, or invalid for this email." });
      return;
    }
    res.json({ success: true, tripId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/trips/:id/members/:userId", authenticateToken, async (req, res) => {
  const { id: tripId, userId } = req.params;
  const { role } = req.body;
  
  try {
    const success = await db.updateMemberRole(tripId, userId, role as MemberRole);
    if (!success) {
      res.status(404).json({ error: "Member profile not found in trip records." });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/trips/:id/members/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { id: tripId, userId } = req.params;
  
  try {
    await db.removeMember(tripId, userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- ITINERARY API ---
app.post("/api/trips/:id/days", authenticateToken, async (req, res) => {
  const tripId = req.params.id;
  const { dayNumber, date } = req.body;

  try {
    const newDay = await db.addItineraryDay(tripId, dayNumber, date);
    res.status(201).json(newDay);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/days/:id/activities", authenticateToken, async (req, res) => {
  const dayId = req.params.id;
  const { title, description, location, startTime, endTime, category } = req.body;

  if (!title) {
    res.status(400).json({ error: "Activity title is required." });
    return;
  }

  try {
    // Get existing to find position_order boundary
    const existing = await db.getActivitiesForDay(dayId);
    const order = existing.length + 1;

    const activity = await db.addActivity({
      day_id: dayId,
      title,
      description: description || "",
      location: location || "",
      start_time: startTime || "12:00",
      end_time: endTime || "13:00",
      category: category || "attraction",
      position_order: order,
    });

    res.status(201).json(activity);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/activities/:id", authenticateToken, async (req, res) => {
  const actId = req.params.id;
  const updates = req.body; // title, description, location, etc.

  try {
    const updated = await db.updateActivity(actId, updates);
    if (!updated) {
      res.status(404).json({ error: "Target activity does not exist." });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/activities/:id", authenticateToken, async (req, res) => {
  const actId = req.params.id;

  try {
    await db.deleteActivity(actId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/days/:id/reorder", authenticateToken, async (req, res) => {
  const dayId = req.params.id;
  const { activityIds } = req.body; // Ordered list of activities ID strings

  if (!Array.isArray(activityIds)) {
    res.status(400).json({ error: "activityIds is expected to be an array of IDs in order." });
    return;
  }

  try {
    await db.reorderActivities(dayId, activityIds);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- EXPENSES API ---
app.get("/api/trips/:id/expenses", authenticateToken, async (req, res) => {
  const tripId = req.params.id;

  try {
    const expenses = await db.getExpensesForTrip(tripId);
    const allSplits = await db.getSplitsForTrip(tripId);

    // Attach splits to expenses
    const enriched = expenses.map((exp) => ({
      ...exp,
      splits: allSplits.filter((s) => s.expense_id === exp.id),
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/trips/:id/expenses", authenticateToken, async (req: AuthenticatedRequest, res) => {
  const tripId = req.params.id;
  const { title, amount, paidBy, category, date, splitType, customSplits } = req.body; // customSplits: array of {userId, amountOwed}

  if (!title || !amount || !paidBy || !category || !date) {
    res.status(400).json({ error: "Title, amount, paidBy, category, and date parameters are mandatory." });
    return;
  }

  try {
    const members = await db.getMembersForTrip(tripId);
    if (members.length === 0) {
      res.status(400).json({ error: "Cannot register expense for team of size 0." });
      return;
    }

    let calculatedSplits: Omit<any, "id" | "expense_id">[] = [];

    if (splitType === "CUSTOM") {
      if (!Array.isArray(customSplits) || customSplits.length === 0) {
        res.status(400).json({ error: "Custom split rates per user must be specified inside customSplits." });
        return;
      }
      calculatedSplits = customSplits.map((cs) => ({
        user_id: cs.userId,
        amount_owed: Number(cs.amountOwed),
        is_settled: cs.userId === paidBy, // auto settled for the payer
      }));
    } else {
      // EQUAL DIVISION
      const count = members.length;
      const splitAmt = Math.round((amount / count) * 100) / 100;

      calculatedSplits = members.map((m) => ({
        user_id: m.user_id,
        amount_owed: splitAmt,
        is_settled: m.user_id === paidBy, // auto settled for the active payer
      }));
    }

    const result = await db.addExpense(
      {
        trip_id: tripId,
        title,
        amount: Number(amount),
        paid_by: paidBy,
        category,
        date,
        split_type: splitType || "EQUAL",
      },
      calculatedSplits
    );

    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/trips/:id/settlement", authenticateToken, async (req, res) => {
  const tripId = req.params.id;

  try {
    const members = await db.getMembersForTrip(tripId);
    const expenses = await db.getExpensesForTrip(tripId);
    const splits = await db.getSplitsForTrip(tripId);

    const transactions = calculateSettlements(members, expenses, splits);

    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/trips/:id/settlement/settle", authenticateToken, async (req, res) => {
  const tripId = req.params.id;
  const { owedToUserId, debtorUserId } = req.body;

  if (!owedToUserId || !debtorUserId) {
    res.status(400).json({ error: "owedToUserId and debtorUserId must be specified." });
    return;
  }

  try {
    const count = await db.settleSplitsForUserInTrip(tripId, owedToUserId, debtorUserId);
    res.json({ success: true, settledCount: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- SUGGESTIONS API ---
app.get("/api/suggestions", authenticateToken, async (req, res) => {
  const destination = (req.query.destination as string) || "Kyoto";
  const type = req.query.type as string; // 'food' | 'hotel' | 'attraction'
  const budget = req.query.budget as string; // pricing tiers

  try {
    const results = await generateSuggestions(destination, type, budget);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- CHAT MESSAGES API (Fallback static loader or initial load) ---
app.get("/api/trips/:id/messages", authenticateToken, async (req, res) => {
  const tripId = req.params.id;
  try {
    const messages = await db.getMessagesForTrip(tripId);
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ========================================== VITE CONFORMENT INTEGRATION ==========================================

// Vite middleware configuration for serving the dynamic React Frontend
async function startViteServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development server loading Vite in middlewareMode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind server listener to port 3000
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Master Server booting cleanly on http://localhost:${PORT}`);
  });
}

startViteServer();
