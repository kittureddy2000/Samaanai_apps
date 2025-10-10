import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

/**
 * Hook to detect screen size and provide responsive breakpoints
 * Works on mobile, tablet, and web
 */
export const useResponsive = () => {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;

  return {
    width,
    height,
    isSmallDevice: width < 375,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    isLargeDesktop: width >= 1440,
    isPortrait: height > width,
    isLandscape: width > height,
    isWeb: Platform.OS === 'web',

    // Responsive values
    horizontalPadding: width < 768 ? 16 : width < 1024 ? 24 : 32,
    contentMaxWidth: width >= 1024 ? 1200 : width,

    // Grid columns for lists
    gridColumns: width < 768 ? 1 : width < 1024 ? 2 : 3
  };
};

export default useResponsive;