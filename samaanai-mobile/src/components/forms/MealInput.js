import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Text, Surface } from 'react-native-paper';
import { colors, spacing } from '../../theme';

/**
 * MealInput - Styled input for meal calorie entry
 *
 * @param {string} mealType - 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'exercise' | 'weight'
 * @param {string} value - Input value
 * @param {function} onChangeText - Text change handler
 * @param {string} label - Optional custom label
 * @param {boolean} editable - Whether input is editable
 */
const MealInput = ({
  mealType,
  value,
  onChangeText,
  label,
  editable = true,
}) => {
  // Get meal type configuration
  const getMealConfig = () => {
    switch (mealType) {
      case 'breakfast':
        return {
          icon: 'weather-sunset-up',
          label: 'Breakfast',
          color: colors.breakfast,
          emoji: '🌅',
        };
      case 'lunch':
        return {
          icon: 'white-balance-sunny',
          label: 'Lunch',
          color: colors.lunch,
          emoji: '☀️',
        };
      case 'dinner':
        return {
          icon: 'weather-night',
          label: 'Dinner',
          color: colors.dinner,
          emoji: '🌙',
        };
      case 'snacks':
        return {
          icon: 'food-apple',
          label: 'Snacks',
          color: colors.snacks,
          emoji: '🍿',
        };
      case 'exercise':
        return {
          icon: 'run',
          label: 'Exercise',
          color: colors.caloriesBurned,
          emoji: '🏃',
        };
      case 'weight':
        return {
          icon: 'scale-bathroom',
          label: 'Weight',
          color: colors.primary,
          emoji: '⚖️',
        };
      default:
        return {
          icon: 'food',
          label: label || 'Calories',
          color: colors.primary,
          emoji: '🍽️',
        };
    }
  };

  const config = getMealConfig();

  return (
    <Surface style={styles.container} elevation={1}>
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <Text style={styles.emoji}>{config.emoji}</Text>
          <Text style={styles.label}>{label || config.label}</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            keyboardType="numeric"
            mode="flat"
            placeholder="0"
            editable={editable}
            style={styles.input}
            underlineColor="transparent"
            activeUnderlineColor={config.color}
            contentStyle={styles.inputContent}
          />
        </View>
      </View>
    </Surface>
  );
};

/**
 * MealInputGroup - Container for grouping MealInputs
 */
export const MealInputGroup = ({ title, children, style }) => (
  <View style={[styles.group, style]}>
    {title && <Text style={styles.groupTitle}>{title}</Text>}
    <View style={styles.groupContent}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  inputContainer: {
    width: 140,
  },
  input: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    height: 44,
  },
  inputContent: {
    textAlign: 'right',
    fontSize: 18,
    fontWeight: '600',
    paddingRight: 12,
  },
  // Group styles
  group: {
    marginBottom: spacing.md,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  groupContent: {
    gap: 2,
  },
});

export default MealInput;
