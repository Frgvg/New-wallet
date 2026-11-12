import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { createWallet, importWallet } from '../src/lib/wallet';
import { saveWalletAddress } from '../src/lib/db';

const ADDR_KEY = 'wallet.address';

export default function Setup() {
  const [mode, setMode] = useState(null); // 'create' | 'import'
  const [mnemonic, setMnemonic] = useState('');
  const [shownPhrase, setShownPhrase] = useState('');
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = async (address) => {
    await SecureStore.setItemAsync(ADDR_KEY, address);
    await saveWalletAddress(address); // DB gets the PUBLIC address only
    Alert.alert('✅ Done', 'Wallet ready!', [
      { text: 'OK', onPress: () => router.replace('/') },
    ]);
  };

  const doCreate = async () => {
    setBusy(true);
    try {
      const { address, mnemonic: phrase } = await createWallet();
      setShownPhrase(phrase);
      await SecureStore.setItemAsync(ADDR_KEY, address);
      await saveWalletAddress(address);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setBusy(false);
  };

  const confirmWrittenDown = () => {
    Alert.alert(
      'Confirm',
      'Did you write the 12 words on paper? They cannot be recovered if lost.',
      [{ text: 'Yes, saved it', onPress: () => router.replace('/') }]
    );
  };

  const doImport = async () => {
    setBusy(true);
    try {
      const { address } = await importWallet(importText);
      await finish(address);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setBusy(false);
  };

  if (shownPhrase) {
    return (
      <ScrollView style={s.page}>
        <Text style={s.h2}>🔐 Your seed phrase</Text>
        <View style={s.card}>
          <Text style={s.phrase}>{shownPhrase}</Text>
        </View>
        <Text style={s.warn}>
          ⚠️ Write these 12 words on paper and store them safely. Anyone with
          these words controls your funds. They are NOT stored in the database.
        </Text>
        <TouchableOpacity style={s.btn} onPress={confirmWrittenDown}>
          <Text style={s.btnText}>I wrote it down</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={s.page}>
      {!mode && (
        <>
          <TouchableOpacity style={s.btn} onPress={() => setMode('create')}>
            <Text style={s.btnText}>Create new wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnOutline} onPress={() => setMode('import')}>
            <Text style={[s.btnText, { color: '#7ee787' }]}>Import existing wallet</Text>
          </TouchableOpacity>
        </>
      )}

      {mode === 'create' && (
        <TouchableOpacity style={s.btn} disabled={busy} onPress={doCreate}>
          <Text style={s.btnText}>{busy ? 'Generating…' : 'Generate 12-word phrase'}</Text>
        </TouchableOpacity>
      )}

      {mode === 'import' && (
        <>
          <TextInput
            style={s.input}
            placeholder="Enter your 12/24-word seed phrase"
            placeholderTextColor="#8b949e"
            multiline
            value={importText}
            onChangeText={setImportText}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <TouchableOpacity style={s.btn} disabled={busy} onPress={doImport}>
            <Text style={s.btnText}>{busy ? 'Importing…' : 'Import'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0d1117', padding: 16 },
  card: { backgroundColor: '#161b22', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#30363d', marginVertical: 12 },
  phrase: { color: '#e6edf3', fontSize: 18, textAlign: 'center', lineHeight: 30 },
  h2: { color: '#e6edf3', fontSize: 20, fontWeight: '700' },
  warn: { color: '#d29922', fontSize: 13, marginBottom: 16, lineHeight: 20 },
  input: { backgroundColor: '#161b22', color: '#e6edf3', borderWidth: 1, borderColor: '#30363d', borderRadius: 12, padding: 14, minHeight: 100, marginBottom: 16, textAlignVertical: 'top' },
  btn: { backgroundColor: '#238636', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  btnOutline: { borderWidth: 1, borderColor: '#238636', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
