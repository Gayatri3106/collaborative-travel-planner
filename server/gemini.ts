import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY is not defined. Using hyper-realistic travel local fallbacks.");
    return null;
  }
  try {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    return aiClient;
  } catch (err) {
    console.error("Failed to initialize GoogleGenAI:", err);
    return null;
  }
}

export interface TravelSuggestion {
  name: string;
  description: string;
  rating: number; // 1 to 5 scale
  price_level: number; // 1 to 4 scale ($, $$, $$$, $$$$)
  photo?: string;
  location: string;
  category: "food" | "transport" | "hotel" | "attraction";
}

// Fallback high-quality static recommendations
const STATIC_REC_MAP: { [destination: string]: TravelSuggestion[] } = {
  "kyoto, japan": [
    {
      name: "Ono Gyoza Kyoto",
      description: "Crispy-bottomed pork and ginger potstickers inside a cozy lantern-lit alley.",
      rating: 4.8,
      price_level: 2,
      photo: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400",
      location: "Gion, Kyoto",
      category: "food",
    },
    {
      name: "Shoraku Zen Tofu",
      description: "An elegant, traditional multi-course tofu dining experience set inside wooden tatami bays.",
      rating: 4.7,
      price_level: 3,
      photo: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400",
      location: "Arashiyama Canal Riverside, Kyoto",
      category: "food",
    },
    {
      name: "Mimaru Suite Kyoto Shijo",
      description: "Luxurious, multi-room Japanese styled suites equipped with modern kitchenettes and common rooms.",
      rating: 4.9,
      price_level: 4,
      photo: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
      location: "Shijo-dori shopping district",
      category: "hotel",
    },
    {
      name: "Gion Guest House Shin",
      description: "A traditional wooden machiya townhouse boutique inn with paper sliding screens.",
      rating: 4.5,
      price_level: 2,
      photo: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400",
      location: "Higashiyama ward, Kyoto",
      category: "hotel",
    },
    {
      name: "Kiyomizu-dera Temple",
      description: "Magnificent ancient hillside Buddhist monastery featuring a massive wooden veranda with sprawling vistas.",
      rating: 4.9,
      price_level: 1,
      photo: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400",
      location: "Otowa Hillside, Kyoto",
      category: "attraction",
    },
    {
      name: "Fushimi Inari Vermilion Paths",
      description: "Climb through thousands of winding vermilion torii temple gates tucked deep into forest paths.",
      rating: 4.9,
      price_level: 1,
      photo: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400",
      location: "Fushimi Inari gates shrine",
      category: "attraction",
    },
    {
      name: "Kyoto Bus Pass System",
      description: "Prepaid 1-day travel ticket for lines looping old-city temples.",
      rating: 4.4,
      price_level: 1,
      photo: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400",
      location: "Kyoto Central Station Terminals",
      category: "transport",
    },
  ],
  "rome, italy": [
    {
      name: "Cantina & Cucina",
      description: "Spirited bustling Roman taverna famous for classic, creamy Cacio e Pepe and thin-crust pizza.",
      rating: 4.8,
      price_level: 2,
      photo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400",
      location: "Via della Scrofa, Rome",
      category: "food",
    },
    {
      name: "La Pergola Michelin",
      description: "World-class 3-star Michelin dining atop panoramic garden terraces overlooking the Vatican City.",
      rating: 4.9,
      price_level: 4,
      photo: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
      location: "Cavalieri Resort, Rome",
      category: "food",
    },
    {
      name: "Elizabeth Unique Hotel",
      description: "Sleek, modern design hotel showcasing masterpieces of local contemporary Italian artists.",
      rating: 4.8,
      price_level: 4,
      photo: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=400",
      location: "Via del Corso, Rome",
      category: "hotel",
    },
    {
      name: "The Pantheon Historic Dome",
      description: "Incredible 2000-year-old temple featuring the world's largest unreinforced solid concrete cupola.",
      rating: 4.9,
      price_level: 1,
      photo: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400",
      location: "Piazza della Rotonda, Rome",
      category: "attraction",
    },
    {
      name: "Roman Colosseum Arena Guided Walk",
      description: "Walk inside the world's most historic gladiatorial amphitheather with professional tour archeologists.",
      rating: 4.9,
      price_level: 3,
      photo: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400",
      location: "Piazza del Colosseo, Rome",
      category: "attraction",
    },
  ],
  "paris, france": [
    {
      name: "Le Comptoir de La Gastronomie",
      description: "Quaint Paris charcuterie bistro delivering gourmet duck confit and artisanal foie gras selections.",
      rating: 4.8,
      price_level: 3,
      photo: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400",
      location: "Rue Montmartre, Paris",
      category: "food",
    },
    {
      name: "Hotel Regina Louvre",
      description: "Gilded age classic French design palazzo looking out directly over the Tuileries Gardens.",
      rating: 4.8,
      price_level: 4,
      photo: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400",
      location: "Place des Pyramides, Paris",
      category: "hotel",
    },
    {
      name: "Musée d'Orsay Impressionist Wing",
      description: "Stately 1900 Beaux-Arts converted rail station enclosing Monet, Van Gogh, and Degas absolute masterworks.",
      rating: 4.9,
      price_level: 2,
      photo: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400",
      location: "Esplanade Valéry Giscard d'Estaing, Paris",
      category: "attraction",
    },
  ],
};

