/**
 * Centralized color palette
 * Use these instead of hardcoded hex values throughout the app
 *
 * Color Psychology:
 * - Green = Success, progress, positive actions (under goal, weight loss)
 * - Red = Alert, warning, needs attention (over goal, weight gain)
 * - Orange = Caution, neutral, in-progress
 * - Blue = Primary actions, information
 */

export const colors = {
  // Primary brand colors - Teal/Green for health app
  primary: '#00897B',        // Teal - trust, health, calm
  primaryLight: '#4DB6AC',
  primaryDark: '#00695C',

  // Secondary colors - Action/Energy
  secondary: '#FF6F00',      // Orange - motivation, action
  secondaryLight: '#FF9800',
  secondaryDark: '#E65100',

  // Accent color
  accent: '#7C4DFF',         // Purple - premium, balance

  // Semantic colors - CORRECT PSYCHOLOGY
  success: '#4caf50',        // Green = good (under goal, weight loss achieved)
  warning: '#ff9800',        // Orange = caution (close to goal)
  error: '#f44336',          // Red = alert (over goal, needs attention)
  info: '#2196f3',           // Blue = informational

  // Task/Status colors
  pending: '#ff9800',
  completed: '#4caf50',
  overdue: '#f44336',

  // ==========================================
  // NUTRITION-SPECIFIC COLORS
  // ==========================================

  // Calorie tracking
  caloriesConsumed: '#2196F3',  // Blue - food intake
  caloriesBurned: '#00BCD4',    // Cyan - exercise/activity
  netCalories: '#ff9800',       // Orange - neutral net value

  // Goal status (CORRECT SEMANTICS)
  deficit: '#4caf50',           // Green = GOOD (under goal, losing weight)
  surplus: '#f44336',           // Red = ALERT (over goal, gaining weight)
  onTarget: '#8BC34A',          // Light green = perfect balance

  // Meal type colors
  breakfast: '#FFB74D',         // Warm orange - morning
  lunch: '#4FC3F7',             // Light blue - midday
  dinner: '#7986CB',            // Purple-blue - evening
  snacks: '#AED581',            // Light green - snacks

  // Weight tracking
  weightLoss: '#4caf50',        // Green = positive progress
  weightGain: '#f44336',        // Red = may need attention
  weightMaintain: '#9e9e9e',    // Gray = stable

  // Neutral colors
  white: '#ffffff',
  black: '#000000',

  // Gray scale
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#eeeeee',
  gray300: '#e0e0e0',
  gray400: '#bdbdbd',
  gray500: '#9e9e9e',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // Text colors
  textPrimary: '#212121',
  textSecondary: '#757575',
  textDisabled: '#9e9e9e',
  textHint: '#bdbdbd',

  // Background colors
  background: '#fafafa',
  backgroundDark: '#f5f5f5',
  surface: '#ffffff',
  surfaceVariant: '#f5f5f5',

  // Border colors
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  divider: '#eeeeee',

  // Checkbox/Icon colors
  checkboxUnchecked: '#9e9e9e',
  checkboxChecked: '#4caf50',

  // Chart/Graph colors - Accessible palette
  chartBlue: '#2196F3',
  chartGreen: '#4caf50',
  chartOrange: '#ff9800',
  chartRed: '#f44336',
  chartPurple: '#9c27b0',
  chartCyan: '#00BCD4',
  chartPink: '#E91E63',
  chartTeal: '#009688',

  // Progress ring colors
  ringBackground: '#e0e0e0',
  ringProgress: '#00897B',
  ringRemaining: '#4caf50',
  ringOver: '#f44336',
};

export default colors;
