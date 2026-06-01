import * as Haptics from 'expo-haptics';

/** Thin wrappers so screens can fire haptics without repeating try/catch. */
export const hapticLight = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
};

export const hapticMedium = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
};

export const hapticSuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
};

export const hapticError = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
};
