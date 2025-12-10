import { MultiSourceNetwork, SemanticSearch } from "@concepts";
import { actions, Sync } from "@engine";

/**
 * Sync: When a canonical MultiSourceNetwork node is created for a user via
 * createNodeForUser (used by manual connection flow), index it in
 * SemanticSearch so semantic search can discover manually added connections.
 */
export const IndexManualNodeInSemanticSearch: Sync = ({
  owner,
  node,
  firstName,
  lastName,
  label,
  headline,
  text,
}) => ({
  when: actions([
    MultiSourceNetwork.createNodeForUser,
    {
      owner,
      firstName,
      lastName,
      label,
      headline,
    },
    { node },
  ]),
  where: (frames) =>
    frames.map((frame) => {
      const fn = String(frame[firstName] ?? "").trim();
      const ln = String(frame[lastName] ?? "").trim();
      const name = [fn, ln].filter((x) => x.length > 0).join(" ");

      const rawLabel = String(frame[label] ?? "").trim();
      const headlineVal = String(frame[headline] ?? "").trim();

      const parts: string[] = [];
      if (name) parts.push(name);
      if (headlineVal) parts.push(headlineVal);

      // Fall back to label or node id if we have nothing else.
      if (parts.length === 0) {
        if (rawLabel) {
          parts.push(rawLabel);
        } else {
          const nodeId = frame[node];
          parts.push(String(nodeId));
        }
      }

      const builtText = parts.join(". ");

      return {
        ...frame,
        [text]: builtText,
      };
    }),
  then: actions([
    SemanticSearch.indexItem,
    {
      owner,
      item: node,
      text,
    },
  ]),
});
