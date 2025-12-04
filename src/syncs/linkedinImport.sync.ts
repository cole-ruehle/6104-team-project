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
 * It also:
 * - Labels nodes with firstName+lastName
 * - Ensures the network and root node exist
 * - Creates edges from root node to connection nodes
 */
export const AddLinkedInConnectionToNetwork: Sync = ({
  account,
  connection,
  user,
  connectionDoc,
  firstName,
  lastName,
  label,
  rootNode,
}) => ({
  when: actions([
    LinkedInImport.addConnection,
    { account },
    { connection },
  ]),
  where: async (frames) => {
    // Extract actual values from frames for logging
    const accountValue = frames[0]?.[account];
    const connectionValue = frames[0]?.[connection];
    console.log(`[Sync] AddLinkedInConnectionToNetwork: Processing connection ${String(connectionValue)} for account ${String(accountValue)}`);

    // Query to get the user (owner) from the LinkedIn account
    frames = await frames.query(
      LinkedInImport._getAccountUser,
      { account },
      { user },
    );
    if (frames.length === 0) {
      console.warn(`[Sync] AddLinkedInConnectionToNetwork: No user found for account ${String(accountValue)}, sync will not execute`);
      return frames;
    }
    const userValue = frames[0]?.[user];
    console.log(`[Sync] AddLinkedInConnectionToNetwork: Found user ${String(userValue)} for account ${String(accountValue)}`);

    // Query to get connection details (firstName, lastName)
    // Note: The query returns { connection: ConnectionDoc }, so we map it to connectionDoc
    console.log(`[Sync] AddLinkedInConnectionToNetwork: Querying connection document for connection ${String(connectionValue)}`);
    frames = await frames.query(
      LinkedInImport._getConnection,
      { connection },
      { connection: connectionDoc }, // Map the 'connection' property from query result to connectionDoc symbol
    );
    console.log(`[Sync] AddLinkedInConnectionToNetwork: Query returned ${frames.length} frame(s)`);

    // Extract firstName and lastName from connection document and construct label
    if (frames.length > 0 && frames[0]?.[connectionDoc]) {
      const conn = frames[0][connectionDoc] as any;
      console.log(`[Sync] AddLinkedInConnectionToNetwork: Connection document found:`, {
        _id: conn._id,
        firstName: conn.firstName,
        lastName: conn.lastName,
        linkedInConnectionId: conn.linkedInConnectionId,
      });
      const connFirstName = conn.firstName || "";
      const connLastName = conn.lastName || "";
      const fullName = `${connFirstName} ${connLastName}`.trim() || String(connectionValue);
      frames[0][firstName] = connFirstName;
      frames[0][lastName] = connLastName;
      frames[0][label] = fullName;
      console.log(`[Sync] AddLinkedInConnectionToNetwork: Extracted name - firstName: "${connFirstName}", lastName: "${connLastName}", fullName: "${fullName}"`);
    } else {
      console.warn(`[Sync] AddLinkedInConnectionToNetwork: No connection document found for connection ${String(connectionValue)}`);
      console.warn(`[Sync] AddLinkedInConnectionToNetwork: Frame state:`, {
        framesLength: frames.length,
        hasConnectionDoc: frames[0]?.[connectionDoc] ? true : false,
        frameKeys: frames[0] ? Object.keys(frames[0]).map(k => String(k)) : [],
      });
      frames[0][firstName] = "";
      frames[0][lastName] = "";
      frames[0][label] = String(connectionValue);
      console.log(`[Sync] AddLinkedInConnectionToNetwork: Using connection ID as label: "${String(connectionValue)}"`);
    }

    // Set root node to owner (user)
    frames[0][rootNode] = userValue;


    // Also fetch the full connection document so we can create a canonical node
    frames = await frames.query(
      LinkedInImport._getConnection,
      { connection },
      { connectionDoc },
    );

    return frames;
  },
  then: [
    // First, ensure network exists (create if not) - this is idempotent now
    ...actions([
      MultiSourceNetwork.createNetwork,
      {
        owner: user,
        root: rootNode,
      },
    ]),
    // Then, add node to network with label
    ...actions([
      MultiSourceNetwork.addNodeToNetwork,
      {
        owner: user,
        node: connection,
        source: "linkedin" as ID,
        label: label,
      },
    ]),
    // Finally, add edge from root node to connection node
    ...actions([
      MultiSourceNetwork.addEdge,
      {
        owner: user,
        from: rootNode,
        to: connection,
        source: "linkedin" as ID,
      },
    ]),
  ],
});
