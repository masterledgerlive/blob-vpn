# God's Eye plugin — Blob VPN relay layer

The everything-map (God's Eye View globe) can show the blob network alive:
every relay directory becomes a pin; every pin carries its live head.

## Feed

`relays.geojson` — a standard GeoJSON FeatureCollection, regenerated from
chain state by `make-feed.mjs` (zero dependencies, Node 20+):

```
node make-feed.mjs directories.json > relays.geojson
```

`directories.json` is a list of known directories:

```json
[
  { "directory": "0x…", "label": "Kodakai Relay 001", "lat": 27.9659, "lon": -82.8001, "home": "Clearwater, FL" }
]
```

Each feature's properties:

| field | meaning |
|---|---|
| `label` | relay's chosen name |
| `directory` | Sui testnet Directory object id |
| `head_blob` | current head blob id (Walrus) — the living state |
| `head_epoch` | Walrus epoch the head is paid through |
| `advances` | how many times the pointer has advanced (a life sign) |
| `status` | `live` when the head reads back from the aggregator, else `unverified` |
| `network` | `sui-testnet` |

A hosted copy is served from the project page
(`https://arcade.highscores.live/arcade/blob-vpn/relays.geojson`, CORS `*`
via GitHub Pages), so the globe — or anyone's map — can poll it directly.

## Globe mapping

For the God's Eye history-feed-style loader, map each feature to a pin:
`lat`/`lon` from geometry, title from `label`, weight `1.0` when
`status == "live"` else `0.5`, and put `head_blob`, `directory` and
`advances` in the pin description. A relay whose head stops verifying is
a relay that stopped answering — the map should show it dimmed, not deleted:
on this network, silence is data.

## Adding your relay to the map

Run the relay kit (`relay-kit/`), get your Directory id, then open a pull
request adding your line to `directories.json` here — or just announce your
heartbeat blob on the project page and a maintainer will add you.
