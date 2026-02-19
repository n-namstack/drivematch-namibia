import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';

// Auth Screens
import WelcomeScreen from '../screens/Auth/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import RoleSelectionScreen from '../screens/Auth/RoleSelectionScreen';
import VerifyEmailScreen from '../screens/Auth/VerifyEmailScreen';

// Driver Screens
import DriverHomeScreen from '../screens/Driver/DriverHomeScreen';
import DriverProfileScreen from '../screens/Driver/DriverProfileScreen';
import EditDriverProfileScreen from '../screens/Driver/EditDriverProfileScreen';
import DocumentUploadScreen from '../screens/Driver/DocumentUploadScreen';
import WorkHistoryScreen from '../screens/Driver/WorkHistoryScreen';

// Owner Screens
import OwnerHomeScreen from '../screens/Owner/OwnerHomeScreen';
import SearchDriversScreen from '../screens/Owner/SearchDriversScreen';
import DriverDetailsScreen from '../screens/Owner/DriverDetailsScreen';
import SavedDriversScreen from '../screens/Owner/SavedDriversScreen';
import WriteReviewScreen from '../screens/Owner/WriteReviewScreen';
import HireHistoryScreen from '../screens/Owner/HireHistoryScreen';
import AllDriversScreen from '../screens/Owner/AllDriversScreen';

// Chat Screens
import ConversationsScreen from '../screens/Chat/ConversationsScreen';
import ChatScreen from '../screens/Chat/ChatScreen';

// Common Screens
import ProfileSettingsScreen from '../screens/Common/ProfileSettingsScreen';
import NotificationsScreen from '../screens/Common/NotificationsScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';
import VerifyDocumentsScreen from '../screens/Admin/VerifyDocumentsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack Navigator
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
    <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
  </Stack.Navigator>
);

// Driver Tab Navigator
const DriverTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        } else if (route.name === 'Messages') {
          iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
        } else if (route.name === 'Settings') {
          iconName = focused ? 'settings' : 'settings-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray[400],
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={DriverHomeScreen} />
    <Tab.Screen name="Profile" component={DriverProfileScreen} />
    <Tab.Screen name="Messages" component={ConversationsScreen} />
    <Tab.Screen name="Settings" component={ProfileSettingsScreen} />
  </Tab.Navigator>
);

// Owner Tab Navigator
const OwnerTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Search') {
          iconName = focused ? 'search' : 'search-outline';
        } else if (route.name === 'Saved') {
          iconName = focused ? 'heart' : 'heart-outline';
        } else if (route.name === 'Messages') {
          iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
        } else if (route.name === 'Settings') {
          iconName = focused ? 'settings' : 'settings-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray[400],
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={OwnerHomeScreen} />
    <Tab.Screen name="Search" component={SearchDriversScreen} />
    <Tab.Screen name="Saved" component={SavedDriversScreen} />
    <Tab.Screen name="Messages" component={ConversationsScreen} />
    <Tab.Screen name="Settings" component={ProfileSettingsScreen} />
  </Tab.Navigator>
);

// Admin Tab Navigator
const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Dashboard') {
          iconName = focused ? 'grid' : 'grid-outline';
        } else if (route.name === 'Verify') {
          iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
        } else if (route.name === 'Settings') {
          iconName = focused ? 'settings' : 'settings-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray[400],
      headerShown: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
    <Tab.Screen name="Verify" component={VerifyDocumentsScreen} />
    <Tab.Screen name="Settings" component={ProfileSettingsScreen} />
  </Tab.Navigator>
);

// Main App Navigator
const AppNavigator = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const getMainScreens = () => {
    if (profile?.role === 'driver') {
      return <Stack.Screen name="DriverMain" component={DriverTabs} />;
    } else if (profile?.role === 'admin') {
      return <Stack.Screen name="AdminMain" component={AdminTabs} />;
    } else {
      return <Stack.Screen name="OwnerMain" component={OwnerTabs} />;
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!user ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <>
            {getMainScreens()}
            {/* Shared Screens */}
            <Stack.Screen
              name="DriverDetails"
              component={DriverDetailsScreen}
              options={{ headerShown: true, title: 'Driver Profile' }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: true, title: 'Chat' }}
            />
            <Stack.Screen
              name="EditDriverProfile"
              component={EditDriverProfileScreen}
              options={{ headerShown: true, title: 'Edit Profile' }}
            />
            <Stack.Screen
              name="DocumentUpload"
              component={DocumentUploadScreen}
              options={{ headerShown: true, title: 'Upload Documents' }}
            />
            <Stack.Screen
              name="WorkHistory"
              component={WorkHistoryScreen}
              options={{ headerShown: true, title: 'Work History' }}
            />
            <Stack.Screen
              name="WriteReview"
              component={WriteReviewScreen}
              options={{ headerShown: true, title: 'Write Review' }}
            />
            <Stack.Screen
              name="HireHistory"
              component={HireHistoryScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AllDrivers"
              component={AllDriversScreen}
              options={{ headerShown: true, title: 'All Drivers' }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: true, title: 'Notifications' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
