import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Card, Title, Button, TextInput, ActivityIndicator, HelperText, IconButton } from 'react-native-paper';
import { api } from '../../services/api';

export default function GoalsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  const [formValues, setFormValues] = useState({
    metabolicRate: '',
    weightChangePerWeek: 0 // Negative = gain, 0 = maintain, Positive = lose
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.getProfile();
      setProfile(data);

      // Populate form
      const metabolicRate = data.profile?.metabolicRate || '';
      const weightLossGoal = data.profile?.weightLossGoal || 0;

      // Convert weightLossGoal to weightChangePerWeek
      // Positive weightLossGoal = losing weight (slider right)
      // Negative weightLossGoal = gaining weight (slider left)
      setFormValues({
        metabolicRate: metabolicRate.toString(),
        weightChangePerWeek: weightLossGoal
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateNetBMR = () => {
    const bmr = parseFloat(formValues.metabolicRate) || 2000;
    const lbsPerWeek = formValues.weightChangePerWeek;

    // Positive lbsPerWeek = losing weight (subtract calories)
    // Negative lbsPerWeek = gaining weight (add calories)
    const calorieAdjustment = (Math.abs(lbsPerWeek) * 3500) / 7;

    if (lbsPerWeek > 0) {
      // Losing weight
      return Math.round(bmr - calorieAdjustment);
    } else if (lbsPerWeek < 0) {
      // Gaining weight
      return Math.round(bmr + calorieAdjustment);
    }
    // Maintaining
    return Math.round(bmr);
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      const metabolicRate = parseInt(formValues.metabolicRate, 10) || 2000;
      const weightLossGoal = formValues.weightChangePerWeek; // Already in correct format

      const profileData = {
        metabolicRate,
        weightLossGoal
      };

      await api.updateProfile(profileData);
      Alert.alert('Success', 'Goals updated successfully!');
      await fetchProfile();
    } catch (err) {
      console.error('Error updating goals:', err);
      setError(err.response?.data?.error || 'Failed to update goals');
      Alert.alert('Error', err.response?.data?.error || 'Failed to update goals');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading goals...</Text>
      </View>
    );
  }

  const netBMR = calculateNetBMR();

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.navigate('NutritionHome')}
          style={styles.backButton}
        />
        <Text style={styles.headerTitle}>Nutrition Goals</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Set Your Goals</Title>
            <Text style={styles.subtitle}>Configure your daily calorie targets</Text>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basal Metabolic Rate (BMR)</Text>
            <Text style={styles.helpText}>
              Your BMR is the number of calories your body burns at rest.
              If you don't know it, use 2000 as a default.
            </Text>
            <TextInput
              mode="outlined"
              label="BMR (calories/day)"
              keyboardType="numeric"
              value={formValues.metabolicRate}
              onChangeText={(value) => handleInputChange('metabolicRate', value)}
              placeholder="2000"
              style={styles.input}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weight Goal</Text>
            <Text style={styles.helpText}>
              Slide right to lose weight, left to gain weight
            </Text>

            {/* Visual Slider */}
            <View style={styles.sliderContainer}>
              <View style={styles.sliderLabels}>
                <Text style={[styles.sliderLabel, styles.gainText]}>← Gain Weight</Text>
                <Text style={styles.sliderLabel}>Maintain</Text>
                <Text style={[styles.sliderLabel, styles.loseText]}>Lose Weight →</Text>
              </View>

              {/* Visual Slider Bar */}
              <View style={styles.sliderTrack}>
                <View style={styles.sliderFill} />
                {/* Position indicator */}
                <View style={[
                  styles.sliderThumb,
                  {
                    left: `${((formValues.weightChangePerWeek + 2.5) / 5) * 100}%`,
                    backgroundColor: formValues.weightChangePerWeek > 0
                      ? '#f44336'
                      : formValues.weightChangePerWeek < 0
                      ? '#4caf50'
                      : '#757575'
                  }
                ]} />
              </View>

              {/* Adjustment Buttons */}
              <View style={styles.sliderControls}>
                <Button
                  mode="outlined"
                  onPress={() => handleInputChange('weightChangePerWeek', Math.max(-2.5, formValues.weightChangePerWeek - 0.1))}
                  icon="minus"
                  compact
                  style={styles.controlButton}
                >
                  -0.1
                </Button>
                <View style={styles.sliderValueContainer}>
                  {formValues.weightChangePerWeek === 0 ? (
                    <Text style={styles.sliderValueText}>
                      Maintain Weight
                    </Text>
                  ) : (
                    <Text style={[
                      styles.sliderValueText,
                      formValues.weightChangePerWeek > 0 ? styles.loseText : styles.gainText
                    ]}>
                      {formValues.weightChangePerWeek > 0 ? 'Lose' : 'Gain'} {Math.abs(formValues.weightChangePerWeek).toFixed(1)} lbs/week
                    </Text>
                  )}
                </View>
                <Button
                  mode="outlined"
                  onPress={() => handleInputChange('weightChangePerWeek', Math.min(2.5, formValues.weightChangePerWeek + 0.1))}
                  icon="plus"
                  compact
                  style={styles.controlButton}
                >
                  +0.1
                </Button>
              </View>

              {/* Quick Presets */}
              <View style={styles.presetButtons}>
                <Button
                  mode={formValues.weightChangePerWeek === -1 ? 'contained' : 'outlined'}
                  onPress={() => handleInputChange('weightChangePerWeek', -1)}
                  compact
                  style={styles.presetButton}
                  buttonColor={formValues.weightChangePerWeek === -1 ? '#4caf50' : undefined}
                >
                  Gain 1 lb/wk
                </Button>
                <Button
                  mode={formValues.weightChangePerWeek === 0 ? 'contained' : 'outlined'}
                  onPress={() => handleInputChange('weightChangePerWeek', 0)}
                  compact
                  style={styles.presetButton}
                >
                  Maintain
                </Button>
                <Button
                  mode={formValues.weightChangePerWeek === 1 ? 'contained' : 'outlined'}
                  onPress={() => handleInputChange('weightChangePerWeek', 1)}
                  compact
                  style={styles.presetButton}
                  buttonColor={formValues.weightChangePerWeek === 1 ? '#f44336' : undefined}
                >
                  Lose 1 lb/wk
                </Button>
              </View>

              <HelperText type="info">
                Recommended: 0.5 - 2.0 lbs per week for healthy weight change
              </HelperText>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Your Daily Calorie Target:</Text>
              <Text style={styles.resultValue}>{netBMR} calories</Text>
              <Text style={styles.resultExplanation}>
                {formValues.weightChangePerWeek > 0
                  ? `This is ${formValues.metabolicRate || 2000} BMR - ${Math.round(Math.abs(formValues.weightChangePerWeek) * 500)} calorie deficit`
                  : formValues.weightChangePerWeek < 0
                  ? `This is ${formValues.metabolicRate || 2000} BMR + ${Math.round(Math.abs(formValues.weightChangePerWeek) * 500)} calorie surplus`
                  : `This is your BMR (maintenance)`}
              </Text>
            </View>
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={saving}
            disabled={saving}
            style={styles.submitButton}
          >
            {saving ? 'Saving...' : 'Save Goals'}
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>How It Works</Title>
          <Text style={styles.explanationText}>
            • Your <Text style={styles.bold}>Net Calories</Text> = BMR + Exercise - Food Calories
          </Text>
          <Text style={styles.explanationText}>
            • Positive net calories means you have calories remaining
          </Text>
          <Text style={styles.explanationText}>
            • Negative net calories means you're over your target
          </Text>
          <Text style={styles.explanationText}>
            • 1 lb of weight = 3500 calories
          </Text>
        </Card.Content>
      </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  backButton: {
    margin: 0
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginRight: 40 // Balance for back button
  },
  headerSpacer: {
    width: 40
  },
  scrollContent: {
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
  card: {
    margin: 16,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  errorBanner: {
    backgroundColor: '#d32f2f',
    padding: 12,
    marginVertical: 12,
    borderRadius: 8
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center'
  },
  section: {
    marginVertical: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18
  },
  input: {
    marginBottom: 8
  },
  sliderContainer: {
    marginVertical: 16
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500'
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginVertical: 16,
    position: 'relative'
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4
  },
  sliderThumb: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  sliderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16
  },
  controlButton: {
    minWidth: 80
  },
  sliderValueContainer: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8
  },
  sliderValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12
  },
  presetButton: {
    flex: 1
  },
  loseText: {
    color: '#f44336'
  },
  gainText: {
    color: '#4caf50'
  },
  resultBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  resultValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8
  },
  resultExplanation: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  submitButton: {
    marginTop: 16
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 6,
    lineHeight: 20
  },
  bold: {
    fontWeight: '600',
    color: '#333'
  }
});
