<template>
    <div class="network-search-page">
        <!-- Header -->
        <div class="search-header">
            <div class="header-content">
                <div class="header-icon">🔍</div>
                <div>
                    <h1 class="header-title">Network Search</h1>
                    <p class="header-subtitle">
                        Search and filter your network connections
                    </p>
                </div>
            </div>
        </div>

        <!-- Search and Filter Section -->
        <div class="search-section">
            <div class="search-container">
                <!-- Search Bar with Autocomplete -->
                <div class="relative">
                    <input
                        type="text"
                        v-model="searchQuery"
                        @input="handleSearchInput"
                        @keydown="handleKeyDown"
                        @focus="showAutocompleteDropdown = true"
                        @blur="hideAutocomplete"
                        placeholder="Search by name or type a filter (e.g., 'linkedin', 'Google', 'Boston')..."
                        class="search-input"
                        autocomplete="off"
                    />

                    <!-- Autocomplete Dropdown -->
                    <div
                        v-if="
                            showAutocompleteDropdown &&
                            autocompleteSuggestions.length > 0
                        "
                        class="autocomplete-dropdown"
                    >
                        <div
                            v-for="(
                                suggestion, index
                            ) in autocompleteSuggestions"
                            :key="index"
                            :class="[
                                'autocomplete-item',
                                {
                                    selected:
                                        selectedAutocompleteIndex === index,
                                },
                            ]"
                            @mousedown="selectSuggestion(suggestion)"
                        >
                            <i
                                :class="[
                                    'fa-solid',
                                    suggestion.icon,
                                    'suggestion-icon',
                                ]"
                            ></i>
                            <span class="suggestion-label">{{
                                suggestion.label
                            }}</span>
                            <span
                                v-if="suggestion.type !== 'name'"
                                class="suggestion-hint"
                                >Press Enter</span
                            >
                        </div>
                    </div>
                </div>

                <!-- Active Filters and Results Count -->
                <div class="filters-section">
                    <div class="active-filters">
                        <div
                            v-for="(filter, index) in activeFilters"
                            :key="index"
                            class="filter-chip"
                        >
                            <span>{{ filter.label }}: {{ filter.value }}</span>
                            <button
                                @click="removeFilter(index)"
                                class="filter-remove"
                                aria-label="Remove filter"
                            >
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    </div>
                    <p class="results-count">
                        {{
                            hasActiveFilters
                                ? `Showing ${filteredResults.length} of ${totalNodes} connections`
                                : `${totalNodes} connections`
                        }}
                    </p>
                </div>
            </div>
        </div>

        <!-- Search Results -->
        <div class="results-section">
            <div v-if="allNodes.length === 0" class="empty-results">
                <div class="empty-icon">📡</div>
                <h3>Loading network data...</h3>
                <p>Please wait while we load your network connections.</p>
            </div>
            <div v-else-if="filteredResults.length > 0" class="results-grid">
                <div
                    v-for="node in filteredResults"
                    :key="node.id"
                    class="result-card"
                >
                    <div class="result-avatar">
                        <img
                            v-if="node.avatarUrl"
                            :src="node.avatarUrl"
                            :alt="node.displayName"
                            @error="handleImageError"
                        />
                        <div v-else class="avatar-placeholder">
                            {{ node.initials }}
                        </div>
                    </div>
                    <div class="result-info">
                        <h3 class="result-name">{{ node.displayName }}</h3>
                        <p
                            v-if="
                                node.username &&
                                node.username !== node.displayName
                            "
                            class="result-username"
                        >
                            {{ node.username }}
                        </p>
                        <div class="result-meta">
                            <span
                                v-if="node.sources.length > 0"
                                class="result-source"
                            >
                                <i class="fa-solid fa-link"></i>
                                {{ node.sources.join(", ") }}
                            </span>
                            <span
                                v-if="node.connections > 0"
                                class="result-connections"
                            >
                                <i class="fa-solid fa-users"></i>
                                {{ node.connections }} connection{{
                                    node.connections !== 1 ? "s" : ""
                                }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else class="empty-results">
                <div class="empty-icon">🔍</div>
                <h3>No results found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import {
    MultiSourceNetworkAPI,
    type AdjacencyMap,
    PublicProfileAPI,
    type PublicProfile,
    UserAuthenticationAPI,
    LinkedInImportAPI,
    type LinkedInConnection,
} from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAvatarStore } from "@/stores/useAvatarStore";

