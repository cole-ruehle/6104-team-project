/**
 * Sync: Create canonical nodes and migrate memberships when LinkedIn connections are added.
 *
 * This runs separately from AddLinkedInConnectionToNetwork and preserves the
 * original LinkedInImport action signatures. It upserts a canonical Node in
 * MultiSourceNetwork and migrates any legacy membership that referenced the
 * LinkedIn connection id to the canonical node id.
 */

import { LinkedInImport, MultiSourceNetwork } from "@concepts";
import { actions, Sync, Frames } from "@engine";
import { ID } from "@utils/types.ts";

export const CreateCanonicalNodeFromLinkedInConnection: Sync = (
  { account, connections, user, connectionDoc, externalId, legacyNodeId },
) => ({
  when: actions([
    LinkedInImport.importConnectionsFromCSV,
    { account },
    { connections },
  ]),
  where: async (frames) => {
    // Debug
    console.log("[Sync:CreateCanonicalNodeFromLinkedInConnection] where called, frames before:", frames.length);
    // Bind owner (user)
    frames = await frames.query(LinkedInImport._getAccountUser, { account }, {
      user,
    });

    // Expand frames for each connection in the returned connections array
    const expanded = new Frames();
    for (const frame of frames) {
      const conns = frame[connections] as unknown;
      if (!conns) continue;
      if (Array.isArray(conns)) {
        for (const c of conns) {
          const newFrame: Record<symbol, unknown> = { ...frame };
          // bind connectionDoc and per-frame external id and legacy node id
          newFrame[connectionDoc] = c;
          newFrame[externalId] = (c as unknown as { linkedInConnectionId?: string; linkedInId?: string })?.linkedInConnectionId ?? (c as unknown as { linkedInId?: string }).linkedInId ?? undefined;
          newFrame[legacyNodeId] = (c as unknown as { _id?: ID })._id;
          expanded.push(newFrame as unknown as Record<symbol, unknown>);
        }
      } else {
        // single object
        const newFrame: Record<symbol, unknown> = { ...frame };
        newFrame[connectionDoc] = conns;
  newFrame[externalId] = (conns as unknown as { linkedInConnectionId?: string; linkedInId?: string })?.linkedInConnectionId ?? (conns as unknown as { linkedInId?: string }).linkedInId ?? undefined;
  newFrame[legacyNodeId] = (conns as unknown as { _id?: ID })._id;
        expanded.push(newFrame as unknown as Record<symbol, unknown>);
      }
    }

    console.log("[Sync:CreateCanonicalNodeFromLinkedInConnection] where returning frames:", expanded.length);
    return expanded;
  },
  then: actions([
    MultiSourceNetwork.addOrMigrateNodeFromSource,
    {
      owner: user,
      legacyNodeId: legacyNodeId,
      source: "linkedin" as ID,
      nodeMeta: connectionDoc,
      externalId,
    },
  ]),
});
