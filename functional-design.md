
# Problem Framing

## Domain

Our domain is social media specifically in the networking sense. It will cross into other corporate or professional tools like application listing platforms and portfolio sharing resources as it tries to serve the user and employer side of those services.

## Problem

Social media apps for networking don’t help with the problem of finding who I know. You have to remember or search through your list in hopes of finding the person you want. When it comes to hiring out, trying to learn, you are looking for someone with specific knowledge, skills, and experience. Our app will turn your social network into a tool for connection, hiring, and knowledge.

## Evidence

1. **Personal Testimonial:** I’ve hired multiple engineers at my company, and the biggest challenge is quickly finding strong candidates. The best hires almost always come through introductions from my network because trusted connections act as a filter and respond faster. My boss frequently mentions that he knows he is connected to many great engineers but has no efficient way to find them.
2. [**The Shortest Path to Better Hires: Best Practices for Employee Referral Programs:**](https://www.oracle.com/us/shortest-path-to-better-hires-1898145.pdf) States that better employees can be found through referred candidates (i.e. those in your network). “The people closest to your best employees are also likely to be good employees.”
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

1. **Account Creation and Management**
   - Users can create and manage their accounts.
   - Users control what information is visible, private, or excluded from their profile.

2. **Importing Connections from External Platforms**
   - Users can connect external platforms such as LinkedIn, Instagram, or Handshake.
   - Public information about their connections is imported into a unified in-app network.

3. **LLM-Powered Connection Schema**
   - The system uses an LLM to automatically interpret imported connections' information.
   - Skills, roles, interests, and relevant attributes are inferred from public data.

4. **Network Querying for Relevant Connections**
   - Users can query their network for relevant connections.
   - The LLM semantically searches across the user’s entire imported network to find these relevant people.

5. **Filtering Query Results**
   - After querying, users can apply filters such as:
     - Platform origin (LinkedIn, Instagram, etc.)
     - Education, company, location, or mutual connections
     - Degree of separation
     - Etc.

6. **Interactive Network Exploration**
   - Users can visually explore their entire multi-platform network or any post-query subset through an interactive graph.
   - Connections are clustered and color-coded using LLM inference.
   - Users can see how any person is connected to them through intermediaries.


## Ethical Analysis

1. **Values (Chosen Desired Values: Privacy and Consent):**
   - An important question is consent to be on the site. What permissions and consent do we need from someone to be able to use their information in our application?
   - We decided that importing only public profiles and that public information should be shared. We are aligning with the goal of those platforms and only sharing public employment information so it should be fair. Secondly, we will not disambiguate using personal info like phone numbers. Finally, we will have a set of push notifications saying something like “X manually added you to their network. Would you like to join the platform or dispute that you know this person, allowing someone to intervene.

2. **Time (Reappropriation)**
   - Although the app is mostly aiming to help recruiters find candidates faster, users might use the search tool in other ways. For example, they can use the app to find peers with similar interests or classmates who have taken a class they wish to learn more about.
   - We can expand the app to not only store professional data from LinkedIn. Rather, we can also have the users input their own data if they wish. This would allow others to find them more easily in the network.

3. **Time (Choosing Not to Use)**
   - If some users choose not to use the app or choose not to consent to having their data on the app (keep everything private), then we might have some holes in the network.
   - We are going to limit ourselves to only public information. A few holes in the network is unavoidable, but the network will still be pretty complete. Our search feature would just have to be more robust and work around these missing pieces of information.

4. **Values (Value Tensions)**
   - A user might want to keep some of their information private, but because they want to be visible to recruiters on the app, they feel pressured to have more of their information visible and public on their profile.
   - We can introduce a visibility system, where some information is only visible to certain users (for instance, limiting it to only be visible to those in your direct network).

5. **Stakeholders (Indirect Stakeholders)**
   - People who do not use the app might find themselves appearing in searches because they were in someone else’s network. This might create concerns about privacy.
   - We will only be using public data, so if someone prefers to remain private, their information will not show up in our application.

# Concept Design

## Concept Specifications

### concept: PublicProfile

* **concept**: PublicProfile [User]
* **purpose**: Provide a concise, public-facing description of a user that others can quickly scan and interpret.
* **principle**: When a user creates a public profile with a headline, attributes, and links, anyone can later view that user’s profile and consistently see the same information; if the user updates their profile, viewers will see the updated information the next time it is accessed.

* **state**:
    * a set of `Profiles` with
        * `user` User
        * `headline` String
        * `attributes` set of String
        * `links` set of String

* **actions**:
    * `createProfile (user: User, headline: String, attributes: set of String, links: set of String): Empty`
        * **requires**:
            * No `Profiles` entry exists for `user`.
            * `user` exists.
            * `headline` is not empty.
        * **effects**:
            * Creates a new profile for `user` with the provided headline, attributes, and links.

    * `updateProfile (user: User, headline: String?, attributes: set of String?, links: set of String?): Empty`
        * **requires**:
            * A `Profiles` entry exists for `user`.
            * If `headline` is provided, it is not empty.
        * **effects**:
            * Updates each provided field on the profile.
            * Leaves unprovided fields unchanged.
            * Overwrites fields if explicitly provided as empty.

    * `deleteProfile (user: User): Empty`
        * **requires**:
            * A `Profiles` entry exists for `user`.
        * **effects**:
            * Removes the profile for `user`.

* **notes**:
    * `attributes` can instead be represented as just a set of Strings if that fits better later on in the design process.

---

### concept: MultiSourceNetwork

* **concept**: MultiSourceNetwork [Owner, Node, Source]
* **purpose**:
  Allow an owner to maintain and explore a single unified network of nodes and connections that may originate from multiple independent sources.
* **principle**:
  When an owner accumulates nodes and edges from different sources into their network, they can explore them as one combined graph. If any contributing source removes its nodes or edges, the owner’s unified network reflects these changes automatically.

* **state**:
    * a set of `Networks` with
        * `owner` Owner
        * `root` Node?
    * a set of `Memberships` with
        * `owner` Owner
        * `node` Node
        * `sources` JSON
    * a set of `Edges` with
        * `owner` Owner
        * `from` Node
        * `to` Node
        * `source` Source
        * `weight` Number?

* **actions**:

    * `createNetwork (owner: Owner, root: Node?): Empty`
        * **requires**:
            * No `Networks` entry exists for `owner`.
        * **effects**:
            * Creates a new `Networks` entry for the owner with optional `root`.

    * `setRootNode (owner: Owner, root: Node): Empty`
        * **requires**:
            * A `Networks` entry exists for `owner`.
            * A `Memberships` entry exists for `(owner, root)`.
        * **effects**:
            * Sets the `root` field for the owner’s network.

    * `addNodeToNetwork (owner: Owner, node: Node, source: Source): Empty`
        * **requires**: none.
        * **effects**:
            * Creates or updates a `Memberships` entry by adding `source` to the node’s source set.

    * `removeNodeFromNetwork (owner: Owner, node: Node, source: Source?): Empty`
        * **requires**:
            * A `Memberships` entry exists for `(owner, node)`.
        * **effects**:
            * If `source` is provided: remove it from the node’s `sources` set.
            * If `sources` becomes empty: delete the `Memberships` entry and all corresponding `Edges` for the owner.

    * `addEdge (owner: Owner, from: Node, to: Node, source: Source, weight: Number?): Empty`
        * **requires**:
            * `from != to`.
        * **effects**:
            * Creates or updates an `Edges` entry for `(owner, from, to, source)` with optional `weight`.

    * `removeEdge (owner: Owner, from: Node, to: Node, source: Source): Empty`
        * **requires**:
            * An `Edges` entry exists for `(owner, from, to, source)`.
        * **effects**:
            * Removes the specified edge.

* **notes**:
    * The concept is multi-source because each node or edge may be contributed by one or more independent sources (e.g., multiple platforms).
    * This supports combining, removing, and updating source-specific network data without affecting other sources.
    * `Networks` represents the owner’s unified network workspace and stores per-owner configuration such as the chosen `root` node.
    * `Memberships` records which nodes appear in the owner’s unified network and tracks which sources contributed each node.


---

### concept: SemanticSearch

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

    * `indexItem (owner: Owner, item: Item, text: String, vector: JSON?): Empty`
        * **requires**:
            * None
        * **effects**:
            * Creates or updates an `IndexedItems` entry for `(owner, item)` with the provided text and optional vector.

    * `removeIndexedItem (owner: Owner, item: Item): Empty`
        * **requires**:
            * None
        * **effects**:
            * Deletes any `IndexedItems` entry for `(owner, item)`.

    * `queryItems (owner: Owner, queryText: String, filters: JSON?): (queryID: String)`
        * **requires**:
            * `queryText` is not empty.
        * **effects**:
            * Creates a new `SearchQueries` entry with
              `queryText`, `filters`, and a ranked sequence `resultItems`.
            * Returns the new `queryID`.

    * `refineQuery (queryID: String, filters: JSON): Empty`
        * **requires**:
            * A `SearchQueries` entry with `queryID` exists.
        * **effects**:
            * Updates the filters for the query.
            * Recomputes and replaces `resultItems` based on new filters.

* **invariants**:
    * All `resultItems` in any query belong to the same owner's indexed items.

* **notes**:
    * `vector` is part of the state to consider support for vector-based semantic similarity.
    * The concept does not assume anything about how semantic similarity is computed.


---

### concept: GraphExplorer

* **concept**: GraphExplorer [Viewer, Node]
* **purpose**: Let a viewer open and adjust an explorable graph view of nodes, including visible nodes, grouping, layout, filters, and optional highlighted paths.
* **principle**: When a viewer opens a graph view over a set of nodes, they see those nodes laid out, can adjust filters and groupings, and optionally highlight a path.

* **state**:
    * a set of `GraphViews` with
        * `viewID` String
        * `viewer` Viewer
        * `visibleNodes` set of Node
        * `anchorNode` Node?
        * `filters` JSON?

    * a set of `Layouts` with
        * `viewID` String
        * `node` Node
        * `x` Number
        * `y` Number
        * `groupID` String?

    * a set of `HighlightedPaths` with
        * `viewID` String
        * `nodes` seq of Node

* **actions**:

    * `createGraphView (viewer: Viewer, visibleNodes: set of Node, anchorNode: Node?, filters: JSON?): (viewID: String)`
        * **requires**:
            * None
        * **effects**:
            * Creates a graph view and initial layouts.

    * `updateVisibleNodes (viewID: String, visibleNodes: set of Node): Empty`
        * **requires**:
            * None
        * **effects**:
            * Updates visible nodes and corresponding layouts.

    * `updateLayouts (viewID: String, layouts: seq of { node: Node, x: Number, y: Number, groupID: String? }): Empty`
        * **requires**:
            * None
        * **effects**:
            * Updates layout for each node.

    * `setFilters (viewID: String, filters: JSON): Empty`
        * **requires**:
            * None
        * **effects**:
            * Updates filters.

    * `setAnchorNode (viewID: String, anchorNode: Node): Empty`
        * **requires**:
            * None
        * **effects**:
            * Sets anchor node.

    * `setHighlightedPath (viewID: String, nodes: seq of Node): Empty`
        * **requires**:
            * None
        * **effects**:
            * Creates or updates highlighted path.

    * `clearHighlightedPath (viewID: String): Empty`
        * **requires**:
            * None
        * **effects**:
            * Removes highlighted path.

   **notes**
   * `anchorNode` is the node that the viewer wants the visualization to center around, which may be used for focus, zooming, or computing contextual relationships.
   * `Layouts` store the visual placement of nodes for a specific graph view. Each layout entry records the x/y position and optional group assignment for a node, allowing the concept to preserve or update how the viewer’s graph is arranged.

---

## Syncs

**sync** createNetworkForNewProfile

**when**
-   PublicProfile.createProfile(user)
-   MultiSourceNetwork.createNetwork(owner: user?) : (network?)

**where**
-   if owner has no network

**then**
-   MultiSourceNetwork.createNetwork(owner: user, root: user)
-   MultiSourceNetwork.addNodeToNetwork(owner: user, node: user, source: "profile")

---

**sync** addProfileLinksToNetwork

**when**
- PublicProfile.updateProfile (user, links)

**then**
- for each link in links:
   - MultiSourceNetwork.addNodeToNetwork (owner: user, node: link, source: "profile_links")
   - MultiSourceNetwork.addEdge (owner: user, from: user, to: link, source: "profile_links")

---
<!--when the user updates his profile, it's necessary to update every indexItem so when others search, it will be ranked correctly with the new version-->
**sync** reindexProfileForSemanticSearch

**when**
- PublicProfile.updateProfile (user, headline?, attributes?, links?)

**then**
- SemanticSearch.indexItem (owner: user, item: user, text: concatenated profile)

---

**sync** searchCreatesGraphView

**when**
- SemanticSearch.queryItems (owner, queryText, filters) : (queryID)

**then**
- GraphExplorer.createGraphView (viewer: owner, visibleNodes: resultItems)

---

**sync** refinedSearchUpdatesGraphView

**when**
- SemanticSearch.refineQuery (queryID, filters)

**where**
- in SemanticSearch: get updated resultItems for queryID
- in SearchMapping: find GraphView associated with queryID

**then**
- GraphExplorer.updateVisibleNodes (viewID, resultItems)

---

# User Journey

### Hiring
A user is trying to start a company in the finance sector. They need to hire a compliance expert to ensure their product is legally compliant. This is a position where specific experience is both highly relevant and in high demand; those with that experience are often drawn to larger companies. After asking around without success, the user believes someone in their network could at least introduce them to a qualified candidate. They search for "securities compliance experience, consumer loans, reserve ratios." The app uses vector search to find people whose profiles match this description, surfacing an individual who is recently retired with experience as a consumer banking analyst, but who described this experience in the form of a story about leading a task force. This person has linked their website so people can reach out via their Handshake profile. The user emails them about their project, and they agree to join as a part-time advisor.

### Job Search
A recently unemployed computer scientist is having a difficult time finding a new job. They are being screened out by resume reviews, despite having significant experience in geospatial projects—a valuable and specialized skill set. They use the app to pull up their network, looking for friends who might know of open positions or could introduce them to people who are hiring. They bring up the visual network, filtering by proximity to keywords such as "geospatial analysis," "mapping," and "navigation." As they navigate through their network and a few degrees out, they discover that their friend Jeff is connected to a nexus of people heavily involved in these areas. Since they have Jeff’s phone number, they reach out to ask about his experience in geospatial engineering and are subsequently invited to a conference for mapping software companies taking place in town in one month.

### Learning

A user is looking to get into sports analytics. It's often best to get a starting point from an expert, but they can't think of anyone in their network with that experience. They log into the app, create an account, and sync it with their LinkedIn network. Once the network is imported, the user searches for "sports analytics professional." After seeing there are several within one connection, they refine their search to "senior basketball analytics professional," seeing a smaller, ranked list that includes a short blurb from each profile. They find someone based in Boston, click to view the full imported profile, and then follow the link to LinkedIn to send a direct connection request with a message.


# UI Sketches
![Network Page UI Sketch](/images/networkPage.png)
*Figure: Main network visualization and navigation page.*

![Search Results UI Sketch](/images/resultsPage.png)
*Figure: Search results view after running a query across the imported network.*

![Search Interface UI Sketch](/images/searchPage.png)
*Figure: Semantic search and filter interface for exploring connections.*

# Visual Design Study

![Visual Design Study 1](/images/VDS1.png)
*Figure: Visual Design Study #1*

![Visual Design Study 2](/images/VDS2.png)
*Figure: Visual Design Study #2*


# Design Summary

The four core concepts—PublicProfile, MultiSourceNetwork, SemanticSearch, and GraphExplorer—work together and turns disparate social connections into a unified, queryable, explorable knowledge graph. PublicProfile establishes the user’s identity and structured information. MultiSourceNetwork merges imported connections from multiple platforms into a single source-aware graph, protecting privacy, preserving origin of the imported connections, and enabling flexible updates. SemanticSearch indexes profile and network data so that algorithm queries can surface relevant people across all imported platforms. GraphExplorer then visualizes the search results or the full network, allowing rich exploration, filtering, and understanding of how each connection relates to the user. The provided syncs coordinate these concepts so that profile updates reindex automatically, search results automatically create graph views, refinements dynamically update the visualization, and altogether keeps every update made by different users visible another. This ecosystem enables users to discover who in their network is relevant for hiring, learning, or introductions without manually browsing lists or remembering names.

The design directly incorporates privacy, consent, visibility control, and data provenance into its conceptual structure. PublicProfile gives users explicit control over what information is displayed publicly, while MultiSourceNetwork only imports public data and keeps track of which platform each piece of information came from. This ensures users can dispute or restrict how they appear in others’ networks without exposing private data. The semantic search and graph views operate exclusively on indexed items that users have chosen to make public or have explicitly imported, reducing coercive pressure to overshare. The visibility system proposed in the ethics assessment fits naturally into the PublicProfile attributes and the GraphExplorer filtering model, allowing selective disclosure. Additionally, MultiSourceNetwork supports automatic removal of nodes when their source data disappears, respecting non-users’ desire not to participate. Together, these mechanisms address privacy/consent concerns while still enabling meaningful network discovery.

**Remaining Issues:**

1. The application is handling indirect stakeholders—people who appear in another user’s imported network without using the platform. Although we are only sharing their public data which can be accessed by anyone, the indirect stakeholders might find it discomforting. We are sending notifications to non-users of our platform which can seems like privacy issues.

2. The system assumes that semantic inference from public profiles is accurate enough for sensitive tasks like hiring, but if the user choose to use LLM for ranking other users or our developed ranking algorithm is biased, it would require mitigation strategies.

# Development Plan

## Development Plan

Based on the feature backlog and team discussion, our development plan is organized into milestone phases that align directly with the core concepts outlined above: `PublicProfile`, `MultiSourceNetwork`, `SemanticSearch`, and `GraphExplorer`. Each phase emphasizes building the backend API for a core function, with the frontend constructed to exercise and demonstrate these features. Below, we break down the plan with responsibilities and technical focus for each step.

---

### Alpha Milestone 1: Core Backend Foundations

**Goals:**
- Implement backend APIs for account creation, network storage, and access.
- Build basic frontend to interact with backend and render user data.
- Lay groundwork for further features by modeling after the `PublicProfile` and `MultiSourceNetwork` concepts.

**Key Features:**
1. **User Account & PublicProfile**
   - API endpoints for creating/updating/deleting user accounts and their public profiles (headline, attributes, links).
   - Data storage that mirrors the concept’s state (per-user profile records).

2. **Unified Network Storage (MultiSourceNetwork)**
   - Backend database schemas and endpoints to store/import a user's multi-source network graph:
     - Nodes (people/items) and Edges (connections) as per the concept.
     - Attribution of each node/edge's source platform.
   - Ability to add/remove nodes/edges and handle multiple sources dynamically.

**Team Assignments:**
- **Backend (MultiSourceNetwork, storage):** Cole Ruehle
- **Frontend (UI for account/network):** Cole Ruehle

---

### Alpha Milestone 2: Semantic Search

**Goals:**
- Enable semantic (LLM or vector-based) search over user networks and profiles.
- Surface relevant connections and profiles based on natural language queries, as described in the `SemanticSearch` concept.

**Key Features:**
1. **Semantic Indexing**
   - API endpoints to index user profiles and network items (store text and/or vectors).
   - Connect profile and network updates to re-indexing automatically (see syncs).

2. **Search Functionality**
   - Endpoint to execute a semantic search for a user, returning a ranked list as defined by `SemanticSearch.queryItems`.
   - API to refine/filter search results per the concept model.
   - Link searches to updating/creating a graph view in accordance with the syncs.

**Team Assignments:**
- **Search Algorithm, Indexing:** Jenna (focus: backend search system)
- **Backend (API, integration):** Jenna, Cole Ruehle

---

### Alpha Milestone 3: Network Importing & Integration

**Goals:**
- Allow users to connect/import from platforms like LinkedIn, Instagram, or Handshake.
- Bind imported data to the core network graph, enabling cross-platform network merging per `MultiSourceNetwork`.

**Key Features:**
- OAuth or API-based integration for public data retrieval.
- Automated addition of imported connections with appropriate sources and edges.
- Address privacy and consent rules as per the concept and ethics analysis.

**Team Assignments:**
- **Importing from 3rd Parties:** Cole Ruehle

---

### Beta Milestone: Visual Exploration & Feedback

**Goals:**
- Deliver the frontend visualization for searching and exploring the unified network (`GraphExplorer`).
- Implement backend routines for clustering/layout (can generate layout server-side, send to frontend for rendering).
- Gather, respond to, and prioritize user feedback.

**Key Features:**
1. **Graph Visualization**
   - Frontend for interactive graph navigation, exploration, grouping, and filtering.
   - Backend services for auto-layout, clustering, and returning grouped/positioned nodes (as in `GraphExplorer.Layouts`).

2. **Refinement and Polish**
   - Finalize syncs so that all user-initiated actions (e.g., profile updates, new searches) trigger appropriate backend/front-end updates, keeping state consistent across concepts.

**Team Assignments:**
- **Visual Clustering/Layout (backend):** Jenna
- **Frontend polish, usability:** Cole Ruehle

---

### Summary Table

| Phase                | Backend Lead    | Frontend Lead | Focused Concept(s)                 |
|----------------------|----------------|---------------|-------------------------------------|
| Alpha 1 (Network)    | Ivy            | Jing          | PublicProfile, MultiSourceNetwork   |
| Alpha 2 (Search)     | Jenna          | Jing          | SemanticSearch                      |
| Alpha 3 (Importing)  | Cole Ruehle    | Jing          | MultiSourceNetwork (import flows)   |
| Beta (Graph display)    | TBD          | TBD          | GraphExplorer, Final Integration    |
| Beta (Viz/Polish)    | TBD          | TBD          | GraphExplorer, Final Integration    |

---

**Key Integration Points with Concepts:**
- Each API and backend implementation ties directly to the corresponding concept’s actions/state (e.g., profile CRUD reflects `PublicProfile` actions, all network mutations support dynamic sources per `MultiSourceNetwork`).
- Semantic search and indexing are coupled tightly with network/profile updates: profile changes re-index, importing triggers new indexing, search results automatically link to visualization (as described in syncs).
- Visual clustering and graph exploration APIs/services parallel the `GraphExplorer` concept, providing a data model and UI that supports filtering, highlighting paths, and dynamic layouts.

---

**Risks/Mitigation:**
- **Complex integration (multi-source data, privacy):** Follow the conceptual model’s rules strictly for source provenance, deletion, and privacy enforcement.
- **LLM or vector search accuracy/bias:** Provide user feedback interface and options for correcting or reporting results, and version new ranking/embedding methods safely.

For detailed tasks, responsibility handoffs, and risk contingencies, refer to the linked spreadsheet and document.

---


## Feature Delivery Timeline

[Product Backlog](https://docs.google.com/spreadsheets/d/116ISQtCtWRyhLde5VjYBxozTRcjoM0o3Lnhr-KnRByA/edit?usp=sharing)

## Team Responsibilities & Risks & Mitigation Document
[Responsibility,Risks,Backup](https://docs.google.com/document/d/1R_6nuRlOsQ65xkurcoxQNJ44AZzgTLI4bB5NlMPMtaQ/edit?usp=sharing)
