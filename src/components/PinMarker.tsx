import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/theme';

const SIZE = 28;

type Props = {
  left: number;
  top: number;
  index: number;
  onPress: () => void;
};

export function PinMarker({ left, top, index, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.marker, { left: left - SIZE / 2, top: top - SIZE }]}
    >
      <Text style={styles.label}>{index}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  label: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
