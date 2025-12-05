<template>
    <div class="page-grid">
        <div class="card" style="grid-column: 1 / -1; margin-bottom: 1rem">
            <p class="muted" style="margin: 0">
                <strong>⚠️ Warning:</strong> Assuming all usernames are unique
                for now. You can add nodes and edges using usernames instead of
                user IDs.
            </p>
            <p class="muted" style="margin: 0.5rem 0 0 0">
                <strong>Note:</strong> Nodes and edges can be added using
                usernames. The system will automatically resolve usernames to
                user IDs.
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
                style="
                    margin: 1.5rem 0;
                    border: none;
                    height: 1px;
                    background: #e2e8f0;
                "
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
                    First Name *
                    <input
                        v-model.trim="createNodeForm.firstName"
                        required
                        placeholder="First name"
                    />
                </label>
                <label>
                    Last Name *
                    <input
                        v-model.trim="createNodeForm.lastName"
                        required
                        placeholder="Last name"
                    />
                </label>
                <label>
                    Label (display name)
                    <input
                        v-model.trim="createNodeForm.label"
                        placeholder="Full name or display label"
                    />
                </label>
                <label>
                    Headline *
                    <input
                        v-model.trim="createNodeForm.headline"
                        required
                        placeholder="Professional headline"
                    />
                </label>
                <label>
                    Profile URL
                    <input
                        v-model.trim="createNodeForm.profileUrl"
                        placeholder="https://www.linkedin.com/in/…"
                    />
                </label>
                <label>
                    Avatar URL
                    <input
                        v-model.trim="createNodeForm.avatarUrl"
                        placeholder="https://…/avatar.jpg"
                    />
                </label>
                <label>
                    Location
                    <input
                        v-model.trim="createNodeForm.location"
                        placeholder="City, State or Location"
                    />
                </label>
                <label>
                    Industry
                    <input
                        v-model.trim="createNodeForm.industry"
                        placeholder="Industry"
                    />
                </label>
                <label>
                    Current Position
                    <input
                        v-model.trim="createNodeForm.currentPosition"
                        placeholder="Current job title"
                    />
                </label>
                <label>
                    Current Company
                    <input
                        v-model.trim="createNodeForm.currentCompany"
                        placeholder="Current company"
                    />
                </label>
                <label>
                    Profile Picture URL
                    <input
                        v-model.trim="createNodeForm.profilePictureUrl"
                        placeholder="https://…/picture.jpg"
                    />
                </label>
                <label>
                    Summary
                    <textarea
                        v-model.trim="createNodeForm.summary"
                        placeholder="Short bio or summary"
                    ></textarea>
                </label>
                <label>
                    Skills (comma-separated)
                    <input
                        v-model.trim="createNodeForm.skillsInput"
                        placeholder="skill1, skill2"
                    />
                </label>
                <label>
                    Education (JSON array)
                    <textarea
                        v-model="createNodeForm.educationInput"
                        placeholder='[{"school":"X","degree":"Y"}]'
                    ></textarea>
                </label>
                <label>
                    Experience (JSON array)
                    <textarea
                        v-model="createNodeForm.experienceInput"
                        placeholder='[{"title":"T","company":"C","startDate":"YYYY-MM","endDate":"YYYY-MM","description":"..."}]'
                    ></textarea>
                </label>
                <label>
                    Tags (comma-separated)
                    <input
                        v-model.trim="createNodeForm.tagsInput"
                        placeholder="tag1, tag2"
                    />
                </label>
                <label>
                    Source Tag (optional)
                    <input
                        v-model.trim="createNodeForm.source"
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
                <label style="position: relative">
                    Search Node to Remove
                    <input
                        v-model.trim="removeNodeSearchQuery"
                        @input="searchRemoveNode"
                        placeholder="Type a name to search membership"
                    />
                    <ul v-if="removeNodeSearchResults.length" class="dropdown">
                        <li
                            v-for="r in removeNodeSearchResults"
                            :key="r._id"
                            @click.prevent="selectRemoveNode(r)"
                        >
                            {{
                                (
                                    (r.firstName || "") +
                                    " " +
                                    (r.lastName || "")
                                ).trim() ||
                                r.label ||
                                r._id
                            }}
                        </li>
                    </ul>
                </label>
                <label>
                    Selected Node *
                    <input
                        v-model.trim="removeNodeForm.nodeDisplay"
                        required
                        placeholder="Selected node (name)"
                    />
                    <input type="hidden" v-model="removeNodeForm.nodeId" />
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
                    From Node (search) *
                    <input
                        v-model.trim="edgeForm.fromDisplay"
                        @input="searchFromNode"
                        required
                        placeholder="Type to search nodes or paste node id"
                    />
                    <ul v-if="fromSearchResults.length" class="dropdown">
                        <li
                            v-for="r in fromSearchResults"
                            :key="r._id"
                            @click.prevent="selectFromNode(r)"
                        >
                            {{
                                (
                                    (r.firstName || "") +
                                    " " +
                                    (r.lastName || "")
                                ).trim() ||
                                r.label ||
                                r._id
                            }}
                        </li>
                    </ul>
                </label>
                <label>
                    To Node (search) *
                    <input
                        v-model.trim="edgeForm.toDisplay"
                        @input="searchToNode"
                        required
                        placeholder="Type to search nodes or paste node id"
                    />
                    <ul v-if="toSearchResults.length" class="dropdown">
                        <li
                            v-for="r in toSearchResults"
                            :key="r._id"
                            @click.prevent="selectToNode(r)"
                        >
                            {{
                                (
                                    (r.firstName || "") +
                                    " " +
                                    (r.lastName || "")
                                ).trim() ||
                                r.label ||
                                r._id
                            }}
                        </li>
                    </ul>
                </label>
                <label>
                    Source *
                    <input v-model.trim="edgeForm.source" required />
                </label>
                <label>
                    Weight (optional)
                    <input
                        v-model.number="edgeForm.weight"
                        type="number"
                        step="0.1"
                    />
                </label>
                <button type="submit">Add / Update Edge</button>
            </form>

            <form
                class="form-grid"
                style="margin-top: 1rem"
                @submit.prevent="handleRemoveEdge"
            >
                <label>
                    From Node (search) *
                    <input
                        v-model.trim="removeEdgeForm.fromDisplay"
                        @input="searchFromNodeForRemove"
                        required
                        placeholder="Type to search nodes or paste node id"
                    />
                    <input type="hidden" v-model="removeEdgeForm.fromId" />
                    <ul v-if="fromSearchResultsRemove.length" class="dropdown">
                        <li
                            v-for="r in fromSearchResultsRemove"
                            :key="r._id"
                            @click.prevent="selectRemoveEdgeFrom(r)"
                        >
                            {{
                                (
                                    (r.firstName || "") +
                                    " " +
                                    (r.lastName || "")
                                ).trim() ||
                                r.label ||
                                r._id
                            }}
                            — {{ r._id }}
                        </li>
                    </ul>
                </label>
                <label>
                    To Node (search) *
                    <input
                        v-model.trim="removeEdgeForm.toDisplay"
                        @input="searchToNodeForRemove"
                        required
                        placeholder="Type to search nodes or paste node id"
                    />
                    <input type="hidden" v-model="removeEdgeForm.toId" />
                    <ul v-if="toSearchResultsRemove.length" class="dropdown">
                        <li
                            v-for="r in toSearchResultsRemove"
                            :key="r._id"
                            @click.prevent="selectRemoveEdgeTo(r)"
                        >
                            {{
                                (
                                    (r.firstName || "") +
                                    " " +
                                    (r.lastName || "")
                                ).trim() ||
                                r.label ||
                                r._id
                            }}
                            — {{ r._id }}
                        </li>
                    </ul>
                </label>
                <label>
                    Source *
                    <input v-model.trim="removeEdgeForm.source" required />
                </label>
                <button type="submit">Remove Edge</button>
            </form>
        </section>

        <section class="card" style="grid-column: 1 / -1">
            <h2>Network Visualization</h2>
            <p class="muted">
                Visualize your network graph with interactive nodes and
                connections.
            </p>
            <div class="banner info" style="margin-bottom: 1rem">
                ⚠️ Network visualization is still under implementation. The
                "Refresh View" button will show debug information.
            </div>
            <StatusBanner
                v-if="banner && banner.section === 'explorer'"
                :type="banner.type"
                :message="banner.message"
            />
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                <form class="form-grid" @submit.prevent="fetchAdjacency" style="margin: 0; flex: 1;">
                    <button
                        type="submit"
                        :disabled="adjacencyLoading || !auth.userId"
                    >
                        {{ adjacencyLoading ? "Loading…" : "Refresh View" }}
                    </button>
                </form>
                <button
                    v-if="adjacency && Object.keys(adjacency).length > 0 && networkInstance"
                    @click="centerOnRootNode"
                    type="button"
                    :disabled="!auth.userId"
                    style="padding: 0.5rem 1rem;"
                >
                    Center on Root
                </button>
            </div>

            <div v-if="adjacencyLoading" class="muted" style="margin-top: 1rem">
                Pulling adjacency data…
            </div>

            <!-- Degree Legend -->
            <div v-if="adjacency && Object.keys(adjacency).length > 0" class="degree-legend" style="margin: 1rem 0; padding: 0.75rem; background: #f8f9fa; border-radius: 8px; display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center;">
                <div style="font-weight: 600; color: #475569; font-size: 0.9rem;">Connection Levels (by shortest path):</div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 4px solid #dc2626;"></div>
                    <span style="font-size: 0.85rem; color: #64748b;">Root (Self)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 4px solid #facc15;"></div>
                    <span style="font-size: 0.85rem; color: #64748b;">1st Degree</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 4px solid #22c55e;"></div>
                    <span style="font-size: 0.85rem; color: #64748b;">2nd Degree</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 4px solid #38bdf8;"></div>
                    <span style="font-size: 0.85rem; color: #64748b;">3rd Degree</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 4px solid #a855f7;"></div>
                    <span style="font-size: 0.85rem; color: #64748b;">4th Degree</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 4px solid #6b7280;"></div>
                    <span style="font-size: 0.85rem; color: #64748b;">5th+ Degree</span>
                </div>
            </div>

            <div class="network-visualization-container">
                <div ref="networkContainer" class="network-graph"></div>
                <div
                    v-if="!networkInstance && adjacency && Object.keys(adjacency).length > 0"
                    class="muted"
                    style="padding: 1rem; text-align: center"
                >
                    Loading visualization...
                </div>
                <div
                    v-if="adjacency && Object.keys(adjacency).length > 0 && networkInstance"
                    class="zoom-indicator"
                >
                    {{ Math.round(currentZoom * 100) }}%
                </div>
            </div>
            <p v-if="!adjacency || Object.keys(adjacency).length === 0" class="muted" style="margin-top: 1rem">
                No network data found for this owner yet. Create a network and
                add nodes to see the visualization.
            </p>
        </section>

        <section class="card" style="grid-column: 1 / -1">
            <h2>Network Explorer (List View)</h2>
            <div class="banner info" style="margin-bottom: 1rem">
                🚧 Under Construction: Network Explorer list view is currently
                being developed.
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
                            {{ adjacency[nodeId].length }} outbound
                            connection(s)
                        </p>
                        <ul style="padding-left: 1.25rem; margin: 0">
                            <li
                                v-for="edge in adjacency[nodeId]"
                                :key="edge.to + edge.source"
                            >
                                → {{ edge.to }}
                                <span class="muted">({{ edge.source }})</span>
                                <span v-if="edge.weight">
                                    · weight {{ edge.weight }}</span
                                >
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
import { Network, DataSet } from "vis-network/standalone";
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
const createNodeForm = reactive({
    firstName: "",
    lastName: "",
    label: "",
    headline: "",
    profileUrl: "",
    avatarUrl: "",
    tagsInput: "",
    source: "",
    // new optional LinkedIn-like fields
    location: "",
    industry: "",
    currentPosition: "",
    currentCompany: "",
    profilePictureUrl: "",
    summary: "",
    skillsInput: "",
    educationInput: "",
    experienceInput: "",
});
const rootForm = reactive({ root: "" });
const nodeForm = reactive({ node: "", source: "" });
const removeNodeForm = reactive({ nodeId: "", nodeDisplay: "", source: "" });
const removeNodeSearchQuery = ref("");
const removeNodeSearchResults = ref<Array<Record<string, any>>>([]);
const edgeForm = reactive({
    fromId: "",
    fromDisplay: "",
    toId: "",
    toDisplay: "",
    source: "",
    weight: undefined as number | undefined,
});
const fromSearchQuery = ref("");
const fromSearchResults = ref<Array<Record<string, any>>>([]);
const toSearchQuery = ref("");
const toSearchResults = ref<Array<Record<string, any>>>([]);
// Separate search result lists for the remove-edge form so the add/remove inputs don't share UI state
const fromSearchResultsRemove = ref<Array<Record<string, any>>>([]);
const toSearchResultsRemove = ref<Array<Record<string, any>>>([]);
const removeEdgeForm = reactive({
    fromId: "",
    fromDisplay: "",
    toId: "",
    toDisplay: "",
    source: "",
});
const adjacency = ref<AdjacencyMap | null>(null);
const nodeLabels = ref<Record<string, string | undefined>>({});
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
const nodeMetaMap = ref<
    Record<string, { firstName?: string; lastName?: string; label?: string }>
