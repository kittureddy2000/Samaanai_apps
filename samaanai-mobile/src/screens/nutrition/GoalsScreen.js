import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator, HelperText, Surface, SegmentedButtons } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { api } from '../../services/api';
import { colors, spacing } from '../../theme';
import { StatCard } from '../../components/common';

export default function GoalsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  const [formValues, setFormValues] = useState({
    metabolicRate: '',
    weightChangePerWeek: 0,
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

      const metabolicRate = data.profile?.metabolicRate || '';
      const weightLossGoal = data.profile?.weightLossGoal || 0;

      setFormValues({
        metabolicRate: metabolicRate.toString(),
        weightChangePerWeek: weightLossGoal,
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculateNetBMR = () => {
    const bmr = parseFloat(formValues.metabolicRate) || 2000;
    const lbsPerWeek = formValues.weightChangePerWeek;
    const calorieAdjustment = (Math.abs(lbsPerWeek) * 3500) / 7;

    if (lbsPerWeek > 0) {
      return Math.round(bmr - calorieAdjustment);
    } else if (lbsPerWeek < 0) {
      return Math.round(bmr + calorieAdjustment);
    }
    return Math.round(bmr);
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      const metabolicRate = parseInt(formValues.metabolicRate, 10) || 2000;
      const weightLossGoal = formValues.weightChangePerWeek;

      await api.updateProfile({ metabolicRate, weightLossGoal });
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading goals...</Text>
      </View>
    );
  }

  const netBMR = calculateNetBMR();
  const weightChange = formValues.weightChangePerWeek;
  const isLosing = weightChange > 0;
  const isGaining = weightChange < 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Error Banner */}
      {error && (
        <Surface style={styles.errorBanner} elevation={0}>
          <Text style={styles.errorText}>{error}</Text>
        </Surface>
      )}

      {/* Result Card - Prominent at top */}
      <Surface style={styles.resultCard} elevation={2}>
        <Text style={styles.resultLabel}>Your Daily Calorie Target</Text>
        <Text style={[styles.resultValue, { color: colors.primary }]}>{netBMR}</Text>
        <Text style={styles.resultUnit}>calories/day</Text>
        <View style={styles.resultDivider} />
        <Text style={styles.resultExplanation}>
          {isLosing
            ? `${formValues.metabolicRate || 2000} BMR - ${Math.round(Math.abs(weightChange) * 500)} deficit`
            : isGaining
            ? `${formValues.metabolicRate || 2000} BMR + ${Math.round(Math.abs(weightChange) * 500)} surplus`
            : 'Maintenance (BMR only)'}
        </Text>
      </Surface>

      {/* BMR Section */}
      <Surface style={styles.section} elevation={1}>
        <Text style={styles.sectionTitle}>Basal Metabolic Rate (BMR)</Text>
        <Text style={styles.helpText}>
          Calories your body burns at rest. Use 2000 if unknown.
        </Text>
        <TextInput
          mode="outlined"
          label="BMR (calories/day)"
          keyboardType="numeric"
          value={formValues.metabolicRate}
          onChangeText={(value) => handleInputChange('metabolicRate', value)}
          placeholder="2000"
          style={styles.input}
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
        />
      </Surface>

      {/* Weight Goal Section */}
      <Surface style={styles.section} elevation={1}>
        <Text style={styles.sectionTitle}>Weekly Weight Goal</Text>

        {/* Current Goal Display */}
        <View style={styles.goalDisplay}>
          <Text
            style={[
              styles.goalText,
              isLosing && styles.loseText,
              isGaining && styles.gainText,
              !isLosing && !isGaining && styles.maintainText,
            ]}
          >
            {isLosing
              ? `Lose ${Math.abs(weightChange).toFixed(1)} lbs/week`
              : isGaining
              ? `Gain ${Math.abs(weightChange).toFixed(1)} lbs/week`
              : 'Maintain Weight'}
          </Text>
        </View>

        {/* Slider */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderLabels}>
            <Text style={[styles.sliderLabel, styles.gainText]}>Gain</Text>
            <Text style={styles.sliderLabel}>Maintain</Text>
            <Text style={[styles.sliderLabel, styles.loseText]}>Lose</Text>
          </View>

          <Slider
            style={styles.slider}
            minimumValue={-2.5}
            maximumValue={2.5}
            step={0.1}
            value={weightChange}
            onValueChange={(value) => handleInputChange('weightChangePerWeek', value)}
            minimumTrackTintColor={colors.success}
            maximumTrackTintColor={colors.error}
            thumbTintColor={
              isLosing ? colors.error : isGaining ? colors.success : colors.gray500
            }
          />

          <View style={styles.sliderValues}>
            <Text style={styles.sliderValueLabel}>+2.5</Text>
            <Text style={styles.sliderValueLabel}>0</Text>
            <Text style={styles.sliderValueLabel}>-2.5</Text>
          </View>
        </View>

        {/* Quick Presets */}
        <Text style={styles.presetLabel}>Quick Select:</Text>
        <View style={styles.presetButtons}>
          <Button
            mode={weightChange === -1 ? 'contained' : 'outlined'}
            onPress={() => handleInputChange('weightChangePerWeek', -1)}
            compact
            style={styles.presetButton}
            buttonColor={weightChange === -1 ? colors.success : undefined}
            textColor={weightChange === -1 ? colors.white : colors.success}
          >
            +1 lb/wk
          </Button>
          <Button
            mode={weightChange === 0 ? 'contained' : 'outlined'}
            onPress={() => handleInputChange('weightChangePerWeek', 0)}
            compact
            style={styles.presetButton}
            buttonColor={weightChange === 0 ? colors.gray600 : undefined}
          >
            Maintain
          </Button>
          <Button
            mode={weightChange === 1 ? 'contained' : 'outlined'}
            onPress={() => handleInputChange('weightChangePerWeek', 1)}
            compact
            style={styles.presetButton}
            buttonColor={weightChange === 1 ? colors.error : undefined}
            textColor={weightChange === 1 ? colors.white : colors.error}
          >
            -1 lb/wk
          </Button>
        </View>

        <HelperText type="info" style={styles.helperText}>
          Healthy range: 0.5 - 2.0 lbs per week
        </HelperText>
      </Surface>

      {/* Save Button */}
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={saving}
        disabled={saving}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
        buttonColor={colors.primary}
      >
        {saving ? 'Saving...' : 'Save Goals'}
      </Button>

      {/* How It Works */}
      <Surface style={styles.infoCard} elevation={1}>
        <Text style={styles.infoTitle}>How It Works</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>•</Text>
          <Text style={styles.infoText}>
            <Text style={styles.bold}>Net Calories</Text> = Food - Exercise
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>•</Text>
          <Text style={styles.infoText}>Stay under your target to lose weight</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>•</Text>
          <Text style={styles.infoText}>1 lb of body weight ≈ 3,500 calories</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoBullet}>•</Text>
          <Text style={styles.infoText}>500 cal/day deficit = 1 lb/week loss</Text>
        </View>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
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
  errorBanner: {
    backgroundColor: colors.error,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  resultValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  resultUnit: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: -4,
  },
  resultDivider: {
    width: 60,
    height: 2,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  resultExplanation: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.surface,
  },
  goalDisplay: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  goalText: {
    fontSize: 24,
    fontWeight: '700',
  },
  loseText: {
    color: colors.error,
  },
  gainText: {
    color: colors.success,
  },
  maintainText: {
    color: colors.gray600,
  },
  sliderContainer: {
    marginVertical: spacing.sm,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  sliderLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  sliderValueLabel: {
    fontSize: 10,
    color: colors.textHint,
  },
  presetLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetButton: {
    flex: 1,
  },
  helperText: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  submitButton: {
    borderRadius: 12,
    marginVertical: spacing.md,
  },
  submitButtonContent: {
    paddingVertical: spacing.xs,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  infoBullet: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
