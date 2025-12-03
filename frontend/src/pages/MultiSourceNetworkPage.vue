<template>
  <div class="page-grid">
    <div class="card" style="grid-column: 1 / -1; margin-bottom: 1rem">
      <p class="muted" style="margin: 0">
        <strong>⚠️ Warning:</strong> Assuming all usernames are unique for now.
        You can add nodes and edges using usernames instead of user IDs.
      </p>
      <p class="muted" style="margin: 0.5rem 0 0 0">
        <strong>Note:</strong> Nodes and edges can be added using usernames. The
        system will automatically resolve usernames to user IDs.
      </p>
    </div>
    <section class="card">
      <h2>Bootstrap a Network</h2>
      <p class="muted">
        Create a network shell and optionally pick a root node.
      </p>
      <StatusBanner
        v-if="banner && banner.section === 'create'"
        :type="banner.type"
        :message="banner.message"
      />
      <form class="form-grid" @submit.prevent="handleCreateNetwork">
        <label>
          Root Node (optional - Username or User ID)
          <input
            v-model.trim="createForm.root"
            placeholder="Enter username or user ID"
          />
        </label>
        <button type="submit">Create Network</button>
      </form>

      <hr
        style="margin: 1.5rem 0; border: none; height: 1px; background: #e2e8f0"
      />

      <h3 style="margin-top: 0">Update Root Node</h3>
      <StatusBanner
        v-if="banner && banner.section === 'root'"
        :type="banner.type"
        :message="banner.message"
      />
      <form class="form-grid" @submit.prevent="handleSetRoot">
        <label>
          Root Node (Username or User ID)
          <input
            v-model.trim="rootForm.root"
            required
            placeholder="Enter username or user ID"
          />
        </label>
        <button type="submit">Set Root</button>
      </form>
    </section>

    <section class="card">
      <h2>Manage Nodes</h2>
      <StatusBanner
        v-if="banner && banner.section === 'nodes'"
        :type="banner.type"
        :message="banner.message"
      />
      <form class="form-grid" @submit.prevent="handleAddNode">
        <label>
          Node (Username or User ID)
          <input
            v-model.trim="nodeForm.node"
            required
            placeholder="Enter username or user ID"
          />
        </label>
        <label>
          Source Tag
          <input
            v-model.trim="nodeForm.source"
            required
            placeholder="linkedin, csv-import, manual, …"
          />
        </label>
        <button type="submit">Add / Merge Node</button>
      </form>

      <form
        class="form-grid"
        style="margin-top: 1rem"
        @submit.prevent="handleRemoveNode"
      >
        <label>
          Node (Username or User ID)
          <input
            v-model.trim="removeNodeForm.node"
            required
            placeholder="Enter username or user ID"
          />
        </label>
        <label>
          Source (optional)
          <input
            v-model.trim="removeNodeForm.source"
            placeholder="Leave blank to delete node entirely"
          />
        </label>
        <button type="submit">Remove Node</button>
      </form>
    </section>

    <section class="card">
      <h2>Manage Edges</h2>
      <StatusBanner
        v-if="banner && banner.section === 'edges'"
        :type="banner.type"
        :message="banner.message"
      />
      <form class="form-grid" @submit.prevent="handleAddEdge">
        <label>
          From Node (Username or User ID)
          <input
            v-model.trim="edgeForm.from"
            required
            placeholder="Enter username or user ID"
          />
        </label>
        <label>
          To Node (Username or User ID)
          <input
            v-model.trim="edgeForm.to"
            required
            placeholder="Enter username or user ID"
          />
        </label>
        <label>
          Source
          <input v-model.trim="edgeForm.source" required />
        </label>
        <label>
          Weight (optional)
          <input v-model.number="edgeForm.weight" type="number" step="0.1" />
        </label>
        <button type="submit">Add / Update Edge</button>
      </form>

      <form
        class="form-grid"
        style="margin-top: 1rem"
        @submit.prevent="handleRemoveEdge"
      >
        <label>
          From Node (Username or User ID)
          <input
            v-model.trim="removeEdgeForm.from"
            required
            placeholder="Enter username or user ID"
          />
        </label>
        <label>
          To Node (Username or User ID)
          <input
            v-model.trim="removeEdgeForm.to"
            required
            placeholder="Enter username or user ID"
          />
        </label>
        <label>
          Source
          <input v-model.trim="removeEdgeForm.source" required />
        </label>
        <button type="submit">Remove Edge</button>
      </form>
    </section>

    <section class="card" style="grid-column: 1 / -1">
      <h2>Network Visualization</h2>
      <p class="muted">
        Visualize your network graph with interactive nodes and connections.
      </p>
      <div class="banner info" style="margin-bottom: 1rem">
        ⚠️ Network visualization is still under implementation. The "Refresh
        View" button will show debug information.
      </div>
      <StatusBanner
        v-if="banner && banner.section === 'explorer'"
        :type="banner.type"
        :message="banner.message"
      />
      <form class="form-grid" @submit.prevent="fetchAdjacency">
        <button type="submit" :disabled="adjacencyLoading || !auth.userId">
          {{ adjacencyLoading ? "Loading…" : "Refresh View" }}
        </button>
      </form>

      <div v-if="adjacencyLoading" class="muted" style="margin-top: 1rem">
        Pulling adjacency data…
      </div>

      <div
        v-else-if="adjacency && Object.keys(adjacency).length > 0"
        class="network-visualization-container"
      >
        <div ref="networkContainer" class="network-graph"></div>
        <div
          v-if="!networkInstance"
          class="muted"
          style="padding: 1rem; text-align: center"
        >
          Loading visualization...
        </div>
      </div>
      <p v-else class="muted" style="margin-top: 1rem">
        No network data found for this owner yet. Create a network and add nodes
        to see the visualization.
      </p>
    </section>

    <section class="card" style="grid-column: 1 / -1">
      <h2>Network Explorer (List View)</h2>
      <div class="banner info" style="margin-bottom: 1rem">
        🚧 Under Construction: Network Explorer list view is currently being
        developed.
      </div>
      <p class="muted">
        View the adjacency list for detailed network information.
      </p>
      <div v-if="adjacency && Object.keys(adjacency).length > 0">
        <h3>Nodes ({{ Object.keys(adjacency).length }})</h3>
        <div class="list">
          <article
            v-for="nodeId in Object.keys(adjacency)"
            :key="nodeId"
            class="list-item"
          >
            <strong>{{ nodeId }}</strong>
            <p class="muted">
              {{ adjacency[nodeId].length }} outbound connection(s)
            </p>
            <ul style="padding-left: 1.25rem; margin: 0">
              <li
                v-for="edge in adjacency[nodeId]"
                :key="edge.to + edge.source"
              >
                → {{ edge.to }} <span class="muted">({{ edge.source }})</span>
                <span v-if="edge.weight"> · weight {{ edge.weight }}</span>
              </li>
            </ul>
          </article>
        </div>
      </div>
      <p v-else class="muted" style="margin-top: 1rem">
        No network data found for this owner yet.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  reactive,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