const auth = useAuthStore();
const avatarStore = useAvatarStore();

// State
const searchQuery = ref("");
const showAutocompleteDropdown = ref(false);
const selectedAutocompleteIndex = ref(-1);
const activeFilters = ref<
    Array<{ type: string; label: string; value: string }>
>([]);
const adjacency = ref<AdjacencyMap | null>(null);
const nodeProfiles = ref<
    Record<string, { profile?: any; avatarUrl: string; username?: string }>
>({});
const linkedInConnections = ref<Record<string, LinkedInConnection>>({});
const allNodes = ref<
    Array<{
        id: string;
        displayName: string;
        username?: string;
        avatarUrl: string;
        initials: string;
        sources: string[];
        connections: number;
    }>
>([]);

// Available filter options
const availablePlatforms = ["linkedin", "instagram", "handshake", "manual"];
const availableDegrees = ["1", "2", "3"];

// Extract unique companies and locations from all data
const availableCompanies = computed(() => {
    const companies = new Set<string>();
    // From LinkedIn connections
    Object.values(linkedInConnections.value).forEach((conn) => {
        if (conn.currentCompany) {
            companies.add(conn.currentCompany.toLowerCase());
        }
    });
    // From profiles
    Object.values(nodeProfiles.value).forEach((profile) => {
        if (profile.profile?.company) {
            companies.add(profile.profile.company.toLowerCase());
        }
    });
    return Array.from(companies).sort();
});

const availableLocations = computed(() => {
    const locations = new Set<string>();
    // From LinkedIn connections
    Object.values(linkedInConnections.value).forEach((conn) => {
        if (conn.location) {
            locations.add(conn.location.toLowerCase());
        }
    });
    // From profiles
    Object.values(nodeProfiles.value).forEach((profile) => {
        if (profile.profile?.location) {
            locations.add(profile.profile.location.toLowerCase());
        }
    });
    return Array.from(locations).sort();
});

// Computed
const autocompleteSuggestions = computed(() => {
    const query = searchQuery.value.toLowerCase().trim();
    if (!query) return [];

    const suggestions: Array<{
        type: string;
        label: string;
        value: string;
        icon: string;
    }> = [];

    // Check for explicit filter prefixes (platform:, company:, etc.)
    if (query.startsWith("platform:") || query.startsWith("source:")) {
        const value = query.split(":")[1] || "";
        availablePlatforms.forEach((platform) => {
            if (platform.startsWith(value)) {
                suggestions.push({
                    type: "platform",
                    label: `Filter by platform: ${platform}`,
                    value: platform,
                    icon: "fa-link",
                });
            }
        });
        return suggestions.slice(0, 8);
    }

    if (query.startsWith("degree:") || query.startsWith("degrees:")) {
        const value = query.split(":")[1] || "";
        availableDegrees.forEach((degree) => {
            if (degree.startsWith(value)) {
                suggestions.push({
                    type: "degree",
                    label: `Filter by degree: ${degree}`,
                    value: degree,
                    icon: "fa-sitemap",
                });
            }
        });
        return suggestions.slice(0, 8);
    }

    if (query.startsWith("company:") || query.startsWith("org:")) {
        const value = query.split(":")[1]?.toLowerCase() || "";
        availableCompanies.value.forEach((company) => {
            if (company.includes(value)) {
                suggestions.push({
                    type: "company",
                    label: `Filter by company: ${company}`,
                    value: company,
                    icon: "fa-building",
                });
            }
        });
        return suggestions.slice(0, 8);
    }

    if (query.startsWith("location:") || query.startsWith("loc:")) {
        const value = query.split(":")[1]?.toLowerCase() || "";
        availableLocations.value.forEach((location) => {
            if (location.includes(value)) {
                suggestions.push({
                    type: "location",
                    label: `Filter by location: ${location}`,
                    value: location,
                    icon: "fa-map-marker-alt",
                });
            }
        });
        return suggestions.slice(0, 8);
    }

    // Smart detection: Check if query matches a platform name
    const platformMatch = availablePlatforms.find(
        (p) => p.toLowerCase() === query || p.toLowerCase().includes(query)
    );
    if (platformMatch) {
        suggestions.push({
            type: "platform",
            label: `Filter by platform: ${platformMatch}`,
            value: platformMatch,
            icon: "fa-link",
        });
    }

    // Smart detection: Check if query matches a company
    const companyMatches = availableCompanies.value
        .filter((company) => company.includes(query) || query.includes(company))
        .slice(0, 3);
    companyMatches.forEach((company) => {
        suggestions.push({
            type: "company",
            label: `Filter by company: ${company}`,
            value: company,
            icon: "fa-building",
        });
    });

    // Smart detection: Check if query matches a location
    const locationMatches = availableLocations.value
        .filter(
            (location) => location.includes(query) || query.includes(location)
        )
        .slice(0, 3);
    locationMatches.forEach((location) => {
        suggestions.push({
            type: "location",
            label: `Filter by location: ${location}`,
            value: location,
            icon: "fa-map-marker-alt",
        });
    });

    // Name search - prioritize actual names
    allNodes.value.forEach((node) => {
        const searchText = node.displayName.toLowerCase();
        // Only suggest if it's not just an ID (has spaces or is longer than typical IDs)
        if (
            searchText.includes(query) &&
            (searchText.includes(" ") || searchText.length > 10)
        ) {
            suggestions.push({
                type: "name",
                label: node.displayName,
                value: node.displayName,
                icon: "fa-user",
            });
        }
    });

    return suggestions.slice(0, 8);
});

