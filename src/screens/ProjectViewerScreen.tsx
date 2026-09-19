import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import type { RootStackParamList } from '../navigation/types';
import { PdfViewer } from '../components/PdfViewer';
import { PinFormModal } from '../components/PinFormModal';
import { PinDetailModal } from '../components/PinDetailModal';
import { Pin, Photo, Project } from '../types/models';
import { getProject } from '../db/projects.repo';
import { listPinsForProjectPage, createPin } from '../db/pins.repo';
import { listPhotosForPin, addPhoto } from '../db/photos.repo';
import { copyPhotoToPinStorage } from '../utils/files';
import { exportProjectToFile } from '../utils/projectExport';
import { deleteProjectCompletely } from '../utils/projectDelete';
import { deletePinCompletely } from '../utils/pinDelete';
import { getSession } from '../auth/authStore';
import { syncNow } from '../sync/syncEngine';
import { colors } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectViewer'>;

type PendingLocation = { page: number; x: number; y: number } | null;

export function ProjectViewerScreen({ route, navigation }: Props) {
  const { projectId, projectName } = route.params;
  const [project, setProject] = useState<Project | null>(null);
  const [pdfMissing, setPdfMissing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pins, setPins] = useState<Pin[]>([]);
  const [pendingLocation, setPendingLocation] = useState<PendingLocation>(null);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [selectedPinPhotos, setSelectedPinPhotos] = useState<Photo[]>([]);
  const [isPlacingPin, setIsPlacingPin] = useState(false);

  async function handleShare() {
    try {
      const filePath = await exportProjectToFile(projectId);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Недоступно', 'Отправка файлов не поддерживается на этом устройстве.');
        return;
      }
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: projectName,
      });
    } catch (error) {
      Alert.alert('Не удалось экспортировать', error instanceof Error ? error.message : String(error));
    }
  }

  function handleDeleteBrokenProject() {
    Alert.alert('Удалить объект?', `«${projectName}» будет удалён безвозвратно.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await deleteProjectCompletely(projectId);
          navigation.goBack();
        },
      },
    ]);
  }

  useEffect(() => {
    navigation.setOptions({
      title: projectName,
      headerRight: () => (
        <Pressable onPress={handleShare} hitSlop={8}>
          <Text style={styles.headerAction}>Поделиться</Text>
        </Pressable>
      ),
    });
    getProject(projectId).then(async (loaded) => {
      setProject(loaded);
      if (loaded) {
        const info = await FileSystem.getInfoAsync(loaded.pdfFilePath);
        setPdfMissing(!info.exists);
      }
    });
  }, [projectId, projectName, navigation]);

  const reloadPins = useCallback(() => {
    listPinsForProjectPage(projectId, currentPage).then(setPins);
  }, [projectId, currentPage]);

  useEffect(() => {
    reloadPins();
  }, [reloadPins]);

  useFocusEffect(
    useCallback(() => {
      syncNow().then(reloadPins);
    }, [reloadPins])
  );

  function handlePageChanged(page: number, total: number) {
    setCurrentPage(page);
    setTotalPages(total);
  }

  function handleTapToAddPin(page: number, xRatio: number, yRatio: number) {
    setPendingLocation({ page, x: xRatio, y: yRatio });
  }

  function handleJumpToPage() {
    Alert.prompt(
      'Перейти на страницу',
      `От 1 до ${totalPages}`,
      (value) => {
        const target = Number(value);
        if (Number.isInteger(target) && target >= 1 && target <= totalPages) {
          setCurrentPage(target);
        }
      },
      'plain-text',
      String(currentPage)
    );
  }

  async function handleSubmitPin(description: string, photoUris: string[]) {
    if (!pendingLocation) return;
    const session = await getSession();
    const companyId = session?.companyId ?? null;
    const pin = await createPin(
      projectId,
      pendingLocation.page,
      pendingLocation.x,
      pendingLocation.y,
      description,
      session?.fullName ?? 'Вы',
      companyId
    );
    for (const uri of photoUris) {
      const storedPath = await copyPhotoToPinStorage(uri, pin.id);
      await addPhoto(pin.id, storedPath, companyId);
    }
    setPendingLocation(null);
    reloadPins();
    syncNow();
  }

  async function handlePinPress(pin: Pin) {
    setSelectedPin(pin);
    setSelectedPinPhotos(await listPhotosForPin(pin.id));
  }

  async function handleDeleteSelectedPin() {
    if (!selectedPin) return;
    await deletePinCompletely(selectedPin.id, selectedPin.syncStatus === 'synced');
    setSelectedPin(null);
    setSelectedPinPhotos([]);
    reloadPins();
    syncNow();
  }

  if (!project) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  if (pdfMissing) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>PDF-файл не найден</Text>
        <Text style={styles.loadingText}>
          Файл чертежа пропал из хранилища устройства. Данные пинов сохранены в базе, но открыть план нельзя.
        </Text>
        <Pressable style={styles.deleteBrokenButton} onPress={handleDeleteBrokenProject}>
          <Text style={styles.deleteBrokenButtonText}>Удалить объект</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PdfViewer
        filePath={project.pdfFilePath}
        page={currentPage}
        pins={pins}
        pinPlacementEnabled={isPlacingPin}
        onPageChanged={handlePageChanged}
        onTapToAddPin={handleTapToAddPin}
        onPinPress={handlePinPress}
      />

      {totalPages > 1 && (
        <View style={styles.pageNav}>
          <Pressable
            style={styles.pageNavButton}
            disabled={currentPage <= 1}
            onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <Text style={[styles.pageNavButtonText, currentPage <= 1 && styles.pageNavButtonTextDisabled]}>‹</Text>
          </Pressable>
          <Pressable style={styles.pageIndicator} onPress={handleJumpToPage}>
            <Text style={styles.pageIndicatorText}>
              Стр. {currentPage} из {totalPages}
            </Text>
          </Pressable>
          <Pressable
            style={styles.pageNavButton}
            disabled={currentPage >= totalPages}
            onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <Text style={[styles.pageNavButtonText, currentPage >= totalPages && styles.pageNavButtonTextDisabled]}>
              ›
            </Text>
          </Pressable>
        </View>
      )}

      {isPlacingPin && (
        <View style={styles.placingBanner} pointerEvents="none">
          <Text style={styles.placingBannerText}>Тапните по чертежу, чтобы поставить пин</Text>
        </View>
      )}

      <Pressable
        style={[styles.addPinButton, isPlacingPin && styles.addPinButtonActive]}
        onPress={() => setIsPlacingPin((prev) => !prev)}
      >
        <Text style={styles.addPinButtonText}>{isPlacingPin ? '✕' : '+'}</Text>
      </Pressable>

      <PinFormModal
        visible={pendingLocation !== null}
        onCancel={() => setPendingLocation(null)}
        onSubmit={handleSubmitPin}
      />
      <PinDetailModal
        visible={selectedPin !== null}
        pin={selectedPin}
        photos={selectedPinPhotos}
        onClose={() => setSelectedPin(null)}
        onDelete={handleDeleteSelectedPin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 32,
  },
  loadingText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  deleteBrokenButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteBrokenButtonText: {
    color: colors.danger,
    fontWeight: '600',
  },
  headerAction: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  addPinButton: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  addPinButtonActive: {
    backgroundColor: colors.danger,
  },
  addPinButtonText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
  },
  pageNav: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(26,29,36,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNavButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  pageNavButtonTextDisabled: {
    color: colors.textMuted,
  },
  pageIndicator: {
    backgroundColor: 'rgba(26,29,36,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pageIndicatorText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  placingBanner: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  placingBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
