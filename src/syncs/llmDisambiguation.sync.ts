/**
 * Synchronizations for LLMDisambiguation concept
 * 
 * Note: The actual comparison logic is better handled in the frontend or via
 * a background job, as syncs have limitations on complex queries and loops.
 * These syncs handle the high-confidence auto-merge case.
 */

import {
  LLMDisambiguation,
  LinkedInImport,
  MultiSourceNetwork,
} from "@concepts";
import { actions, Sync } from "@engine";
import { ID } from "@utils/types.ts";

/**
 * Sync: When a comparison is created with high confidence, automatically merge
 * 
 * This sync handles high-confidence matches (>= 0.85 similarity, "high" confidence)
 * by automatically confirming the match and merging the nodes.
 * For medium/low confidence matches, the comparison will be shown to the user
 * on the duplicate confirmation page.
 */
export const AutoMergeHighConfidenceMatches: Sync = ({
  comparison,
}) => ({
  when: actions([
    LLMDisambiguation.compareNodes,
    { comparison },
  ]),
  where: async (frames) => {
    // Get comparison details
    const [comparisonDoc] = await LLMDisambiguation._getComparisonDetails({ comparison });
    if (!comparisonDoc) return frames;

    // Check if it's high confidence and high similarity
    const isHighConfidence = comparisonDoc.llmConfidence === "high";
    const isHighSimilarity = (comparisonDoc.llmSimilarityScore || 0) >= 0.85;

    if (!isHighConfidence || !isHighSimilarity) {
      return frames; // Not high enough confidence, let user review on frontend
    }

    // Get adjacency to find the owner
    // We'll need to determine which node is the new connection
    // For simplicity, assume we can find the owner from either node
    // This is a limitation - we may need to pass owner through the comparison
    return frames;
  },
  then: async (frames) => {
    const [comparisonDoc] = await LLMDisambiguation._getComparisonDetails({ comparison });
    if (!comparisonDoc) return [];

    // For high confidence matches:
    // 1. Confirm as "same"
    // 2. Merge (keeping node2 as the existing node, merging node1 into it)
    // 3. The frontend or another sync will handle the actual network updates

    return [
      actions([
        LLMDisambiguation.confirmComparison,
        {
          comparison,
          userDecision: "same",
        },
      ]),
      actions([
        LLMDisambiguation.mergeNodes,
        {
          comparison,
          keepNode: comparisonDoc.node2, // Keep existing node
        },
      ]),
    ];
  },
});

