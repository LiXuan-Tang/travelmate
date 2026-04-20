import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, ChatMessage } from '@app-types/index';
import { useAIChat } from '@hooks/useAI';
import { useTripStore } from '@store/tripStore';

type Props = NativeStackScreenProps<RootStackParamList, 'AIChat'>;

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <View
      className={`mb-3 max-w-[85%] ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
    >
      {!isUser && (
        <View className="flex-row items-center mb-1">
          <View className="w-5 h-5 rounded-full bg-primary items-center justify-center mr-1">
            <Text className="text-white" style={{ fontSize: 10 }}>
              AI
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground font-medium">TravelMate AI</Text>
        </View>
      )}

      <View
        className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary rounded-tr-sm'
            : 'bg-surface border border-border rounded-tl-sm'
        }`}
      >
        <Text
          className={`text-sm leading-5 ${isUser ? 'text-white' : 'text-foreground'}`}
        >
          {message.text}
        </Text>
      </View>
    </View>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <View className="self-start mb-3">
      <View className="bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex-row items-center gap-1">
        {[0, 1, 2].map((i) => (
          <View key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground opacity-60" />
        ))}
      </View>
    </View>
  );
}

// ─── Suggestion Chips ─────────────────────────────────────────────────────────

const SUGGESTION_CHIPS = [
  'What should I pack?',
  'Best local food to try?',
  'Hidden gems nearby?',
  'Safety tips for tourists?',
  'Best time to visit popular spots?',
];

interface SuggestionChipsProps {
  onSelect: (text: string) => void;
}

function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
    >
      {SUGGESTION_CHIPS.map((item) => (
        <TouchableOpacity
          key={item}
          onPress={() => onSelect(item)}
          activeOpacity={0.75}
          className="bg-primary-light border border-primary/20 rounded-full px-3 py-1.5 mr-2"
        >
          <Text className="text-xs font-medium text-primary">{item}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AIChatScreen({ route, navigation }: Props) {
  const { tripId, destination, tripDates, preferences } = route.params;

  const { destinations } = useTripStore();
  const existingPlan = destinations.map((d) => d.name);

  const { messages, isLoading, sendMessage } = useAIChat({
    destination,
    tripDates,
    preferences,
    existingPlan,
  });

  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage(text);
  }, [input, isLoading, sendMessage]);

  const handleChipSelect = useCallback(
    (text: string) => {
      if (isLoading) return;
      sendMessage(text);
    },
    [isLoading, sendMessage],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text className="text-base font-bold text-foreground">←</Text>
        </TouchableOpacity>

        <View className="flex-1 mx-4">
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>
            AI Assistant
          </Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {destination} · {tripDates}
          </Text>
        </View>

        {/* Context badge */}
        <View className="bg-primary-light rounded-full px-2.5 py-1">
          <Text className="text-xs font-medium text-primary">Context ON</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages list */}
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-base font-bold text-foreground mb-2 text-center">
              Ask me anything about your trip
            </Text>
            <Text className="text-sm text-muted-foreground text-center leading-5">
              I already know you're travelling to{' '}
              <Text className="font-semibold text-foreground">{destination}</Text> on{' '}
              <Text className="font-semibold text-foreground">{tripDates}</Text>.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatBubble message={item} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={isLoading ? <TypingIndicator /> : null}
          />
        )}

        {/* Suggestion chips (only when no messages yet) */}
        {messages.length === 0 && <SuggestionChips onSelect={handleChipSelect} />}

        {/* Input bar */}
        <View className="flex-row items-end px-4 py-3 border-t border-border bg-surface gap-2">
          <TextInput
            className="flex-1 bg-muted rounded-2xl px-4 py-3 text-sm text-foreground"
            placeholder="Ask about your trip…"
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            style={{ maxHeight: 120 }}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={isLoading || !input.trim()}
            activeOpacity={0.75}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              isLoading || !input.trim() ? 'bg-muted' : 'bg-primary'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text className="text-white font-bold" style={{ fontSize: 16 }}>
                ↑
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
