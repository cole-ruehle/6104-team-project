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
  label?: string; // Optional label for the node (e.g., firstName+lastName for LinkedIn connections)
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

/**
 * Canonical Node document stored by MultiSourceNetwork for search and display.
 */
interface NodeDoc {
  _id: ID;
  // map of external source -> external id (e.g. { linkedin: 'urn:li:person:xyz' })
  sourceIds?: Record<string, string>;
  label?: string; // human display name
  firstName?: string;
  lastName?: string;
  headline?: string;
  profileUrl?: string;
  avatarUrl?: string;
  // LinkedIn-like optional profile fields
  location?: string;
  industry?: string;
  currentPosition?: string;
  currentCompany?: string;
  profilePictureUrl?: string; // original field name from LinkedIn import
  summary?: string;
  skills?: string[];
  education?: Array<{
    school?: string;
    degree?: string;
    fieldOfStudy?: string;
    startYear?: number;
    endYear?: number;
  }>;
  experience?: Array<{
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  tags?: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export default class MultiSourceNetworkConcept {
  networks: Collection<NetworkDoc>;
  memberships: Collection<MembershipDoc>;
  edges: Collection<EdgeDoc>;
  nodes: Collection<NodeDoc>;

  constructor(private readonly db: Db) {
    this.networks = this.db.collection(PREFIX + "networks");
    this.memberships = this.db.collection(PREFIX + "memberships");
    this.edges = this.db.collection(PREFIX + "edges");
    this.nodes = this.db.collection(PREFIX + "nodes");
    // Create a basic text index for searching node labels/headlines/tags
    this.nodes.createIndex(
      {
        label: "text",
        headline: "text",
        tags: "text",
        firstName: "text",
        lastName: "text",
      },
      { name: "NodesTextIndex", default_language: "english" },
    ).catch(() => {});
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
      // Network already exists - ensure root is set if provided
      if (root && existingNetwork.root !== root) {
        await this.networks.updateOne({ owner }, { $set: { root } });
        console.log(
        "[MultiSourceNetwork] createNetwork: Network exists, updated root node to", root);
      } else {
        console.log("[MultiSourceNetwork] createNetwork: Network already exists for owner",
        owner,
      );
      }
      // Ensure owner membership exists
      const selfSource = "self" as Source;
      const ownerMembership = await this.memberships.findOne({ owner, node: owner });
      if (!ownerMembership) {
        await this.memberships.insertOne({
          _id: freshID(),
          owner,
          node: owner,
          sources: { [selfSource]: true },
        });
        console.log("[MultiSourceNetwork] createNetwork: Owner membership created with source 'self'");
      }
      return { network: owner };
    }

    // Default root to owner if not provided
    const rootNode = root || owner;
    console.log(
      "[MultiSourceNetwork] createNetwork: Using root node:",
      rootNode,
    );

    // Create the network
    await this.networks.insertOne({ _id: owner, owner, root: rootNode });
    console.log("[MultiSourceNetwork] createNetwork: Network document created");

    // Automatically add the owner as a membership node with source "self"
    // This ensures the owner always appears as a node in their own network
    const now = new Date();
    try {
      await this.nodes.insertOne({
        _id: owner,
        createdAt: now,
        updatedAt: now,
        label: String(owner),
        firstName: "Self",
        lastName: "",
      } as unknown as NodeDoc);
    } catch (_e) {
      // best-effort: ignore insert errors (concurrent create)
    }
    const selfSource = "self" as Source;
    const ownerMembership = await this.memberships.findOne({
      owner,
      node: owner,
    });
    if (!ownerMembership) {
      // Create new membership for owner
      await this.memberships.insertOne({
        _id: freshID(),
        owner,
        node: owner,
        sources: { [selfSource]: true },
      });
      console.log(
        "[MultiSourceNetwork] createNetwork: Owner membership created with source 'self'",
      );
    } else {
      // If membership already exists, ensure "self" source is present
      // This handles edge cases where owner membership might exist from elsewhere
      await this.memberships.updateOne(
        { owner, node: owner },
        { $set: { [`sources.${selfSource}`]: true } },
      );
      console.log(
        "[MultiSourceNetwork] createNetwork: Owner membership updated with source 'self'",
      );
    }

    // Ensure there's a canonical node document for the owner so edges can reference it.
    try {
      const ownerNode = await this.nodes.findOne({ _id: owner });
      if (!ownerNode) {
        const now = new Date();
        await this.nodes.insertOne({
          _id: owner,
          createdAt: now,
          updatedAt: now,
          label: String(owner),
        } as unknown as NodeDoc);
        console.log(
          "[MultiSourceNetwork] createNetwork: Created owner node document",
          owner,
        );
      }
    } catch (e) {
      // best-effort: do not fail network creation if node insert fails
      console.warn(
        "[MultiSourceNetwork] createNetwork: could not ensure owner node",
        e,
      );
    }

    console.log(
      "[MultiSourceNetwork] createNetwork SUCCESS: Network created for owner",
      owner,
    );
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
      console.log(
        "[MultiSourceNetwork] setRootNode ERROR: Network does not exist for owner",
        owner,
      );
      return { error: `Network for owner ${owner} does not exist` };
    }

    const membership = await this.memberships.findOne({ owner, node: root });
    if (!membership) {
      console.log(
        "[MultiSourceNetwork] setRootNode ERROR: Node",
        root,
        "is not a member of owner",
        owner,
        "network",
      );
      return {
        error: `Node ${root} is not a member of owner ${owner}'s network`,
      };
    }

    await this.networks.updateOne({ owner }, { $set: { root } });
    console.log(
      "[MultiSourceNetwork] setRootNode SUCCESS: Root node set to",
      root,
      "for owner",
      owner,
    );
    return {};
  }

