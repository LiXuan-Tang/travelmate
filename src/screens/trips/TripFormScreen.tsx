import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@app-types/index';
import { useTripStore } from '@store/tripStore';
import { useTrips } from '@hooks/useTrips';
import { Input, Button, DatePickerModal } from '@components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'TripForm'>;

type DateField = 'startDate' | 'endDate';

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function TripFormScreen({ route, navigation }: Props) {
  const { tripId } = route.params ?? {};
  const isEditing = !!tripId;

  const existingTrip = useTripStore((s) => s.trips.find((t) => t.id === tripId));
  const { createTrip, editTrip, pickCoverImage, isLoading } = useTrips({ subscribe: false });

  const [title, setTitle] = useState(existingTrip?.title ?? '');
  const [coverImageUri, setCoverImageUri] = useState<string | null>(
    existingTrip?.coverImage ?? null,
  );
  const [startDate, setStartDate] = useState<Date>(
    existingTrip ? new Date(existingTrip.startDate.seconds * 1000) : new Date(),
  );
  const [endDate, setEndDate] = useState<Date>(
    existingTrip
      ? new Date(existingTrip.endDate.seconds * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const [visibility, setVisibility] = useState<TripVisibility>(
    existingTrip?.visibility ?? 'private',
  );
  const [titleError, setTitleError] = useState('');

  // Date picker modal state
  const [showPicker, setShowPicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<DateField>('startDate');

  const openDatePicker = useCallback((field: DateField) => {
    setActiveDateField(field);
    setShowPicker(true);
  }, []);

  const handleDateConfirm = useCallback(
    (date: Date) => {
      if (activeDateField === 'startDate') {
        setStartDate(date);
        if (date > endDate) setEndDate(date);
      } else {
        setEndDate(date);
      }
    },
    [activeDateField, endDate],
  );

  const handlePickImage = useCallback(async () => {
    const uri = await pickCoverImage();
    if (uri) setCoverImageUri(uri);
  }, [pickCoverImage]);

  const validate = () => {
    if (!title.trim()) {
      setTitleError('Trip title is required');
      return false;
    }
    if (endDate < startDate) {
      Alert.alert('Invalid Dates', 'End date must be on or after the start date.');
      return false;
    }
    setTitleError('');
    return true;
  };

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    const formData = { title, startDate, endDate, coverImageUri };

    if (isEditing && tripId) {
      const success = await editTrip(tripId, formData, existingTrip?.coverImage);
      if (success) navigation.goBack();
    } else {
      const id = await createTrip(formData);
      if (id) navigation.goBack();
    }
  }, [title, startDate, endDate, coverImageUri, isEditing, tripId, existingTrip?.coverImage, createTrip, editTrip, navigation]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text className="text-base text-muted-foreground font-medium">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-foreground">
          {isEditing ? 'Edit Trip' : 'New Trip'}
        </Text>
        <Button size="sm" onPress={handleSave} loading={isLoading} disabled={isLoading}>
          {isEditing ? 'Save' : 'Create'}
        </Button>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Cover Image */}
          <Text className="text-sm font-medium text-foreground mb-1.5">Cover Image</Text>
          <TouchableOpacity
            onPress={handlePickImage}
            activeOpacity={0.8}
            className="bg-muted border border-border rounded-2xl overflow-hidden mb-5"
            style={{ height: 180 }}
          >
            {coverImageUri ? (
              <Image source={{ uri: coverImageUri }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="flex-1 items-center justify-center gap-y-2">
                <Text className="text-3xl">🏔️</Text>
                <Text className="text-sm text-muted-foreground font-medium">
                  Tap to add a cover photo
                </Text>
              </View>
            )}
            {coverImageUri && (
              <View className="absolute bottom-0 left-0 right-0 bg-black/40 py-2 items-center">
                <Text className="text-white text-xs font-medium">Tap to change</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Title */}
          <View className="mb-5">
            <Input
              label="Trip Title"
              placeholder="e.g. Summer in Japan"
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                if (v.trim()) setTitleError('');
              }}
              error={titleError}
              autoCapitalize="words"
              returnKeyType="done"
              maxLength={60}
            />
          </View>

          {/* Dates */}
          <Text className="text-sm font-medium text-foreground mb-1.5">Travel Dates</Text>
          <View className="flex-row gap-x-3 mb-5">
            <TouchableOpacity
              className="flex-1 bg-muted border border-border rounded-xl px-4 py-3"
              onPress={() => openDatePicker('startDate')}
              activeOpacity={0.7}
            >
              <Text className="text-xs text-muted-foreground mb-0.5">Start Date</Text>
              <Text className="text-sm font-semibold text-foreground">{formatDate(startDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-muted border border-border rounded-xl px-4 py-3"
              onPress={() => openDatePicker('endDate')}
              activeOpacity={0.7}
            >
              <Text className="text-xs text-muted-foreground mb-0.5">End Date</Text>
              <Text className="text-sm font-semibold text-foreground">{formatDate(endDate)}</Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View className="items-center py-2">
              <ActivityIndicator size="small" color="#006a66" />
              <Text className="text-xs text-muted-foreground mt-1">
                {isEditing ? 'Saving changes…' : 'Creating trip…'}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date picker modal (pure JS — no native module) */}
      <DatePickerModal
        visible={showPicker}
        value={activeDateField === 'startDate' ? startDate : endDate}
        minimumDate={activeDateField === 'endDate' ? startDate : undefined}
        title={activeDateField === 'startDate' ? 'Start Date' : 'End Date'}
        onConfirm={handleDateConfirm}
        onClose={() => setShowPicker(false)}
      />
    </SafeAreaView>
  );
}
