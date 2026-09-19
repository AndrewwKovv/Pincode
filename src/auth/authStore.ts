import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'pincode_token';
const SESSION_KEY = 'pincode_session';

export type Session = {
  userId: string;
  companyId: string;
  fullName: string;
  email: string;
};

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export async function saveSession(token: string, session: Session): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
