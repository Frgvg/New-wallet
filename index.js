import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, RefreshControl,
  ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { walletExists, getBalance, wipeWallet } from '../src/lib/wallet';
import { saveWalletAddress } from '../src/lib/db';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);
  const [balance, setBalance] = useState(null);
  const [address, setAddress] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const exists = await walletExists();
    setHasWallet(exists);
    if (exists) {
      try {
        const addr = await getAddress();
        setAddress(addr);
        const bal = await getBalance(addr);
        setBalance(bal);
        await saveWalletAddress(address); // sync public address to DB
      } catch (e) {
        Alert.alert('RPC error', e.message);
      }
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => { load(); }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#7ee787" />
      </View>
    );
  }

  if (!hasWallet) {
    return (
      <View style={s.center}>
        <Text style={s.h1}>👋 Welcome</Text>
        <Text style={s.p}>You don't have a wallet on this device yet.</Text>
        <TouchableOpacity style={s.btn} onPress={() => router.push('/setup')}>
          <Text style={s.btnText}>Create / Import wallet</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7ee787" />}
    >
      <View style={s.card}>
        <Text style={s.label}>Balance (Sepolia ETH)</Text>
        <Text style={s.balance}>{balance ? Number(balance).toFixed(6) : '…'}</Text>
        <Text style={s.addr}>Address: {shortAddr(address)}</Text>
      </View>

      <TouchableOpacity style={s.btn} onPress={() => router.push('/send')}>
        <Text style={s.btnText}>Send ETH</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnOutline} onPress={() => router.push('/history')}>
        <Text style={[s.btnText, { color: '#7ee787' }]}>History</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            'Reset wallet?',
            'This deletes the seed phrase from this device. Write it down first!',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: wipeWallet },
            ]
          )
        }
      >
        <Text style={s.danger}>Reset wallet (wipe device data)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

import * as SecureStore from 'expo-secure-store';
const ADDR_KEY = 'wallet.address';
async function getAddress() {
  return SecureStore.getItemAsync(ADDR_KEY);
}
function shortAddr(a) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '…';
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0d1117', alignItems: 'center', justifyContent: 'center', padding: 24 },
  page: { flex: 1, backgroundColor: '#0d1117', padding: 16 },
  card: { backgroundColor: '#161b22', borderRadius: 16, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#30363d' },
  label: { color: '#8b949e', fontSize: 13 },
  balance: { color: '#7ee787', fontSize: 40, fontWeight: '700', marginTop: 8 },
  addr: { color: '#8b949e', fontSize: 12, marginTop: 8 },
  h1: { color: '#e6edf3', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  p: { color: '#8b949e', marginBottom: 24, textAlign: 'center' },
  btn: { backgroundColor: '#238636', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#238636', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  danger: { color: '#f85149', textAlign: 'center', marginTop: 16, fontSize: 13 },
});
