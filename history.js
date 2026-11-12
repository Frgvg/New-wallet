import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { getCachedTransactions } from '../src/lib/db';

export default function History() {
  const [txs, setTxs] = useState([]);
  const [address, setAddress] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const addr = await SecureStore.getItemAsync('wallet.address');
    if (!addr) return;
    setAddress(addr);
    const rows = await getCachedTransactions(addr);
    setTxs(rows);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={s.page}>
      <FlatList
        data={txs}
        keyExtractor={(item) => item.tx_hash}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7ee787" />}
        ListEmptyComponent={
          <Text style={s.empty}>No transactions yet. Send some test ETH!</Text>
        }
        renderItem={({ item }) => {
          const isOut = item.direction === 'out';
          const other = isOut ? item.to_address : item.from_address;
          return (
            <View style={s.row}>
              <Text style={[s.arrow, { color: isOut ? '#f85149' : '#7ee787' }]}>
                {isOut ? '↑' : '↓'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={s.addrText}>
                  {isOut ? 'To' : 'From'} {other.slice(0, 6)}…{other.slice(-4)}
                </Text>
                <Text style={s.hash}>{item.tx_hash.slice(0, 18)}…</Text>
              </View>
              <Text style={[s.amount, { color: isOut ? '#f85149' : '#7ee787' }]}>
                {isOut ? '-' : '+'}{Number(item.amount_eth).toFixed(5)} ETH
              </Text>
            </View>
          );
        }}
      />
      <Text style={s.foot}>
        Cached in Supabase for your wallet {address ? `${address.slice(0, 6)}…` : ''} · live data always comes from the chain
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0d1117', padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161b22', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#30363d' },
  arrow: { fontSize: 20, fontWeight: '700', marginRight: 12 },
  addrText: { color: '#e6edf3', fontSize: 14 },
  hash: { color: '#8b949e', fontSize: 11, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700' },
  empty: { color: '#8b949e', textAlign: 'center', marginTop: 40 },
  foot: { color: '#8b949e', fontSize: 11, textAlign: 'center', padding: 8 },
});
