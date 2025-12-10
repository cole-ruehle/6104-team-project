/**
 * Entry point for an application built with concepts + synchronizations.
 * Requires the Requesting concept as a bootstrap concept.
 * Please run "deno run import" or "generate_imports.ts" to prepare "@concepts".
 */
import * as concepts from "@concepts";

// Use the following line instead to run against the test database, which resets each time.
// import * as concepts from "@test-concepts";

const { Engine } = concepts;
import { Logging } from "@engine";
import { startRequestingServer } from "@concepts/Requesting/RequestingConcept.ts";
import syncs from "@syncs";

/**
 * Available logging levels:
 *   Logging.OFF
 *   Logging.TRACE - display a trace of the actions.
 *   Logging.VERBOSE - display full record of synchronization.
 */
Engine.logging = Logging.TRACE;

// Register synchronizations
Engine.register(syncs);

// On startup, rebuild the semantic index in txtai from any
// previously stored IndexedItems, so that semantic search keeps
// working even if the txtai service restarts.
const bootstrap = async () => {
  try {
    if ("SemanticSearch" in concepts) {
      // @ts-ignore Instrumented concept instance
      console.log(
        "[SemanticSearch] Rebuilding semantic index from IndexedItems...",
      );
      await (concepts as any).SemanticSearch.reindexAllOwners({});
      console.log("[SemanticSearch] Semantic index rebuild complete.");
    }
  } catch (err) {
    console.error("[SemanticSearch] Failed to reindex on startup:", err);
  }

  // Start a server to provide the Requesting concept with external/system actions.
  startRequestingServer(concepts);
};

// Deno supports top-level await; ensure bootstrap runs before serving.
await bootstrap();
