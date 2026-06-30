# GmeAuth and project metadata should use pluggable storage (not hard-coded MongoDB)

**Filed:** https://github.com/webgme/webgme-engine/issues/365

## Summary

`config.storage.database.type` can be set to `memory`, `mongo`, `redis`, etc., but **GmeAuth always connects to MongoDB** via `MongoClient.connect(gmeConfig.mongo.uri)` during server startup. This happens even when `authentication.enable === false`.

As a result, applications that want a fully ephemeral or non-Mongo deployment still require a running MongoDB instance for:

- user / organization records (`GmeAuth`)
- project metadata (`MetadataStorage` via Mongo collections)
- optional executor / token services

## Current behavior

In `standalone.js`, server startup unconditionally calls:

```js
__gmeAuth.connect()
```

In `gmeauth.js`, `connect()` is implemented as:

```js
Mongodb.MongoClient.connect(gmeConfig.mongo.uri, gmeConfig.mongo.options)
```

There is no storage adapter abstraction for auth/metadata comparable to `MemoryAdapter` / `MongoAdapter` for model commits.

## Problem

Downstream apps (e.g. StaMS) may configure:

```js
config.storage.database.type = 'memory';
config.authentication.enable = false;
```

and still fail to start if MongoDB is unavailable, because GmeAuth is a separate hard dependency.

This blocks several legitimate deployment modes:

1. **Zero-dependency local studio** — single-user, in-memory workspace, no external services.
2. **Object-store–backed metadata** — e.g. project list / auth records on S3-compatible storage where Mongo is not available.
3. **Consistent storage configuration** — users expect `storage.database.type = 'memory'` to mean “no external database,” not “only model commits are in memory.”

## Proposed direction

Introduce a pluggable **metadata / auth storage** layer, parallel to model storage:

```text
config.storage.database.type          -> model commits (already pluggable)
config.storage.metadata.type (?))     -> GmeAuth + MetadataStorage + tokens
```

Possible backends:

| Backend | Use case |
|---------|----------|
| `memory` | local dev, tests, ephemeral studios |
| `mongo` | current default / production |
| `s3` / blob | serverless or object-store deployments |
| custom | app-specific |

### Suggested API sketch

```js
// config
config.storage.metadata = {
  type: 'memory', // 'mongo' | 's3' | ...
  // backend-specific options
};

// engine
const metadataStorage = createMetadataStorage(gmeConfig);
await metadataStorage.open();
const gmeAuth = new GmeAuth(metadataStorage, gmeConfig);
```

`GmeAuth.connect()` would delegate to the adapter instead of calling `MongoClient` directly.

### Migration

- Default remains Mongo for backward compatibility.
- `memory` adapter implements the same interface as today's Mongo collections (users, projects).
- Document that `mongo.uri` is only required when metadata storage type is `mongo`.

## Workaround today (StaMS)

Resolved in webgme-engine [#366](https://github.com/webgme/webgme-engine/pull/366): StaMS sets `config.authentication.gmeAuth.path` to `memorygmeauth` alongside `storage.database.type = memory` and `authentication.enable = false`. No MongoDB process is started.

## References

- `src/server/standalone.js` — `__gmeAuth.connect()` during startup
- `src/server/middleware/auth/gmeauth.js` — `MongoClient.connect`
- `src/server/storage/metadatastorage.js` — Mongo collection operations
- `config/README.md` — documents `storage.database.type` but not auth/metadata coupling

## Environment

- webgme / webgme-engine 2.49.x
- StaMS: `storage.database.type = 'memory'`, `authentication.enable = false`
