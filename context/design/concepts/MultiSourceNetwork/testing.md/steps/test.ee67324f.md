---
timestamp: 'Sat Nov 22 2025 13:22:30 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_132230.04adc768.md]]'
content_id: ee67324f71e7f7d29dbf47db2035554a3a519f386f6a9ebba83ce5be60de18f1
---

# test: MultiSourceNetwork

I'm getting the following filing test cases:
Principle: Owner creates network, adds nodes and edges, adjacency forms correctly => ./src/concepts/MultiSourceNetwork/MultiSouceNetworkConcept.test.ts:12:6
Action: Adding the same node with multiple sources updates sources array => ./src/concepts/MultiSourceNetwork/MultiSouceNetworkConcept.test.ts:78:6
Action: Removing node with one source leaves node if other sources exist => ./src/concepts/MultiSourceNetwork/MultiSouceNetworkConcept.test.ts:109:6
Action: Removing node with no sources deletes node and edges => ./src/concepts/MultiSourceNetwork/MultiSouceNetworkConcept.test.ts:150:6
Edge case: Cannot add edge from node to itself => ./src/concepts/MultiSourceNetwork/MultiSouceNetworkConcept.test.ts:196:6
Integration: Add multiple nodes and edges, remove sources, check adjacency => ./src/concepts/MultiSourceNetwork/MultiSouceNetworkConcept.test.ts:239:6

This is the implementation:

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
  async addNodeToNetwork({ owner, node, source }: {
    owner: Owner;
    node: Node;
    source: Source;
  }): Promise<Empty | { error: string }> {
    await this.memberships.updateOne(
      { owner, node },
      {
        $setOnInsert: {
          _id: freshID(),
          owner,
          node,
          sources: {},
        },
        $set: {
          [`sources.${source}`]: true,
        },
      },
      { upsert: true },
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

and my test cases:

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import MultiSourceNetworkConcept from "./MultiSourceNetworkConcept.ts";

const ownerA = "owner:Alice" as ID;
const nodeB = "node:Bob" as ID;
const nodeC = "node:Charlie" as ID;
const source1 = "source:1" as ID;
const source2 = "source:2" as ID;

Deno.test("Principle: Owner creates network, adds nodes and edges, adjacency forms correctly", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    // 1. Create network
    const createResult = await network.createNetwork({ owner: ownerA });
    assertNotEquals(
      "error" in createResult,
      true,
      "Network creation should succeed.",
    );

    // 2. Add nodes
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeC,
      source: source2,
    });

    // 3. Verify memberships exist
    const membershipB = await network.memberships.findOne({
      owner: ownerA,
      node: nodeB,
    });
    assertExists(membershipB, "NodeB should exist in memberships.");

    const membershipC = await network.memberships.findOne({
      owner: ownerA,
      node: nodeC,
    });
    assertExists(membershipC, "NodeC should exist in memberships.");

    // 4. Add edge from B to C
    await network.addEdge({
      owner: ownerA,
      from: nodeB,
      to: nodeC,
      source: source1,
      weight: 5,
    });

    const edges = await network.edges.find({ owner: ownerA }).toArray();
    assertEquals(edges.length, 1, "There should be one edge in the network.");
    assertEquals(edges[0].from, nodeB);
    assertEquals(edges[0].to, nodeC);
    assertEquals(edges[0].weight, 5);

    // 5. Form adjacency array
    const adjacency = await network._getAdjacencyArray(ownerA);
    assertEquals(
      adjacency[nodeB].length,
      1,
      "NodeB should have one outgoing edge.",
    );
    assertEquals(adjacency[nodeB][0].to, nodeC, "Edge should point to NodeC.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: Adding the same node with multiple sources updates sources array", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    await network.createNetwork({ owner: ownerA });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source2,
    });

    const membershipB = await network.memberships.findOne({
      owner: ownerA,
      node: nodeB,
    });
    assertEquals(
      Object.keys(membershipB?.sources || {}).length,
      2,
      "NodeB should have two sources.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: Removing node with one source leaves node if other sources exist", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    await network.createNetwork({ owner: ownerA });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source2,
    });

    await network.removeNodeFromNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });

    const membershipB = await network.memberships.findOne({
      owner: ownerA,
      node: nodeB,
    });
    assertExists(
      membershipB,
      "NodeB should still exist since it has another source.",
    );
    assertEquals(
      Object.keys(membershipB?.sources || {}).length,
      1,
      "NodeB should have only one remaining source.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: Removing node with no sources deletes node and edges", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    await network.createNetwork({ owner: ownerA });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeC,
      source: source1,
    });
    await network.addEdge({
      owner: ownerA,
      from: nodeB,
      to: nodeC,
      source: source1,
    });

    await network.removeNodeFromNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });

    const membershipB = await network.memberships.findOne({
      owner: ownerA,
      node: nodeB,
    });
    assertEquals(membershipB, null, "NodeB should be deleted.");

    const edges = await network.edges.find({ owner: ownerA }).toArray();
    assertEquals(
      edges.length,
      0,
      "All edges involving NodeB should be deleted.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Edge case: Cannot add edge from node to itself", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    await network.createNetwork({ owner: ownerA });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });

    const result = await network.addEdge({
      owner: ownerA,
      from: nodeB,
      to: nodeB,
      source: source1,
    });
    assertEquals("error" in result, true, "Adding self-edge should fail.");
  } finally {
    await client.close();
  }
});

Deno.test("Edge case: Removing non-existent node returns error", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    const result = await network.removeNodeFromNetwork({
      owner: ownerA,
      node: "node:fake" as ID,
    });
    assertEquals(
      "error" in result,
      true,
      "Removing a node that does not exist should fail.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Integration: Add multiple nodes and edges, remove sources, check adjacency", async () => {
  const [db, client] = await testDb();
  const network = new MultiSourceNetworkConcept(db);

  try {
    await network.createNetwork({ owner: ownerA });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeB,
      source: source1,
    });
    await network.addNodeToNetwork({
      owner: ownerA,
      node: nodeC,
      source: source1,
    });
    await network.addEdge({
      owner: ownerA,
      from: nodeB,
      to: nodeC,
      source: source1,
      weight: 2,
    });

    await network.removeNodeFromNetwork({
      owner: ownerA,
      node: nodeC,
      source: source1,
    });

    const adjacency = await network._getAdjacencyArray(ownerA);
    assertEquals(
      adjacency[nodeB]?.length,
      0,
      "Edges to removed node should no longer appear.",
    );
  } finally {
    await client.close();
  }
});

```