>({});
// Zoom display
const currentZoom = ref<number>(1.0);

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
        logActivity(
            "root",
            "setRootNode",
            payload,
            "error",
            formatError(error)
        );
    }
}

async function handleAddNode() {
    if (!auth.userId) return;
    // Validate mandatory fields: firstName, lastName, headline
    if (
        !createNodeForm.firstName ||
        !createNodeForm.lastName ||
        !createNodeForm.headline
    ) {
        showBanner(
            "nodes",
            "error",
            "First Name, Last Name, and Headline are required."
        );
        return;
    }
    // Create canonical node using createNodeForUser fields
    const tags = createNodeForm.tagsInput
        .split(",")
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

    const createPayload: Record<string, unknown> = {
        owner: auth.userId,
        firstName: createNodeForm.firstName || undefined,
        lastName: createNodeForm.lastName || undefined,
        label: createNodeForm.label || undefined,
        headline: createNodeForm.headline || undefined,
        profileUrl: createNodeForm.profileUrl || undefined,
        avatarUrl:
            createNodeForm.avatarUrl ||
            createNodeForm.profilePictureUrl ||
            undefined,
        location: createNodeForm.location || undefined,
        industry: createNodeForm.industry || undefined,
        currentPosition: createNodeForm.currentPosition || undefined,
        currentCompany: createNodeForm.currentCompany || undefined,
        profilePictureUrl: createNodeForm.profilePictureUrl || undefined,
        summary: createNodeForm.summary || undefined,
    };
    if (tags.length > 0) createPayload.tags = tags;
    // Parse skills (comma-separated)
    const skills = createNodeForm.skillsInput
        ? createNodeForm.skillsInput
              .split(",")
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0)
        : [];
    if (skills.length > 0) createPayload.skills = skills;
    // Parse education and experience JSON inputs
    if (
        createNodeForm.educationInput &&
        createNodeForm.educationInput.trim() !== ""
    ) {
        try {
            createPayload.education = JSON.parse(createNodeForm.educationInput);
        } catch (e) {
            showBanner("nodes", "error", "Education must be valid JSON array");
            return;
        }
    }
    if (
        createNodeForm.experienceInput &&
        createNodeForm.experienceInput.trim() !== ""
    ) {
        try {
            createPayload.experience = JSON.parse(
                createNodeForm.experienceInput
            );
        } catch (e) {
            showBanner("nodes", "error", "Experience must be valid JSON array");
            return;
        }
    }
    // Parse sourceIds input: allow comma-separated tokens like "linkedin:123, github:abc" or just "linkedin"
    if (createNodeForm.source && createNodeForm.source.trim() !== "") {
        const parts = createNodeForm.source
            .split(",")
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
        const sourceIds: Record<string, string> = {};
        for (const p of parts) {
            // allow key:value or key=val formats
            const kv = p.includes(":")
                ? p.split(":", 2)
                : p.includes("=")
                ? p.split("=", 2)
                : [p, p];
            const key = kv[0].trim();
            const val = (kv[1] || kv[0]).trim();
            if (key) sourceIds[key] = val;
        }
        if (Object.keys(sourceIds).length > 0)
            createPayload.sourceIds = sourceIds;
    }

    try {
        const created = await MultiSourceNetworkAPI.createNodeForUser(
            createPayload as any
        );
        if (!created || !("node" in created))
            throw new Error(
                String((created as any)?.error || "createNodeForUser failed")
            );
        const nodeId = (created as any).node as string;

        // Optionally attach the provided source tag(s) to the membership
        if (
            createPayload.sourceIds &&
            typeof createPayload.sourceIds === "object"
        ) {
            for (const k of Object.keys(
                createPayload.sourceIds as Record<string, string>
            )) {
                try {
                    await MultiSourceNetworkAPI.addNodeToNetwork({
                        owner: auth.userId,
                        node: nodeId,
                        source: k,
                    });
                } catch (e) {
                    // ignore membership attach errors (best-effort)
                }
            }
        } else if (
            createNodeForm.source &&
            createNodeForm.source.trim() !== ""
        ) {
            await MultiSourceNetworkAPI.addNodeToNetwork({
                owner: auth.userId,
                node: nodeId,
                source: createNodeForm.source,
            });
        }

        logActivity(
            "nodes",
            "createNodeForUser",
            createPayload,
            "success",
            "Node created and merged."
        );
        // Clear form
        createNodeForm.firstName = "";
        createNodeForm.lastName = "";
        createNodeForm.label = "";
        createNodeForm.headline = "";
        createNodeForm.profileUrl = "";
        createNodeForm.avatarUrl = "";
        createNodeForm.location = "";
        createNodeForm.industry = "";
        createNodeForm.currentPosition = "";
        createNodeForm.currentCompany = "";
        createNodeForm.profilePictureUrl = "";
        createNodeForm.summary = "";
        createNodeForm.skillsInput = "";
        createNodeForm.educationInput = "";
        createNodeForm.experienceInput = "";
        createNodeForm.tagsInput = "";
        createNodeForm.source = "";

        // Automatically refresh visualization
        await fetchAdjacency();
    } catch (error) {
        logActivity(
            "nodes",
            "createNodeForUser",
            createPayload,
            "error",
            formatError(error)
        );
    }
}

