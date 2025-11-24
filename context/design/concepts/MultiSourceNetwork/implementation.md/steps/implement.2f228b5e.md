---
timestamp: 'Sat Nov 22 2025 10:19:08 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_101908.6390d300.md]]'
content_id: 2f228b5e58b3b3883a82a3488989c8d7f99bdd8e7fa2dd3b1c1b3f2f43004fe6
---

# implement: MultiSourceNetwork

* **concept**: MultiSourceNetwork \[Owner, Node, Source]

* **purpose**:
  Allow each owner to maintain and explore their own unified network of nodes and connections, where edges may originate from multiple sources and have optional weights.

* **principle**:
  Each owner has a network containing nodes. Each node maintains an adjacency array of outgoing edges. Changes to edges (addition/removal) reflect immediately in the owner's network. This allows fully general, multi-layered graphs per owner.

* **state**:
  * a set of `Networks` with
    * `owner` Owner
    * `nodes` array of Node
  * a set of `AdjacencyLists` with
    * `owner` Owner
    * `node` Node
    * `edges` array of
      * `to` Node
      * `source` Source
      * `weight` Number?

* **actions**:

  * `createNetwork(owner: Owner): Empty`
    * **requires**:
      * No `Networks` entry exists for `owner`.
    * **effects**:
      * Creates a new network for the owner with an empty node list and adjacency lists.

  * `addNode(owner: Owner, node: Node): Empty`
    * **requires**:
      * Network for `owner` exists.
      * Node does not already exist in the network.
    * **effects**:
      * Adds a new node to the owner's network.
      * Initializes an empty adjacency list for the node.

  * `removeNode(owner: Owner, node: Node): Empty`
    * **requires**:
      * Node exists in the owner's network.
    * **effects**:
      * Deletes the node and all outgoing edges from it.
      * Deletes all incoming edges to this node in other nodes' adjacency lists in the owner's network.

  * `addEdge(owner: Owner, from: Node, to: Node, source: Source, weight?: Number): Empty`
    * **requires**:
      * `from` and `to` nodes exist in the owner's network.
      * `from != to`.
    * **effects**:
      * Adds or updates an edge from `from` to `to` with the given `source` and optional `weight`.
      * If the edge from the same `from → to` with the same `source` exists, updates the weight.

  * `removeEdge(owner: Owner, from: Node, to: Node, source: Source): Empty`
    * **requires**:
      * An edge exists from `from` to `to` with the given `source` in the owner's network.
    * **effects**:
      * Removes the specified edge.

  * `getAdjacencyList(owner: Owner, node: Node): Array<{to: Node, source: Source, weight?: Number}>`
    * **requires**:
      * Node exists in the owner's network.
    * **effects**:
      * Returns the adjacency list of outgoing edges from the specified node.

Can you help me modify this concept so its state and actions have the correct structure?
