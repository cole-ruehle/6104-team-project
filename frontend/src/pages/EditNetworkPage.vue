<template>
    <div class="edit-network-page">
        <!-- Action Buttons -->
        <div class="action-buttons-bar">
            <button @click="showAddModal = true" class="action-btn primary">
                <i class="fa-solid fa-plus"></i>
                Add Connection
            </button>
            <button @click="showImportModal = true" class="action-btn">
                <i class="fa-solid fa-file-import"></i>
                Import
            </button>
            <button
                @click="handleEditSelected"
                class="action-btn"
                :disabled="!selectedConnectionId"
            >
                <i class="fa-solid fa-pencil"></i>
                Edit Connection
            </button>
            <button
                @click="handleRemoveSelected"
                class="action-btn danger"
                :disabled="!selectedConnectionId"
            >
                <i class="fa-solid fa-trash"></i>
                Remove Connection
            </button>
        </div>

        <!-- Main Content: Statistics and Member List -->
        <div class="content-grid">
            <!-- Left Panel: Statistics -->
            <div class="left-panel">
                <NetworkStatistics
                    :totalConnections="totalConnections"
                    :connectionsBySource="connectionsBySource"
                />
            </div>

            <!-- Right Panel: Network Members List -->
            <div class="right-panel">
                <div class="members-list-container">
                    <h2 class="members-title">Network Members</h2>
                    <div v-if="loading" class="loading-state">
                        <div class="loading-icon">📡</div>
                        <p>Loading network members...</p>
                    </div>
                    <div v-else-if="networkMembers.length === 0" class="empty-state">
                        <div class="empty-icon">👥</div>
                        <h3>No connections yet</h3>
                        <p>Click "Add Connection" to get started</p>
                    </div>
                    <div v-else class="members-list">
                        <div
                            v-for="member in networkMembers"
                            :key="member.id"
                            class="member-item"
                            :class="{ selected: selectedConnectionId === member.id }"
                            @click="selectedConnectionId = member.id"
                        >
                            <div class="member-avatar">
                                <img
                                    v-if="member.avatarUrl && member.avatarUrl.trim() !== ''"
                                    :src="member.avatarUrl"
                                    :alt="member.displayName"
                                    :data-member-id="member.id"
                                    @error="handleImageError"
                                />
                                <div v-else class="avatar-placeholder">
                                    {{ member.initials }}
                                </div>
                            </div>
                            <div class="member-info">
                                <h3 class="member-name">{{ member.displayName }}</h3>
                                <p v-if="member.location" class="member-location">
                                    <i class="fa-solid fa-map-marker-alt"></i>
                                    {{ member.location }}
                                </p>
                                <p v-if="member.currentJob" class="member-job">
                                    {{ member.currentJob }}
                                </p>
                                <div class="member-sources">
                                    <span
                                        v-for="source in member.sources"
                                        :key="source"
                                        class="source-tag"
                                    >
                                        {{ formatSourceName(source) }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modals -->
        <AddConnectionModal
            v-if="showAddModal"
            @close="showAddModal = false"
            @success="handleConnectionAdded"
        />
        <EditConnectionModal
            v-if="showEditModal && selectedConnectionId"
            :nodeId="selectedConnectionId"
            @close="showEditModal = false"
            @success="handleConnectionAdded"
        />
        <ImportModal
            v-if="showImportModal"
            @close="showImportModal = false"
            @success="handleConnectionAdded"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
    MultiSourceNetworkAPI,
    type AdjacencyMap,
    PublicProfileAPI,
    UserAuthenticationAPI,
    LinkedInImportAPI,
    type LinkedInConnection,
} from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAvatarStore } from "@/stores/useAvatarStore";
import NetworkStatistics from "@/components/NetworkStatistics.vue";
import AddConnectionModal from "@/components/AddConnectionModal.vue";
import EditConnectionModal from "@/components/EditConnectionModal.vue";
import ImportModal from "@/components/ImportModal.vue";

const auth = useAuthStore();
const avatarStore = useAvatarStore();

// State
const loading = ref(true);
const adjacency = ref<AdjacencyMap | null>(null);
const selectedConnectionId = ref<string | null>(null);
const showAddModal = ref(false);
const showEditModal = ref(false);
const showImportModal = ref(false);

// Data
const networkMembers = ref<
    Array<{
        id: string;
        displayName: string;
        avatarUrl: string;
        initials: string;
        location?: string;
        currentJob?: string;
        sources: string[];
    }>
