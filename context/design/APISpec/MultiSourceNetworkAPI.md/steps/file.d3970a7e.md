---
timestamp: 'Tue Nov 25 2025 04:57:04 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251125_045704.aeecee7b.md]]'
content_id: d3970a7e3a3f863407eaaba3da7c14bb001a195c8902f01b4c7fdbf7b1dce205
---

# file: src\concepts\MultiSourceNetwork\MultiSourceNetworkConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "MultiSourceNetwork" + ".";

// Generic types of this concept
type Owner = ID;
type Node = ID;
type Source = ID;

/**
 * a set of Networks with
 *   owner Owner
 *   root Node?
 */
interface NetworkDoc {
  _id: Owner; // Using owner as _id for Networks for direct lookup and uniqueness
  owner: Owner;
  root?: Node;
}

/**
 * a set of Memberships with
 *   owner Owner
 *   node Node
 *   sources Record<Source, true>
 */
interface MembershipDoc {
  _id: ID; // Unique ID for each membership entry
  owner: Owner;
  node: Node;
  sources: Record<Source, true>; // Maps source ID to true if it contributes to this node's presence
}

/**
 * a set of Edges with
 *   owner Owner
 *   from Node
 *   to Node
 *   source Source
 *   weight Number?
 */
interface EdgeDoc {
  _id: ID; // Unique ID for each edge
  owner: Owner;
  from: Node;
  to: Node;
  source: Source;
  weight?: number;
}

export default class MultiSourceNetworkConcept {
  networks: Collection<NetworkDoc>;
  memberships: Collection<MembershipDoc>;
  edges: Collection<EdgeDoc>;

  constructor(private readonly db: Db) {
    this.networks = this.db.collection(PREFIX + "networks");
    this.memberships = this.db.collection(PREFIX + "memberships");
    this.edges = this.db.collection(PREFIX + "edges");
  }

  /**
   * createNetwork (owner: Owner, root: Node?): Empty
   *
   * **requires**:
   *   No `Networks` entry exists for `owner`.
   *
   * **effects**:
   *   Creates a new `Networks` entry for the owner with optional `root`.
   */
  async createNetwork(
    { owner, root }: { owner: Owner; root?: Node },
  ): Promise<{ error?: string; network?: Owner }> {
    const existingNetwork = await this.networks.findOne({ owner });
    if (existingNetwork) {
      return { error: `Network for owner ${owner} already exists` };
    }

    await this.networks.insertOne({ _id: owner, owner, root });
    return { network: owner };
  }

  /**
   * setRootNode (owner: Owner, root: Node): Empty
   *
   * **requires**:
   *   A `Networks` entry exists for `owner`.
   *   A `Memberships` entry exists for `(owner, root)`.
   *
   * **effects**:
   *   Sets the `root` field for the owner’s network.
   */
  async setRootNode(
    { owner, root }: { owner: Owner; root: Node },
  ): Promise<Empty | { error: string }> {
    const existingNetwork = await this.networks.findOne({ owner });
    if (!existingNetwork) {
      return { error: `Network for owner ${owner} does not exist` };
    }

    const membership = await this.memberships.findOne({ owner, node: root });
    if (!membership) {
      return {
        error: `Node ${root} is not a member of owner ${owner}'s network`,
      };
    }

    await this.networks.updateOne({ owner }, { $set: { root } });
    return {};
  }

  /**
   * addNodeToNetwork (owner: Owner, node: Node, source: Source): Empty
   *
   * **requires**: none.
   *
   * **effects**:
   *   Creates or updates a `Memberships` entry by adding `source` to the node’s source set.
   */
  async addNodeToNetwork(
    { owner, node, source }: { owner: Owner; node: Node; source: Source },
  ): Promise<Empty | { error: string }> {
    const membership = await this.memberships.findOne({ owner, node });
    if (!membership) {
      await this.memberships.insertOne({
        _id: freshID(),
        owner,
        node,
        sources: { [source]: true },
      });
      return {};
    }

    await this.memberships.updateOne(
      { owner, node },
      { $set: { [`sources.${source}`]: true } },
    );

    return {};
  }

