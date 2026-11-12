import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { sendTransaction } from '../src/lib/wallet';
import { cacheTransaction } from '../src/lib/db';

export default function Send() {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const doSend = async () => {
    if (!to.startsWith('0x') || to.length < 42) {
      Alert.alert('Invalid address', 'Check the recipient address.');
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }
    setBusy(true);
    try {
      const { hash, receipt } = await sendTransaction({ to, amountEth: amt });
      const from = (await SecureStore.getItemAsync('wallet.address')) || '';
      await cacheTransaction({
        wallet_address: from,
        tx_hash: hash,
        direction: 'out',
        from_address: from,
        to_address: to,
        amount_eth: amt,
        status: receipt?.status === 1 ? 'confirmed' : 'failed',
        block_number: receipt?.blockNumber ?? null,
      });
      setResult(hash);
    } catch (e) {
      Alert.alert('Transaction failed', e.message);
    }
    setBusy(false);
  };

  if (result) {
    return (
      <View style={s.center}>
        <Text style={s.h2}>✅ Sent!</Text>
        <Text style={s.hash}>{result}</Text>
        <TouchableOpacity style={s.btn} onPress={() => router.replace('/')}>
          <Text style={s.btnText}>Back to wallet</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={s.page}>
      <Text style={s.label}>Recipient address (0x…)</Text>
      <TextInput
        style={s.input}
        value={to}
        onChangeText={setTo}
        placeholder="0x1234…"
        placeholderTextColor="#8b949e"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={s.label}>Amount (ETH)</Text>
      <TextInput
        style={s.input}
        value={amount}
        onChangeText={setAmount}
        placeholder="0.01"
        placeholderTextColor="#8b949e"
        keyboardType="decimal-pad"
      />
      <Text style={s.warn}>
        🧪 Sepolia testnet — use test ETH only (faucet.sepolia.dev).{'\n'}
        Double-check the address: blockchain transactions are irreversible.
      </Text>
      <TouchableOpacity style={s.btn} disabled={busy} onPress={doSend}>
        {busy
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>Sign & Send (biometric/PIN prompt will appear)</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0d1117', alignItems: 'center', justifyContent: 'center', padding: 24 },
  page: { flex: 1, backgroundColor: '#0d1117', padding: 16 },
  label: { color: '#8b949e', fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: '#161b22', color: '#e6edf3', borderWidth: 1, borderColor: '#30363d', borderRadius: 12, padding: 14, marginBottom: 16 },
  warn: { color: '#d29922', fontSize: 13, marginBottom: 16, lineHeight: 20 },
  h2: { color: '#e6edf3', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  hash: { color: '#8b949e', fontSize: 12, marginBottom: 24, textAlign: 'center' },
  btn: { backgroundColor: '#238636', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
