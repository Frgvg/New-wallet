# 🪙 Crypto Wallet — Expo + ethers.js + Supabase

A learning prototype of a mobile crypto wallet for **Ethereum Sepolia testnet**,
with a Supabase (Postgres) database for public, non-sensitive data.

> ⚠️ **This is NOT audited custody software.** Do not use real funds with this
> code. It is a learning project — the send flow, key storage and backup UX are
> simplified. Production wallets need security audits, backup flows
> (Shamir/social recovery), transaction previews (EIP-712 / decoding), scam
> detection and much more.

## Architecture & security boundary

```
┌───────────────────────────────┐
│  Mobile app (Expo/React Native)│
│                               │
│  Seed phrase / private key ───┼──► expo-secure-store ONLY
│  (never leaves the device)    │    (iOS Keychain / Android Keystore,
│                               │     hardware-backed, biometric-locked)
│  Signing: ethers.js in-memory │
│  Balance & tx: Sepolia RPC    │
└──────────────┬────────────────┘
               │ HTTPS, anon key + RLS
┌──────────────▼────────────────┐
│  Supabase (Postgres)          │
│  ✅ profile, wallet ADDRESS,   │
│     tx cache, address book    │
│  ❌ NEVER: keys, seeds,        │
│     signatures                │
└───────────────────────────────┘
```

## 1. Prerequisites

- Node.js 20+, npm
- Expo Go app on your phone (App Store / Play Store)
- A free [Supabase](https://supabase.com) account

## 2. Set up the database

1. Create a project at supabase.com
2. Dashboard → **SQL Editor** → paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**
   (creates tables + Row Level Security policies)
3. Optional: Dashboard → Authentication → enable Email sign-in

## 3. Configure the app

```bash
cd crypto-wallet-app
cp .env.example .env
```

Edit `.env`:
- `EXPO_PUBLIC_SUPABASE_URL` → Supabase Dashboard → Project Settings → API
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` → the anon/public key (safe to ship — RLS protects the data)

## 4. Install & run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go. Get test ETH from `faucet.sepolia.dev`
(or the Google Cloud Sepolia faucet) and try sending!

## Project structure

```
crypto-wallet-app/
├── app/                  # Expo Router screens
│   ├── _layout.js        # navigation shell
│   ├── index.js          # home: balance, actions
│   ├── setup.js          # create / import wallet
│   ├── send.js           # sign & broadcast tx
│   └── history.js        # cached tx history
├── src/lib/
│   ├── wallet.js         # ethers v6 + SecureStore (keys NEVER leave here)
│   ├── supabase.js       # DB client
│   └── db.js             # public-data-only DB helpers
└── supabase/schema.sql   # tables + RLS policies
```

## Alternatives considered

| Choice | Picked | Alternatives |
|---|---|---|
| Framework | Expo / React Native | Flutter, native iOS/Android |
| Chain lib | ethers.js v6 | viem, WalletConnect for dApp linking |
| Database | Supabase (Postgres + auth + RLS) | Firebase Firestore, AWS Amplify |
| Chain | Ethereum Sepolia (testnet) | Polygon Amoy, Base Sepolia, Solana devnet |
| Send authorization | Fresh biometric/passcode check per transaction | Cached session unlock (rejected — weaker) |

## Next steps to make it production-shaped

- Biometric gate (`expo-local-authentication`) before any send — **done**: every
  send requires a fresh Face ID / fingerprint / device-passcode confirmation
  (see `src/lib/auth.js`); the gate runs inside `sendTransaction` before any key
  material is read, is never cached, and blocks devices with no auth method
- Backup/recovery flow (multi-share, encrypted cloud backup of the seed)
- ERC-20 token support (`ethers.Contract` + token ABIs)
- Transaction status syncing via a webhook/listener instead of manual cache
- EAS Build for standalone iOS/Android binaries
- Independent security audit before any mainnet use
