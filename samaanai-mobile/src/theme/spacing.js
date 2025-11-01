/**
 * Centralized spacing system
 * Use multiples of base unit (8px) for consistency
 */

const BASE_UNIT = 8;

export const spacing = {
  xs: BASE_UNIT * 0.5,   // 4px
  sm: BASE_UNIT,         // 8px
  md: BASE_UNIT * 2,     // 16px
  lg: BASE_UNIT * 3,     // 24px
  xl: BASE_UNIT * 4,     // 32px
  xxl: BASE_UNIT * 6,    // 48px

  // Common margins/padding
  cardMargin: 12,
  cardPadding: 16,
  screenPadding: 16,
  sectionGap: 24,
};

export default spacing;
