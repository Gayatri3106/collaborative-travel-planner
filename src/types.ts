export interface User {
  id: string;
  name: string;
  email: string;
  profilePic: string;
}

export type MemberRole = "OWNER" | "EDITOR" | "VIEWER";

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: MemberRole;
  name: string;
  email: string;
  profile_pic: string;
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

export interface ItineraryDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
  activities: Activity[];
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
  members?: TripMember[];
  itinerary?: ItineraryDay[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  is_settled: boolean;
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
  splits: ExpenseSplit[];
}

export interface Message {
  id: string;
  trip_id: string;
  sender_id: string;
  sender_name: string;
  sender_pic: string;
  content: string;
  sent_at: string;
}

export interface SettlementTransaction {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export interface TravelSuggestion {
  name: string;
  description: string;
  rating: number;
  price_level: number;
  photo: string;
  location: string;
  category: "food" | "transport" | "hotel" | "attraction";
}
