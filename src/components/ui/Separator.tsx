import React from 'react';
import { View } from 'react-native';

interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ className, orientation = 'horizontal' }: SeparatorProps) {
  return (
    <View
      className={`bg-border ${
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full'
      } ${className ?? ''}`}
    />
  );
}
