import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import type { RootStackParamList } from '../navigation/types';
import { Project } from '../types/models';
import { listProjects, createProject } from '../db/projects.repo';
import { copyPdfToProjectStorage } from '../utils/files';
import { generateId } from '../utils/ids';
import { importProjectFromFile } from '../utils/projectExport';
import { deleteProjectCompletely } from '../utils/projectDelete';
import { getSession, clearSession } from '../auth/authStore';
import { syncNow } from '../sync/syncEngine';
import { isNameTaken, suggestUniqueName } from '../utils/uniqueName';
import { colors } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectList'>;

export function ProjectListScreen({ navigation }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAscending, setSortAscending] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleLogout} hitSlop={8}>
          <Text style={styles.logoutText}>Выйти</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  async function handleLogout() {
    await clearSession();
    navigation.replace('Login');
  }

  useFocusEffect(
    useCallback(() => {
      listProjects().then(setProjects);
    }, [])
  );

  const visibleProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query ? projects.filter((p) => p.name.toLowerCase().includes(query)) : projects;
    return [...filtered].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortAscending ? diff : -diff;
    });
  }, [projects, searchQuery, sortAscending]);

  async function resolveUniqueProjectName(desiredName: string): Promise<string | null> {
    const existingNames = (await listProjects()).map((p) => p.name);
    if (!isNameTaken(desiredName, existingNames)) return desiredName;

    const suggested = suggestUniqueName(desiredName, existingNames);
    return new Promise((resolve) => {
      Alert.alert(
        'Такое название уже есть',
        `Объект «${desiredName}» уже существует. Добавить как «${suggested}»?`,
        [
          { text: 'Отмена', style: 'cancel', onPress: () => resolve(null) },
          { text: 'Добавить', onPress: () => resolve(suggested) },
        ]
      );
    });
  }

  function handleAddProject() {
    Alert.alert('Добавить объект', undefined, [
      { text: 'Новый объект из PDF', onPress: handleImportPdf },
      { text: 'Импортировать файл .pincode', onPress: handleImportPincode },
      { text: 'Отмена', style: 'cancel' },
    ]);
  }

  async function handleImportPdf() {
    const picked = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (picked.canceled) return;

    const file = picked.assets[0];
    const defaultName = file.name?.replace(/\.pdf$/i, '') ?? 'Новый объект';

    Alert.prompt(
      'Название объекта',
      undefined,
      async (name) => {
        const requestedName = name?.trim() || defaultName;
        const projectName = await resolveUniqueProjectName(requestedName);
        if (projectName === null) return;

        const projectId = generateId();
        const storedPath = await copyPdfToProjectStorage(file.uri, projectId);
        const session = await getSession();
        await createProject(projectId, projectName, storedPath, session?.companyId ?? null);
        setProjects(await listProjects());
        syncNow();
      },
      'plain-text',
      defaultName
    );
  }

  async function handleImportPincode() {
    const picked = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (picked.canceled) return;

    const file = picked.assets[0];
    if (!file.name?.toLowerCase().endsWith('.pincode')) {
      Alert.alert('Не тот файл', 'Выберите файл с расширением .pincode, экспортированный из приложения.');
      return;
    }

    try {
      const imported = await importProjectFromFile(file.uri, resolveUniqueProjectName);
      if (imported === null) return;
      setProjects(await listProjects());
      syncNow();
    } catch (error) {
      Alert.alert('Не удалось импортировать', error instanceof Error ? error.message : String(error));
    }
  }

  function handleLongPressProject(project: Project) {
    Alert.alert('Удалить объект?', `«${project.name}» и все его пины с фото будут удалены безвозвратно.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await deleteProjectCompletely(project.id);
          setProjects(await listProjects());
          syncNow();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      {projects.length > 0 && (
        <View style={styles.toolbar}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Поиск по названию"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
          <Pressable
            style={styles.sortButton}
            onPress={() => setSortAscending((prev) => !prev)}
            hitSlop={8}
          >
            <Text style={styles.sortButtonText}>{sortAscending ? '↑ Дата' : '↓ Дата'}</Text>
          </Pressable>
        </View>
      )}
      <FlatList
        data={visibleProjects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {projects.length === 0 ? 'Пока нет объектов. Добавьте PDF-план.' : 'Ничего не найдено'}
          </Text>
        }
        ListHeaderComponent={
          projects.length > 0 ? <Text style={styles.hintText}>Удерживайте объект, чтобы удалить</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('ProjectViewer', { projectId: item.id, projectName: item.name })}
            onLongPress={() => handleLongPressProject(item)}
          >
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSubtitle}>{new Date(item.createdAt).toLocaleDateString('ru-RU')}</Text>
          </Pressable>
        )}
      />
      <Pressable style={styles.fab} onPress={handleAddProject}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 14,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  sortButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  logoutText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  hintText: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 10,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  fab: {
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
  fabText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
  },
});
