/**
 * Biometric gate — expo-local-authentication
 *
 * Used to authorize sensitive operations (sending a transaction).
 * Rules enforced here:
 *  - A FRESH check runs on EVERY call. The result is never cached,
 *    never exposed as a reusable "is authenticated" flag.
 *  - Biometrics preferred (fingerprint / Face ID / iris).
 *  - If biometrics exist but aren't enrolled, or after failed
 *    attempts, the OS falls back to the device passcode/PIN —
 *    auth is never silently skipped.
 *  - If the device has NO auth method at all, the send is BLOCKED.
 */

import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticateForTransaction() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const level = await LocalAuthentication.getEnrolledLevelAsync();

  // Device has no way to authenticate at all → hard block.
  if (
    level === LocalAuthentication.SecurityLevel.NONE ||
    (!hasHardware && !enrolled)
  ) {
    return {
      ok: false,
      reason: 'no_auth_method',
      message:
        'This device has no screen lock or biometric auth set up. ' +
        'Set a PIN / passcode (and enroll biometrics) before sending.',
    };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirm transaction',
    cancelLabel: 'Cancel',
    // After repeated biometric failures, fall back to device passcode
    // rather than failing open. Auth is never skipped silently.
    disableDeviceFallback: false,
    promptSubtitle: 'Sign & broadcast your ETH transaction',
  });

  if (result.success) {
    return { ok: true };
  }

  // Map error codes to user-friendly reasons. Every failure aborts the send.
  const messages = {
    user_cancel: 'You cancelled the authentication prompt.',
    user_fallback: 'Authentication cancelled.',
    system_cancel: 'Authentication was cancelled by the system.',
    app_cancel: 'Authentication was cancelled by the app.',
    timeout: 'Authentication timed out. Try again.',
    lockout: 'Too many failed attempts. Authentication is locked — unlock your device and retry.',
    not_enrolled: 'No biometrics enrolled on this device. Use your device passcode.',
    not_available: 'Biometric auth is not available right now.',
    passcode_not_set: 'No device passcode is set. Set one in system settings.',
    authentication_failed: 'Authentication failed. Transaction cancelled.',
  };
  return {
    ok: false,
    reason: result.error ?? 'unknown',
    message: messages[result.error] ?? 'Authentication failed. Transaction cancelled.',
  };
}
