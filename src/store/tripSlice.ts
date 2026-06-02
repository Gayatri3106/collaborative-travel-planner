import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { tripAPI } from "../services/api.js";
import { Trip, TripMember } from "../types.js";

interface TripState {
  trips: Trip[];
  currentTrip: Trip | null;
  loading: boolean;
  error: string | null;
}

const initialState: TripState = {
  trips: [],
  currentTrip: null,
  loading: false,
  error: null,
};

export const fetchTrips = createAsyncThunk("trips/fetchTrips", async (_, { rejectWithValue }) => {
  try {
    return await tripAPI.getTrips();
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.error || "Failed to retrieve your trips.");
  }
});

export const fetchTripById = createAsyncThunk("trips/fetchTripById", async (id: string, { rejectWithValue }) => {
  try {
    return await tripAPI.getTripById(id);
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.error || "Failed to retrieve trip itinerary insights.");
  }
});

export const createNewTrip = createAsyncThunk("trips/createNewTrip", async (tripData: any, { rejectWithValue }) => {
  try {
    return await tripAPI.createTrip(tripData);
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.error || "Failed to record your new trip.");
  }
});

const tripSlice = createSlice({
  name: "trips",
  initialState,
  reducers: {
    setCurrentTrip(state, action: PayloadAction<Trip | null>) {
      state.currentTrip = action.payload;
    },
    addMemberToCurrentTrip(state, action: PayloadAction<TripMember>) {
      if (state.currentTrip) {
        if (!state.currentTrip.members) {
          state.currentTrip.members = [];
        }
        state.currentTrip.members.push(action.payload);
      }
    },
    updateMemberInCurrentTrip(state, action: PayloadAction<{ userId: string; role: any }>) {
      if (state.currentTrip && state.currentTrip.members) {
        const index = state.currentTrip.members.findIndex((m) => m.user_id === action.payload.userId);
        if (index !== -1) {
          state.currentTrip.members[index].role = action.payload.role;
        }
      }
    },
    removeMemberFromCurrentTrip(state, action: PayloadAction<string>) {
      if (state.currentTrip && state.currentTrip.members) {
        state.currentTrip.members = state.currentTrip.members.filter(
          (m) => m.user_id !== action.payload
        );
      }
    }
  },
  extraReducers: (builder) => {
    // fetchTrips
    builder.addCase(fetchTrips.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTrips.fulfilled, (state, action) => {
      state.loading = false;
      state.trips = action.payload;
    });
    builder.addCase(fetchTrips.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // fetchTripById
    builder.addCase(fetchTripById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTripById.fulfilled, (state, action) => {
      state.loading = false;
      state.currentTrip = action.payload;
    });
    builder.addCase(fetchTripById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // createNewTrip
    builder.addCase(createNewTrip.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createNewTrip.fulfilled, (state, action) => {
      state.loading = false;
      state.trips.unshift(action.payload);
    });
    builder.addCase(createNewTrip.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { setCurrentTrip, addMemberToCurrentTrip, updateMemberInCurrentTrip, removeMemberFromCurrentTrip } = tripSlice.actions;
export default tripSlice.reducer;
