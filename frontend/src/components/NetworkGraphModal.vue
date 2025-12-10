<template>
    <div
        v-if="isOpen"
        class="network-modal-overlay"
        @click.self="handleOverlayClick"
    >
        <div
            class="network-modal"
        >
            <div class="network-modal-header">
                <h2 class="network-modal-title">Network Graph</h2>
                <div class="network-modal-actions">
                    <button
                        @click="close"
                        class="network-modal-close-btn"
                        title="Close"
                    >
                        <p class="fa-solid fa-times">x</p>
                    </button>
                </div>
            </div>
            <div class="network-modal-body">
                <div v-if="loading" class="network-loading">
                    <div class="loading-icon">📡</div>
                    <h3>Loading network...</h3>
                </div>
                <div v-else-if="error" class="network-error">
                    <div class="error-icon">⚠️</div>
                    <h3>Error loading network</h3>
                    <p>{{ error }}</p>
                </div>
                <NetworkDisplayVis
                    v-else-if="adjacency"
                    :adjacency="adjacency"
                    :nodeProfiles="nodeProfiles"
                    :rootNodeId="auth.userId"
                    :currentUserId="auth.userId"
                    @nodeSelected="handleNodeSelected"
                    @edgeCreated="handleEdgeCreated"
                />
                <div v-else class="network-empty">
                    <div class="empty-icon">🔗</div>
                    <h3>No Network Data</h3>
                    <p>Create a network and add connections to see the visualization.</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { MultiSourceNetworkAPI, type AdjacencyMap, LinkedInImportAPI, type LinkedInConnection } from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { PublicProfileAPI, type PublicProfile } from "@/services/conceptClient";
import { UserAuthenticationAPI } from "@/services/conceptClient";
import NetworkDisplayVis from "./NetworkDisplayVis.vue";
import { useAvatarStore } from "@/stores/useAvatarStore";

const props = defineProps<{
    isOpen: boolean;
}>();

const emit = defineEmits<{
    close: [];
    nodeSelected: [nodeId: string];
}>();

const auth = useAuthStore();
const avatarStore = useAvatarStore();
const loading = ref(false);
const error = ref<string | null>(null);
const adjacency = ref<AdjacencyMap | null>(null);
const nodeProfiles = ref<
    Record<string, { profile?: any; avatarUrl: string; username?: string }>
>({});
const linkedInConnections = ref<Record<string, LinkedInConnection>>({});

// Watch for modal open to load data
watch(() => props.isOpen, (newValue) => {
    if (newValue) {
        // Always reload data to get fresh data, especially for owner profile
        loadNetworkData();
    }
});

// Listen for profile picture updates to refresh owner's profile
function handleProfilePictureUpdate() {
    if (auth.userId && adjacency.value) {
        // Force refresh owner's profile
        fetchNodeProfiles([auth.userId], [auth.userId]);
    }
}

onMounted(() => {
    window.addEventListener("profilePictureUpdated", handleProfilePictureUpdate as EventListener);
});

onBeforeUnmount(() => {
    window.removeEventListener("profilePictureUpdated", handleProfilePictureUpdate as EventListener);
});

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
    if (!auth.userId) return;

    loading.value = true;
    error.value = null;

    try {
        // Load LinkedIn connections and adjacency data in parallel
        await Promise.all([
            loadLinkedInConnections(),
            MultiSourceNetworkAPI.getAdjacencyArray({
                owner: auth.userId,
            }).then((data) => {
                if (!data) {
                    adjacency.value = null;
                    return;
                }

                if (typeof data === "object" && "adjacency" in data) {
                    adjacency.value = { ...((data as any).adjacency || {}) };
                } else {
                    adjacency.value = { ...(data as any) };
                }
            }),
        ]);

        if (!adjacency.value) {
            loading.value = false;
            return;
        }

        // Load node profiles
        const allNodeIds = new Set<string>(Object.keys(adjacency.value));
        for (const nodeId of Object.keys(adjacency.value)) {
            const edges = adjacency.value[nodeId] || [];
            for (const edge of edges) {
                allNodeIds.add(edge.to);
            }
        }

        if (allNodeIds.size > 0) {
            // Load node documents first to get labels/names
            try {
                const nodeDocs = await MultiSourceNetworkAPI.getNodes({
                    ids: Array.from(allNodeIds),
                    owner: auth.userId,
                });
                (nodeDocs || []).forEach((nd: Record<string, any>) => {
                    const id = nd._id as string;
                    if (!id) return;
                    const firstName = nd.firstName || "";
                    const lastName = nd.lastName || "";
                    const fullName = `${firstName} ${lastName}`.trim();
                    const label = nd.label || fullName || id;

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
                            (nd.avatarUrl as string) ||
                            avatarStore.getLetterAvatar(label),
                        username: label,
                    };
                });
            } catch (e) {
                console.warn("getNodes failed:", e);
            }

            // Always force refresh for current user to get latest profile picture
            await fetchNodeProfiles(
                Array.from(allNodeIds),
                auth.userId ? [auth.userId] : []
            );
        }
    } catch (err) {
        console.error("Error loading network data:", err);
        error.value = err instanceof Error ? err.message : "Failed to load network data";
    } finally {
        loading.value = false;
    }
}

