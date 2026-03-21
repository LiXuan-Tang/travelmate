import React from 'react';
import { View, Text } from 'react-native';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-primary-light border border-primary/20',
  secondary: 'bg-muted border border-border',
  outline: 'bg-transparent border border-border',
  destructive: 'bg-red-50 border border-red-200',
  success: 'bg-emerald-50 border border-emerald-200',
};

const textVariantClasses: Record<BadgeVariant, string> = {
  default: 'text-primary-dark',
  secondary: 'text-muted-foreground',
  outline: 'text-foreground',
  destructive: 'text-red-600',
  success: 'text-emerald-700',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <View
      className={`self-start flex-row items-center rounded-full px-2.5 py-0.5 ${variantClasses[variant]} ${className ?? ''}`}
    >
      <Text className={`text-xs font-medium ${textVariantClasses[variant]}`}>
        {children}
      </Text>
    </View>
  );
}
