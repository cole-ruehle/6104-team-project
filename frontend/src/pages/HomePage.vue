<template>
    <div class="home-page">
        <!-- Search Section -->
        <div class="search-section">
            <div class="search-container">
                <input
                    type="text"
                    v-model="searchQuery"
                    @input="handleSearch"
                    placeholder="Who are you looking for?..."
                    class="search-input"
                />
                <button
                    @click="toggleView"
                    class="view-toggle-btn"
                    :class="{ active: viewMode === 'network' }"
                >
                    {{ viewMode === 'card' ? 'Network View' : 'Card View' }}
                </button>
            </div>
        </div>

        <!-- Content Area -->
        <div class="content-area">
            <!-- Card View -->
            <div v-if="viewMode === 'card'" class="card-view">
                <div v-if="loading" class="loading-state">
                    <div class="loading-icon">📡</div>
                    <h3>Loading connections...</h3>
                </div>
                <div v-else-if="displayedNodes.length === 0" class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No connections found</h3>
                    <p>Try adjusting your search or add connections in Edit Network</p>
                </div>
                <div v-else class="cards-grid">
                    <ConnectionCard
                        v-for="node in displayedNodes"
                        :key="node.id"
                        :node="node"
                        @click="openProfileModal(node.id)"
                    />
                </div>
            </div>

            <!-- Network View -->
            <div v-else class="network-view">
                <NetworkDisplay
                    v-if="adjacency"
                    :adjacency="adjacency"
                    :nodeProfiles="nodeProfiles"
                    :rootNodeId="auth.userId"
                    :currentUserId="auth.userId"
                />
                <div v-else class="loading-state">
                    <div class="loading-icon">📡</div>
                    <h3>Loading network...</h3>
                </div>
            </div>
        </div>

        <!-- Profile Modal (reuse from NetworkSearchPage logic) -->
        <div
            v-if="selectedProfileId"
            class="modal-overlay"
            @click.self="closeProfileModal"
        >
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">Connection Profile</h2>
                    <button
                        class="modal-close"
                        @click="closeProfileModal"
                        aria-label="Close"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div v-if="selectedProfileData" class="profile-view">
                        <div class="profile-header">
                            <div class="profile-avatar-large">
                                <img
                                    v-if="selectedProfileData.avatarUrl"
                                    :src="selectedProfileData.avatarUrl"
                                    :alt="selectedProfileData.displayName"
                                    @error="handleImageError"
                                />
                                <div v-else class="avatar-placeholder-large">
                                    {{ selectedProfileData.initials }}
                                </div>
                            </div>
                            <div class="profile-header-info">
                                <h2 class="profile-name">
                                    {{ selectedProfileData.displayName }}
                                </h2>
                                <p
                                    v-if="selectedProfileData.headline"
                                    class="profile-headline"
                                >
                                    {{ selectedProfileData.headline }}
                                </p>
                                <div class="profile-meta">
                                    <span
                                        v-if="selectedProfileData.currentCompany"
                                        class="profile-meta-item"
                                    >
                                        <i class="fa-solid fa-building"></i>
                                        {{ selectedProfileData.currentCompany }}
                                    </span>
                                    <span
                                        v-if="selectedProfileData.location"
                                        class="profile-meta-item"
                                    >
                                        <i class="fa-solid fa-map-marker-alt"></i>
                                        {{ selectedProfileData.location }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="profile-details">
                            <div
                                v-if="selectedProfileData.currentPosition"
                                class="detail-section"
                            >
                                <h3 class="detail-title">Current Position</h3>
                                <p>{{ selectedProfileData.currentPosition }}</p>
                            </div>
                            <div
                                v-if="selectedProfileData.summary"
                                class="detail-section"
                            >
                                <h3 class="detail-title">Summary</h3>
                                <p class="profile-summary">
                                    {{ selectedProfileData.summary }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
    MultiSourceNetworkAPI,
    type AdjacencyMap,
    PublicProfileAPI,
    type PublicProfile,
    UserAuthenticationAPI,
    LinkedInImportAPI,
    type LinkedInConnection,
    SemanticSearchAPI,
} from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAvatarStore } from "@/stores/useAvatarStore";
import ConnectionCard from "@/components/ConnectionCard.vue";
import NetworkDisplay from "@/components/NetworkDisplay.vue";

