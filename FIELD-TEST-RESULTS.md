# Blob VPN — Phase 2 Testnet Field Test Results
**Date:** 2026-10-27 (evening, David's word: "go for it you have the word")
**Network:** Sui/Walrus **testnet only**. Faucet tokens; nothing of value moved; no mainnet writes.
**Keeper address (house testnet key):** 0x6055834d40505afee31b9b97b3fc20ac0e19f73b09a08e86bf23e9dc5a175852
**Stack as run:** Walrus CLI 1.59.0 (config only) · Sui CLI 1.82.2 · @mysten/sui 2.38.0 · @mysten/walrus 1.2.37 · @mysten/seal 1.5.2

> Pin correction to research 11: there is **no testnet-v1.82.3 tag** — v1.82.3 is
> mainnet-only; the testnet line is v1.82.2 (used here) with v1.83.0 already out.
> Walrus epochs ≠ Sui epochs: during the run, Sui epoch 1266, Walrus epoch 564→565.

## F1 — Store + hash-verified read-back (public publisher) ✅
- Blob `L4asvdNY2lBpnEEWoPSPaC6TLcQrEzD-O1AV3EP2cZE`, Sui object 0x44b5a612a7d0…,
  130 bytes stored for 2 epochs (564→566). PUT→response **11.9s**.
- Read-back via aggregator: **sha256 identical** (34a623513767…).
- The response itself proves the 64 MB floor live: a 130-byte blob billed
  `storageSize: 66,034,000` encoded bytes.

## F3/F4 — Latency series (public publisher + aggregator) ✅
- Store (n=4, small blobs): 11.43 / 11.81 / 11.91 / 12.06 s → **median ≈ 11.9 s**.
  First measured confirmation of the "~10 s certify" class of claim, via the public path.
- Reads (curl, hash-verified all): first read 1.57–1.79 s; warm reads **0.53–0.57 s**.
- Finding: the public aggregator **403s the default Python urllib user-agent**; curl fine.
  Keeper tooling must set a UA or use a real client. (Raw log: fieldtest/data/f34-results.json)

## F2 — Own-wallet store + extend-before-expiry ✅
- Faucet: web/API faucet refuses direct calls ("CI compatibility is disabled");
  `sui client faucet` (proof-of-work flow) delivered 1 SUI, tx HEAn5cgcQfpE….
- SUI→WAL exchange (manual PTB, 0x82593828…::wal_exchange::exchange_all_for_wal):
  0.5 SUI → 0.5 WAL, tx 8cEBTbe454shrFAxsTa5zrJEAqQ7nDoghecq5pCbPpw3.
- Store via writeBlobFlow + **upload relay** (direct node uploads are unreachable
  from this network — see Findings): blob `mGv9byIa_0DKXamS3tox-A8UL7U6yhcEj6Y9ZBn5wck`,
  object 0x75bb83d99430…, 1 epoch (564→565), end-to-end **14.7 s**. Read-back sha256 match.
- Extend +2 epochs via manual PTB to `system::extend_blob` (current walrus package
  0x7d3b2086…): tx ABGrWuLCeDBbKhuFrA12unn5LcprAYivnv6QB7JVmung, execute **0.87 s**,
  **end_epoch 565 → 567, blob id unchanged** — the design's core survival move, proven.
  (First re-read showed the old value: read lag on the fullnode view; the tx effects
  and a later read agree on 567.)

## F6 — Directory package + living pointer ✅ (Walrus Sites replaced by our own object)
Published package **`0x1e2dcfdbfe21508be36d755db63ab71d492f8c6469d5d2dc36036844afba714b`**
(tx HqwmGJWBrXtDLr5Bhka1u45THhgLB4H85M9WARiVwwnE) — module `directory`:
Directory object (owned) + dynamic-field entries + `seal_approve` policy.
- create: Directory `0xc1bf9f6a67a556d5e8f18f2e9bdb03ada54521329ee1cd06d2875eb577e54850`,
  head = F1 blob @ epoch 566 (tx GNJTCdqZiBv6…).
- advance: head → F2 blob @ 567 (tx 9kfyH7SbuVhV…). Read-back: `advances: 1, head_epoch: 567`. ✅
- put_entry ×2 in one tx (4WG5NWYNP3BM…): `fieldtest-one`, `fieldtest-two` present as
  dynamic fields (BCS-decoded names verified).

## F5 — Seal private entry round trip ✅ (first measured numbers anywhere in our work)
Key servers: the **current** verified Mysten testnet pair (research 08's IDs are dead —
rotated: 0x73d05d62…, 0xf5d14a81…). verifyKeyServers round trip 6.3 s cold.
Policy = our package's `seal_approve`: identity = dir_id_bytes ‖ entry_key; approve iff
the entry exists in the directory.
- Encrypt (threshold 1 of 2): 131 B → [269–590 ms warm, 4.2 s cold], ct 501 B;
  10 KB → 250–583 ms; 100 KB → 254–568 ms. **Encrypt is fast and ~size-flat.**
- SessionKey create: 76–290 ms.
- **fetchKeys: 1,591 ms and 3,059 ms in two runs — the Seal read-latency number
  research 08 found published nowhere. Budget ≈ 1.6–3.1 s per key fetch (testnet, n=2).**
- Decrypt after fetch: 65 ms. **Round trip plaintext == original, byte-identical.**
- Composition: the sealed entry itself stored on Walrus (blob
  `ihC_8PwshXMNuG0X9FcjWfIED-iap8A9J47bbr7uIHs`, epochs 564→566) and read back
  sha256-verified (7b3c3da787…) — content-private, existence-public, as designed.

## Costs (testnet, indicative only)
SUI 1.0 → 0.4625 (publish + ~8 txs of gas ≈ 0.54 SUI total).
WAL 0.5 → 0.4979 (one 1-epoch store + relay tip + one +2 extend ≈ 0.0021 WAL at the 64 MB floor).

## Operational findings (keeper runbook material)
1. **Rust gRPC (tonic) cannot reach Sui fullnodes from this VM** — the egress proxy
   breaks native HTTP/2 gRPC ("InvalidContentType"). The Rust CLIs (sui, walrus) are
   therefore read/write-crippled here; **all working chain access went through the
   TypeScript SDKs (grpc-web) and GraphQL**, including a TS publish of CLI-compiled
   bytecode (framework deps 0x1/0x2) after `sui move build`'s registry fetch failed
   the same way. Keeper design consequence: build the keeper on the TS stack, or run
   the Rust stack somewhere with clean egress (e.g. Shadow when it is up).
2. **Storage nodes are unreachable directly from this VM** (connection failures);
   the public testnet **upload relay** (upload-relay.testnet.walrus.space, tip = const
   105 units) is the working write path. Reads: aggregator, not SDK readBlob (same reason).
3. **@mysten/walrus 1.2.37 quirks:** `extendBlob()` only *builds* a command;
   `executeExtendBlobTransaction` is the executing call, and it currently dies inside
   its own cost computation (NaN from the current system-object state layout) —
   manual PTB to `system::extend_blob` is the reliable path. `writeBlobToUploadRelay`
   in this version is low-level; the flow API (`writeBlobFlow().run()`) is the usable one.
4. Seal SDK 1.5.2: `encrypt` wants the identity as a **hex string**; `fetchKeys`
   returns undefined and caches into the session key (decrypt then works).
5. Faucet: only the CLI's proof-of-work flow works unattended.

## What this proves / does not prove
Proves on live testnet: store+certify latency class, hash-verified return path,
extend-before-expiry with stable blob id, the Sui-object pointer advancing a living
directory head, name entries as dynamic fields, Seal-gated private entries with
measured key-fetch latency, and the full composition (sealed entry on Walrus, policy
on Sui). Does **not** prove: mainnet economics, storage-node-direct operation,
committee key servers, quilt batching at scale, or anything about public egress —
Phase 3 remains attorney-gated and untouched. Zero mainnet writes were made.
