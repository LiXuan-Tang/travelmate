import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  className,
  ...props
}: InputProps) {
  return (
    <View className="w-full">
      {label && (
        <Text className="text-sm font-medium text-foreground mb-1.5">{label}</Text>
      )}
      <View
        className={`flex-row items-center bg-muted border ${
          error ? 'border-destructive' : 'border-border'
        } rounded-xl px-4 ${className ?? ''}`}
      >
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        <TextInput
          className="flex-1 text-base text-foreground py-3"
          placeholderTextColor="#A1A1AA"
          {...props}
        />
        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>
      {error && <Text className="text-xs text-destructive mt-1">{error}</Text>}
    </View>
  );
}
