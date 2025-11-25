<template>
  <div class="page-grid">
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
          Owner (User / Account)
          <input v-model.trim="createForm.owner" required />
        </label>
        <label>
          Root Node (optional)
          <input v-model.trim="createForm.root" />
        </label>
        <button type="submit">Create Network</button>
      </form>

      <hr style="margin: 1.5rem 0; border: none; height: 1px; background: #e2e8f0" />

      <h3 style="margin-top: 0">Update Root Node</h3>
      <StatusBanner
        v-if="banner && banner.section === 'root'"
        :type="banner.type"
        :message="banner.message"
      />
      <form class="form-grid" @submit.prevent="handleSetRoot">
        <label>
          Owner
          <input v-model.trim="rootForm.owner" required />
        </label>
        <label>
          Root Node
          <input v-model.trim="rootForm.root" required />
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
          Owner
          <input v-model.trim="nodeForm.owner" required />
        </label>
        <label>
          Node ID
          <input v-model.trim="nodeForm.node" required />
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
          Owner
          <input v-model.trim="removeNodeForm.owner" required />
        </label>
        <label>
          Node ID
          <input v-model.trim="removeNodeForm.node" required />
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
          Owner
          <input v-model.trim="edgeForm.owner" required />
        </label>
        <label>
          From Node
          <input v-model.trim="edgeForm.from" required />
        </label>
        <label>
          To Node
          <input v-model.trim="edgeForm.to" required />
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
          Owner
          <input v-model.trim="removeEdgeForm.owner" required />
        </label>
        <label>
          From Node
          <input v-model.trim="removeEdgeForm.from" required />
        </label>
        <label>
          To Node
          <input v-model.trim="removeEdgeForm.to" required />
        </label>
        <label>
          Source
          <input v-model.trim="removeEdgeForm.source" required />
        </label>
        <button type="submit">Remove Edge</button>
      </form>
    </section>

    <section class="card" style="grid-column: 1 / -1">
      <h2>Network Explorer</h2>
      <p class="muted">
        Fetch the adjacency list for an owner to verify the current network
        shape.
      </p>
      <StatusBanner
        v-if="banner && banner.section === 'explorer'"
        :type="banner.type"
        :message="banner.message"
      />
      <form class="form-grid" @submit.prevent="fetchAdjacency">
        <label>
          Owner
          <input v-model.trim="adjacencyOwner" required />
        </label>
        <button type="submit" :disabled="adjacencyLoading">
          {{ adjacencyLoading ? "Loading…" : "Refresh View" }}
        </button>
      </form>

      <div v-if="adjacencyLoading" class="muted" style="margin-top: 1rem">
        Pulling adjacency data…
      </div>

      <div v-else-if="adjacency && Object.keys(adjacency).length > 0">
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
              <li v-for="edge in adjacency[nodeId]" :key="edge.to + edge.source">
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

    <ActivityLog :entries="activityLog.recent" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import StatusBanner from "@/components/StatusBanner.vue";
import ActivityLog from "@/components/ActivityLog.vue";
import {
  MultiSourceNetworkAPI,
  type AdjacencyMap,
  ConceptApiError,
} from "@/services/conceptClient";
import { useActivityLogStore } from "@/stores/useActivityLog";
import { useAuthStore } from "@/stores/useAuthStore";

type BannerSection = "create" | "root" | "nodes" | "edges" | "explorer";

const createForm = reactive({ owner: "", root: "" });
const rootForm = reactive({ owner: "", root: "" });
const nodeForm = reactive({ owner: "", node: "", source: "" });
const removeNodeForm = reactive({ owner: "", node: "", source: "" });
const edgeForm = reactive({ owner: "", from: "", to: "", source: "", weight: undefined as number | undefined });
const removeEdgeForm = reactive({
  owner: "",
  from: "",
  to: "",
  source: "",
});

const adjacencyOwner = ref("");
const adjacency = ref<AdjacencyMap | null>(null);
const adjacencyLoading = ref(false);
const banner = ref<{ type: "success" | "error"; message: string; section: BannerSection } | null>(null);
const activityLog = useActivityLogStore();
const auth = useAuthStore();

