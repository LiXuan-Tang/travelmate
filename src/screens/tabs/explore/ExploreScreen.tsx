import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  searchPlaces,
  fetchPlaceDetails,
  getPhotoUrl,
  searchPlacePhoto,
  searchTextPlaces,
  PlacePrediction,
  PlaceDetail,
  TextSearchPlace,
} from '@services/places';

// ─── Static data ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Beaches', icon: '🏖️', query: 'best beach destinations' },
  { label: 'Mountains', icon: '⛰️', query: 'top mountain destinations' },
  { label: 'Cities', icon: '🏙️', query: 'popular tourist cities' },
  { label: 'Nature', icon: '🌿', query: 'national parks nature reserves' },
  { label: 'Culture', icon: '🏛️', query: 'cultural heritage sites' },
  { label: 'Food', icon: '🍜', query: 'best food and culinary destinations' },
];

type FeaturedDest = { searchName: string; label: string; subtitle: string; emoji: string; photoUrl?: string | null };

const FEATURED_DESTS: FeaturedDest[] = [
  { searchName: 'Paris France',       label: 'Paris',       subtitle: 'France',       emoji: '🗼' },
  { searchName: 'Tokyo Japan',        label: 'Tokyo',       subtitle: 'Japan',        emoji: '🗾' },
  { searchName: 'Santorini Greece',   label: 'Santorini',   subtitle: 'Greece',       emoji: '🏛️' },
  { searchName: 'Bali Indonesia',     label: 'Bali',        subtitle: 'Indonesia',    emoji: '🌺' },
  { searchName: 'New York City USA',  label: 'New York',    subtitle: 'USA',          emoji: '🗽' },
  { searchName: 'Cape Town South Africa', label: 'Cape Town', subtitle: 'S. Africa', emoji: '🌍' },
];

