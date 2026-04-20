"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatAssistant = exports.optimizeTrip = exports.suggestBestDay = exports.generateDayPlan = exports.generateSuggestions = void 0;
const https_1 = require("firebase-functions/v2/https");
const generative_ai_1 = require("@google/generative-ai");
// ─── Gemini client (lazy-initialised so the key is read at invocation time) ──
function getGemini() {
    const key = process.env.GEMINI_API_KEY;
    if (!key)
        throw new https_1.HttpsError('internal', 'GEMINI_API_KEY is not set.');
    return new generative_ai_1.GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-2.5-flash' });
}
// ─── Shared helper ────────────────────────────────────────────────────────────
async function callGemini(prompt) {
    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Strip markdown code fences if Gemini wraps output in ```json ... ```
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
        return JSON.parse(cleaned);
    }
    catch (_a) {
        throw new https_1.HttpsError('internal', `Gemini returned non-JSON response: ${cleaned.slice(0, 200)}`);
    }
}
// ─── Type guards ─────────────────────────────────────────────────────────────
function requireString(val, field) {
    if (typeof val !== 'string' || val.trim() === '') {
        throw new https_1.HttpsError('invalid-argument', `Field "${field}" must be a non-empty string.`);
    }
    return val.trim();
}
function requireStringArray(val, field) {
    if (!Array.isArray(val)) {
        throw new https_1.HttpsError('invalid-argument', `Field "${field}" must be an array.`);
    }
    return val.map((item, i) => {
        if (typeof item !== 'string') {
            throw new https_1.HttpsError('invalid-argument', `Item ${i} in "${field}" must be a string.`);
        }
        return item;
    });
}
// ─── 1. generateSuggestions ───────────────────────────────────────────────────
exports.generateSuggestions = (0, https_1.onCall)({ invoker: 'public' }, async (request) => {
    var _a, _b;
    const data = request.data;
    const destination = requireString(data.destination, 'destination');
    const tripDates = requireString(data.tripDates, 'tripDates');
    const preferences = requireStringArray((_a = data.preferences) !== null && _a !== void 0 ? _a : [], 'preferences');
    const existingPlan = requireStringArray((_b = data.existingPlan) !== null && _b !== void 0 ? _b : [], 'existingPlan');
    const prompt = `You are a travel expert. Suggest 5 diverse attractions for a trip to ${destination}.
Trip dates: ${tripDates}.
User preferences: ${preferences.join(', ') || 'none'}.

ALREADY IN ITINERARY — do NOT suggest any of these:
${existingPlan.length > 0 ? existingPlan.map((p) => `- ${p}`).join('\n') : '- (none)'}

RULES:
1. NEVER suggest any place listed above.
2. Spread suggestions across different categories (e.g. landmark, food, nature, museum, entertainment).
3. Each place must be a specific, real, named location in ${destination} — no generic descriptions.
4. Provide accurate latitude/longitude coordinates.
5. Include a concrete reason why each place suits the user's preferences and trip dates.

Return ONLY valid JSON — no explanations, no markdown, no extra text.
[
  {
    "name": "",
    "description": "",
    "reason": "",
    "category": "",
    "estimatedTime": "",
    "bestTime": "",
    "lat": 0,
    "lng": 0
  }
]`;
    const parsed = await callGemini(prompt);
    if (!Array.isArray(parsed)) {
        throw new https_1.HttpsError('internal', 'Gemini did not return a JSON array for suggestions.');
    }
    return parsed;
});
// ─── 2. generateDayPlan ───────────────────────────────────────────────────────
exports.generateDayPlan = (0, https_1.onCall)({ invoker: 'public' }, async (request) => {
    var _a, _b, _c;
    const data = request.data;
    const destination = requireString(data.destination, 'destination');
    const tripDates = requireString(data.tripDates, 'tripDates');
    const dayNumber = typeof data.dayNumber === 'number' ? data.dayNumber : Number(data.dayNumber);
    if (!Number.isFinite(dayNumber) || dayNumber < 1) {
        throw new https_1.HttpsError('invalid-argument', 'Field "dayNumber" must be a positive integer.');
    }
    const preferences = requireStringArray((_a = data.preferences) !== null && _a !== void 0 ? _a : [], 'preferences');
    const existingPlan = requireStringArray((_b = data.existingPlan) !== null && _b !== void 0 ? _b : [], 'existingPlan');
    const existingPlacesOnDay = requireStringArray((_c = data.existingPlacesOnDay) !== null && _c !== void 0 ? _c : [], 'existingPlacesOnDay');
    // Places on other days (not the current day being planned)
    const placesOnOtherDays = existingPlan.filter((p) => !existingPlacesOnDay.includes(p));
    const prompt = `You are a travel planner. Create a Day ${dayNumber} itinerary for ${destination}.
Trip dates: ${tripDates}.
User preferences: ${preferences.join(', ') || 'none'}.

ALREADY SCHEDULED on Day ${dayNumber} (do NOT repeat these):
${existingPlacesOnDay.length > 0 ? existingPlacesOnDay.map((p) => `- ${p}`).join('\n') : '- (none yet)'}

ALREADY SCHEDULED on other days (avoid repeating these too):
${placesOnOtherDays.length > 0 ? placesOnOtherDays.map((p) => `- ${p}`).join('\n') : '- (none)'}

RULES:
1. NEVER suggest any place listed above.
2. Suggest activities that COMPLEMENT and fill the remaining time slots around the already-scheduled Day ${dayNumber} places.
3. Each activity must be a distinct, real place in ${destination} — no generic descriptions.
4. Mix activity types (e.g. cultural, food, nature, entertainment) for variety.
5. Cover exactly 3 time slots: morning, afternoon, evening.
6. Keep descriptions concise and practical (1–2 sentences).

Return ONLY valid JSON — no explanations, no markdown, no extra text.
{
  "day": ${dayNumber},
  "activities": [
    {
      "time": "morning",
      "name": "",
      "description": "",
      "estimatedTime": ""
    }
  ]
}`;
    const parsed = await callGemini(prompt);
    if (typeof parsed !== 'object' || parsed === null || !Array.isArray(parsed.activities)) {
        throw new https_1.HttpsError('internal', 'Gemini did not return a valid DayPlan object.');
    }
    return parsed;
});
// ─── 3. suggestBestDay ────────────────────────────────────────────────────────
exports.suggestBestDay = (0, https_1.onCall)({ invoker: 'public' }, async (request) => {
    const data = request.data;
    if (typeof data.selectedPlace !== 'object' || data.selectedPlace === null) {
        throw new https_1.HttpsError('invalid-argument', 'Field "selectedPlace" must be an object.');
    }
    const selectedPlace = data.selectedPlace;
    const placeName = requireString(selectedPlace.name, 'selectedPlace.name');
    if (typeof data.itineraryByDay !== 'object' || data.itineraryByDay === null) {
        throw new https_1.HttpsError('invalid-argument', 'Field "itineraryByDay" must be an object.');
    }
    const prompt = `Given this itinerary: ${JSON.stringify(data.itineraryByDay)},
which day is best to add this place: ${placeName}?

Consider location proximity and day balance.

Return ONLY valid JSON — no explanations, no markdown, no extra text.
{
  "bestDay": 1,
  "reason": ""
}`;
    const parsed = await callGemini(prompt);
    const result = parsed;
    if (typeof result.bestDay !== 'number' || typeof result.reason !== 'string') {
        throw new https_1.HttpsError('internal', 'Gemini did not return a valid suggestBestDay response.');
    }
    return parsed;
});
// ─── 4. optimizeTrip ─────────────────────────────────────────────────────────
exports.optimizeTrip = (0, https_1.onCall)({ invoker: 'public' }, async (request) => {
    const data = request.data;
    if (typeof data.itineraryByDay !== 'object' || data.itineraryByDay === null) {
        throw new https_1.HttpsError('invalid-argument', 'Field "itineraryByDay" must be an object.');
    }
    const prompt = `Optimize this travel itinerary to reduce travel time and group nearby places.
Keep the same places — only reorder them for better route efficiency.

Itinerary: ${JSON.stringify(data.itineraryByDay)}

Return ONLY valid JSON — no explanations, no markdown, no extra text.
{
  "days": [
    {
      "day": 1,
      "places": [
        { "name": "" }
      ]
    }
  ]
}`;
    const parsed = await callGemini(prompt);
    const result = parsed;
    if (!Array.isArray(result.days)) {
        throw new https_1.HttpsError('internal', 'Gemini did not return a valid optimizeTrip response.');
    }
    return parsed;
});
// ─── 5. chatAssistant ────────────────────────────────────────────────────────
exports.chatAssistant = (0, https_1.onCall)({ invoker: 'public' }, async (request) => {
    var _a, _b;
    const data = request.data;
    const userMessage = requireString(data.userMessage, 'userMessage');
    const destination = requireString(data.destination, 'destination');
    const tripDates = requireString(data.tripDates, 'tripDates');
    const preferences = requireStringArray((_a = data.preferences) !== null && _a !== void 0 ? _a : [], 'preferences');
    const existingPlan = requireStringArray((_b = data.existingPlan) !== null && _b !== void 0 ? _b : [], 'existingPlan');
    const prompt = `You are a helpful travel assistant.

User is planning a trip to ${destination}.
Trip dates: ${tripDates}.
Preferences: ${preferences.join(', ') || 'none'}.
Existing plan: ${existingPlan.join(', ') || 'none'}.

User question: ${userMessage}

Give helpful and specific travel advice. Keep the answer concise and practical.

Return ONLY valid JSON — no explanations, no markdown wrapping.
{
  "reply": "your helpful answer here"
}`;
    const parsed = await callGemini(prompt);
    const result = parsed;
    if (typeof result.reply !== 'string') {
        throw new https_1.HttpsError('internal', 'Gemini did not return a valid chatAssistant response.');
    }
    return parsed;
});
//# sourceMappingURL=index.js.map