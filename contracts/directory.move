/// Blob VPN living directory — testnet field build (Phase 2).
/// One owned Directory object per namespace. Its head_blob field is the
/// POINTER from REBLOB-DESIGN: names resolve by reading this object;
/// advancing the head is one cheap owned-object transaction.
/// Entries live as dynamic fields (name -> blob id + epoch).
/// Seal policy: an entry's Seal identity is dir_id_bytes || entry_key;
/// seal_approve approves exactly when that entry exists in this directory —
/// decryption rights follow the living directory.
module blobvpn_dir::directory;

use std::string::String;
use sui::dynamic_field as df;

public struct Directory has key {
    id: UID,
    name: String,
    head_blob: String,
    head_epoch: u64,
    advances: u64,
}

public struct Entry has store, drop {
    blob_id: String,
    epoch: u64,
}

public fun create(name: String, head_blob: String, head_epoch: u64, ctx: &mut TxContext) {
    let dir = Directory {
        id: object::new(ctx),
        name,
        head_blob,
        head_epoch,
        advances: 0,
    };
    transfer::transfer(dir, ctx.sender());
}

/// Advance the living head to a new blob (reblob = new id + pointer advance).
public fun advance(dir: &mut Directory, new_blob: String, epoch: u64) {
    dir.head_blob = new_blob;
    dir.head_epoch = epoch;
    dir.advances = dir.advances + 1;
}

/// Insert or replace a name entry.
public fun put_entry(dir: &mut Directory, key: String, blob_id: String, epoch: u64) {
    if (df::exists_(&dir.id, key)) {
        let _old: Entry = df::remove(&mut dir.id, key);
    };
    df::add(&mut dir.id, key, Entry { blob_id, epoch });
}

/// Seal access policy (Seal convention: first argument is the inner
/// identity). Ours is the directory object id bytes followed by the entry
/// key bytes. Approve iff the identity matches this directory AND the
/// entry exists in it.
entry fun seal_approve(id: vector<u8>, dir: &Directory, entry_key: String) {
    let mut expected = object::id(dir).to_bytes();
    expected.append(*entry_key.as_bytes());
    assert!(id == expected, 0);
    assert!(df::exists_(&dir.id, entry_key), 1);
}
