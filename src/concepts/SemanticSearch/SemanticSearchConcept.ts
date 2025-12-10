import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

const PREFIX = "SemanticSearch.";

type Owner = ID;
type Item = ID;

interface IndexedItems {
  _id: string; // document id: `${owner}:${item}`
  owner: Owner;
  item: Item;
  text: string;
  vector?: unknown; // reserved for future use
}

interface SearchQueries {
  _id: string; // queryID
  owner: Owner;
  queryText: string;
  filters?: unknown;
  resultItems: Item[];
}

const SEMANTIC_SERVICE_URL = Deno.env.get("SEMANTIC_SERVICE_URL") ??
  "http://localhost:8001";

// Minimum relevance score required for a semantic match to be
// surfaced in searchConnections. Higher values mean fewer but
// more confident results.
const MIN_CONNECTION_SCORE = 0.25;

async function semanticIndex(
  owner: Owner,
  items: Array<
    { item: Item; text: string; metadata?: Record<string, unknown> }
  >,
): Promise<void> {
  const payload = items.map((i) => ({
    id: `${owner}:${i.item}`,
    text: i.text,
    tags: { owner, ...(i.metadata ?? {}) },
  }));

  const addResponse = await fetch(`${SEMANTIC_SERVICE_URL}/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!addResponse.ok) {
    throw new Error(`txtai add failed: ${addResponse.status}`);
  }
  // Consume body so Deno doesn't report leaks when running tests.
  if (addResponse.body) {
    await addResponse.arrayBuffer();
  }

  const indexResponse = await fetch(`${SEMANTIC_SERVICE_URL}/index`, {
    method: "GET",
  });
  if (!indexResponse.ok) {
    throw new Error(`txtai index failed: ${indexResponse.status}`);
  }
  if (indexResponse.body) {
    await indexResponse.arrayBuffer();
  }
}

async function semanticSearch(
  owner: Owner,
  query: string,
  _filters: unknown,
  limit = 20,
): Promise<Array<{ item: Item; score: number }>> {
  const url = new URL(`${SEMANTIC_SERVICE_URL}/search`);
  url.searchParams.set("query", query);
  if (typeof limit === "number") {
    url.searchParams.set("limit", String(limit));
  }

  // Enforce owner-level privacy in txtai by filtering on tags.owner.
  url.searchParams.set("filters", JSON.stringify({ owner }));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`txtai search failed: ${response.status}`);
  }
  const data = await response.json();
  const results = Array.isArray(data) ? data : data.results ?? [];
  return results.map(
    (entry: { id?: string; document?: string; score?: number } | string) => {
      const id = typeof entry === "string"
        ? entry
        : entry.id ?? entry.document ?? "";
      const itemId = typeof id === "string"
        ? id.substring(id.lastIndexOf(":") + 1)
        : "";
      const score = typeof entry === "string" ? 0 : Number(entry.score ?? 0);
      return { item: itemId as Item, score };
    },
  );
}

export default class SemanticSearchConcept {
  indexedItems: Collection<IndexedItems>;
  searchQueries: Collection<SearchQueries>;

  constructor(private readonly db: Db) {
    this.indexedItems = this.db.collection(PREFIX + "indexedItems");
    this.searchQueries = this.db.collection(PREFIX + "searchQueries");
  }

  /**
   * indexItem (owner: Owner, item: Item, text: String, vector: JSON?): Empty
   *
   * **requires** none.
   *
   * **effects** creates or updates an IndexedItems entry for (owner, item)
   * with the provided text and optional vector, and forwards the text to the
   * external semantic search service for indexing.
   */
  async indexItem({
    owner,
    item,
    text,
    vector,
  }: {
    owner: Owner;
    item: Item;
    text: string;
    vector?: unknown;
  }): Promise<Empty> {
    const docId = `${owner}:${item}`;

    await this.indexedItems.updateOne(
      { _id: docId },
      {
        $set: {
          _id: docId,
          owner,
          item,
          text,
          vector,
        },
      },
      { upsert: true },
    );

    const ownerDocs = await this.indexedItems.find({ owner }).toArray();
    await semanticIndex(
      owner,
      ownerDocs.map((doc) => ({
        item: doc.item,
        text: doc.text,
      })),
    );

    return {};
  }

  /**
   * removeIndexedItem (owner: Owner, item: Item): Empty
   *
   * **requires** none.
   *
   * **effects** deletes any IndexedItems entry for (owner, item).
   * (Current implementation does not delete from the external index; it can
   * be extended later if needed.)
   */
  async removeIndexedItem({
    owner,
    item,
  }: {
    owner: Owner;
    item: Item;
  }): Promise<Empty> {
    const docId = `${owner}:${item}`;
    await this.indexedItems.deleteOne({ _id: docId });
    return {};
  }

  /**
   * queryItems (owner: Owner, queryText: String, filters: JSON?): (queryID: String)
   *
   * **requires** queryText is not empty.
   *
   * **effects** creates a new SearchQueries entry with queryText, filters,
   * and a ranked sequence resultItems based on the external semantic search
   * service; returns the new queryID.
   */
  async queryItems({
    owner,
    queryText,
    filters,
  }: {
    owner: Owner;
    queryText: string;
    filters?: unknown;
  }): Promise<{ queryID: string }> {
    if (!queryText || queryText.trim() === "") {
      return { queryID: "" };
    }

    const results = await semanticSearch(owner, queryText, filters ?? {}, 50);
    const resultItems = results.map((r) => r.item);

    const queryID = crypto.randomUUID();

    await this.searchQueries.insertOne({
      _id: queryID,
      owner,
      queryText,
      filters,
      resultItems,
    });

    return { queryID };
  }

  /**
   * refineQuery (queryID: String, filters: JSON): Empty
   *
   * **requires** a SearchQueries entry with queryID exists.
   *
   * **effects** updates the filters for the query and recomputes resultItems
   * based on the new filters.
   */
  async refineQuery({
    queryID,
    filters,
  }: {
    queryID: string;
    filters: unknown;
  }): Promise<Empty> {
    const existing = await this.searchQueries.findOne({ _id: queryID });
    if (!existing) {
      return {};
    }

    const results = await semanticSearch(
      existing.owner,
      existing.queryText,
      filters ?? {},
      50,
    );
    const resultItems = results.map((r) => r.item);

    await this.searchQueries.updateOne(
      { _id: queryID },
      {
        $set: {
          filters,
          resultItems,
        },
      },
    );

    return {};
  }

  /**
   * reindexAllOwners (): Empty
   *
   * **requires** txtai semantic service is reachable.
   *
   * **effects** for each distinct owner in IndexedItems, re-sends all of
   * their indexed items to the external semantic search service. This is
   * useful when the txtai index has been lost or restarted while the
   * MongoDB-backed metadata remains intact.
   */
  async reindexAllOwners({}: {}): Promise<Empty> {
    const owners = await this.indexedItems.distinct("owner", {});

    for (const owner of owners as Owner[]) {
      const ownerDocs = await this.indexedItems.find({ owner }).toArray();
      if (!ownerDocs.length) continue;

      await semanticIndex(
        owner,
        ownerDocs.map((doc) => ({
          item: doc.item,
          text: doc.text,
        })),
      );
    }

    return {};
  }

  /**
   * searchConnections (owner: Owner, queryText: String, limit?: Number): { results: { connectionId, score, text, connection }[] }
   *
   * **requires** queryText is not empty.
   *
   * **effects** runs a semantic search for the given owner and queryText and
   * joins the ranked item ids against LinkedInImport.connections to return
   * rich connection previews for the frontend.
   */
  async searchConnections({
    owner,
    queryText,
    limit = 10,
  }: {
    owner: Owner;
    queryText: string;
    limit?: number;
  }): Promise<{
    results: Array<{
      connectionId: string;
      score: number;
      text: string;
      connection?: {
        _id: string;
        linkedInConnectionId?: string;
        firstName?: string;
        lastName?: string;
        headline?: string | null;
        location?: string | null;
        industry?: string | null;
        currentPosition?: string | null;
        currentCompany?: string | null;
        profileUrl?: string | null;
        profilePictureUrl?: string | null;
        summary?: string | null;
      };
    }>;
  }> {
    const trimmed = queryText.trim();
    if (!trimmed) {
      return { results: [] };
    }

    // 1. Run semantic search via txtai.
    const rawResults = await semanticSearch(owner, trimmed, {}, limit);
    if (!rawResults.length) return { results: [] };

    // 1a. Drop low-confidence matches so obviously irrelevant
    // hits don't show up at all.
    const filteredRaw = rawResults.filter((r) => {
      const score = Number.isFinite(r.score) ? r.score : 0;
      return score >= MIN_CONNECTION_SCORE;
    });
    if (!filteredRaw.length) return { results: [] };

    // 2. Fetch matching LinkedIn connections by _id where possible.
    const ids = filteredRaw
      .map((r) => String(r.item))
      .filter((id) =>
        id && !["FULLSTACK_ID", "BACKEND_ID", "ML_ID"].includes(id)
      );

    const connectionsCollection = this.db.collection<
      { _id: string; account: unknown }
    >(
      "LinkedInImport.connections",
    );
    // Only return connections that belong to accounts owned by this user.
    // We infer ownership by matching connection.account to any LinkedInImport
    // account whose user field equals the provided owner.
    const accountsCollection = this.db.collection(
      "LinkedInImport.accounts",
    );
    const ownerAccounts = await accountsCollection
      .find({ user: owner as unknown })
      .toArray();
    const ownerAccountIds = ownerAccounts.map((a) => a._id);

    const docs = await connectionsCollection
      .find({
        _id: { $in: ids as string[] },
        account: { $in: ownerAccountIds as unknown[] },
      })
      .toArray();

    // Also fetch any MultiSourceNetwork canonical nodes corresponding to
    // semantic item ids that are not backed by LinkedInImport.connections.
    const linkedInIds = new Set(docs.map((doc) => String(doc._id)));
    const missingIds = ids.filter((id) => !linkedInIds.has(id));

    const membershipsCollection = this.db.collection<
      { owner: unknown; node: string }
    >("MultiSourceNetwork.memberships");
    const nodesCollection = this.db.collection<
      {
        _id: string;
        firstName?: string;
        lastName?: string;
        headline?: string | null;
        location?: string | null;
        industry?: string | null;
        currentPosition?: string | null;
        currentCompany?: string | null;
        profileUrl?: string | null;
        profilePictureUrl?: string | null;
        avatarUrl?: string | null;
        summary?: string | null;
      }
    >("MultiSourceNetwork.nodes");

    let nodeDocs: Array<{
      _id: string;
      firstName?: string;
      lastName?: string;
      headline?: string | null;
      location?: string | null;
      industry?: string | null;
      currentPosition?: string | null;
      currentCompany?: string | null;
      profileUrl?: string | null;
      profilePictureUrl?: string | null;
      avatarUrl?: string | null;
      summary?: string | null;
    }> = [];

    if (missingIds.length > 0) {
      const relevantMemberships = await membershipsCollection
        .find({
          owner: owner as unknown,
          node: { $in: missingIds as string[] },
        })
        .toArray();

      const memberNodeIds = relevantMemberships.map((m) => String(m.node));
      if (memberNodeIds.length > 0) {
        nodeDocs = await nodesCollection
          .find({ _id: { $in: memberNodeIds as string[] } })
          .toArray();
      }
    }

    // deno-lint-ignore no-explicit-any
    const byId = new Map<string, any>(
      docs.map((doc) => [String(doc._id), doc]),
    );

    for (const node of nodeDocs) {
      const key = String(node._id);
      if (!byId.has(key)) {
        byId.set(key, {
          _id: key,
          firstName: node.firstName,
          lastName: node.lastName,
          headline: node.headline ?? null,
          location: node.location ?? null,
          industry: node.industry ?? null,
          currentPosition: node.currentPosition ?? null,
          currentCompany: node.currentCompany ?? null,
          profileUrl: node.profileUrl ?? null,
          // Prefer explicit profilePictureUrl, fall back to avatarUrl
          profilePictureUrl: node.profilePictureUrl ?? node.avatarUrl ?? null,
          summary: node.summary ?? null,
        });
      }
    }

    // 3. Build rich results in the filtered semantic order.
    const results = filteredRaw.map((r) => {
      const connectionId = String(r.item);
      const score = Number.isFinite(r.score) ? r.score : 0;
      const doc = byId.get(connectionId);

      const connection = doc
        ? {
          _id: String(doc._id),
          linkedInConnectionId: doc.linkedInConnectionId,
          firstName: doc.firstName,
          lastName: doc.lastName,
          headline: doc.headline ?? null,
          location: doc.location ?? null,
          industry: doc.industry ?? null,
          currentPosition: doc.currentPosition ?? null,
          currentCompany: doc.currentCompany ?? null,
          profileUrl: doc.profileUrl ?? null,
          profilePictureUrl: doc.profilePictureUrl ?? null,
          summary: doc.summary ?? null,
        }
        : undefined;

      const text = doc?.summary ? String(doc.summary) : trimmed;

      return { connectionId, score, text, connection };
    });

    // 4. Prefer results that resolve to real connections; hide bare ids.
    const connected = results.filter((r) => r.connection);

    // 5. De-duplicate by connectionId, keeping the highest score per id.
    const bestById = new Map<string, (typeof connected)[number]>();
    for (const r of connected) {
      const existing = bestById.get(r.connectionId);
      if (!existing || r.score > existing.score) {
        bestById.set(r.connectionId, r);
      }
    }

    return { results: Array.from(bestById.values()) };
  }
}
