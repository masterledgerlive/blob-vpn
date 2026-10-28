#!/usr/bin/env node
/**
 * make-feed.mjs — build the God's Eye relay feed from live chain state.
 * Usage: node make-feed.mjs directories.json > relays.geojson
 * Zero dependencies (Node 20+). Testnet only.
 */
import { readFileSync } from 'node:fs';

const GQL = 'https://graphql.testnet.sui.io/graphql';
const AGG = 'https://aggregator.walrus-testnet.walrus.space/v1/blobs/';

const list = JSON.parse(readFileSync(process.argv[2] ?? 'directories.json', 'utf8'));
const features = [];
for (const item of list) {
  const r = await fetch(GQL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `{ object(address: "${item.directory}") { asMoveObject { contents { json } } } }` }),
  });
  const dir = (await r.json())?.data?.object?.asMoveObject?.contents?.json;
  let status = 'unverified';
  if (dir?.head_blob) {
    const h = await fetch(AGG + dir.head_blob);
    if (h.ok) { await h.arrayBuffer(); status = 'live'; }
  }
  features.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [item.lon, item.lat] },
    properties: {
      label: item.label,
      home: item.home ?? '',
      directory: item.directory,
      head_blob: dir?.head_blob ?? null,
      head_epoch: dir ? Number(dir.head_epoch) : null,
      advances: dir ? Number(dir.advances) : null,
      status,
      network: 'sui-testnet',
    },
  });
}
console.log(JSON.stringify({ type: 'FeatureCollection', generated: new Date().toISOString(), features }, null, 1));
