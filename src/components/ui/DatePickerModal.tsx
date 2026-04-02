import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  minimumDate?: Date;
  title?: string;
  onConfirm: (date: Date) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(a: Date, b: Date) {
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return aDay < bDay;
}

export function DatePickerModal({
  visible,
  value,
  minimumDate,
  title = 'Select Date',
  onConfirm,
  onClose,
}: DatePickerModalProps) {
  const [displayMonth, setDisplayMonth] = useState(value.getMonth());
  const [displayYear, setDisplayYear] = useState(value.getFullYear());
  const [selected, setSelected] = useState<Date>(value);

  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(displayYear, displayMonth, 1).getDay();

  // Build calendar grid cells (null = empty padding cell)
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const goToPrevMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear((y) => y - 1);
    } else {
      setDisplayMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear((y) => y + 1);
    } else {
      setDisplayMonth((m) => m + 1);
    }
  };

  const handleDayPress = (day: number) => {
    const date = new Date(displayYear, displayMonth, day);
    if (minimumDate && isBeforeDay(date, minimumDate)) return;
    setSelected(date);
  };

  const handleConfirm = () => {
    onConfirm(selected);
    onClose();
  };

  const isPrevDisabled = () => {
    if (!minimumDate) return false;
    const prevMonth = displayMonth === 0 ? 11 : displayMonth - 1;
    const prevYear = displayMonth === 0 ? displayYear - 1 : displayYear;
    const lastDayOfPrev = new Date(prevYear, prevMonth + 1, 0);
    return isBeforeDay(lastDayOfPrev, minimumDate);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center px-5">
        <View className="bg-background w-full rounded-3xl overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-border">
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text className="text-sm font-medium text-muted-foreground">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-sm font-bold text-foreground">{title}</Text>
            <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7}>
              <Text className="text-sm font-bold text-foreground">Done</Text>
            </TouchableOpacity>
          </View>

          <View className="px-4 pt-4 pb-5">
            {/* Month/Year navigation */}
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                onPress={goToPrevMonth}
                disabled={isPrevDisabled()}
                activeOpacity={0.7}
                className="w-9 h-9 rounded-full bg-muted items-center justify-center"
                style={{ opacity: isPrevDisabled() ? 0.3 : 1 }}
              >
                <Text className="text-foreground font-bold text-base">‹</Text>
              </TouchableOpacity>

              <Text className="text-base font-bold text-foreground">
                {MONTH_NAMES[displayMonth]} {displayYear}
              </Text>

              <TouchableOpacity
                onPress={goToNextMonth}
                activeOpacity={0.7}
                className="w-9 h-9 rounded-full bg-muted items-center justify-center"
              >
                <Text className="text-foreground font-bold text-base">›</Text>
              </TouchableOpacity>
            </View>

            {/* Day-of-week labels */}
            <View className="flex-row mb-1">
              {DAY_LABELS.map((d) => (
                <View key={d} className="flex-1 items-center py-1">
                  <Text className="text-xs font-semibold text-muted-foreground">{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            {rows.map((row, ri) => (
              <View key={ri} className="flex-row">
                {row.map((day, ci) => {
                  if (day === null) {
                    return <View key={`e-${ci}`} className="flex-1 h-10" />;
                  }

                  const cellDate = new Date(displayYear, displayMonth, day);
                  const isSelected = isSameDay(cellDate, selected);
                  const isDisabled = minimumDate ? isBeforeDay(cellDate, minimumDate) : false;
                  const isToday = isSameDay(cellDate, new Date());

                  return (
                    <TouchableOpacity
                      key={day}
                      className={`flex-1 h-10 items-center justify-center rounded-full mx-0.5 my-0.5 ${
                        isSelected ? 'bg-foreground' : isToday ? 'bg-muted' : ''
                      }`}
                      onPress={() => !isDisabled && handleDayPress(day)}
                      activeOpacity={0.7}
                      disabled={isDisabled}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          isSelected
                            ? 'text-white font-bold'
                            : isDisabled
                              ? 'text-muted-foreground/40'
                              : isToday
                                ? 'text-foreground font-semibold'
                                : 'text-foreground'
                        }`}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Selected date display */}
            <View className="mt-4 pt-3 border-t border-border items-center">
              <Text className="text-xs text-muted-foreground">
                Selected:{' '}
                <Text className="font-semibold text-foreground">
                  {selected.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