const GENERIC_RECS: TravelSuggestion[] = [
  {
    name: "Classic Local Bistro",
    description: "Charming local eatery specializing in neighborhood dishes and house wines.",
    rating: 4.6,
    price_level: 2,
    photo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
    location: "City Central square",
    category: "food",
  },
  {
    name: "Boutique Garden Hotel",
    description: "Highly rated retreat featuring quiet breakfast terraces and stylish lounge lobbies.",
    rating: 4.7,
    price_level: 3,
    photo: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400",
    location: "Botanical neighborhood",
    category: "hotel",
  },
  {
    name: "Historic Old Town Walking Tour",
    description: "Dolphin through narrow pathways and learn the unique architectural mysteries of local guilds.",
    rating: 4.8,
    price_level: 1,
    photo: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400",
    location: "Plaza Mayor",
    category: "attraction",
  },
];

/**
 * Generate suggestions for a destination, filtering optionally by type and budget.
 */
export async function generateSuggestions(
  destination: string,
  type?: string,
  budget?: string
): Promise<TravelSuggestion[]> {
  const normDest = destination.trim().toLowerCase();
  
  // Try to use Gemini first!
  const client = getAIClient();
  if (client) {
    try {
      const typeFilter = type ? `specifically looking for category '${type}'` : "covering hotels, food/dining, and sights/attractions";
      const budgetFilter = budget ? `tailored for a budget level of: ${budget}` : "";
      
      const prompt = `Generate a JSON array of exactly 5 highly specific, real travel recommendations for "${destination}" ${typeFilter}. ${budgetFilter}
      
      You MUST strictly reply with a valid JSON array matching the schema:
      [
        {
          "name": "Exact Name of Place",
          "description": "Short, vivid two-sentence descriptive copy detailing what makes this spot incredible.",
          "rating": 4.8, // a float representing Rating between 1 and 5
          "price_level": 2, // integer between 1 (cheap) and 4 (luxury) representing cost level
          "location": "Vague suburb or area",
          "category": "food" | "transport" | "hotel" | "attraction"
        }
      ]
      
      Only output the valid raw JSON array and absolutely nothing else. No markdown formatting, do not wrap in \`\`\`json block.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                price_level: { type: Type.INTEGER },
                location: { type: Type.STRING },
                category: { type: Type.STRING },
              },
              required: ["name", "description", "rating", "price_level", "location", "category"],
            },
          },
        },
      });

      const responseText = response.text || "";
      const cleaned = responseText.trim();
      const parsed: TravelSuggestion[] = JSON.parse(cleaned);

      // Attach matching gorgeous stock photos according to category helper
      return parsed.map((item) => {
        let photo = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400";
        if (item.category === "food") {
          photo = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400";
        } else if (item.category === "hotel") {
          photo = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400";
        } else if (item.category === "attraction") {
          photo = "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400";
        } else if (item.category === "transport") {
          photo = "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400";
        }
        return {
          ...item,
          photo,
        };
      });
    } catch (err) {
      console.error("Gemini failed to generate recommendations. Yielding fallback entries.", err);
      // fallback smoothly to local map logic to ensure uptime!
    }
  }

  // Local fallback triggers:
  // Loop matching keys
  const keys = Object.keys(STATIC_REC_MAP);
  const matchedKey = keys.find((k) => normDest.includes(k) || k.includes(normDest));
  
  let candidates = matchedKey ? STATIC_REC_MAP[matchedKey] : GENERIC_RECS;

  if (type) {
    const filtered = candidates.filter((item) => item.category === type.toLowerCase());
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }

  return candidates;
}
