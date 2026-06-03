import React, { useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";
import {
  addNotificationResponseListener,
  addNotificationReceivedListener,
  clearBadge,
} from "../services/notificationService";

import { useAuth } from "../context/AuthContext";
import { COLORS } from "../constants/theme";

// Auth Screens
import WelcomeScreen from "../screens/Auth/WelcomeScreen";
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import RoleSelectionScreen from "../screens/Auth/RoleSelectionScreen";
import VerifyEmailScreen from "../screens/Auth/VerifyEmailScreen";

// Driver Screens
import DriverHomeScreen from "../screens/Driver/DriverHomeScreen";
import DriverProfileScreen from "../screens/Driver/DriverProfileScreen";
import EditDriverProfileScreen from "../screens/Driver/EditDriverProfileScreen";
import DocumentUploadScreen from "../screens/Driver/DocumentUploadScreen";
import WorkHistoryScreen from "../screens/Driver/WorkHistoryScreen";
import DemandMapScreen from "../screens/Driver/DemandMapScreen";

// Owner Screens
import OwnerHomeScreen from "../screens/Owner/OwnerHomeScreen";
import SearchDriversScreen from "../screens/Owner/SearchDriversScreen";
import DriverDetailsScreen from "../screens/Owner/DriverDetailsScreen";
import SavedDriversScreen from "../screens/Owner/SavedDriversScreen";
import WriteReviewScreen from "../screens/Owner/WriteReviewScreen";
import HireHistoryScreen from "../screens/Owner/HireHistoryScreen";
import AllDriversScreen from "../screens/Owner/AllDriversScreen";
import SendOfferScreen from "../screens/Owner/SendOfferScreen";
import SentOffersScreen from "../screens/Owner/SentOffersScreen";
import MyOffersScreen from "../screens/Driver/MyOffersScreen";
import CreateAgreementScreen from "../screens/Owner/CreateAgreementScreen";
import AgreementsScreen from "../screens/Common/AgreementsScreen";
import AgreementDetailScreen from "../screens/Common/AgreementDetailScreen";

// Chat Screens
import ConversationsScreen from "../screens/Chat/ConversationsScreen";
import ChatScreen from "../screens/Chat/ChatScreen";

// Common Screens
import ProfileSettingsScreen from "../screens/Common/ProfileSettingsScreen";
import NotificationsScreen from "../screens/Common/NotificationsScreen";
import BlockedUsersScreen from "../screens/Common/BlockedUsersScreen";

// Guest Screens
import GuestSignInScreen from "../screens/Guest/GuestSignInScreen";
import GuestDriversScreen from "../screens/Guest/GuestDriversScreen";

// Onboarding Screens
import AgreementGateScreen from "../screens/Onboarding/AgreementGateScreen";

// Job Board Screens
import JobBoardScreen from "../screens/Jobs/JobBoardScreen";
import MyJobPostsScreen from "../screens/Jobs/MyJobPostsScreen";
import CreateJobPostScreen from "../screens/Jobs/CreateJobPostScreen";
import JobPostDetailsScreen from "../screens/Jobs/JobPostDetailsScreen";
import ShortlistedDriversScreen from "../screens/Jobs/ShortlistedDrivers";
import JobStatusDashboard from "../screens/Common/JobStatusScreen";

// Admin Screens
import AdminDashboardScreen from "../screens/Admin/AdminDashboardScreen";
import VerifyDocumentsScreen from "../screens/Admin/VerifyDocumentsScreen";

// New feature screens
import EarningsScreen from "../screens/Common/EarningsScreen";
import DocumentTrackerScreen from "../screens/Driver/DocumentTrackerScreen";
import ExpenseLogScreen from "../screens/Owner/ExpenseLogScreen";

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
        if (route.name === "Home") {
          iconName = focused ? "home" : "home-outline";
        } else if (route.name === "Jobs") {
          iconName = focused ? "briefcase" : "briefcase-outline";
        } else if (route.name === "Profile") {
          iconName = focused ? "person" : "person-outline";
        } else if (route.name === "Messages") {
          iconName = focused ? "chatbubbles" : "chatbubbles-outline";
        } else if (route.name === "Settings") {
          iconName = focused ? "settings" : "settings-outline";
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray[400],
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={DriverHomeScreen} />
    <Tab.Screen name="Jobs" component={JobBoardScreen} />
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
        if (route.name === "Home") {
          iconName = focused ? "home" : "home-outline";
        } else if (route.name === "My Jobs") {
          iconName = focused ? "megaphone" : "megaphone-outline";
        } else if (route.name === "Job Board") {
          iconName = focused ? "briefcase" : "briefcase-outline";
        } else if (route.name === "Messages") {
          iconName = focused ? "chatbubbles" : "chatbubbles-outline";
        } else if (route.name === "Settings") {
          iconName = focused ? "settings" : "settings-outline";
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray[400],
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={OwnerHomeScreen} />
    <Tab.Screen name="My Jobs" component={MyJobPostsScreen} />
    <Tab.Screen name="Job Board" component={JobBoardScreen} />
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
        if (route.name === "Dashboard") {
          iconName = focused ? "grid" : "grid-outline";
        } else if (route.name === "Verify") {
          iconName = focused ? "shield-checkmark" : "shield-checkmark-outline";
        } else if (route.name === "Settings") {
          iconName = focused ? "settings" : "settings-outline";
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

// Guest Tab Navigator (no account — browse only)
const GuestTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === "Drivers") {
          iconName = focused ? "people" : "people-outline";
        } else if (route.name === "Jobs") {
          iconName = focused ? "briefcase" : "briefcase-outline";
        } else if (route.name === "Sign In") {
          iconName = focused ? "log-in" : "log-in-outline";
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray[400],
      headerShown: false,
    })}
  >
    <Tab.Screen name="Drivers" component={GuestDriversScreen} />
    <Tab.Screen name="Jobs" component={JobBoardScreen} />
    <Tab.Screen name="Sign In" component={GuestSignInScreen} />
  </Tab.Navigator>
);

