/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  "/api/UserAuthentication/register": "allow visitors to create accounts",
  "/api/UserAuthentication/authenticate": "allow visitors to login",

  "/api/PublicProfile/createProfile": "users manage their own public card",
  "/api/PublicProfile/updateProfile": "users update their profile",
  "/api/PublicProfile/deleteProfile": "users can delete their profile",
  "/api/PublicProfile/_getProfile": "frontend fetches profile data",

  "/api/MultiSourceNetwork/createNetwork": "authenticated users bootstrap their network",
  "/api/MultiSourceNetwork/setRootNode": "users adjust their network root",
  "/api/MultiSourceNetwork/addNodeToNetwork": "users ingest nodes from imports",
  "/api/MultiSourceNetwork/removeNodeFromNetwork": "users prune nodes",
  "/api/MultiSourceNetwork/addEdge": "users link contacts together",
  "/api/MultiSourceNetwork/removeEdge": "users unlink contacts",
  "/api/MultiSourceNetwork/_getAdjacencyArray": "frontend explorer visualizes graph data",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",
];