// Use require-style import signature compatible with installed vis-network; type any to avoid TS resolution issues.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const visNetwork: any = require("vis-network");
const Network = visNetwork.Network;
const DataSet = visNetwork.DataSet;
import "vis-network/styles/vis-network.css";
import StatusBanner from "@/components/StatusBanner.vue";
import {
  MultiSourceNetworkAPI,
  type AdjacencyMap,
  ConceptApiError,
  PublicProfileAPI,
  type PublicProfile,
  UserAuthenticationAPI,
} from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAvatarStore } from "@/stores/useAvatarStore";

type BannerSection = "create" | "root" | "nodes" | "edges" | "explorer";

const createForm = reactive({ root: "" });
const rootForm = reactive({ root: "" });
const nodeForm = reactive({ node: "", source: "" });
const removeNodeForm = reactive({ node: "", source: "" });
const edgeForm = reactive({
  from: "",
  to: "",
  source: "",
  weight: undefined as number | undefined,
});
const removeEdgeForm = reactive({
  from: "",
  to: "",
  source: "",
});
const adjacency = ref<AdjacencyMap | null>(null);
const adjacencyLoading = ref(false);
const banner = ref<{
  type: "success" | "error";
  message: string;
  section: BannerSection;
} | null>(null);
const auth = useAuthStore();
const avatarStore = useAvatarStore();

