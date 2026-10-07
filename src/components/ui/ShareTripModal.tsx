import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export type ShareOption = 'community' | 'link';

interface Props {
  visible: boolean;
  isLoading: boolean;
  onShare: (caption: string, option: ShareOption) => void;
  onCancel: () => void;
}

export function ShareTripModal({ visible, isLoading, onShare, onCancel }: Props) {
  const [caption, setCaption] = useState('');
  const [option, setOption] = useState<ShareOption>('community');

  const handleShare = () => {
    onShare(caption.trim(), option);
  };

  const handleCancel = () => {
    setCaption('');
    setOption('community');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-surface rounded-3xl w-full overflow-hidden">
          {/* Header */}
          <View className="px-6 pt-6 pb-4 border-b border-border">
            <View className="flex-row items-center gap-x-2 mb-1">
              <Feather name="share-2" size={18} color="#6366f1" />
              <Text className="text-lg font-bold text-foreground">Share This Travel Plan?</Text>
            </View>
            <Text className="text-xs text-muted-foreground">
              Inspire others by sharing your itinerary with the community.
            </Text>
          </View>

          <View className="px-6 pt-5 pb-2">
            {/* Caption input */}
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Caption (optional)
            </Text>
            <TextInput
              className="bg-muted rounded-2xl px-4 py-3 text-sm text-foreground mb-5"
              placeholder="Add a caption…"
              placeholderTextColor="#9CA3AF"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={200}
              style={{ maxHeight: 80 }}
              editable={!isLoading}
            />

            {/* Share options */}
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Share via
            </Text>

            <TouchableOpacity
              onPress={() => setOption('community')}
              activeOpacity={0.75}
              disabled={isLoading}
              className={`flex-row items-center p-4 rounded-2xl border mb-3 ${
                option === 'community'
                  ? 'border-primary bg-primary-light'
                  : 'border-border bg-muted'
              }`}
            >
              <View
                className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                  option === 'community' ? 'bg-primary' : 'bg-border'
                }`}
              >
                <Feather
                  name="globe"
                  size={16}
                  color={option === 'community' ? '#ffffff' : '#9CA3AF'}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`text-sm font-semibold ${
                    option === 'community' ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  Publish to Community
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Share on the public community feed
                </Text>
              </View>
              <View
                className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                  option === 'community' ? 'border-primary' : 'border-border'
                }`}
              >
                {option === 'community' && (
                  <View className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setOption('link')}
              activeOpacity={0.75}
              disabled={isLoading}
              className={`flex-row items-center p-4 rounded-2xl border mb-5 ${
                option === 'link'
                  ? 'border-primary bg-primary-light'
                  : 'border-border bg-muted'
              }`}
            >
              <View
                className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                  option === 'link' ? 'bg-primary' : 'bg-border'
                }`}
              >
                <Feather
                  name="link"
                  size={16}
                  color={option === 'link' ? '#ffffff' : '#9CA3AF'}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`text-sm font-semibold ${
                    option === 'link' ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  Generate Share Link
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Share via messaging apps or copy link
                </Text>
              </View>
              <View
                className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                  option === 'link' ? 'border-primary' : 'border-border'
                }`}
              >
                {option === 'link' && (
                  <View className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer buttons */}
          <View className="flex-row px-6 pb-6 gap-x-3">
            <TouchableOpacity
              onPress={handleCancel}
              disabled={isLoading}
              activeOpacity={0.75}
              className="flex-1 bg-muted rounded-2xl py-3.5 items-center"
            >
              <Text className="text-sm font-semibold text-foreground">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              disabled={isLoading}
              activeOpacity={0.75}
              className="flex-1 bg-primary rounded-2xl py-3.5 items-center flex-row justify-center gap-x-2"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Feather name="send" size={14} color="#ffffff" />
                  <Text className="text-sm font-semibold text-white">Share Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
