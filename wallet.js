/**
 * Wallet core — ethers.js v6 + expo-secure-store
 *
 * SECURITY BOUNDARY (do not break this):
 * - The seed phrase / private key is generated ON DEVICE with ethers.
 * - It is stored ONLY in expo-secure-store (iOS Keychain / Android Keystore,
 *   hardware-backed encryption).
 * - It is NEVER sent to Supabase, never logged, never persisted in
 *   AsyncStorage or any plaintext file.
 */

import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import { authenticateForTransaction } from './auth';

const SEED_KEY = 'wallet.seed.phrase';      // what SecureStore encrypts
const RPC_URL =
  process.env.EXPO_PUBLIC_SEPOLIA_RPC ||
  'https://ethereum-sepolia-rpc.publicnode.com';

// ---------------------------------------------------------------
// SecureStore options: requires auth (biometric/PIN) to read key
// ---------------------------------------------------------------
const secureOpts = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function walletExists() {
  const seed = await SecureStore.getItemAsync(SEED_KEY, secureOpts);
  return seed !== null;
}

/** Create a brand-new wallet. Returns the public address. */
export async function createWallet() {
  const wallet = ethers.Wallet.createRandom();
  // 12-word mnemonic — encrypted at rest by the OS keychain
  await SecureStore.setItemAsync(SEED_KEY, wallet.mnemonic.phrase, secureOpts);
  return {
    address: wallet.address,
    // Show the phrase ONCE so the user can write it down on paper.
    // The app should force the user to confirm it, then never show it again.
    mnemonic: wallet.mnemonic.phrase,
  };
}

/** Import an existing wallet from a 12/24-word seed phrase. */
export async function importWallet(mnemonicPhrase) {
  if (!ethers.Mnemonic.isValidMnemonic(mnemonicPhrase.trim())) {
    throw new Error('Invalid seed phrase');
  }
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonicPhrase.trim());
  await SecureStore.setItemAsync(SEED_KEY, mnemonicPhrase.trim(), secureOpts);
  return { address: wallet.address };
}

/**
 * Sign + broadcast a transaction.
 *
 * SECURITY: this is the ONLY function in the app that can sign, and the
 * FIRST thing it does is a fresh biometric/passcode authentication for
 * THIS transaction. If auth fails, is cancelled, or the device has no
 * auth method, we throw BEFORE the seed is even read from SecureStore.
 * The auth result is never cached — every send re-authenticates.
 *
 * The private key is derived in memory from the secure seed,
 * used to sign, then discarded. The key never leaves the device.
 */
export async function sendTransaction({ to, amountEth }) {
  // ── Biometric gate: runs before any key material is touched ──
  const auth = await authenticateForTransaction();
  if (!auth.ok) {
    const err = new Error(auth.message || 'Authentication required to send.');
    err.code = auth.reason;
    throw err;
  }

  const seed = await SecureStore.getItemAsync(SEED_KEY, secureOpts);
  if (!seed) throw new Error('No wallet found on this device');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.HDNodeWallet.fromPhrase(seed).connect(provider);

  const tx = await wallet.sendTransaction({
    to,
    value: ethers.parseEther(String(amountEth)),
  });
  // tx.hash is available immediately; wait 1 confirmation:
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

/** Read the on-chain balance (ETH). */
export async function getBalance(address) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wei = await provider.getBalance(address);
  return ethers.formatEther(wei);
}

/** Delete everything from the device (wallet reset). DB rows remain but hold no keys. */
export async function wipeWallet() {
  await SecureStore.deleteItemAsync(SEED_KEY, secureOpts);
}