const hasActiveFilters = computed(
    () => activeFilters.value.length > 0 || searchQuery.value.length > 0
);

const totalNodes = computed(() => allNodes.value.length);

const filteredResults = computed(() => {
    let results = [...allNodes.value];

    // If no search query and no filters, show all nodes
    if (!searchQuery.value && activeFilters.value.length === 0) {
        return results;
    }

    // Apply name filter (only if it's not a filter prefix)
    // Prioritize searching by actual names, not IDs
    if (searchQuery.value && !searchQuery.value.includes(":")) {
        const query = searchQuery.value.toLowerCase().trim();
        if (query.length > 0) {
            results = results.filter((node) => {
                // First check display name (which should be the actual name)
                const nameMatch = node.displayName
                    .toLowerCase()
                    .includes(query);
                // Check username if different from display name
                const usernameMatch =
                    node.username &&
                    node.username !== node.displayName &&
                    node.username.toLowerCase().includes(query);
                // Only check ID as last resort (and only if query looks like an ID)
                const idMatch =
                    query.length > 5 && node.id.toLowerCase().includes(query);

                return nameMatch || usernameMatch || idMatch;
            });
        }
    }

    // Apply active filters
    activeFilters.value.forEach((filter) => {
        if (filter.type === "platform") {
            results = results.filter((node) =>
                node.sources.some(
                    (source) =>
                        source.toLowerCase() === filter.value.toLowerCase()
                )
            );
        } else if (filter.type === "degree") {
            // For now, degree filtering is simplified - would need path calculation
            // This is a placeholder for when the backend supports it
            const degree = parseInt(filter.value);
            // Filter logic would go here - for now, don't filter
        } else if (filter.type === "company") {
            results = results.filter((node) => {
                const profile = nodeProfiles.value[node.id];
                return profile?.profile?.company
                    ?.toLowerCase()
                    .includes(filter.value.toLowerCase());
            });
        } else if (filter.type === "location") {
            results = results.filter((node) => {
                const profile = nodeProfiles.value[node.id];
                return profile?.profile?.location
                    ?.toLowerCase()
                    .includes(filter.value.toLowerCase());
            });
        }
    });

    return results;
});

// Methods
function handleSearchInput() {
    if (searchQuery.value.length > 0) {
        showAutocompleteDropdown.value = true;
    } else {
        showAutocompleteDropdown.value = false;
    }
}