>([]);
const nodeProfiles = ref<
    Record<string, { profile?: any; avatarUrl: string; username?: string }>
>({});
const linkedInConnections = ref<Record<string, LinkedInConnection>>({});

// Computed
const totalConnections = computed(() => networkMembers.value.length);

const connectionsBySource = computed(() => {
    const counts: Record<string, number> = {};
    networkMembers.value.forEach((member) => {
        member.sources.forEach((source) => {
            counts[source] = (counts[source] || 0) + 1;
        });
    });
    return counts;
});

// Methods
function formatSourceName(source: string): string {
    const sourceMap: Record<string, string> = {
        linkedin: "LinkedIn",
        manual: "Manual",
        instagram: "Instagram",
        handshake: "Handshake",
    };
    return sourceMap[source.toLowerCase()] || source;
}

function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    // Find which member this image belongs to and set their avatarUrl to empty
    const memberId = img.getAttribute("data-member-id");
    if (memberId) {
        const member = networkMembers.value.find(m => m.id === memberId);
        if (member) {
            member.avatarUrl = "";
        }
    }
}

function handleEditSelected() {
    if (!selectedConnectionId.value) return;
    showEditModal.value = true;
}

async function handleRemoveSelected() {
    if (!selectedConnectionId.value || !auth.userId) return;

    if (
        !confirm(
            `Are you sure you want to remove this connection? This action cannot be undone.`
        )
    ) {
        return;
    }

    try {
        await MultiSourceNetworkAPI.removeNodeFromNetwork({
            owner: auth.userId,
            node: selectedConnectionId.value,
        });

        selectedConnectionId.value = null;
        await loadNetworkData();
    } catch (error) {
        console.error("Error removing connection:", error);
        alert("Failed to remove connection. Please try again.");
    }
}

async function handleConnectionAdded() {
    selectedConnectionId.value = null;
    console.log("[EditNetworkPage] Connection added, refreshing network data...");
    try {
        // Small delay to ensure backend has fully persisted the data
        await new Promise(resolve => setTimeout(resolve, 300));
        await loadNetworkData();
        console.log("[EditNetworkPage] Network data refreshed successfully. Members:", networkMembers.value.length);
    } catch (error) {
        console.error("[EditNetworkPage] Error refreshing network data:", error);
        alert("Connection was added, but there was an error refreshing the view. Please refresh the page.");
    }
}

function getInitials(text: string): string {
    if (!text) return "??";
    const trimmed = text.trim();
    if (trimmed.length === 0) return "??";

    // Split by spaces to get name parts
    const parts = trimmed.split(/\s+/).filter(part => part.length > 0);

    if (parts.length === 0) return "??";

    // If only one part, use first letter twice
    if (parts.length === 1) {
        const letter = parts[0][0].toUpperCase();
        return letter + letter;
    }

    // Get first letter of first name and first letter of last name
    const firstLetter = parts[0][0].toUpperCase();
    const lastLetter = parts[parts.length - 1][0].toUpperCase();
    return firstLetter + lastLetter;
}

async function fetchNodeProfiles(nodeIds: string[]) {
    const profilePromises = nodeIds.map(async (nodeId) => {
        if (nodeProfiles.value[nodeId]) return;

        let profile: any;
        let username = nodeId;
        let avatarUrl = "";

        try {
            const userResult = await UserAuthenticationAPI.getUserById({
                id: nodeId,
            });
            if (userResult && "username" in userResult && userResult.username) {
                username = userResult.username;
            }
        } catch {
            // Continue
        }

        try {
            const profileResult = await PublicProfileAPI.getProfile({
                user: nodeId,
            });
            profile = profileResult[0]?.profile;

            if (profile) {
                const displayName = profile.headline || username;
                if ((profile as any).profilePictureUrl) {
                    avatarUrl = (profile as any).profilePictureUrl;
                    avatarStore.setForUser(nodeId, avatarUrl);
                } else {
                    const storedAvatar = avatarStore.getForUser(nodeId);
                    // Use empty string if avatar is default so initials will show
                    avatarUrl = storedAvatar === avatarStore.DEFAULT_AVATAR ? "" : storedAvatar;
                }

                nodeProfiles.value[nodeId] = {
                    profile,
                    avatarUrl,
                    username: displayName,
                };
            } else {
                const storedAvatar = avatarStore.getForUser(nodeId);
                // Use empty string if avatar is default so initials will show
                avatarUrl = storedAvatar === avatarStore.DEFAULT_AVATAR ? "" : storedAvatar;
                nodeProfiles.value[nodeId] = {
                    avatarUrl,
                    username,
                };
            }
        } catch {
            const storedAvatar = avatarStore.getForUser(nodeId);
            // Use empty string if avatar is default so initials will show
            avatarUrl = storedAvatar === avatarStore.DEFAULT_AVATAR ? "" : storedAvatar;
            nodeProfiles.value[nodeId] = {
                avatarUrl,
                username,
            };
        }
    });

    await Promise.all(profilePromises);
}

