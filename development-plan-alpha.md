# Development Plan Update

## Progress

We met our goals we set for the Alpha deadline and have implemented core backend concepts, including UserAuthentication, PublicProfile, MultiSourceNetwork, LinkedInImport, and SemanticSearch. Our frontend can support most of these features now as well.

### Alpha 1 (Network): PublicProfile & MultiSourceNetwork

**Backend Lead:** Ivy
**Frontend Lead:** Jing

**Progress:**
- Completed backend user authentication (login, session management).
- Implemented CRUD APIs for account creation, public profile management, visibility settings, skills, and user links.
- Completed MultiSourceNetwork data model with support for nodes and edges.
- Frontend now supports user signup/login and allows users to create custom nodes and edges within their network.
- Initial graph display is live and supports basic interaction.

---

### Alpha 2 (Search): SemanticSearch

**Backend Lead:** Jenna
**Frontend Lead:** Jing, Jenna

**Progress:**
- Implemented the SemanticSearch backend concept, including indexItem, queryItems, refineQuery, and searchConnections.
- Persist owner-scoped indexed items and wire them to txtai so new text is embedded and added to a per-owner semantic index automatically.
- Added owner-level reindexing so that when items change, the txtai index is refreshed without manual maintenance.
- Store search queries and support iterative “refine query” flows for better search UX.

---

### Alpha 3 (Importing):  MultiSourceNetwork & LinkedInImport (import flows)

**Backend Lead:** Cole Ruehle
**Frontend Lead:** Jing

**Progress:**
- Implemented LinkedIn information scraping as the first external source.
- Added sync logic to merge imported LinkedIn data into the MultiSourceNetwork.
- Authentication for OAuth-based imports is in progress.
- Frontend displays network as a graph, showing connected components.

---

### Alpha (Graph display): GraphExplorer, Final Integration

**Backend Lead:** Cole Ruehle
**Frontend Lead:** Jing

**Progress:**
- Graph display is implemented and connected to backend network data.
- Users can view and explore their imported data from LinkedIn and custom-created nodes/edges.

---

### Beta Checkpoint Goals (Next Steps)

Our goals for our Beta checkpoint largely remains the same as we had planned in our previous development plan:

**Backend Lead:** Cole, Jenna, Ivy
**Frontend Lead:** Jing

**Goals:**
- Public Network Building
  - Allow users to add people who are outside their network
- Semantic Search Frontend
  - Integrate semantic search into frontend, allowing updated graph visualizations
- Frontend UI/UX Polish
  - Improve clarity of navigation, graph interactions, and onboarding flows.
  - Add visual consistency, spacing, tooltips, and better error states.
- Complete Backend–Frontend Syncs
  - Ensure profile edits, network mutations, and imports all trigger proper semantic reindexing.
  - Connect search results to the graph explorer view.
- Graph Explorer Search Integration
  - Display semantic search results directly on the graph.
- Bug Fixing and Data Normalization
  - Ensure all imported data sources follow a unified structure.
  - Fix inconsistencies in node/edge formatting, missing fields, and provenance tracking.
- Make improvements based on user feedback


---

### Summary Table of Team Responsibilities

| Phase                | Backend Lead    | Frontend Lead | Focused Concept(s)                 |
|----------------------|----------------|---------------|-------------------------------------|
| Alpha 1 (Network)    | Ivy            | Jing          | PublicProfile, MultiSourceNetwork   |
| Alpha 2 (Search)     | Jenna          | Jing          | SemanticSearch                      |
| Alpha 3 (Importing)  | Cole Ruehle    | Jing          | MultiSourceNetwork (import flows)   |
| Beta (Graph display)    | Cole Ruehle          | Jing          | GraphExplorer, Final Integration    |
| Beta (Viz/Polish)    | Cole, Ivy, Jenna          | Jing          | GraphExplorer, Final Integration    |
| Beta (Syncs)    | Cole, Jenna, Ivy          | Jing          | Final Integration    |
| Beta (Public Networks)    |  Ivy          | Jing          | Final Integration    |
| Beta (Bug Fixing and Improvements)    |  Cole, Jenna, Ivy          | Jing          | Final Integration    |
