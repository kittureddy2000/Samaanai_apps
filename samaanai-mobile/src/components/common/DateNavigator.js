import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { colors, spacing } from '../../theme';

/**
 * DateNavigator - Date navigation with prev/next buttons and optional calendar picker
 *
 * @param {Date} date - Currently selected date
 * @param {function} onDateChange - Callback when date changes
 * @param {string} formatPattern - date-fns format pattern (default: 'MMM d, yyyy')
 * @param {boolean} showPicker - Enable calendar picker on date tap
 * @param {boolean} allowFuture - Allow selecting future dates
 * @param {string} variant - 'default' | 'compact'
 */
const DateNavigator = ({
  date,
  onDateChange,
  formatPattern = 'MMM d, yyyy',
  showPicker = true,
  allowFuture = false,
  variant = 'default',
}) => {
  const [pickerVisible, setPickerVisible] = useState(false);

  // Navigate to previous day
  const goToPrevious = () => {
    onDateChange(subDays(date, 1));
  };

  // Navigate to next day
  const goToNext = () => {
    const nextDate = addDays(date, 1);
    if (!allowFuture && nextDate > new Date()) return;
    onDateChange(nextDate);
  };

  // Handle calendar picker change
  const handlePickerChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setPickerVisible(false);
    }
    if (selectedDate) {
      onDateChange(selectedDate);
    }
  };

  // Close iOS picker
  const closePicker = () => {
    setPickerVisible(false);
  };

  // Format date with friendly labels
  const getDisplayDate = () => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, formatPattern);
  };

  // Check if next button should be disabled
  const isNextDisabled = !allowFuture && isToday(date);

  const isCompact = variant === 'compact';

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      <IconButton
        icon="chevron-left"
        size={isCompact ? 20 : 24}
        onPress={goToPrevious}
        iconColor={colors.primary}
        style={styles.navButton}
      />

      <TouchableOpacity
        onPress={() => showPicker && setPickerVisible(true)}
        style={styles.dateButton}
        activeOpacity={showPicker ? 0.7 : 1}
      >
        <Text style={[styles.dateText, isCompact && styles.dateTextCompact]}>
          {getDisplayDate()}
        </Text>
        {showPicker && (
          <Text style={styles.tapHint}>tap to change</Text>
        )}
      </TouchableOpacity>

      <IconButton
        icon="chevron-right"
        size={isCompact ? 20 : 24}
        onPress={goToNext}
        iconColor={isNextDisabled ? colors.gray400 : colors.primary}
        disabled={isNextDisabled}
        style={styles.navButton}
      />

      {/* Calendar Picker */}
      {pickerVisible && (
        <>
          {Platform.OS === 'ios' && (
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity onPress={closePicker}>
                  <Text style={styles.iosDoneButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handlePickerChange}
                maximumDate={allowFuture ? undefined : new Date()}
                style={styles.iosPicker}
              />
            </View>
          )}
          {Platform.OS === 'android' && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={handlePickerChange}
              maximumDate={allowFuture ? undefined : new Date()}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  containerCompact: {
    paddingVertical: spacing.xs,
  },
  navButton: {
    margin: 0,
  },
  dateButton: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minWidth: 140,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dateTextCompact: {
    fontSize: 14,
  },
  tapHint: {
    fontSize: 10,
    color: colors.textHint,
    marginTop: 2,
  },
  // iOS picker styles
  iosPickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    zIndex: 1000,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iosDoneButton: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  iosPicker: {
    height: 200,
  },
});

export default DateNavigator;
