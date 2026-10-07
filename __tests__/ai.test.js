/**
 * ai.test.js
 *
 * Module 5 — AI Planning
 * Covers UT44–UT53
 *
 *   UT44 — Verify that generateDayPlan routes to the correct Firebase Function and returns a complete DayPlan
 *   UT45 — Verify that generateDayPlan propagates a network timeout error to the caller
 *   UT46 — Verify that the DayPlan result retains all generated activities
 *   UT47 — Verify that generateSuggestions forwards destination and preferences in the callable request
 *   UT48 — Verify that generateSuggestions results contain all required AISuggestion fields
 *   UT49 — Verify that generateSuggestions returns suggestions across multiple preference categories
 *   UT50 — Verify that generateSuggestions returns results when no preferences are provided
 *   UT51 — Verify that chatAssistant rejects an empty or whitespace-only user message
 *   UT52 — Verify that chatAssistant returns a non-empty string reply matching the callable response
 *   UT53 — Verify that chatAssistant forwards the multi-turn conversation history in the callable request
 */

// Mock Firebase Functions SDK
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));

const aiService = require('../src/services/ai');
const { httpsCallable } = require('firebase/functions');

describe('AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── UT44 ──────────────────────────────────────────────────────────────────
  test('UT44 — Verify that generateDayPlan routes to the correct Firebase Function and returns a complete DayPlan', async () => {
    const mockDayPlan = {
      day: 1,
      activities: [
        { time: 'morning', name: 'Senso-ji Temple', description: 'Historic Buddhist temple', estimatedTime: '2 hours' },
        { time: 'afternoon', name: 'Akihabara', description: 'Electronics district', estimatedTime: '3 hours' },
        { time: 'evening', name: 'Shinjuku', description: 'Nightlife area', estimatedTime: '2 hours' },
      ],
    };

    httpsCallable.mockReturnValue(jest.fn().mockResolvedValue({ data: mockDayPlan }));

    const result = await aiService.generateDayPlan({
      destination: 'Tokyo',
      tripDates: '2024-01-01 to 2024-01-07',
      dayNumber: 1,
      preferences: ['culture', 'food'],
      existingPlan: [],
    });

    // Correct function name forwarded
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'generateDayPlan');
    // Complete DayPlan shape returned
    expect(result.day).toBe(1);
    expect(Array.isArray(result.activities)).toBe(true);
    expect(result.activities).toHaveLength(3);
    expect(result.activities[0]).toHaveProperty('time');
    expect(result.activities[0]).toHaveProperty('name');
    expect(result.activities[0]).toHaveProperty('description');
    expect(result.activities[0]).toHaveProperty('estimatedTime');
  });

  // ── UT45 ──────────────────────────────────────────────────────────────────
  test('UT45 — Verify that generateDayPlan propagates a network timeout error to the caller', async () => {
    const timeoutError = new Error('functions/deadline-exceeded');
    httpsCallable.mockReturnValue(jest.fn().mockRejectedValue(timeoutError));

    await expect(
      aiService.generateDayPlan({
        destination: 'Tokyo',
        tripDates: '2024-01-01 to 2024-01-07',
        dayNumber: 1,
        preferences: [],
        existingPlan: [],
      }),
    ).rejects.toThrow('functions/deadline-exceeded');
  });

  // ── UT46 ──────────────────────────────────────────────────────────────────
  test('UT46 — Verify that the DayPlan result retains all generated activities', async () => {
    const mockPlan = {
      day: 2,
      activities: [
        { time: 'morning', name: 'Mount Fuji', description: 'Iconic volcano', estimatedTime: '5 hours' },
        { time: 'afternoon', name: 'Hakone', description: 'Hot springs', estimatedTime: '3 hours' },
      ],
    };
    httpsCallable.mockReturnValue(jest.fn().mockResolvedValue({ data: mockPlan }));

    const result = await aiService.generateDayPlan({
      destination: 'Hakone',
      tripDates: '2024-01-02 to 2024-01-07',
      dayNumber: 2,
      preferences: [],
      existingPlan: [],
    });

    expect(result.activities).toHaveLength(2);
    expect(result.day).toBe(2);
  });

  // ── UT47 ──────────────────────────────────────────────────────────────────
  test('UT47 — Verify that generateSuggestions forwards destination and preferences in the callable request', async () => {
    const mockFn = jest.fn().mockResolvedValue({ data: [] });
    httpsCallable.mockReturnValue(mockFn);

    await aiService.generateSuggestions({
      destination: 'Paris',
      tripDates: '2024-03-01 to 2024-03-05',
      preferences: ['museums', 'food'],
      existingPlan: ['Eiffel Tower'],
    });

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'generateSuggestions');
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: 'Paris',
        preferences: ['museums', 'food'],
      }),
    );
  });

  // ── UT48 ──────────────────────────────────────────────────────────────────
  test('UT48 — Verify that generateSuggestions results contain all required AISuggestion fields', async () => {
    const mockSuggestions = [
      {
        name: 'Louvre Museum',
        description: 'World-famous art museum',
        reason: 'Matches your interest in museums',
        category: 'Culture',
        estimatedTime: '3 hours',
        bestTime: 'morning',
        lat: 48.86,
        lng: 2.33,
      },
    ];

    httpsCallable.mockReturnValue(jest.fn().mockResolvedValue({ data: mockSuggestions }));

    const results = await aiService.generateSuggestions({
      destination: 'Paris',
      tripDates: '2024-03-01 to 2024-03-05',
      preferences: ['museums'],
      existingPlan: [],
    });

    expect(results).toHaveLength(1);
    const s = results[0];
    expect(s).toHaveProperty('name');
    expect(s).toHaveProperty('description');
    expect(s).toHaveProperty('reason');
    expect(s).toHaveProperty('category');
    expect(s).toHaveProperty('estimatedTime');
    expect(s).toHaveProperty('lat');
    expect(s).toHaveProperty('lng');
  });

  // ── UT49 ──────────────────────────────────────────────────────────────────
  test('UT49 — Verify that generateSuggestions returns suggestions across multiple preference categories', async () => {
    const mockSuggestions = [
      { name: 'Le Bistro', description: 'Classic French cuisine', reason: 'Food match', category: 'Food', estimatedTime: '1.5 hours', bestTime: 'evening', lat: 48.85, lng: 2.34 },
      { name: 'Montmartre Walk', description: 'Scenic neighbourhood', reason: 'Sightseeing', category: 'Sightseeing', estimatedTime: '2 hours', bestTime: 'afternoon', lat: 48.88, lng: 2.34 },
    ];

    httpsCallable.mockReturnValue(jest.fn().mockResolvedValue({ data: mockSuggestions }));

    const results = await aiService.generateSuggestions({
      destination: 'Paris',
      tripDates: '2024-03-01 to 2024-03-05',
      preferences: ['food', 'sightseeing'],
      existingPlan: [],
    });

    const categories = results.map((s) => s.category);
    expect(categories).toContain('Food');
    expect(categories).toContain('Sightseeing');
  });

  // ── UT50 ──────────────────────────────────────────────────────────────────
  test('UT50 — Verify that generateSuggestions returns results when no preferences are provided', async () => {
    const genericSuggestions = [
      { name: 'City Centre', description: 'Heart of the city', reason: 'Popular spot', category: 'General', estimatedTime: '2 hours', bestTime: 'morning', lat: 0, lng: 0 },
    ];

    httpsCallable.mockReturnValue(jest.fn().mockResolvedValue({ data: genericSuggestions }));

    const results = await aiService.generateSuggestions({
      destination: 'London',
      tripDates: '2024-06-01 to 2024-06-07',
      preferences: [],
      existingPlan: [],
    });

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'generateSuggestions');
    expect(Array.isArray(results)).toBe(true);
  });

  // ── UT51 ──────────────────────────────────────────────────────────────────
  test('UT51 — Verify that chatAssistant rejects an empty or whitespace-only user message', async () => {
    await expect(
      aiService.chatAssistant({
        userMessage: '   ',
        destination: 'Tokyo',
        tripDates: '2024-01-01 to 2024-01-07',
        preferences: [],
        existingPlan: [],
      }),
    ).rejects.toThrow('Chat message cannot be empty');

    expect(httpsCallable).not.toHaveBeenCalled();
  });

  // ── UT52 ──────────────────────────────────────────────────────────────────
  test('UT52 — Verify that chatAssistant returns a non-empty string reply matching the callable response', async () => {
    const expectedReply = 'Here are my top recommendations for Day 2 in Osaka...';
    httpsCallable.mockReturnValue(
      jest.fn().mockResolvedValue({ data: { reply: expectedReply } }),
    );

    const result = await aiService.chatAssistant({
      userMessage: 'Plan my Day 2 in Osaka',
      destination: 'Osaka',
      tripDates: '2024-02-01 to 2024-02-05',
      preferences: ['food'],
      existingPlan: ['Dotonbori'],
    });

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toBe(expectedReply);
  });

  // ── UT53 ──────────────────────────────────────────────────────────────────
  test('UT53 — Verify that chatAssistant forwards the multi-turn conversation history in the callable request', async () => {
    const mockFn = jest.fn().mockResolvedValue({ data: { reply: 'Based on your plan...' } });
    httpsCallable.mockReturnValue(mockFn);

    const conversationHistory = ['Senso-ji Temple', 'Akihabara', 'Shinjuku'];

    await aiService.chatAssistant({
      userMessage: 'What should I add for Day 2?',
      destination: 'Tokyo',
      tripDates: '2024-01-01 to 2024-01-07',
      preferences: ['culture'],
      existingPlan: conversationHistory,
    });

    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: 'What should I add for Day 2?',
        existingPlan: conversationHistory,
      }),
    );
  });
});
