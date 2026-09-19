import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Pdf from 'react-native-pdf';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Pin } from '../types/models';
import { PinMarker } from './PinMarker';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

type Props = {
  filePath: string;
  page: number;
  pins: Pin[];
  pinPlacementEnabled: boolean;
  onPageChanged: (page: number, totalPages: number) => void;
  onTapToAddPin: (page: number, xRatio: number, yRatio: number) => void;
  onPinPress: (pin: Pin) => void;
};

export function PdfViewer({
  filePath,
  page,
  pins,
  pinPlacementEnabled,
  onPageChanged,
  onTapToAddPin,
  onPinPress,
}: Props) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const containerWidth = useSharedValue(0);
  const containerHeight = useSharedValue(0);

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
    containerWidth.value = width;
    containerHeight.value = height;
  }

  function resetZoom() {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = Math.min(Math.max(savedScale.value * event.scale, MIN_SCALE), MAX_SCALE);
      scale.value = nextScale;
      const maxOffsetX = (containerWidth.value * (nextScale - 1)) / 2;
      const maxOffsetY = (containerHeight.value * (nextScale - 1)) / 2;
      translateX.value = Math.min(Math.max(savedTranslateX.value, -maxOffsetX), maxOffsetX);
      translateY.value = Math.min(Math.max(savedTranslateY.value, -maxOffsetY), maxOffsetY);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      if (scale.value <= MIN_SCALE) {
        resetZoom();
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (savedScale.value <= MIN_SCALE) return;
      const maxOffsetX = (containerWidth.value * (savedScale.value - 1)) / 2;
      const maxOffsetY = (containerHeight.value * (savedScale.value - 1)) / 2;
      translateX.value = Math.min(Math.max(savedTranslateX.value + event.translationX, -maxOffsetX), maxOffsetX);
      translateY.value = Math.min(Math.max(savedTranslateY.value + event.translationY, -maxOffsetY), maxOffsetY);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .enabled(!pinPlacementEnabled)
    .onEnd((event) => {
      if (savedScale.value > MIN_SCALE) {
        resetZoom();
        return;
      }
      const focalX = event.x - containerWidth.value / 2;
      const focalY = event.y - containerHeight.value / 2;
      const maxOffsetX = (containerWidth.value * (DOUBLE_TAP_SCALE - 1)) / 2;
      const maxOffsetY = (containerHeight.value * (DOUBLE_TAP_SCALE - 1)) / 2;
      const nextTranslateX = Math.min(Math.max(-focalX * (DOUBLE_TAP_SCALE - 1), -maxOffsetX), maxOffsetX);
      const nextTranslateY = Math.min(Math.max(-focalY * (DOUBLE_TAP_SCALE - 1), -maxOffsetY), maxOffsetY);

      scale.value = withTiming(DOUBLE_TAP_SCALE);
      savedScale.value = DOUBLE_TAP_SCALE;
      translateX.value = withTiming(nextTranslateX);
      translateY.value = withTiming(nextTranslateY);
      savedTranslateX.value = nextTranslateX;
      savedTranslateY.value = nextTranslateY;
    });

  const composedGesture = Gesture.Race(doubleTapGesture, Gesture.Simultaneous(pinchGesture, panGesture));

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.zoomLayer, zoomStyle]}>
          <Pdf
            source={{ uri: filePath }}
            page={page}
            scrollEnabled={false}
            enablePaging={false}
            enableDoubleTapZoom={false}
            minScale={1}
            maxScale={1}
            fitPolicy={0}
            style={styles.pdf}
            onPageChanged={(p, total) => {
              resetZoom();
              onPageChanged(p, total);
            }}
            onPageSingleTap={(p, x, y) => {
              if (pinPlacementEnabled && containerSize.width > 0 && containerSize.height > 0) {
                onTapToAddPin(p, x / containerSize.width, y / containerSize.height);
              }
            }}
          />
          {containerSize.width > 0 &&
            pins.map((pin, index) => (
              <PinMarker
                key={pin.id}
                left={pin.x * containerSize.width}
                top={pin.y * containerSize.height}
                index={index + 1}
                onPress={() => onPinPress(pin)}
              />
            ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  zoomLayer: { flex: 1 },
  pdf: { flex: 1, width: '100%', height: '100%' },
});
