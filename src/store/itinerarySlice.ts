import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { itineraryAPI } from "../services/api.js";
import { ItineraryDay, Activity } from "../types.js";

interface ItineraryState {
  days: ItineraryDay[];
  loading: boolean;
  error: string | null;
}

const initialState: ItineraryState = {
  days: [],
  loading: false,
  error: null,
};

// Async thunk to create a new day under a active trip
export const createDayAsync = createAsyncThunk(
  "itinerary/createDay",
  async ({ tripId, dayNumber, date }: { tripId: string; dayNumber: number; date: string }, { rejectWithValue }) => {
    try {
      return await itineraryAPI.createDay(tripId, dayNumber, date);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Failed to create day card.");
    }
  }
);

// Async thunk to create a new activity inside a day
export const addActivityAsync = createAsyncThunk(
  "itinerary/addActivity",
  async ({ dayId, activityData }: { dayId: string; activityData: any }, { rejectWithValue }) => {
    try {
      return await itineraryAPI.addActivity(dayId, activityData);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Failed to add activity card.");
    }
  }
);

const itinerarySlice = createSlice({
  name: "itinerary",
  initialState,
  reducers: {
    setDays(state, action: PayloadAction<ItineraryDay[]>) {
      state.days = action.payload;
    },
    // Allows instant client-side optimistic reordering inside columns to avoid drag lag!
    optimisticReorder(state, action: PayloadAction<{ dayId: string; activityIds: string[] }>) {
      const { dayId, activityIds } = action.payload;
      const day = state.days.find((d) => d.id === dayId);
      if (day && day.activities) {
        const activityMap = new Map(day.activities.map((a) => [a.id, a]));
        day.activities = activityIds
          .map((id) => activityMap.get(id)!)
          .filter(Boolean)
          .map((act, index) => ({ ...act, position_order: index + 1 }));
      }
    },
    moveActivityOptimistic(
      state,
      action: PayloadAction<{
        sourceDayId: string;
        destDayId: string;
        activityId: string;
        destIndex: number;
      }>
    ) {
      const { sourceDayId, destDayId, activityId, destIndex } = action.payload;
      const sourceDay = state.days.find((d) => d.id === sourceDayId);
      const destDay = state.days.find((d) => d.id === destDayId);

      if (sourceDay && destDay) {
        // Find and remove act from source
        const actIndex = sourceDay.activities?.findIndex((a) => a.id === activityId) ?? -1;
        if (actIndex !== -1) {
          const [act] = sourceDay.activities.splice(actIndex, 1);
          act.day_id = destDayId;

          if (!destDay.activities) {
            destDay.activities = [];
          }
          // Insert at destination index
          destDay.activities.splice(destIndex, 0, act);

          // Re-index position_orders
          sourceDay.activities = sourceDay.activities.map((item, idx) => ({ ...item, position_order: idx + 1 }));
          destDay.activities = destDay.activities.map((item, idx) => ({ ...item, position_order: idx + 1 }));
        }
      }
    }
  },
  extraReducers: (builder) => {
    // createDayAsync
    builder.addCase(createDayAsync.fulfilled, (state, action) => {
      const newDay: ItineraryDay = {
        ...action.payload,
        activities: [],
      };
      state.days.push(newDay);
      state.days.sort((a, b) => a.day_number - b.day_number);
    });

    // addActivityAsync
    builder.addCase(addActivityAsync.fulfilled, (state, action) => {
      const newAct: Activity = action.payload;
      const day = state.days.find((d) => d.id === newAct.day_id);
      if (day) {
        if (!day.activities) {
          day.activities = [];
        }
        day.activities.push(newAct);
        day.activities.sort((a, b) => a.position_order - b.position_order);
      }
    });
  },
});

export const { setDays, optimisticReorder, moveActivityOptimistic } = itinerarySlice.actions;
export default itinerarySlice.reducer;