function handleKeyDown(event: KeyboardEvent) {
    const suggestions = autocompleteSuggestions.value;
    const query = searchQuery.value.toLowerCase().trim();

    if (event.key === "ArrowDown") {
        event.preventDefault();
        if (suggestions.length > 0) {
            selectedAutocompleteIndex.value = Math.min(
                selectedAutocompleteIndex.value + 1,
                suggestions.length - 1
            );
        }
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (suggestions.length > 0) {
            selectedAutocompleteIndex.value = Math.max(
                selectedAutocompleteIndex.value - 1,
                -1
            );
        }
    } else if (event.key === "Enter") {
        event.preventDefault();

        // If there's a selected suggestion, use it
        if (
            selectedAutocompleteIndex.value >= 0 &&
            suggestions[selectedAutocompleteIndex.value]
        ) {
            selectSuggestion(suggestions[selectedAutocompleteIndex.value]);
            return;
        }

        // If there are suggestions, prioritize filter suggestions
        if (suggestions.length > 0) {
            // First, try to find a filter suggestion (not name)
            const filterSuggestion = suggestions.find((s) => s.type !== "name");
            if (filterSuggestion) {
                selectSuggestion(filterSuggestion);
                return;
            }
            // Otherwise use the first suggestion
            selectSuggestion(suggestions[0]);
            return;
        }

        // If no suggestions but query looks like a filter category, try to add it
        if (query.length > 0) {
            // Check if it's a platform name
            const platformMatch = availablePlatforms.find(
                (p) =>
                    p.toLowerCase() === query || p.toLowerCase().includes(query)
            );
            if (platformMatch) {
                const filterLabels: Record<string, string> = {
                    platform: "Platform",
                    degree: "Degree",
                    company: "Company",
                    location: "Location",
                };
                activeFilters.value.push({
                    type: "platform",
                    label: filterLabels["platform"],
                    value: platformMatch,
                });
                searchQuery.value = "";
                showAutocompleteDropdown.value = false;
                return;
            }

            // Check if it's a company
            const companyMatch = availableCompanies.value.find(
                (c) =>
                    c.toLowerCase() === query ||
                    c.toLowerCase().includes(query) ||
                    query.includes(c)
            );
            if (companyMatch) {
                activeFilters.value.push({
                    type: "company",
                    label: "Company",
                    value: companyMatch,
                });
                searchQuery.value = "";
                showAutocompleteDropdown.value = false;
                return;
            }

            // Check if it's a location
            const locationMatch = availableLocations.value.find(
                (l) =>
                    l.toLowerCase() === query ||
                    l.toLowerCase().includes(query) ||
                    query.includes(l)
            );
            if (locationMatch) {
                activeFilters.value.push({
                    type: "location",
                    label: "Location",
                    value: locationMatch,
                });
                searchQuery.value = "";
                showAutocompleteDropdown.value = false;
                return;
            }
        }

        // If we get here, just perform the search (don't clear the query)
        showAutocompleteDropdown.value = false;
    } else if (event.key === "Escape") {
        showAutocompleteDropdown.value = false;
        selectedAutocompleteIndex.value = -1;
    }
}

function selectSuggestion(suggestion: {
    type: string;
    label: string;
    value: string;
}) {
    if (suggestion.type === "name") {
        // For names, just set the search query (don't add as filter)
        searchQuery.value = suggestion.value;
        showAutocompleteDropdown.value = false;
        selectedAutocompleteIndex.value = -1;
    } else {
        // Add as filter
        const filterLabels: Record<string, string> = {
            platform: "Platform",
            degree: "Degree",
            company: "Company",
            location: "Location",
        };

        // Check if filter already exists
        const existingFilter = activeFilters.value.find(
            (f) =>
                f.type === suggestion.type &&
                f.value.toLowerCase() === suggestion.value.toLowerCase()
        );

        if (!existingFilter) {
            activeFilters.value.push({
                type: suggestion.type,
                label: filterLabels[suggestion.type] || suggestion.type,
                value: suggestion.value,
            });
        }

        searchQuery.value = "";
        showAutocompleteDropdown.value = false;
        selectedAutocompleteIndex.value = -1;
    }
}

function removeFilter(index: number) {
    activeFilters.value.splice(index, 1);
}

