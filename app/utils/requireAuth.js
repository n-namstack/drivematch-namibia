import { Alert } from 'react-native';

/**
 * Gate an account-based action behind sign-in.
 * Returns true if a user is present; otherwise prompts the guest to sign in
 * and returns false so the caller can bail out.
 */
export const requireAuth = (user, navigation, message = 'Sign in to continue.') => {
  if (user) return true;
  Alert.alert('Sign in required', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign In', onPress: () => navigation.navigate('Login') },
  ]);
  return false;
};
