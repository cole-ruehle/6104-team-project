* **concept**: GraphExplorer [Viewer, Node]
* **purpose**: Let a viewer open and adjust an explorable graph view of nodes, including visible nodes, grouping, layout, filters, and optional highlighted paths.
* **principle**: When a viewer opens a graph view over a set of nodes, they see those nodes laid out, can adjust filters and groupings, and optionally highlight a path.

* **implementation status**: ✅ **Implemented as a frontend-only visualization in `MultiSourceNetworkPage.vue` using the vis-network library. This is a client-side graph exploration interface that renders network data fetched from MultiSourceNetwork.**

* **frontend state** (MultiSourceNetworkPage.vue):
    * Graph visualization state managed in Vue component:
        * `adjacency` - AdjacencyMap representing the network structure (fetched from MultiSourceNetwork.getAdjacencyArray)
        * `nodeLabels` - Record of node IDs to display labels
        * `nodeProfiles` - Record of node profile data (avatar URLs, usernames from PublicProfile and UserAuthentication)
        * `nodeMetaMap` - Record of node metadata (firstName, lastName, headline, location, industry, position, company, skills, education, experience, tags, sourceIds, timestamps)
        * `rootNodeId` - The root node ID (typically the owner/user ID, defaults to authenticated user)
        * `networkInstance` - vis-network Network instance (the graph visualization object)
        * `currentZoom` - Current zoom level (0.0 to 1.0+, displayed as percentage)
        * `hoveredNodeInfo` - Node information displayed on hover (temporary)
        * `clickedNodeInfo` - Node information persisted on click (remains visible until clicked again or clicking outside)
        * `tooltipStyle` - CSS positioning for the node information tooltip