// Network visualization
const networkContainer = ref<HTMLElement | null>(null);
const networkInstance = ref<Network | null>(null);
const rootNodeId = ref<string | null>(null);
const nodeProfiles = ref<
  Record<
    string,
    { profile?: PublicProfile; avatarUrl: string; username?: string }
  >
>({});

function showBanner(
  section: BannerSection,
  type: "success" | "error",
  message: string
) {
  banner.value = { section, type, message };
}

function logActivity(
  section: BannerSection,
  _action: string,
  _payload: Record<string, unknown>,
  status: "success" | "error",
  message: string
) {
  showBanner(section, status, message);
}

/**
 * Resolves a username to user ID, or returns the input if it's already a user ID.
 * Assumes usernames are unique.
 */
async function resolveToUserId(input: string): Promise<string> {
  // If it looks like a UUID (user ID format), return as-is
  if (
    input.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  ) {
    return input;
  }

  // Try to resolve as username
  try {
    const userResult = await UserAuthenticationAPI.getUserByUsername({
      username: input,
    });
    if (userResult.length > 0) {
      return userResult[0].user;
    }
  } catch (error) {
    console.warn(`Failed to resolve username "${input}":`, error);
  }

  // If resolution fails, assume it's a user ID anyway
  return input;
}

async function handleCreateNetwork() {
  if (!auth.userId) return;
  let resolvedRoot = createForm.root
    ? await resolveToUserId(createForm.root)
    : undefined;
  // If no root is provided, use the owner as the root node
  const rootNode = resolvedRoot || auth.userId;
  const payload = {
    owner: auth.userId,
    root: rootNode,
  };
  try {
    const result = await MultiSourceNetworkAPI.createNetwork(payload);
    // Set root node to the resolved root (which defaults to owner)
    rootNodeId.value = rootNode;
    logActivity(
      "create",
      "createNetwork",
      payload,
      "success",
      `Network ${result.network} created with root node: ${rootNode}.`
    );
    // Clear the form
    createForm.root = "";
    // Automatically refresh visualization to show the owner node immediately
    // The backend automatically adds the owner as a membership node with source "self"
    await fetchAdjacency();
    // If adjacency is loaded, render the network to show the owner node
    if (adjacency.value) {
      await renderNetwork();
    }
  } catch (error) {
    logActivity(
      "create",
      "createNetwork",
      payload,
      "error",
      formatError(error)
    );
  }
}

async function handleSetRoot() {
  if (!auth.userId) return;
  const resolvedRoot = await resolveToUserId(rootForm.root);
  const payload = { owner: auth.userId, root: resolvedRoot };
  try {
    await MultiSourceNetworkAPI.setRootNode(payload);
    rootNodeId.value = resolvedRoot;
    logActivity(
      "root",
      "setRootNode",
      payload,
      "success",
      "Root node updated."
    );
    // Refresh visualization if adjacency is already loaded
    if (adjacency.value) {
      await renderNetwork();
    }
  } catch (error) {
    logActivity("root", "setRootNode", payload, "error", formatError(error));
  }
}

async function handleAddNode() {
  if (!auth.userId) return;
  const resolvedNode = await resolveToUserId(nodeForm.node);
  const payload = {
    owner: auth.userId,
    node: resolvedNode,
    source: nodeForm.source,
  };
  try {
    await MultiSourceNetworkAPI.addNodeToNetwork(payload);
    logActivity(
      "nodes",
      "addNodeToNetwork",
      payload,
      "success",
      "Node stored."
    );
    // Clear form
    nodeForm.node = "";
    nodeForm.source = "";
    // Automatically refresh visualization
    await fetchAdjacency();
  } catch (error) {
    logActivity(
      "nodes",
      "addNodeToNetwork",
      payload,
      "error",
      formatError(error)
    );
  }
}

async function handleRemoveNode() {
  if (!auth.userId) return;
  const resolvedNode = await resolveToUserId(removeNodeForm.node);
  const payload = {
    owner: auth.userId,
    node: resolvedNode,
    source: removeNodeForm.source || undefined,
  };
  try {
    await MultiSourceNetworkAPI.removeNodeFromNetwork(payload);
    logActivity(
      "nodes",
      "removeNodeFromNetwork",
      payload,
      "success",
      payload.source
        ? `Source ${payload.source} detached.`
        : "Node removed entirely."
    );
    // Clear form
    removeNodeForm.node = "";
    removeNodeForm.source = "";
    // Automatically refresh visualization
    await fetchAdjacency();
  } catch (error) {
    logActivity(
      "nodes",
      "removeNodeFromNetwork",
      payload,
      "error",
      formatError(error)
    );
  }
}

