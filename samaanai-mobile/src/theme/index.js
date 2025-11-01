/**
 * Centralized theme system
 * Import theme instead of hardcoding colors/spacing
 *
 * Usage:
 * import { colors, spacing, typography } from '../theme';
 *
 * color: colors.primary
 * marginTop: spacing.md
 * fontSize: typography.fontSize.lg
 */

export { default as colors } from './colors';
export { default as spacing } from './spacing';
export { default as typography } from './typography';

// Convenience exports
export * from './colors';
export * from './spacing';
export * from './typography';
