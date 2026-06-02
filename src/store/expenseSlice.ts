import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { expenseAPI } from "../services/api.js";
import { Expense, SettlementTransaction } from "../types.js";

interface ExpenseState {
  expenses: Expense[];
  settlements: SettlementTransaction[];
  loading: boolean;
  error: string | null;
}

const initialState: ExpenseState = {
  expenses: [],
  settlements: [],
  loading: false,
  error: null,
};

export const fetchExpenses = createAsyncThunk(
  "expenses/fetchExpenses",
  async (tripId: string, { rejectWithValue }) => {
    try {
      return await expenseAPI.getExpenses(tripId);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Failed to fetch trip expenses.");
    }
  }
);

export const fetchSettlementSummary = createAsyncThunk(
  "expenses/fetchSettlementSummary",
  async (tripId: string, { rejectWithValue }) => {
    try {
      return await expenseAPI.getSettlements(tripId);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Failed to fetch settlements layout.");
    }
  }
);

export const addExpenseAsync = createAsyncThunk(
  "expenses/addExpense",
  async ({ tripId, expenseData }: { tripId: string; expenseData: any }, { rejectWithValue }) => {
    try {
      return await expenseAPI.addExpense(tripId, expenseData);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Failed to save the expense.");
    }
  }
);

const expenseSlice = createSlice({
  name: "expenses",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // fetchExpenses
    builder.addCase(fetchExpenses.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchExpenses.fulfilled, (state, action: PayloadAction<Expense[]>) => {
      state.loading = false;
      state.expenses = action.payload;
    });
    builder.addCase(fetchExpenses.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // fetchSettlementSummary
    builder.addCase(fetchSettlementSummary.fulfilled, (state, action: PayloadAction<SettlementTransaction[]>) => {
      state.settlements = action.payload;
    });

    // addExpenseAsync
    builder.addCase(addExpenseAsync.fulfilled, (state, action) => {
      // result returns { expense, splits } from API
      const newExp: Expense = {
        ...action.payload.expense,
        splits: action.payload.splits,
      };
      state.expenses.unshift(newExp);
    });
  },
});

export default expenseSlice.reducer;
