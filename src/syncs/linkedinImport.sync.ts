/**
 * Synchronizations for LinkedInImport concept
 */

import { LinkedInImport, MultiSourceNetwork } from "@concepts";
import { actions, Sync } from "@engine";
import { ID } from "@utils/types.ts";

/**
 * Helper: Normalize LinkedIn profile URL for comparison.
 * Mirrors logic in LLMDisambiguationConcept so we treat URL matches
 * as the same real-world person.
 */
function normalizeLinkedInUrl(url?: string): string {
  if (!url) return "";
  let normalized = url.toLowerCase().trim();
  normalized = normalized.replace(/^https?:\/\//, "");
  normalized = normalized.replace(/^www\./, "");
  const match = normalized.match(/linkedin\.com\/in\/([^\/\?]+)/);
  if (match) return match[1];
  return normalized;
}

/**
 * Sync: When a LinkedIn connection is added, add it to the MultiSourceNetwork
 * 
 * This sync ensures that imported LinkedIn connections are automatically
 * added as nodes in the user's network graph with source "linkedin".
 */
export const AddLinkedInConnectionToNetwork: Sync = ({
  account,
  connection,
  user,
}) => ({
  when: actions([
    LinkedInImport.addConnection,
    { account },
    { connection },
  ]),
  where: async (frames) => {
    // Query to get the user (owner) from the LinkedIn account
    frames = await frames.query(
      LinkedInImport._getAccountUser,
      { account },
      { user },
    );
    return frames;
  },
  then: async (_frames) => {
    // Load all connections for this account so we can detect duplicates
    const connections = await LinkedInImport._getConnections({ account });

    // Find the newly added connection document
    const newConnection = connections.find((c) => c._id === connection);
    if (!newConnection) {
      // Fallback: if we can't find it, just add this connection as a node
      return [
        actions([
          MultiSourceNetwork.addNodeToNetwork,
          {
            owner: user,
            node: connection,
            source: "linkedin" as ID,
          },
        ]),
      ];
    }

    // Prefer to reuse an existing node if there is a high-certainty match
    // based on LinkedIn profile URL (exact match after normalization).
    const newProfileNorm = normalizeLinkedInUrl(
      (newConnection as { profileUrl?: string }).profileUrl,
    );

    let canonicalNode: ID = connection;

    if (newProfileNorm) {
      const duplicate = connections.find((c) => {
        if (c._id === connection) return false;
        const existingProfileNorm = normalizeLinkedInUrl(
          (c as { profileUrl?: string }).profileUrl,
        );
        return existingProfileNorm && existingProfileNorm === newProfileNorm;
      });

      if (duplicate) {
        // We found another connection with the same LinkedIn profile URL.
        // Treat that existing connection ID as the canonical "person" node
        // instead of creating a separate node for this new connection.
        canonicalNode = duplicate._id as ID;
      }
    }

    return [
      actions([
        MultiSourceNetwork.addNodeToNetwork,
        {
          owner: user,
          node: canonicalNode,
          source: "linkedin" as ID,
        },
      ]),
    ];
  },
});