async function handleAddEdge() {
  if (!auth.userId) return;
  const resolvedFrom = await resolveToUserId(edgeForm.from);
  const resolvedTo = await resolveToUserId(edgeForm.to);
  const payload = {
    owner: auth.userId,
    from: resolvedFrom,
    to: resolvedTo,
    source: edgeForm.source,
    weight: Number.isFinite(edgeForm.weight) ? edgeForm.weight : undefined,
  };
  try {
    await MultiSourceNetworkAPI.addEdge(payload);
    logActivity("edges", "addEdge", payload, "success", "Edge saved.");
    // Clear form
    edgeForm.from = "";
    edgeForm.to = "";
    edgeForm.source = "";
    edgeForm.weight = undefined;
    // Automatically refresh visualization
    await fetchAdjacency();
  } catch (error) {
    logActivity("edges", "addEdge", payload, "error", formatError(error));
  }
}

async function handleRemoveEdge() {
  if (!auth.userId) return;
  const resolvedFrom = await resolveToUserId(removeEdgeForm.from);
  const resolvedTo = await resolveToUserId(removeEdgeForm.to);
  const payload = {
    owner: auth.userId,
    from: resolvedFrom,
    to: resolvedTo,
    source: removeEdgeForm.source,
  };
  try {
    await MultiSourceNetworkAPI.removeEdge(payload);
    logActivity("edges", "removeEdge", payload, "success", "Edge removed.");
    // Clear form
    removeEdgeForm.from = "";
    removeEdgeForm.to = "";
    removeEdgeForm.source = "";
    // Automatically refresh visualization
    await fetchAdjacency();
  } catch (error) {
    logActivity("edges", "removeEdge", payload, "error", formatError(error));
  }
}

async function fetchAdjacency() {
  if (!auth.userId) return;
  adjacencyLoading.value = true;

  try {
    const data = await MultiSourceNetworkAPI.getAdjacencyArray({
      owner: auth.userId,
    });

    adjacency.value = data;

    // Check if root node is set (it might be the owner or we need to track it)
    // For now, we'll use the first node or owner as root if not explicitly set
    if (!rootNodeId.value && Object.keys(data).length > 0) {
      rootNodeId.value = auth.userId;
    }

    // Collect all node IDs (sources and targets)
    const allNodeIds = new Set<string>(Object.keys(data));
    for (const nodeId of Object.keys(data)) {
      const edges = data[nodeId] || [];
      for (const edge of edges) {
        allNodeIds.add(edge.to);
      }
    }

    // Fetch profile data for all nodes
    await fetchNodeProfiles(Array.from(allNodeIds));

    logActivity(
      "explorer",
      "_getAdjacencyArray",
      { owner: auth.userId },
      "success",
      "Adjacency data refreshed."
    );

    // Render network after data is loaded
    await nextTick();
    await renderNetwork();
  } catch (error) {
    const errorMsg = formatError(error);
    console.error("Error fetching adjacency:", error);
    logActivity(
      "explorer",
      "_getAdjacencyArray",
      { owner: auth.userId },
      "error",
      errorMsg
    );
  } finally {
    adjacencyLoading.value = false;
  }
}

