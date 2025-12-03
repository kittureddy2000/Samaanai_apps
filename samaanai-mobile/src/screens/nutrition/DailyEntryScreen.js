import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Button, TextInput, ActivityIndicator, Snackbar } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../../services/api';
import { format, subDays, addDays } from 'date-fns';
import VoiceInputButton from '../../components/VoiceInputButton';

export default function DailyEntryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyReport, setDailyReport] = useState(null);
  const [error, setError] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success'); // 'success' or 'error'
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const handleDatePress = () => {
    setShowDatePicker(true);
  };

  const handleDateChange = (event, date) => {
    // On iOS, the picker stays open until dismissed
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
    }
  };

  const handleDatePickerClose = () => {
    setShowDatePicker(false);
  };

  const handleInputChange = (field, value) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVoiceCommand = (parsedCommand, transcript) => {
    if (parsedCommand.type === 'calorie') {
      // Map meal type to form field
      const mealTypeMap = {
        'breakfast': 'breakfast',
        'lunch': 'lunch',
        'dinner': 'dinner',
        'snack': 'snacks',
        'snacks': 'snacks'
      };

      const fieldName = mealTypeMap[parsedCommand.mealType];
      if (fieldName && parsedCommand.calories) {
        setFormValues(prev => ({
          ...prev,
          [fieldName]: parsedCommand.calories.toString()
        }));
      }
    } else if (parsedCommand.type === 'exercise') {
      if (parsedCommand.caloriesBurned) {
        setFormValues(prev => ({
          ...prev,
          exercise: parsedCommand.caloriesBurned.toString()
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

      setSnackbarMessage('Entries saved successfully!');
      setSnackbarType('success');
      setSnackbarVisible(true);
      await fetchDailyReport();

      // Navigate to Dashboard after a short delay to show the snackbar
      setTimeout(() => {
        navigation.navigate('Dashboard');
      }, 1500);
    } catch (err) {
      console.error('Error submitting entries:', err);
      setError('Failed to save entries. Please try again.');
      setSnackbarMessage(err.response?.data?.error || 'Failed to save entries. Please try again.');
      setSnackbarType('error');
      setSnackbarVisible(true);
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
        <TouchableOpacity onPress={handleDatePress} style={styles.dateTouchable}>
          <Text style={styles.dateText}>{format(selectedDate, 'MMM d, yyyy')}</Text>
        </TouchableOpacity>
        <Button mode="outlined" onPress={handleNextDay}>→</Button>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()} // Can't select future dates
          />
          {Platform.OS === 'ios' && (
            <View style={styles.iosPickerButtons}>
              <Button onPress={handleDatePickerClose}>Done</Button>
            </View>
          )}
        </>
      )}

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
          <View style={styles.titleRow}>
            <Title>Log Calories</Title>
            <VoiceInputButton
              onCommandParsed={handleVoiceCommand}
              commandType="all"
            />
          </View>

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

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}
        style={[
          styles.snackbar,
          snackbarType === 'error' ? styles.snackbarError : styles.snackbarSuccess
        ]}
      >
        {snackbarMessage}
      </Snackbar>
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
  dateTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8
  },
  iosPickerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#fff'
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
    margin: 12,
    marginBottom: 6
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12
  },
  statBox: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  inputLabel: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 2,
    color: '#666'
  },
  input: {
    marginBottom: 4,
    height: 45
  },
  submitButton: {
    marginTop: 16
  },
  snackbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000
  },
  snackbarSuccess: {
    backgroundColor: '#4caf50'
  },
  snackbarError: {
    backgroundColor: '#d32f2f'
  }
});
