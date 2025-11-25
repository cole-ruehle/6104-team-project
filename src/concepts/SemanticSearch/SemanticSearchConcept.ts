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
  _owner: Owner,
  query: string,
  _filters: unknown,
  limit = 20,
): Promise<Array<{ item: Item; score: number }>> {
  const url = new URL(`${SEMANTIC_SERVICE_URL}/search`);
  url.searchParams.set("query", query);
  if (typeof limit === "number") {
    url.searchParams.set("limit", String(limit));
  }

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

    await semanticIndex(owner, [{ item, text }]);

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
}
