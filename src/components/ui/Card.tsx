import React from 'react';
import { View, ViewProps, Text } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={`bg-surface rounded-2xl border border-border ${className ?? ''}`}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <View className={`px-5 pt-5 pb-3 ${className ?? ''}`} {...props}>
      {children}
    </View>
  );
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <View className={`px-5 py-4 ${className ?? ''}`} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <View className={`px-5 pb-5 pt-3 ${className ?? ''}`} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={`text-lg font-semibold text-foreground ${className ?? ''}`}>
      {children}
    </Text>
  );
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={`text-sm text-muted-foreground mt-0.5 ${className ?? ''}`}>
      {children}
    </Text>
  );
}
