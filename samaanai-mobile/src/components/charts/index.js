/**
 * Chart Components Export
 *
 * Usage:
 * import { WeeklyBarChart, SimpleBarChart } from '../components/charts';
 *
 * WeeklyBarChart - Has platform-specific versions:
 *   - WeeklyBarChart.js - Victory Native (iOS/Android)
 *   - WeeklyBarChart.web.js - CSS fallback (Web)
 *
 * SimpleBarChart - Single file with runtime platform detection
 */

export { default as WeeklyBarChart } from './WeeklyBarChart';
export { default as SimpleBarChart } from './SimpleBarChart';
export {
  VictoryBar,
  VictoryChart,
  VictoryAxis,
  VictoryGroup,
  VictoryLine,
  VictoryScatter,
  VictoryArea,
  VictoryLegend,
  isVictoryAvailable,
} from './VictoryComponents';
