module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@app-types/(.*)$': '<rootDir>/src/types/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Allow transformation of Expo/React Native ESM packages
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|zustand)',
  ],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/tests/**/*.test.[jt]s?(x)',
  ],
  // Silence React Native / NativeWind initialisation noise during tests
  silent: false,
};