async function loadLinkedInConnections() {
    if (!auth.userId) return;

    try {
        const accounts = await LinkedInImportAPI.getLinkedInAccount({
            user: auth.userId,
        });
        if (accounts.length === 0) return;

        const accountId = accounts[0]._id;
        const connections = await LinkedInImportAPI.getConnections({
            account: accountId,
        });

        connections.forEach((conn) => {
            linkedInConnections.value[conn._id] = conn;
        });
    } catch (error) {
        console.error("Error loading LinkedIn connections:", error);
    }
}

async function loadNetworkData() {
    if (!auth.userId) {
        loading.value = false;
        return;
    }

    try {
        loading.value = true;

        await Promise.all([
            loadLinkedInConnections(),
            MultiSourceNetworkAPI.getAdjacencyArray({
                owner: auth.userId,
            }).then((data) => {
                if (!data) {
                    adjacency.value = null;
                    return data;
                }

                if (typeof data === "object" && "adjacency" in data) {
                    adjacency.value = { ...((data as any).adjacency || {}) };
                } else {
                    adjacency.value = { ...(data as any) };
                }

                return data;
            }),
        ]);

        const data = adjacency.value;
        if (!data) {
            networkMembers.value = [];
            loading.value = false;
            return;
        }

        const allNodeIds = new Set<string>(Object.keys(data));
        for (const nodeId of Object.keys(data)) {
            const edges = data[nodeId] || [];
            for (const edge of edges) {
                allNodeIds.add(edge.to);
            }
        }

        // Exclude the current user from the list
        allNodeIds.delete(auth.userId);

        console.log("[EditNetworkPage] Found node IDs in adjacency:", Array.from(allNodeIds));

        if (allNodeIds.size === 0) {
            networkMembers.value = [];
            loading.value = false;
            return;
        }

        try {
            const nodeDocs = await MultiSourceNetworkAPI.getNodes({
                ids: Array.from(allNodeIds),
                owner: auth.userId,
            });
            console.log("[EditNetworkPage] getNodes returned:", nodeDocs?.length || 0, "nodes");
            (nodeDocs || []).forEach((nd: Record<string, any>) => {
                const id = nd._id as string;
                if (!id) return;
                nodeProfiles.value[id] = {
                    profile: {
                        firstName: nd.firstName,
                        lastName: nd.lastName,
                        headline: nd.headline,
                        company: undefined,
                        location: undefined,
                        membershipSources: nd.membershipSources || {},
                        ...nd,
                    },
                    avatarUrl: (nd.avatarUrl as string) || "",
                    username: (nd.label as string) || id,
                };
            });
        } catch (e) {
            console.warn("[EditNetworkPage] getNodes failed:", e);
        }

        await fetchNodeProfiles(Array.from(allNodeIds));

        const members: Array<{
            id: string;
            displayName: string;
            avatarUrl: string;
            initials: string;
            location?: string;
            currentJob?: string;
            sources: string[];
        }> = [];

        console.log("[EditNetworkPage] Building member list for", allNodeIds.size, "nodes");
        for (const nodeId of allNodeIds) {
            const linkedInConn = linkedInConnections.value[nodeId];

            let displayName: string;
            let avatarUrl: string;
            let location: string | undefined;
            let currentJob: string | undefined;

            if (linkedInConn) {
                const firstName = linkedInConn.firstName || "";
                const lastName = linkedInConn.lastName || "";
                const fullName = `${firstName} ${lastName}`.trim();

                displayName = fullName || linkedInConn.headline || nodeId;
                avatarUrl = linkedInConn.profilePictureUrl || "";
                location = linkedInConn.location;
                currentJob = linkedInConn.currentPosition || linkedInConn.headline;

                nodeProfiles.value[nodeId] = {
                    profile: {
                        headline: linkedInConn.headline,
                        company: linkedInConn.currentCompany,
                        location: linkedInConn.location,
                    },
                    avatarUrl,
                    username: displayName,
                };
            } else {
                const profileData = nodeProfiles.value[nodeId] || {
                    avatarUrl: "",
                    username: nodeId,
                };
                const profile = profileData.profile || {};

                const first = (profile.firstName || "").trim();
                const last = (profile.lastName || "").trim();
                if (first || last) {
                    displayName = `${first} ${last}`.trim();
                } else if (profile.headline) {
                    displayName = profile.headline;
                } else {
                    displayName = profileData.username || nodeId;
                }

                // Use empty string if avatar is default so initials will show
                avatarUrl = profileData.avatarUrl === avatarStore.DEFAULT_AVATAR
                    ? ""
                    : profileData.avatarUrl;
                location = profile.location;
                currentJob = profile.headline;
            }

            const sources = new Set<string>();
            if (data[nodeId]) {
                data[nodeId].forEach((edge) => {
                    if (edge.source) sources.add(edge.source);
                });
            }
            for (const fromId of Object.keys(data)) {
                data[fromId].forEach((edge) => {
                    if (edge.to === nodeId && edge.source) {
                        sources.add(edge.source);
                    }
                });
            }

            const membershipSources =
                (nodeProfiles.value[nodeId]?.profile as any)
                    ?.membershipSources || {};
            Object.keys(membershipSources).forEach((s) => {
                if (s) sources.add(s);
            });

            members.push({
                id: nodeId,
                displayName,
                avatarUrl,
                initials: getInitials(displayName),
                location,
                currentJob,
                sources: Array.from(sources),
            });
        }

        networkMembers.value = members;
        console.log("[EditNetworkPage] Final member count:", members.length);
    } catch (error) {
        console.error("[EditNetworkPage] Error loading network data:", error);
        networkMembers.value = [];
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    loadNetworkData();
});
</script>

