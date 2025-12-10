<template>
    <div class="export-page">
        <div class="page-header">
            <h1 class="page-title">Export Network</h1>
            <p class="page-subtitle">
                Export your network data in CSV format for backup or use in
                other applications.
            </p>
        </div>

        <div class="export-card">
            <div class="export-content">
                <div class="export-icon">📥</div>
                <h2>Export All Connections</h2>
                <p class="export-description">
                    Download a CSV file containing all your network connections
                    with complete information including names, locations,
                    companies, job titles, and more.
                </p>

                <div v-if="loading" class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Loading connection data...</p>
                </div>

                <div v-else class="export-info">
                    <div class="info-item">
                        <strong>Total Connections:</strong>
                        <span>{{ totalConnections }}</span>
                    </div>
                    <div class="info-item">
                        <strong>Ready to Export:</strong>
                        <span>{{
                            totalConnections > 0
                                ? "Yes"
                                : "No connections found"
                        }}</span>
                    </div>
                </div>

                <button
                    @click="handleExportCSV"
                    class="export-btn"
                    :disabled="loading || totalConnections === 0"
                >
                    <i class="fa-solid fa-download"></i>
                    {{ loading ? "Loading..." : "Download CSV" }}
                </button>

                <div v-if="error" class="error-banner">
                    <i class="fa-solid fa-exclamation-circle"></i>
                    <span>{{ error }}</span>
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
    UserAuthenticationAPI,
    LinkedInImportAPI,
    type LinkedInConnection,
} from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAvatarStore } from "@/stores/useAvatarStore";

const auth = useAuthStore();
const avatarStore = useAvatarStore();

const loading = ref(true);
const error = ref<string | null>(null);
const adjacency = ref<AdjacencyMap | null>(null);
const nodeProfiles = ref<
    Record<string, { profile?: any; avatarUrl: string; username?: string }>
>({});
const linkedInConnections = ref<Record<string, LinkedInConnection>>({});
const nodeData = ref<Record<string, any>>({});

