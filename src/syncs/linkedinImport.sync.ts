/**
 * Synchronizations for LinkedInImport concept
 */

import { LinkedInImport, MultiSourceNetwork } from "@concepts";
import { actions, Sync } from "@engine";
import { ID } from "@utils/types.ts";

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
  then: actions([
    MultiSourceNetwork.addNodeToNetwork,
    {
      owner: user,
      node: connection,
      source: "linkedin" as ID,
    },
  ]),
});