<style scoped>
.edit-network-page {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
}

.action-buttons-bar {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
}

.action-btn {
    padding: 0.75rem 1.5rem;
    background: white;
    border: 1px solid rgba(15, 23, 42, 0.2);
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-navy-900);
}

.action-btn:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: var(--color-navy-400);
    transform: translateY(-1px);
}

.action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.action-btn.primary {
    background: var(--color-navy-600);
    color: white;
    border-color: var(--color-navy-600);
}

.action-btn.primary:hover:not(:disabled) {
    background: var(--color-navy-700);
}

.action-btn.danger {
    background: #fee2e2;
    color: #dc2626;
    border-color: #fecaca;
}

.action-btn.danger:hover:not(:disabled) {
    background: #fecaca;
}

.content-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 2rem;
}

.left-panel {
    min-width: 0;
}

.right-panel {
    min-width: 0;
}

.members-list-container {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(15, 23, 42, 0.08);
}

.members-title {
    margin: 0 0 1.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
}

.loading-state,
.empty-state {
    text-align: center;
    padding: 3rem 2rem;
}

.loading-icon,
.empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
}

.loading-state p,
.empty-state h3 {
    margin: 0 0 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-navy-900);
}

.empty-state p {
    margin: 0;
    color: #64748b;
    font-size: 0.9rem;
}

.members-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 600px;
    overflow-y: auto;
}

.member-item {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border: 2px solid transparent;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.member-item:hover {
    background: #f1f5f9;
    border-color: rgba(102, 153, 204, 0.3);
}

.member-item.selected {
    background: #e5edf7;
    border-color: var(--color-navy-400);
}

.member-avatar {
    flex-shrink: 0;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    overflow: hidden;
    background: #dbeafe;
    display: flex;
    align-items: center;
    justify-content: center;
}

.member-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-placeholder {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
}

.member-info {
    flex: 1;
    min-width: 0;
}

.member-name {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
}

.member-location,
.member-job {
    margin: 0.25rem 0;
    font-size: 0.875rem;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.member-location i {
    font-size: 0.75rem;
}

.member-sources {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.source-tag {
    padding: 0.25rem 0.625rem;
    background: #e2e8f0;
    color: #1e293b;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
}

@media (max-width: 1024px) {
    .content-grid {
        grid-template-columns: 1fr;
    }
}
</style>
