#!/usr/bin/env node
/**
 * blob-relay.mjs — join the Blob VPN testnet network.
 *
 *   node blob-relay.mjs watch                  Live view of the network directory (no wallet, no installs)
 *   node blob-relay.mjs heartbeat "My Relay"   Announce yourself with a heartbeat blob (no wallet, no installs)
 *   node blob-relay.mjs enroll "My Relay"      Create YOUR OWN directory on Sui testnet (wallet mode)
 *
 * Enroll mode needs:  npm i @mysten/sui
 * and a testnet key in the environment:  SUI_PRIVATE_KEY=suiprivkey1...  (from `sui keytool export`)
 * plus a little testnet SUI from the faucet (https://faucet.sui.io — pick Testnet).
 *
 * STATUS: this is a TESTNET coordination network. Directories, heartbeats and
 * pointer advances are real on-chain actions. No production VPN traffic flows
 * yet — anyone who tells you otherwise is not reading this file.
 */
import { createHash } from 'node:crypto';

const ROOT_DIRECTORY = '0xc1bf9f6a67a556d5e8f18f2e9bdb03ada54521329ee1cd06d2875eb577e54850';
const PACKAGE_ID = '0x1e2dcfdbfe21508be36d755db63ab71d492f8c6469d5d2dc36036844afba714b';
const GQL = 'https://graphql.testnet.sui.io/graphql';
const AGG = 'https://aggregator.walrus-testnet.walrus.space/v1/blobs/';
const PUB = 'https://publisher.walrus-testnet.walrus.space/v1/blobs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gql(query) {
  const r = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  return r.json();
}

async function readDirectory(id) {
  const g = await gql(`{ object(address: "${id}") { asMoveObject { contents { json } } } }`);
  return g?.data?.object?.asMoveObject?.contents?.json ?? null;
}

async function verifyBlob(blobId) {
  const r = await fetch(AGG + blobId);
  if (!r.ok) return { ok: false, status: r.status };
  const buf = Buffer.from(await r.arrayBuffer());
  return { ok: true, bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
}

async function publishBlob(bytes, epochs = 1) {
  const r = await fetch(`${PUB}?epochs=${epochs}`, { method: 'PUT', body: bytes });
  const j = await r.json();
  const created = j.newlyCreated?.blobObject ?? j.alreadyCertified;
  return created?.blobId ?? j.alreadyCertified?.blobId;
}

async function watch() {
  console.log('BLOB VPN — live network directory (Sui testnet)');
  console.log('root directory:', ROOT_DIRECTORY);
  for (;;) {
    const dir = await readDirectory(ROOT_DIRECTORY);
    if (dir) {
      const v = await verifyBlob(dir.head_blob);
      console.log(`\n[${new Date().toLocaleTimeString()}] head blob: ${dir.head_blob}`);
      console.log(`  head epoch: ${dir.head_epoch} · pointer advances: ${dir.advances}`);
      console.log(v.ok ? `  return path: VERIFIED — ${v.bytes} bytes, sha256 ${v.sha256.slice(0, 16)}…` : `  return path: not readable yet (HTTP ${v.status})`);
    } else {
      console.log('directory not readable yet (indexer lag) — retrying…');
    }
    await sleep(30_000);
  }
}

async function heartbeat(name) {
  const payload = new TextEncoder().encode(JSON.stringify({
    type: 'blob-relay-heartbeat', name, ts: new Date().toISOString(),
    note: 'I am willing to relay for the blob network. Testnet announcement only — no traffic yet.',
  }));
  const blobId = await publishBlob(payload, 1);
  console.log('heartbeat published to Walrus testnet');
  console.log('blob id:', blobId);
  console.log('verify it yourself:', AGG + blobId);
  console.log('share that blob id with the network (or paste it on the project page) so relays can find you.');
}

async function enroll(name) {
  let sui;
  try {
    sui = await import('@mysten/sui/grpc');
    var txMod = await import('@mysten/sui/transactions');
    var kpMod = await import('@mysten/sui/keypairs/ed25519');
  } catch {
    console.error('enroll mode needs the Sui SDK:  npm i @mysten/sui');
    process.exit(1);
  }
  const secret = process.env.SUI_PRIVATE_KEY;
  if (!secret) {
    console.error('set SUI_PRIVATE_KEY (testnet only!). Create one with the Sui CLI:  sui client new-address ed25519  then  sui keytool export --key-identity <address>');
    process.exit(1);
  }
  const kp = kpMod.Ed25519Keypair.fromSecretKey(secret);
  const address = kp.getPublicKey().toSuiAddress();
  const client = new sui.SuiGrpcClient({ network: 'testnet', baseUrl: 'https://fullnode.testnet.sui.io:443' });
  const bal = await client.core.getBalance({ owner: address });
  console.log('your testnet address:', address, '· SUI balance:', Number(bal.balance.balance) / 1e9);
  if (Number(bal.balance.balance) < 50_000_000) {
    console.error('low balance — get free testnet SUI at https://faucet.sui.io (select Testnet), then re-run.');
    process.exit(1);
  }
  const hb = new TextEncoder().encode(JSON.stringify({ type: 'blob-relay-heartbeat', name, owner: address, ts: new Date().toISOString() }));
  const blobId = await publishBlob(hb, 2);
  console.log('heartbeat blob:', blobId);
  const tx = new txMod.Transaction();
  tx.setSender(address);
  tx.moveCall({ target: `${PACKAGE_ID}::directory::create`, arguments: [tx.pure.string(name), tx.pure.string(blobId), tx.pure.u64(566)] });
  const res = await client.signAndExecuteTransaction({ transaction: tx, signer: kp, include: { effects: true } });
  console.log('directory create tx:', res.Transaction?.digest, '· success:', res.Transaction?.effects?.status?.success);
  await sleep(5000);
  const g = await gql(`{ address(address: "${address}") { objects(filter: { type: "${PACKAGE_ID}::directory::Directory" }) { nodes { address } } } }`);
  const mine = g?.data?.address?.objects?.nodes?.[0]?.address;
  console.log(mine ? `YOUR DIRECTORY: ${mine}\nYou are on the blob network. Keep this id; advance your head with the advance function as your heartbeat changes.` : 'directory tx sent — check your address on a testnet explorer for the Directory object.');
}

const [mode, name] = process.argv.slice(2);
if (mode === 'watch') await watch();
else if (mode === 'heartbeat') await heartbeat(name ?? 'anonymous-relay');
else if (mode === 'enroll') await enroll(name ?? 'my-relay');
else console.log('usage: node blob-relay.mjs [watch | heartbeat "Name" | enroll "Name"]');
