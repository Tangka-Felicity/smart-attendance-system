import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../../theme';

export const DashboardScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
    <Text>Dashboard Screen</Text>
  </View>
);

export default DashboardScreen;
