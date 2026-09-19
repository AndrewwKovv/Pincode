import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { syncNow } from './syncEngine';

const PERIODIC_SYNC_MS = 20000;

export function useAutoSync(): void {
  useEffect(() => {
    syncNow();

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        syncNow();
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncNow();
      }
    });

    const interval = setInterval(syncNow, PERIODIC_SYNC_MS);

    return () => {
      unsubscribeNetInfo();
      appStateSubscription.remove();
      clearInterval(interval);
    };
  }, []);
}
