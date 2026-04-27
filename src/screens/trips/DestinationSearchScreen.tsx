import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Timestamp } from 'firebase/firestore';
import { RootStackParamList } from '@app-types/index';
import { useTripStore } from '@store/tripStore';
import { useDestinations } from '@hooks/useDestinations';
import { Input, Button } from '@components/ui';
import {
  searchPlaces,
  fetchPlaceDetails,
  getPhotoUrl,
  PlacePrediction,
  PlaceDetail,
} from '@services/places';

type Props = NativeStackScreenProps<RootStackParamList, 'DestinationSearch'>;

export default function DestinationSearchScreen({ route, navigation }: Props) {
  const { tripId, targetDate } = route.params;
  const trip = useTripStore((s) => s.trips.find((t) => t.id === tripId));
  const { destinations, addDestination, isLoading: isSaving } = useDestinations(tripId);

  // Resolve the timestamp to use when saving a new destination.
  // Priority: targetDate param → trip start date → now
  const resolvedDateTimestamp = React.useMemo(() => {
    if (targetDate) {
      const [y, m, d] = targetDate.split('-').map(Number);
      return Timestamp.fromDate(new Date(y, m - 1, d));
    }
    if (trip?.startDate) return trip.startDate;
    return Timestamp.now();
  }, [targetDate, trip?.startDate]);

  // Human-readable label shown in the header subtitle
  const dayLabel = React.useMemo(() => {
    if (!targetDate) return trip?.title ?? null;
    const [y, m, d] = targetDate.split('-').map(Number);
    const formatted = new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    return trip?.title ? `${trip.title} · ${formatted}` : formatted;
  }, [targetDate, trip?.title]);

  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedPlace, setSelectedPlace] = useState<PlaceDetail | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    setSearchError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(text.trim());
        setPredictions(results);
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : 'Search failed');
        setPredictions([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSelectPrediction = useCallback(async (prediction: PlacePrediction) => {
    Keyboard.dismiss();
    setIsFetchingDetails(true);
    try {
      const details = await fetchPlaceDetails(prediction.placeId);
      setSelectedPlace(details);
    } catch {
      Alert.alert('Error', 'Could not fetch place details. Please try again.');
    } finally {
      setIsFetchingDetails(false);
    }
  }, []);

  const handleAddToTrip = useCallback(async () => {
    if (!selectedPlace) return;

    const success = await addDestination({
      placeId: selectedPlace.placeId,
      name: selectedPlace.name,
      address: selectedPlace.address,
      lat: selectedPlace.lat,
      lng: selectedPlace.lng,
      photoReference: selectedPlace.photoReference,
      date: resolvedDateTimestamp,
      notes: '',
      order: destinations.length,
    });

    if (success) {
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Failed to save destination. Please try again.');
    }
  }, [selectedPlace, destinations.length, addDestination, navigation, resolvedDateTimestamp]);

  const renderPrediction = ({ item }: { item: PlacePrediction }) => (
    <TouchableOpacity
      className="flex-row items-center px-5 py-4 border-b border-border"
      onPress={() => handleSelectPrediction(item)}
      activeOpacity={0.6}
    >
      <View className="w-9 h-9 rounded-full bg-primary-light items-center justify-center mr-3 shrink-0">
        <Text className="text-base">📍</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
          {item.mainText}
        </Text>
        {!!item.secondaryText && (
          <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
            {item.secondaryText}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const photoUrl = selectedPlace?.photoReference
    ? getPhotoUrl(selectedPlace.photoReference, 600)
    : null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-border">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          className="mr-3"
        >
          <Text className="text-base text-muted-foreground font-medium">Cancel</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">Add Destination</Text>
          {dayLabel ? (
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {dayLabel}
            </Text>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Search bar */}
        <View className="px-5 pt-4 pb-3">
          <Input
            placeholder="Search for a place…"
            value={query}
            onChangeText={handleQueryChange}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            rightIcon={
              isSearching ? <ActivityIndicator size="small" color="#6B7280" /> : undefined
            }
          />
          {searchError ? (
            <Text className="text-xs text-destructive mt-1.5">{searchError}</Text>
          ) : null}
        </View>

        {/* Predictions list */}
        {predictions.length > 0 && !isFetchingDetails ? (
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.placeId}
            renderItem={renderPrediction}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        ) : null}

        {/* Idle / empty state */}
        {!isSearching && predictions.length === 0 && !query && !isFetchingDetails ? (
          <View className="flex-1 items-center justify-center px-10 pb-20">
            <Text className="text-5xl mb-4">🔍</Text>
            <Text className="text-base font-semibold text-foreground text-center mb-1">
              Search for a destination
            </Text>
            <Text className="text-sm text-muted-foreground text-center leading-5">
              Type a city, landmark, or address to find places to add to your trip.
            </Text>
          </View>
        ) : null}

        {/* No results state */}
        {!isSearching && predictions.length === 0 && !!query && !isFetchingDetails ? (
          <View className="flex-1 items-center justify-center px-10 pb-20">
            <Text className="text-5xl mb-4">😕</Text>
            <Text className="text-base font-semibold text-foreground text-center mb-1">
              No results found
            </Text>
            <Text className="text-sm text-muted-foreground text-center">
              Try a different search term.
            </Text>
          </View>
        ) : null}

        {/* Fetching details spinner */}
        {isFetchingDetails ? (
          <View className="flex-1 items-center justify-center pb-20">
            <ActivityIndicator size="large" color="#006a66" />
            <Text className="text-sm text-muted-foreground mt-3">Loading place details…</Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {/* Place detail bottom card */}
      {selectedPlace && !isFetchingDetails ? (
        <View className="absolute bottom-0 left-0 right-0">
          {/* Scrim */}
          <TouchableOpacity
            className="absolute inset-0"
            style={{ top: -9999 }}
            activeOpacity={1}
            onPress={() => setSelectedPlace(null)}
          />

          <View className="bg-surface rounded-t-3xl shadow-2xl border-t border-border overflow-hidden">
            {/* Photo */}
            <View style={{ height: 200 }} className="bg-muted">
              {photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-5xl">🗺️</Text>
                </View>
              )}
              {/* Drag handle */}
              <View className="absolute top-3 left-0 right-0 items-center">
                <View className="w-10 h-1 rounded-full bg-white/50" />
              </View>
            </View>

            <View className="px-5 pt-4 pb-6">
              {/* Name and rating */}
              <View className="flex-row items-start justify-between mb-1">
                <Text className="text-lg font-bold text-foreground flex-1 mr-3" numberOfLines={2}>
                  {selectedPlace.name}
                </Text>
                {selectedPlace.rating != null ? (
                  <View className="flex-row items-center bg-amber-50 rounded-full px-2.5 py-1 shrink-0">
                    <Text className="text-xs mr-1">⭐</Text>
                    <Text className="text-xs font-semibold text-amber-700">
                      {selectedPlace.rating.toFixed(1)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text className="text-sm text-muted-foreground mb-5" numberOfLines={2}>
                {selectedPlace.address}
              </Text>

              {/* Actions */}
              <Button
                onPress={handleAddToTrip}
                loading={isSaving}
                disabled={isSaving}
                size="lg"
              >
                Add to Trip
              </Button>

              <TouchableOpacity
                onPress={() => setSelectedPlace(null)}
                activeOpacity={0.7}
                className="items-center mt-3 py-2"
              >
                <Text className="text-sm font-medium text-muted-foreground">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
