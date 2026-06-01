import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../../theme';
import { useTranslation } from '../../hooks/useTranslation';

export const NotificationsScreen = () => {
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <Text>{t('notifications')}</Text>
    </View>
  );
};

export default NotificationsScreen;