* **frontend actions** (implemented in MultiSourceNetworkPage.vue):
    * `fetchAdjacency()` - Fetches adjacency data from MultiSourceNetwork API (getAdjacencyArray)
        * **effects**:
            * Retrieves network structure and node labels
            * Fetches profile data for all nodes
            * Loads node metadata via searchNodes
            * Automatically triggers renderNetwork() after data is loaded
    * `renderNetwork()` - Renders the graph visualization using vis-network
        * **effects**:
            * Calculates node degrees using BFS (shortest path from root)
            * Creates vis-network DataSet for nodes and edges
            * Applies degree-based styling (colors, sizes, edge styles)
            * Initializes vis-network with physics simulation
            * Sets up event handlers for interactions
            * Fits graph to viewport and centers on root node
    * `centerOnRootNode()` - Centers the graph view on the root node
        * **effects**: Animates view to focus on root node at current zoom level
    * `setupNodeConstraints()` - Prevents nodes from being dragged outside viewport
        * **effects**:
            * Listens for dragging and dragEnd events
            * Calculates viewport bounds in canvas coordinates
            * Constrains node positions to remain within visible area
            * Excludes root node from constraints (it's fixed)
    * `setupNodeTooltipEvents()` - Handles node hover and click tooltips
        * **effects**:
            * Calculates node degrees for tooltip display
            * Updates tooltip position on hover
            * Persists tooltip on click
            * Clears tooltip on click outside or second click on same node
    * `calculateNodeDegrees()` - Calculates node degrees using BFS (implemented inline in renderNetwork)
        * **effects**:
            * Builds bidirectional adjacency map
            * Performs BFS from root node to find shortest paths
            * Assigns degree values (0 = root, 1 = 1st degree, 2 = 2nd degree, etc.)
            * Sets degree 999 for disconnected nodes
    * `getDegreeColor(nodeId)` - Returns color based on node degree
        * **effects**: Returns hex color code based on degree:
            * 0 (root): #dc2626 (red)
            * 1: #facc15 (yellow)
            * 2: #22c55e (green)
            * 3: #38bdf8 (sky blue)
            * 4: #a855f7 (purple)
            * 5+: #6b7280 (gray)
    * `getNodeSize(nodeId)` - Returns node size based on degree
        * **effects**: Returns pixel size:
            * 0 (root): 70px
            * 1: 50px
            * 2: 40px
            * 3+: 35px
    * `getDegreeColorForTooltip(degree)` - Returns color for tooltip degree badge
    * `getOrdinalSuffix(num)` - Returns ordinal suffix (st, nd, rd, th) for degree display
    * `formatDateTime(isoString)` - Formats ISO date strings for display in tooltips

* **graph visualization features** (implemented):
    * ✅ Interactive graph visualization with vis-network
    * ✅ Node color-coding by degree of separation:
        * Root (degree 0): Red (#dc2626)
        * 1st Degree: Yellow (#facc15)
        * 2nd Degree: Green (#22c55e)
        * 3rd Degree: Sky Blue (#38bdf8)
        * 4th Degree: Purple (#a855f7)
        * 5+ Degree: Gray (#6b7280)
    * ✅ Node dragging with viewport constraints (nodes cannot be dragged outside visible area)
    * ✅ Graph panning (dragView enabled - users can drag the canvas to pan)
    * ✅ Graph zooming (mouse wheel zoom enabled, zoom percentage displayed)
    * ✅ Zoom percentage display in upper right corner (updates in real-time)
    * ✅ Center on root node button with smooth animation
    * ✅ Root node pinning (root node is fixed with `fixed: { x: true, y: true }` and cannot be dragged)
    * ✅ Node hover tooltips with detailed information:
        * Name, label, headline
        * Degree badge with color coding
        * Current position and company
        * Location, industry
        * Profile URL (clickable link)
        * Avatar URL (clickable link)
        * Summary
        * Skills (comma-separated)
        * Education (formatted list)
        * Experience (formatted list with dates)
        * Tags
        * Source IDs (which platforms contributed this node)
        * Created/Updated timestamps
        * Displays "Not available" for missing fields
    * ✅ Node click persistence (tooltip remains visible when node is clicked, hides when clicked again or when clicking outside)
    * ✅ Degree-based node sizing (root: 70px, 1st: 50px, 2nd: 40px, 3+: 35px)
    * ✅ Degree-based edge styling:
        * Edge colors match node degree colors (prioritizing lowest degree)
        * Edge opacity decreases with higher degrees
        * Edge width varies by degree (thicker for lower degrees)
    * ✅ Bidirectional edge rendering (edges are treated as bidirectional, no arrows)
    * ✅ Curved edges (curvedCW type with roundness 0.6) to prevent edge-node crossing
    * ✅ Force-directed layout with BarnesHut physics:
        * Gravitational constant: -4000 (repulsion)
        * Spring length: 400
        * Spring constant: 0.02
        * Damping: 0.1
        * Avoid overlap: 1.5
    * ✅ Degree legend showing connection levels with color-coded badges
    * ✅ BFS-based degree calculation (shortest path from root, treating edges as bidirectional)
    * ✅ Automatic graph fitting to show all nodes on initial render
    * ✅ Smooth animations for view changes (easeInOutQuad easing)
    * ✅ Real-time zoom level tracking and display

* **graph interaction features** (implemented):
    * ✅ Node selection and highlighting (border width increases on selection)
    * ✅ Viewport constraint enforcement during node dragging (real-time)
    * ✅ Viewport constraint enforcement on drag end (final position check)
    * ✅ Automatic graph fitting to show all nodes on initial render
    * ✅ Smooth animations for view changes (center, fit, focus)
    * ✅ Real-time zoom level tracking (updates on zoom events)
    * ✅ Node hover detection (shows tooltip on hover, hides on blur)
    * ✅ Node click detection (persists tooltip on click, clears on second click or outside click)
    * ✅ Canvas click detection (clears clicked node tooltip)
    * ✅ Drag start detection (hides tooltip when node dragging begins)

* **data integration**:
    * ✅ Fetches adjacency data from `MultiSourceNetwork.getAdjacencyArray(owner)`
    * ✅ Fetches node metadata from `MultiSourceNetwork.searchNodes(owner, query, limit)`
    * ✅ Fetches user profiles from `PublicProfileAPI.getProfile(user)`
    * ✅ Fetches usernames from `UserAuthenticationAPI.getUserById(id)`
    * ✅ Integrates with avatar store for profile picture URLs
    * ✅ Automatically refreshes graph when adjacency data changes (Vue watcher)

* **filtering and search** (implemented in NetworkSearchPage.vue):
    * ✅ Basic node search by name (substring matching on displayName, username, or nodeId)
    * ✅ Filtering by platform/source (linkedin, manual, etc.)
    * ✅ Filtering by company (substring matching on currentCompany)
    * ✅ Filtering by location (substring matching on location)
    * ✅ Autocomplete suggestions for filters (platform, company, location, names)
    * ✅ Active filter chips with remove functionality
    * ✅ Results count display
    * ⚠️ Degree filtering UI exists but backend support is limited (placeholder)
    * ❌ Education-based filtering not implemented
    * ❌ Mutual connections filtering not implemented

* **node information display**:
    * ✅ Comprehensive tooltip showing all parsed node information
    * ✅ Clickable links for profile URLs and avatar URLs
    * ✅ Formatted lists for education and experience
    * ✅ Degree badge with color coding
    * ✅ "Not available" display for missing/null fields
    * ✅ Date/time formatting for timestamps
    * ✅ Scrollable tooltip for long content (max-height: 80%)
    * ✅ High z-index (10000) to ensure tooltip appears above graph canvas
    * ✅ Pointer events enabled for clickable links
    * ✅ Event propagation stopped to prevent graph interactions when clicking tooltip

* **graph layout and physics**:
    * ✅ Force-directed layout using vis-network's BarnesHut algorithm
    * ✅ Physics simulation enabled for automatic node positioning
    * ✅ Stabilization iterations: 200
    * ✅ Improved layout algorithm for better node distribution
    * ✅ Edge length: 350 pixels (increased for better spacing)
    * ✅ Node margins to prevent overlap
    * ✅ Automatic fitting to viewport on initial render
    * ❌ Layout persistence (layouts reset on page refresh - not stored)

* **visual styling**:
    * ✅ Circular image nodes with profile pictures or default avatars
    * ✅ Node borders with degree-based colors (root: 6px, others: 4px)
    * ✅ Node font sizing (root: 16px, others: 14px)
    * ✅ Node font weight (root: bold, others: normal)
    * ✅ Edge width varies by degree (1-5px range)
    * ✅ Edge opacity varies by degree (0.4-1.0 range)
    * ✅ Edge colors match node degree colors
    * ✅ Smooth curved edges to avoid node overlap
    * ✅ Zoom indicator with background and border
    * ✅ Degree legend with color-coded badges
    * ✅ Tooltip with shadow and border styling

* **notes**:
    * The graph visualization is implemented entirely in the frontend using the vis-network library. The graph is rendered dynamically from adjacency data fetched from MultiSourceNetwork.
    * Node degrees are calculated client-side using BFS (breadth-first search) to find the shortest path from the root node, treating all edges as bidirectional.
    * The root node is automatically pinned (fixed position) and cannot be dragged. Other nodes can be dragged but are constrained to remain within the visible viewport.
    * Graph layouts are not persisted - they reset on page refresh. The vis-network library uses a force-directed physics simulation (BarnesHut algorithm) to automatically position nodes.
    * Node information tooltips display comprehensive metadata including profile information, degree of connection, and all parsed fields from MultiSourceNetwork nodes.
    * The graph visualization integrates with MultiSourceNetwork's `getAdjacencyArray` action to fetch network structure and node metadata.
    * Filtering is implemented in NetworkSearchPage.vue, allowing users to filter nodes by source, company, and location. Advanced filtering (education, mutual connections) is not yet implemented.
    * Path highlighting between nodes is not implemented.
    * Multiple saved graph views per user are not implemented - there is a single graph view per user.
    * The graph automatically refreshes when network data changes (via Vue watchers on adjacency data).
    * Tooltip links are clickable and properly isolated from graph interactions using z-index and event propagation control.