  /**
   * addNodeToNetwork (owner: Owner, node: Node, source: Source, label?: String): Empty
   *
   * **requires**: none.
   *
   * **effects**:
   *   Creates or updates a `Memberships` entry by adding `source` to the node's source set.
   *   If `label` is provided, stores it for display purposes.
   */
  async addNodeToNetwork(
    {
      owner,
      node,
      source,
      nodeMeta,
    }: {
      owner: Owner;
      node?: Node;
      source: Source;
      nodeMeta?: Partial<NodeDoc> | {
        externalId?: string;
        label?: string;
        avatarUrl?: string;
        sourceIds?: Record<string, string>;
      };
    },
  ): Promise<{ error?: string; node?: ID }> {
    // If no node ID provided but nodeMeta is, create or update canonical node
    let nodeId: Node | undefined = node;
    if (!nodeId && nodeMeta) {
      // When creating a node via nodeMeta through addNodeToNetwork, a node is created and the owner will be added as a member
      // Prepare sourceIds (prefer provided sourceIds, else map externalId)
      const meta = nodeMeta as Partial<NodeDoc>;
      const legacyMeta = nodeMeta as { externalId?: string } | undefined;
      const sourceIds =
        (meta && meta.sourceIds && Object.keys(meta.sourceIds || {}).length > 0)
          ? meta.sourceIds
          : (legacyMeta && legacyMeta.externalId
            ? { [source]: legacyMeta.externalId }
            : undefined);
      // Derive names from label if possible
      let firstName: string | undefined;
      let lastName: string | undefined;
      if (meta && meta.label) {
        const parts = meta.label.trim().split(/\s+/);
        if (parts.length >= 2) {
          firstName = parts[0];
          lastName = parts.slice(1).join(" ");
        } else if (parts.length === 1) {
          firstName = parts[0];
        }
      }
      const res = await this.createNodeForUser({
        owner,
        firstName: firstName || "",
        lastName: lastName || "",
        label: meta?.label,
        headline: meta?.headline,
        profileUrl: meta?.profileUrl,
        avatarUrl: meta?.avatarUrl || meta?.profilePictureUrl,
        tags: meta?.tags,
        sourceIds,
        location: meta?.location,
        industry: meta?.industry,
        currentPosition: meta?.currentPosition,
        currentCompany: meta?.currentCompany,
        profilePictureUrl: meta?.profilePictureUrl,
        summary: meta?.summary,
        skills: meta?.skills,
        education: meta?.education,
        experience: meta?.experience,
      });
      if (res.error) return { error: res.error };
      nodeId = res.node as Node;
    }
    if (!nodeId) {
      return { error: "node or nodeMeta required" };
    }

    const membership = await this.memberships.findOne({ owner, node: nodeId });
    if (!membership) {
      const membershipData: any = {
        _id: freshID(),
        owner,
        node: nodeId,
        sources: { [source]: true },
      });
      return { node: nodeId };
    }