async function fetchNodeProfiles(nodeIds: string[], forceRefresh: string[] = []) {
    const profilePromises = nodeIds.map(async (nodeId) => {
        // Skip if already cached, unless we're forcing a refresh for this node
        if (nodeProfiles.value[nodeId] && !forceRefresh.includes(nodeId)) {
            // Still update if it's the owner and we need to refresh
            if (nodeId === auth.userId && forceRefresh.includes(nodeId)) {
                // Continue to refresh
            } else if (nodeProfiles.value[nodeId].profile) {
                return;
            }
        }

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
                // Get display name: prefer firstName + lastName, then headline, then username
                let displayName = username;
                const firstName = (profile as any).firstName || "";
                const lastName = (profile as any).lastName || "";
                if (firstName || lastName) {
                    displayName = `${firstName} ${lastName}`.trim();
                } else if ((profile as any).headline) {
                    displayName = (profile as any).headline;
                }

                // For root node (current user), prioritize profile picture from PublicProfile
                if (nodeId === auth.userId) {
                    const publicProfile = profile as PublicProfile | undefined;
                    if (publicProfile?.profilePictureUrl) {
                        avatarUrl = publicProfile.profilePictureUrl;
                        avatarStore.setForUser(nodeId, avatarUrl);
                    } else {
                        // Use existing avatarUrl if set, otherwise get from store
                        const existing = nodeProfiles.value[nodeId];
                        avatarUrl = existing?.avatarUrl || avatarStore.getForUser(nodeId);
                    }
                } else {
                    if (profile.profilePictureUrl) {
                        avatarUrl = profile.profilePictureUrl;
                        avatarStore.setForUser(nodeId, avatarUrl);
                    } else {
                        // Use existing avatarUrl if set, otherwise get from store
                        const existing = nodeProfiles.value[nodeId];
                        avatarUrl = existing?.avatarUrl || avatarStore.getForUser(nodeId);
                    }
                }

                // Merge with existing profile data if any
                const existing = nodeProfiles.value[nodeId];
                nodeProfiles.value[nodeId] = {
                    profile: { ...existing?.profile, ...profile },
                    avatarUrl,
                    username: displayName,
                };
            } else {
                // Check LinkedIn connections for name
                const linkedInConn = linkedInConnections.value[nodeId];
                const existing = nodeProfiles.value[nodeId];

                if (linkedInConn) {
                    const firstName = linkedInConn.firstName || "";
                    const lastName = linkedInConn.lastName || "";
                    const fullName = `${firstName} ${lastName}`.trim();
                    username = fullName || linkedInConn.headline || nodeId;
                } else if (existing?.username) {
                    username = existing.username;
                }

                avatarUrl = existing?.avatarUrl || avatarStore.getForUser(nodeId);
                nodeProfiles.value[nodeId] = {
                    ...existing,
                    avatarUrl,
                    username,
                };
            }
        } catch {
            // Check LinkedIn connections for name
            const linkedInConn = linkedInConnections.value[nodeId];
            const existing = nodeProfiles.value[nodeId];

            if (linkedInConn) {
                const firstName = linkedInConn.firstName || "";
                const lastName = linkedInConn.lastName || "";
                const fullName = `${firstName} ${lastName}`.trim();
                username = fullName || linkedInConn.headline || nodeId;
            } else if (existing?.username) {
                username = existing.username;
            }

            avatarUrl = existing?.avatarUrl || avatarStore.getForUser(nodeId);
            nodeProfiles.value[nodeId] = {
                ...existing,
                avatarUrl,
                username,
            };
        }
    });

    await Promise.all(profilePromises);
}

function close() {
    emit("close");
}

function handleOverlayClick() {
    close();
}

function handleNodeSelected(nodeId: string) {
    emit("nodeSelected", nodeId);
    // Close modal when node is selected to show profile
    close();
}

function handleEdgeCreated() {
    // Reload network data to reflect the new edge
    loadNetworkData();
}
</script>

<style scoped>
.network-modal-overlay {
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
}

.network-modal {
    background: white;
    border-radius: 1rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    width: 90vw;
    height: 85vh;
    max-width: 1400px;
    max-height: 900px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.3s ease;
}

.network-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid rgba(15, 23, 42, 0.1);
    flex-shrink: 0;
}

.network-modal-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
}

.network-modal-actions {
    display: flex;
    gap: 0.5rem;
}

.network-modal-close-btn {
    background: rgb(255, 42, 42);
    border: 2px solid rgba(15, 23, 42, 0.2);
    border-radius: 0.5rem;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #1e293b;
    font-size: 1.25rem;
    font-weight: 600;
}

.network-modal-close-btn:hover {
    background: #e2e8f0;
    border-color: rgba(15, 23, 42, 0.4);
    color: #0f172a;
    transform: scale(1.1);
}

.network-modal-body {
    flex: 1;
    overflow: hidden;
    position: relative;
}

.network-loading,
.network-error,
.network-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 2rem;
}

.loading-icon,
.error-icon,
.empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
}

.network-loading h3,
.network-error h3,
.network-empty h3 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-navy-900);
}

.network-error p {
    margin: 0;
    color: #dc2626;
    font-size: 0.9rem;
}

.network-empty p {
    margin: 0;
    color: #64748b;
    font-size: 0.9rem;
}
</style>
