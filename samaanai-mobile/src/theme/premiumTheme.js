import { MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  displayLarge: {
    fontFamily: 'System',
    fontWeight: '700',
    fontSize: 57,
    lineHeight: 64,
    letterSpacing: -0.25,
  },
  displayMedium: {
    fontFamily: 'System',
    fontWeight: '700',
    fontSize: 45,
    lineHeight: 52,
    letterSpacing: 0,
  },
  displaySmall: {
    fontFamily: 'System',
    fontWeight: '700',
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 0,
  },
  headlineLarge: {
    fontFamily: 'System',
    fontWeight: '700',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontFamily: 'System',
    fontWeight: '600',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontFamily: 'System',
    fontWeight: '600',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
  },
  titleLarge: {
    fontFamily: 'System',
    fontWeight: '600',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
  },
  titleMedium: {
    fontFamily: 'System',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontFamily: 'System',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelLarge: {
    fontFamily: 'System',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  bodyLarge: {
    fontFamily: 'System',
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  bodyMedium: {
    fontFamily: 'System',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
};

export const premiumTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({config: fontConfig}),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#00695C', // Deep Teal
    onPrimary: '#FFFFFF',
    primaryContainer: '#B2DFDB',
    onPrimaryContainer: '#004D40',
    secondary: '#004D40', // Darker Teal
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E0F2F1',
    onSecondaryContainer: '#004D40',
    tertiary: '#2E7D32', // Green
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#C8E6C9',
    onTertiaryContainer: '#1B5E20',
    background: '#F5F7FA', // Light Blue-Grey
    surface: '#FFFFFF',
    surfaceVariant: '#E0E0E0',
    onSurface: '#1A1C1E',
    onSurfaceVariant: '#424242',
    outline: '#757575',
    error: '#B00020',
    // Custom Gradients (used in components via LinearGradient)
    gradients: {
      primary: ['#004D40', '#00695C', '#4DB6AC'], // Deep Teal to Light Teal
      success: ['#2E7D32', '#43A047', '#66BB6A'], // Green Gradient
      warning: ['#EF6C00', '#F57C00', '#FF9800'], // Orange Gradient
      error: ['#C62828', '#D32F2F', '#E53935'], // Red Gradient
      card: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'], // Glassmorphism
    },
    // Glassmorphism styles
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      borderColor: 'rgba(255, 255, 255, 0.5)',
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    }
  },
  roundness: 16, // More rounded corners
};
