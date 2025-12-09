/**
 * Victory Components Wrapper
 * Returns null/passthrough components - using CSS-based fallback charts instead
 * Victory Native was removed due to complex native build requirements (Skia)
 */

// All Victory components are placeholders - actual charts use CSS fallback
export const VictoryBar = () => null;
export const VictoryChart = ({ children }) => children;
export const VictoryAxis = () => null;
export const VictoryGroup = ({ children }) => children;
export const VictoryLine = () => null;
export const VictoryScatter = () => null;
export const VictoryArea = () => null;
export const VictoryLegend = () => null;

// Victory is not available - always use fallback charts
export const isVictoryAvailable = false;
