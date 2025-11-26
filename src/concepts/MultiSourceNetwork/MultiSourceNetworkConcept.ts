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
   *   If `root` is not provided, defaults to `owner`.
   *   Automatically adds the owner as a membership node with source "self".
   */
  async createNetwork(
    { owner, root }: { owner: Owner; root?: Node },
  ): Promise<{ error?: string; network?: Owner }> {
    console.log("[MultiSourceNetwork] createNetwork called:", { owner, root });
    const existingNetwork = await this.networks.findOne({ owner });
    if (existingNetwork) {
      console.log("[MultiSourceNetwork] createNetwork ERROR: Network already exists for owner", owner);
      return { error: `Network for owner ${owner} already exists` };
    }

    // Default root to owner if not provided
    const rootNode = root || owner;
    console.log("[MultiSourceNetwork] createNetwork: Using root node:", rootNode);

    // Create the network
    await this.networks.insertOne({ _id: owner, owner, root: rootNode });
    console.log("[MultiSourceNetwork] createNetwork: Network document created");

    // Automatically add the owner as a membership node with source "self"
    // This ensures the owner always appears as a node in their own network
    const selfSource = "self" as Source;
    const ownerMembership = await this.memberships.findOne({ owner, node: owner });
    if (!ownerMembership) {
      // Create new membership for owner
      await this.memberships.insertOne({
        _id: freshID(),
        owner,
        node: owner,
        sources: { [selfSource]: true },
      });
      console.log("[MultiSourceNetwork] createNetwork: Owner membership created with source 'self'");
    } else {
      // If membership already exists, ensure "self" source is present
      // This handles edge cases where owner membership might exist from elsewhere
      await this.memberships.updateOne(
        { owner, node: owner },
        { $set: { [`sources.${selfSource}`]: true } },
      );
      console.log("[MultiSourceNetwork] createNetwork: Owner membership updated with source 'self'");
    }

    console.log("[MultiSourceNetwork] createNetwork SUCCESS: Network created for owner", owner);
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
    console.log("[MultiSourceNetwork] setRootNode called:", { owner, root });
    const existingNetwork = await this.networks.findOne({ owner });
    if (!existingNetwork) {
      console.log("[MultiSourceNetwork] setRootNode ERROR: Network does not exist for owner", owner);
      return { error: `Network for owner ${owner} does not exist` };
    }

    const membership = await this.memberships.findOne({ owner, node: root });
    if (!membership) {
      console.log("[MultiSourceNetwork] setRootNode ERROR: Node", root, "is not a member of owner", owner, "network");
      return {
        error: `Node ${root} is not a member of owner ${owner}'s network`,
      };
    }

    await this.networks.updateOne({ owner }, { $set: { root } });
    console.log("[MultiSourceNetwork] setRootNode SUCCESS: Root node set to", root, "for owner", owner);
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
    console.log("[MultiSourceNetwork] addNodeToNetwork called:", { owner, node, source });
    const membership = await this.memberships.findOne({ owner, node });
    if (!membership) {
      await this.memberships.insertOne({
        _id: freshID(),
        owner,
        node,
        sources: { [source]: true },
      });
      console.log("[MultiSourceNetwork] addNodeToNetwork SUCCESS: New membership created for node", node, "with source", source);
      return {};
    }

    await this.memberships.updateOne(
      { owner, node },
      { $set: { [`sources.${source}`]: true } },
    );
    console.log("[MultiSourceNetwork] addNodeToNetwork SUCCESS: Updated existing membership for node", node, "added source", source);
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
    console.log("[MultiSourceNetwork] removeNodeFromNetwork called:", { owner, node, source: source || "undefined (remove entirely)" });
    const membership = await this.memberships.findOne({ owner, node });
    if (!membership) {
      console.log("[MultiSourceNetwork] removeNodeFromNetwork ERROR: Node", node, "not in network for owner", owner);
      return { error: `Node ${node} for owner ${owner} is not in the network` };
    }

    if (source) {
      // Remove a single source
      await this.memberships.updateOne(
        { _id: membership._id },
        { $unset: { [`sources.${source}`]: "" } },
      );
      console.log("[MultiSourceNetwork] removeNodeFromNetwork: Removed source", source, "from node", node);

      const updatedMembership = await this.memberships.findOne({
        _id: membership._id,
      });
      const sourcesEmpty = !updatedMembership || !updatedMembership.sources ||
        Object.keys(updatedMembership.sources).length === 0;

      if (sourcesEmpty) {
        // Delete node and edges if no sources left
        await this.memberships.deleteOne({ _id: membership._id });
        const deleteResult = await this.edges.deleteMany({
          owner,
          $or: [{ from: node }, { to: node }],
        });
        console.log("[MultiSourceNetwork] removeNodeFromNetwork SUCCESS: Node", node, "removed entirely (no sources left). Deleted", deleteResult.deletedCount, "edges");
      } else {
        console.log("[MultiSourceNetwork] removeNodeFromNetwork SUCCESS: Source", source, "removed from node", node, "(node still has other sources)");
      }
    } else {
      // Remove node entirely
      await this.memberships.deleteOne({ owner, node });
      const deleteResult = await this.edges.deleteMany({
        owner,
        $or: [{ from: node }, { to: node }],
      });
      console.log("[MultiSourceNetwork] removeNodeFromNetwork SUCCESS: Node", node, "removed entirely. Deleted", deleteResult.deletedCount, "edges");
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
    console.log("[MultiSourceNetwork] addEdge called:", { owner, from, to, source, weight });
    if (from === to) {
      console.log("[MultiSourceNetwork] addEdge ERROR: Cannot create edge from node to itself");
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
    console.log("[MultiSourceNetwork] addEdge SUCCESS: Edge created/updated from", from, "to", to, "with source", source, weight ? `(weight: ${weight})` : "(no weight)");
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
    console.log("[MultiSourceNetwork] removeEdge called:", { owner, from, to, source });
    const existingEdge = await this.edges.findOne({ owner, from, to, source });
    if (!existingEdge) {
      console.log("[MultiSourceNetwork] removeEdge ERROR: Edge does not exist");
      return {
        error:
          `Specified edge for owner ${owner} from ${from} to ${to} from source ${source} does not exist`,
      };
    }

    await this.edges.deleteOne({ owner, from, to, source });
    console.log("[MultiSourceNetwork] removeEdge SUCCESS: Edge removed from", from, "to", to, "with source", source);
    return {};
  }

  async _getAdjacencyArray(
    { owner }: { owner: Owner },
  ): Promise<
    Record<Node, Array<{ to: Node; source: Source; weight?: number }>>
  > {
    console.log("[MultiSourceNetwork] _getAdjacencyArray called for owner:", owner);
    const adjacency: Record<
      Node,
      Array<{ to: Node; source: Source; weight?: number }>
    > = {};

    // First, get all memberships to initialize nodes
    const memberships = await this.memberships.find({ owner }).toArray();
    console.log("[MultiSourceNetwork] _getAdjacencyArray: Found", memberships.length, "memberships");
    for (const m of memberships) {
      adjacency[m.node] = [];
    }

    // Then, get all edges and populate connections
    const ownerEdges = await this.edges.find({ owner }).toArray();
    console.log("[MultiSourceNetwork] _getAdjacencyArray: Found", ownerEdges.length, "edges");
    for (const edge of ownerEdges) {
      // Ensure the "from" node exists in adjacency (even if not in memberships)
      if (!adjacency[edge.from]) {
        adjacency[edge.from] = [];
        console.log("[MultiSourceNetwork] _getAdjacencyArray: Added 'from' node", edge.from, "to adjacency (not in memberships)");
      }

      // Add the edge connection
      adjacency[edge.from].push({
        to: edge.to,
        source: edge.source,
        weight: edge.weight,
      });

      // // Also ensure the "to" node exists in adjacency (even if not in memberships)
      // // This handles cases where a node is only referenced as a target
      // if (!adjacency[edge.to]) adjacency[edge.to] = [];
    }

    const nodeCount = Object.keys(adjacency).length;
    const totalEdges = Object.values(adjacency).reduce((sum, edges) => sum + edges.length, 0);
    console.log("[MultiSourceNetwork] _getAdjacencyArray SUCCESS: Returning adjacency with", nodeCount, "nodes and", totalEdges, "total connections");
    console.log("[MultiSourceNetwork] _getAdjacencyArray: Adjacency keys:", Object.keys(adjacency));
    return adjacency;
  }
}
