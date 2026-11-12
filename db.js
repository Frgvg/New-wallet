/**
 * DB helpers — Supabase. ONLY public, non-sensitive data here:
 * wallet address, cached transactions, address book.
 * The seed phrase / private key NEVER touches these functions.
 */

import { supabase } from './supabase';

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

/** Save the wallet's PUBLIC address (never the key). */
export async function saveWalletAddress(address, label = 'Main Wallet') {
  const user = await getCurrentUser();
  if (!user) return; // wallet works without DB too
  const { error } = await supabase.from('wallets').upsert({
    user_id: user.id,
    address,
    label,
    chain: 'sepolia',
  });
  if (error) console.warn('saveWalletAddress:', error.message);
}

export async function getWalletAddresses() {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return [];
  return data;
}

/** Cache a transaction for instant history display. */
export async function cacheTransaction(tx) {
  const { error } = await supabase.from('transactions').upsert(tx, {
    onConflict: 'wallet_address,tx_hash',
  });
  if (error) console.warn('cacheTransaction:', error.message);
}

export async function getCachedTransactions(walletAddress) {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function addContact(label, address) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Sign in first');
  const { error } = await supabase
    .from('address_book')
    .insert({ user_id: user.id, label, address });
  if (error) throw error;
}

export async function getContacts() {
  const { data } = await supabase
    .from('address_book')
    .select('*')
    .order('created_at', { ascending: false });
  return data ?? [];
}