// Generate a bright random color for node borders
function generateBrightColor(seed: string): string {
  // Use seed to generate consistent colors for the same node
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate bright colors (high saturation and brightness)
  const hue = Math.abs(hash) % 360;
  const saturation = 70 + (Math.abs(hash) % 30); // 70-100%
  const lightness = 50 + (Math.abs(hash) % 20); // 50-70%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Fetch profile data for nodes
async function fetchNodeProfiles(nodeIds: string[]) {
  // Fetch all data in parallel for better performance
  const profilePromises = nodeIds.map(async (nodeId) => {
    if (nodeProfiles.value[nodeId]) return; // Already fetched

    let profile: PublicProfile | undefined;
    let username = nodeId; // Default to nodeId
    let avatarUrl = avatarStore.DEFAULT_AVATAR;

    // Try to fetch username from UserAuthentication API
    try {
      const userResult = await UserAuthenticationAPI.getUserById({
        id: nodeId,
      });
      // getUserById returns { id: string; username: string } | Record<string, never>
      if (userResult && "username" in userResult && userResult.username) {
        username = userResult.username;
      }
    } catch {
      // User might not exist in auth system, continue with nodeId
    }

    // Try to fetch profile data
    try {
      const profileResult = await PublicProfileAPI.getProfile({ user: nodeId });
      profile = profileResult[0]?.profile;

      // If profile exists, store it with the username
      if (profile) {
        // Get profile picture URL if available
        if ((profile as any).profilePictureUrl) {
          avatarUrl = (profile as any).profilePictureUrl;
          avatarStore.setForUser(nodeId, avatarUrl);
        } else {
          avatarUrl = avatarStore.getForUser(nodeId);
        }

        nodeProfiles.value[nodeId] = {
          profile,
          avatarUrl,
          username: username, // Store actual username, not headline
        };
      } else {
        // No profile, but we have username from auth
        avatarUrl = avatarStore.getForUser(nodeId);
        nodeProfiles.value[nodeId] = {
          avatarUrl,
          username,
        };
      }
    } catch {
      // No profile found, use username from auth or nodeId
      avatarUrl = avatarStore.getForUser(nodeId);
      nodeProfiles.value[nodeId] = {
        avatarUrl,
        username,
      };
    }
  });

  // Wait for all profile fetches to complete
  await Promise.all(profilePromises);
}

// Render the network visualization
async function renderNetwork() {
  if (!adjacency.value) {
    console.log("No adjacency data available");
    return;
  }

  const nodeCount = Object.keys(adjacency.value).length;
  if (nodeCount === 0) {
    console.log("No nodes in adjacency data");
    return;
  }

  console.log(`Rendering network with ${nodeCount} node(s)`);

  // Wait for container to be available - try multiple times
  let attempts = 0;
  while (!networkContainer.value && attempts < 10) {
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));
    attempts++;
  }

  if (!networkContainer.value) {
    console.error("Network container not available after waiting");
    console.error("Container ref:", networkContainer);
    return;
  }

  console.log("Container found, proceeding with render");

  const nodes = new DataSet<any>([]);
  const edges = new DataSet<any>([]);

  // Create nodes
  const nodeIds = Object.keys(adjacency.value);
  console.log("Rendering network with nodes:", nodeIds);
  console.log("Adjacency data:", adjacency.value);

  const isRoot = (nodeId: string) =>
    rootNodeId.value === nodeId || nodeId === auth.userId;

  for (const nodeId of nodeIds) {
    // For owner node, use authenticated user's username if available
    let profileData = nodeProfiles.value[nodeId];
    if (!profileData) {
      if (nodeId === auth.userId) {
        // Owner node - use auth store username
        profileData = {
          avatarUrl: avatarStore.getForUser(nodeId),
          username: auth.username || nodeId,
        };
      } else {
        profileData = {
          avatarUrl: avatarStore.DEFAULT_AVATAR,
          username: nodeId,
        };
      }
    }

    const nodeColor = isRoot(nodeId) ? generateBrightColor(nodeId) : "#778da9";

    // Use username for label (prefer username over headline)
    const nodeLabel =
      nodeId === auth.userId
        ? auth.username || profileData.username || nodeId
        : profileData.username || nodeId;

    const node: any = {
      id: nodeId,
      label: nodeLabel,
      shape: "circularImage",
      image: profileData.avatarUrl,
      brokenImage: avatarStore.DEFAULT_AVATAR,
      borderWidth: isRoot(nodeId) ? 4 : 2,
      borderColor: nodeColor,
      color: {
        border: nodeColor,
        background: "#ffffff",
        highlight: {
          border: nodeColor,
          background: "#f0f0f0",
        },
      },
      font: {
        size: isRoot(nodeId) ? 16 : 14,
        face: "Inter",
        bold: isRoot(nodeId),
      },
      size: isRoot(nodeId) ? 60 : 45,
    };

    nodes.add(node);

    // Create edges
    const nodeEdges = adjacency.value[nodeId] || [];
    for (const edge of nodeEdges) {
      edges.add({
        id: `${nodeId}-${edge.to}`,
        from: nodeId,
        to: edge.to,
        label: edge.weight ? String(edge.weight) : "",
        width: edge.weight ? Math.max(1, Math.min(5, edge.weight)) : 1,
        color: {
          color: "#415a77",
          highlight: "#6699cc",
        },
      });
    }
  }

  // Create edges for nodes that are targets but not sources
  for (const nodeId of nodeIds) {
    const nodeEdges = adjacency.value[nodeId] || [];
    for (const edge of nodeEdges) {
      if (!nodeIds.includes(edge.to)) {
        // Target node doesn't exist as a source, create it
        const profileData = nodeProfiles.value[edge.to] || {
          avatarUrl: avatarStore.DEFAULT_AVATAR,
          username: edge.to,
        };

        // Use username for label (prefer username over headline)
        const nodeLabel = profileData.username || edge.to;

        nodes.add({
          id: edge.to,
          label: nodeLabel,
          shape: "circularImage",
          image: profileData.avatarUrl,
          brokenImage: avatarStore.DEFAULT_AVATAR,
          borderWidth: 2,
          borderColor: "#778da9",
          color: {
            border: "#778da9",
            background: "#ffffff",
          },
          font: {
            size: 14,
            face: "Inter",
          },
          size: 40,
        });
      }
    }
  }

  const data = { nodes, edges };
  const options = {
    nodes: {
      shape: "circularImage",
      font: {
        size: 14,
        face: "Inter",
      },
    },
    edges: {
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.8,
        },
      },
      smooth: {
        enabled: true,
        type: "continuous",
        roundness: 0.5,
      },
    },
    physics: {
      enabled: true,
      stabilization: {
        enabled: true,
        iterations: 200,
      },
      // Adjust physics for single node (centered) or multiple nodes
      barnesHut: {
        gravitationalConstant: nodes.length === 1 ? -500 : -2000,
        centralGravity: nodes.length === 1 ? 0.1 : 0.3,
        springLength: nodes.length === 1 ? 200 : 95,
        springConstant: nodes.length === 1 ? 0.001 : 0.04,
        damping: 0.09,
      },
    },
    interaction: {
      hover: true,
      tooltipDelay: 200,
    },
    layout: {
      // Center single node
      improvedLayout: nodes.length > 1,
    },
  };

  // Destroy existing network if it exists
  if (networkInstance.value) {
    networkInstance.value.destroy();
    networkInstance.value = null;
  }

  try {
    console.log(
      "Creating network visualization with",
      nodes.length,
      "nodes and",
      edges.length,
      "edges"
    );
    networkInstance.value = new Network(networkContainer.value, data, options);
    console.log("Network visualization created successfully");
  } catch (error) {
    console.error("Error creating network visualization:", error);
  }
}

