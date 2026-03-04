import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { COLORS, FONTS, SPACING } from '../constants/theme';

const NetworkContext = createContext({ isConnected: true });

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected !== false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      <View style={styles.container}>
        {children}
        {!isConnected && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>No internet connection</Text>
          </View>
        )}
      </View>
    </NetworkContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  bannerText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
});

export default NetworkContext;