const totalConnections = computed(() => {
    if (!adjacency.value) return 0;
    const allNodeIds = new Set<string>(Object.keys(adjacency.value));
    for (const nodeId of Object.keys(adjacency.value)) {
        const edges = adjacency.value[nodeId] || [];
        for (const edge of edges) {
            allNodeIds.add(edge.to);
        }
    }
    // Exclude the current user
    if (auth.userId) {
        allNodeIds.delete(auth.userId);
    }
    return allNodeIds.size;
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
    if (!auth.userId) {
        loading.value = false;
        return;
    }

    try {
        loading.value = true;
        error.value = null;

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

        // Exclude the current user
        allNodeIds.delete(auth.userId);

        if (allNodeIds.size === 0) {
            loading.value = false;
            return;
        }

        // Load node data
        try {
            const nodeDocs = await MultiSourceNetworkAPI.getNodes({
                ids: Array.from(allNodeIds),
                owner: auth.userId,
            });
            (nodeDocs || []).forEach((nd: Record<string, any>) => {
                const id = nd._id as string;
                if (!id) return;
                nodeData.value[id] = nd;
            });
        } catch (e) {
            console.warn("getNodes failed:", e);
        }

        // Load profiles
        await fetchNodeProfiles(Array.from(allNodeIds));
    } catch (err) {
        console.error("Error loading network data:", err);
        error.value = "Failed to load network data. Please try again.";
    } finally {
        loading.value = false;
    }
}

async function fetchNodeProfiles(nodeIds: string[]) {
    const profilePromises = nodeIds.map(async (nodeId) => {
        if (nodeProfiles.value[nodeId]) return;

        let profile: any;
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
                if ((profile as any).profilePictureUrl) {
                    avatarUrl = (profile as any).profilePictureUrl;
                    avatarStore.setForUser(nodeId, avatarUrl);
                } else {
                    avatarUrl = avatarStore.getForUser(nodeId);
                }

                nodeProfiles.value[nodeId] = {
                    profile,
                    avatarUrl,
                    username: profile.headline || username,
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

function escapeCSV(value: any): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    // If contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function arrayToCSV(array: any[]): string {
    if (array.length === 0) return "";
    return array.map((item) => escapeCSV(item)).join("; ");
}

function handleExportCSV() {
    if (!adjacency.value || totalConnections.value === 0) {
        error.value = "No connections to export.";
        return;
    }

    try {
        const data = adjacency.value;
        const allNodeIds = new Set<string>(Object.keys(data));
        for (const nodeId of Object.keys(data)) {
            const edges = data[nodeId] || [];
            for (const edge of edges) {
                allNodeIds.add(edge.to);
            }
        }
        if (auth.userId) {
            allNodeIds.delete(auth.userId);
        }

        // Collect all connection data
        const rows: any[] = [];

        for (const nodeId of allNodeIds) {
            const linkedInConn = linkedInConnections.value[nodeId];
            const nodeInfo = nodeData.value[nodeId] || {};
            const profileData = nodeProfiles.value[nodeId] || {
                avatarUrl: avatarStore.DEFAULT_AVATAR,
                username: nodeId,
            };
            const profile = profileData.profile || {};

            // Get sources
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

            // Build row data - prioritize LinkedIn data, then node data, then profile data
            const row: Record<string, any> = {
                "Node ID": nodeId,
                "First Name":
                    linkedInConn?.firstName ||
                    nodeInfo.firstName ||
                    profile.firstName ||
                    "",
                "Last Name":
                    linkedInConn?.lastName ||
                    nodeInfo.lastName ||
                    profile.lastName ||
                    "",
                "Display Name": linkedInConn
                    ? `${linkedInConn.firstName || ""} ${
                          linkedInConn.lastName || ""
                      }`.trim() ||
                      linkedInConn.headline ||
                      nodeId
                    : nodeInfo.label ||
                      `${nodeInfo.firstName || ""} ${
                          nodeInfo.lastName || ""
                      }`.trim() ||
                      profile.headline ||
                      profileData.username ||
                      nodeId,
                Headline:
                    linkedInConn?.headline ||
                    nodeInfo.headline ||
                    profile.headline ||
                    "",
                Location:
                    linkedInConn?.location ||
                    nodeInfo.location ||
                    profile.location ||
                    "",
                Company:
                    linkedInConn?.currentCompany ||
                    nodeInfo.currentCompany ||
                    nodeInfo.company ||
                    profile.company ||
                    "",
                "Job Title":
                    linkedInConn?.currentPosition ||
                    nodeInfo.currentPosition ||
                    profile.currentPosition ||
                    "",
                Industry:
                    linkedInConn?.industry ||
                    nodeInfo.industry ||
                    profile.industry ||
                    "",
                "Profile URL":
                    linkedInConn?.profileUrl ||
                    nodeInfo.profileUrl ||
                    profile.profileUrl ||
                    "",
                "Avatar URL":
                    linkedInConn?.profilePictureUrl ||
                    nodeInfo.avatarUrl ||
                    nodeInfo.profilePictureUrl ||
                    profileData.avatarUrl ||
                    "",
                Summary:
                    linkedInConn?.summary ||
                    nodeInfo.summary ||
                    profile.summary ||
                    "",
                Skills: arrayToCSV(
                    linkedInConn?.skills ||
                        nodeInfo.skills ||
                        profile.skills ||
                        []
                ),
                Education: linkedInConn?.education
                    ? JSON.stringify(linkedInConn.education)
                    : nodeInfo.education
                    ? JSON.stringify(nodeInfo.education)
                    : profile.education
                    ? JSON.stringify(profile.education)
                    : "",
                Experience: linkedInConn?.experience
                    ? JSON.stringify(linkedInConn.experience)
                    : nodeInfo.experience
                    ? JSON.stringify(nodeInfo.experience)
                    : profile.experience
                    ? JSON.stringify(profile.experience)
                    : "",
                Tags: arrayToCSV(nodeInfo.tags || profile.tags || []),
                Sources: arrayToCSV(Array.from(sources)),
                "LinkedIn Connection ID":
                    linkedInConn?.linkedInConnectionId || "",
                "Imported At": linkedInConn?.importedAt || "",
            };

            rows.push(row);
        }

        // Create CSV content
        const headers = Object.keys(rows[0]);
        const csvRows = [
            headers.map(escapeCSV).join(","),
            ...rows.map((row) =>
                headers.map((header) => escapeCSV(row[header])).join(",")
            ),
        ];

        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute(
            "download",
            `network-export-${new Date().toISOString().split("T")[0]}.csv`
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Error exporting CSV:", err);
        error.value = "Failed to export CSV. Please try again.";
    }
}

onMounted(() => {
    loadNetworkData();
});
</script>

<style scoped>
.export-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

.page-header {
    text-align: center;
    margin-bottom: 3rem;
}

.page-title {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 1rem;
    color: var(--color-navy-900);
}

.page-subtitle {
    font-size: 1.125rem;
    color: #64748b;
    margin: 0;
}

.export-card {
    background: white;
    border-radius: 1rem;
    padding: 3rem 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(15, 23, 42, 0.08);
    max-width: 700px;
    margin: 0 auto;
}

.export-content {
    text-align: center;
}

.export-icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
}

.export-content h2 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 1rem;
    color: var(--color-navy-900);
}

.export-description {
    font-size: 1rem;
    color: #475569;
    margin: 0 0 2rem;
    line-height: 1.6;
}

.loading-state {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e2e8f0;
    border-top-color: var(--color-navy-600);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.loading-state p {
    margin: 0;
    color: #64748b;
    font-size: 0.9rem;
}

.export-info {
    background: #f8fafc;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin: 2rem 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.info-item:last-child {
    border-bottom: none;
}

.info-item strong {
    color: var(--color-navy-900);
    font-weight: 600;
}

.info-item span {
    color: #64748b;
    font-weight: 500;
}

.export-btn {
    padding: 1rem 2rem;
    background: #003b6d;
    color: white;
    border: none;
    border-radius: 0.75rem;
    font-size: 1.125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1rem;
}

.export-btn:hover:not(:disabled) {
    /* hover: light blue background with dark text */
    background: #e6f4ff;
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(65, 90, 119, 0.12);
    color: #003b6d;
}

.export-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.error-banner {
    margin-top: 1.5rem;
    padding: 0.75rem 1rem;
    background: #fee2e2;
    color: #dc2626;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    text-align: left;
}

.error-banner i {
    flex-shrink: 0;
}
</style>
