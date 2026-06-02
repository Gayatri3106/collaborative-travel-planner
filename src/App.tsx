import React from "react";
import { Provider } from "react-redux";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { store } from "./store/index.js";

// Page imports
import Home from "./pages/Home.js";
import Login from "./pages/Login.js";
import Register from "./pages/Register.js";
import Dashboard from "./pages/Dashboard.js";
import TripPlanner from "./pages/TripPlanner.js";
import ExpenseTracker from "./pages/ExpenseTracker.js";
import AcceptInvite from "./pages/AcceptInvite.js";

// Clean client Guard wrapping to protect subscriber boards
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Landing / Introduction */}
          <Route path="/" element={<Home />} />

          {/* Identification gates */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Secure traveler dashboards */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:id"
            element={
              <ProtectedRoute>
                <TripPlanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:id/expenses"
            element={
              <ProtectedRoute>
                <ExpenseTracker />
              </ProtectedRoute>
            }
          />

          {/* Direct link join actions */}
          <Route path="/accept-invite/:token" element={<AcceptInvite />} />

          {/* Generic fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}