  /**
   * removeNodeFromNetwork (owner: Owner, node: Node, source: Source?): Empty
   *
   * **requires**:
   *   A `Memberships` entry exists for `(owner, node)`.
   *
   * **effects**:
   *   If `source` is provided: remove it from the node’s `sources` set.
   *   If `sources` becomes empty: delete the `Memberships` entry and all corresponding `Edges` for the owner.
   *   If `source` is not provided: delete the `Memberships` entry and all corresponding `Edges` for the owner.
   */
  async removeNodeFromNetwork(
    { owner, node, source }: { owner: Owner; node: Node; source?: Source },
  ): Promise<Empty | { error: string }> {
    const membership = await this.memberships.findOne({ owner, node });
    if (!membership) {
      return { error: `Node ${node} for owner ${owner} is not in the network` };
    }

    if (source) {
      // Remove a single source
      await this.memberships.updateOne(
        { _id: membership._id },
        { $unset: { [`sources.${source}`]: "" } },
      );

      const updatedMembership = await this.memberships.findOne({
        _id: membership._id,
      });
      const sourcesEmpty = !updatedMembership || !updatedMembership.sources ||
        Object.keys(updatedMembership.sources).length === 0;

      if (sourcesEmpty) {
        // Delete node and edges if no sources left
        await this.memberships.deleteOne({ _id: membership._id });
        await this.edges.deleteMany({
          owner,
          $or: [{ from: node }, { to: node }],
        });
      }
    } else {
      // Remove node entirely
      await this.memberships.deleteOne({ owner, node });
      await this.edges.deleteMany({
        owner,
        $or: [{ from: node }, { to: node }],
      });
    }

    return {};
  }

  /**
   * addEdge (owner: Owner, from: Node, to: Node, source: Source, weight: Number?): Empty
   *
   * **requires**:
   *   `from != to`.
   *
   * **effects**:
   *   Creates or updates an `Edges` entry for `(owner, from, to, source)` with optional `weight`.
   */
  async addEdge(
    { owner, from, to, source, weight }: {
      owner: Owner;
      from: Node;
      to: Node;
      source: Source;
      weight?: number;
    },
  ): Promise<Empty | { error: string }> {
    if (from === to) {
      return {
        error:
          "Cannot create an edge from a node to itself (`from` and `to` nodes are identical)",
      };
    }

    await this.edges.updateOne(
      { owner, from, to, source },
      {
        $setOnInsert: { _id: freshID(), owner, from, to, source },
        $set: { weight },
      },
      { upsert: true },
    );

    return {};
  }

  /**
   * removeEdge (owner: Owner, from: Node, to: Node, source: Source): Empty
   *
   * **requires**:
   *   An `Edges` entry exists for `(owner, from, to, source)`.
   *
   * **effects**:
   *   Removes the specified edge.
   */
  async removeEdge(
    { owner, from, to, source }: {
      owner: Owner;
      from: Node;
      to: Node;
      source: Source;
    },
  ): Promise<Empty | { error: string }> {
    const existingEdge = await this.edges.findOne({ owner, from, to, source });
    if (!existingEdge) {
      return {
        error:
          `Specified edge for owner ${owner} from ${from} to ${to} from source ${source} does not exist`,
      };
    }

    await this.edges.deleteOne({ owner, from, to, source });
    return {};
  }

  async _getAdjacencyArray(
    owner: Owner,
  ): Promise<
    Record<Node, Array<{ to: Node; source: Source; weight?: number }>>
  > {
    const adjacency: Record<
      Node,
      Array<{ to: Node; source: Source; weight?: number }>
    > = {};

    const memberships = await this.memberships.find({ owner }).toArray();
    for (const m of memberships) {
      adjacency[m.node] = [];
    }

    const ownerEdges = await this.edges.find({ owner }).toArray();
    for (const edge of ownerEdges) {
      if (!adjacency[edge.from]) adjacency[edge.from] = [];
      adjacency[edge.from].push({
        to: edge.to,
        source: edge.source,
        weight: edge.weight,
      });
    }

    return adjacency;
  }
}

```

***

title: MultiSourceNetwork API Spec
description: autogenerated prompt instructions for the MultiSourceNetwork concept
---------------------------------------------------------------------------------