function navigateFromNotification(navigationRef, notification) {
  const data = notification?.request?.content?.data;
  if (!data || !navigationRef?.isReady()) return;
  const { type, conversation_id, job_post_id } = data;
  if (type === 'message' && conversation_id) {
    navigationRef.navigate('Chat', { conversationId: conversation_id });
  } else if (type === 'job_update' && job_post_id) {
    navigationRef.navigate('JobPostDetails', { jobId: job_post_id });
  } else if (type === 'job_update') {
    navigationRef.navigate('JobStatusDashboard');
  } else if (type === 'verification' || type === 'document_expiry' || type === 'document_expired') {
    navigationRef.navigate('DocumentUpload');
  } else if (type === 'hire_offer') {
    navigationRef.navigate('MyOffers');
  } else if (type === 'hire_offer_response') {
    navigationRef.navigate('Notifications');
  } else if (type === 'agreement_signature' || type === 'entry_confirmation') {
    navigationRef.navigate('Agreements');
  } else if (type === 'agreement_signed' || type === 'entry_confirmed') {
    navigationRef.navigate('Agreements');
  } else if (type === 'review' || type === 'engagement') {
    navigationRef.navigate('Notifications');
  } else {
    navigationRef.navigate('Notifications');
  }
}

// Main App Navigator
const AppNavigator = () => {
  const { user, profile, loading, isGuest, termsGateAccepted } = useAuth();
  const navigationRef = useRef(null);

  useEffect(() => {
    // Clear badge when user opens the app
    clearBadge();

    // Handle tapping a notification (app in background or killed)
    const responseSub = addNotificationResponseListener((response) => {
      navigateFromNotification(navigationRef.current, response.notification);
    });

    // Clear badge when a notification arrives while app is in foreground
    const receivedSub = addNotificationReceivedListener(() => {
      clearBadge();
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, []);

  if (loading || termsGateAccepted === null || (user && !profile)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const getMainScreens = () => {
    if (profile?.role === "driver") {
      return <Stack.Screen name="DriverMain" component={DriverTabs} />;
    } else if (profile?.role === "admin") {
      return <Stack.Screen name="AdminMain" component={AdminTabs} />;
    } else {
      return <Stack.Screen name="OwnerMain" component={OwnerTabs} />;
    }
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        {!termsGateAccepted ? (
          <Stack.Screen name="AgreementGate" component={AgreementGateScreen} />
        ) : !user && !isGuest ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : !user && isGuest ? (
          <>
            <Stack.Screen name="GuestMain" component={GuestTabs} />
            {/* Read-only screens guests may open */}
            <Stack.Screen
              name="DriverDetails"
              component={DriverDetailsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="JobPostDetails"
              component={JobPostDetailsScreen}
              options={{ headerShown: true, title: "Job Details" }}
            />
            <Stack.Screen
              name="AllDrivers"
              component={AllDriversScreen}
              options={{ headerShown: true, title: "All Drivers" }}
            />
            <Stack.Screen
              name="Search"
              component={SearchDriversScreen}
              options={{ headerShown: true, title: "Search Drivers" }}
            />
            {/* Auth screens pushable so "Sign in to continue" can navigate */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </>
        ) : (
          <>
            {getMainScreens()}
            {/* Shared Screens */}
            <Stack.Screen
              name="DriverDetails"
              component={DriverDetailsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: true, title: "Chat" }}
            />
            <Stack.Screen
              name="EditDriverProfile"
              component={EditDriverProfileScreen}
              options={{ headerShown: true, title: "Edit Profile" }}
            />
            <Stack.Screen
              name="DocumentUpload"
              component={DocumentUploadScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="WorkHistory"
              component={WorkHistoryScreen}
              options={{ headerShown: true, title: "Work History" }}
            />
            <Stack.Screen
              name="WriteReview"
              component={WriteReviewScreen}
              options={{ headerShown: true, title: "Write Review" }}
            />
            <Stack.Screen
              name="HireHistory"
              component={HireHistoryScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Search"
              component={SearchDriversScreen}
              options={{ headerShown: true, title: "Search Drivers" }}
            />
            <Stack.Screen
              name="AllDrivers"
              component={AllDriversScreen}
              options={{ headerShown: true, title: "All Drivers" }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: true, title: "Notifications" }}
            />
            <Stack.Screen
              name="CreateJobPost"
              component={CreateJobPostScreen}
              options={({ route }) => ({
                headerShown: true,
                title: route.params?.editJob ? "Edit Job" : "Post a Job",
              })}
            />
            <Stack.Screen
              name="JobPostDetails"
              component={JobPostDetailsScreen}
              options={{ headerShown: true, title: "Job Details" }}
            />
              <Stack.Screen
              name="JobStatusDashboard"
              component={JobStatusDashboard}
              options={{ headerShown: true, title: "Job Status Dashboard" }}
            />
            <Stack.Screen
              name="SavedDrivers"
              component={SavedDriversScreen}
              options={{ headerShown: true, title: "Saved Drivers" }}
            />
            <Stack.Screen
              name="ShortlistedDrivers"
              component={ShortlistedDriversScreen}
              options={{ headerShown: true, title: "Shortlisted Drivers" }}
            />
            <Stack.Screen
              name="DemandMap"
              component={DemandMapScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BlockedUsers"
              component={BlockedUsersScreen}
              options={{ headerShown: true, title: "Blocked Users" }}
            />
            <Stack.Screen
              name="SendOffer"
              component={SendOfferScreen}
              options={{ headerShown: true, title: "Send Hire Offer" }}
            />
            <Stack.Screen
              name="SentOffers"
              component={SentOffersScreen}
              options={{ headerShown: true, title: "Sent Offers" }}
            />
            <Stack.Screen
              name="MyOffers"
              component={MyOffersScreen}
              options={{ headerShown: true, title: "Hire Offers" }}
            />
            <Stack.Screen
              name="Agreements"
              component={AgreementsScreen}
              options={{ headerShown: true, title: "Agreements" }}
            />
            <Stack.Screen
              name="AgreementDetail"
              component={AgreementDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateAgreement"
              component={CreateAgreementScreen}
              options={{ headerShown: true, title: "New Agreement" }}
            />
            <Stack.Screen
              name="Earnings"
              component={EarningsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="DocumentTracker"
              component={DocumentTrackerScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ExpenseLog"
              component={ExpenseLogScreen}
              options={{ headerShown: false }}
            />

          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
