import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  PanResponder,
  SectionList,
  SectionListData,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Timestamp } from 'firebase/firestore';
import { RootStackParamList, Destination, Trip } from '@app-types/index';
import { useTripStore } from '@store/tripStore';
import { useDestinations } from '@hooks/useDestinations';
import { useAIOptimize, useAIDayPlan } from '@hooks/useAI';
import { DayPlanActivity } from '@app-types/index';
import { DatePickerModal } from '@components/ui';
import { getPhotoUrl, searchPlacePhoto } from '@services/places';

type Props = NativeStackScreenProps<RootStackParamList, 'Itinerary'>;

interface ItinerarySection {
  dateKey: string;
  title: string;
  dayNumber: number | null;
  data: Destination[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateKey(ts: Timestamp | null | undefined): string {
  if (!ts?.seconds) return 'unscheduled';
  const d = new Date(ts.seconds * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatSectionTitle(dateKey: string): string {
  if (dateKey === 'unscheduled') return 'Unscheduled';
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function computeDayNumber(dateKey: string, tripStartDate?: Timestamp): number | null {
  if (dateKey === 'unscheduled' || !tripStartDate?.seconds) return null;
  const [y, m, d] = dateKey.split('-').map(Number);
  const sectionDay = new Date(y, m - 1, d).getTime();
  const tripStart = new Date(
    new Date(tripStartDate.seconds * 1000).toDateString(),
  ).getTime();
  const diff = Math.round((sectionDay - tripStart) / 86400000);
  return diff >= 0 ? diff + 1 : null;
}

function groupIntoSections(
  destinations: Destination[],
  tripStartDate?: Timestamp,
): ItinerarySection[] {
  const map = new Map<string, Destination[]>();

  [...destinations]
    .sort((a, b) => {
      const aKey = toDateKey(a.date);
      const bKey = toDateKey(b.date);
      if (aKey === 'unscheduled' && bKey !== 'unscheduled') return 1;
      if (bKey === 'unscheduled' && aKey !== 'unscheduled') return -1;
      if (aKey !== bKey) return aKey < bKey ? -1 : 1;
      return (a.order ?? 0) - (b.order ?? 0);
    })
    .forEach((dest) => {
      const key = toDateKey(dest.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(dest);
    });

  return Array.from(map.entries()).map(([dateKey, data]) => ({
    dateKey,
    title: formatSectionTitle(dateKey),
    dayNumber: computeDayNumber(dateKey, tripStartDate),
    data,
  }));
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  section,
  onGenerateDayPlan,
  onAddToDay,
}: {
  section: ItinerarySection;
  onGenerateDayPlan?: (dayNumber: number) => void;
  onAddToDay?: (dateKey: string) => void;
}) {
  return (
    <View className="flex-row items-center px-5 py-2 bg-background">
      {section.dayNumber !== null && (
        <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
          <Text className="text-white text-xs font-bold">{section.dayNumber}</Text>
        </View>
      )}
      <View className="flex-1">
        <Text className="text-sm font-bold text-foreground">{section.title}</Text>
        {section.dayNumber !== null && (
          <Text className="text-xs text-muted-foreground">Day {section.dayNumber}</Text>
        )}
      </View>
      <View className="flex-row items-center gap-x-2">
        {section.dayNumber !== null && onGenerateDayPlan && (
          <TouchableOpacity
            onPress={() => onGenerateDayPlan(section.dayNumber!)}
            activeOpacity={0.75}
            className="bg-primary-light border border-primary/30 rounded-xl px-3 py-1.5"
          >
            <Text className="text-xs font-semibold text-primary">AI Plan</Text>
          </TouchableOpacity>
        )}
        {section.dateKey !== 'unscheduled' && onAddToDay && (
          <TouchableOpacity
            onPress={() => onAddToDay(section.dateKey)}
            activeOpacity={0.75}
            className="bg-muted border border-border rounded-xl px-3 py-1.5"
          >
            <Text className="text-xs font-semibold text-foreground">+ Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Day Plan Modal (Itinerary) ───────────────────────────────────────────────

function ItineraryDayPlanModal({
  visible,
  dayNumber,
  activities,
  isLoading,
  error,
  addedNames,
  isAddingAll,
  onClose,
  onAddActivity,
  onAddAll,
}: {
  visible: boolean;
  dayNumber: number;
  activities: DayPlanActivity[];
  isLoading: boolean;
  error: string | null;
  addedNames: Set<string>;
  isAddingAll: boolean;
  onClose: () => void;
  onAddActivity: (activity: DayPlanActivity) => Promise<void>;
  onAddAll: () => Promise<void>;
}) {
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
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-10 pb-4 border-b border-border">
          <Text className="text-base font-bold text-foreground">Day {dayNumber} Plan</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text className="text-sm font-medium text-muted-foreground">Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View className="items-center pt-16">
              <ActivityIndicator size="large" color="#006a66" />
              <Text className="mt-3 text-sm text-muted-foreground">
                Generating AI plan for Day {dayNumber}…
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
              <Text className="text-sm text-muted-foreground text-center">
                No activities generated.
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
                        isAdded ? 'bg-muted' : 'bg-primary'
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
          <View className="px-5 pb-6 pt-2 border-t border-border">
            <TouchableOpacity
              onPress={onAddAll}
              disabled={isAddingAll || activities.every((a) => addedNames.has(a.name))}
              activeOpacity={0.85}
              className={`rounded-2xl py-3 items-center ${
                isAddingAll || activities.every((a) => addedNames.has(a.name))
                  ? 'bg-muted'
                  : 'bg-primary'
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
      </View>
    </Modal>
  );
}

// ─── Destination Row ──────────────────────────────────────────────────────────

interface DestinationRowProps {
  item: Destination;
  onNotesChange: (id: string, notes: string) => void;
  onDateChange: (id: string, date: Date) => void;
  onRemove: (id: string) => void;
  showDragHandle?: boolean;
  isDragging?: boolean;
}

function DestinationRow({
  item,
  onNotesChange,
  onDateChange,
  onRemove,
  showDragHandle = false,
  isDragging = false,
}: DestinationRowProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(item.notes ?? '');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const photoUrl = item.photoReference ? getPhotoUrl(item.photoReference, 160) : null;

  const handleNotesBlur = useCallback(() => {
    setEditingNotes(false);
    if (notesValue !== (item.notes ?? '')) {
      onNotesChange(item.id, notesValue);
    }
  }, [notesValue, item.notes, item.id, onNotesChange]);

  const handleDateConfirm = useCallback(
    (date: Date) => {
      onDateChange(item.id, date);
      setDatePickerOpen(false);
    },
    [item.id, onDateChange],
  );

  const dateLabel = item.date?.seconds
    ? new Date(item.date.seconds * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : 'No date';

  const currentDate = item.date?.seconds ? new Date(item.date.seconds * 1000) : new Date();

  return (
    <View
      className={`mx-4 mb-3 bg-surface border rounded-2xl overflow-hidden ${
        isDragging ? 'border-primary shadow-lg' : 'border-border'
      }`}
      style={isDragging ? { elevation: 8 } : undefined}
    >
      {/* Main row */}
      <View className="flex-row items-center">
        {/* Thumbnail */}
        <View className="w-16 h-16 bg-muted shrink-0">
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-2xl">📍</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View className="flex-1 px-3 py-2">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
            {item.address}
          </Text>
          {/* Date chip */}
          <TouchableOpacity
            onPress={() => setDatePickerOpen(true)}
            activeOpacity={0.7}
            className="mt-1.5 self-start bg-muted rounded-full px-2 py-0.5"
          >
            <Text className="text-xs text-muted-foreground">📅 {dateLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View className="flex-row items-center pr-2">
          {showDragHandle ? (
            <View className="px-2 py-3">
              <Text className="text-lg text-muted-foreground">≡</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => onRemove(item.id)}
              activeOpacity={0.7}
              className="px-2 py-3"
            >
              <Text className="text-xl text-muted-foreground">×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notes row */}
      <View className="border-t border-border px-3 py-2">
        {editingNotes ? (
          <TextInput
            value={notesValue}
            onChangeText={setNotesValue}
            onBlur={handleNotesBlur}
            autoFocus
            multiline
            placeholder="Add a note..."
            placeholderTextColor="#9CA3AF"
            className="text-xs text-foreground leading-4"
            style={{ minHeight: 36, maxHeight: 80 }}
          />
        ) : (
          <TouchableOpacity onPress={() => setEditingNotes(true)} activeOpacity={0.7}>
            <Text
              className={`text-xs leading-4 ${
                notesValue ? 'text-foreground' : 'text-muted-foreground'
              }`}
              numberOfLines={2}
            >
              {notesValue || 'Tap to add a note...'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date picker */}
      <DatePickerModal
        visible={datePickerOpen}
        value={currentDate}
        title="Set Day"
        onConfirm={handleDateConfirm}
        onClose={() => setDatePickerOpen(false)}
      />
    </View>
  );
}

// ─── Draggable Reorder List ───────────────────────────────────────────────────

const HEADER_ROW_H = 44;
const DEST_ROW_H = 76; // thumbnail(56) + vertical padding — no notes row in reorder mode

type FlatRow =
  | { kind: 'header'; dateKey: string; label: string; dayNumber: number | null }
  | { kind: 'dest'; destination: Destination; originalDateKey: string };

function buildFlatRows(sections: ItinerarySection[]): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const section of sections) {
    rows.push({
      kind: 'header',
      dateKey: section.dateKey,
      label: section.title,
      dayNumber: section.dayNumber,
    });
    for (const dest of section.data) {
      rows.push({ kind: 'dest', destination: dest, originalDateKey: section.dateKey });
    }
  }
  return rows;
}

function computeTops(rows: FlatRow[]): number[] {
  const tops: number[] = [];
  let y = 0;
  for (const row of rows) {
    tops.push(y);
    y += row.kind === 'header' ? HEADER_ROW_H : DEST_ROW_H;
  }
  return tops;
}

function totalRowsHeight(rows: FlatRow[]): number {
  return rows.reduce((sum, r) => sum + (r.kind === 'header' ? HEADER_ROW_H : DEST_ROW_H), 0);
}

// Nearest dest-row slot to fingerCenterY — headers are invisible to the sort logic.
function nearestDestSlotAt(tops: number[], rows: FlatRow[], fingerCenterY: number): number {
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].kind !== 'dest') continue;
    const dist = Math.abs(fingerCenterY - (tops[i] + DEST_ROW_H / 2));
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// ─── ReorderableRow — simplified display row; PanResponder lives only on the handle ──

interface ReorderableRowProps {
  destination: Destination;
  isActive: boolean;
  onHandleStart: (pageY: number) => void;
  onHandleMove: (pageY: number) => void;
  onHandleEnd: () => void;
}

function ReorderableRow({
  destination,
  isActive,
  onHandleStart,
  onHandleMove,
  onHandleEnd,
}: ReorderableRowProps) {
  // Keep callbacks in a ref so the PanResponder (created once) always calls latest version.
  const cbRef = useRef({ onHandleStart, onHandleMove, onHandleEnd });
  cbRef.current = { onHandleStart, onHandleMove, onHandleEnd };

  const handlePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // Never yield the gesture to the ScrollView once we have it.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => cbRef.current.onHandleStart(e.nativeEvent.pageY),
      onPanResponderMove: (e) => cbRef.current.onHandleMove(e.nativeEvent.pageY),
      onPanResponderRelease: () => cbRef.current.onHandleEnd(),
      onPanResponderTerminate: () => cbRef.current.onHandleEnd(),
    }),
  ).current;

  const photoUrl = destination.photoReference ? getPhotoUrl(destination.photoReference, 80) : null;

  return (
    <View
      className="flex-row items-center bg-surface border rounded-2xl overflow-hidden mx-4"
      style={
        isActive
          ? {
              borderColor: '#006a66',
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 8,
            }
          : undefined
      }
    >
      {/* Thumbnail */}
      <View className="w-14 bg-muted shrink-0" style={{ height: DEST_ROW_H }}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text style={{ fontSize: 22 }}>📍</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1 px-3">
        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
          {destination.name}
        </Text>
        <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
          {destination.address}
        </Text>
      </View>

      {/* Drag handle — the ONLY area with a PanResponder */}
      <View
        {...handlePan.panHandlers}
        style={{ width: 52, height: DEST_ROW_H, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 20, color: '#9CA3AF', lineHeight: 24 }}>{'☰'}</Text>
      </View>
    </View>
  );
}

// ─── DraggableReorderList ─────────────────────────────────────────────────────

interface DraggableReorderListProps {
  sections: ItinerarySection[];
  onDone: (updates: Array<{ id: string; order: number; dateKey: string }>) => void;
  onCancel: () => void;
  tripStartDate?: Timestamp;
}

function DraggableReorderList({ sections, onDone, onCancel }: DraggableReorderListProps) {
  const initialRows = buildFlatRows(sections);
  const rowsRef = useRef<FlatRow[]>(initialRows);
  const topsRef = useRef<number[]>(computeTops(initialRows));
  const [rows, setRows] = useState<FlatRow[]>(initialRows);

  // All mutable drag state lives in a single ref — zero stale-closure risk.
  const drag = useRef<{
    id: string;
    flatIdx: number;
    initialItemTop: number;
    startPageY: number;
    item: Destination;
  } | null>(null);

  const [activeDraggingId, setActiveDraggingId] = useState<string | null>(null);
  const floatY = useRef(new Animated.Value(0)).current;

  // Stable callbacks — read all mutable state via refs, never capture stale values.
  const onHandleStart = useCallback(
    (destId: string, pageY: number) => {
      const flatIdx = rowsRef.current.findIndex(
        (r) => r.kind === 'dest' && r.destination.id === destId,
      );
      if (flatIdx === -1) return;
      const row = rowsRef.current[flatIdx];
      if (row.kind !== 'dest') return;
      drag.current = {
        id: destId,
        flatIdx,
        initialItemTop: topsRef.current[flatIdx],
        startPageY: pageY,
        item: row.destination,
      };
      floatY.setValue(topsRef.current[flatIdx]);
      setActiveDraggingId(destId);
    },
    [floatY],
  );

  const onHandleMove = useCallback(
    (pageY: number) => {
      const d = drag.current;
      if (!d) return;
      const total = totalRowsHeight(rowsRef.current);
      const rawTop = d.initialItemTop + (pageY - d.startPageY);
      const clampedTop = Math.max(0, Math.min(total - DEST_ROW_H, rawTop));
      floatY.setValue(clampedTop);

      const targetIdx = nearestDestSlotAt(
        topsRef.current,
        rowsRef.current,
        clampedTop + DEST_ROW_H / 2,
      );
      if (targetIdx !== -1 && targetIdx !== d.flatIdx) {
        const next = [...rowsRef.current];
        const [moved] = next.splice(d.flatIdx, 1);
        next.splice(targetIdx, 0, moved);
        rowsRef.current = next;
        topsRef.current = computeTops(next);
        drag.current = { ...d, flatIdx: targetIdx };
        setRows(next);
      }
    },
    [floatY],
  );

  const onHandleEnd = useCallback(() => {
    drag.current = null;
    setActiveDraggingId(null);
  }, []);

  const handleDone = useCallback(() => {
    const updates: Array<{ id: string; order: number; dateKey: string }> = [];
    let currentDateKey = 'unscheduled';
    const dayCounters: Record<string, number> = {};
    for (const row of rowsRef.current) {
      if (row.kind === 'header') {
        currentDateKey = row.dateKey;
      } else {
        const order = dayCounters[currentDateKey] ?? 0;
        dayCounters[currentDateKey] = order + 1;
        updates.push({ id: row.destination.id, order, dateKey: currentDateKey });
      }
    }
    onDone(updates);
  }, [onDone]);

  const totalH = totalRowsHeight(rows);

  return (
    <View className="flex-1">
      {/* Action bar */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-border bg-background">
        <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
          <Text className="text-sm font-medium text-muted-foreground">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-sm font-semibold text-foreground">Drag ☰ to Reorder</Text>
        <TouchableOpacity onPress={handleDone} activeOpacity={0.7}>
          <Text className="text-sm font-bold text-foreground">Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={activeDraggingId === null}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Fixed-height absolute layout; no panHandlers here — they live on each handle */}
        <View style={{ height: totalH }}>
          {rows.map((row, index) => {
            const top = topsRef.current[index];

            if (row.kind === 'header') {
              return (
                <View
                  key={`h-${row.dateKey}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top,
                    height: HEADER_ROW_H,
                  }}
                  className="flex-row items-center px-5 bg-muted border-b border-border"
                >
                  {row.dayNumber !== null && (
                    <View className="w-6 h-6 rounded-full bg-primary items-center justify-center mr-2">
                      <Text className="text-white text-xs font-bold">{row.dayNumber}</Text>
                    </View>
                  )}
                  <Text className="text-xs font-bold text-foreground flex-1" numberOfLines={1}>
                    {row.label}
                  </Text>
                </View>
              );
            }

            const isActive = row.destination.id === activeDraggingId;
            return (
              <View
                key={row.destination.id}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top,
                  height: DEST_ROW_H,
                  opacity: isActive ? 0 : 1,
                }}
              >
                <ReorderableRow
                  destination={row.destination}
                  isActive={false}
                  onHandleStart={(pageY) => onHandleStart(row.destination.id, pageY)}
                  onHandleMove={onHandleMove}
                  onHandleEnd={onHandleEnd}
                />
              </View>
            );
          })}

          {/* Floating item — follows the finger via Animated.Value */}
          {activeDraggingId !== null && drag.current && (
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: DEST_ROW_H,
                transform: [{ translateY: floatY }],
                zIndex: 20,
              }}
            >
              <ReorderableRow
                destination={drag.current.item}
                isActive
                onHandleStart={() => {}}
                onHandleMove={() => {}}
                onHandleEnd={() => {}}
              />
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ItineraryScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const trip = useTripStore((s) => s.trips.find((t) => t.id === tripId)) as Trip | undefined;
  const { destinations, addDestination, updateDestination, reorderDestinations, removeDestination } =
    useDestinations(tripId);

  const optimizeHook = useAIOptimize();
  const dayPlanHook = useAIDayPlan();
  const [dayPlanModalVisible, setDayPlanModalVisible] = useState(false);
  const [dayPlanDayNumber, setDayPlanDayNumber] = useState(1);
  const [addedActivityNames, setAddedActivityNames] = useState<Set<string>>(new Set());
  const [isAddingAll, setIsAddingAll] = useState(false);

  const [selectedDayKey, setSelectedDayKey] = useState<string>('all');
  const [reorderMode, setReorderMode] = useState(false);

  const sections = groupIntoSections(destinations, trip?.startDate);

  // Generate one tab per actual trip day using the same local-midnight normalisation
  // that computeDayNumber uses, so dateKeys are guaranteed to match section dateKeys.
  const tripDayTabs = useMemo(() => {
    if (!trip?.startDate?.seconds || !trip?.endDate?.seconds) return [];
    const startMidnight = new Date(
      new Date(trip.startDate.seconds * 1000).toDateString(),
    ).getTime();
    const endMidnight = new Date(
      new Date(trip.endDate.seconds * 1000).toDateString(),
    ).getTime();
    const days = Math.round((endMidnight - startMidnight) / 86400000) + 1;
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(startMidnight + i * 86400000);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { key: dateKey, label: `Day ${i + 1}` };
    });
  }, [trip]);

  const dayTabs = useMemo(
    () => [{ key: 'all', label: 'All' }, ...tripDayTabs],
    [tripDayTabs],
  );

  // A selected day tab stays valid even when it currently has no destinations.
  const validSelectedKey = useMemo(
    () =>
      selectedDayKey === 'all' || tripDayTabs.some((t) => t.key === selectedDayKey)
        ? selectedDayKey
        : 'all',
    [selectedDayKey, tripDayTabs],
  );

  const displayedSections = useMemo(
    () =>
      validSelectedKey === 'all'
        ? sections
        : sections.filter((s) => s.dateKey === validSelectedKey),
    [sections, validSelectedKey],
  );

  const handleNotesChange = useCallback(
    (destId: string, notes: string) => {
      updateDestination(destId, { notes });
    },
    [updateDestination],
  );

  const handleDateChange = useCallback(
    (destId: string, date: Date) => {
      updateDestination(destId, { date: Timestamp.fromDate(date) });
    },
    [updateDestination],
  );

  const handleRemove = useCallback(
    (destId: string) => {
      removeDestination(destId);
    },
    [removeDestination],
  );

  const handleReorderDone = useCallback(
    async (updates: Array<{ id: string; order: number; dateKey: string }>) => {
      setReorderMode(false);
      // Build full Destination updates — order always, date only when day changed
      await Promise.all(
        updates.map(({ id, order, dateKey }) => {
          const dest = destinations.find((d) => d.id === id);
          if (!dest) return Promise.resolve();
          const originalDateKey = toDateKey(dest.date);
          if (dateKey !== 'unscheduled' && dateKey !== originalDateKey) {
            // Parse YYYY-MM-DD and create a midnight Timestamp for that day
            const [y, m, d] = dateKey.split('-').map(Number);
            const newDate = Timestamp.fromDate(new Date(y, m - 1, d));
            return updateDestination(id, { order, date: newDate });
          }
          return updateDestination(id, { order });
        }),
      );
    },
    [destinations, updateDestination],
  );

  const handleOptimizeTrip = useCallback(async () => {
    if (destinations.length === 0) {
      Alert.alert('Nothing to optimize', 'Add destinations to your itinerary first.');
      return;
    }

    // Build itineraryByDay for the AI
    const itineraryByDay: Record<string, { name: string }[]> = {};
    destinations.forEach((d) => {
      const key = d.date?.seconds
        ? `Day ${Math.round((d.date.seconds - (trip?.startDate?.seconds ?? 0)) / 86400) + 1}`
        : 'Unscheduled';
      if (!itineraryByDay[key]) itineraryByDay[key] = [];
      itineraryByDay[key].push({ name: d.name });
    });

    const result = await optimizeHook.fetchOptimized({ itineraryByDay });
    if (!result) {
      Alert.alert('Optimization failed', optimizeHook.error ?? 'Please try again.');
      return;
    }

    // Apply optimized order — match place names back to destination IDs
    const orderedIds: string[] = result.days.flatMap((day) =>
      day.places
        .map((p) => destinations.find((d) => d.name === p.name)?.id)
        .filter((id): id is string => !!id),
    );

    // Assign new order indices
    const updates = orderedIds.map((id, idx) => ({ id, order: idx }));
    await Promise.all(updates.map(({ id, order }) => updateDestination(id, { order })));

    Alert.alert('Trip Optimized', 'Your itinerary has been reordered for the best route.');
  }, [destinations, trip, optimizeHook, updateDestination]);

  const handleOpenDayPlan = useCallback(
    (dayNumber: number) => {
      setDayPlanDayNumber(dayNumber);
      setDayPlanModalVisible(true);
      setAddedActivityNames(new Set());
      dayPlanHook.reset();
      const tripDates = trip?.startDate?.seconds
        ? `${new Date(trip.startDate.seconds * 1000).toLocaleDateString()} – ${new Date((trip.endDate?.seconds ?? trip.startDate.seconds) * 1000).toLocaleDateString()}`
        : '';
      const existingPlan = destinations.map((d) => d.name);
      const tripDestination = trip?.title ?? destinations[0]?.name ?? 'the destination';

      // Collect names of places already on the selected day
      const existingPlacesOnDay = destinations
        .filter((d) => {
          if (!d.date?.seconds || !trip?.startDate?.seconds) return false;
          const dayIdx = Math.round((d.date.seconds - trip.startDate.seconds) / 86400);
          return dayIdx === dayNumber - 1;
        })
        .map((d) => d.name);

      dayPlanHook.fetchDayPlan({
        destination: tripDestination,
        tripDates,
        dayNumber,
        preferences: [],
        existingPlan,
        existingPlacesOnDay,
      });
    },
    [trip, destinations, dayPlanHook],
  );

  const handleAddDayPlanActivity = useCallback(
    async (activity: DayPlanActivity) => {
      const dateTimestamp = trip?.startDate?.seconds
        ? new Timestamp(trip.startDate.seconds + (dayPlanDayNumber - 1) * 86400, 0)
        : Timestamp.now();
      const tripDestination = trip?.title ?? destinations[0]?.name ?? '';
      const { photoRef } = await searchPlacePhoto(`${activity.name} ${tripDestination}`);
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
    [trip, dayPlanDayNumber, addDestination, destinations],
  );

  const handleAddAllDayPlanActivities = useCallback(async () => {
    const activities = dayPlanHook.dayPlan?.activities ?? [];
    const pending = activities.filter((a) => !addedActivityNames.has(a.name));
    if (pending.length === 0) return;
    setIsAddingAll(true);
    try {
      const dateTimestamp = trip?.startDate?.seconds
        ? new Timestamp(trip.startDate.seconds + (dayPlanDayNumber - 1) * 86400, 0)
        : Timestamp.now();
      const tripDestination = trip?.title ?? destinations[0]?.name ?? '';
      const photoResults = await Promise.allSettled(
        pending.map((a) => searchPlacePhoto(`${a.name} ${tripDestination}`)),
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
  }, [dayPlanHook.dayPlan?.activities, addedActivityNames, trip, dayPlanDayNumber, addDestination, destinations]);

  const renderSectionItem = useCallback(
    ({ item }: { item: Destination }) => (
      <DestinationRow
        item={item}
        onNotesChange={handleNotesChange}
        onDateChange={handleDateChange}
        onRemove={handleRemove}
      />
    ),
    [handleNotesChange, handleDateChange, handleRemove],
  );

  const handleAddToDay = useCallback(
    (targetDate: string) => {
      navigation.navigate('DestinationSearch', { tripId, targetDate });
    },
    [navigation, tripId],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<Destination, ItinerarySection> }) => (
      <SectionHeader
        section={section as ItinerarySection}
        onGenerateDayPlan={handleOpenDayPlan}
        onAddToDay={handleAddToDay}
      />
    ),
    [handleOpenDayPlan, handleAddToDay],
  );

  if (reorderMode) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-2 pb-3 border-b border-border">
          <TouchableOpacity onPress={() => setReorderMode(false)} activeOpacity={0.7}>
            <Text className="text-sm font-medium text-muted-foreground">← Back</Text>
          </TouchableOpacity>
        </View>

        <DraggableReorderList
          sections={sections}
          onDone={handleReorderDone}
          onCancel={() => setReorderMode(false)}
          tripStartDate={trip?.startDate}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text className="text-base font-bold text-foreground">←</Text>
        </TouchableOpacity>

        <View className="flex-1 mx-4">
          <Text className="text-base font-bold text-foreground text-center" numberOfLines={1}>
            {trip?.title ?? 'Itinerary'}
          </Text>
          <Text className="text-xs text-muted-foreground text-center">
            {destinations.length} {destinations.length === 1 ? 'destination' : 'destinations'}
          </Text>
        </View>

        {/* spacer keeps title centred */}
        <View style={{ width: 28 }} />
      </View>

      {/* Day selector pills */}
      {sections.length > 0 && (
        <View className="border-b border-border">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
          >
            {dayTabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setSelectedDayKey(tab.key)}
                activeOpacity={0.75}
                style={{ marginRight: 8 }}
                className={`px-4 py-1.5 rounded-xl border ${
                  validSelectedKey === tab.key
                    ? 'bg-primary border-primary'
                    : 'bg-surface border-border'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    validSelectedKey === tab.key ? 'text-white' : 'text-foreground'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {destinations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 pt-20">
          <Text className="text-3xl mb-3">📍</Text>
          <Text className="text-base font-semibold text-foreground mb-1">No destinations yet</Text>
          <Text className="text-sm text-muted-foreground text-center leading-5">
            Add destinations from the trip detail screen, then come back to organise your itinerary.
          </Text>
        </View>
      ) : displayedSections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-3xl mb-3">📅</Text>
          <Text className="text-sm font-semibold text-foreground mb-2">Nothing here yet</Text>
          <Text className="text-xs text-muted-foreground text-center leading-5 mb-5">
            No destinations scheduled for this day.
          </Text>
          {validSelectedKey !== 'all' && (
            <TouchableOpacity
              onPress={() => handleAddToDay(validSelectedKey)}
              activeOpacity={0.75}
              className="bg-primary rounded-2xl px-6 py-3"
            >
              <Text className="text-sm font-semibold text-white">+ Add Place</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View className="flex-1">
          <SectionList
            sections={displayedSections}
            keyExtractor={(item) => item.id}
            renderItem={renderSectionItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
            stickySectionHeadersEnabled
            showsVerticalScrollIndicator={false}
          />

          {/* FABs */}
          <View
            className="absolute bottom-6 right-5"
            style={{ pointerEvents: 'box-none' }}
          >
            {/* Optimize Trip FAB */}
            <TouchableOpacity
              onPress={handleOptimizeTrip}
              activeOpacity={0.85}
              disabled={optimizeHook.isLoading}
              className="bg-primary rounded-full px-5 py-3 flex-row items-center mb-2"
              style={{ elevation: 4 }}
            >
              {optimizeHook.isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white text-xs font-semibold">✦  Optimize</Text>
              )}
            </TouchableOpacity>

            {/* Reorder FAB */}
            <TouchableOpacity
              onPress={() => setReorderMode(true)}
              activeOpacity={0.85}
              className="bg-secondary rounded-full px-5 py-3 flex-row items-center"
              style={{ elevation: 4 }}
            >
              <Text className="text-white text-xs font-semibold">⇅  Reorder</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* AI Day Plan Modal */}
      <ItineraryDayPlanModal
        visible={dayPlanModalVisible}
        dayNumber={dayPlanDayNumber}
        activities={dayPlanHook.dayPlan?.activities ?? []}
        isLoading={dayPlanHook.isLoading}
        error={dayPlanHook.error}
        addedNames={addedActivityNames}
        isAddingAll={isAddingAll}
        onClose={() => {
          setDayPlanModalVisible(false);
          setAddedActivityNames(new Set());
          dayPlanHook.reset();
        }}
        onAddActivity={handleAddDayPlanActivity}
        onAddAll={handleAddAllDayPlanActivities}
      />
    </SafeAreaView>
  );
}
