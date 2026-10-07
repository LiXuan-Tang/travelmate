import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase/config';
import type {
  AISuggestion,
  DayPlan,
  BestDaySuggestion,
  OptimizedTrip,
} from '@app-types/index';

const fns = getFunctions(app);

// ─── Request / response types ─────────────────────────────────────────────────

export interface GenerateSuggestionsParams {
  destination: string;
  tripDates: string;
  preferences: string[];
  existingPlan: string[];
  itineraryByDay?: Record<string, string[]>;
  existingCategories?: string[];
}

export interface GenerateDayPlanParams {
  destination: string;
  tripDates: string;
  dayNumber: number;
  preferences: string[];
  existingPlan: string[];
  existingPlacesOnDay?: string[];
}

export interface SuggestBestDayParams {
  selectedPlace: { name: string; [key: string]: unknown };
  itineraryByDay: Record<string, { name: string }[]>;
}

export interface OptimizeTripParams {
  itineraryByDay: Record<string, { name: string }[]>;
}

export interface ChatAssistantParams {
  userMessage: string;
  destination: string;
  tripDates: string;
  preferences: string[];
  existingPlan: string[];
}

// ─── Callable wrappers ────────────────────────────────────────────────────────

export async function generateSuggestions(
  params: GenerateSuggestionsParams,
): Promise<AISuggestion[]> {
  const fn = httpsCallable<GenerateSuggestionsParams, AISuggestion[]>(
    fns,
    'generateSuggestions',
  );
  const result = await fn(params);
  return result.data;
}

export async function generateDayPlan(params: GenerateDayPlanParams): Promise<DayPlan> {
  const fn = httpsCallable<GenerateDayPlanParams, DayPlan>(fns, 'generateDayPlan');
  const result = await fn(params);
  return result.data;
}

export async function suggestBestDay(
  params: SuggestBestDayParams,
): Promise<BestDaySuggestion> {
  const fn = httpsCallable<SuggestBestDayParams, BestDaySuggestion>(fns, 'suggestBestDay');
  const result = await fn(params);
  return result.data;
}

export async function optimizeTrip(params: OptimizeTripParams): Promise<OptimizedTrip> {
  const fn = httpsCallable<OptimizeTripParams, OptimizedTrip>(fns, 'optimizeTrip');
  const result = await fn(params);
  return result.data;
}

export async function chatAssistant(params: ChatAssistantParams): Promise<string> {
  if (!params.userMessage?.trim()) {
    throw new Error('Chat message cannot be empty');
  }
  const fn = httpsCallable<ChatAssistantParams, { reply: string }>(fns, 'chatAssistant');
  const result = await fn(params);
  return result.data.reply;
}