async function handleRemoveNode() {
    if (!auth.userId) return;
    // Prefer selected nodeId; if user pasted a username/id manually, resolve it
    const nodeIdentifier =
        removeNodeForm.nodeId ||
        (removeNodeForm.nodeDisplay
            ? await resolveToUserId(removeNodeForm.nodeDisplay)
            : undefined);
    if (!nodeIdentifier) {
        showBanner("nodes", "error", "Node identifier is required.");
        return;
    }
    const payload = {
        owner: auth.userId,
        node: nodeIdentifier,
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
        removeNodeForm.nodeId = "";
        removeNodeForm.nodeDisplay = "";
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

async function searchRemoveNode() {
    if (!auth.userId) return;
    const q = removeNodeSearchQuery.value.trim();
    if (q === "") {
        removeNodeSearchResults.value = [];
        return;
    }
    try {
        const res = await MultiSourceNetworkAPI.searchNodes({
            owner: auth.userId,
            query: q,
            limit: 10,
        });
        removeNodeSearchResults.value =
            (res.results as Array<Record<string, any>>) || [];
    } catch (e) {
        console.warn("searchRemoveNode failed", e);
        removeNodeSearchResults.value = [];
    }
}

function selectRemoveNode(r: Record<string, any>) {
    const id = String(r._id || r._id);
    const name =
        ((r.firstName || "") + " " + (r.lastName || "")).trim() ||
        r.label ||
        id;
    removeNodeForm.nodeId = id;
    removeNodeForm.nodeDisplay = name;
    removeNodeSearchQuery.value = "";
    removeNodeSearchResults.value = [];
}

async function searchFromNode() {
    if (!auth.userId) return;
    const q = edgeForm.fromDisplay.trim();
    if (q === "") {
        fromSearchResults.value = [];
        return;
    }
    try {
        const res = await MultiSourceNetworkAPI.searchNodes({
            owner: auth.userId,
            query: q,
            limit: 8,
        });
        fromSearchResults.value =
            (res.results as Array<Record<string, any>>) || [];
    } catch (e) {
        console.warn("searchFromNode failed", e);
        fromSearchResults.value = [];
    }
}

function selectFromNode(r: Record<string, any>) {
    const id = String(r._id || r._id);
    const name =
        ((r.firstName || "") + " " + (r.lastName || "")).trim() ||
        r.label ||
        id;
    edgeForm.fromId = id;
    edgeForm.fromDisplay = name;
    fromSearchResults.value = [];
}

async function searchToNode() {
    if (!auth.userId) return;
    const q = edgeForm.toDisplay.trim();
    if (q === "") {
        toSearchResults.value = [];
        return;
    }
    try {
        const res = await MultiSourceNetworkAPI.searchNodes({
            owner: auth.userId,
            query: q,
            limit: 8,
        });
        toSearchResults.value =
            (res.results as Array<Record<string, any>>) || [];
    } catch (e) {
        console.warn("searchToNode failed", e);
        toSearchResults.value = [];
    }
}

function selectToNode(r: Record<string, any>) {
    const id = String(r._id || r._id);
    const name =
        ((r.firstName || "") + " " + (r.lastName || "")).trim() ||
        r.label ||
        id;
    edgeForm.toId = id;
    edgeForm.toDisplay = name;
    toSearchResults.value = [];
}

// Reuse the same search lists for remove-edge inputs (they'll update based on the typed text in removeEdgeForm)
async function searchFromNodeForRemove() {
    if (!auth.userId) return;
    const q = removeEdgeForm.fromDisplay
        ? removeEdgeForm.fromDisplay.trim()
        : "";
    if (q === "") {
        fromSearchResultsRemove.value = [];
        return;
    }
    try {
        const res = await MultiSourceNetworkAPI.searchNodes({
            owner: auth.userId,
            query: q,
            limit: 8,
        });
        fromSearchResultsRemove.value =
            (res.results as Array<Record<string, any>>) || [];
    } catch (e) {
        fromSearchResultsRemove.value = [];
    }
}

function selectRemoveEdgeFrom(r: Record<string, any>) {
    const id = String(r._id || r._id);
    const name =
        ((r.firstName || "") + " " + (r.lastName || "")).trim() ||
        r.label ||
        id;
    removeEdgeForm.fromId = id;
    removeEdgeForm.fromDisplay = name;
    fromSearchResultsRemove.value = [];
}

async function searchToNodeForRemove() {
    if (!auth.userId) return;
    const q = removeEdgeForm.toDisplay ? removeEdgeForm.toDisplay.trim() : "";
    if (q === "") {
        toSearchResultsRemove.value = [];
        return;
    }
    try {
        const res = await MultiSourceNetworkAPI.searchNodes({
            owner: auth.userId,
            query: q,
            limit: 8,
        });
        toSearchResultsRemove.value =
            (res.results as Array<Record<string, any>>) || [];
    } catch (e) {
        toSearchResultsRemove.value = [];
    }
}

function selectRemoveEdgeTo(r: Record<string, any>) {
    const id = String(r._id || r._id);
    const name =
        ((r.firstName || "") + " " + (r.lastName || "")).trim() ||
        r.label ||
        id;
    removeEdgeForm.toId = id;
    removeEdgeForm.toDisplay = name;
    toSearchResultsRemove.value = [];
}

async function handleAddEdge() {
    if (!auth.userId) return;
    // Prefer selected IDs from the dropdown; if absent, try resolving the display text (username/id)
    const resolvedFrom =
        edgeForm.fromId ||
        (edgeForm.fromDisplay
            ? await resolveToUserId(edgeForm.fromDisplay)
            : undefined);
    const resolvedTo =
        edgeForm.toId ||
        (edgeForm.toDisplay
            ? await resolveToUserId(edgeForm.toDisplay)
            : undefined);
    if (!resolvedFrom || !resolvedTo) {
        showBanner("edges", "error", "Both 'from' and 'to' nodes are required.");
        return;
    }
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
        edgeForm.fromId = "";
        edgeForm.fromDisplay = "";
        edgeForm.toId = "";
        edgeForm.toDisplay = "";
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
    const resolvedFrom =
        removeEdgeForm.fromId ||
        (removeEdgeForm.fromDisplay
            ? await resolveToUserId(removeEdgeForm.fromDisplay)
            : undefined);
    const resolvedTo =
        removeEdgeForm.toId ||
        (removeEdgeForm.toDisplay
            ? await resolveToUserId(removeEdgeForm.toDisplay)
            : undefined);
    if (!resolvedFrom || !resolvedTo) {
        showBanner("edges", "error", "Both 'from' and 'to' nodes are required.");
        return;
    }
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
        removeEdgeForm.fromId = "";
        removeEdgeForm.fromDisplay = "";
        removeEdgeForm.toId = "";
        removeEdgeForm.toDisplay = "";
        removeEdgeForm.source = "";
        // Automatically refresh visualization
        await fetchAdjacency();
    } catch (error) {
        logActivity(
            "edges",
            "removeEdge",
            payload,
            "error",
            formatError(error)
        );
    }
}

async function fetchAdjacency() {
    if (!auth.userId) return;
    adjacencyLoading.value = true;

    try {
        const data = await MultiSourceNetworkAPI.getAdjacencyArray({
            owner: auth.userId,
        });

    // Handle both old format (just adjacency) and new format ({ adjacency, nodeLabels })
    // IMPORTANT: Always create a new object reference to ensure Vue reactivity detects the change
    if (!data) {
      console.error("getAdjacencyArray returned null or undefined");
      adjacency.value = null;
      nodeLabels.value = {};
    } else if (data && typeof data === 'object' && 'adjacency' in data) {
      // New format: { adjacency, nodeLabels }
      // Create new object references to ensure Vue reactivity
      adjacency.value = { ...(data.adjacency || {}) };
      nodeLabels.value = { ...(data.nodeLabels || {}) };
      console.log("Loaded adjacency data (new format):", Object.keys(adjacency.value).length, "nodes");
    } else {
      // Fallback for old format (just adjacency object)
      // Create new object reference to ensure Vue reactivity
      adjacency.value = { ...(data as AdjacencyMap) };
      nodeLabels.value = {};
      console.log("Loaded adjacency data (old format):", Object.keys(adjacency.value).length, "nodes");
    }

    // Check if root node is set (it might be the owner or we need to track it)
    // For now, we'll use the first node or owner as root if not explicitly set
    if (!rootNodeId.value && adjacency.value && Object.keys(adjacency.value).length > 0) {
      rootNodeId.value = auth.userId;
    }

    // Collect all node IDs (sources and targets)
    if (!adjacency.value) {
      console.error("Adjacency data is null after processing");
      return;
    }
    const allNodeIds = new Set<string>(Object.keys(adjacency.value));
    for (const nodeId of Object.keys(adjacency.value)) {
      const edges = adjacency.value[nodeId] || [];
      for (const edge of edges) {
        allNodeIds.add(edge.to);
      }
    }

        // Fetch profile data for all nodes
        await fetchNodeProfiles(Array.from(allNodeIds));

        // Attempt to load node metadata (firstName/lastName/label) via searchNodes so we can
        // display human-friendly names in the graph. This is a best-effort call and will
        // silently fail if not available.
        try {
            const metaRes = await MultiSourceNetworkAPI.searchNodes({
                owner: auth.userId,
                query: "",
                limit: 1000,
            });
            const results =
                (metaRes.results as Array<Record<string, any>>) || [];
            for (const r of results) {
                if (r._id) {
                    nodeMetaMap.value[String(r._id)] = {
                        firstName: r.firstName,
                        lastName: r.lastName,
                        label: r.label,
                    };
                }
            }
        } catch (err) {
            // ignore metadata fetch errors
        }

        logActivity(
            "explorer",
            "_getAdjacencyArray",
            { owner: auth.userId },
            "success",
            "Adjacency data refreshed."
        );

    // Render network after data is loaded
    // Use a small delay to ensure DOM is ready and reactivity has processed
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      await renderNetwork();
    } catch (renderError) {
      console.error("Error rendering network:", renderError);
      console.error("Render error details:", renderError instanceof Error ? renderError.stack : String(renderError));
    }

  } catch (error) {
    const errorMsg = formatError(error);
    console.error("Error fetching adjacency:", error);
    console.error("Error details:", error instanceof Error ? error.stack : String(error));
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
    if (error && typeof error === 'object' && 'message' in error) {
      console.error("Error message:", (error as any).message);
    }
    logActivity(
      "explorer",
      "_getAdjacencyArray",
      { owner: auth.userId },
      "error",
      errorMsg,
    );
    // Reset adjacency on error to prevent stale data
    adjacency.value = null;
    nodeLabels.value = {};
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
            const profileResult = await PublicProfileAPI.getProfile({
                user: nodeId,
            });
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

  console.log("Node labels available:", nodeLabels.value);

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

    // Build bidirectional adjacency map (treat all edges as bidirectional)
    const bidirectionalAdj: Record<string, Set<string>> = {};
    for (const nodeId of nodeIds) {
        bidirectionalAdj[nodeId] = new Set<string>();
    }

    // Add all edges bidirectionally
    for (const nodeId of nodeIds) {
        const nodeEdges = adjacency.value[nodeId] || [];
        for (const edge of nodeEdges) {
            // Add forward edge
            if (!bidirectionalAdj[nodeId]) {
                bidirectionalAdj[nodeId] = new Set<string>();
            }
            bidirectionalAdj[nodeId].add(edge.to);

            // Add reverse edge (bidirectional)
            if (!bidirectionalAdj[edge.to]) {
                bidirectionalAdj[edge.to] = new Set<string>();
            }
            bidirectionalAdj[edge.to].add(nodeId);
        }
    }

    // Calculate node degrees (distance from root) using BFS on bidirectional graph
    // This finds the shortest path, prioritizing lowest degree
    const rootId = rootNodeId.value || auth.userId;
    const nodeDegrees = new Map<string, number>(); // nodeId -> degree (0 = root, 1 = 1st degree, 2 = 2nd degree, etc.)

    if (rootId && (nodeIds.includes(rootId) || bidirectionalAdj[rootId])) {
        // BFS to calculate shortest distances from root (treating edges as bidirectional)
        const queue: Array<{ id: string; degree: number }> = [{ id: rootId, degree: 0 }];
        nodeDegrees.set(rootId, 0);
        const visited = new Set<string>([rootId]);

        while (queue.length > 0) {
            const current = queue.shift()!;
            const neighbors = bidirectionalAdj[current.id] || new Set<string>();

            for (const neighborId of neighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    const nextDegree = current.degree + 1;
                    nodeDegrees.set(neighborId, nextDegree);
                    queue.push({ id: neighborId, degree: nextDegree });
                }
            }
        }

        // Set degree for any unvisited nodes (disconnected components) to a high value
        for (const nodeId of nodeIds) {
            if (!nodeDegrees.has(nodeId)) {
                nodeDegrees.set(nodeId, 999); // Disconnected
            }
        }

        // Also check for nodes that are targets but not in nodeIds
        for (const nodeId in bidirectionalAdj) {
            if (!nodeDegrees.has(nodeId)) {
                nodeDegrees.set(nodeId, 999);
            }
        }
    } else {
        // No root found, set all to unknown degree
        for (const nodeId of nodeIds) {
            nodeDegrees.set(nodeId, 999);
        }
    }

    // Helper function to get degree color (distinct rainbow colors)
    const getDegreeColor = (nodeId: string): string => {
        const degree = nodeDegrees.get(nodeId) ?? 999;
        if (isRoot(nodeId)) {
            return "#dc2626"; // Red for root/self node
        } else if (degree === 1) {
            return "#facc15"; // Yellow for 1st degree
        } else if (degree === 2) {
            return "#22c55e"; // Green for 2nd degree
        } else if (degree === 3) {
            return "#38bdf8"; // Sky blue for 3rd degree
        } else if (degree === 4) {
            return "#a855f7"; // Purple for 4th degree
        } else {
            return "#6b7280"; // Gray for 5+ degree or disconnected
        }
    };

    // Helper function to get node size based on degree
    const getNodeSize = (nodeId: string): number => {
        const degree = nodeDegrees.get(nodeId) ?? 999;
        if (isRoot(nodeId)) {
            return 70; // Largest for root
        } else if (degree === 1) {
            return 50; // Large for 1st degree
        } else if (degree === 2) {
            return 40; // Medium for 2nd degree
        } else {
            return 35; // Smaller for 3+ degree
        }
    };

    // Track edges we've already added (shared across all nodes to prevent duplicates)
    const addedEdges = new Set<string>();

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

        const nodeColor = getDegreeColor(nodeId);

        // Prefer canonical node metadata firstName+lastName if available (from searchNodes),
        // then fall back to username/profile, then nodeId.
        const meta = nodeMetaMap.value[nodeId] || {};
        const nameFromMeta = (
            (meta.firstName || "") +
            " " +
            (meta.lastName || "")
        ).trim();
        const nodeLabel =
            nameFromMeta ||
            (nodeId === auth.userId
                ? auth.username || profileData.username || nodeId
                : profileData.username || nodeId);

        const node: any = {
            id: nodeId,
            label: nodeLabel,
            shape: "circularImage",
            image: profileData.avatarUrl,
            brokenImage: avatarStore.DEFAULT_AVATAR,
            borderWidth: isRoot(nodeId) ? 6 : 4,
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
            size: getNodeSize(nodeId),
            // Pin the root/self node in place - it cannot be dragged
            fixed: isRoot(nodeId) ? { x: true, y: true } : false,
        };

        nodes.add(node);

        // Create edges (bidirectional - only add once per pair to avoid duplicates)
        const nodeEdges = adjacency.value[nodeId] || [];

        for (const edge of nodeEdges) {
            // Create a canonical edge ID (smaller ID first to avoid duplicates)
            const edgeId = nodeId < edge.to ? `${nodeId}-${edge.to}` : `${edge.to}-${nodeId}`;

            if (addedEdges.has(edgeId)) {
                continue; // Skip if we've already added this edge
            }
            addedEdges.add(edgeId);

            const fromDegree = nodeDegrees.get(nodeId) ?? 999;
            const toDegree = nodeDegrees.get(edge.to) ?? 999;
            const maxDegree = Math.max(fromDegree, toDegree);

            // Make edges match node colors with distinct rainbow colors
            let edgeOpacity = 1.0;
            let edgeWidth = edge.weight ? Math.max(1, Math.min(5, edge.weight)) : 2;
            let edgeColor = "#dc2626"; // Red base color

            if (maxDegree === 0) {
                // Root to root (shouldn't happen, but just in case)
                edgeOpacity = 1.0;
                edgeWidth = edge.weight ? Math.max(2, Math.min(5, edge.weight)) : 3;
                edgeColor = "#dc2626"; // Red
            } else if (maxDegree === 1) {
                // 1st degree edge
                edgeOpacity = 0.8;
                edgeWidth = edge.weight ? Math.max(2, Math.min(5, edge.weight)) : 2.5;
                edgeColor = "#facc15"; // Yellow
            } else if (maxDegree === 2) {
                // 2nd degree edge
                edgeOpacity = 0.7;
                edgeWidth = edge.weight ? Math.max(1.5, Math.min(4, edge.weight)) : 2;
                edgeColor = "#22c55e"; // Green
            } else if (maxDegree === 3) {
                // 3rd degree edge
                edgeOpacity = 0.6;
                edgeWidth = edge.weight ? Math.max(1, Math.min(3, edge.weight)) : 1.5;
                edgeColor = "#38bdf8"; // Sky blue
            } else if (maxDegree === 4) {
                // 4th degree edge
                edgeOpacity = 0.5;
                edgeWidth = edge.weight ? Math.max(1, Math.min(3, edge.weight)) : 1.5;
                edgeColor = "#a855f7"; // Purple
            } else {
                // 5+ degree edge
                edgeOpacity = 0.4;
                edgeWidth = edge.weight ? Math.max(1, Math.min(2, edge.weight)) : 1;
                edgeColor = "#6b7280"; // Gray
            }

            edges.add({
                id: edgeId,
                from: nodeId,
                to: edge.to,
                label: edge.weight ? String(edge.weight) : "",
                width: edgeWidth,
                arrows: {
                    to: {
                        enabled: false, // No arrows for bidirectional edges
                    },
                },
                color: {
                    color: edgeColor,
                    opacity: edgeOpacity,
                    highlight: maxDegree === 0 ? "#dc2626" :
                               maxDegree === 1 ? "#facc15" :
                               maxDegree === 2 ? "#22c55e" :
                               maxDegree === 3 ? "#38bdf8" :
                               maxDegree === 4 ? "#a855f7" :
                               "#6b7280",
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

                // Prefer canonical node metadata firstName+lastName if available, else username
                const metaTarget = nodeMetaMap.value[edge.to] || {};
                const nameFromMetaTarget = (
                    (metaTarget.firstName || "") +
                    " " +
                    (metaTarget.lastName || "")
                ).trim();
                const nodeLabel =
                    nameFromMetaTarget || profileData.username || edge.to;

                // Check if this target node is the root node
                const isTargetRoot = isRoot(edge.to);
                const targetNodeColor = getDegreeColor(edge.to);
                nodes.add({
                    id: edge.to,
                    label: nodeLabel,
                    shape: "circularImage",
                    image: profileData.avatarUrl,
                    brokenImage: avatarStore.DEFAULT_AVATAR,
                    borderWidth: isTargetRoot ? 6 : 4,
                    borderColor: targetNodeColor,
                    color: {
                        border: targetNodeColor,
                        background: "#ffffff",
                        highlight: {
                            border: targetNodeColor,
                            background: "#f0f0f0",
                        },
                    },
                    font: {
                        size: isTargetRoot ? 16 : 14,
                        face: "Inter",
                        bold: isTargetRoot,
                    },
                    size: getNodeSize(edge.to),
                    // Pin the root/self node in place - it cannot be dragged
                    fixed: isTargetRoot ? { x: true, y: true } : false,
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
      margin: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      },
      borderWidth: 4,
      chosen: {
        node: (values: any) => {
          values.borderWidth = 6;
        },
        label: false,
      },
        },
        edges: {
            arrows: {
                to: {
                    enabled: false, // No arrows for bidirectional edges
                },
            },
            smooth: {
                enabled: true,
                type: "curvedCW", // Curved edges that better avoid nodes
                roundness: 0.6,
            },
      length: 350, // Increased edge length for better spacing
      width: 2,
        },
        physics: {
            // For hierarchical layout, we can use physics for stabilization
            // but it will be overridden by the hierarchical positioning
            enabled: false, // Disable physics when using hierarchical layout for cleaner organization
            stabilization: {
                enabled: false,
                iterations: 0,
            },
        },
        interaction: {
            hover: true,
            tooltipDelay: 200,
            zoomView: true, // Allow mouse wheel zoom
            dragView: true, // Allow panning the graph view
            dragNodes: true, // Allow dragging individual nodes (except root node which is fixed)
        },
        layout: {
            // Use hierarchical layout for better organization by degree
            hierarchical: nodes.length > 1 ? {
                enabled: true,
                direction: "UD", // Up-Down layout (root at top)
                sortMethod: "directed", // Use directed graph structure
                levelSeparation: 250, // Vertical spacing between levels (degrees)
                nodeSpacing: 300, // Horizontal spacing between nodes at same level
                treeSpacing: 350, // Spacing between different branches
                blockShifting: true, // Allow nodes to shift to avoid overlap
                edgeMinimization: true, // Minimize edge crossings
                parentCentralization: true, // Center parent nodes
            } : false,
            improvedLayout: false, // Don't use improvedLayout when hierarchical is enabled
        },
    };


    // Destroy existing network if it exists
    if (networkInstance.value) {
        try {
            networkInstance.value.destroy();
        } catch (destroyError) {
            console.warn("Error destroying existing network instance:", destroyError);
        }
        networkInstance.value = null;
    }

    // Wait a bit to ensure cleanup is complete (don't clear innerHTML - it causes flicker)
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
        console.log(
            "Creating network visualization with",
            nodes.length,
            "nodes and",
            edges.length,
            "edges"
        );
        if (!networkContainer.value) {
            console.error("Network container is null, cannot create visualization");
            return;
        }
        networkInstance.value = new Network(
            networkContainer.value,
            data,
            options
        );
        console.log("Network visualization created successfully");

        // Add constraints to prevent nodes from being dragged outside the viewport
        setupNodeConstraints();

        // Frame the graph to show all nodes after a short delay to allow stabilization
        if (nodes.length > 0) {
            // Wait a bit for the network to start rendering
            setTimeout(() => {
                try {
                    // Use fit() to show all nodes - it automatically calculates the best view
                    networkInstance.value?.fit({
                        animation: {
                            duration: 500,
                            easingFunction: 'easeInOutQuad'
                        }
                    });

                    // Get the current scale after fitting and set minimum zoom
                    setTimeout(() => {
                        const currentScale = networkInstance.value?.getScale();
                        if (currentScale !== undefined && networkInstance.value) {
                            // Set initial zoom display
                            currentZoom.value = currentScale;

                            // Center the view on the root node if it exists
                            const rootId = rootNodeId.value || auth.userId;
                            if (rootId && nodes.get(rootId)) {
                                try {
                                    networkInstance.value.focus(rootId, {
                                        scale: currentScale,
                                        animation: {
                                            duration: 300,
                                            easingFunction: 'easeInOutQuad'
                                        }
                                    });
                                } catch (error) {
                                    console.warn("Error focusing on root node:", error);
                                }
                            }

                            // Listen for zoom events to update zoom percentage display
                            networkInstance.value.on("zoom", () => {
                                const scale = networkInstance.value?.getScale();
                                if (scale !== undefined) {
                                    currentZoom.value = scale;
                                }
                            });
                        }
                    }, 600); // Wait for fit animation to complete
                } catch (error) {
                    console.warn("Error fitting network:", error);
                }
            }, 500); // Wait for initial render
        } else {
            // No nodes, set default zoom
            currentZoom.value = 1.0;
        }
    } catch (error) {
        console.error("Error creating network visualization:", error);
        console.error("Error details:", error instanceof Error ? error.stack : String(error));
    }
}

function formatError(error: unknown) {
    if (error instanceof ConceptApiError) {
        return error.message;
    }
    return "Unexpected error. Check console for details.";
}

// Center the view on the root node
function centerOnRootNode() {
    if (!networkInstance.value || !auth.userId) return;
    const rootId = rootNodeId.value || auth.userId;
    try {
        const currentScale = networkInstance.value.getScale() || currentZoom.value;
        networkInstance.value.focus(rootId, {
            scale: currentScale,
            animation: {
                duration: 400,
                easingFunction: 'easeInOutQuad'
            }
        });
    } catch (error) {
        console.warn("Error centering on root node:", error);
    }
}

// Setup constraints to prevent nodes from being dragged outside the viewport
function setupNodeConstraints() {
    if (!networkInstance.value || !networkContainer.value) return;

    // Helper to check if a node is the root node
    const isRootNode = (nodeId: string) => {
        return rootNodeId.value === nodeId || nodeId === auth.userId;
    };

    // Listen during dragging for real-time constraint
    networkInstance.value.on("dragging", (params: any) => {
        if (!params.nodes || params.nodes.length === 0) return;
        if (!networkContainer.value) return;

        // Get container dimensions
        const containerRect = networkContainer.value.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        // Get current view position and scale
        const viewPosition = networkInstance.value?.getViewPosition();
        const scale = networkInstance.value?.getScale() || 1;

        if (!viewPosition) return;

        // Calculate viewport bounds in canvas coordinates
        // The viewport center is at viewPosition
        const viewportLeft = viewPosition.x - (containerWidth / 2) / scale;
        const viewportRight = viewPosition.x + (containerWidth / 2) / scale;
        const viewportTop = viewPosition.y - (containerHeight / 2) / scale;
        const viewportBottom = viewPosition.y + (containerHeight / 2) / scale;

        // Get the node's current position
        const nodePositions = networkInstance.value?.getPositions(params.nodes);
        if (!nodePositions) return;

        const nodeSize = 60; // Maximum node size
        const padding = nodeSize / scale; // Add padding to keep node fully visible

        // Constrain each dragged node
        for (const nodeId of params.nodes) {
            // Skip root node - it's already fixed
            if (isRootNode(nodeId)) continue;

            const pos = nodePositions[nodeId];
            if (!pos) continue;

            let constrainedX = pos.x;
            let constrainedY = pos.y;
            let needsUpdate = false;

            // Constrain X position
            if (constrainedX < viewportLeft + padding) {
                constrainedX = viewportLeft + padding;
                needsUpdate = true;
            } else if (constrainedX > viewportRight - padding) {
                constrainedX = viewportRight - padding;
                needsUpdate = true;
            }

            // Constrain Y position
            if (constrainedY < viewportTop + padding) {
                constrainedY = viewportTop + padding;
                needsUpdate = true;
            } else if (constrainedY > viewportBottom - padding) {
                constrainedY = viewportBottom - padding;
                needsUpdate = true;
            }

            // Update position if constrained
            if (needsUpdate) {
                networkInstance.value?.moveNode(nodeId, constrainedX, constrainedY);
            }
        }
    });

    // Also check on drag end to ensure final position is within bounds
    networkInstance.value.on("dragEnd", (params: any) => {
        if (!params.nodes || params.nodes.length === 0) return;
        if (!networkContainer.value) return;

        // Get container dimensions
        const containerRect = networkContainer.value.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        // Get current view position and scale
        const viewPosition = networkInstance.value?.getViewPosition();
        const scale = networkInstance.value?.getScale() || 1;

        if (!viewPosition) return;

        // Calculate viewport bounds
        const viewportLeft = viewPosition.x - (containerWidth / 2) / scale;
        const viewportRight = viewPosition.x + (containerWidth / 2) / scale;
        const viewportTop = viewPosition.y - (containerHeight / 2) / scale;
        const viewportBottom = viewPosition.y + (containerHeight / 2) / scale;

        // Get the node's current position
        const nodePositions = networkInstance.value?.getPositions(params.nodes);
        if (!nodePositions) return;

        const nodeSize = 60;
        const padding = nodeSize / scale;

        // Constrain each dragged node
        for (const nodeId of params.nodes) {
            // Skip root node - it's already fixed
            if (isRootNode(nodeId)) continue;

            const pos = nodePositions[nodeId];
            if (!pos) continue;

            let constrainedX = pos.x;
            let constrainedY = pos.y;
            let needsUpdate = false;

            // Constrain X position
            if (constrainedX < viewportLeft + padding) {
                constrainedX = viewportLeft + padding;
                needsUpdate = true;
            } else if (constrainedX > viewportRight - padding) {
                constrainedX = viewportRight - padding;
                needsUpdate = true;
            }

            // Constrain Y position
            if (constrainedY < viewportTop + padding) {
                constrainedY = viewportTop + padding;
                needsUpdate = true;
            } else if (constrainedY > viewportBottom - padding) {
                constrainedY = viewportBottom - padding;
                needsUpdate = true;
            }

            // Update position if constrained
            if (needsUpdate) {
                networkInstance.value?.moveNode(nodeId, constrainedX, constrainedY);
            }
        }
    });
}


// Watch for adjacency changes to update visualization
watch(
    () => adjacency.value,
    async (newAdjacency: AdjacencyMap | null, oldAdjacency: AdjacencyMap | null) => {
        // Only trigger if adjacency actually changed (not just reference equality)
        const newKeys = newAdjacency ? Object.keys(newAdjacency).sort().join(',') : '';
        const oldKeys = oldAdjacency ? Object.keys(oldAdjacency).sort().join(',') : '';
        if (newKeys !== oldKeys || (newAdjacency && Object.keys(newAdjacency).length > 0)) {
            console.log("Adjacency data changed, triggering render", {
                newCount: newAdjacency ? Object.keys(newAdjacency).length : 0,
                oldCount: oldAdjacency ? Object.keys(oldAdjacency).length : 0
            });
            // Wait for DOM to update and container to be available
            await nextTick();
            // Give a small delay to ensure container is rendered
            await new Promise((resolve) => setTimeout(resolve, 200));
            await renderNetwork();
        } else {
            console.log("Adjacency data is empty or null, skipping render");
        }
    },
    { deep: true } // Enable deep watching to catch nested changes
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
    (newRoot: string) => {
        if (newRoot) {
            rootNodeId.value = newRoot;
        }
    }
);

// Automatically load network visualization when user is authenticated
watch(
    () => auth.userId,
    async (userId: string | null) => {
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

<style scoped>
/* Search result dropdown styling: clickable items and scroll when long */
.dropdown {
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    z-index: 40;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
    list-style: none;
    margin: 6px 0 0 0;
    padding: 6px 0;
    max-height: 220px; /* when list gets long, allow scrolling */
    overflow-y: auto;
}

.dropdown li {
    padding: 8px 12px;
    font-size: 0.95rem;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-radius: 4px;
}

.dropdown li:hover {
    background: #f1f5f9;
    cursor: pointer;
}

/* Make sure the parent label/container is positioned so absolute dropdown anchors correctly */
label {
    position: relative;
}

/* Small visual cue for hidden id inputs */
input[type="hidden"] {
    display: none;
}

/* Network visualization container */
.network-visualization-container {
    position: relative;
    width: 100%;
    height: 600px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    background: #ffffff;
    overflow: hidden;
}

.network-graph {
    width: 100%;
    height: 100%;
}

/* Zoom indicator */
.zoom-indicator {
    position: absolute;
    right: 20px;
    top: 20px;
    z-index: 10;
    background: rgba(255, 255, 255, 0.95);
    padding: 8px 12px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(0, 0, 0, 0.08);
    font-size: 0.875rem;
    font-weight: 500;
    color: #475569;
    font-family: 'Inter', sans-serif;
}

</style>
