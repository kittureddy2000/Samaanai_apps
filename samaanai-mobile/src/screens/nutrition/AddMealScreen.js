import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Title } from 'react-native-paper';

export default function Screen() {
  return (
    <View style={styles.container}>
      <Title>nutrition/AddMealScreen</Title>
      <Text>Content coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24
  }
});
