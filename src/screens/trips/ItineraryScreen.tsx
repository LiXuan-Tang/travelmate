import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Image,
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
import { DatePickerModal } from '@components/ui';
import { getPhotoUrl } from '@services/places';

type Props = NativeStackScreenProps<RootStackParamList, 'Itinerary'>;

type ViewMode = 'list' | 'timeline';

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

function SectionHeader({ section }: { section: ItinerarySection }) {
  return (
    <View className="flex-row items-center px-5 py-2 bg-background">
      {section.dayNumber !== null && (
        <View className="w-8 h-8 rounded-full bg-foreground items-center justify-center mr-3">
          <Text className="text-white text-xs font-bold">{section.dayNumber}</Text>
        </View>
      )}
      <View className="flex-1">
        <Text className="text-sm font-bold text-foreground">{section.title}</Text>
        {section.dayNumber !== null && (
          <Text className="text-xs text-muted-foreground">Day {section.dayNumber}</Text>
        )}
      </View>
    </View>
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
        isDragging ? 'border-foreground shadow-lg' : 'border-border'
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
              borderColor: '#0A0A0A',
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
                    <View className="w-6 h-6 rounded-full bg-foreground items-center justify-center mr-2">
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

// ─── Timeline View ────────────────────────────────────────────────────────────

function TimelineView({
  sections,
  onNotesChange,
  onDateChange,
  onRemove,
}: {
  sections: ItinerarySection[];
  onNotesChange: (id: string, notes: string) => void;
  onDateChange: (id: string, date: Date) => void;
  onRemove: (id: string) => void;
}) {
  if (sections.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8 pt-20">
        <Text className="text-3xl mb-3">🗓️</Text>
        <Text className="text-base font-semibold text-foreground mb-1">No itinerary yet</Text>
        <Text className="text-sm text-muted-foreground text-center leading-5">
          Add destinations and assign them to days to build your timeline.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 40, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {sections.map((section, sIdx) => (
        <View key={section.dateKey} className="flex-row">
          {/* Left rail */}
          <View className="items-center mr-4" style={{ width: 32 }}>
            <View className="w-8 h-8 rounded-full bg-foreground items-center justify-center z-10">
              {section.dayNumber !== null ? (
                <Text className="text-white text-xs font-bold">{section.dayNumber}</Text>
              ) : (
                <Text className="text-white text-xs font-bold">—</Text>
              )}
            </View>
            {sIdx < sections.length - 1 && (
              <View className="flex-1 w-px bg-border mt-1" style={{ minHeight: 24 }} />
            )}
          </View>

          {/* Section content */}
          <View className="flex-1 pb-6">
            <View className="mb-3">
              <Text className="text-sm font-bold text-foreground">{section.title}</Text>
              {section.dayNumber !== null && (
                <Text className="text-xs text-muted-foreground">Day {section.dayNumber}</Text>
              )}
            </View>

            {section.data.map((dest, dIdx) => (
              <View key={dest.id} className="flex-row mb-3">
                {/* Timeline connector dot */}
                <View className="items-center mr-3" style={{ width: 16 }}>
                  <View className="w-2.5 h-2.5 rounded-full bg-border mt-2.5" />
                  {dIdx < section.data.length - 1 && (
                    <View className="flex-1 w-px bg-border mt-1" />
                  )}
                </View>

                {/* Destination card */}
                <View className="flex-1">
                  <DestinationRow
                    item={dest}
                    onNotesChange={onNotesChange}
                    onDateChange={onDateChange}
                    onRemove={onRemove}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ItineraryScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const trip = useTripStore((s) => s.trips.find((t) => t.id === tripId)) as Trip | undefined;
  const { destinations, updateDestination, reorderDestinations, removeDestination } =
    useDestinations(tripId);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [reorderMode, setReorderMode] = useState(false);

  const sections = groupIntoSections(destinations, trip?.startDate);

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

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<Destination, ItinerarySection> }) => (
      <SectionHeader section={section as ItinerarySection} />
    ),
    [],
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

        {/* View toggle */}
        <View className="flex-row bg-muted rounded-xl overflow-hidden">
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            activeOpacity={0.7}
            className={`px-3 py-1.5 ${viewMode === 'list' ? 'bg-foreground' : ''}`}
          >
            <Text
              className={`text-xs font-semibold ${viewMode === 'list' ? 'text-white' : 'text-muted-foreground'}`}
            >
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('timeline')}
            activeOpacity={0.7}
            className={`px-3 py-1.5 ${viewMode === 'timeline' ? 'bg-foreground' : ''}`}
          >
            <Text
              className={`text-xs font-semibold ${viewMode === 'timeline' ? 'text-white' : 'text-muted-foreground'}`}
            >
              Timeline
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {viewMode === 'timeline' ? (
        <TimelineView
          sections={sections}
          onNotesChange={handleNotesChange}
          onDateChange={handleDateChange}
          onRemove={handleRemove}
        />
      ) : destinations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 pt-20">
          <Text className="text-3xl mb-3">📍</Text>
          <Text className="text-base font-semibold text-foreground mb-1">No destinations yet</Text>
          <Text className="text-sm text-muted-foreground text-center leading-5">
            Add destinations from the trip detail screen, then come back to organise your itinerary.
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderSectionItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
            stickySectionHeadersEnabled
            showsVerticalScrollIndicator={false}
          />

          {/* Reorder FAB */}
          <View
            className="absolute bottom-6 right-5"
            style={{ pointerEvents: 'box-none' }}
          >
            <TouchableOpacity
              onPress={() => setReorderMode(true)}
              activeOpacity={0.85}
              className="bg-foreground rounded-full px-5 py-3 flex-row items-center"
              style={{ elevation: 4 }}
            >
              <Text className="text-white text-xs font-semibold">⇅  Reorder</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
