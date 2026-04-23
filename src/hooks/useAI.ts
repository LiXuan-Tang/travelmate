import { useState, useCallback } from 'react';
import { AISuggestion, DayPlan, BestDaySuggestion, OptimizedTrip, ChatMessage } from '@app-types/index';
import * as aiService from '@services/ai';
import type {
  GenerateSuggestionsParams,
  GenerateDayPlanParams,
  SuggestBestDayParams,
  OptimizeTripParams,
  ChatAssistantParams,
} from '@services/ai';

// ─── useAISuggestions ─────────────────────────────────────────────────────────

export function useAISuggestions() {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async (params: GenerateSuggestionsParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await aiService.generateSuggestions(params);
      setSuggestions(data);
      return data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch suggestions';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { suggestions, isLoading, error, fetchSuggestions };
}

// ─── useAIDayPlan ─────────────────────────────────────────────────────────────

export function useAIDayPlan() {
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDayPlan = useCallback(async (params: GenerateDayPlanParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await aiService.generateDayPlan(params);
      setDayPlan(data);
      return data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to generate day plan';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setDayPlan(null);
    setError(null);
  }, []);

  return { dayPlan, isLoading, error, fetchDayPlan, reset };
}

// ─── useAIBestDay ─────────────────────────────────────────────────────────────

export function useAIBestDay() {
  const [result, setResult] = useState<BestDaySuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBestDay = useCallback(async (params: SuggestBestDayParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await aiService.suggestBestDay(params);
      setResult(data);
      return data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to suggest best day';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, fetchBestDay, reset };
}

// ─── useAIOptimize ────────────────────────────────────────────────────────────

export function useAIOptimize() {
  const [optimized, setOptimized] = useState<OptimizedTrip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOptimized = useCallback(async (params: OptimizeTripParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await aiService.optimizeTrip(params);
      setOptimized(data);
      return data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to optimize trip';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { optimized, isLoading, error, fetchOptimized };
}

// ─── useAIChat ────────────────────────────────────────────────────────────────

// In-memory cache keyed by tripId — survives navigation but resets on full app restart.
const chatHistoryCache = new Map<string, ChatMessage[]>();

export function useAIChat(tripId: string, baseParams: Omit<ChatAssistantParams, 'userMessage'>) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => chatHistoryCache.get(tripId) ?? [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text,
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const updated = [...prev, userMsg];
        chatHistoryCache.set(tripId, updated);
        return updated;
      });
      setIsLoading(true);
      setError(null);

      try {
        const reply = await aiService.chatAssistant({ ...baseParams, userMessage: text });
        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: reply,
          timestamp: Date.now(),
        };
        setMessages((prev) => {
          const updated = [...prev, assistantMsg];
          chatHistoryCache.set(tripId, updated);
          return updated;
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to get reply';
        setError(msg);
        const errMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: 'Sorry, I could not process your request. Please try again.',
          timestamp: Date.now(),
        };
        setMessages((prev) => {
          const updated = [...prev, errMsg];
          chatHistoryCache.set(tripId, updated);
          return updated;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [tripId, baseParams],
  );

  return { messages, isLoading, error, sendMessage };
}
