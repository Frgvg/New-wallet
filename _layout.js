import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0d1117' },
          headerTintColor: '#e6edf3',
          contentStyle: { backgroundColor: '#0d1117' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'My Wallet' }} />
        <Stack.Screen name="setup" options={{ title: 'Setup' }} />
        <Stack.Screen name="send" options={{ title: 'Send ETH' }} />
        <Stack.Screen name="history" options={{ title: 'History' }} />
      </Stack>
    </>
  );
}
