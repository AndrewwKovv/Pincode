import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../constants/theme';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (description: string, photoUris: string[]) => void;
};

export function PinFormModal({ visible, onCancel, onSubmit }: Props) {
  const [description, setDescription] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);

  function reset() {
    setDescription('');
    setPhotoUris([]);
  }

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setPhotoUris((prev) => [...prev, result.assets[0].uri]);
    }
  }

  async function handlePickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true });
    if (!result.canceled) {
      setPhotoUris((prev) => [...prev, ...result.assets.map((asset) => asset.uri)]);
    }
  }

  function handleSubmit() {
    onSubmit(description.trim(), photoUris);
    reset();
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Новое замечание</Text>
          <TextInput
            style={styles.input}
            placeholder="Описание замечания"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          {photoUris.length > 0 && (
            <ScrollView horizontal style={styles.photoRow} showsHorizontalScrollIndicator={false}>
              {photoUris.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.thumb} />
              ))}
            </ScrollView>
          )}
          <View style={styles.actionsRow}>
            <Pressable style={styles.secondaryButton} onPress={handleTakePhoto}>
              <Text style={styles.secondaryButtonText}>Камера</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handlePickFromLibrary}>
              <Text style={styles.secondaryButtonText}>Галерея</Text>
            </Pressable>
          </View>
          <View style={styles.actionsRow}>
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !description.trim() && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={!description.trim()}
            >
              <Text style={styles.saveButtonText}>Сохранить</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    textAlignVertical: 'top',
  },
  photoRow: {
    flexDirection: 'row',
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    marginRight: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
