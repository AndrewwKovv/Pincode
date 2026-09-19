import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Pin, Photo } from '../types/models';
import { colors } from '../constants/theme';

type Props = {
  visible: boolean;
  pin: Pin | null;
  photos: Photo[];
  onClose: () => void;
  onDelete: () => void;
};

export function PinDetailModal({ visible, pin, photos, onClose, onDelete }: Props) {
  if (!pin) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.description}>{pin.description}</Text>
          <Text style={styles.meta}>
            {pin.author} · {new Date(pin.createdAt).toLocaleString('ru-RU')}
          </Text>
          {photos.length > 0 && (
            <ScrollView horizontal style={styles.photoRow} showsHorizontalScrollIndicator={false}>
              {photos.map((photo) => (
                <Image key={photo.id} source={{ uri: photo.localFilePath }} style={styles.thumb} />
              ))}
            </ScrollView>
          )}
          <View style={styles.actionsRow}>
            <Pressable style={styles.deleteButton} onPress={onDelete}>
              <Text style={styles.deleteButtonText}>Удалить</Text>
            </Pressable>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Закрыть</Text>
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
  description: {
    color: colors.text,
    fontSize: 16,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  photoRow: {
    flexDirection: 'row',
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 8,
    marginRight: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: '600',
  },
  closeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
