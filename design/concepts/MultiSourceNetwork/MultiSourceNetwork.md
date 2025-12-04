* **concept**: MultiSourceNetwork [Owner, Node, Source]
* **purpose**: Allow an owner to maintain and explore a single unified network of nodes and connections that may originate from multiple independent sources.
* **principle**: Each canonical Node is stored once globally. An owner’s unified graph is the combination of `Memberships` (which record which source(s) brought a node into the owner’s network) and owner-scoped `Edges` (each attributed to a Source). When a contributing Source removes its data, the owner’s network reflects those removals automatically.

* **state**:
    * a set of `Networks` with
        * `_id` String
        * `owner` Owner
        * `root?` Node
        * `createdAt?` String
        * `updatedAt?` String
    * a set of `Memberships` with
        * `_id` String
        * `owner` Owner
        * `node` Node
        * `sources` JSON (map of sourceId -> metadata)
        * `createdAt?` String
        * `updatedAt?` String
    * a set of `Edges` with
        * `_id` String
        * `owner` Owner
        * `from` Node
        * `to` Node
        * `source` Source
        * `weight?` Number
        * `createdAt?` String
        * `updatedAt?` String
    * a set of `Nodes` with
        * `_id` String
        * `sourceIds?` JSON
        * `label?` String
        * `firstName?` String
        * `lastName?` String
        * `headline?` String
        * `profileUrl?` String
        * `avatarUrl?` String
        * `tags?` String
        * `createdAt?` String
        * `updatedAt?` String

* **actions**:

    * `createNetwork (owner: Owner, root: Node?): Empty`
        * **requires**:
            * No `Networks` entry exists for `owner`.
        * **effects**:
            * Creates a new `Networks` entry for the owner with optional `root`.
            * If `root` is omitted, defaults to `owner`.
            * Ensures the owner has a `Memberships` entry for `(owner, owner)` and adds the `self` source to that membership. This guarantees the owner appears as a node in their network.

    * `setRootNode (owner: Owner, root: Node): Empty`
        * **requires**:
            * A `Networks` entry exists for `owner`.
            * A `Memberships` entry exists for `(owner, root)`.
        * **effects**:
            * Sets the `root` field for the owner’s network.

    * `addNodeToNetwork (owner: Owner, node: Node, source: Source): Empty`
        * **requires**: none.
        * **effects**:
            * Upserts a `Memberships` entry for `(owner, node)`; adds the `source` to the membership's `sources` map. Ensures canonical `Node` exists (create or reuse via `sourceIds`).
            * Supports creating a canonical node by passing `nodeMeta` instead of `node`. When `nodeMeta` is supplied, a canonical node is created (via `createNodeForUser`) and the returned node id is added to membership.
        
    * `updateNode (updater: Owner, node: Node, meta: Node): Empty`
        * **requires**: `node` to exist, `updater` to be the owner of the node
        * **effects**:
            * Updates given `node` based on new `meta` data.

    * `removeNodeFromNetwork (owner: Owner, node: Node, source: Source?): Empty`
        * **requires**:
            * A `Memberships` entry exists for `(owner, node)`.
        * **effects**:
            * If `source` provided: remove `source` from membership `sources`. If `sources` becomes empty: delete the `Memberships` entry and delete all `Edges` for the owner where `from==node OR to==node`.
            * If `source` omitted: delete the `Memberships` entry and delete all owner `Edges` touching the node.
    
    * `updateNode (owner: Owner, query?: String, limit?: Number, offset?: Number): Empty`
        * **requires**: `owner` to exist
        * **effects**:
            * Returns nodes that match query, limited to `limit` results, with offset `offset` (how many "pages").

    * `addEdge (owner: Owner, from: Node, to: Node, source: Source, weight: Number?): Empty`
        * **requires**:
            * `from != to`.
        * **effects**:
            * Upserts an `Edges` entry for `(owner, from, to, source)` and sets/updates `weight`.

    * `removeEdge (owner: Owner, from: Node, to: Node, source: Source): Empty`
        * **requires**:
            * An `Edges` entry exists for `(owner, from, to, source)`.
        * **effects**:
            * Removes the specified edge.

    * `removeEdge (owner: Owner, from: Node, to: Node, source: Source): Empty`
        * **requires**:
            * An `Edges` entry exists for `(owner, from, to, source)`.
        * **effects**:
            * Removes the specified edge.

    * `setRootNode` and `addEdge` assume the caller enforces authorization (owner or sync acting on behalf of owner); `updateNode` operations should require membership-based authorization.

    * `createNodeForUser ({ owner, firstName?, lastName?, label?, headline?, profileUrl?, avatarUrl?, tags?, sourceIds? }): { node } | { error }`
        * **requires**: either `firstName+lastName` or `label` (a display name) so a canonical label can be derived.
        * **effects**:
            * Inserts a `Nodes` document (with `sourceIds` if provided) and a `Memberships` entry for `(owner, node)` with the source set to `user` (or the internal caller tag). Returns the new canonical node id.

    * `addOrMigrateNodeFromSource ({ owner, legacyNodeId?, source, nodeMeta?, externalId? }): { node }`
        * **requires**: `owner` to exist and be provided, `source` to be provided
        * **effects**: creates `{ node }` with the canonical node id.

* **notes**:
    * Use unique indexes and upserts for `Memberships` (`{ owner:1, node:1 }`) and `Edges` (`{ owner:1, from:1, to:1 }`) to avoid duplication under concurrency. Edges are unique per owner/from/to; the `source` field represents the latest source that provided or updated the edge.
    * Prefer exact dedupe using `sourceIds` rather than name-only matching.
    * When a membership is removed because no sources remain, cascade-delete owner edges for that node so the owner’s unified graph reflects source deletions.
    * `updateNode` must perform membership-based authorization: only an owner that is a member of a node may update it. Implementations should also filter out immutable fields (for example `_id`) and avoid attempting to set those values in MongoDB updates. `updateNode` should update `updatedAt`.
    * `searchNodes` is scoped to nodes that the owner has a membership for and (by implementation) only performs substring searches on `firstName` and `lastName` (case-insensitive). The UI should rely on the membership filter to control visibility.
    * Edge creation from imports is best-effort: the flow ensures membership exists and upserts the owner->node edge, but a failure to create the edge should not fail the overall import/sync operation.
