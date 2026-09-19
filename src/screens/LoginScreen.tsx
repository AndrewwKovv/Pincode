import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { login, fetchMe } from '../api/client';
import { saveSession } from '../auth/authStore';
import { syncNow } from '../sync/syncEngine';
import { colors } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const token = await login(email.trim(), password);
      const me = await fetchMe(token);
      await saveSession(token, {
        userId: me.id,
        companyId: me.company_id,
        fullName: me.full_name,
        email: me.email,
      });
      navigation.replace('ProjectList');
      syncNow();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pincode</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Пароль"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        style={[styles.button, (loading || !email || !password) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading || !email || !password}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Войти</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    marginBottom: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