function formatError(error: unknown) {
  if (error instanceof ConceptApiError) {
    return error.message;
  }
  return "Unexpected error. Check console for details.";
}

// Watch for adjacency changes to update visualization
watch(
  () => adjacency.value,
  async (newAdjacency) => {
    if (newAdjacency && Object.keys(newAdjacency).length > 0) {
      console.log("Adjacency data changed, triggering render");
      // Wait for DOM to update and container to be available
      await nextTick();
      // Give a small delay to ensure container is rendered
      await new Promise((resolve) => setTimeout(resolve, 200));
      await renderNetwork();
    } else {
      console.log("Adjacency data is empty or null");
    }
  }
);

// Cleanup on unmount
onBeforeUnmount(() => {
  if (networkInstance.value) {
    networkInstance.value.destroy();
  }
});

// Initialize root node from createForm if available
watch(
  () => createForm.root,
  (newRoot) => {
    if (newRoot) {
      rootNodeId.value = newRoot;
    }
  }
);

// Automatically load network visualization when user is authenticated
watch(
  () => auth.userId,
  async (userId) => {
    if (userId) {
      // Wait for next tick to ensure DOM is ready
      await nextTick();
      // Automatically fetch adjacency data when user logs in
      await fetchAdjacency();
    }
  },
  { immediate: true }
);

// Also load on mount if user is already authenticated
onMounted(async () => {
  if (auth.userId) {
    // Wait for DOM to be fully rendered
    await nextTick();
    await fetchAdjacency();
  }
});
</script>
