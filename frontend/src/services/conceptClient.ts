// Use environment variable for production, default to /api for local dev (Vite will proxy)
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api')
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

export interface LinkedInConnectionPreview {
  _id: string;
  linkedInConnectionId?: string;
  firstName?: string;
  lastName?: string;
  headline?: string | null;
  location?: string | null;
  industry?: string | null;
  currentPosition?: string | null;
  currentCompany?: string | null;
  profileUrl?: string | null;
  profilePictureUrl?: string | null;
  summary?: string | null;
}

export interface SemanticConnectionResult {
  connectionId: string;
  score: number;
  text: string;
  connection?: LinkedInConnectionPreview;
}

export const SemanticSearchAPI = {
  searchConnections: (payload: {
    owner: string;
    queryText: string;
    limit?: number;
  }) => postConcept<{ results: SemanticConnectionResult[] }>(
    "SemanticSearch",
    "searchConnections",
    payload,
  ),
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
  getUserByUsername: (payload: { username: string }) =>
    postConcept<{ user: string }[]>(
      "UserAuthentication",
      "_getUserByUsername",
      payload,
    ),
};

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

export interface SemanticConnectionResult {
  connectionId: string;
  score: number;
  text: string;
  connection?: {
    _id: string;
    linkedInConnectionId?: string;
    firstName?: string;
    lastName?: string;
    headline?: string | null;
    location?: string | null;
    industry?: string | null;
    currentPosition?: string | null;
    currentCompany?: string | null;
    profileUrl?: string | null;
    profilePictureUrl?: string | null;
    summary?: string | null;
  };
}

export const SemanticSearchAPI = {
  searchConnections: (payload: {
    owner: string;
    queryText: string;
    limit?: number;
  }) => postConcept<{ results: SemanticConnectionResult[] }>(
    "SemanticSearch",
    "searchConnections",
    payload,
  ),
};