const TOP_SPOTS = [
  { name: 'Eiffel Tower',        desc: 'Paris, France',              emoji: '🗼' },
  { name: 'Mount Fuji',          desc: 'Shizuoka, Japan',            emoji: '🗻' },
  { name: 'Colosseum Rome',      desc: 'Rome, Italy',                emoji: '🏛️' },
  { name: 'Taj Mahal',           desc: 'Agra, India',                emoji: '🕌' },
  { name: 'Great Barrier Reef',  desc: 'Queensland, Australia',      emoji: '🐠' },
  { name: 'Machu Picchu',        desc: 'Cusco Region, Peru',         emoji: '🏔️' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const [query, setQuery]           = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory]     = useState<string | null>(null);
  const [categoryResults, setCategoryResults]   = useState<TextSearchPlace[]>([]);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  const [selectedPlace, setSelectedPlace]       = useState<PlaceDetail | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const [featured, setFeatured] = useState<FeaturedDest[]>(FEATURED_DESTS);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        FEATURED_DESTS.map(async (d) => {
          const { url } = await searchPlacePhoto(d.searchName, 400);
          return { ...d, photoUrl: url };
        }),
      );
      if (!cancelled) setFeatured(results);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    setActiveCategory(null);
    setCategoryResults([]);
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

  const handleCategoryPress = useCallback(async (cat: (typeof CATEGORIES)[number]) => {
    Keyboard.dismiss();
    setQuery('');
    setPredictions([]);

    if (activeCategory === cat.label) {
      setActiveCategory(null);
      setCategoryResults([]);
      return;
    }

    setActiveCategory(cat.label);
    setCategoryResults([]);
    setIsCategoryLoading(true);
    try {
      const results = await searchTextPlaces(cat.query, 10);
      setCategoryResults(results);
    } finally {
      setIsCategoryLoading(false);
    }
  }, [activeCategory]);

  const openPlaceDetail = useCallback(async (placeId: string) => {
    Keyboard.dismiss();
    setIsFetchingDetails(true);
    try {
      const details = await fetchPlaceDetails(placeId);
      setSelectedPlace(details);
    } catch {
      // noop
    } finally {
      setIsFetchingDetails(false);
    }
  }, []);

  const handleSelectPrediction = useCallback((p: PlacePrediction) => {
    openPlaceDetail(p.placeId);
  }, [openPlaceDetail]);

  const handleSelectTextResult = useCallback((p: TextSearchPlace) => {
    openPlaceDetail(p.placeId);
  }, [openPlaceDetail]);

  const handleFeaturedPress = useCallback(async (d: FeaturedDest) => {
    Keyboard.dismiss();
    setIsFetchingDetails(true);
    try {
      const preds = await searchPlaces(d.searchName);
      if (preds.length > 0) {
        const details = await fetchPlaceDetails(preds[0].placeId);
        setSelectedPlace(details);
      }
    } catch {
      // noop
    } finally {
      setIsFetchingDetails(false);
    }
  }, []);

  const handleTopSpotPress = useCallback(async (spot: (typeof TOP_SPOTS)[number]) => {
    Keyboard.dismiss();
    setIsFetchingDetails(true);
    try {
      const preds = await searchPlaces(spot.name);
      if (preds.length > 0) {
        const details = await fetchPlaceDetails(preds[0].placeId);
        setSelectedPlace(details);
      }
    } catch {
      // noop
    } finally {
      setIsFetchingDetails(false);
    }
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const isTextSearch    = !!query;
  const isBrowsing      = !!activeCategory && !query;
  const isActive        = isTextSearch || isBrowsing;
  const isContentLoading = isSearching || isCategoryLoading;

  const detailPhotoUrl = selectedPlace?.photoReference
    ? getPhotoUrl(selectedPlace.photoReference, 600)
    : null;

  const renderPrediction = ({ item }: { item: PlacePrediction }) => (
    <TouchableOpacity
      className="flex-row items-center px-5 py-4 border-b border-border"
      onPress={() => handleSelectPrediction(item)}
      activeOpacity={0.6}
    >
      <View className="w-9 h-9 rounded-full bg-muted items-center justify-center mr-3 shrink-0">
        <Ionicons name="location-outline" size={16} color="#006a66" />
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
      <Ionicons name="chevron-forward" size={14} color="#d4cdb8" />
    </TouchableOpacity>
  );

  const renderTextResult = ({ item }: { item: TextSearchPlace }) => {
    const thumb = item.photoReference ? getPhotoUrl(item.photoReference, 120) : null;
    return (
      <TouchableOpacity
        className="flex-row items-center px-5 py-3 border-b border-border"
        onPress={() => handleSelectTextResult(item)}
        activeOpacity={0.6}
      >
        <View className="w-14 h-14 rounded-xl bg-muted overflow-hidden mr-3 shrink-0">
          {thumb ? (
            <Image source={{ uri: thumb }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="image-outline" size={22} color="#d4cdb8" />
            </View>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
            {item.address}
          </Text>
          {item.rating != null && (
            <View className="flex-row items-center mt-1">
              <Text className="text-xs mr-1">⭐</Text>
              <Text className="text-xs font-medium text-foreground">{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={14} color="#d4cdb8" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-7 pb-4">
        <Text className="text-2xl font-bold text-foreground tracking-tight">Explore</Text>
        <Text className="text-sm text-muted-foreground mt-1">Search destinations worldwide</Text>
      </View>

      {/* Search bar */}
      <View className="px-5 mb-5">
        <View className="flex-row items-center bg-muted rounded-xl px-4 border border-border">
          <Ionicons name="search-outline" size={18} color="#006a66" />
          <TextInput
            className="flex-1 text-sm text-foreground py-3 ml-2.5"
            placeholder="Search places, cities, landmarks…"
            placeholderTextColor="#9ca3a0"
            value={query}
            onChangeText={handleQueryChange}
            autoCorrect={false}
            returnKeyType="search"
          />
          {(query.length > 0 || isSearching) && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setPredictions([]);
                setIsSearching(false);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#006a66" />
              ) : (
                <Ionicons name="close-circle" size={18} color="#9ca3a0" />
              )}
            </TouchableOpacity>
          )}
        </View>
        {searchError ? (
          <Text className="text-xs text-destructive mt-1.5 px-1">{searchError}</Text>
        ) : null}
      </View>

      {/* Category chips */}
      <View className="px-5 mb-4">
        <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Browse by category
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.label;
            return (
              <TouchableOpacity
                key={cat.label}
                className={`flex-row items-center rounded-full px-4 py-2 border ${
                  isSelected ? 'bg-primary border-primary' : 'bg-surface border-border'
                }`}
                activeOpacity={0.65}
                onPress={() => handleCategoryPress(cat)}
              >
                <Text className="mr-1.5 text-sm">{cat.icon}</Text>
                <Text className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-foreground'}`}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isActive ? (
          <>
            {isContentLoading ? (
              <View className="flex-1 items-center justify-center pb-20">
                <ActivityIndicator size="large" color="#006a66" />
                <Text className="text-sm text-muted-foreground mt-3">
                  {isBrowsing ? `Finding ${activeCategory?.toLowerCase()}…` : 'Searching…'}
                </Text>
              </View>
            ) : isTextSearch && predictions.length === 0 ? (
              <View className="flex-1 items-center justify-center px-10 pb-20">
                <Text className="text-4xl mb-4">😕</Text>
                <Text className="text-base font-semibold text-foreground text-center mb-1">
                  No results found
                </Text>
                <Text className="text-sm text-muted-foreground text-center">
                  Try a different search term or browse by category.
                </Text>
              </View>
            ) : isBrowsing && categoryResults.length === 0 ? (
              <View className="flex-1 items-center justify-center px-10 pb-20">
                <Text className="text-4xl mb-4">🔍</Text>
                <Text className="text-base font-semibold text-foreground text-center mb-1">
                  No places found
                </Text>
                <Text className="text-sm text-muted-foreground text-center">
                  Try another category.
                </Text>
              </View>
            ) : isTextSearch ? (
              <FlatList
                data={predictions}
                keyExtractor={(item) => item.placeId}
                renderItem={renderPrediction}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <FlatList
                data={categoryResults}
                keyExtractor={(item) => item.placeId}
                renderItem={renderTextResult}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <View className="px-5 py-3 border-b border-border">
                    <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      Top {activeCategory} destinations
                    </Text>
                  </View>
                }
              />
            )}
          </>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {/* Featured destinations */}
            <View className="mb-8">
              <Text className="text-base font-semibold text-foreground px-5 mb-3">
                Featured Destinations
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              >
                {featured.map((dest) => (
                  <TouchableOpacity
                    key={dest.label}
                    style={{ width: 156, height: 210 }}
                    className="rounded-2xl overflow-hidden bg-muted"
                    activeOpacity={0.75}
                    onPress={() => handleFeaturedPress(dest)}
                    disabled={isFetchingDetails}
                  >
                    {dest.photoUrl ? (
                      <Image
                        source={{ uri: dest.photoUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Text className="text-5xl">{dest.emoji}</Text>
                      </View>
                    )}
                    <View
                      className="absolute bottom-0 left-0 right-0 px-3 pt-8 pb-3"
                      style={{ background: 'transparent' }}
                    >
                      <View
                        className="absolute bottom-0 left-0 right-0"
                        style={{ height: 72, backgroundColor: 'rgba(0,0,0,0.45)' }}
                      />
                      <Text className="text-white text-sm font-bold relative">{dest.label}</Text>
                      <Text className="text-white/70 text-xs relative">{dest.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Top travel spots */}
            <View className="px-5">
              <Text className="text-base font-semibold text-foreground mb-3">
                Top Travel Spots
              </Text>
              <View className="gap-3">
                {TOP_SPOTS.map((spot) => (
                  <TouchableOpacity
                    key={spot.name}
                    className="flex-row items-center bg-surface border border-border rounded-2xl px-4 py-4"
                    activeOpacity={0.7}
                    onPress={() => handleTopSpotPress(spot)}
                    disabled={isFetchingDetails}
                  >
                    <View className="w-12 h-12 rounded-xl bg-primary-light items-center justify-center mr-4 shrink-0">
                      <Text className="text-2xl">{spot.emoji}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground">{spot.name}</Text>
                      <Text className="text-xs text-muted-foreground mt-0.5">{spot.desc}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#d4cdb8" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Place detail overlay */}
      {(isFetchingDetails || selectedPlace) && (
        <View className="absolute inset-0" pointerEvents="box-none">
          <TouchableOpacity
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
            activeOpacity={1}
            onPress={() => {
              if (!isFetchingDetails) setSelectedPlace(null);
            }}
          />
          <View className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl overflow-hidden border-t border-border">
            {isFetchingDetails ? (
              <View className="items-center justify-center py-16">
                <ActivityIndicator size="large" color="#006a66" />
                <Text className="text-sm text-muted-foreground mt-3">Loading details…</Text>
              </View>
            ) : selectedPlace ? (
              <>
                {/* Photo banner */}
                <View style={{ height: 220 }} className="bg-muted">
                  {detailPhotoUrl ? (
                    <Image
                      source={{ uri: detailPhotoUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-primary-light">
                      <Text className="text-6xl">🗺️</Text>
                    </View>
                  )}
                  <View className="absolute top-3 left-0 right-0 items-center">
                    <View className="w-10 h-1 rounded-full bg-white/60" />
                  </View>
                </View>

                <View className="px-5 pt-4 pb-8">
                  <View className="flex-row items-start justify-between mb-1">
                    <Text className="text-lg font-bold text-foreground flex-1 mr-3" numberOfLines={2}>
                      {selectedPlace.name}
                    </Text>
                    {selectedPlace.rating != null && (
                      <View className="flex-row items-center bg-amber-50 rounded-full px-2.5 py-1 shrink-0">
                        <Text className="text-xs mr-1">⭐</Text>
                        <Text className="text-xs font-semibold text-amber-700">
                          {selectedPlace.rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center mb-5">
                    <Ionicons name="location-outline" size={13} color="#006a66" />
                    <Text className="text-sm text-muted-foreground ml-1 flex-1" numberOfLines={2}>
                      {selectedPlace.address}
                    </Text>
                  </View>

                  <TouchableOpacity
                    className="bg-primary rounded-xl py-4 items-center"
                    activeOpacity={0.75}
                    onPress={() => setSelectedPlace(null)}
                  >
                    <Text className="text-sm font-semibold text-white">Done</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
