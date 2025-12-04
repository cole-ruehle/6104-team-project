import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import "jsr:@std/dotenv/load";

// Collection prefix to ensure namespace separation
const PREFIX = "LLMDisambiguation" + ".";

// Generic type for the concept's external dependencies
type Node = ID;

// Internal entity types, represented as IDs
type Comparison = ID;
type Merge = ID;

/**
 * State: A set of Comparisons tracking node disambiguation attempts.
 */
interface ComparisonDoc {
  _id: Comparison;
  node1: Node;
  node2: Node;
  llmSimilarityScore?: number; // 0.0 to 1.0, where 1.0 means definitely the same
  llmReasoning?: string;
  llmConfidence?: "high" | "medium" | "low";
  userDecision?: "same" | "different" | "pending";
  userConfirmedAt?: Date;
  createdAt: Date;
  node1Info?: Record<string, unknown>; // Snapshot of information available for node1 at comparison time
  node2Info?: Record<string, unknown>; // Snapshot of information available for node2 at comparison time
}

/**
 * State: A set of Merges recording node merge decisions.
 */
interface MergeDoc {
  _id: Merge;
  node1: Node; // The node that is merged into node2
  node2: Node; // The node that remains after merge
  comparison: Comparison;
  mergedAt: Date;
  mergedBy?: "system" | "user";
}

/**
 * @concept LLMDisambiguation
 * @purpose Determine whether two nodes in a network represent the same real-world entity by comparing their associated information, enabling the system to detect duplicates and maintain accurate network representations.
 * @principle When two nodes are compared, the system uses an LLM to analyze their associated information (names, locations, affiliations, etc.) and generates a similarity assessment. The user can then confirm or reject the assessment, and if confirmed, the nodes can be marked as representing the same entity, allowing downstream concepts to merge or link them appropriately.
 */
export default class LLMDisambiguationConcept {
  comparisons: Collection<ComparisonDoc>;
  merges: Collection<MergeDoc>;

  constructor(private readonly db: Db) {
    this.comparisons = this.db.collection(PREFIX + "comparisons");
    this.merges = this.db.collection(PREFIX + "merges");
  }