const auth = useAuthStore();
const avatarStore = useAvatarStore();

// State
const searchQuery = ref("");
const viewMode = ref<"card" | "network">("card");
const loading = ref(true);
const adjacency = ref<AdjacencyMap | null>(null);
const selectedProfileId = ref<string | null>(null);

// Data
const allNodes = ref<
    Array<{
        id: string;
        displayName: string;
        username?: string;
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
const displayedNodes = computed(() => {
    if (!searchQuery.value.trim()) {
        return allNodes.value;
    }

    const query = searchQuery.value.toLowerCase().trim();
    return allNodes.value.filter((node) => {
        const nameMatch = node.displayName.toLowerCase().includes(query);
        const locationMatch = node.location?.toLowerCase().includes(query);
        const jobMatch = node.currentJob?.toLowerCase().includes(query);
        return nameMatch || locationMatch || jobMatch;
    });
});

const selectedProfileData = computed(() => {
    if (!selectedProfileId.value) {
        return null;
    }

    const node = allNodes.value.find((n) => n.id === selectedProfileId.value);
    if (!node) return null;

    const linkedInConn = linkedInConnections.value[selectedProfileId.value];
    const profile = nodeProfiles.value[selectedProfileId.value];

    return {
        id: node.id,
        displayName: node.displayName,
        headline: linkedInConn?.headline || profile?.profile?.headline || "",
        currentCompany:
            linkedInConn?.currentCompany || profile?.profile?.company || "",
        currentPosition: linkedInConn?.currentPosition || "",
        location: linkedInConn?.location || profile?.profile?.location || node.location || "",
        summary: linkedInConn?.summary || "",
        avatarUrl: node.avatarUrl,
        initials: node.initials,
    };
});

// Methods
function toggleView() {
    viewMode.value = viewMode.value === "card" ? "network" : "card";
}

function handleSearch() {
    // Search is handled by computed property
}

function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = avatarStore.DEFAULT_AVATAR;
}

function openProfileModal(nodeId: string) {
    selectedProfileId.value = nodeId;
}

function closeProfileModal() {
    selectedProfileId.value = null;
}

function getInitials(text: string): string {
    if (!text) return "?";
    const words = text.trim().split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
}

async function fetchNodeProfiles(nodeIds: string[]) {
    const profilePromises = nodeIds.map(async (nodeId) => {
        if (nodeProfiles.value[nodeId]) return;

        let profile: PublicProfile | undefined;
        let username = nodeId;
        let avatarUrl = avatarStore.DEFAULT_AVATAR;

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
                    avatarUrl = avatarStore.getForUser(nodeId);
                }

                nodeProfiles.value[nodeId] = {
                    profile,
                    avatarUrl,
                    username: displayName,
                };
            } else {
                avatarUrl = avatarStore.getForUser(nodeId);
                nodeProfiles.value[nodeId] = {
                    avatarUrl,
                    username,
                };
            }
        } catch {
            avatarUrl = avatarStore.getForUser(nodeId);
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
            allNodes.value = [];
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

        if (allNodeIds.size === 0) {
            allNodes.value = [];
            loading.value = false;
            return;
        }

        try {
            const nodeDocs = await MultiSourceNetworkAPI.getNodes({
                ids: Array.from(allNodeIds),
                owner: auth.userId,
            });
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
                    avatarUrl:
                        (nd.avatarUrl as string) || avatarStore.DEFAULT_AVATAR,
                    username: (nd.label as string) || id,
                };
            });
        } catch (e) {
            console.warn("getNodes failed:", e);
        }

        await fetchNodeProfiles(Array.from(allNodeIds));

        const nodes: Array<{
            id: string;
            displayName: string;
            username?: string;
            avatarUrl: string;
            initials: string;
            location?: string;
            currentJob?: string;
            sources: string[];
        }> = [];

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
                avatarUrl =
                    linkedInConn.profilePictureUrl ||
                    avatarStore.DEFAULT_AVATAR;
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
                    avatarUrl: avatarStore.DEFAULT_AVATAR,
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

                avatarUrl = profileData.avatarUrl;
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

            nodes.push({
                id: nodeId,
                displayName,
                username: nodeProfiles.value[nodeId]?.username,
                avatarUrl,
                initials: getInitials(displayName),
                location,
                currentJob,
                sources: Array.from(sources),
            });
        }

        allNodes.value = nodes;
    } catch (error) {
        console.error("Error loading network data:", error);
        allNodes.value = [];
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    loadNetworkData();
});
</script>

