import axios from "axios";

// Since we serve client + server on standard Port 3000, relative URLs work perfectly!
const API = axios.create({
  baseURL: "/api",
});

// Auto-inject JWT token on requests
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Gracefully handle session expirations (401 / 403)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn("Session expired or invalid token. Redirection in progress.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Prevent infinite loops if already on login path
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=true";
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (credentials: any) => {
    const res = await API.post("/auth/login", credentials);
    return res.data;
  },
  register: async (details: any) => {
    const res = await API.post("/auth/register", details);
    return res.data;
  },
  getMe: async () => {
    const res = await API.get("/auth/me");
    return res.data;
  },
};

export const tripAPI = {
  getTrips: async () => {
    const res = await API.get("/trips");
    return res.data;
  },
  getTripById: async (id: string) => {
    const res = await API.get(`/trips/${id}`);
    return res.data;
  },
  createTrip: async (tripData: any) => {
    const res = await API.post("/trips", tripData);
    return res.data;
  },
  inviteMember: async (tripId: string, inviteData: { email: string; role: string }) => {
    const res = await API.post(`/trips/${tripId}/invite`, inviteData);
    return res.data;
  },
  acceptInvite: async (token: string) => {
    const res = await API.post(`/trips/accept-invite/${token}`);
    return res.data;
  },
  updateMemberRole: async (tripId: string, userId: string, role: string) => {
    const res = await API.put(`/trips/${tripId}/members/${userId}`, { role });
    return res.data;
  },
  removeMember: async (tripId: string, userId: string) => {
    const res = await API.delete(`/trips/${tripId}/members/${userId}`);
    return res.data;
  },
};

export const itineraryAPI = {
  createDay: async (tripId: string, dayNum: number, date: string) => {
    const res = await API.post(`/trips/${tripId}/days`, { dayNumber: dayNum, date });
    return res.data;
  },
  addActivity: async (dayId: string, activityData: any) => {
    const res = await API.post(`/days/${dayId}/activities`, activityData);
    return res.data;
  },
  updateActivity: async (id: string, updates: any) => {
    const res = await API.put(`/activities/${id}`, updates);
    return res.data;
  },
  deleteActivity: async (id: string) => {
    const res = await API.delete(`/activities/${id}`);
    return res.data;
  },
  reorderActivities: async (dayId: string, activityIds: string[]) => {
    const res = await API.put(`/days/${dayId}/reorder`, { activityIds });
    return res.data;
  },
};

export const expenseAPI = {
  getExpenses: async (tripId: string) => {
    const res = await API.get(`/trips/${tripId}/expenses`);
    return res.data;
  },
  addExpense: async (tripId: string, expenseData: any) => {
    const res = await API.post(`/trips/${tripId}/expenses`, expenseData);
    return res.data;
  },
  getSettlements: async (tripId: string) => {
    const res = await API.get(`/trips/${tripId}/settlement`);
    return res.data;
  },
  settleExpense: async (tripId: string, owedToUserId: string, debtorUserId: string) => {
    const res = await API.post(`/trips/${tripId}/settlement/settle`, { owedToUserId, debtorUserId });
    return res.data;
  },
};

export const suggestionAPI = {
  getSuggestions: async (destination: string, type?: string, budget?: string) => {
    const res = await API.get("/suggestions", {
      params: { destination, type, budget },
    });
    return res.data;
  },
};

export const chatAPI = {
  getMessages: async (tripId: string) => {
    const res = await API.get(`/trips/${tripId}/messages`);
    return res.data;
  },
};
