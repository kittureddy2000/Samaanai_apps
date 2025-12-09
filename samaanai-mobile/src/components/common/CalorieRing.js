import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '../../theme';

/**
 * CalorieRing - Circular progress indicator for daily calorie tracking
 *
 * @param {number} consumed - Calories consumed
 * @param {number} goal - Daily calorie goal
 * @param {number} size - Ring diameter (default: 200)
 * @param {number} strokeWidth - Ring thickness (default: 16)
 * @param {string} label - Optional label below the value
 */
const CalorieRing = ({
  consumed = 0,
  goal = 2000,
  size = 200,
  strokeWidth = 16,
  label = 'remaining',
  showRemaining = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

  // Calculate progress
  const progress = Math.min(consumed / goal, 1.5); // Cap at 150% for visual
  const progressOffset = circumference - progress * circumference;

  // Calculate remaining calories
  const remaining = goal - consumed;
  const isOver = remaining < 0;

  // Determine ring color based on status
  const getProgressColor = () => {
    if (isOver) return colors.ringOver;
    if (consumed >= goal * 0.9) return colors.warning;
    return colors.ringProgress;
  };

  // Format number with commas
  const formatNumber = (num) => {
    return Math.abs(num).toLocaleString();
  };

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.ringBackground}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={getProgressColor()}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Center content */}
      <View style={[styles.centerContent, { width: size, height: size }]}>
        <Text
          style={[
            styles.mainValue,
            { color: isOver ? colors.surplus : colors.textPrimary },
          ]}
        >
          {isOver ? '+' : ''}
          {formatNumber(consumed)}
        </Text>
        {showRemaining && (
          <>
            <Text style={styles.separator}>━━━━━</Text>
            <Text
              style={[
                styles.remainingValue,
                { color: isOver ? colors.surplus : colors.deficit },
              ]}
            >
              {isOver ? '+' : ''}
              {formatNumber(remaining)} {label}
            </Text>
          </>
        )}
        <Text style={styles.goalText}>of {formatNumber(goal)} goal</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  separator: {
    color: colors.gray300,
    fontSize: 12,
    marginVertical: 2,
  },
  remainingValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  goalText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

export default CalorieRing;
