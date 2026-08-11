import { useState, useEffect } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export function useNetworkState() {
  const [networkState, setNetworkState] = useState<NetInfoState | null>(null);

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state) => {
      setNetworkState(state);
    });

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkState(state);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    state: networkState,
    isConnected: networkState?.isConnected ?? false,
    isInternetReachable: networkState?.isInternetReachable ?? false,
  };
}
