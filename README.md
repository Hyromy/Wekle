# Wekle

Decentralized agenda built on **Solana (Devnet)** that allows managing multiple calendars and events directly on the blockchain using PDA (*Program Derived Addresses*) accounts.

## Features

- **Full on-chain CRUD:** Create, update, and delete calendars and events with date validation and length limits enforced in the smart contract.
- **Rent recovery (SOL):** Deleting events or calendars closes their PDA accounts (`close = authority`), refunding the deposited lamports back to the author's wallet. Deleting a calendar bundles instructions to close all of its associated events into a single transaction.
- **Public read-only mode:** Browse calendars and events deployed on Devnet without needing to connect a wallet.
- **Transaction history & inspector:** Logs operations performed during the session and provides a signature inspector to verify instructions and on-chain logs directly from the network.

## Architecture & Stack

- **Smart Contract (`backend/`):** Rust + Anchor Framework deployed on Solana Devnet.
  - **Program ID:** [`28ckb9primXrZtbGpM2umYscwGskZGEmPnhKAfmuHW32`](https://explorer.solana.com/address/28ckb9primXrZtbGpM2umYscwGskZGEmPnhKAfmuHW32?cluster=devnet)
  - **`Calendar` PDA:** seeds `["calendar", authority, id]`
  - **`Event` PDA:** seeds `["event", calendar, id]`
- **Frontend (`frontend/`):** React 19, TypeScript, Vite, `@coral-xyz/anchor`, `@solana/web3.js`, and Solana Wallet Adapter (Solflare).

## Repository Structure

```text
wekle/
├── backend/          # Rust / Anchor smart contract
│   └── programs/
│       └── backend/
│           └── src/
│               ├── instructions/   # Calendar and event CRUD logic
│               ├── constants.rs    # PDA seeds
│               ├── error.rs        # Custom error codes
│               ├── state.rs        # Calendar and Event account models
│               └── lib.rs          # Program entrypoints
└── frontend/         # React + TypeScript web application
    └── src/
        ├── hooks/    # useAgenda hook (Anchor connection, CRUD, and inspector)
        └── idl/      # Anchor-generated IDL and TypeScript types
```

## Local Setup
### Prerequisites
- Node.js (v20+) and pnpm
- Solflare browser extension set to Devnet (with test SOL to sign transactions)

1. Run the frontend
   
   The smart contract is already deployed on Devnet, so you can test the application right away by running the web client:

   ```sh
   cd frontend
   pnpm install
   pnpm dev
   ```

   Open the local URL shown by Vite (default `http://localhost:5173`).

2. Build or deploy the contract (optional)
   
   If you want to compile the program from scratch, make sure you have Rust, Solana CLI, and Anchor CLI installed:

   ```sh
   cd backend
   anchor build
   anchor deploy --no-idl
   ```