<style scoped>
.home-page {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
}

.search-section {
    margin-bottom: 2rem;
}

.search-container {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.search-input {
    flex: 1;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: 1px solid rgba(15, 23, 42, 0.2);
    border-radius: 0.5rem;
    background: white;
    transition: all 0.2s ease;
    outline: none;
}

.search-input:focus {
    border-color: var(--color-navy-400);
    box-shadow: 0 0 0 3px rgba(102, 153, 204, 0.2);
}

.view-toggle-btn {
    padding: 0.75rem 1.5rem;
    background: white;
    border: 1px solid rgba(15, 23, 42, 0.2);
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--color-navy-900);
}

.view-toggle-btn:hover {
    background: #f1f5f9;
    border-color: var(--color-navy-400);
}

.view-toggle-btn.active {
    background: var(--color-navy-600);
    color: white;
    border-color: var(--color-navy-600);
}

.content-area {
    min-height: 400px;
}

.card-view {
    width: 100%;
}

.cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
}

.network-view {
    width: 100%;
    min-height: 500px;
}

.loading-state,
.empty-state {
    text-align: center;
    padding: 4rem 2rem;
}

.loading-icon,
.empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
}

.loading-state h3,
.empty-state h3 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-navy-900);
}

.empty-state p {
    margin: 0;
    color: #64748b;
    font-size: 0.9rem;
}

/* Modal Styles (reused from NetworkSearchPage) */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
    overflow-y: auto;
}

.modal-content {
    background: white;
    border-radius: 1rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid rgba(15, 23, 42, 0.1);
}

.modal-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
}

.modal-close {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: #64748b;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
}

.modal-close:hover {
    background: #f1f5f9;
    color: #1e293b;
}

.modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
}

.profile-header {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(15, 23, 42, 0.1);
}

.profile-avatar-large {
    flex-shrink: 0;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    overflow: hidden;
    background: #dbeafe;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 4px solid #e2e8f0;
}

.profile-avatar-large img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-placeholder-large {
    font-size: 2.5rem;
    font-weight: 600;
    color: #1e293b;
}

.profile-header-info {
    flex: 1;
    min-width: 0;
}

.profile-name {
    margin: 0 0 0.5rem;
    font-size: 1.75rem;
    font-weight: 700;
    color: #1e293b;
}

.profile-headline {
    margin: 0 0 1rem;
    font-size: 1rem;
    color: #64748b;
    font-weight: 500;
}

.profile-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    font-size: 0.875rem;
    color: #64748b;
}

.profile-meta-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.profile-meta-item i {
    font-size: 0.75rem;
}

.profile-details {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.detail-section {
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(15, 23, 42, 0.05);
}

.detail-section:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.detail-title {
    margin: 0 0 0.75rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.profile-summary {
    margin: 0;
    line-height: 1.6;
    color: #475569;
}
</style>

