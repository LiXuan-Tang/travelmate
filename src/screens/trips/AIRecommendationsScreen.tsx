import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Timestamp } from 'firebase/firestore';
import { RootStackParamList, AISuggestion, DayPlanActivity } from '@app-types/index';
import { useTripStore } from '@store/tripStore';
import { useDestinations } from '@hooks/useDestinations';
import { useAISuggestions, useAIDayPlan, useAIBestDay } from '@hooks/useAI';
import { AISuggestionCard } from '@components/ui';
import { searchPlacePhoto } from '@services/places';

type Props = NativeStackScreenProps<RootStackParamList, 'AIRecommendations'>;

// ─── Day Plan Modal ───────────────────────────────────────────────────────────

interface DayPlanModalProps {
  visible: boolean;
  dayNumber: number;
  maxDay: number;
  activities: DayPlanActivity[];
  isLoading: boolean;
  error: string | null;
  addedNames: Set<string>;
  isAddingAll: boolean;
  onClose: () => void;
  onSelectDay: (day: number) => void;
  onAddActivity: (activity: DayPlanActivity) => Promise<void>;
  onAddAll: () => Promise<void>;
}

function DayPlanModal({
  visible,
  dayNumber,
  maxDay,
  activities,
  isLoading,
  error,
  addedNames,
  isAddingAll,
  onClose,
  onSelectDay,
  onAddActivity,
  onAddAll,
}: DayPlanModalProps) {
  const TIME_COLOR: Record<string, string> = {
    morning: 'text-amber-600',
    afternoon: 'text-blue-600',
    evening: 'text-indigo-600',
  };
  const TIME_BG: Record<string, string> = {
    morning: 'bg-amber-50 border-amber-200',
    afternoon: 'bg-blue-50 border-blue-200',
    evening: 'bg-indigo-50 border-indigo-200',
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-4 border-b border-border">
          <Text className="text-base font-bold text-foreground">Generate Day Plan</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text className="text-sm font-medium text-muted-foreground">Done</Text>
          </TouchableOpacity>
        </View>

        {/* Day selector */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Select Day
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => onSelectDay(d)}
                activeOpacity={0.75}
                className={`mx-1 px-4 py-2 rounded-xl border ${
                  dayNumber === d
                    ? 'bg-foreground border-foreground'
                    : 'bg-surface border-border'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    dayNumber === d ? 'text-white' : 'text-foreground'
                  }`}
                >
                  Day {d}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-5 pt-3"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View className="items-center pt-16">
              <ActivityIndicator size="large" color="#2563EB" />
              <Text className="mt-3 text-sm text-muted-foreground">
                Generating Day {dayNumber} plan…
              </Text>
            </View>
          ) : error ? (
            <View className="items-center pt-16 px-6">
              <Text className="text-2xl mb-3">⚠️</Text>
              <Text className="text-sm text-center text-muted-foreground">{error}</Text>
            </View>
          ) : activities.length === 0 ? (
            <View className="items-center pt-16 px-6">
              <Text className="text-3xl mb-3">🗓️</Text>
              <Text className="text-sm font-semibold text-foreground mb-1">
                No plan yet
              </Text>
              <Text className="text-xs text-muted-foreground text-center">
                Select a day above to generate an AI-powered itinerary.
              </Text>
            </View>
          ) : (
            activities.map((activity, idx) => {
              const timeKey = activity.time?.toLowerCase() ?? 'morning';
              const colorClass = TIME_COLOR[timeKey] ?? 'text-muted-foreground';
              const bgClass = TIME_BG[timeKey] ?? 'bg-muted border-border';
              const isAdded = addedNames.has(activity.name);
              return (
                <View key={idx} className={`border rounded-2xl p-4 mb-3 ${bgClass}`}>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className={`text-xs font-bold uppercase tracking-wider ${colorClass}`}>
                      {activity.time}
                    </Text>
                    {activity.estimatedTime ? (
                      <Text className="text-xs text-muted-foreground">
                        ⏱ {activity.estimatedTime}
                      </Text>
                    ) : null}
                  </View>
                  <View className="flex-row items-start justify-between gap-x-3">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground mb-1">
                        {activity.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground leading-5">
                        {activity.description}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => onAddActivity(activity)}
                      disabled={isAdded}
                      activeOpacity={0.75}
                      className={`rounded-xl px-3 py-1.5 shrink-0 ${
                        isAdded ? 'bg-muted' : 'bg-foreground'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isAdded ? 'text-muted-foreground' : 'text-white'
                        }`}
                      >
                        {isAdded ? '✓ Added' : '+ Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Add All footer */}
        {activities.length > 0 && !isLoading && !error && (
          <View className="px-5 pb-4 pt-2 border-t border-border">
            <TouchableOpacity
              onPress={onAddAll}
              disabled={isAddingAll || activities.every((a) => addedNames.has(a.name))}
              activeOpacity={0.85}
              className={`rounded-2xl py-3 items-center ${
                isAddingAll || activities.every((a) => addedNames.has(a.name))
                  ? 'bg-muted'
                  : 'bg-foreground'
              }`}
            >
              {isAddingAll ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  className={`text-sm font-semibold ${
                    activities.every((a) => addedNames.has(a.name))
                      ? 'text-muted-foreground'
                      : 'text-white'
                  }`}
                >
                  {activities.every((a) => addedNames.has(a.name))
                    ? '✓ All Added to Trip'
                    : 'Add All to Trip'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AIRecommendationsScreen({ route, navigation }: Props) {
  const { tripId, destination, tripDates, preferences } = route.params;

  const { trips } = useTripStore();
  const trip = trips.find((t) => t.id === tripId) ?? null;
  const { destinations, addDestination } = useDestinations(tripId);

  const { suggestions, isLoading, error, fetchSuggestions } = useAISuggestions();
  const dayPlanHook = useAIDayPlan();
  const bestDayHook = useAIBestDay();

  const [addingId, setAddingId] = useState<string | null>(null);
  const [dayPlanVisible, setDayPlanVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [addedActivityNames, setAddedActivityNames] = useState<Set<string>>(new Set());
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [photoRefMap, setPhotoRefMap] = useState<Record<string, string>>({});

  // Compute max days from trip
  const tripDuration = useMemo(() => {
    if (!trip?.startDate?.seconds || !trip?.endDate?.seconds) return 3;
    const diff = trip.endDate.seconds - trip.startDate.seconds;
    return Math.max(1, Math.ceil(diff / 86400) + 1);
  }, [trip]);

  // Build itinerary grouped by day for AI calls
  const itineraryByDay = useMemo(() => {
    const map: Record<string, { name: string }[]> = {};
    destinations.forEach((d) => {
      const key = d.date?.seconds
        ? `Day ${Math.round((d.date.seconds - (trip?.startDate?.seconds ?? 0)) / 86400) + 1}`
        : 'Unscheduled';
      if (!map[key]) map[key] = [];
      map[key].push({ name: d.name });
    });
    return map;
  }, [destinations, trip]);

  const existingPlanNames = useMemo(
    () => destinations.map((d) => d.name),
    [destinations],
  );

  // Serialise itineraryByDay as day → string[] for the suggestions API
  const itineraryByDayNames = useMemo<Record<string, string[]>>(() => {
    const result: Record<string, string[]> = {};
    for (const [day, places] of Object.entries(itineraryByDay)) {
      result[day] = places.map((p) => p.name);
    }
    return result;
  }, [itineraryByDay]);

  // Derive categories already represented from suggestions that were added to the itinerary
  const existingCategories = useMemo(() => {
    const addedNames = new Set(existingPlanNames);
    return [
      ...new Set(
        suggestions.filter((s) => addedNames.has(s.name)).map((s) => s.category),
      ),
    ];
  }, [suggestions, existingPlanNames]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchSuggestions({
      destination,
      tripDates,
      preferences,
      existingPlan: existingPlanNames,
      itineraryByDay: itineraryByDayNames,
      existingCategories,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch cover photos for each suggestion after they load
  useEffect(() => {
    if (!suggestions.length) return;
    let cancelled = false;

    const fetchPhotos = async () => {
      const results = await Promise.allSettled(
        suggestions.map((s) =>
          searchPlacePhoto(`${s.name} ${destination}`).then(
            (result) => ({ name: s.name, ...result }),
          ),
        ),
      );
      if (cancelled) return;
      const urlMap: Record<string, string> = {};
      const refMap: Record<string, string> = {};
      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value.url) urlMap[r.value.name] = r.value.url;
          if (r.value.photoRef) refMap[r.value.name] = r.value.photoRef;
        }
      }
      setPhotoMap(urlMap);
      setPhotoRefMap(refMap);
    };

    fetchPhotos();
    return () => { cancelled = true; };
  }, [suggestions, destination]);

  // When selected day changes inside modal, fetch plan
  const handleSelectDay = useCallback(
    (day: number) => {
      setSelectedDay(day);
      setAddedActivityNames(new Set());
      const existingPlacesOnDay = itineraryByDay[`Day ${day}`]?.map((p) => p.name) ?? [];
      dayPlanHook.fetchDayPlan({
        destination,
        tripDates,
        dayNumber: day,
        preferences,
        existingPlan: existingPlanNames,
        existingPlacesOnDay,
      });
    },
    [destination, tripDates, preferences, existingPlanNames, itineraryByDay, dayPlanHook],
  );

  const openDayPlanModal = useCallback(() => {
    setDayPlanVisible(true);
    setSelectedDay(1);
    setAddedActivityNames(new Set());
    const existingPlacesOnDay = itineraryByDay['Day 1']?.map((p) => p.name) ?? [];
    dayPlanHook.fetchDayPlan({
      destination,
      tripDates,
      dayNumber: 1,
      preferences,
      existingPlan: existingPlanNames,
      existingPlacesOnDay,
    });
  }, [destination, tripDates, preferences, existingPlanNames, itineraryByDay, dayPlanHook]);

  const handleAddDayPlanActivity = useCallback(
    async (activity: DayPlanActivity) => {
      const dateTimestamp = trip?.startDate?.seconds
        ? new Timestamp(trip.startDate.seconds + (selectedDay - 1) * 86400, 0)
        : Timestamp.now();
      const { photoRef } = await searchPlacePhoto(`${activity.name} ${destination}`);
      await addDestination({
        placeId: `ai-day-${Date.now()}`,
        name: activity.name,
        address: '',
        photoReference: photoRef ?? null,
        lat: 0,
        lng: 0,
        date: dateTimestamp,
        notes: activity.description,
        order: destinations.length,
      });
      setAddedActivityNames((prev) => new Set([...prev, activity.name]));
    },
    [trip, selectedDay, destination, addDestination, destinations.length],
  );

  const handleAddAllDayPlanActivities = useCallback(async () => {
    const activities = dayPlanHook.dayPlan?.activities ?? [];
    const pending = activities.filter((a) => !addedActivityNames.has(a.name));
    if (pending.length === 0) return;
    setIsAddingAll(true);
    try {
      const dateTimestamp = trip?.startDate?.seconds
        ? new Timestamp(trip.startDate.seconds + (selectedDay - 1) * 86400, 0)
        : Timestamp.now();
      const photoResults = await Promise.allSettled(
        pending.map((a) => searchPlacePhoto(`${a.name} ${destination}`)),
      );
      await Promise.all(
        pending.map((activity, idx) => {
          const photoRef =
            photoResults[idx].status === 'fulfilled'
              ? (photoResults[idx] as PromiseFulfilledResult<{ photoRef: string | null }>).value.photoRef
              : null;
          return addDestination({
            placeId: `ai-day-${Date.now()}-${idx}`,
            name: activity.name,
            address: '',
            photoReference: photoRef ?? null,
            lat: 0,
            lng: 0,
            date: dateTimestamp,
            notes: activity.description,
            order: destinations.length + idx,
          });
        }),
      );
      setAddedActivityNames(new Set(activities.map((a) => a.name)));
    } finally {
      setIsAddingAll(false);
    }
  }, [dayPlanHook.dayPlan?.activities, addedActivityNames, trip, selectedDay, destination, addDestination, destinations.length]);

  // Add to Itinerary flow
  const handleAddToItinerary = useCallback(
    async (suggestion: AISuggestion) => {
      setAddingId(suggestion.name);
      try {
        const bestDay = await bestDayHook.fetchBestDay({
          selectedPlace: { name: suggestion.name, category: suggestion.category },
          itineraryByDay,
        });

        if (!bestDay) {
          setAddingId(null);
          return;
        }

        Alert.alert(
          `Add to Day ${bestDay.bestDay}?`,
          bestDay.reason,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setAddingId(null) },
            {
              text: `Add to Day ${bestDay.bestDay}`,
              onPress: async () => {
                // Compute timestamp for target day
                let dateTimestamp: Timestamp;
                if (trip?.startDate?.seconds) {
                  const targetSecs =
                    trip.startDate.seconds + (bestDay.bestDay - 1) * 86400;
                  dateTimestamp = new Timestamp(targetSecs, 0);
                } else {
                  dateTimestamp = Timestamp.now();
                }

                await addDestination({
                  placeId: `ai-${Date.now()}`,
                  name: suggestion.name,
                  address: '',
                  photoReference: photoRefMap[suggestion.name] ?? null,
                  lat: suggestion.lat,
                  lng: suggestion.lng,
                  date: dateTimestamp,
                  notes: suggestion.description,
                  order: destinations.length,
                });
                setAddingId(null);
              },
            },
          ],
        );
      } catch {
        setAddingId(null);
      }
    },
    [bestDayHook, itineraryByDay, trip, addDestination, destinations.length],
  );

  const handleRefresh = useCallback(() => {
    fetchSuggestions({
      destination,
      tripDates,
      preferences,
      existingPlan: existingPlanNames,
      itineraryByDay: itineraryByDayNames,
      existingCategories,
    });
  }, [destination, tripDates, preferences, existingPlanNames, itineraryByDayNames, existingCategories, fetchSuggestions]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text className="text-base font-bold text-foreground">←</Text>
        </TouchableOpacity>

        <View className="flex-1 mx-4">
          <Text className="text-base font-bold text-foreground text-center" numberOfLines={1}>
            AI Suggestions
          </Text>
          <Text className="text-xs text-muted-foreground text-center" numberOfLines={1}>
            {destination}
          </Text>
        </View>

        <TouchableOpacity
          onPress={openDayPlanModal}
          activeOpacity={0.75}
          className="bg-primary rounded-xl px-3 py-2"
        >
          <Text className="text-xs font-semibold text-white">Day Plan</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="mt-3 text-sm text-muted-foreground">
            Finding the best places for you…
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-3xl mb-3">⚠️</Text>
          <Text className="text-base font-semibold text-foreground mb-1 text-center">
            Could not load suggestions
          </Text>
          <Text className="text-sm text-muted-foreground text-center mb-6">{error}</Text>
          <TouchableOpacity
            onPress={handleRefresh}
            activeOpacity={0.75}
            className="bg-primary rounded-xl px-5 py-3"
          >
            <Text className="text-sm font-semibold text-white">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <AISuggestionCard
              suggestion={item}
              onAddToItinerary={handleAddToItinerary}
              isAdding={addingId === item.name}
              photoUrl={photoMap[item.name]}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View className="mb-4">
              <Text className="text-xs text-muted-foreground leading-5">
                {suggestions.length} AI-curated suggestions for your trip to{' '}
                <Text className="font-semibold text-foreground">{destination}</Text>.
                Tap a card to add it directly to your itinerary.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center pt-16">
              <Text className="text-3xl mb-3">🤖</Text>
              <Text className="text-base font-semibold text-foreground mb-1">
                No suggestions yet
              </Text>
              <TouchableOpacity onPress={handleRefresh} activeOpacity={0.75}>
                <Text className="text-sm font-semibold text-primary">Generate Now</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Day Plan Modal */}
      <DayPlanModal
        visible={dayPlanVisible}
        dayNumber={selectedDay}
        maxDay={tripDuration}
        activities={dayPlanHook.dayPlan?.activities ?? []}
        isLoading={dayPlanHook.isLoading}
        error={dayPlanHook.error}
        addedNames={addedActivityNames}
        isAddingAll={isAddingAll}
        onClose={() => {
          setDayPlanVisible(false);
          setAddedActivityNames(new Set());
          dayPlanHook.reset();
        }}
        onSelectDay={handleSelectDay}
        onAddActivity={handleAddDayPlanActivity}
        onAddAll={handleAddAllDayPlanActivities}
      />
    </SafeAreaView>
  );
}
