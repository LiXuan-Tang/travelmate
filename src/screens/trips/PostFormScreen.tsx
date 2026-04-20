import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { RootStackParamList } from '@app-types/index';
import { useCommunityStore } from '@store/communityStore';
import { usePostActions, PostFormData } from '@hooks/usePosts';

type Props = NativeStackScreenProps<RootStackParamList, 'PostForm'>;

const PRESET_TAGS = ['beach', 'food', 'culture', 'adventure', 'citybreak', 'nature', 'backpacking'];

export default function PostFormScreen({ route, navigation }: Props) {
  const { postId } = route.params ?? {};
  const isEditing = !!postId;

  const existingPost = useCommunityStore((s) => s.posts.find((p) => p.id === postId));
  const { isLoading, pickImages, createPost, editPost } = usePostActions();

  const [title, setTitle] = useState(existingPost?.title ?? '');
  const [body, setBody] = useState(existingPost?.body ?? '');
  const [destination, setDestination] = useState(existingPost?.destination ?? '');
  const [tags, setTags] = useState<string[]>(existingPost?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>(
    existingPost?.visibility ?? 'public',
  );
  const [imageUris, setImageUris] = useState<string[]>(existingPost?.images ?? []);

  // Reset form if navigated to create mode while edit state leftover
  useEffect(() => {
    if (!isEditing) {
      setTitle(''); setBody(''); setDestination('');
      setTags([]); setTagInput(''); setVisibility('public'); setImageUris([]);
    }
  }, [isEditing]);

  const handlePickImages = useCallback(async () => {
    if (imageUris.length >= 5) {
      Alert.alert('Limit reached', 'You can add up to 5 photos per post.');
      return;
    }
    const picked = await pickImages();
    const available = 5 - imageUris.length;
    setImageUris((prev) => [...prev, ...picked.slice(0, available)]);
  }, [imageUris.length, pickImages]);

  const handleRemoveImage = useCallback((index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddTag = useCallback((raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag) && tags.length < 8) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput('');
  }, [tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please add a title for your post.');
      return;
    }

    const form: PostFormData = {
      title, body, destination, tags, visibility, imageUris,
    };

    let success: boolean | string | null;
    if (isEditing && existingPost) {
      success = await editPost(postId!, form, existingPost.images ?? []);
    } else {
      success = await createPost(form);
    }

    if (success) {
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Could not save your post. Please try again.');
    }
  }, [title, body, destination, tags, visibility, imageUris, isEditing, existingPost, postId, createPost, editPost, navigation]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text className="text-sm font-medium text-muted-foreground">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-foreground">
          {isEditing ? 'Edit Post' : 'New Post'}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading || !title.trim()}
          activeOpacity={0.75}
          className={`rounded-xl px-4 py-1.5 ${
            isLoading || !title.trim() ? 'bg-muted' : 'bg-primary'
          }`}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className={`text-xs font-semibold ${
              !title.trim() ? 'text-muted-foreground' : 'text-white'
            }`}>
              {isEditing ? 'Save' : 'Post'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Images ── */}
          <View className="mb-5">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Photos ({imageUris.length}/5)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-x-3">
                {imageUris.map((uri, idx) => (
                  <View key={idx} className="relative">
                    <Image
                      source={{ uri }}
                      style={{ width: 88, height: 88, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => handleRemoveImage(idx)}
                      activeOpacity={0.8}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 items-center justify-center"
                    >
                      <Text className="text-white text-xs font-bold">×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {imageUris.length < 5 && (
                  <TouchableOpacity
                    onPress={handlePickImages}
                    activeOpacity={0.75}
                    style={{ width: 88, height: 88, borderRadius: 12 }}
                    className="border-2 border-dashed border-border items-center justify-center"
                  >
                    <Text className="text-muted-foreground text-2xl">+</Text>
                    <Text className="text-xs text-muted-foreground mt-1">Add photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>

          {/* ── Title ── */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Title *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What's the story about?"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
              className="bg-muted rounded-xl px-4 py-3 text-sm text-foreground"
            />
          </View>

          {/* ── Body ── */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Story
            </Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Share your travel experience..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={2000}
              className="bg-muted rounded-xl px-4 py-3 text-sm text-foreground"
              style={{ minHeight: 120, textAlignVertical: 'top' }}
            />
          </View>

          {/* ── Destination ── */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Destination
            </Text>
            <TextInput
              value={destination}
              onChangeText={setDestination}
              placeholder="e.g. Tokyo, Japan"
              placeholderTextColor="#9CA3AF"
              maxLength={80}
              className="bg-muted rounded-xl px-4 py-3 text-sm text-foreground"
            />
          </View>

          {/* ── Tags ── */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Tags ({tags.length}/8)
            </Text>

            {/* Preset chips */}
            <View className="flex-row flex-wrap gap-2 mb-2">
              {PRESET_TAGS.map((preset) => {
                const active = tags.includes(preset);
                return (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => active ? handleRemoveTag(preset) : handleAddTag(preset)}
                    activeOpacity={0.75}
                    className={`rounded-full px-3 py-1 border ${
                      active ? 'bg-foreground border-foreground' : 'bg-surface border-border'
                    }`}
                  >
                    <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-foreground'}`}>
                      #{preset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom tag input */}
            <View className="flex-row items-center gap-x-2">
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={() => handleAddTag(tagInput)}
                placeholder="Custom tag…"
                placeholderTextColor="#9CA3AF"
                maxLength={24}
                returnKeyType="done"
                className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm text-foreground"
              />
              <TouchableOpacity
                onPress={() => handleAddTag(tagInput)}
                disabled={!tagInput.trim()}
                activeOpacity={0.75}
                className="bg-foreground rounded-xl px-3 py-2.5"
              >
                <Text className="text-xs font-semibold text-white">Add</Text>
              </TouchableOpacity>
            </View>

            {/* Applied custom tags (non-preset) */}
            {tags.filter((t) => !PRESET_TAGS.includes(t)).length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-2">
                {tags
                  .filter((t) => !PRESET_TAGS.includes(t))
                  .map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => handleRemoveTag(tag)}
                      activeOpacity={0.75}
                      className="flex-row items-center bg-foreground rounded-full px-3 py-1 gap-x-1"
                    >
                      <Text className="text-xs text-white">#{tag}</Text>
                      <Text className="text-xs text-white/70">×</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>

          {/* ── Visibility ── */}
          <View className="mb-2">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Visibility
            </Text>
            <View className="flex-row gap-x-3">
              {(['public', 'private'] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setVisibility(v)}
                  activeOpacity={0.75}
                  className={`flex-1 rounded-xl py-3 items-center border ${
                    visibility === v
                      ? 'bg-foreground border-foreground'
                      : 'bg-surface border-border'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${
                    visibility === v ? 'text-white' : 'text-foreground'
                  }`}>
                    {v === 'public' ? '🌍 Public' : '🔒 Private'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