  /**
   * Action: Compares two nodes using LLM analysis.
   * compareNodes (node1: Node, node2: Node, node1Info: JSON?, node2Info: JSON?): (comparison: Comparison)
   *
   * **requires**:
   *   - node1 != node2.
   *
   * **effects**:
   *   - If a Comparisons entry exists for (node1, node2) or (node2, node1), updates it; otherwise creates a new entry.
   *   - Uses LLM to analyze node1Info and node2Info (or fetches information if not provided).
   *   - Generates or updates llmSimilarityScore, llmReasoning, and llmConfidence.
   *   - Sets userDecision to "pending" (if updating an existing comparison with a decision, resets to "pending").
   *   - Updates node1Info and node2Info snapshots.
   *   - Returns the comparison ID.
   */
  async compareNodes({
    node1,
    node2,
    node1Info,
    node2Info,
  }: {
    node1: Node;
    node2: Node;
    node1Info?: Record<string, unknown>;
    node2Info?: Record<string, unknown>;
  }): Promise<{ comparison: Comparison } | { error: string }> {
    if (node1 === node2) {
      return { error: "node1 and node2 must be different" };
    }

    // Check if comparison already exists (check both orderings)
    const existingComparison = await this.comparisons.findOne({
      $or: [
        { node1, node2 },
        { node1: node2, node2: node1 },
      ],
    });

    // Check if both nodes have the same LinkedIn profile URL - if so, auto-merge
    if (node1Info && node2Info) {
      const profileUrl1 = node1Info.profileUrl as string | undefined;
      const profileUrl2 = node2Info.profileUrl as string | undefined;
      
      if (profileUrl1 && profileUrl2) {
        const normalizedUrl1 = this.normalizeLinkedInUrl(profileUrl1);
        const normalizedUrl2 = this.normalizeLinkedInUrl(profileUrl2);
        
        if (normalizedUrl1 && normalizedUrl2 && normalizedUrl1 === normalizedUrl2) {
        // Same LinkedIn profile URL - definitely the same person
        // Mark as high confidence with perfect similarity score
        const now = new Date();
        const normalizedNode1 = node1 < node2 ? node1 : node2;
        const normalizedNode2 = node1 < node2 ? node2 : node1;
        const normalizedNode1Info = node1 < node2 ? node1Info : node2Info;
        const normalizedNode2Info = node1 < node2 ? node2Info : node1Info;

        if (existingComparison) {
          await this.comparisons.updateOne(
            { _id: existingComparison._id },
            {
              $set: {
                node1: normalizedNode1,
                node2: normalizedNode2,
                llmSimilarityScore: 1.0,
                llmReasoning: "Both nodes have the same LinkedIn profile URL, confirming they are the same person.",
                llmConfidence: "high",
                userDecision: "pending", // Will be auto-confirmed by sync
                node1Info: normalizedNode1Info,
                node2Info: normalizedNode2Info,
              },
            },
          );
          return { comparison: existingComparison._id };
        } else {
          const comparisonId = freshID() as Comparison;
          await this.comparisons.insertOne({
            _id: comparisonId,
            node1: normalizedNode1,
            node2: normalizedNode2,
            llmSimilarityScore: 1.0,
            llmReasoning: "Both nodes have the same LinkedIn profile URL, confirming they are the same person.",
            llmConfidence: "high",
            userDecision: "pending", // Will be auto-confirmed by sync
            createdAt: now,
            node1Info: normalizedNode1Info,
            node2Info: normalizedNode2Info,
          });
          return { comparison: comparisonId };
        }
      }
    }

    // Pre-filter: Check string similarity first
    // If no string similarity, don't create a comparison
    if (node1Info && node2Info && !this.hasStringSimilarity(node1Info, node2Info)) {
      // No string similarity - return existing comparison if it exists, otherwise return error
      if (existingComparison) {
        return { comparison: existingComparison._id };
      }
      // Don't create a comparison if there's no string similarity
      return {
        error:
          "No string similarity detected. Nodes are too different to warrant comparison.",
      };
    }

    // Create comparison immediately WITHOUT LLM analysis
    // LLM analysis will be triggered on-demand via analyzeComparison action
    const now = new Date();
    const normalizedNode1 = node1 < node2 ? node1 : node2;
    const normalizedNode2 = node1 < node2 ? node2 : node1;
    const normalizedNode1Info = node1 < node2 ? node1Info : node2Info;
    const normalizedNode2Info = node1 < node2 ? node2Info : node1Info;

    if (existingComparison) {
      // Update existing comparison (preserve LLM results if they exist)
      await this.comparisons.updateOne(
        { _id: existingComparison._id },
        {
          $set: {
            node1: normalizedNode1,
            node2: normalizedNode2,
            node1Info: normalizedNode1Info,
            node2Info: normalizedNode2Info,
            // Only reset userDecision if it was already decided
            ...(existingComparison.userDecision && existingComparison.userDecision !== "pending" && {
              userDecision: "pending",
            }),
          },
        },
      );
      return { comparison: existingComparison._id };
    } else {
      // Create new comparison without LLM analysis (llmSimilarityScore, llmReasoning, llmConfidence will be undefined)
      const comparisonId = freshID() as Comparison;
      await this.comparisons.insertOne({
        _id: comparisonId,
        node1: normalizedNode1,
        node2: normalizedNode2,
        userDecision: "pending",
        createdAt: now,
        node1Info: normalizedNode1Info,
        node2Info: normalizedNode2Info,
        // LLM fields left undefined - will be populated by analyzeComparison
      });
      return { comparison: comparisonId };
    }
  }

  /**
   * Action: Confirms a comparison with a user decision.
   * confirmComparison (comparison: Comparison, userDecision: String): Empty
   *
   * **requires**:
   *   - A Comparisons entry with the given comparison ID exists.
   *   - userDecision is one of: "same", "different".
   *   - The comparison's current userDecision is "pending".
   *
   * **effects**:
   *   - Updates userDecision to the provided value.
   *   - Sets userConfirmedAt to the current date.
   */
  async confirmComparison({
    comparison,
    userDecision,
  }: {
    comparison: Comparison;
    userDecision: "same" | "different";
  }): Promise<Empty | { error: string }> {
    if (userDecision !== "same" && userDecision !== "different") {
      return {
        error: 'userDecision must be either "same" or "different"',
      };
    }

    const existingComparison = await this.comparisons.findOne({
      _id: comparison,
    });
    if (!existingComparison) {
      return { error: `Comparison with ID ${comparison} not found.` };
    }

    if (existingComparison.userDecision !== "pending") {
      return {
        error: `Comparison ${comparison} already has a decision (${existingComparison.userDecision}). Cannot confirm again.`,
      };
    }

    await this.comparisons.updateOne(
      { _id: comparison },
      {
        $set: {
          userDecision,
          userConfirmedAt: new Date(),
        },
      },
    );

    return {};
  }

  /**
   * Action: Records a merge decision for two nodes.
   * mergeNodes (comparison: Comparison, keepNode: Node): (merge: Merge)
   *
   * **requires**:
   *   - A Comparisons entry with the given comparison ID exists.
   *   - userDecision is "same".
   *   - keepNode is either node1 or node2 from the comparison.
   *
   * **effects**:
   *   - Creates a new Merges entry recording that the other node was merged into keepNode.
   *   - Sets mergedBy to "user".
   *   - Returns the merge ID.
   */
  async mergeNodes({
    comparison,
    keepNode,
  }: {
    comparison: Comparison;
    keepNode: Node;
  }): Promise<{ merge: Merge } | { error: string }> {
    const existingComparison = await this.comparisons.findOne({
      _id: comparison,
    });
    if (!existingComparison) {
      return { error: `Comparison with ID ${comparison} not found.` };
    }

    if (existingComparison.userDecision !== "same") {
      return {
        error: `Cannot merge nodes: comparison ${comparison} has userDecision "${existingComparison.userDecision}", but "same" is required.`,
      };
    }

    if (
      keepNode !== existingComparison.node1 &&
      keepNode !== existingComparison.node2
    ) {
      return {
        error: `keepNode ${keepNode} must be either node1 (${existingComparison.node1}) or node2 (${existingComparison.node2}) from the comparison.`,
      };
    }

    const mergeNode = keepNode === existingComparison.node1
      ? existingComparison.node2
      : existingComparison.node1;

    const mergeId = freshID() as Merge;
    await this.merges.insertOne({
      _id: mergeId,
      node1: mergeNode, // The node that is merged into node2
      node2: keepNode, // The node that remains after merge
      comparison,
      mergedAt: new Date(),
      mergedBy: "user",
    });

    return { merge: mergeId };
  }

  /**
   * Action: Triggers LLM analysis for a comparison that was created without analysis.
   * analyzeComparison (comparison: Comparison): Empty
   *
   * **requires**:
   *   - A Comparisons entry with the given comparison ID exists.
   *   - The comparison has node1Info and node2Info available.
   *
   * **effects**:
   *   - Uses LLM to analyze node1Info and node2Info.
   *   - Updates llmSimilarityScore, llmReasoning, and llmConfidence.
   *   - Does not change userDecision if it's already set.
   */
  async analyzeComparison({
    comparison,
  }: {
    comparison: Comparison;
  }): Promise<Empty | { error: string }> {
    const existingComparison = await this.comparisons.findOne({ _id: comparison });
    if (!existingComparison) {
      return { error: `Comparison with ID ${comparison} not found.` };
    }

    // Check if LLM analysis already done
    if (existingComparison.llmSimilarityScore !== undefined) {
      return {}; // Already analyzed, no need to re-analyze
    }

    // Check if we have node info
    if (!existingComparison.node1Info || !existingComparison.node2Info) {
      return { error: "Cannot analyze comparison: node information not available." };
    }

    // Use LLM to analyze the nodes
    const llmResult = await this.analyzeWithLLM(
      existingComparison.node1Info,
      existingComparison.node2Info,
    );
    if ("error" in llmResult) {
      return { error: llmResult.error };
    }

    // Update comparison with LLM results
    await this.comparisons.updateOne(
      { _id: comparison },
      {
        $set: {
          llmSimilarityScore: llmResult.similarityScore,
          llmReasoning: llmResult.reasoning,
          llmConfidence: llmResult.confidence,
          // Don't change userDecision if it's already set
        },
      },
    );

    return {};
  }

  /**
   * Action: Cancels a pending comparison.
   * cancelComparison (comparison: Comparison): Empty
   *
   * **requires**:
   *   - A Comparisons entry with the given comparison ID exists.
   *   - userDecision is "pending".
   *
   * **effects**:
   *   - Removes the Comparisons entry.
   */
  async cancelComparison({
    comparison,
  }: {
    comparison: Comparison;
  }): Promise<Empty | { error: string }> {
    const existingComparison = await this.comparisons.findOne({
      _id: comparison,
    });
    if (!existingComparison) {
      return { error: `Comparison with ID ${comparison} not found.` };
    }

    if (existingComparison.userDecision !== "pending") {
      return {
        error: `Cannot cancel comparison ${comparison}: userDecision is "${existingComparison.userDecision}", but "pending" is required.`,
      };
    }

    await this.comparisons.deleteOne({ _id: comparison });

    return {};
  }

  /**
   * Query: Retrieves the comparison for a given node pair.
   */
  async _getComparison({
    node1,
    node2,
  }: {
    node1: Node;
    node2: Node;
  }): Promise<ComparisonDoc[]> {
    const comparison = await this.comparisons.findOne({
      $or: [
        { node1, node2 },
        { node1: node2, node2: node1 },
      ],
    });

    return comparison ? [comparison] : [];
  }

  /**
   * Query: Retrieves all comparisons involving a given node.
   */
  async _getComparisonsForNode({
    node,
  }: {
    node: Node;
  }): Promise<ComparisonDoc[]> {
    return await this.comparisons
      .find({
        $or: [{ node1: node }, { node2: node }],
      })
      .toArray();
  }

  /**
   * Query: Retrieves all pending comparisons.
   */
  async _getPendingComparisons(_args?: Record<string, unknown>): Promise<ComparisonDoc[]> {
    return await this.comparisons
      .find({ userDecision: "pending" })
      .toArray();
  }

  /**
   * Query: Retrieves all merges involving a given node.
   */
  async _getMergesForNode({ node }: { node: Node }): Promise<MergeDoc[]> {
    return await this.merges
      .find({
        $or: [{ node1: node }, { node2: node }],
      })
      .toArray();
  }

  /**
   * Query: Retrieves full comparison details including LLM reasoning and node information snapshots.
   */
  async _getComparisonDetails({
    comparison,
  }: {
    comparison: Comparison;
  }): Promise<ComparisonDoc[]> {
    const comparisonDoc = await this.comparisons.findOne({ _id: comparison });
    return comparisonDoc ? [comparisonDoc] : [];
  }

  /**
   * Helper: Normalize LinkedIn profile URL for comparison.
   * Handles variations like https://www.linkedin.com/in/username vs linkedin.com/in/username
   */
  private normalizeLinkedInUrl(url: string): string {
    if (!url) return "";
    // Remove protocol and www
    let normalized = url.toLowerCase().trim();
    normalized = normalized.replace(/^https?:\/\//, "");
    normalized = normalized.replace(/^www\./, "");
    // Extract the username part (everything after /in/)
    const match = normalized.match(/linkedin\.com\/in\/([^\/\?]+)/);
    if (match) {
      return match[1]; // Return just the username
    }
    return normalized;
  }

  /**
   * Helper: Quick string similarity check to pre-filter before LLM analysis.
   * Returns true if nodes have enough string similarity to warrant LLM comparison.
   */
  private hasStringSimilarity(
    node1Info?: Record<string, unknown>,
    node2Info?: Record<string, unknown>,
  ): boolean {
    if (!node1Info || !node2Info) return false;

    // Helper to calculate simple string similarity
    const simpleSimilarity = (str1: string, str2: string): number => {
      if (!str1 || !str2) return 0;
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();
      if (s1 === s2) return 1;
      if (s1.includes(s2) || s2.includes(s1)) return 0.7;
      // Simple substring matching
      const minLen = Math.min(s1.length, s2.length);
      let matches = 0;
      for (let i = 0; i < minLen; i++) {
        if (s1[i] === s2[i]) matches++;
      }
      return matches / Math.max(s1.length, s2.length);
    };

    // Check name similarity
    const name1 = [
      node1Info.firstName,
      node1Info.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const name2 = [
      node2Info.firstName,
      node2Info.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (name1 && name2 && simpleSimilarity(name1, name2) > 0.3) {
      return true;
    }

    // Check first name
    const fn1 = String(node1Info.firstName || "").toLowerCase().trim();
    const fn2 = String(node2Info.firstName || "").toLowerCase().trim();
    if (fn1 && fn2 && simpleSimilarity(fn1, fn2) > 0.5) {
      return true;
    }

    // Check last name
    const ln1 = String(node1Info.lastName || "").toLowerCase().trim();
    const ln2 = String(node2Info.lastName || "").toLowerCase().trim();
    if (ln1 && ln2 && simpleSimilarity(ln1, ln2) > 0.5) {
      return true;
    }

    // Check company
    const comp1 = String(node1Info.currentCompany || "").toLowerCase().trim();
    const comp2 = String(node2Info.currentCompany || "").toLowerCase().trim();
    if (comp1 && comp2 && simpleSimilarity(comp1, comp2) > 0.6) {
      return true;
    }

    // Check location
    const loc1 = String(node1Info.location || "").toLowerCase().trim();
    const loc2 = String(node2Info.location || "").toLowerCase().trim();
    if (loc1 && loc2 && simpleSimilarity(loc1, loc2) > 0.6) {
      return true;
    }

    return false;
  }

  /**
   * Helper: Uses LLM to analyze two nodes and determine if they represent the same entity.
   * Returns similarity score, reasoning, and confidence level.
   */
  private async analyzeWithLLM(
    node1Info?: Record<string, unknown>,
    node2Info?: Record<string, unknown>,
  ): Promise<
    | {
      similarityScore: number;
      reasoning: string;
      confidence: "high" | "medium" | "low";
    }
    | { error: string }
  > {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return { error: "GEMINI_API_KEY environment variable not set" };
    }

    // Prepare information for LLM analysis
    const info1 = node1Info
      ? JSON.stringify(node1Info, null, 2)
      : "No information provided for node 1";
    const info2 = node2Info
      ? JSON.stringify(node2Info, null, 2)
      : "No information provided for node 2";

    const comparisonPrompt = `You are an entity disambiguation assistant. Your task is to determine whether two nodes in a network represent the same real-world person or entity.

Node 1 Information:
${info1}

Node 2 Information:
${info2}

Analyze the information provided and determine:
1. Whether these two nodes likely represent the same person/entity
2. Your confidence level (high, medium, or low)
3. Your reasoning for the decision

Consider factors such as:
- Name similarity (including variations, nicknames, abbreviations)
- Location/affiliation overlap
- Professional information (companies, positions, education)
- Any other identifying information

Return ONLY a JSON object with the following structure:
{
  "similarityScore": <number between 0.0 and 1.0, where 1.0 means definitely the same>,
  "confidence": <"high" | "medium" | "low">,
  "reasoning": <string explaining your analysis>
}

Example response:
{
  "similarityScore": 0.85,
  "confidence": "high",
  "reasoning": "Both nodes share the same full name (John Smith), work at the same company (Acme Corp), and are located in the same city (Boston). The email addresses are different but this could be due to different accounts."
}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: comparisonPrompt }],
            }],
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `LLM API error: ${errorText}` };
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return { error: "No response from LLM" };
      }

      // Extract JSON from LLM response (may include markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { error: "Could not parse LLM response as JSON" };
      }

      const result = JSON.parse(jsonMatch[0]);

      // Validate and normalize the response
      const similarityScore = typeof result.similarityScore === "number"
        ? Math.max(0, Math.min(1, result.similarityScore))
        : 0.5;
      const confidence = ["high", "medium", "low"].includes(result.confidence)
        ? result.confidence
        : "medium";
      const reasoning = typeof result.reasoning === "string"
        ? result.reasoning
        : "No reasoning provided";

      return {
        similarityScore,
        confidence: confidence as "high" | "medium" | "low",
        reasoning,
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return { error: `LLM analysis failed: ${err.message}` };
    }
  }
}

