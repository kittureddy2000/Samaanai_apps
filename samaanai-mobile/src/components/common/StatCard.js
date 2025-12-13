import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

/**
 * StatCard - Displays a single statistic with icon, value, and label
 *
 * @param {string} label - Label text (e.g., "Food", "Exercise", "Net")
 * @param {number|string} value - The stat value to display
 * @param {string} unit - Optional unit (e.g., "cal", "kg")
 * @param {string} icon - MaterialCommunityIcons icon name
 * @param {string} iconColor - Color for the icon
 * @param {string} valueColor - Color for the value text
 * @param {string} variant - 'default' | 'compact' | 'large'
 * @param {object} style - Additional container styles
 */
const StatCard = ({
  label,
  value,
  unit = '',
  icon,
  iconColor = colors.primary,
  valueColor = colors.textPrimary,
  variant = 'default',
  style,
}) => {
  // Format number with commas
  const formatValue = (val) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          container: styles.containerCompact,
          value: styles.valueCompact,
          label: styles.labelCompact,
          icon: 20,
        };
      case 'large':
        return {
          container: styles.containerLarge,
          value: styles.valueLarge,
          label: styles.labelLarge,
          icon: 32,
        };
      default:
        return {
          container: styles.containerDefault,
          value: styles.valueDefault,
          label: styles.labelDefault,
          icon: 24,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Surface style={[styles.surface, variantStyles.container, style]} elevation={1}>
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={variantStyles.icon}
          color={iconColor}
          style={styles.icon}
        />
      )}
      <Text style={[variantStyles.value, { color: valueColor }]}>
        {formatValue(value)}
        {unit && <Text style={styles.unit}> {unit}</Text>}
      </Text>
      <Text style={variantStyles.label}>{label}</Text>
    </Surface>
  );
};

/**
 * StatCardRow - Container for multiple StatCards in a row
 */
export const StatCardRow = ({ children, style }) => (
  <View style={[styles.row, style]}>{children}</View>
);

const styles = StyleSheet.create({
  surface: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  // Default variant
  containerDefault: {
    padding: spacing.md,
    minWidth: 100,
    flex: 1,
  },
  valueDefault: {
    fontSize: 24,
    fontWeight: '700',
  },
  labelDefault: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  // Compact variant
  containerCompact: {
    padding: spacing.sm,
    minWidth: 80,
    flex: 1,
  },
  valueCompact: {
    fontSize: 18,
    fontWeight: '600',
  },
  labelCompact: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Large variant
  containerLarge: {
    padding: spacing.lg,
    minWidth: 120,
    flex: 1,
  },
  valueLarge: {
    fontSize: 32,
    fontWeight: '700',
  },
  labelLarge: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
  },
  // Common
  icon: {
    marginBottom: 4,
  },
  unit: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default StatCard;
