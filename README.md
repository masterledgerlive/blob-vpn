# Blob VPN — a VPN that answers with receipts

**MIT-licensed. Free forever. Bring your own VPN, your own relay, or just watch.**

Blob VPN is a different shape of VPN network. Normal VPNs ask you to trust a
company's word: *we routed you safely, we logged nothing, trust us.* Blob VPN
is built so trust is replaced by **receipts**:

- **Every session produces a pair of receipts** — what went out, and what came
  back. If the return doesn't match, the session counts as *unverified* and
  the relay earns nothing. *Show me the return path.*
- **The directory is alive.** Network state lives in blobs on
  [Walrus](https://walrus.space) (decentralised storage on
  [Sui](https://sui.io)) that stay published only while they are relevant and
  paid forward, epoch by epoch. A pointer object on Sui names the current
  head. When information dies, it dies in public, with a tombstone — nothing
  silently rots behind a redirector.
- **Private entries are sealed.** Using [Seal](https://seal-docs.wal.app)
  threshold encryption, an entry's *existence* is public but its *content*
  decrypts only when the network's on-chain policy approves — and the policy
  is the living directory itself.

## Status — read this first

**This is a live TESTNET coordination network, not a production VPN (yet).**

What is real today, verified on Sui/Walrus testnet on 2026-10-27
(full record: `FIELD-TEST-RESULTS.md` in the project workspace):

| capability | state |
|---|---|
| Store network state as blobs, read back hash-verified | ✅ live on testnet |
| Extend a blob before expiry (same id, longer life) | ✅ live |
| Directory object whose pointer advances to the new head | ✅ live |
| Relay enrolment (your own Directory) + heartbeat blobs | ✅ live — this repo |
| Seal-encrypted private entries (key fetch ≈ 1.6–3.1 s measured) | ✅ live |
| Live relay map feed (God's Eye plugin) | ✅ live |
| Actual VPN traffic (WireGuard data plane) | ⏳ in build — Phase 1b |
| Public exit nodes / public launch | 🔒 gated: legal review + maintainer's word |

No token. No coin. No "earnings" promises — relay accounting in the design is
pay-for-*verified*-use from a fixed pool, and none of it exists on mainnet.
Anyone selling you a Blob VPN token is scamming you.

## Join in 60 seconds

You need Node.js 20+. Nothing else — no wallet, no installs for the first two.

```bash
# 1. See the network alive (reads the real testnet directory)
node relay-kit/blob-relay.mjs watch

# 2. Announce yourself (publishes a heartbeat blob in your name)
node relay-kit/blob-relay.mjs heartbeat "Your Relay Name"

# 3. Enrol properly (your own on-chain Directory — needs a free testnet wallet)
npm i @mysten/sui
node relay-kit/blob-relay.mjs enroll "Your Relay Name"
```

**No code at all?** Paste [`relay-kit/PROMPT-FOR-YOUR-AI.md`](relay-kit/PROMPT-FOR-YOUR-AI.md)
into your AI assistant and let it drive — it contains the safety rules too
(testnet keys only, never real funds, official faucet only).

**Already run a VPN?** That's the point of the design: existing VPNs join as
*relay legs*. Your gateway keeps doing what it does; the blob layer adds the
directory, the receipts, and the return-path verification around it. Enrol a
Directory, point its head at your heartbeat, and you are plugged in.

## See it on the map

The God's Eye plugin (`plugin/gods-eye/`) turns every enrolled directory
into a live pin on the everything-map globe: label, head blob, epoch,
pointer advances, and a `live` status that means *the head answered when we
pulled it*. Feed: `relays.geojson`, regenerated from chain state by
`make-feed.mjs`, also hosted on the project page.

**Project page:** https://arcade.highscores.live/arcade/blob-vpn.html
(live network panel, the copy-paste kit, and the story so far)

## How it works, in ten lines

1. Two lanes: a **data lane** (verified lookups, allowlisted) and a **tunnel
   lane** (WireGuard). The chain is never in the packet path.
2. The chain is the **notary and the directory** — Sui finality (~0.4 s) can
   receipt a session; it cannot switch 800k packets/second, and we don't ask it to.
3. Sessions are planned in a **session-plan blob**; the blob's hash names the session.
4. Out- and return-receipts pair up, Merkle-batch daily into a **receipt quilt**
   (batching is what makes the economics work — see the cost research).
5. Relevance is judged from *verified reads by independent sources* (a
   diversity floor — one loud source can't keep junk alive).
6. Blobs are born dying: storage is rented per epoch (max ~2 years). Keepers
   **extend** what still matters, before expiry, or it's gone — by design.
7. Names resolve by reading a **pointer object** (the Walrus Sites pattern):
   no redirector you can't replace.
8. Private entries use **Seal**: ciphertext on Walrus, keys released by
   independent key servers only when the on-chain policy (the directory) approves.
9. A deterministic policy engine decides; an AI may *explain* a session plan
   but can never approve one. Fail closed, always.
10. The headline metric is the **old-internet share**: the fraction of a route
    still depending on the old stack. It only goes down on receipts.

The full design, research (11 graded studies), both podcast series and the
local bench suites (26/26 and 29/29 checks) live in the project workspace;
the essentials are summarised on the project page.

## Safety & law

- Relay ≠ exit. In the current phase, relays coordinate and announce; **no
  participant carries anyone else's traffic.**
- When traffic phases arrive, public egress is designed for **professional
  gateways only — never homes** — and enrolment requires a signed consent
  proof. Residential bandwidth resale is not part of this design.
- Running a relay directory on testnet is free and lawful experimentation.
  If you later choose to operate real VPN infrastructure, you are
  responsible for your jurisdiction's rules (logging, abuse handling,
  licensing). The project's public launch is gated on legal review for
  exactly this reason.
- Never share a seed phrase or a mainnet key with this kit, with the project
  page, or with any AI prompt from this repo. Testnet keys only.

## License

MIT — see `LICENSE`. Take it, fork it, build your own network with it.
Attribution appreciated; the return-path doctrine is the part we'd love to
see everywhere: *show me the return path.*
