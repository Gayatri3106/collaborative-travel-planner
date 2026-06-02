import { configureStore } from "@reduxjs/toolkit";
import tripReducer from "./tripSlice.js";
import itineraryReducer from "./itinerarySlice.js";
import expenseReducer from "./expenseSlice.js";

export const store = configureStore({
  reducer: {
    trips: tripReducer,
    itinerary: itineraryReducer,
    expenses: expenseReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
