import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Title, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { api } from '../../services/api';
import { format, subDays, addDays } from 'date-fns';

export default function DailyEntryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyReport, setDailyReport] = useState(null);
  const [error, setError] = useState(null);

  const [formValues, setFormValues] = useState({
    breakfast: '',
    lunch: '',
    dinner: '',
    snacks: '',
    exercise: '',
    weight: ''
  });

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
        breakfast: data.meals?.find(m => m.mealType === 'breakfast')?.calories?.toString() || '',
        lunch: data.meals?.find(m => m.mealType === 'lunch')?.calories?.toString() || '',
        dinner: data.meals?.find(m => m.mealType === 'dinner')?.calories?.toString() || '',
        snacks: data.meals?.find(m => m.mealType === 'snacks')?.calories?.toString() || '',
        exercise: data.exercise?.caloriesBurned?.toString() || '',
        weight: ''
      };
      setFormValues(newFormValues);

      // Fetch weight for the day
      try {
        const weightResponse = await api.getWeightHistory();
        const weights = weightResponse.data.entries || [];
        const todayWeight = weights.find(w => {
          const weightDate = new Date(w.date);
          return weightDate.toDateString() === selectedDate.toDateString();
        });
        if (todayWeight) {
          newFormValues.weight = todayWeight.weight.toString();
          setFormValues(newFormValues);
        }
      } catch (err) {
        console.log('No weight data');
      }
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

  const handlePreviousDay = () => {
    setSelectedDate(prevDate => subDays(prevDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prevDate => addDays(prevDate, 1));
  };

  const handleInputChange = (field, value) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
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
        const existingEntry = dailyReport?.meals?.find(m => m.mealType === meal.key);
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

      Alert.alert('Success', 'Entries saved successfully!');
      await fetchDailyReport();
    } catch (err) {
      console.error('Error submitting entries:', err);
      setError('Failed to save entries. Please try again.');
      Alert.alert('Error', err.response?.data?.error || 'Failed to save entries. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const calculateNetCalories = () => {
    if (!dailyReport || !dailyReport.summary) return 0;
    return dailyReport.summary.netCalories || 0;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading daily data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Date Navigation */}
      <View style={styles.dateSelector}>
        <Button mode="outlined" onPress={handlePreviousDay}>←</Button>
        <Text style={styles.dateText}>{format(selectedDate, 'MMMM d, yyyy')}</Text>
        <Button mode="outlined" onPress={handleNextDay}>→</Button>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Summary Stats */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Today's Summary</Title>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{dailyReport?.summary?.caloriesConsumed || 0}</Text>
              <Text style={styles.statLabel}>Food</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{dailyReport?.summary?.caloriesBurned || 0}</Text>
              <Text style={styles.statLabel}>Exercise</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{calculateNetCalories()}</Text>
              <Text style={styles.statLabel}>Net</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Entry Form */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Log Calories</Title>

          <Text style={styles.inputLabel}>Breakfast (cal)</Text>
          <TextInput
            mode="outlined"
            keyboardType="numeric"
            value={formValues.breakfast}
            onChangeText={(value) => handleInputChange('breakfast', value)}
            placeholder="0"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Lunch (cal)</Text>
          <TextInput
            mode="outlined"
            keyboardType="numeric"
            value={formValues.lunch}
            onChangeText={(value) => handleInputChange('lunch', value)}
            placeholder="0"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Dinner (cal)</Text>
          <TextInput
            mode="outlined"
            keyboardType="numeric"
            value={formValues.dinner}
            onChangeText={(value) => handleInputChange('dinner', value)}
            placeholder="0"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Snacks (cal)</Text>
          <TextInput
            mode="outlined"
            keyboardType="numeric"
            value={formValues.snacks}
            onChangeText={(value) => handleInputChange('snacks', value)}
            placeholder="0"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Exercise (cal burned)</Text>
          <TextInput
            mode="outlined"
            keyboardType="numeric"
            value={formValues.exercise}
            onChangeText={(value) => handleInputChange('exercise', value)}
            placeholder="0"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Weight (kg)</Text>
          <TextInput
            mode="outlined"
            keyboardType="decimal-pad"
            value={formValues.weight}
            onChangeText={(value) => handleInputChange('weight', value)}
            placeholder="0.0"
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={saving}
            disabled={saving || loading}
            style={styles.submitButton}
          >
            {saving ? 'Saving...' : 'Save All Entries'}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600'
  },
  errorBanner: {
    backgroundColor: '#d32f2f',
    padding: 12,
    margin: 16,
    marginBottom: 0,
    borderRadius: 8
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center'
  },
  card: {
    margin: 16,
    marginBottom: 8
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16
  },
  statBox: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2'
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  inputLabel: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 4,
    color: '#666'
  },
  input: {
    marginBottom: 8
  },
  submitButton: {
    marginTop: 16
  }
});
