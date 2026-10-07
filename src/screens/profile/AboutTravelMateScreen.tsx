import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '@app-types/index';
import { COLORS } from '@constants/index';

type IonIconName = React.ComponentProps<typeof Ionicons>['name'];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Nav = NativeStackNavigationProp<RootStackParamList, 'AboutTravelMate'>;

type SectionDef = {
  id: number;
  title: string;
  headerIcon: IonIconName;
  content: React.ReactNode;
};

const cardShadow = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

function AccordionSection({
  title,
  headerIcon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  headerIcon: IonIconName;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const rotate = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotate, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotate]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={cardShadow.card} className="mb-3 overflow-hidden">
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.65}
        className="flex-row items-center px-4 py-3.5"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center mr-3">
          <Ionicons name={headerIcon} size={18} color={COLORS.primary} />
        </View>
        <Text className="flex-1 text-base font-semibold text-foreground pr-2">{title}</Text>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
        </Animated.View>
      </TouchableOpacity>
      {expanded ? <View className="px-4 pb-4 pt-0 border-t border-border">{children}</View> : null}
    </View>
  );
}

export default function AboutTravelMateScreen() {
  const navigation = useNavigation<Nav>();
  const [open, setOpen] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
  });

  const toggle = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sections: SectionDef[] = [
    {
      id: 1,
      title: 'App Introduction',
      headerIcon: 'airplane',
      content: (
        <Text className="text-sm leading-6 text-foreground mt-3">
          TravelMate is a smart travel companion mobile application designed to help travellers plan
          trips more easily and confidently. The app combines itinerary planning, AI destination
          recommendations, and community sharing into one convenient platform.
        </Text>
      ),
    },
    {
      id: 2,
      title: 'Key Features',
      headerIcon: 'map-outline',
      content: (
        <View className="mt-3 gap-2">
          <Bullet text="AI-powered destination recommendation" />
          <Bullet text="Smart itinerary planner" />
          <Bullet text="Community sharing feed" />
          <Bullet text="Personal profile management" />
        </View>
      ),
    },
    {
      id: 3,
      title: 'Our Mission',
      headerIcon: 'compass-outline',
      content: (
        <Text className="text-sm leading-6 text-foreground mt-3">
          TravelMate was developed to solve common travel planning problems faced by travellers such
          as scattered information, decision fatigue, and difficulty managing schedules. The goal is
          to provide a centralized and user-friendly travel assistant.
        </Text>
      ),
    },
    {
      id: 4,
      title: 'App Information',
      headerIcon: 'information-circle-outline',
      content: (
        <View className="mt-3 gap-3">
          <Text className="text-sm text-foreground">Version 1.0</Text>
          <Text className="text-sm text-foreground">Developed by TravelMate Team</Text>
          <Text className="text-sm text-foreground">Android Mobile Platform</Text>
          <Text className="text-sm text-foreground">Year 2026</Text>
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-border bg-background">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 items-center justify-center"
          activeOpacity={0.65}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text className="text-base font-semibold text-foreground">About TravelMate</Text>
        <View className="w-9" />
      </View>

      <ScrollView className="flex-1 px-5 pt-5 pb-8" showsVerticalScrollIndicator={false}>
        <View className="items-center mb-6">
          <View className="w-16 h-16 rounded-3xl bg-primary/15 items-center justify-center mb-3">
            <Ionicons name="earth" size={36} color={COLORS.primary} />
          </View>
          <Text className="text-lg font-bold text-foreground tracking-tight">TravelMate</Text>
          <Text className="text-sm text-muted-foreground mt-1">Your journey, simplified</Text>
        </View>

        {sections.map((section) => (
          <AccordionSection
            key={section.id}
            title={section.title}
            headerIcon={section.headerIcon}
            expanded={!!open[section.id]}
            onToggle={() => toggle(section.id)}
          >
            {section.content}
          </AccordionSection>
        ))}

        <View style={cardShadow.card} className="mt-2 px-5 py-5">
          <Text className="text-center text-sm italic leading-6 text-secondary">
            {`\u201CExplore smarter, travel safer, and share your journey.\u201D`}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View className="flex-row items-start">
      <Text className="text-primary font-bold mr-2 mt-0.5">•</Text>
      <Text className="flex-1 text-sm text-foreground leading-5">{text}</Text>
    </View>
  );
}