function hideAutocomplete() {
    setTimeout(() => {
        showAutocompleteDropdown.value = false;
        selectedAutocompleteIndex.value = -1;
    }, 200);
}

function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = avatarStore.DEFAULT_AVATAR;
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
        if (nodeProfiles.value[nodeId]) return; // Already fetched

        let profile: PublicProfile | undefined;
        let username = nodeId;
        let avatarUrl = avatarStore.DEFAULT_AVATAR;

        // Try to fetch username from UserAuthentication API
        try {
            const userResult = await UserAuthenticationAPI.getUserById({
                id: nodeId,
            });
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
        // Get user's LinkedIn account
        const accounts = await LinkedInImportAPI.getLinkedInAccount({
            user: auth.userId,
        });
        if (accounts.length === 0) {
            console.log("[NetworkSearch] No LinkedIn account found");
            return;
        }

        // Fetch all connections for the first account (users typically have one)
        const accountId = accounts[0]._id;
        const connections = await LinkedInImportAPI.getConnections({
            account: accountId,
        });

        console.log(
            "[NetworkSearch] Loaded",
            connections.length,
            "LinkedIn connections"
        );

        // Index connections by their _id (which is the Connection ID used in the network)
        connections.forEach((conn) => {
            linkedInConnections.value[conn._id] = conn;
        });
    } catch (error) {
        console.error(
            "[NetworkSearch] Error loading LinkedIn connections:",
            error
        );
    }
}

async function loadNetworkData() {
    if (!auth.userId) {
        console.log("[NetworkSearch] No userId, cannot load network data");
        return;
    }

    try {
        console.log(
            "[NetworkSearch] Loading network data for user:",
            auth.userId
        );

        // Load LinkedIn connections first (in parallel with network data)
        await Promise.all([
            loadLinkedInConnections(),
            MultiSourceNetworkAPI.getAdjacencyArray({
                owner: auth.userId,
            }).then((data) => {
                adjacency.value = data;
                return data;
            }),
        ]);

        const data = adjacency.value;
        if (!data) {
            console.warn("[NetworkSearch] No adjacency data received");
            allNodes.value = [];
            return;
        }

        console.log("[NetworkSearch] Received adjacency data:", data);
        console.log(
            "[NetworkSearch] Number of nodes:",
            Object.keys(data).length
        );

        // Collect all node IDs
        const allNodeIds = new Set<string>(Object.keys(data));
        for (const nodeId of Object.keys(data)) {
            const edges = data[nodeId] || [];
            for (const edge of edges) {
                allNodeIds.add(edge.to);
            }
        }

        console.log("[NetworkSearch] Total unique node IDs:", allNodeIds.size);

        if (allNodeIds.size === 0) {
            console.warn("[NetworkSearch] No nodes found in network");
            allNodes.value = [];
            return;
        }

        // Fetch profiles for all nodes
        console.log(
            "[NetworkSearch] Fetching profiles for",
            allNodeIds.size,
            "nodes"
        );
        // First, fetch canonical node documents (if available) from MultiSourceNetwork
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
                        // keep other fields available to template consumers
                        ...nd,
                    },
                    avatarUrl:
                        (nd.avatarUrl as string) || avatarStore.DEFAULT_AVATAR,
                    username: (nd.label as string) || id,
                };
            });
        } catch (e) {
            console.warn("[NetworkSearch] getNodes failed:", e);
        }

        // Then fetch profiles/usernames for any nodes not already resolved
        await fetchNodeProfiles(Array.from(allNodeIds));

        // Build nodes array with proper names
        const nodes: Array<{
            id: string;
            displayName: string;
            username?: string;
            avatarUrl: string;
            initials: string;
            sources: string[];
            connections: number;
        }> = [];

        for (const nodeId of allNodeIds) {
            // Check if this is a LinkedIn connection first
            const linkedInConn = linkedInConnections.value[nodeId];

            let displayName: string;
            let avatarUrl: string;

            if (linkedInConn) {
                // Use LinkedIn connection data - prioritize firstName + lastName
                const firstName = linkedInConn.firstName || "";
                const lastName = linkedInConn.lastName || "";
                const fullName = `${firstName} ${lastName}`.trim();

                displayName = fullName || linkedInConn.headline || nodeId;
                avatarUrl =
                    linkedInConn.profilePictureUrl ||
                    avatarStore.DEFAULT_AVATAR;

                // Store in nodeProfiles for company/location filtering
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
                // Use profile data or fallback. Prefer firstName + lastName when available,
                // then headline, then username, then node id.
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
            }

            const connections = (data[nodeId] || []).length;

            // Extract sources from edges
            const sources = new Set<string>();
            if (data[nodeId]) {
                data[nodeId].forEach((edge) => {
                    if (edge.source) sources.add(edge.source);
                });
            }
            // Also check incoming edges
            for (const fromId of Object.keys(data)) {
                data[fromId].forEach((edge) => {
                    if (edge.to === nodeId && edge.source) {
                        sources.add(edge.source);
                    }
                });
            }

            // Also include membership-declared sources (e.g., when a node was created with sourceIds
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
                sources: Array.from(sources),
                connections,
            });
        }

        console.log("[NetworkSearch] Built", nodes.length, "nodes");
        console.log(
            "[NetworkSearch] Sample nodes:",
            nodes.slice(0, 5).map((n) => ({ id: n.id, name: n.displayName }))
        );
        allNodes.value = nodes;
    } catch (error) {
        console.error("[NetworkSearch] Error loading network data:", error);
        allNodes.value = [];
    }
}

