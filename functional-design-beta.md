
# Problem Framing

## Domain

Our domain is social media specifically in the networking sense. It will cross into other corporate or professional tools like application listing platforms and portfolio sharing resources as it tries to serve the user and employer side of those services.

## Problem

Social media apps for networking don't help with the problem of finding who I know. You have to remember or search through your list in hopes of finding the person you want. When it comes to hiring out, trying to learn, you are looking for someone with specific knowledge, skills, and experience. Our app will turn your social network into a tool for connection, hiring, and knowledge.

## Evidence

1. **Personal Testimonial:** I've hired multiple engineers at my company, and the biggest challenge is quickly finding strong candidates. The best hires almost always come through introductions from my network because trusted connections act as a filter and respond faster. My boss frequently mentions that he knows he is connected to many great engineers but has no efficient way to find them.
2. [**The Shortest Path to Better Hires: Best Practices for Employee Referral Programs:**](https://www.oracle.com/us/shortest-path-to-better-hires-1898145.pdf) States that better employees can be found through referred candidates (i.e. those in your network). "The people closest to your best employees are also likely to be good employees."
3. [**Why Posting Jobs Is Not Enough to Get Good Candidates:**](https://thinkingahead.com/resources/hiring-advice/why-posting-jobs-is-not-enough-to-get-good-candidates/) Posting job opportunities online can often be inefficient. As the article states, an average job posting gets a few hundred applications, which can be overwhelming for the recruiters. Job postings also do not attract all talents, and the article recommends that the recruiter actively reach out to potential employees rather than post passively.
4. [**The Hidden Cost of Hiring: Why Relying on Job Applications for Specialized Roles is Costing You More Than You Think:**](https://www.opsvs.com/2025/03/06/the-hidden-cost-of-hiring-why-relying-on-job-applications-for-specialized-roles-is-costing-you-more-than-you-think) Mentions that searching for candidates the traditional way through online posting lead to higher turnover rates and less productivity. Instead, being able to find an employee within one's network is more cost effective and efficient.
5. [**Does An Employee Refferal Make A Difference**](https://www.forbes.com/sites/carolinecenizalevine/2023/10/06/does-an-employee-referral-make-a-difference/) Employee referrals acts as a shortcut for the recruiters saving them time with the employee selling your background and skills. The employee would already know what the job culture is like in this company, and knows what way to recommend one in more to help land the job.

## Comparables

1. **[LinkedIn](https://linkedin.com):**
    - Similar but different due to indexing it is also a content sharing mechanism rather than focusing on doing operations on the network data.
    - Limitations: Search feature is not flexible when it comes to search higher degree connections.
2. **[Instagram](https://www.instagram.com/):**
    - Also a network where you can see who follows who and who tags who allowing it to branch.
    - Limitations: Does not provide a lot of professional information about someone and does not allow ease of search for higher degree connections.
3. **Portfolio websites:**
    - A way an engineer can share their work in a way that it is hopefully searchable and indicative of their ability to professional employers.
    - Limitations: Often does not provide a wide enough network to be very helpful.
4. **[Indeed](https://www.indeed.com/):**
    - A method for generating leads to hire and connect. It uses a very different strategy though of blasting them out on a board and serving them to random individuals who have more agency rather than giving their information to employers who selectively reach out.
    - Limitations: Does not support searching for higher degree connections.

## Features

1. **Account Creation and Management** ✅ **IMPLEMENTED**
   - Users can create and manage their accounts.
   - Users control what information is visible, private, or excluded from their profile.

2. **Importing Connections from External Platforms** ⚠️ **PARTIALLY IMPLEMENTED**
   - ✅ Users can import LinkedIn connections via CSV upload with LLM-powered field mapping.
   - ❌ OAuth-based LinkedIn API imports not yet implemented.
   - ❌ Instagram and Handshake imports not yet implemented.

3. **LLM-Powered Connection Schema** ✅ **IMPLEMENTED**
   - The system uses an LLM to automatically interpret imported CSV connections' information.
   - Skills, roles, interests, and relevant attributes are inferred from public data.

4. **Network Querying for Relevant Connections** ✅ **IMPLEMENTED**
   - Users can query their network for relevant connections using semantic search.
   - The system semantically searches across the user's entire imported network using txtai service.

5. **Filtering Query Results** ⚠️ **PARTIALLY IMPLEMENTED**
   - ✅ Basic filtering by platform origin, company, location available in NetworkSearchPage.
   - ⚠️ Degree of separation filtering is partially implemented (UI exists but backend support is limited).
   - ⚠️ Education and mutual connections filtering not yet implemented.

6. **Interactive Network Exploration** ✅ **IMPLEMENTED**
   - Users can visually explore their entire multi-platform network through an interactive graph (vis-network).
   - Connections are color-coded by degree of separation (Root: red, 1st: yellow, 2nd: green, 3rd: sky blue, 4th: purple, 5+: gray).
   - Users can see node information on hover/click, drag nodes (with viewport constraints), zoom, pan, and center on root node.
   - ⚠️ LLM-based clustering not yet implemented.
   - ⚠️ Path highlighting between nodes not yet implemented.


## Ethical Analysis

1. **Values (Chosen Desired Values: Privacy and Consent):**
   - An important question is consent to be on the site. What permissions and consent do we need from someone to be able to use their information in our application?
   - We decided that importing only public profiles and that public information should be shared. We are aligning with the goal of those platforms and only sharing public employment information so it should be fair. Secondly, we will not disambiguate using personal info like phone numbers. Finally, we will have a set of push notifications saying something like "X manually added you to their network. Would you like to join the platform or dispute that you know this person, allowing someone to intervene.
   - ⚠️ **STATUS:** Notification system for non-users not yet implemented.

2. **Time (Reappropriation)**
   - Although the app is mostly aiming to help recruiters find candidates faster, users might use the search tool in other ways. For example, they can use the app to find peers with similar interests or classmates who have taken a class they wish to learn more about.
   - We can expand the app to not only store professional data from LinkedIn. Rather, we can also have the users input their own data if they wish. This would allow others to find them more easily in the network.
   - ✅ **STATUS:** Users can manually add nodes and edges to their network.

3. **Time (Choosing Not to Use)**
   - If some users choose not to use the app or choose not to consent to having their data on the app (keep everything private), then we might have some holes in the network.
   - We are going to limit ourselves to only public information. A few holes in the network is unavoidable, but the network will still be pretty complete. Our search feature would just have to be more robust and work around these missing pieces of information.

4. **Values (Value Tensions)**
   - A user might want to keep some of their information private, but because they want to be visible to recruiters on the app, they feel pressured to have more of their information visible and public on their profile.
   - We can introduce a visibility system, where some information is only visible to certain users (for instance, limiting it to only be visible to those in your direct network).
   - ⚠️ **STATUS:** Visibility system not yet implemented.

5. **Stakeholders (Indirect Stakeholders)**
   - People who do not use the app might find themselves appearing in searches because they were in someone else's network. This might create concerns about privacy.
   - We will only be using public data, so if someone prefers to remain private, their information will not show up in our application.

<br>

# Concept Design

## Concept Specifications

### concept: PublicProfile ✅ **IMPLEMENTED**

* **concept**: PublicProfile [User]
* **purpose**: Provide a concise, public-facing description of a user that others can quickly scan and interpret.
* **principle**: When a user creates a public profile with a headline, attributes, and links, anyone can later view that user's profile and consistently see the same information; if the user updates their profile, viewers will see the updated information the next time it is accessed.

* **state**:
    * a set of `Profiles` with
        * `user` User
        * `headline` String
        * `attributes` set of String
        * `links` set of String

* **actions**:
    * ✅ `createProfile (user: User, headline: String, attributes: set of String, links: set of String): Empty` - **IMPLEMENTED**
    * ✅ `updateProfile (user: User, headline: String?, attributes: set of String?, links: set of String?): Empty` - **IMPLEMENTED**
    * ✅ `deleteProfile (user: User): Empty` - **IMPLEMENTED**

* **notes**:
    * `attributes` can instead be represented as just a set of Strings if that fits better later on in the design process.

---

### concept: UserAuthentication ✅ **IMPLEMENTED**

* **concept**: UserAuthentication [User]
* **purpose**: Provide username/password based registration and authentication.
* **principle**: After a user registers with a username and password they can authenticate using the same credentials. Passwords are stored hashed with a salt. Helper functions to hash and verify passwords are internal implementation details and should use timing-safe comparisons.

* **state**:
	* a set of `Users` with
		* `id` User
		* `username` String
		* `passwordHash` String (stored as `salt:hash`)

* **actions**:
	* ✅ `register(username: String, password: String): { user }` - **IMPLEMENTED**
	* ✅ `authenticate(username: String, password: String): { user }` - **IMPLEMENTED**
	* ✅ `searchUsers(query: String, limit?: Number): { users }` - **IMPLEMENTED**
	* ✅ `hashPassword(password: String) -> String` - **IMPLEMENTED**
	* ✅ `verifyPassword(password: String, stored: String) -> Boolean` - **IMPLEMENTED**

---

### concept: MultiSourceNetwork ✅ **IMPLEMENTED**

* **concept**: MultiSourceNetwork [Owner, Node, Source]
* **purpose**: Allow an owner to maintain and explore a single unified network of nodes and connections that may originate from multiple independent sources.
* **principle**: Each canonical Node is stored once globally. An owner's unified graph is the combination of `Memberships` (which record which source(s) brought a node into the owner's network) and owner-scoped `Edges` (each attributed to a Source). When a contributing Source removes its data, the owner's network reflects those removals automatically.

* **state**:
    * a set of `Networks` with
        * `_id` String
        * `owner` Owner
        * `root?` Node
        * `createdAt?` String
        * `updatedAt?` String
    * a set of `Memberships` with
        * `_id` String
        * `owner` Owner
        * `node` Node
        * `sources` JSON (map of sourceId -> metadata)
        * `createdAt?` String
        * `updatedAt?` String
    * a set of `Edges` with
        * `_id` String
        * `owner` Owner
        * `from` Node
        * `to` Node
        * `source` Source
        * `weight?` Number
        * `createdAt?` String
        * `updatedAt?` String
    * a set of `Nodes` with
        * `_id` String
        * `sourceIds?` String
        * `metaData?` JSON

* **actions**:

    * ✅ `createNetwork (owner: Owner, root: Node?): Empty` - **IMPLEMENTED**
    * ✅ `setRootNode (owner: Owner, root: Node): Empty` - **IMPLEMENTED**
    * ✅ `addNodeToNetwork (owner: Owner, node: Node, source: Source): Empty` - **IMPLEMENTED**
    * ✅ `createNodeForUser ({ owner, metaData?, ..., sourceIds? }): { node } | { error }` - **IMPLEMENTED**
    * ✅ `addOrMigrateNodeFromSource ({ owner, legacyNodeId?, source, nodeMeta?, externalId? }): { node }` - **IMPLEMENTED**
    * ✅ `removeNodeFromNetwork (owner: Owner, node: Node, source: Source?): Empty` - **IMPLEMENTED**
    * ✅ `searchNodes (owner: Owner, query?: String, limit?: Number, offset?: Number): { results }` - **IMPLEMENTED**
    * ✅ `getNodes ( ids: String[], owner: Owner ): Node[]` - **IMPLEMENTED**
    * ✅ `addEdge (owner: Owner, from: Node, to: Node, source: Source, weight: Number?): Empty` - **IMPLEMENTED**
    * ✅ `removeEdge (owner: Owner, from: Node, to: Node, source: Source): Empty` - **IMPLEMENTED**
    * ✅ `getAdjacencyArray (owner: Owner): { adjacency, nodeLabels }` - **IMPLEMENTED** (returns adjacency map for graph visualization)

* **notes**:
    * metadata for nodes vary from implementation to implementation, depending on what the network represents.
    * The concept is multi-source because each node or edge may be contributed by one or more independent sources (e.g., multiple platforms).
    * This supports combining, removing, and updating source-specific network data without affecting other sources.
    * `Networks` represents the owner's unified network workspace and stores per-owner configuration such as the chosen `root` node.
    * `Memberships` records which nodes appear in the owner's unified network and tracks which sources contributed each node.
    * `searchNodes` is scoped to nodes that the owner has a membership for and (by implementation) only performs substring searches on `firstName` and `lastName` (case-insensitive). The UI should rely on the membership filter to control visibility.
    * Edge creation from imports is best-effort: the flow ensures membership exists and upserts the owner->node edge, but a failure to create the edge should not fail the overall import/sync operation.

---

### concept: LinkedInImport ⚠️ **PARTIALLY IMPLEMENTED**

* **concept**: LinkedInImport [User]
* **purpose**: Enable users to import their LinkedIn connections and associated profile information into the system, making this data available for network exploration and semantic search.
* **principle**: If a user exports their LinkedIn connections as CSV or JSON and imports them into the system, then the system uses LLM-powered field mapping to parse and store the connection data, and these connections are automatically added to their unified network graph.

* **state**:
    * a set of `LinkedInAccounts` with
        * `user` User
        * `accessToken` String
        * `refreshToken` String?
        * `expiresAt` Date?
        * `linkedInUserId` String
        * `linkedInEmail` String?
        * `linkedInName` String?
        * `createdAt` Date
        * `lastImportedAt` Date?
    * a set of `Connections` with
        * `account` LinkedInAccount
        * `linkedInConnectionId` String
        * `firstName` String?
        * `lastName` String?
        * `headline` String?
        * `location` String?
        * `industry` String?
        * `currentPosition` String?
        * `currentCompany` String?
        * `profileUrl` String?
        * `profilePictureUrl` String?
        * `summary` String?
        * `skills` set of String?
        * `education` JSON?
        * `experience` JSON?
        * `importedAt` Date
        * `rawData` JSON?
    * a set of `ImportJobs` with
        * `account` LinkedInAccount
        * `status` String (pending, in_progress, completed, failed)
        * `connectionsImported` Number
        * `connectionsTotal` Number?
        * `errorMessage` String?
        * `startedAt` Date
        * `completedAt` Date?

* **actions**:

    * ✅ `connectLinkedInAccount (user: User, accessToken: String, refreshToken: String?, expiresAt: Date?, linkedInUserId: String, linkedInEmail: String?, linkedInName: String?): (account: LinkedInAccount)` - **IMPLEMENTED** (but OAuth flow not yet integrated in frontend)
    * ✅ `updateLinkedInAccount (account: LinkedInAccount, accessToken: String, refreshToken: String?, expiresAt: Date?): Empty` - **IMPLEMENTED**
    * ✅ `disconnectLinkedInAccount (account: LinkedInAccount): Empty` - **IMPLEMENTED**
    * ✅ `importConnectionsFromCSV (account: LinkedInAccount, csvContent: String): (importJob: ImportJob, connectionsImported: Number, connections: ConnectionDoc[])` - **IMPLEMENTED** (with LLM-powered field mapping via Gemini API)
    * ❌ `importConnectionsFromJSON (account: LinkedInAccount, jsonContent: String): (importJob: ImportJob, connectionsImported: Number)` - **NOT IMPLEMENTED**
    * ✅ `addConnection (account: LinkedInAccount, linkedInConnectionId: String, ...): (connection: Connection)` - **IMPLEMENTED**
    * ✅ `updateImportJobStatus (importJob: ImportJob, status: String, connectionsImported: Number, connectionsTotal: Number?, errorMessage: String?): Empty` - **IMPLEMENTED**
    * ❌ `startImport (account: LinkedInAccount): (importJob: ImportJob)` - **NOT IMPLEMENTED** (OAuth-based API import not yet implemented)

* **notes**:
    * The first version uses manual CSV/JSON import from LinkedIn's export feature rather than API scraping, ensuring ethical data handling and avoiding API limitations.
    * LLM-powered field mapping allows the system to intelligently interpret various CSV/JSON formats that users may export from LinkedIn.
    * Connections are automatically added to MultiSourceNetwork via synchronization when `importConnectionsFromCSV` is called.
    * The concept supports future expansion to OAuth-based API imports once proper permissions and ethical considerations are addressed.

---

### concept: SemanticSearch ✅ **IMPLEMENTED**

* **concept**: SemanticSearch [Owner, Item]
* **purpose**:
  Allow an owner to perform semantic, intent-based searches over their items and receive a ranked list of items most related to the query.
* **principle**:
  When an owner indexes items with descriptive text, and later issues a natural-language query, the concept produces a ranked set of items whose descriptions are most relevant. If the query is refined, the ranking adapts accordingly.

* **state**:
    * a set of `IndexedItems` with
        * `item` Item
        * `owner` Owner
        * `text` String
        * `vector` JSON?

    * a set of `SearchQueries` with
        * `queryID` String
        * `owner` Owner
        * `queryText` String
        * `filters` JSON?
        * `resultItems` Item[]

* **actions**:

    * ✅ `indexItem (owner: Owner, item: Item, text: String, vector: JSON?): Empty` - **IMPLEMENTED** (uses txtai service)
    * ✅ `removeIndexedItem (owner: Owner, item: Item): Empty` - **IMPLEMENTED**
    * ✅ `queryItems (owner: Owner, queryText: String, filters: JSON?): (queryID: String, results: Array<{item: Item, score: number, text: string}>)` - **IMPLEMENTED** (uses txtai service)
    * ⚠️ `refineQuery (queryID: String, filters: JSON): Empty` - **PARTIALLY IMPLEMENTED** (action exists but not fully integrated with frontend)

* **invariants**:
    * All `resultItems` in any query belong to the same owner's indexed items.

* **notes**:
    * `vector` is part of the state to consider support for vector-based semantic similarity.
    * The concept does not assume anything about how semantic similarity is computed.
    * Currently uses txtai service running on localhost:8001 for semantic search.

---

### concept: GraphExplorer ⚠️ **NOT IMPLEMENTED AS BACKEND CONCEPT**

* **concept**: GraphExplorer [Viewer, Node]
* **purpose**: Let a viewer open and adjust an explorable graph view of nodes, including visible nodes, grouping, layout, filters, and optional highlighted paths.
* **principle**: When a viewer opens a graph view over a set of nodes, they see those nodes laid out, can adjust filters and groupings, and optionally highlight a path.

* **status**: ⚠️ **Graph visualization is implemented in frontend only (MultiSourceNetworkPage.vue using vis-network), but GraphExplorer as a backend concept with persistent state is NOT implemented and NOT needed.**

* **concept specification**: See [GraphExplorer Concept Design](design/concepts/GraphExplorer/GraphExplorer.md) for detailed implementation status.

* **Frontend Implementation** (MultiSourceNetworkPage.vue):
    * ✅ Interactive graph visualization with vis-network
    * ✅ Node color-coding by degree of separation
    * ✅ Node dragging (with viewport constraints)
    * ✅ Graph panning and zooming
    * ✅ Center on root node functionality
    * ✅ Node hover/click tooltips with detailed information
    * ✅ Degree-based node sizing and edge styling
    * ✅ Bidirectional edge rendering
    * ❌ Layout persistence (not stored in backend)
    * ❌ Highlighted paths between nodes
    * ❌ Backend-stored filters and groupings
    * ❌ Multiple graph views per user

* **Backend State** (NOT IMPLEMENTED):
    * ❌ a set of `GraphViews` with `viewID`, `viewer`, `visibleNodes`, `anchorNode`, `filters`
    * ❌ a set of `Layouts` with `viewID`, `node`, `x`, `y`, `groupID`
    * ❌ a set of `HighlightedPaths` with `viewID`, `nodes`

* **Backend Actions** (NOT IMPLEMENTED):
    * ❌ `createGraphView (viewer: Viewer, visibleNodes: set of Node, anchorNode: Node?, filters: JSON?): (viewID: String)`
    * ❌ `updateVisibleNodes (viewID: String, visibleNodes: set of Node): Empty`
    * ❌ `updateLayouts (viewID: String, layouts: seq of { node: Node, x: Number, y: Number, groupID: String? }): Empty`
    * ❌ `setFilters (viewID: String, filters: JSON): Empty`
    * ❌ `setAnchorNode (viewID: String, anchorNode: Node): Empty`
    * ❌ `setHighlightedPath (viewID: String, nodes: seq of Node): Empty`
    * ❌ `clearHighlightedPath (viewID: String): Empty`

---

## Syncs

**sync** createNetworkForNewProfile ❌ **NOT IMPLEMENTED**

**when**
-   PublicProfile.createProfile(user)
-   MultiSourceNetwork.createNetwork(owner: user?) : (network?)

**where**
-   if owner has no network

**then**
-   MultiSourceNetwork.createNetwork(owner: user, root: user)
-   MultiSourceNetwork.addNodeToNetwork(owner: user, node: user, source: "profile")

---

**sync** addProfileLinksToNetwork ❌ **NOT IMPLEMENTED**

**when**
- PublicProfile.updateProfile (user, links)

**then**
- for each link in links:
   - MultiSourceNetwork.addNodeToNetwork (owner: user, node: link, source: "profile_links")
   - MultiSourceNetwork.addEdge (owner: user, from: user, to: link, source: "profile_links")

---

**sync** reindexProfileForSemanticSearch ❌ **NOT IMPLEMENTED**

**when**
- PublicProfile.updateProfile (user, headline?, attributes?, links?)

**then**
- SemanticSearch.indexItem (owner: user, item: user, text: concatenated profile)

---

**sync** searchCreatesGraphView ❌ **NOT IMPLEMENTED**

**when**
- SemanticSearch.queryItems (owner, queryText, filters) : (queryID)

**then**
- GraphExplorer.createGraphView (viewer: owner, visibleNodes: resultItems)

---

**sync** refinedSearchUpdatesGraphView ❌ **NOT IMPLEMENTED**

**when**
- SemanticSearch.refineQuery (queryID, filters)

**where**
- in SemanticSearch: get updated resultItems for queryID
- in SearchMapping: find GraphView associated with queryID

**then**
- GraphExplorer.updateVisibleNodes (viewID, resultItems)

---

**sync** CreateCanonicalNodeFromLinkedInConnection ✅ **IMPLEMENTED**

**when**
- LinkedInImport.importConnectionsFromCSV (account, csvContent) : (connections)

**where**
- in LinkedInImport: get user (owner) from account
- expand frames for each connection in the returned connections array

**then**
- MultiSourceNetwork.addOrMigrateNodeFromSource (owner: user, source: "linkedin", nodeMeta: connectionDoc, externalId, legacyNodeId)

---

**sync** AddLinkedInConnectionToNetwork ✅ **IMPLEMENTED**

**when**
- LinkedInImport.addConnection (account, linkedInConnectionId, ...) : (connection)

**where**
- in LinkedInImport: get user (owner) from account
- in LinkedInImport: get connection document (firstName, lastName, label)

**then**
- MultiSourceNetwork.createNetwork (owner: user, root: user) [idempotent]
- MultiSourceNetwork.addNodeToNetwork (owner: user, node: connection, source: "linkedin", label: label)
- MultiSourceNetwork.addEdge (owner: user, from: user, to: connection, source: "linkedin")

---

<br>

# Current Implementation Status

## ✅ Fully Implemented Features

1. **User Authentication & Account Management**
   - User registration and login
   - Password hashing with salt
   - User search functionality

2. **Public Profile Management**
   - Create, update, and delete profiles
   - Headline, attributes, and links management
   - Profile viewing

3. **Multi-Source Network Core**
   - Network creation with root node
   - Node and edge management (add/remove)
   - Source tracking per node and edge
   - Node search functionality
   - Adjacency array retrieval for graph visualization
   - Manual node/edge creation with rich metadata (firstName, lastName, headline, location, industry, position, company, skills, education, experience, etc.)

4. **LinkedIn Import (CSV)**
   - CSV file upload and parsing
   - LLM-powered field mapping (Gemini API)
   - Automatic connection creation
   - Import job tracking
   - Automatic network node creation via syncs

5. **Semantic Search**
   - Item indexing with txtai service
   - Natural language querying
   - Ranked search results
   - Connection search integration in PublicProfilePage

6. **Graph Visualization (Frontend)**
   - Interactive network graph using vis-network
   - Degree-based color coding (Root: red, 1st: yellow, 2nd: green, 3rd: sky blue, 4th: purple, 5+: gray)
   - Node dragging with viewport constraints
   - Graph panning and zooming
   - Center on root node functionality
   - Node information tooltips (hover/click persistence)
   - Bidirectional edge rendering
   - Degree-based node sizing and edge styling

7. **Network Search & Filtering (Frontend)**
   - Basic node search by name
   - Filtering by platform/source
   - Filtering by company and location
   - Profile modal with detailed connection information
   - Connection editing capabilities

## ⚠️ Partially Implemented Features

1. **LinkedIn Import**
   - ✅ CSV import fully working
   - ❌ JSON import not implemented
   - ❌ OAuth-based API import not implemented (backend actions exist but frontend flow not integrated)

2. **Semantic Search**
   - ✅ Basic querying implemented
   - ⚠️ Query refinement partially implemented (backend action exists but not fully integrated)

3. **Graph Visualization**
   - ✅ Frontend visualization fully functional
   - ❌ Backend GraphExplorer concept not implemented (no persistent layouts, views, or highlighted paths) and not needed since it can be integrated into Multi-Source Network concept.

4. **Filtering**
   - ✅ Basic filtering by source, company, location
   - ⚠️ Degree filtering UI exists but backend support is limited
   - ❌ Education and mutual connections filtering not implemented

## ❌ Not Implemented Features

1. **GraphExplorer Backend Concept**
   - No persistent graph views
   - No layout persistence
   - No highlighted paths storage
   - No backend-managed filters and groupings

2. **Synchronizations**
   - `createNetworkForNewProfile` - Network not auto-created when profile is created
   - `addProfileLinksToNetwork` - Profile links not automatically added as network nodes
   - `reindexProfileForSemanticSearch` - Profile updates don't trigger semantic search reindexing
   - `searchCreatesGraphView` - Search results don't automatically create graph views
   - `refinedSearchUpdatesGraphView` - Query refinement doesn't update graph views

3. **LinkedIn Import Extensions**
   - JSON import format support
   - OAuth-based API import (frontend integration)

4. **Multi-Platform Import**
   - Instagram import
   - Handshake import
   - Other platform integrations

5. **Privacy & Consent Features**
   - Notification system for non-users
   - Visibility system (selective information disclosure)
   - Opt-out mechanism for indirect stakeholders

6. **Advanced Graph Features**
   - LLM-based clustering
   - Path highlighting between nodes
   - Multiple saved graph views per user
   - Backend-stored layout persistence

7. **Advanced Filtering**
   - Education-based filtering
   - Mutual connections filtering
   - Full degree-of-separation filtering with backend support

---

# Missing Features Summary

## High Priority (Core Functionality Gaps)

1. **GraphExplorer Backend Concept** - The graph visualization exists only in the frontend. To fully realize the design, we need:
   - Backend storage for graph views, layouts, and highlighted paths
   - Actions to create, update, and manage graph views
   - Integration with search results to automatically create graph views

2. **Critical Synchronizations** - Several syncs that connect concepts are missing:
   - `createNetworkForNewProfile` - Auto-create network when profile is created
   - `reindexProfileForSemanticSearch` - Keep search index updated when profiles change
   - `searchCreatesGraphView` - Automatically visualize search results
   - `refinedSearchUpdatesGraphView` - Update graph when search is refined

3. **LinkedIn JSON Import** - Currently only CSV import is supported

## Medium Priority (Feature Completeness)

4. **OAuth-Based LinkedIn Import** - Backend actions exist but frontend OAuth flow not integrated

5. **Path Highlighting** - Users can't visually see connection paths between nodes

6. **Layout Persistence** - Graph layouts reset on page refresh (no backend storage)

7. **Advanced Filtering** - Education and mutual connections filtering not implemented

## Lower Priority (Nice-to-Have)

8. **Multi-Platform Imports** - Instagram, Handshake, and other platforms

9. **Privacy Features** - Notification system for non-users, visibility controls, opt-out mechanisms

10. **LLM-Based Clustering** - Automatic node grouping based on semantic similarity

11. **Multiple Graph Views** - Save and switch between different graph visualizations

---

# UI/UX Polish Status

## ✅ Polished Features
- Graph visualization with smooth interactions
- Node tooltips with comprehensive information
- Responsive design for network management
- Status banners for user feedback
- Search autocomplete and filtering UI

## ⚠️ Needs Polish
- Graph layout could be more stable (physics simulation sometimes causes jitter)
- Network search page could have better empty states
- Import page could show better progress indicators
- Some forms could have better validation feedback

## ❌ Not Yet Polished
- Overall visual design consistency
- Mobile responsiveness (partially implemented)
- Accessibility features (keyboard navigation, screen readers)
- Loading states and error handling could be more comprehensive
- Onboarding flow for new users

---

# Design Summary

The application currently implements **four of the five core concepts** (PublicProfile, UserAuthentication, MultiSourceNetwork, LinkedInImport, and SemanticSearch), with **GraphExplorer existing only as a frontend visualization** rather than a full backend concept. The system successfully enables users to:

1. ✅ Create accounts and manage public profiles
2. ✅ Import LinkedIn connections via CSV with LLM-powered field mapping
3. ✅ Build and manage a unified multi-source network graph
4. ✅ Perform semantic searches over their network
5. ✅ Visually explore their network with an interactive graph
6. ✅ Search and filter connections by various criteria

However, several **synchronizations that connect these concepts** are missing, which means some automatic workflows (like auto-creating networks when profiles are created, or auto-updating search indexes when profiles change) are not yet implemented. Additionally, the **GraphExplorer backend concept** is not implemented, meaning graph views, layouts, and highlighted paths are not persisted or managed by the backend.

The design directly incorporates privacy, consent, visibility control, and data provenance into its conceptual structure. PublicProfile gives users explicit control over what information is displayed publicly, while MultiSourceNetwork only imports public data and keeps track of which platform each piece of information came from. However, the **visibility system and notification system for non-users** mentioned in the ethics assessment are not yet implemented.

**Remaining Issues:**

1. The application is handling indirect stakeholders—people who appear in another user's imported network without using the platform. Although we are only sharing their public data which can be accessed by anyone, the indirect stakeholders might find it discomforting. **We are not yet sending notifications to non-users of our platform** which was mentioned in the ethics assessment.

2. The system assumes that semantic inference from public profiles is accurate enough for sensitive tasks like hiring, but if the user choose to use LLM for ranking other users or our developed ranking algorithm is biased, it would require mitigation strategies.
