const DEFAULT_BASE_URL = "http://localhost:8000/api";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL)
  .replace(/\/+$/, "");

export class ConceptApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function postConcept<T>(
  concept: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/${concept}/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ConceptApiError(
      responseBody?.error ?? `Concept call failed: ${response.statusText}`,
      response.status,
      responseBody,
    );
  }

  if ("error" in responseBody) {
    throw new ConceptApiError(String(responseBody.error), response.status);
  }

  return responseBody as T;
}

export interface AdjacencyMap {
  [node: string]: Array<{ to: string; source: string; weight?: number }>;
}

export const MultiSourceNetworkAPI = {
  createNetwork: (payload: { owner: string; root?: string }) =>
    postConcept<{ network: string }>("MultiSourceNetwork", "createNetwork", payload),
  setRootNode: (payload: { owner: string; root: string }) =>
    postConcept("MultiSourceNetwork", "setRootNode", payload),
  addNodeToNetwork: (payload: { owner: string; node: string; source: string }) =>
    postConcept("MultiSourceNetwork", "addNodeToNetwork", payload),
  removeNodeFromNetwork: (payload: {
    owner: string;
    node: string;
    source?: string;
  }) => postConcept("MultiSourceNetwork", "removeNodeFromNetwork", payload),
  addEdge: (payload: {
    owner: string;
    from: string;
    to: string;
    source: string;
    weight?: number;
  }) => postConcept("MultiSourceNetwork", "addEdge", payload),
  removeEdge: (payload: {
    owner: string;
    from: string;
    to: string;
    source: string;
  }) => postConcept("MultiSourceNetwork", "removeEdge", payload),
  getAdjacencyArray: (payload: { owner: string }) =>
    postConcept<AdjacencyMap>("MultiSourceNetwork", "_getAdjacencyArray", payload),
};

export interface PublicProfile {
  user: string;
  headline: string;
  attributes: string[];
  links: string[];
}

export const PublicProfileAPI = {
  createProfile: (payload: {
    user: string;
    headline: string;
    attributes: string[];
    links: string[];
  }) => postConcept("PublicProfile", "createProfile", payload),
  updateProfile: (payload: {
    user: string;
    headline?: string;
    attributes?: string[];
    links?: string[];
    profilePictureUrl?: string;
  }) => postConcept("PublicProfile", "updateProfile", payload),
  deleteProfile: (payload: { user: string }) =>
    postConcept("PublicProfile", "deleteProfile", payload),
  getProfile: (payload: { user: string }) =>
    postConcept<{ profile: PublicProfile }[]>("PublicProfile", "_getProfile", payload),
};

export const UserAuthenticationAPI = {
  register: (payload: { username: string; password: string }) =>
    postConcept<{ user: string }>("UserAuthentication", "register", payload),
  authenticate: (payload: { username: string; password: string }) =>
    postConcept<{ user: string }>("UserAuthentication", "authenticate", payload),
  getUserById: (payload: { id: string }) =>
    postConcept<{ id: string; username: string } | Record<string, never>>(
      "UserAuthentication",
      "_getUserById",
      payload,
    ),
};

export interface LinkedInConnection {
  _id: string;
  account: string;
  linkedInConnectionId: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  location?: string;
  industry?: string;
  currentPosition?: string;
  currentCompany?: string;
  profileUrl?: string;
  profilePictureUrl?: string;
  summary?: string;
  skills?: string[];
  education?: Array<{
    school?: string;
    degree?: string;
    fieldOfStudy?: string;
    startYear?: number;
    endYear?: number;
  }>;
  experience?: Array<{
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  importedAt: string;
}

export const LinkedInImportAPI = {
  connectLinkedInAccount: (payload: {
    user: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    linkedInUserId: string;
    linkedInEmail?: string;
    linkedInName?: string;
  }) => postConcept<{ account: string }>("LinkedInImport", "connectLinkedInAccount", payload),
  getLinkedInAccount: (payload: { user: string }) =>
    postConcept<Array<{
      _id: string;
      user: string;
      linkedInUserId: string;
      linkedInEmail?: string;
      linkedInName?: string;
      createdAt: string;
      lastImportedAt?: string;
    }>>("LinkedInImport", "_getLinkedInAccount", payload),
  getConnections: (payload: { account: string }) =>
    postConcept<LinkedInConnection[]>("LinkedInImport", "_getConnections", payload),
  importConnectionsFromCSV: (payload: { account: string; csvContent: string }) =>
    postConcept<{ importJob: string; connectionsImported: number }>(
      "LinkedInImport",
      "importConnectionsFromCSV",
      payload,
    ),
  importConnectionsFromJSON: (payload: { account: string; jsonContent: string }) =>
    postConcept<{ importJob: string; connectionsImported: number }>(
      "LinkedInImport",
      "importConnectionsFromJSON",
      payload,
    ),
};

export interface Comparison {
  _id: string;
  node1: string;
  node2: string;
  llmSimilarityScore?: number;
  llmReasoning?: string;
  llmConfidence?: "high" | "medium" | "low";
  userDecision?: "same" | "different" | "pending";
  userConfirmedAt?: string;
  createdAt: string;
  node1Info?: Record<string, unknown>;
  node2Info?: Record<string, unknown>;
}

export interface Merge {
  _id: string;
  node1: string;
  node2: string;
  comparison: string;
  mergedAt: string;
  mergedBy?: "system" | "user";
}

      export const LLMDisambiguationAPI = {
        compareNodes: (payload: {
          node1: string;
          node2: string;
          node1Info?: Record<string, unknown>;
          node2Info?: Record<string, unknown>;
        }) => postConcept<{ comparison: string }>("LLMDisambiguation", "compareNodes", payload),
        analyzeComparison: (payload: { comparison: string }) =>
          postConcept("LLMDisambiguation", "analyzeComparison", payload),
        confirmComparison: (payload: {
          comparison: string;
          userDecision: "same" | "different";
        }) => postConcept("LLMDisambiguation", "confirmComparison", payload),
        mergeNodes: (payload: {
          comparison: string;
          keepNode: string;
        }) => postConcept<{ merge: string }>("LLMDisambiguation", "mergeNodes", payload),
        cancelComparison: (payload: { comparison: string }) =>
          postConcept("LLMDisambiguation", "cancelComparison", payload),
  getComparison: (payload: { node1: string; node2: string }) =>
    postConcept<Comparison[]>("LLMDisambiguation", "_getComparison", payload),
  getComparisonsForNode: (payload: { node: string }) =>
    postConcept<Comparison[]>("LLMDisambiguation", "_getComparisonsForNode", payload),
  getPendingComparisons: () =>
    postConcept<Comparison[]>("LLMDisambiguation", "_getPendingComparisons", {}),
  getMergesForNode: (payload: { node: string }) =>
    postConcept<Merge[]>("LLMDisambiguation", "_getMergesForNode", payload),
  getComparisonDetails: (payload: { comparison: string }) =>
    postConcept<Comparison[]>("LLMDisambiguation", "_getComparisonDetails", payload),
};
