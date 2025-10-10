import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, List, Switch, Divider, Chip } from 'react-native-paper';
import { api } from '../../services/api';

export default function FoodPreferencesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState({
    // Dietary preferences
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    dairyFree: false,
    nutFree: false,

    // Meal tracking preferences
    trackMacros: false,
    trackWater: false,
    trackFiber: false,

    // Goals
    dailyCalorieGoal: 2000,
    weightLossGoal: 0
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.getProfile();
      setProfile(data);

      // Initialize preferences from profile
      if (data.profile) {
        setPreferences(prev => ({
          ...prev,
          dailyCalorieGoal: data.profile.metabolicRate || 2000,
          weightLossGoal: data.profile.weightLossGoal || 0
        }));
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      Alert.alert('Error', 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setPreferences({ ...preferences, [key]: !preferences[key] });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update user profile with nutrition-related preferences
      await api.updateProfile({
        metabolicRate: preferences.dailyCalorieGoal,
        weightLossGoal: preferences.weightLossGoal
      });

      // Save other preferences (you can extend the API to handle these)
      // For now, we'll just save the metabolic rate and weight loss goal

      Alert.alert('Success', 'Food preferences saved successfully');
      navigation.goBack();
    } catch (err) {
      console.error('Save preferences error:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  const activeDietaryPreferences = [
    preferences.vegetarian && 'Vegetarian',
    preferences.vegan && 'Vegan',
    preferences.glutenFree && 'Gluten-Free',
    preferences.dairyFree && 'Dairy-Free',
    preferences.nutFree && 'Nut-Free'
  ].filter(Boolean);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Food Preferences</Text>

          {activeDietaryPreferences.length > 0 && (
            <View style={styles.chipsContainer}>
              {activeDietaryPreferences.map((pref, index) => (
                <Chip key={index} style={styles.chip} mode="flat" selected>
                  {pref}
                </Chip>
              ))}
            </View>
          )}
        </Card.Content>

        <List.Section>
          <List.Subheader>Dietary Restrictions</List.Subheader>
          <Divider />
          <List.Item
            title="Vegetarian"
            description="No meat or fish"
            left={props => <List.Icon {...props} icon="leaf" />}
            right={() => (
              <Switch
                value={preferences.vegetarian}
                onValueChange={() => handleToggle('vegetarian')}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Vegan"
            description="No animal products"
            left={props => <List.Icon {...props} icon="sprout" />}
            right={() => (
              <Switch
                value={preferences.vegan}
                onValueChange={() => handleToggle('vegan')}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Gluten-Free"
            description="No wheat, barley, or rye"
            left={props => <List.Icon {...props} icon="barley-off" />}
            right={() => (
              <Switch
                value={preferences.glutenFree}
                onValueChange={() => handleToggle('glutenFree')}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Dairy-Free"
            description="No milk or dairy products"
            left={props => <List.Icon {...props} icon="cow-off" />}
            right={() => (
              <Switch
                value={preferences.dairyFree}
                onValueChange={() => handleToggle('dairyFree')}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Nut-Free"
            description="No tree nuts or peanuts"
            left={props => <List.Icon {...props} icon="peanut-off" />}
            right={() => (
              <Switch
                value={preferences.nutFree}
                onValueChange={() => handleToggle('nutFree')}
              />
            )}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Tracking Preferences</List.Subheader>
          <Divider />
          <List.Item
            title="Track Macros"
            description="Track protein, carbs, and fat"
            left={props => <List.Icon {...props} icon="chart-pie" />}
            right={() => (
              <Switch
                value={preferences.trackMacros}
                onValueChange={() => handleToggle('trackMacros')}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Track Water Intake"
            description="Monitor daily water consumption"
            left={props => <List.Icon {...props} icon="water" />}
            right={() => (
              <Switch
                value={preferences.trackWater}
                onValueChange={() => handleToggle('trackWater')}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Track Fiber"
            description="Monitor daily fiber intake"
            left={props => <List.Icon {...props} icon="nutrition" />}
            right={() => (
              <Switch
                value={preferences.trackFiber}
                onValueChange={() => handleToggle('trackFiber')}
              />
            )}
          />
        </List.Section>

        <Card.Content>
          <Text style={styles.sectionTitle}>Daily Goals</Text>

          <Text style={styles.inputLabel}>Daily Calorie Goal</Text>
          <View style={styles.goalRow}>
            <Button
              mode="outlined"
              onPress={() => setPreferences({ ...preferences, dailyCalorieGoal: Math.max(1200, preferences.dailyCalorieGoal - 100) })}
              compact
            >
              -
            </Button>
            <Text style={styles.goalValue}>{preferences.dailyCalorieGoal} cal</Text>
            <Button
              mode="outlined"
              onPress={() => setPreferences({ ...preferences, dailyCalorieGoal: Math.min(5000, preferences.dailyCalorieGoal + 100) })}
              compact
            >
              +
            </Button>
          </View>

          <Text style={styles.inputLabel}>Weekly Weight Loss Goal (kg)</Text>
          <View style={styles.goalRow}>
            <Button
              mode="outlined"
              onPress={() => setPreferences({ ...preferences, weightLossGoal: Math.max(-2, preferences.weightLossGoal - 0.1) })}
              compact
            >
              -
            </Button>
            <Text style={styles.goalValue}>{preferences.weightLossGoal.toFixed(1)} kg</Text>
            <Button
              mode="outlined"
              onPress={() => setPreferences({ ...preferences, weightLossGoal: Math.min(2, preferences.weightLossGoal + 0.1) })}
              compact
            >
              +
            </Button>
          </View>
          <Text style={styles.helperText}>
            Negative values indicate weight gain goals
          </Text>

          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.submitButton}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            disabled={saving}
            style={styles.cancelButton}
          >
            Cancel
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
  card: {
    margin: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  chip: {
    marginRight: 8,
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 16,
    color: '#333'
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    marginTop: 16
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  goalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
    minWidth: 120,
    textAlign: 'center'
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 8
  },
  cancelButton: {
    marginTop: 8,
    marginBottom: 16
  }
});
