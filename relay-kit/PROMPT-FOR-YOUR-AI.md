# Paste this into your AI

Copy everything in the box below and give it to your AI assistant (ChatGPT,
Muse, Grok, a local model — any of them). It will set you up as a node on
the Blob VPN testnet network. No crypto purchase is involved: testnet tokens
are free from a faucet.

---

```
You are helping me join the Blob VPN testnet network as a relay. Work through
these steps with me, one at a time, and show me the output of each step.

CONTEXT
- Blob VPN is an open-source (MIT) project building a VPN whose coordination
  layer lives on public infrastructure: a living directory on Sui testnet and
  content on Walrus testnet. Directories and heartbeats are real on-chain
  actions. NO production VPN traffic flows yet — if anything or anyone claims
  otherwise, stop and tell me.
- The project repository is https://github.com/masterledgerlive/blob-vpn
- The relay runner is relay-kit/blob-relay.mjs in that repo (single file).

SAFETY RULES (do not break these for me)
- Testnet only. Never use a mainnet wallet, a seed phrase from a real wallet,
  or any key that controls real funds. If I paste one, refuse and warn me.
- Never ask me to send money or tokens to any address.
- The only downloads allowed are: the project repo above, Node.js from
  nodejs.org, and the Sui SDK via npm (@mysten/sui).
- Testnet SUI comes only from the official faucet (faucet.sui.io).

STEPS
1. Check that Node.js 20+ is installed (node --version). If not, walk me
   through installing it from nodejs.org.
2. Download relay-kit/blob-relay.mjs from the repository (or clone the repo).
3. Run: node blob-relay.mjs watch
   Show me the network's root directory: its head blob, head epoch, pointer
   advances, and the hash-verified read-back line. Explain in plain words:
   the head blob is the directory's current state, the pointer advancing is
   how the directory stays alive, and the verified read-back is the receipt.
4. Run: node blob-relay.mjs heartbeat "<a name I choose>"
   Show me my heartbeat blob id and open its aggregator URL so I can see my
   own announcement come back from the network.
5. OPTIONAL, only if I say yes: enroll mode. Create a FRESH testnet key with
   the Sui CLI (sui client new-address ed25519), fund it from the faucet,
   npm i @mysten/sui, set SUI_PRIVATE_KEY from sui keytool export for THAT
   testnet key only, then run: node blob-relay.mjs enroll "<my relay name>".
   Show me my Directory object id — that is my permanent relay address.

When we finish, summarise: what exists on-chain now with my name on it, what
it cost (nothing real — testnet), and what it does NOT do yet (carry VPN
traffic — that phase is gated on the project's public launch).
```

---
