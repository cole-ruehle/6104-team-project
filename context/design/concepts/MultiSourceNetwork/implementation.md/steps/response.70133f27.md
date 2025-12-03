---
timestamp: 'Sat Nov 22 2025 10:19:34 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_101934.788a7817.md]]'
content_id: 70133f27dbe4f6bd207e3eecb69dcfaac9a44881bd4d8e124e913a1fb1b15eea
---

# response:

Here's the modified `MultiSourceNetwork` concept specification, with its state and actions refined to align with the principles of concept design, especially regarding modularity, separation of concerns, and the "multi-source" aspect for nodes.

The primary changes are:

1. **Reintroduction of `NodeSourceContributions`**: This state component explicitly tracks which sources contribute a given node to an owner's network, ensuring the "multi-source" aspect for nodes is properly managed. A node only truly "exists" in an owner's network if it has at least one source contributing it.
2. **Explicit `root` in `Networks`**: The `Networks` state now clearly defines the network's existence and its optional `root` node, separated from the actual node membership.
3. **Renamed Node Actions**: `addNode` and `removeNode` are replaced by `addNodeSource` and `removeNodeSource` to explicitly handle contributions from specific sources.
4. **`getAdjacencyList` moved to `queries`**: As a read-only operation, it belongs in the `queries` section.
5. **Refined Pre/Post conditions**: Updated `requires` and `effects` to match the new state structure and ensure behavioral completeness and correctness.

***

**concept**: MultiSourceNetwork \[Owner, Node, Source]

**purpose**:
Allow an owner to maintain and explore a single unified network of nodes and connections that may originate from multiple independent sources, and to manage the lifecycle of these nodes and edges based on their contributing sources.

**principle**:
When an owner accumulates nodes and edges from different sources into their network, they can explore them as one combined graph. If any contributing source removes its nodes or edges, the owner’s unified network reflects these changes automatically. A node or edge remains in the network as long as at least one source contributes it.

***

## State

* **Networks**
  * `owner`: Owner (unique identifier for the network itself)
  * `root`: Node? (optional root node for traversal, e.g., for UI display)

* **NodeSourceContributions**
  * `owner`: Owner
  * `node`: Node
  * `sources`: JSON array of Source (identifies which sources contribute this node to the owner's network)

* **AdjacencyLists** (stores outgoing edges for each node)
  * `owner`: Owner
  * `node`: Node (the 'from' node)
  * `edges`: Array of objects
    * `to`: Node
    * `source`: Source
    * `weight?`: Number

***

## Actions

### `createNetwork(owner: Owner, root?: Node): Empty`

* **requires**:
  * No `Networks` entry exists for `owner`.
* **effects**:
  * Creates a new `Networks` entry for the owner with optional `root`.

### `setRootNode(owner: Owner, root: Node): Empty`

* **requires**:
  * A `Networks` entry exists for `owner`.
  * A `NodeSourceContributions` entry exists for `(owner, root)`.
* **effects**:
  * Sets the `root` field for the owner’s network.

### `addNodeSource(owner: Owner, node: Node, source: Source): Empty`

* **requires**:
  * A `Networks` entry exists for `owner`.
* **effects**:
  * If a `NodeSourceContributions` entry for `(owner, node)` exists, adds `source` to its `sources` array (if not already present).
  * If no `NodeSourceContributions` entry for `(owner, node)` exists, creates a new entry with `node` and `source` in its `sources` array.
  * Ensures an `AdjacencyLists` entry for `(owner, node)` exists, initializing it with an empty `edges` array if not.

### `removeNodeSource(owner: Owner, node: Node, source: Source): Empty`

* **requires**:
  * A `NodeSourceContributions` entry exists for `(owner, node)`.
  * `source` is present in the `sources` array of that entry.
* **effects**:
  * Removes `source` from the `sources` array of the `NodeSourceContributions` entry for `(owner, node)`.
  * If the `sources` array for `(owner, node)` becomes empty:
    * Deletes the `NodeSourceContributions` entry for `(owner, node)`.
    * Deletes the `AdjacencyLists` entry for `(owner, node)` (effectively removing all outgoing edges from this node).
    * For all other `AdjacencyLists` entries for `owner`, removes any edges where `to` is this `node`.
    * If `node` was the `root` in the `Networks` entry for `owner`, clears the `root`.

### `addEdge(owner: Owner, from: Node, to: Node, source: Source, weight?: Number): Empty`

* **requires**:
  * `NodeSourceContributions` entries exist for `(owner, from)` and `(owner, to)`.
  * `from != to`.
* **effects**:
  * Looks up the `AdjacencyLists` entry for `(owner, from)`.
  * If an edge from `from` to `to` with the given `source` exists in its `edges` array, updates its `weight` (if provided).
  * Otherwise, adds a new edge `{to, source, weight}` to the `edges` array of the `AdjacencyLists` entry for `(owner, from)`.

### `removeEdge(owner: Owner, from: Node, to: Node, source: Source): Empty`

* **requires**:
  * An `AdjacencyLists` entry exists for `(owner, from)`.
  * An edge from `from` to `to` with the given `source` exists in its `edges` array.
* **effects**:
  * Removes the specified edge from the `edges` array of the `AdjacencyLists` entry for `(owner, from)`.

***

## Queries

### `_getAdjacencyList(owner: Owner, node: Node): Array<{to: Node, source: Source, weight?: Number}>`

* **requires**:
  * A `NodeSourceContributions` entry exists for `(owner, node)`.
* **effects**:
  * Returns the `edges` array from the `AdjacencyLists` entry for `(owner, node)`. If no entry, returns an empty array.

### `_getNodeSources(owner: Owner, node: Node): Array<Source>`

* **requires**:
  * A `NodeSourceContributions` entry exists for `(owner, node)`.
* **effects**:
  * Returns the `sources` array from the `NodeSourceContributions` entry for `(owner, node)`. If no entry, returns an empty array.

### `_getNetworkRoot(owner: Owner): {root?: Node}`

* **requires**:
  * A `Networks` entry exists for `owner`.
* **effects**:
  * Returns the `root` node for the owner's network.