    // Update membership: add source and optionally update label
    const updateData: any = { [`sources.${source}`]: true };
    if (label) {
      updateData.label = label;
      console.log("[MultiSourceNetwork] addNodeToNetwork: Updating label to:", label);
    }
    await this.memberships.updateOne(
      { owner, node: nodeId },
      { $set: { [`sources.${source}`]: true } },
    );

    return { node: nodeId };
  }

  // NOTE: createNode was removed; use createNodeForUser for owner-scoped creation.

  async updateNode(
    { node, meta, updater }: {
      node: Node;
      meta?: Partial<NodeDoc>;
      updater: Owner;
    },
  ): Promise<{ node?: ID; error?: string }> {
    const existing = await this.nodes.findOne({ _id: node });
    if (!existing) return { error: `Node ${node} not found` };

    // Require updater to be a member of the node
    const membership = await this.memberships.findOne({ owner: updater, node });
    if (!membership) return { error: `Not authorized to update node ${node}` };

    const updateData: Record<string, unknown> = {
      // Avoid copying immutable or internal fields (e.g. _id) into the update
      // MongoDB will throw if we attempt to set _id in an update.
      ...((() => {
        if (!meta) return {};
        // Copy all keys except _id
        const filtered: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(meta)) {
          if (k === "_id") continue;
          filtered[k] = v;
        }
        return filtered;
      })()),
      updatedAt: new Date(),
    };
    await this.nodes.updateOne({ _id: node }, { $set: updateData });
    return { node };
  }

  /**
   * searchNodes ({ query, limit = 20, offset = 0, publicOnly = true })
   * Returns a paginated list of node metadata for UI listing.
   */
  async searchNodes(
    { owner, query, limit = 20, offset = 0 }: {
      owner: Owner;
      query?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ results: Array<Record<string, unknown>>; total: number }> {
    // Only return nodes that the owner has membership to. Node visibility is controlled by memberships.
    // Get membership node ids for owner
    const memberships = await this.memberships.find({ owner }, {
      projection: { node: 1 },
    }).toArray();
    const nodeIds = memberships.map((m) => m.node);
    if (nodeIds.length === 0) return { results: [], total: 0 };

    const filter: Record<string, unknown> = { _id: { $in: nodeIds } };
    if (query && query.trim() !== "") {
      const q = query.trim();
      // Only search against firstName and lastName fields (case-insensitive substring match)
      filter.$or = [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
      ];
    }

    const total = await this.nodes.countDocuments(filter);
    const cursor = this.nodes.find(filter, {
      projection: {
        label: 1,
        firstName: 1,
        lastName: 1,
        headline: 1,
        avatarUrl: 1,
        profileUrl: 1,
        sourceIds: 1,
      },
    });
    const results = await cursor.skip(offset).limit(limit).toArray();
    return { results, total };
  }

  /**
   * addOrMigrateNodeFromSource ({ owner, legacyNodeId, source, nodeMeta, externalId }): { node }
   * - Creates or finds a canonical node from source+externalId/nodeMeta
   * - Migrates an existing membership that referenced the legacy node id (e.g., LinkedInImport connection id)
   *   to reference the canonical node, merging sources if necessary.
   */
  async addOrMigrateNodeFromSource({
    owner,
    legacyNodeId,
    source,
    nodeMeta,
    externalId,
  }: {
    owner: Owner;
    legacyNodeId?: Node;
    source: Source;
    nodeMeta?: Partial<NodeDoc> | Record<string, unknown>;
    externalId?: string;
  }): Promise<{ node: ID }> {
    // Normalize well-known source identifiers to human-friendly labels used in memberships
    // For example, accept 'linkedin' (or other lowercase variants) and store as 'LinkedIn'
    const normalizedSource: Source = (typeof source === "string" &&
        (source as string).toLowerCase() === "linkedin")
      ? ("LinkedIn" as Source)
      : source;
    // Create (or find existing) canonical node scoped to owner
    // Prepare sourceIds: prefer provided nodeMeta.sourceIds, otherwise use externalId mapping
    const providedMeta = (nodeMeta || {}) as Partial<NodeDoc>;
    const sourceIds = providedMeta.sourceIds &&
        Object.keys(providedMeta.sourceIds || {}).length > 0
      ? providedMeta.sourceIds
      : (externalId ? { [source]: externalId } : undefined);

    // Derive first/last names if available in meta or label
    let firstName = providedMeta.firstName;
    let lastName = providedMeta.lastName;
    if ((!firstName || !lastName) && providedMeta.label) {
      const parts = (providedMeta.label || "").trim().split(/\s+/);
      if (parts.length >= 2) {
        firstName = firstName || parts[0];
        lastName = lastName || parts.slice(1).join(" ");
      } else if (parts.length === 1) {
        firstName = firstName || parts[0];
      }
    }

    const createRes = await this.createNodeForUser({
      owner,
      firstName: firstName || "",
      lastName: lastName || "",
      label: providedMeta.label,
      headline: providedMeta.headline,
      profileUrl: providedMeta.profileUrl,
      avatarUrl: providedMeta.avatarUrl || providedMeta.profilePictureUrl,
      tags: providedMeta.tags,
      sourceIds,
      location: providedMeta.location,
      industry: providedMeta.industry,
      currentPosition: providedMeta.currentPosition,
      currentCompany: providedMeta.currentCompany,
      profilePictureUrl: providedMeta.profilePictureUrl,
      summary: providedMeta.summary,
      skills: providedMeta.skills,
      education: providedMeta.education,
      experience: providedMeta.experience,
      skipMembership: true,
    });
    if (createRes.error) throw new Error(createRes.error);
    const node = createRes.node as ID;
    // Update metadata on the canonical node to reflect latest nodeMeta (owner must be updater)
    if (node && nodeMeta) {
      await this.updateNode({
        node: node as Node,
        meta: nodeMeta as Partial<NodeDoc>,
        updater: owner,
      });
    }

    // Helper: upsert both owner->node and node->owner edges for this owner/node/source
    const upsertConnectionEdges = async () => {
      try {
        // await this.edges.updateOne(
        //   { owner, from: owner, to: node },
        //   {
        //     $setOnInsert: {
        //       _id: freshID(),
        //       owner,
        //       from: owner,
        //       to: node,
        //     },
        //     $set: { source: normalizedSource, weight: undefined },
        //   },
        //   { upsert: true },
        // );
        await this.edges.updateOne(
          { owner, from: node, to: owner },
          {
            $setOnInsert: {
              _id: freshID(),
              owner,
              from: node,
              to: owner,
            },
            $set: { source: normalizedSource, weight: undefined },
          },
          { upsert: true },
        );
      } catch (_e) {
        // best-effort
      }
    };

    // Find any existing membership that used the legacy node id
    if (legacyNodeId) {
      const oldMembership = await this.memberships.findOne({
        owner,
        node: legacyNodeId,
      });
      const canonicalMembership = await this.memberships.findOne({
        owner,
        node,
      });

      if (oldMembership && !canonicalMembership) {
        // Update the existing legacy membership document to point to canonical node id
        await this.memberships.updateOne({ _id: oldMembership._id }, {
          $set: { node },
        });
        // Ensure source is set (use normalized source label)
        await this.memberships.updateOne({ _id: oldMembership._id }, {
          $set: { [`sources.${normalizedSource}`]: true },
        });
        // Ensure edges exist for owner <-> canonical node
        await upsertConnectionEdges();
        return { node };
      }

      if (oldMembership && canonicalMembership) {
        // Merge sources into canonical membership
        const mergedSources = {
          ...(canonicalMembership.sources || {}),
          ...(oldMembership.sources || {}),
          [normalizedSource]: true,
        } as Record<string, true>;
        await this.memberships.updateOne({ _id: canonicalMembership._id }, {
          $set: { sources: mergedSources },
        });
        // Remove legacy membership
        await this.memberships.deleteOne({ _id: oldMembership._id });
        // Ensure edges exist for owner <-> canonical node
        await upsertConnectionEdges();
        return { node };
      }

      if (!oldMembership && !canonicalMembership) {
        // Create new membership for owner -> canonical node
        await this.memberships.insertOne({
          _id: freshID(),
          owner,
          node,
          sources: { [normalizedSource]: true },
        });
        // Ensure edges exist for owner <-> canonical node
        await upsertConnectionEdges();
        return { node };
      }

      if (!oldMembership && canonicalMembership) {
        // Just ensure the source is present
        await this.memberships.updateOne({ _id: canonicalMembership._id }, {
          $set: { [`sources.${normalizedSource}`]: true },
        });
        // Ensure edges exist for owner <-> canonical node
        await upsertConnectionEdges();
        return { node };
      }
    }

    // No legacy membership to migrate; ensure there's a membership for owner->node
    const existing = await this.memberships.findOne({ owner, node });
    if (!existing) {
      await this.memberships.insertOne({
        _id: freshID(),
        owner,
        node,
        sources: { [normalizedSource]: true },
      });
    } else {
      await this.memberships.updateOne({ _id: existing._id }, {
        $set: { [`sources.${normalizedSource}`]: true },
      });
    }

    // Ensure the owner has a canonical node in the nodes collection.
    // Some flows treat the `owner` id as a node id (for example the owner as root).
    // If it doesn't exist, create a lightweight node for the owner so we can
    // create an edge from the owner to the newly created canonical node.
    const ownerNode = await this.nodes.findOne({ _id: owner });
    if (!ownerNode) {
      const now = new Date();
      try {
        await this.nodes.insertOne({
          _id: owner,
          createdAt: now,
          updatedAt: now,
          label: String(owner),
          firstName: "Self",
          lastName: "",
        } as unknown as NodeDoc);
      } catch (_e) {
        // best-effort: ignore insert errors (concurrent create)
      }
      // Ensure membership exists for owner -> owner
      const ownerMembership = await this.memberships.findOne({
        owner,
        node: owner,
      });
      if (!ownerMembership) {
        await this.memberships.insertOne({
          _id: freshID(),
          owner,
          node: owner,
          sources: { ["self" as unknown as Source]: true },
        });
      }
    }

    return { node };
  }

  /**
   * createNodeForUser ({ owner, firstName, lastName, label?, headline?, profileUrl?, avatarUrl?, tags?, sourceIds? })
   * Convenience helper for frontend: requires firstName and lastName, creates a node owned by the user,
   * and adds a membership linking the user to the node.
   */
  async createNodeForUser({
    owner,
    firstName,
    lastName,
    label,
    headline,
    profileUrl,
    avatarUrl,
    tags,
    sourceIds,
    skipMembership,
    // optional LinkedIn-like fields
    location,
    industry,
    currentPosition,
    currentCompany,
    profilePictureUrl,
    summary,
    skills,
    education,
    experience,
  }: {
    owner: Owner;
    firstName?: string;
    lastName?: string;
    label?: string;
    headline?: string;
    profileUrl?: string;
    avatarUrl?: string;
    tags?: string[];
    sourceIds?: Record<string, string>;
    skipMembership?: boolean;
    location?: string;
    industry?: string;
    currentPosition?: string;
    currentCompany?: string;
    profilePictureUrl?: string;
    summary?: string;
    skills?: string[];
    education?: Array<{
      school?: string;
      degree?: string;
      fieldOfStudy?: string;
      startYear?: number;
      endYear?: number;
    }>;
    experience?: Array<{
      title?: string;
      company?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
    }>;
  }): Promise<{ node?: ID; error?: string }> {
    // Accept either explicit first+last name, or a label we can derive names from.
    let fn = firstName?.trim();
    let ln = lastName?.trim();
    if ((!fn || fn === "") && (!ln || ln === "") && label) {
      const parts = (label || "").trim().split(/\s+/);
      if (parts.length >= 2) {
        fn = parts[0];
        ln = parts.slice(1).join(" ");
      } else if (parts.length === 1) {
        fn = parts[0];
      }
    }

    // Ensure first and last name exist (label may have been used to derive them)
    if (!fn || fn === "" || !ln || ln === "") {
      return { error: "firstName and lastName are required to create a node" };
    }

    // headline is optional for programmatic creation (UI may enforce it)

    const displayLabel = label && label.trim() !== ""
      ? label.trim()
      : `${(fn || "").trim()} ${(ln || "").trim()}`.trim();

    // If sourceIds provided, try to find an existing node for this owner
    if (sourceIds && Object.keys(sourceIds).length > 0) {
      for (const k of Object.keys(sourceIds)) {
        const existing = await this.nodes.findOne({
          [`sourceIds.${k}`]: sourceIds[k as keyof typeof sourceIds],
        });
        if (existing) {
          const nodeId = (existing._id as unknown) as ID;
          // ensure membership exists
          const existingMembership = await this.memberships.findOne({
            owner,
            node: nodeId,
          });
          if (!existingMembership) {
            await this.memberships.insertOne({
              _id: freshID(),
              owner,
              node: nodeId,
              sources: { ["user" as unknown as Source]: true },
            });
          }
          return { node: nodeId };
        }
      }
    }

    // Insert a new node
    const nodeId = freshID() as ID;
    const now = new Date();
    const insertDoc: NodeDoc = {
      _id: nodeId,
      createdAt: now,
      updatedAt: now,
      label: displayLabel,
      firstName: fn,
      lastName: ln,
      headline: headline?.trim(),
      profileUrl: profileUrl?.trim(),
      // prefer explicit avatarUrl, fall back to profilePictureUrl if present
      avatarUrl: (avatarUrl || profilePictureUrl)?.trim(),
      location: location?.trim(),
      industry: industry?.trim(),
      currentPosition: currentPosition?.trim(),
      currentCompany: currentCompany?.trim(),
      profilePictureUrl: profilePictureUrl?.trim(),
      summary: summary?.trim(),
      skills: skills || [],
      education: education || [],
      experience: experience || [],
      tags,
      ...(sourceIds ? { sourceIds } : {}),
    } as NodeDoc;

    await this.nodes.insertOne(insertDoc as unknown as NodeDoc);

    // Ensure membership exists for owner -> node unless caller requested to skip
    const existing = await this.memberships.findOne({ owner, node: nodeId });
    if (!existing && !skipMembership) {
      await this.memberships.insertOne({
        _id: freshID(),
        owner,
        node: nodeId,
        sources: { ["user" as unknown as Source]: true },
      });
    }

    return { node: nodeId };
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
    console.log("[MultiSourceNetwork] removeNodeFromNetwork called:", {
      owner,
      node,
      source: source || "undefined (remove entirely)",
    });
    const membership = await this.memberships.findOne({ owner, node });
    if (!membership) {
      console.log(
        "[MultiSourceNetwork] removeNodeFromNetwork ERROR: Node",
        node,
        "not in network for owner",
        owner,
      );
      return { error: `Node ${node} for owner ${owner} is not in the network` };
    }

    if (source) {
      // Remove a single source
      await this.memberships.updateOne(
        { _id: membership._id },
        { $unset: { [`sources.${source}`]: "" } },
      );
      console.log(
        "[MultiSourceNetwork] removeNodeFromNetwork: Removed source",
        source,
        "from node",
        node,
      );

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
        console.log(
          "[MultiSourceNetwork] removeNodeFromNetwork SUCCESS: Node",
          node,
          "removed entirely (no sources left). Deleted",
          deleteResult.deletedCount,
          "edges",
        );
      } else {
        console.log(
          "[MultiSourceNetwork] removeNodeFromNetwork SUCCESS: Source",
          source,
          "removed from node",
          node,
          "(node still has other sources)",
        );
      }
    } else {
      // Remove node entirely
      await this.memberships.deleteOne({ owner, node });
      const deleteResult = await this.edges.deleteMany({
        owner,
        $or: [{ from: node }, { to: node }],
      });
      console.log(
        "[MultiSourceNetwork] removeNodeFromNetwork SUCCESS: Node",
        node,
        "removed entirely. Deleted",
        deleteResult.deletedCount,
        "edges",
      );
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
    console.log("[MultiSourceNetwork] addEdge called:", {
      owner,
      from,
      to,
      source,
      weight,
    });
    if (from === to) {
      console.log(
        "[MultiSourceNetwork] addEdge ERROR: Cannot create edge from node to itself",
      );
      return {
        error:
          "Cannot create an edge from a node to itself (`from` and `to` nodes are identical)",
      };
    }

    // Authorization: ensure both 'from' and 'to' nodes are members of the owner's network
    const fromMembership = await this.memberships.findOne({
      owner,
      node: from,
    });
    const toMembership = await this.memberships.findOne({ owner, node: to });
    if (!fromMembership || !toMembership) {
      console.log(
        "[MultiSourceNetwork] addEdge ERROR: one or both nodes are not members of owner's network",
      );
      return {
        error: `One or both nodes are not members of owner ${owner}'s network`,
      };
    }

    // Upsert by owner/from/to so that an edge between two nodes is unique per owner.
    // When an edge is re-added from a different source, overwrite the source and weight.
    await this.edges.updateOne(
      { owner, from, to },
      {
        $setOnInsert: { _id: freshID(), owner, from, to },
        $set: { source, weight },
      },
      { upsert: true },
    );
    console.log(
      "[MultiSourceNetwork] addEdge SUCCESS: Edge created/updated from",
      from,
      "to",
      to,
      "with source",
      source,
      weight ? `(weight: ${weight})` : "(no weight)",
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
    console.log("[MultiSourceNetwork] removeEdge called:", {
      owner,
      from,
      to,
      source,
    });
    const existingEdge = await this.edges.findOne({ owner, from, to, source });
    if (!existingEdge) {
      console.log("[MultiSourceNetwork] removeEdge ERROR: Edge does not exist");
      return {
        error:
          `Specified edge for owner ${owner} from ${from} to ${to} from source ${source} does not exist`,
      };
    }

    await this.edges.deleteOne({ owner, from, to, source });
    console.log(
      "[MultiSourceNetwork] removeEdge SUCCESS: Edge removed from",
      from,
      "to",
      to,
      "with source",
      source,
    );
    return {};
  }

  async _getAdjacencyArray(
    { owner }: { owner: Owner },
  ): Promise<{
    adjacency: Record<Node, Array<{ to: Node; source: Source; weight?: number }>>;
    nodeLabels: Record<Node, string | undefined>;
  }> {
    console.log(
      "[MultiSourceNetwork] _getAdjacencyArray called for owner:",
      owner,
    );
    console.log(
      "[MultiSourceNetwork] _getAdjacencyArray: Owner type:",
      typeof owner,
      "value:",
      JSON.stringify(owner),
    );

    // Debug: Check what's actually in the database
    const allMemberships = await this.memberships.find({}).toArray();
    console.log(
      "[MultiSourceNetwork] _getAdjacencyArray: Total memberships in DB:",
      allMemberships.length,
    );
    if (allMemberships.length > 0) {
      console.log(
        "[MultiSourceNetwork] _getAdjacencyArray: Sample membership owner:",
        allMemberships[0].owner,
        "type:",
        typeof allMemberships[0].owner,
      );
      console.log(
        "[MultiSourceNetwork] _getAdjacencyArray: All unique owners in memberships:",
        [...new Set(allMemberships.map((m) => m.owner))],
      );
    }

    const allEdges = await this.edges.find({}).toArray();
    console.log(
      "[MultiSourceNetwork] _getAdjacencyArray: Total edges in DB:",
      allEdges.length,
    );
    if (allEdges.length > 0) {
      console.log(
        "[MultiSourceNetwork] _getAdjacencyArray: Sample edge owner:",
        allEdges[0].owner,
        "type:",
        typeof allEdges[0].owner,
      );
      console.log(
        "[MultiSourceNetwork] _getAdjacencyArray: All unique owners in edges:",
        [...new Set(allEdges.map((e) => e.owner))],
      );
    }

    const adjacency: Record<
      Node,
      Array<{ to: Node; source: Source; weight?: number }>
    > = {};
    const nodeLabels: Record<Node, string | undefined> = {};

    // First, get all memberships to initialize nodes and collect labels
    const memberships = await this.memberships.find({ owner }).toArray();
    console.log(
      "[MultiSourceNetwork] _getAdjacencyArray: Found",
      memberships.length,
      "memberships for owner:",
      owner,
    );
    for (const m of memberships) {
      adjacency[m.node] = [];
      // Store label if available
      if (m.label) {
        nodeLabels[m.node] = m.label;
        console.log("[MultiSourceNetwork] _getAdjacencyArray: Node", m.node, "has label:", m.label);
      }
    }

    // Then, get all edges and populate connections
    const ownerEdges = await this.edges.find({ owner }).toArray();
    console.log(
      "[MultiSourceNetwork] _getAdjacencyArray: Found",
      ownerEdges.length,
      "edges for owner:",
      owner,
    );
    for (const edge of ownerEdges) {
      // Ensure the "from" node exists in adjacency (even if not in memberships)
      if (!adjacency[edge.from]) {
        adjacency[edge.from] = [];
        console.log(
          "[MultiSourceNetwork] _getAdjacencyArray: Added 'from' node",
          edge.from,
          "to adjacency (not in memberships)",
        );
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
    const totalEdges = Object.values(adjacency).reduce(
      (sum, edges) => sum + edges.length,
      0,
    );
    console.log(
      "[MultiSourceNetwork] _getAdjacencyArray SUCCESS: Returning adjacency with",
      nodeCount,
      "nodes and",
      totalEdges,
      "total connections",
    );
    console.log(
      "[MultiSourceNetwork] _getAdjacencyArray: Node labels:",
      nodeLabels,
    );
    return { adjacency, nodeLabels };
  }

  /**
   * getNodes ({ ids: string[] }) -> Array<NodeDoc>
   * Returns canonical node documents for the requested ids. This is a lightweight
   * helper used by frontends to fetch display metadata for nodes returned in adjacency maps.
   */
  async getNodes(
    { ids, owner }: { ids: string[]; owner?: Owner },
  ): Promise<Array<Record<string, unknown>>> {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return [];
    const docs = await this.nodes.find(
      { _id: { $in: ids as unknown as ID[] } },
      {
        projection: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          label: 1,
          headline: 1,
          avatarUrl: 1,
          profileUrl: 1,
          sourceIds: 1,
          // LinkedIn-like fields
          location: 1,
          industry: 1,
          currentPosition: 1,
          currentCompany: 1,
          profilePictureUrl: 1,
          summary: 1,
          skills: 1,
          education: 1,
          experience: 1,
        },
      },
    ).toArray();

    // If owner provided, also fetch membership sources for these node ids and attach as membershipSources
    const membershipMap: Record<string, Record<string, true>> = {};
    if (owner) {
      const memberships = await this.memberships.find({
        owner,
        node: { $in: ids as unknown as ID[] },
      }).toArray();
      for (const m of memberships) {
        const raw = m.sources || {};
        // Filter out internal/automatic membership keys that should not be shown in the UI
        // e.g., the backend may add a "user" source when creating nodes; hide that from frontend displays
        const filtered: Record<string, true> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (k === "user") continue;
          // preserve other sources
          (filtered as Record<string, true>)[k] = v as true;
        }
        membershipMap[m.node as unknown as string] = filtered;
      }
    }

    return docs.map((d) => ({
      ...(d as unknown as Record<string, unknown>),
      membershipSources: membershipMap[
        (d as unknown as Record<string, unknown>)._id as string
      ] || {},
    }));
  }
}
