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

// ─── Markdown helpers ─────────────────────────────────────────────────────────

/**
 * Splits a line into alternating plain strings and bold/italic <Text> spans.
 * Children inherit color from their parent <Text>.
 */
function renderInline(text: string): React.ReactNode[] {
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(
        <Text key={key++} style={{ fontWeight: '700' }}>
          {match[1]}
        </Text>,
      );
    } else {
      nodes.push(
        <Text key={key++} style={{ fontStyle: 'italic' }}>
          {match[2]}
        </Text>,
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length > 0 ? nodes : [text];
}

/** Renders assistant markdown text as structured blocks. */
function MarkdownBody({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let consecutiveEmpty = 0;

  lines.forEach((raw, i) => {
    const line = raw.trim();

    if (line === '') {
      consecutiveEmpty++;
      // One blank line between blocks — add a small gap (skip duplicates)
      if (consecutiveEmpty === 1 && elements.length > 0) {
        elements.push(<View key={`gap-${i}`} style={{ height: 6 }} />);
      }
      return;
    }
    consecutiveEmpty = 0;

    // Heading: # / ## / ###
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      elements.push(
        <Text
          key={i}
          className="text-foreground"
          style={{
            fontSize: level === 1 ? 15 : 14,
            fontWeight: '700',
            marginBottom: 2,
            marginTop: elements.length > 0 ? 4 : 0,
          }}
        >
          {renderInline(headingMatch[2])}
        </Text>,
      );
      return;
    }

    // Bullet: - item / * item / • item
    const bulletMatch = line.match(/^[-*•]\s+(.+)/);
    if (bulletMatch) {
      elements.push(
        <View key={i} style={{ flexDirection: 'row', marginBottom: 2 }}>
          <Text className="text-foreground" style={{ fontSize: 14, lineHeight: 20, marginRight: 6 }}>
            {'•'}
          </Text>
          <Text className="text-foreground" style={{ fontSize: 14, lineHeight: 20, flex: 1 }}>
            {renderInline(bulletMatch[1])}
          </Text>
        </View>,
      );
      return;
    }

    // Numbered list: 1. item
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      elements.push(
        <View key={i} style={{ flexDirection: 'row', marginBottom: 2 }}>
          <Text className="text-foreground" style={{ fontSize: 14, lineHeight: 20, marginRight: 6 }}>
            {numberedMatch[1]}.
          </Text>
          <Text className="text-foreground" style={{ fontSize: 14, lineHeight: 20, flex: 1 }}>
            {renderInline(numberedMatch[2])}
          </Text>
        </View>,
      );
      return;
    }

    // Plain paragraph line
    elements.push(
      <Text key={i} className="text-foreground" style={{ fontSize: 14, lineHeight: 20 }}>
        {renderInline(line)}
      </Text>,
    );
  });

  return <View>{elements}</View>;
}

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
        {isUser ? (
          <Text className="text-sm leading-5 text-white">{message.text}</Text>
        ) : (
          <MarkdownBody text={message.text} />
        )}
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
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' }}
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

  const { messages, isLoading, sendMessage } = useAIChat(tripId, {
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
        behavior="padding"
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

        {/* Chips + input bar grouped so chips always sit flush above the bar */}
        <View>
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
                <ActivityIndicator size="small" color="#006a66" />
              ) : (
                <Text className="text-white font-bold" style={{ fontSize: 16 }}>
                  ↑
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
