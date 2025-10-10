import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import NutritionScreen from '../screens/nutrition/NutritionScreen';
import MealsScreen from '../screens/nutrition/MealsScreen';
import AddMealScreen from '../screens/nutrition/AddMealScreen';
import DailyEntryScreen from '../screens/nutrition/DailyEntryScreen';
import WeeklyReportScreen from '../screens/nutrition/WeeklyReportScreen';
import MonthlyReportScreen from '../screens/nutrition/MonthlyReportScreen';
import YearlyReportScreen from '../screens/nutrition/YearlyReportScreen';
import GoalsScreen from '../screens/nutrition/GoalsScreen';
import FoodPreferencesScreen from '../screens/nutrition/FoodPreferencesScreen';
import TodoScreen from '../screens/todo/TodoScreen';
import AddEditTaskScreen from '../screens/todo/AddEditTaskScreen';
import TaskDetailScreen from '../screens/todo/TaskDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/account/EditProfileScreen';
import ChangePasswordScreen from '../screens/account/ChangePasswordScreen';
import PreferencesScreen from '../screens/account/PreferencesScreen';
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Nutrition Stack
function NutritionStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="NutritionHome"
        component={NutritionScreen}
        options={{ title: 'Nutrition' }}
      />
      <Stack.Screen name="Meals" component={MealsScreen} />
      <Stack.Screen name="AddMeal" component={AddMealScreen} />
      <Stack.Screen
        name="DailyEntry"
        component={DailyEntryScreen}
        options={{ title: 'Daily Log' }}
      />
      <Stack.Screen
        name="WeeklyReport"
        component={WeeklyReportScreen}
        options={{ title: 'Weekly Report' }}
      />
      <Stack.Screen
        name="MonthlyReport"
        component={MonthlyReportScreen}
        options={{ title: 'Monthly Report' }}
      />
      <Stack.Screen
        name="YearlyReport"
        component={YearlyReportScreen}
        options={{ title: 'Yearly Report' }}
      />
      <Stack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ title: 'Nutrition Goals' }}
      />
    </Stack.Navigator>
  );
}

// Todo Stack
function TodoStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TodoHome"
        component={TodoScreen}
        options={{ title: 'Tasks' }}
      />
      <Stack.Screen
        name="AddTask"
        component={AddEditTaskScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditTask"
        component={AddEditTaskScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Profile Stack
function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change Password' }}
      />
      <Stack.Screen
        name="Preferences"
        component={PreferencesScreen}
        options={{ title: 'Preferences' }}
      />
      <Stack.Screen
        name="FoodPreferences"
        component={FoodPreferencesScreen}
        options={{ title: 'Food Preferences' }}
      />
    </Stack.Navigator>
  );
}

// Main tab navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard: 'view-dashboard',
            Nutrition: 'food-apple',
            Todo: 'checkbox-marked-circle-outline',
            Profile: 'account'
          };
          return (
            <MaterialCommunityIcons
              name={icons[route.name]}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: 'gray',
        headerShown: false
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Nutrition" component={NutritionStack} />
      <Tab.Screen name="Todo" component={TodoStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

// Auth stack
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Root navigator
export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <NavigationContainer>
        <LoadingScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}