watch(
  () => auth.userId,
  (next) => {
    if (!next) return;
    if (!createForm.owner) createForm.owner = next;
    if (!rootForm.owner) rootForm.owner = next;
    if (!nodeForm.owner) nodeForm.owner = next;
    if (!removeNodeForm.owner) removeNodeForm.owner = next;
    if (!edgeForm.owner) edgeForm.owner = next;
    if (!removeEdgeForm.owner) removeEdgeForm.owner = next;
    if (!adjacencyOwner.value) adjacencyOwner.value = next;
  },
  { immediate: true },
);

function showBanner(section: BannerSection, type: "success" | "error", message: string) {
  banner.value = { section, type, message };
}

function logActivity(
  section: BannerSection,
  action: string,
  payload: Record<string, unknown>,
  status: "success" | "error",
  message: string,
) {
  activityLog.push({
    concept: "MultiSourceNetwork",
    action,
    payload,
    status,
    message,
  });
  showBanner(section, status, message);
}

async function handleCreateNetwork() {
  const payload = {
    owner: createForm.owner,
    root: createForm.root || undefined,
  };
  try {
    const result = await MultiSourceNetworkAPI.createNetwork(payload);
    logActivity(
      "create",
      "createNetwork",
      payload,
      "success",
      `Network ${result.network} created.`,
    );
  } catch (error) {
    logActivity(
      "create",
      "createNetwork",
      payload,
      "error",
      formatError(error),
    );
  }
}

async function handleSetRoot() {
  const payload = { ...rootForm };
  try {
    await MultiSourceNetworkAPI.setRootNode(payload);
    logActivity("root", "setRootNode", payload, "success", "Root node updated.");
  } catch (error) {
    logActivity("root", "setRootNode", payload, "error", formatError(error));
  }
}

async function handleAddNode() {
  const payload = { ...nodeForm };
  try {
    await MultiSourceNetworkAPI.addNodeToNetwork(payload);
    logActivity("nodes", "addNodeToNetwork", payload, "success", "Node stored.");
  } catch (error) {
    logActivity("nodes", "addNodeToNetwork", payload, "error", formatError(error));
  }
}

async function handleRemoveNode() {
  const payload = {
    owner: removeNodeForm.owner,
    node: removeNodeForm.node,
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
        : "Node removed entirely.",
    );
  } catch (error) {
    logActivity(
      "nodes",
      "removeNodeFromNetwork",
      payload,
      "error",
      formatError(error),
    );
  }
}

async function handleAddEdge() {
  const payload = {
    ...edgeForm,
    weight: Number.isFinite(edgeForm.weight) ? edgeForm.weight : undefined,
  };
  try {
    await MultiSourceNetworkAPI.addEdge(payload);
    logActivity("edges", "addEdge", payload, "success", "Edge saved.");
  } catch (error) {
    logActivity("edges", "addEdge", payload, "error", formatError(error));
  }
}

async function handleRemoveEdge() {
  const payload = { ...removeEdgeForm };
  try {
    await MultiSourceNetworkAPI.removeEdge(payload);
    logActivity("edges", "removeEdge", payload, "success", "Edge removed.");
  } catch (error) {
    logActivity("edges", "removeEdge", payload, "error", formatError(error));
  }
}

async function fetchAdjacency() {
  if (!adjacencyOwner.value) return;
  adjacencyLoading.value = true;
  try {
    const data = await MultiSourceNetworkAPI.getAdjacencyArray({
      owner: adjacencyOwner.value,
    });
    adjacency.value = data;
    logActivity(
      "explorer",
      "_getAdjacencyArray",
      { owner: adjacencyOwner.value },
      "success",
      "Adjacency data refreshed.",
    );
  } catch (error) {
    logActivity(
      "explorer",
      "_getAdjacencyArray",
      { owner: adjacencyOwner.value },
      "error",
      formatError(error),
    );
  } finally {
    adjacencyLoading.value = false;
  }
}

function formatError(error: unknown) {
  if (error instanceof ConceptApiError) {
    return error.message;
  }
  return "Unexpected error. Check console for details.";
}
</script>
