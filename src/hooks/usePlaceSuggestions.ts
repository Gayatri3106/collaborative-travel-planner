import { useState, useEffect } from "react";
import { suggestionAPI } from "../services/api.js";
import { TravelSuggestion } from "../types.js";

export function usePlaceSuggestions(destination: string, type: string, budget: string) {
  const [data, setData] = useState<TravelSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!destination) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Debounce the call to avoid rapid-fire API hits during keystroke entry
    const delayTimer = setTimeout(() => {
      suggestionAPI
        .getSuggestions(destination, type, budget)
        .then((res) => {
          setData(res);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load place recommendations:", err);
          setError("Failed to fetch suggestions.");
          setLoading(false);
        });
    }, 500); // 500ms debounce interval

    return () => clearTimeout(delayTimer);
  }, [destination, type, budget]);

  return { data, loading, error };
}
