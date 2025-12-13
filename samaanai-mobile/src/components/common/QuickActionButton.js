import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

/**
 * QuickActionButton - Icon button with label for quick actions
 *
 * @param {string} icon - MaterialCommunityIcons icon name
 * @param {string} label - Button label
 * @param {function} onPress - Press handler
 * @param {string} color - Icon color (default: primary)
 * @param {string} variant - 'default' | 'outlined' | 'filled'
 * @param {boolean} disabled - Disable the button
 * @param {object} style - Additional container styles
 */
const QuickActionButton = ({
  icon,
  label,
  onPress,
  color = colors.primary,
  variant = 'default',
  disabled = false,
  style,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          container: { backgroundColor: color },
          icon: colors.white,
          label: { color: colors.white },
        };
      case 'outlined':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: color,
          },
          icon: color,
          label: { color },
        };
      default:
        return {
          container: { backgroundColor: colors.surfaceVariant },
          icon: color,
          label: { color: colors.textPrimary },
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.container,
        variantStyles.container,
        disabled && styles.disabled,
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={disabled ? colors.textDisabled : variantStyles.icon}
      />
      <Text
        style={[
          styles.label,
          variantStyles.label,
          disabled && styles.disabledText,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * QuickActionGrid - Grid container for QuickActionButtons
 */
export const QuickActionGrid = ({ children, columns = 3, style }) => (
  <View style={[styles.grid, { gap: spacing.sm }, style]}>
    {React.Children.map(children, (child) =>
      React.cloneElement(child, {
        style: [child.props.style, { flex: 1, minWidth: `${100 / columns - 5}%` }],
      })
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    gap: spacing.xs,
    minHeight: 48,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: colors.textDisabled,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

export default QuickActionButton;