onMounted(() => {
    loadNetworkData();
});
</script>

<style scoped>
.network-search-page {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

/* Header */
.search-header {
    margin-bottom: 2rem;
}

.header-content {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    padding: 1rem 1.25rem;
    border-radius: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.header-icon {
    font-size: 1.5rem;
    color: var(--color-navy-600);
}

.header-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: 0.025em;
    color: var(--color-navy-900);
}

.header-subtitle {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    color: #475569;
}

/* Search Section */
.search-section {
    margin-bottom: 2rem;
}

.search-container {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(15, 23, 42, 0.08);
}

.search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
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

/* Autocomplete */
.autocomplete-dropdown {
    position: absolute;
    z-index: 20;
    width: 100%;
    margin-top: 0.375rem;
    background: white;
    border: 1px solid rgba(15, 23, 42, 0.2);
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-height: 16rem;
    overflow-y: auto;
}

.autocomplete-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    transition: background 0.2s ease;
    font-size: 0.875rem;
}

.autocomplete-item:hover,
.autocomplete-item.selected {
    background: #f1f5f9;
}

.suggestion-icon {
    width: 0.875rem;
    color: #94a3b8;
    font-size: 0.75rem;
}

.suggestion-label {
    flex: 1;
    color: #1e293b;
}

.suggestion-hint {
    font-size: 0.75rem;
    color: #94a3b8;
}

/* Filters Section */
.filters-section {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1rem;
}

.active-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    background: #f1f5f9;
    color: #1e293b;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
}

.filter-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.125rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: #64748b;
    transition: all 0.2s ease;
    border-radius: 0.25rem;
}

.filter-remove:hover {
    background: #cbd5e1;
    color: #1e293b;
}

.filter-remove i {
    font-size: 0.625rem;
}

.results-count {
    margin-left: auto;
    font-size: 0.75rem;
    color: #64748b;
}

/* Results Section */
.results-section {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(15, 23, 42, 0.08);
}

.results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
}

.result-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 0.75rem;
    transition: all 0.2s ease;
}

.result-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
}

.result-avatar {
    flex-shrink: 0;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    overflow: hidden;
    background: #dbeafe;
    display: flex;
    align-items: center;
    justify-content: center;
}

.result-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-placeholder {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
}

.result-info {
    flex: 1;
    min-width: 0;
}

.result-name {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
}

.result-username {
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
    color: #64748b;
}

.result-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #64748b;
}

.result-source,
.result-connections {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.result-source i,
.result-connections i {
    font-size: 0.625rem;
}

.empty-results {
    text-align: center;
    padding: 4rem 2rem;
}

.empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
}

.empty-results h3 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-navy-900);
}

.empty-results p {
    margin: 0;
    color: #64748b;
    font-size: 0.9rem;
}
</style>
