import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, ActivityIndicator, Snackbar, FAB, Surface } from 'react-native-paper';
import { api } from '../../services/api';
import { format, subDays, addDays } from 'date-fns';
import { colors, spacing } from '../../theme';
import { DateNavigator, StatCard, StatCardRow } from '../../components/common';
import { MealInput, MealInputGroup } from '../../components/forms';
import VoiceInputButton from '../../components/VoiceInputButton';

export default function DailyEntryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyReport, setDailyReport] = useState(null);
  const [error, setError] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');

  const [formValues, setFormValues] = useState({
    breakfast: '',
    lunch: '',
    dinner: '',
    snacks: '',
    exercise: '',
    weight: '',
  });

  // Calculate live summary from form values
  const liveSummary = useMemo(() => {
    const food =
      (parseInt(formValues.breakfast) || 0) +
      (parseInt(formValues.lunch) || 0) +
      (parseInt(formValues.dinner) || 0) +
      (parseInt(formValues.snacks) || 0);
    const exercise = parseInt(formValues.exercise) || 0;
    const net = food - exercise;
    const goal = dailyReport?.summary?.dailyGoal || 2000;

    return { food, exercise, net, goal };
  }, [formValues, dailyReport]);

  const fetchDailyReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const response = await api.getDailyReport(dateStr);
      const data = response.data;

      setDailyReport(data);

      // Populate form with existing values
      const newFormValues = {
        breakfast: data.meals?.find((m) => m.mealType === 'breakfast')?.calories?.toString() || '',
        lunch: data.meals?.find((m) => m.mealType === 'lunch')?.calories?.toString() || '',
        dinner: data.meals?.find((m) => m.mealType === 'dinner')?.calories?.toString() || '',
        snacks: data.meals?.find((m) => m.mealType === 'snacks')?.calories?.toString() || '',
        exercise: data.exercise?.caloriesBurned?.toString() || '',
        weight: '',
      };

      // Fetch weight for the day
      try {
        const weightResponse = await api.getWeightHistory();
        const weights = weightResponse.data.entries || [];
        const todayWeight = weights.find((w) => {
          const weightDate = new Date(w.date);
          return weightDate.toDateString() === selectedDate.toDateString();
        });
        if (todayWeight) {
          newFormValues.weight = todayWeight.weight.toString();
        }
      } catch (err) {
        console.log('No weight data');
      }

      setFormValues(newFormValues);
    } catch (err) {
      console.error('Daily report error:', err);
      setError(err.response?.data?.error || 'Failed to load daily data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyReport();
  }, [selectedDate]);

  const handleInputChange = (field, value) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleVoiceCommand = (parsedCommand) => {
    if (parsedCommand.type === 'calorie') {
      const mealTypeMap = {
        breakfast: 'breakfast',
        lunch: 'lunch',
        dinner: 'dinner',
        snack: 'snacks',
        snacks: 'snacks',
      };

      const fieldName = mealTypeMap[parsedCommand.mealType];
      if (fieldName && parsedCommand.calories) {
        setFormValues((prev) => ({
          ...prev,
          [fieldName]: parsedCommand.calories.toString(),
        }));
      }
    } else if (parsedCommand.type === 'exercise') {
      if (parsedCommand.caloriesBurned) {
        setFormValues((prev) => ({
          ...prev,
          exercise: parsedCommand.caloriesBurned.toString(),
        }));
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      const mealTypes = [
        { key: 'breakfast', description: 'Breakfast' },
        { key: 'lunch', description: 'Lunch' },
        { key: 'dinner', description: 'Dinner' },
        { key: 'snacks', description: 'Snacks' },
      ];

      const dateObj = new Date(selectedDate);
      dateObj.setHours(0, 0, 0, 0);

      // Save meals
      for (const meal of mealTypes) {
        const existingEntry = dailyReport?.meals?.find((m) => m.mealType === meal.key);
        const calories = formValues[meal.key];

        if (calories && calories !== '0' && calories !== '') {
          const mealData = {
            mealType: meal.key,
            description: meal.description,
            calories: parseInt(calories, 10),
            date: dateObj,
          };
          if (existingEntry) {
            await api.updateMeal(existingEntry.id, mealData);
          } else {
            await api.createMeal(mealData);
          }
        } else if (existingEntry) {
          await api.deleteMeal(existingEntry.id);
        }
      }

      // Save exercise
      const existingExercise = dailyReport?.exercise;
      const exerciseCalories = formValues.exercise;
      if (exerciseCalories && exerciseCalories !== '0' && exerciseCalories !== '') {
        const exerciseData = {
          description: 'Daily Exercise',
          caloriesBurned: parseInt(exerciseCalories, 10),
          durationMinutes: 30,
          date: dateObj,
        };
        if (existingExercise) {
          exerciseData.id = existingExercise.id;
        }
        await api.addOrUpdateExerciseEntry(exerciseData);
      } else if (existingExercise) {
        await api.deleteExerciseEntry(existingExercise.id);
      }

      // Save weight
      const weight = formValues.weight;
      if (weight && weight !== '0' && weight !== '') {
        const weightData = {
          weight: parseFloat(weight),
          date: dateObj,
        };
        await api.createWeightEntry(weightData);
      }

      setSnackbarMessage('Entries saved successfully!');
      setSnackbarType('success');
      setSnackbarVisible(true);
      await fetchDailyReport();

      setTimeout(() => {
        navigation.navigate('Dashboard');
      }, 1500);
    } catch (err) {
      console.error('Error submitting entries:', err);
      setSnackbarMessage(err.response?.data?.error || 'Failed to save entries');
      setSnackbarType('error');
      setSnackbarVisible(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading daily data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Date Navigator */}
        <DateNavigator
          date={selectedDate}
          onDateChange={setSelectedDate}
          showPicker={true}
          allowFuture={false}
        />

        {/* Error Banner */}
        {error && (
          <Surface style={styles.errorBanner} elevation={0}>
            <Text style={styles.errorText}>{error}</Text>
          </Surface>
        )}

        {/* Live Summary */}
        <View style={styles.section}>
          <StatCardRow>
            <StatCard
              label="Food"
              value={liveSummary.food}
              unit="cal"
              icon="food"
              iconColor={colors.caloriesConsumed}
              valueColor={colors.caloriesConsumed}
              variant="compact"
            />
            <StatCard
              label="Exercise"
              value={liveSummary.exercise}
              unit="cal"
              icon="run"
              iconColor={colors.caloriesBurned}
              valueColor={colors.caloriesBurned}
              variant="compact"
            />
            <StatCard
              label="Net"
              value={liveSummary.net}
              unit="cal"
              icon="calculator"
              iconColor={colors.netCalories}
              valueColor={liveSummary.net > liveSummary.goal ? colors.surplus : colors.deficit}
              variant="compact"
            />
          </StatCardRow>
          <Text style={styles.goalHint}>
            Goal: {liveSummary.goal} cal | {liveSummary.net > liveSummary.goal ? 'Over by ' : 'Under by '}
            {Math.abs(liveSummary.goal - liveSummary.net)} cal
          </Text>
        </View>

        {/* Meals Section */}
        <View style={styles.section}>
          <MealInputGroup title="Meals">
            <MealInput
              mealType="breakfast"
              value={formValues.breakfast}
              onChangeText={(value) => handleInputChange('breakfast', value)}
            />
            <MealInput
              mealType="lunch"
              value={formValues.lunch}
              onChangeText={(value) => handleInputChange('lunch', value)}
            />
            <MealInput
              mealType="dinner"
              value={formValues.dinner}
              onChangeText={(value) => handleInputChange('dinner', value)}
            />
            <MealInput
              mealType="snacks"
              value={formValues.snacks}
              onChangeText={(value) => handleInputChange('snacks', value)}
            />
          </MealInputGroup>
        </View>

        {/* Activity Section */}
        <View style={styles.section}>
          <MealInputGroup title="Activity">
            <MealInput
              mealType="exercise"
              value={formValues.exercise}
              onChangeText={(value) => handleInputChange('exercise', value)}
            />
          </MealInputGroup>
        </View>

        {/* Weight Section */}
        <View style={styles.section}>
          <MealInputGroup title="Measurement">
            <MealInput
              mealType="weight"
              value={formValues.weight}
              onChangeText={(value) => handleInputChange('weight', value)}
            />
          </MealInputGroup>
        </View>

        {/* Save Button */}
        <View style={styles.section}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={saving}
            disabled={saving || loading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
            labelStyle={styles.submitButtonLabel}
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </Button>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Voice Input FAB */}
      <FAB
        icon="microphone"
        style={styles.voiceFab}
        onPress={() => {}}
        color={colors.white}
        customSize={56}
      />
      <View style={styles.voiceButtonWrapper}>
        <VoiceInputButton
          onCommandParsed={handleVoiceCommand}
          commandType="all"
          size={56}
          iconColor={colors.white}
          style={styles.voiceButton}
        />
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
        style={[styles.snackbar, snackbarType === 'error' ? styles.snackbarError : styles.snackbarSuccess]}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.md,
  },
  errorBanner: {
    backgroundColor: colors.error,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 8,
  },
  errorText: {
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
  goalHint: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  submitButtonContent: {
    paddingVertical: spacing.sm,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 100,
  },
  voiceFab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md + 60,
    backgroundColor: colors.secondary,
    opacity: 0, // Hidden, we use VoiceInputButton instead
  },
  voiceButtonWrapper: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md + 60,
  },
  voiceButton: {
    backgroundColor: colors.secondary,
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snackbar: {
    marginBottom: spacing.lg,
  },
  snackbarSuccess: {
    backgroundColor: colors.success,
  },
  snackbarError: {
    backgroundColor: colors.error,
  },
});
