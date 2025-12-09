<template>
    <div class="home-page">
        <!-- Search Section -->
        <div class="search-section">
            <div class="search-container">
                <div class="search-input-wrapper">
                    <input
                        type="text"
                        v-model="searchQuery"
                        @input="handleSearchInput"
                        @keydown="handleKeyDown"
                        @focus="showAutocompleteDropdown = true"
                        @blur="hideAutocomplete"
                        :placeholder="searchMode === 'semantic' ? 'Describe what you\'re looking for...' : 'Who are you looking for?...'"
                        class="search-input"
                        :class="{ 'semantic-mode': searchMode === 'semantic' }"
                    />
                    <i
                        v-if="searchMode === 'semantic'"
                        class="fa-solid fa-sparkles search-mode-icon"
                    ></i>
                    <!-- Autocomplete Dropdown -->
                    <div
                        v-if="
                            searchMode === 'text' &&
                            showAutocompleteDropdown &&
                            autocompleteSuggestions.length > 0
                        "
                        class="autocomplete-dropdown"
                    >
                        <div
                            v-for="(suggestion, index) in autocompleteSuggestions"
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
                <button
                    @click="toggleSearchMode"
                    class="smart-search-btn"
                    :class="{ active: searchMode === 'semantic' }"
                    :disabled="semanticLoading"
                    title="Toggle Smart Search"
                >
                    <i class="fa-solid fa-sparkles"></i>
                    <span>Smart Search</span>
                </button>
                <button
                    @click="toggleView"
                    class="view-toggle-btn"
                    :class="{ active: viewMode === 'network' }"
                >
                    {{ viewMode === 'card' ? 'Network View' : 'Card View' }}
                </button>
            </div>

            <!-- Active Filters and Search Mode Indicator -->
            <div class="search-meta">
                <div class="active-filters" v-if="activeFilters.length > 0">
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
                <div class="search-mode-indicator" v-if="searchMode === 'semantic'">
                    <i class="fa-solid fa-sparkles"></i>
                    <span>Smart Search Active</span>
                </div>
                <p class="results-count" v-if="!loading">
                    {{
                        searchMode === 'semantic'
                            ? `Showing ${displayedNodes.length} semantic result${displayedNodes.length !== 1 ? 's' : ''}`
                            : hasActiveFilters || searchQuery.trim()
                            ? `Showing ${displayedNodes.length} of ${allNodes.length} connections`
                            : `${allNodes.length} connections`
                    }}
                </p>
            </div>
        </div>

        <!-- Content Area -->
        <div class="content-area">
            <!-- Card View -->
            <div v-if="viewMode === 'card'" class="card-view">
                <div v-if="loading || semanticLoading" class="loading-state">
                    <div class="loading-icon">📡</div>
                    <h3>
                        {{
                            semanticLoading
                                ? "Searching with AI..."
                                : "Loading connections..."
                        }}
                    </h3>
                </div>
                <div
                    v-else-if="displayedNodes.length === 0"
                    class="empty-state"
                >
                    <div class="empty-icon">🔍</div>
                    <h3>No connections found</h3>
                    <p>
                        {{
                            searchMode === 'semantic'
                                ? "Try a different search query or switch to text search"
                                : "Try adjusting your search or add connections in Edit Network"
                        }}
                    </p>
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
                <NetworkDisplayVis
                    v-if="adjacency"
                    :adjacency="adjacency"
                    :nodeProfiles="nodeProfiles"
                    :rootNodeId="auth.userId"
                    :currentUserId="auth.userId"
                    @nodeSelected="openProfileModal"
                />
                <div v-else class="loading-state">
                    <div class="loading-icon">📡</div>
                    <h3>Loading network...</h3>
                </div>
            </div>
        </div>

        <!-- Profile Modal -->
        <div
            v-if="selectedProfileId"
            class="modal-overlay"
            @click.self="closeProfileModal"
        >
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">Connection Profile</h2>
                    <div class="modal-header-actions">
                        <button
                            v-if="!isEditingProfile"
                            class="btn-edit-profile"
                            @click="startEditProfile"
                        >
                            <i class="fa-solid fa-pencil"></i>
                            Edit
                        </button>
                        <button
                            class="modal-close"
                            @click="closeProfileModal"
                            aria-label="Close"
                        >
                            ×
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div v-if="selectedProfileData && !isEditingProfile" class="profile-view">
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
                            <!-- Current Position/Job Title -->
                            <div
                                v-if="selectedProfileData.currentPosition"
                                class="detail-section"
                            >
                                <h3 class="detail-title">
                                    <i class="fa-solid fa-briefcase"></i>
                                    Current Position
                                </h3>
                                <p>{{ selectedProfileData.currentPosition }}</p>
                            </div>

                            <!-- Company -->
                            <div
                                v-if="selectedProfileData.currentCompany"
                                class="detail-section"
                            >
                                <h3 class="detail-title">
                                    <i class="fa-solid fa-building"></i>
                                    Company
                                </h3>
                                <p>{{ selectedProfileData.currentCompany }}</p>
                            </div>

                            <!-- Industry -->
                            <div
                                v-if="selectedProfileData.industry"
                                class="detail-section"
                            >
                                <h3 class="detail-title">
                                    <i class="fa-solid fa-industry"></i>
                                    Industry
                                </h3>
                                <p>{{ selectedProfileData.industry }}</p>
                            </div>

                            <!-- Summary -->
                            <div
                                v-if="selectedProfileData.summary"
                                class="detail-section"
                            >
                                <h3 class="detail-title">
                                    <i class="fa-solid fa-file-text"></i>
                                    Summary
                                </h3>
                                <p class="profile-summary">
                                    {{ selectedProfileData.summary }}
                                </p>
                            </div>

                            <!-- Skills -->
                            <div
                                v-if="selectedProfileData.skills && selectedProfileData.skills.length > 0"
                                class="detail-section"
                            >
                                <h3 class="detail-title">
                                    <i class="fa-solid fa-star"></i>
                                    Skills
                                </h3>
                                <div class="skills-list">
                                    <span
                                        v-for="skill in selectedProfileData.skills"
                                        :key="skill"
                                        class="skill-tag"
                                    >
                                        {{ skill }}
                                    </span>
                                </div>
                            </div>

                            <!-- Education -->
                            <div
                                v-if="selectedProfileData.education && selectedProfileData.education.length > 0"
                                class="detail-section"
                            >
                                <h3 class="detail-title">
                                    <i class="fa-solid fa-graduation-cap"></i>
                                    Education
                                </h3>
                                <div class="education-list">
                                    <div
                                        v-for="(edu, index) in selectedProfileData.education"
                                        :key="index"
                                        class="education-item"
                                    >
                                        <p class="education-school">
                                            <strong>{{ edu.school || "School" }}</strong>
                                        </p>
                                        <p v-if="edu.degree || edu.fieldOfStudy" class="education-degree">
                                            {{ [edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ") }}
                                        </p>
                                        <p v-if="edu.startYear || edu.endYear" class="education-years">
                                            {{ edu.startYear || "?" }} - {{ edu.endYear || "Present" }}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Experience -->
                            <div
                                v-if="selectedProfileData.experience && selectedProfileData.experience.length > 0"
                                class="detail-section"
                            >
                                <h3 class="detail-title">
                                    <i class="fa-solid fa-briefcase"></i>
                                    Experience
                                </h3>
                                <div class="experience-list">
                                    <div
                                        v-for="(exp, index) in selectedProfileData.experience"
                                        :key="index"
                                        class="experience-item"
                                    >
                                        <p class="experience-title">
                                            <strong>{{ exp.title || "Position" }}</strong>
                                            <span v-if="exp.company" class="experience-company">
                                                at {{ exp.company }}
                                            </span>
                                        </p>
                                        <p v-if="exp.startDate || exp.endDate" class="experience-dates">
                                            {{ exp.startDate || "?" }} - {{ exp.endDate || "Present" }}
                                        </p>
                                        <p v-if="exp.description" class="experience-description">
                                            {{ exp.description }}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Tags -->
                            <div
                                v-if="selectedProfileData.tags && selectedProfileData.tags.length > 0"
                                class="detail-section"
                            >
                                <h3 class="detail-title">
                                    <i class="fa-solid fa-tags"></i>
                                    Tags
                                </h3>
                                <div class="tags-list">
                                    <span
                                        v-for="tag in selectedProfileData.tags"
                                        :key="tag"
                                        class="tag-item"
                                    >
                                        {{ tag }}
                                    </span>
                                </div>
                            </div>

                            <!-- Profile URL -->
                            <div
                                v-if="selectedProfileData.profileUrl"
                                class="detail-section"
                            >
                                <h3 class="detail-title">
                                    <i class="fa-solid fa-link"></i>
                                    Profile Link
                                </h3>
                                <a
                                    :href="selectedProfileData.profileUrl"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="profile-link"
                                >
                                    {{ selectedProfileData.profileUrl }}
                                    <i class="fa-solid fa-external-link-alt"></i>
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Edit Profile Form -->
                    <div v-if="selectedProfileData && isEditingProfile" class="edit-profile-form">
                        <!-- Profile Picture Upload -->
                        <div class="form-section">
                            <label class="form-label">Profile Picture</label>
                            <div
                                class="upload-area"
                                :class="{
                                    'drag-over': isDraggingProfile,
                                    'has-image': editProfileForm.avatarUrl,
                                }"
                                @dragover.prevent="handleDragOverProfile"
                                @dragleave.prevent="handleDragLeaveProfile"
                                @drop.prevent="handleDropProfile"
                                @click="triggerFilePickerProfile"
                            >
                                <input
                                    ref="fileInputProfile"
                                    type="file"
                                    accept="image/*"
                                    class="file-input"
                                    @change="handleFileChangeProfile"
                                />
                                <div
                                    v-if="!editProfileForm.avatarUrl"
                                    class="upload-placeholder"
                                >
                                    <i
                                        class="fa-solid fa-cloud-arrow-up upload-icon"
                                    ></i>
                                    <p class="upload-text">
                                        Drag and drop an image here, or click to
                                        browse
                                    </p>
                                    <p class="upload-hint">
                                        Supports JPG, PNG, GIF (max 5MB)
                                    </p>
                                </div>
                                <div v-else class="upload-preview">
                                    <img
                                        :src="editProfileForm.avatarUrl"
                                        alt="Preview"
                                        @error="handleImageError"
                                    />
                                    <button
                                        type="button"
                                        class="remove-image-btn"
                                        @click.stop="removeImageProfile"
                                        aria-label="Remove image"
                                    >
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                </div>
                            </div>
                            <div v-if="uploadErrorProfile" class="upload-error">
                                <i class="fa-solid fa-exclamation-circle"></i>
                                {{ uploadErrorProfile }}
                            </div>
                        </div>

                        <div class="form-section">
                            <label class="form-label">First Name *</label>
                            <input
                                v-model.trim="editProfileForm.firstName"
                                type="text"
                                class="form-input"
                                required
                            />
                        </div>
                        <div class="form-section">
                            <label class="form-label">Last Name *</label>
                            <input
                                v-model.trim="editProfileForm.lastName"
                                type="text"
                                class="form-input"
                                required
                            />
                        </div>
                        <div class="form-section">
                            <label class="form-label">Headline</label>
                            <input
                                v-model.trim="editProfileForm.headline"
                                type="text"
                                class="form-input"
                            />
                        </div>
                        <div class="form-section">
                            <label class="form-label">Company</label>
                            <input
                                v-model.trim="editProfileForm.company"
                                type="text"
                                class="form-input"
                            />
                        </div>
                        <div class="form-section">
                            <label class="form-label">Job Title</label>
                            <input
                                v-model.trim="editProfileForm.jobTitle"
                                type="text"
                                class="form-input"
                            />
                        </div>
                        <div class="form-section">
                            <label class="form-label">Location</label>
                            <input
                                v-model.trim="editProfileForm.location"
                                type="text"
                                class="form-input"
                            />
                        </div>

                        <div v-if="errorProfile" class="error-banner">
                            <i class="fa-solid fa-exclamation-circle"></i>
                            <span>{{ errorProfile }}</span>
                        </div>

                        <div class="form-actions">
                            <button
                                type="button"
                                @click="saveProfile"
                                class="btn-primary"
                                :disabled="savingProfile"
                            >
                                <i class="fa-solid fa-save"></i>
                                {{ savingProfile ? "Saving..." : "Save Changes" }}
                            </button>
                            <button
                                type="button"
                                @click="cancelEditProfile"
                                class="btn-secondary"
                                :disabled="savingProfile"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import {
    MultiSourceNetworkAPI,
    type AdjacencyMap,
    PublicProfileAPI,
    type PublicProfile,
    UserAuthenticationAPI,
    LinkedInImportAPI,
    type LinkedInConnection,
    SemanticSearchAPI,
    type SemanticConnectionResult,
} from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAvatarStore } from "@/stores/useAvatarStore";
import ConnectionCard from "@/components/ConnectionCard.vue";
import NetworkDisplayVis from "@/components/NetworkDisplayVis.vue";

const auth = useAuthStore();
const avatarStore = useAvatarStore();

// State
const searchQuery = ref("");
const searchMode = ref<"text" | "semantic">("text");
const viewMode = ref<"card" | "network">("card");
const loading = ref(true);
const semanticLoading = ref(false);
const adjacency = ref<AdjacencyMap | null>(null);
const selectedProfileId = ref<string | null>(null);
const isEditingProfile = ref(false);
const savingProfile = ref(false);
const errorProfile = ref<string | null>(null);
const isDraggingProfile = ref(false);
const uploadErrorProfile = ref<string>("");
const fileInputProfile = ref<HTMLInputElement | null>(null);

const editProfileForm = ref({
    firstName: "",
    lastName: "",
    headline: "",
    company: "",
    jobTitle: "",
    location: "",
    avatarUrl: "",
});

// Filter and autocomplete state
const activeFilters = ref<
    Array<{ type: string; label: string; value: string }>
>([]);
const showAutocompleteDropdown = ref(false);
const selectedAutocompleteIndex = ref(-1);

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
        company?: string;
    }>
>([]);
const semanticResults = ref<
    Array<{
        id: string;
        displayName: string;
        username?: string;
        avatarUrl: string;
        initials: string;
        location?: string;
        currentJob?: string;
        sources: string[];
        company?: string;
        score?: number;
    }>
>([]);
const nodeProfiles = ref<
    Record<string, { profile?: any; avatarUrl: string; username?: string }>
>({});
const linkedInConnections = ref<Record<string, LinkedInConnection>>({});

// Available filter options
const availablePlatforms = ["linkedin", "instagram", "handshake", "manual"];

// Extract unique companies and locations from all data
const availableCompanies = computed(() => {
    const companies = new Set<string>();
    Object.values(linkedInConnections.value).forEach((conn) => {
        if (conn.currentCompany) {
            companies.add(conn.currentCompany.toLowerCase());
        }
    });
    Object.values(nodeProfiles.value).forEach((profile) => {
        if (profile.profile?.company) {
            companies.add(profile.profile.company.toLowerCase());
        }
    });
    return Array.from(companies).sort();
});

const availableLocations = computed(() => {
    const locations = new Set<string>();
    Object.values(linkedInConnections.value).forEach((conn) => {
        if (conn.location) {
            locations.add(conn.location.toLowerCase());
        }
    });
    Object.values(nodeProfiles.value).forEach((profile) => {
        if (profile.profile?.location) {
            locations.add(profile.profile.location.toLowerCase());
        }
    });
    return Array.from(locations).sort();
});

// Autocomplete suggestions
const autocompleteSuggestions = computed(() => {
    if (searchMode.value !== "text") return [];
    const query = searchQuery.value.toLowerCase().trim();
    if (!query) return [];

    const suggestions: Array<{
        type: string;
        label: string;
        value: string;
        icon: string;
    }> = [];

    // Check for explicit filter prefixes
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

    // Smart detection: Check if query matches a platform
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

// Computed: Displayed nodes based on search mode
const displayedNodes = computed(() => {
    if (searchMode.value === "semantic") {
        return semanticResults.value;
    }

    // Text search mode with filters
    let results = [...allNodes.value];

    // Apply text search
    if (searchQuery.value && !searchQuery.value.includes(":")) {
        const query = searchQuery.value.toLowerCase().trim();
        if (query.length > 0) {
            results = results.filter((node) => {
                const nameMatch = node.displayName
                    .toLowerCase()
                    .includes(query);
                const locationMatch = node.location?.toLowerCase().includes(query);
                const jobMatch = node.currentJob?.toLowerCase().includes(query);
                const companyMatch = node.company?.toLowerCase().includes(query);
                return nameMatch || locationMatch || jobMatch || companyMatch;
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
        } else if (filter.type === "company") {
            results = results.filter((node) => {
                const linkedInConn = linkedInConnections.value[node.id];
                const profile = nodeProfiles.value[node.id];
                const company =
                    linkedInConn?.currentCompany ||
                    profile?.profile?.company ||
                    node.company;
                return company?.toLowerCase().includes(filter.value.toLowerCase());
            });
        } else if (filter.type === "location") {
            results = results.filter((node) => {
                const linkedInConn = linkedInConnections.value[node.id];
                const profile = nodeProfiles.value[node.id];
                const location =
                    linkedInConn?.location ||
                    profile?.profile?.location ||
                    node.location;
                return location?.toLowerCase().includes(filter.value.toLowerCase());
            });
        }
    });

    return results;
});

const selectedProfileData = computed(() => {
    if (!selectedProfileId.value) {
        return null;
    }

    const node = allNodes.value.find((n) => n.id === selectedProfileId.value);
    if (!node) return null;

    const linkedInConn = linkedInConnections.value[selectedProfileId.value];
    const profile = nodeProfiles.value[selectedProfileId.value];
    const profileData = profile?.profile || {};

    // Get all available data from different sources, prioritizing LinkedIn data
    return {
        id: node.id,
        displayName: node.displayName,
        firstName: linkedInConn?.firstName || profileData.firstName || "",
        lastName: linkedInConn?.lastName || profileData.lastName || "",
        headline: linkedInConn?.headline || profileData.headline || "",
        currentCompany:
            linkedInConn?.currentCompany ||
            profileData.currentCompany ||
            profileData.company ||
            "",
        currentPosition:
            linkedInConn?.currentPosition ||
            profileData.currentPosition ||
            "",
        location:
            linkedInConn?.location ||
            profileData.location ||
            node.location ||
            "",
        industry: linkedInConn?.industry || profileData.industry || "",
        summary: linkedInConn?.summary || profileData.summary || "",
        profileUrl: linkedInConn?.profileUrl || profileData.profileUrl || "",
        avatarUrl: node.avatarUrl,
        initials: node.initials,
        skills: linkedInConn?.skills || profileData.skills || [],
        education: linkedInConn?.education || profileData.education || [],
        experience: linkedInConn?.experience || profileData.experience || [],
        tags: profileData.tags || [],
    };
});

// Methods
function toggleSearchMode() {
    if (searchMode.value === "text") {
        searchMode.value = "semantic";
        activeFilters.value = [];
        showAutocompleteDropdown.value = false;
        if (searchQuery.value.trim()) {
            performSemanticSearch();
        }
    } else {
        searchMode.value = "text";
        semanticResults.value = [];
    }
}

async function performSemanticSearch() {
    if (!auth.userId || !searchQuery.value.trim()) {
        semanticResults.value = [];
        return;
    }

    semanticLoading.value = true;

    try {
        const { results } = await SemanticSearchAPI.searchConnections({
            owner: auth.userId,
            queryText: searchQuery.value.trim(),
            limit: 50,
        });

        // Map semantic results to node format
        const mappedResults = await Promise.all(
            results.map(async (result: SemanticConnectionResult) => {
                const connectionId = result.connectionId;
                const linkedInConn = linkedInConnections.value[connectionId];
                const profile = nodeProfiles.value[connectionId];

                // If we don't have the node data, try to fetch it
                if (!linkedInConn && !profile) {
                    await fetchNodeProfiles([connectionId]);
                }

                const conn = linkedInConnections.value[connectionId];
                const prof = nodeProfiles.value[connectionId];

                let displayName: string;
                let avatarUrl: string;
                let location: string | undefined;
                let currentJob: string | undefined;
                let company: string | undefined;

                if (conn) {
                    const firstName = conn.firstName || "";
                    const lastName = conn.lastName || "";
                    const fullName = `${firstName} ${lastName}`.trim();
                    displayName = fullName || conn.headline || connectionId;
                    avatarUrl =
                        conn.profilePictureUrl || avatarStore.getLetterAvatar(displayName);
                    location = conn.location;
                    currentJob = conn.currentPosition || conn.headline;
                    company = conn.currentCompany;
                } else {
                    const profileData = nodeProfiles.value[connectionId] || {
                        avatarUrl: avatarStore.DEFAULT_AVATAR,
                        username: connectionId,
                    };
                    const profData = profileData.profile || {};

                    const first = (profData.firstName || "").trim();
                    const last = (profData.lastName || "").trim();
                    if (first || last) {
                        displayName = `${first} ${last}`.trim();
                    } else if (profData.headline) {
                        displayName = profData.headline;
                    } else {
                        displayName = profileData.username || connectionId;
                    }

                    // Use letter-based avatar if no profile picture
                    avatarUrl = profileData.avatarUrl === avatarStore.DEFAULT_AVATAR
                        ? avatarStore.getLetterAvatar(displayName)
                        : profileData.avatarUrl;
                    location = profData.location;
                    currentJob = profData.headline;
                    company = profData.company;
                }

                return {
                    id: connectionId,
                    displayName,
                    avatarUrl,
                    initials: getInitials(displayName),
                    location,
                    currentJob,
                    company,
                    sources: [],
                    score: result.score,
                };
            })
        );

        semanticResults.value = mappedResults;
    } catch (error) {
        console.error("Semantic search error:", error);
        semanticResults.value = [];
    } finally {
        semanticLoading.value = false;
    }
}

function handleSearchInput() {
    if (searchMode.value === "text") {
        if (searchQuery.value.length > 0) {
            showAutocompleteDropdown.value = true;
        } else {
            showAutocompleteDropdown.value = false;
        }
    } else {
        // Debounce semantic search
        clearTimeout((window as any).semanticSearchTimeout);
        (window as any).semanticSearchTimeout = setTimeout(() => {
            if (searchQuery.value.trim()) {
                performSemanticSearch();
            } else {
                semanticResults.value = [];
            }
        }, 500);
    }
}

function handleKeyDown(event: KeyboardEvent) {
    if (searchMode.value !== "text") return;

    const suggestions = autocompleteSuggestions.value;

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

        if (
            selectedAutocompleteIndex.value >= 0 &&
            suggestions[selectedAutocompleteIndex.value]
        ) {
            selectSuggestion(suggestions[selectedAutocompleteIndex.value]);
            return;
        }

        // If there are suggestions, prioritize filter suggestions
        if (suggestions.length > 0) {
            const filterSuggestion = suggestions.find((s) => s.type !== "name");
            if (filterSuggestion) {
                selectSuggestion(filterSuggestion);
                return;
            }
            selectSuggestion(suggestions[0]);
            return;
        }

        // Try to add as filter if query looks like a filter
        const query = searchQuery.value.toLowerCase().trim();
        if (query.length > 0) {
            const platformMatch = availablePlatforms.find(
                (p) =>
                    p.toLowerCase() === query || p.toLowerCase().includes(query)
            );
            if (platformMatch) {
                addFilter("platform", "Platform", platformMatch);
                return;
            }

            const companyMatch = availableCompanies.value.find(
                (c) =>
                    c.toLowerCase() === query ||
                    c.toLowerCase().includes(query) ||
                    query.includes(c)
            );
            if (companyMatch) {
                addFilter("company", "Company", companyMatch);
                return;
            }

            const locationMatch = availableLocations.value.find(
                (l) =>
                    l.toLowerCase() === query ||
                    l.toLowerCase().includes(query) ||
                    query.includes(l)
            );
            if (locationMatch) {
                addFilter("location", "Location", locationMatch);
                return;
            }
        }

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
        searchQuery.value = suggestion.value;
        showAutocompleteDropdown.value = false;
        selectedAutocompleteIndex.value = -1;
    } else {
        addFilter(suggestion.type, getFilterLabel(suggestion.type), suggestion.value);
        searchQuery.value = "";
        showAutocompleteDropdown.value = false;
        selectedAutocompleteIndex.value = -1;
    }
}

function getFilterLabel(type: string): string {
    const labels: Record<string, string> = {
        platform: "Platform",
        company: "Company",
        location: "Location",
    };
    return labels[type] || type;
}

function addFilter(type: string, label: string, value: string) {
    const existingFilter = activeFilters.value.find(
        (f) =>
            f.type === type &&
            f.value.toLowerCase() === value.toLowerCase()
    );

    if (!existingFilter) {
        activeFilters.value.push({ type, label, value });
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

function toggleView() {
    viewMode.value = viewMode.value === "card" ? "network" : "card";
}

function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = avatarStore.DEFAULT_AVATAR;
}

function openProfileModal(nodeId: string) {
    selectedProfileId.value = nodeId;
    isEditingProfile.value = false;
}

function closeProfileModal() {
    selectedProfileId.value = null;
    isEditingProfile.value = false;
    errorProfile.value = null;
    uploadErrorProfile.value = "";
}

function startEditProfile() {
    if (!selectedProfileData.value) return;
    const data = selectedProfileData.value;
    editProfileForm.value = {
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        headline: data.headline || "",
        company: data.currentCompany || "",
        jobTitle: data.currentPosition || "",
        location: data.location || "",
        avatarUrl: data.avatarUrl || "",
    };
    isEditingProfile.value = true;
}

function cancelEditProfile() {
    isEditingProfile.value = false;
    errorProfile.value = null;
    uploadErrorProfile.value = "";
}

function triggerFilePickerProfile() {
    fileInputProfile.value?.click();
}

function handleDragOverProfile(event: DragEvent) {
    isDraggingProfile.value = true;
    event.preventDefault();
}

function handleDragLeaveProfile(event: DragEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        isDraggingProfile.value = false;
    }
}

function handleDropProfile(event: DragEvent) {
    isDraggingProfile.value = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
        processFileProfile(files[0]);
    }
}

function handleFileChangeProfile(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        processFileProfile(file);
    }
}

function processFileProfile(file: File) {
    uploadErrorProfile.value = "";

    // Validate file type
    if (!file.type.startsWith("image/")) {
        uploadErrorProfile.value = "Please select an image file";
        return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        uploadErrorProfile.value = "Image size must be less than 5MB";
        return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
            editProfileForm.value.avatarUrl = result;
            uploadErrorProfile.value = "";
        }
    };
    reader.onerror = () => {
        uploadErrorProfile.value = "Failed to read image file";
    };
    reader.readAsDataURL(file);
}

function removeImageProfile() {
    editProfileForm.value.avatarUrl = "";
    uploadErrorProfile.value = "";
    if (fileInputProfile.value) {
        fileInputProfile.value.value = "";
    }
}

async function saveProfile() {
    if (!auth.userId || !selectedProfileId.value) {
        errorProfile.value = "Missing user or node ID.";
        return;
    }

    if (!editProfileForm.value.firstName.trim() || !editProfileForm.value.lastName.trim()) {
        errorProfile.value = "First name and last name are required.";
        return;
    }

    savingProfile.value = true;
    errorProfile.value = null;

    try {
        const label = `${editProfileForm.value.firstName} ${editProfileForm.value.lastName}`.trim();
        const headline = editProfileForm.value.headline || editProfileForm.value.jobTitle || "";

        // Update the existing node using updateNode
        const nodeResult = await MultiSourceNetworkAPI.updateNode({
            node: selectedProfileId.value,
            updater: auth.userId,
            meta: {
                firstName: editProfileForm.value.firstName.trim(),
                lastName: editProfileForm.value.lastName.trim(),
                label: label,
                headline: headline,
                location: editProfileForm.value.location.trim() || undefined,
                currentCompany: editProfileForm.value.company.trim() || undefined,
                currentPosition: editProfileForm.value.jobTitle.trim() || undefined,
                avatarUrl: editProfileForm.value.avatarUrl || undefined,
                profilePictureUrl: editProfileForm.value.avatarUrl || undefined,
            },
        });

        if (nodeResult.error) {
            throw new Error(nodeResult.error);
        }

        // Reload network data to refresh the profile
        await loadNetworkData();

        isEditingProfile.value = false;
    } catch (err) {
        console.error("Error saving profile:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to save profile. Please try again.";
        errorProfile.value = errorMessage;
    } finally {
        savingProfile.value = false;
    }
}

function getInitials(text: string): string {
    if (!text) return "?";
    const words = text.trim().split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
}

async function fetchNodeProfiles(nodeIds: string[], forceRefresh: string[] = []) {
    const profilePromises = nodeIds.map(async (nodeId) => {
        // Skip if already cached, unless we're forcing a refresh for this node
        if (nodeProfiles.value[nodeId] && !forceRefresh.includes(nodeId)) return;

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
                // Use profile picture from PublicProfile if available
                if (profile.profilePictureUrl) {
                    avatarUrl = profile.profilePictureUrl;
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
                        (nd.avatarUrl as string) || avatarStore.getLetterAvatar(nd.label || nd.firstName || id),
                    username: (nd.label as string) || id,
                };
            });
        } catch (e) {
            console.warn("getNodes failed:", e);
        }

        // Always force refresh for current user to get latest profile picture
        await fetchNodeProfiles(Array.from(allNodeIds), auth.userId ? [auth.userId] : []);

        const nodes: Array<{
            id: string;
            displayName: string;
            username?: string;
            avatarUrl: string;
            initials: string;
            location?: string;
            currentJob?: string;
            sources: string[];
            company?: string;
        }> = [];

        for (const nodeId of allNodeIds) {
            const linkedInConn = linkedInConnections.value[nodeId];

            let displayName: string;
            let avatarUrl: string;
            let location: string | undefined;
            let currentJob: string | undefined;
            let company: string | undefined;

            if (linkedInConn) {
                const firstName = linkedInConn.firstName || "";
                const lastName = linkedInConn.lastName || "";
                const fullName = `${firstName} ${lastName}`.trim();

                displayName = fullName || linkedInConn.headline || nodeId;
                // Use profile picture if available, otherwise use letter-based avatar
                avatarUrl =
                    linkedInConn.profilePictureUrl ||
                    avatarStore.getLetterAvatar(displayName);
                location = linkedInConn.location;
                currentJob = linkedInConn.currentPosition || linkedInConn.headline;
                company = linkedInConn.currentCompany;

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

                // For root node (current user), prioritize profile picture from PublicProfile
                if (nodeId === auth.userId) {
                    const publicProfile = profileData.profile as PublicProfile | undefined;
                    if (publicProfile?.profilePictureUrl) {
                        avatarUrl = publicProfile.profilePictureUrl;
                    } else {
                        // Use letter-based avatar if no profile picture
                        avatarUrl = profileData.avatarUrl === avatarStore.DEFAULT_AVATAR
                            ? avatarStore.getLetterAvatar(displayName)
                            : profileData.avatarUrl;
                    }
                } else {
                    // Use letter-based avatar if no profile picture
                    avatarUrl = profileData.avatarUrl === avatarStore.DEFAULT_AVATAR
                        ? avatarStore.getLetterAvatar(displayName)
                        : profileData.avatarUrl;
                }
                location = profile.location;
                currentJob = profile.headline;
                company = profile.company;
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
                company,
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

// Watch for search mode changes
watch(searchMode, (newMode) => {
    if (newMode === "semantic" && searchQuery.value.trim()) {
        performSemanticSearch();
    } else if (newMode === "text") {
        semanticResults.value = [];
    }
});

// Listen for profile picture updates
function handleProfilePictureUpdate(event: CustomEvent) {
    const userId = event.detail?.userId;
    if (userId && userId === auth.userId) {
        // Clear cache for current user and refresh
        delete nodeProfiles.value[userId];
        // Force refresh the current user's profile
        fetchNodeProfiles([userId], [userId]).then(() => {
            // Rebuild nodes to update avatarUrl
            if (adjacency.value) {
                loadNetworkData();
            }
        });
    }
}

onMounted(() => {
    loadNetworkData();
    // Listen for profile picture updates
    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);
});

onBeforeUnmount(() => {
    window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);
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

.search-input-wrapper {
    flex: 1;
    position: relative;
}

.search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    padding-right: 2.5rem;
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

.search-input.semantic-mode {
    border-color: #9333ea;
    background: #faf5ff;
}

.search-input.semantic-mode:focus {
    border-color: #9333ea;
    box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.2);
}

.search-mode-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9333ea;
    pointer-events: none;
}

.smart-search-btn {
    padding: 0.75rem 1.5rem;
    background: white;
    border: 1px solid rgba(15, 23, 42, 0.2);
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--color-navy-900);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
}

.smart-search-btn:hover:not(:disabled) {
    background: #f8fafc;
    border-color: rgba(147, 51, 234, 0.3);
    color: #9333ea;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(147, 51, 234, 0.1);
}

.smart-search-btn.active {
    background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
    color: white;
    border-color: #9333ea;
    box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
}

.smart-search-btn.active:hover:not(:disabled) {
    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(147, 51, 234, 0.4);
}

.smart-search-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
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

.search-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
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
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: #e2e8f0;
    color: #1e293b;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid rgba(15, 23, 42, 0.1);
}

.filter-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: #64748b;
    transition: all 0.2s ease;
    border-radius: 0.25rem;
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
}

.filter-remove:hover {
    background: #cbd5e1;
    color: #dc2626;
    transform: scale(1.1);
}

.filter-remove i {
    font-size: 0.75rem;
    font-weight: 600;
}

.search-mode-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: #faf5ff;
    color: #9333ea;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
}

.results-count {
    margin-left: auto;
    font-size: 0.875rem;
    color: #64748b;
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
    max-width: 100%;
    min-height: 500px;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    overflow: hidden;
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

/* Modal Styles */
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

.modal-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.btn-edit-profile {
    padding: 0.5rem 1rem;
    background: #f1f5f9;
    color: #1e293b;
    border: 1px solid rgba(15, 23, 42, 0.2);
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.btn-edit-profile:hover {
    background: #e2e8f0;
    border-color: rgba(15, 23, 42, 0.3);
}

.modal-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
}

.modal-close {
    background: #f1f5f9;
    border: 2px solid #e2e8f0;
    font-size: 1.75rem;
    font-weight: 600;
    color: #1e293b;
    cursor: pointer;
    padding: 0;
    border-radius: 50%;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    line-height: 1;
}

.modal-close:hover {
    background: #e2e8f0;
    border-color: #cbd5e1;
    color: #0f172a;
    transform: scale(1.1);
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
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.detail-title i {
    font-size: 0.875rem;
    color: var(--color-navy-600);
}

.profile-summary {
    margin: 0;
    line-height: 1.6;
    color: #475569;
}

.skills-list,
.tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.skill-tag,
.tag-item {
    padding: 0.375rem 0.75rem;
    background: #f1f5f9;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: #475569;
    border: 1px solid rgba(15, 23, 42, 0.1);
}

.skill-tag {
    background: #eff6ff;
    color: #1e40af;
    border-color: #bfdbfe;
}

.education-list,
.experience-list {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin-top: 0.5rem;
}

.education-item,
.experience-item {
    padding: 1rem;
    background: #f8fafc;
    border-radius: 0.5rem;
    border-left: 3px solid var(--color-navy-400);
}

.education-school,
.experience-title {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    color: #1e293b;
}

.education-degree,
.experience-company {
    margin: 0.25rem 0;
    font-size: 0.875rem;
    color: #64748b;
}

.experience-company {
    font-weight: 500;
    color: #475569;
}

.education-years,
.experience-dates {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: #94a3b8;
    font-style: italic;
}

.experience-description {
    margin: 0.75rem 0 0;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #475569;
}

.profile-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-navy-600);
    text-decoration: none;
    font-size: 0.875rem;
    word-break: break-all;
    transition: color 0.2s ease;
}

.profile-link:hover {
    color: var(--color-navy-800);
    text-decoration: underline;
}

.profile-link i {
    font-size: 0.75rem;
    flex-shrink: 0;
}

.edit-profile-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.form-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e293b;
}

.form-input {
    padding: 0.75rem;
    border: 1px solid rgba(15, 23, 42, 0.2);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-family: inherit;
    transition: all 0.2s ease;
    outline: none;
}

.form-input:focus {
    border-color: var(--color-navy-400);
    box-shadow: 0 0 0 3px rgba(102, 153, 204, 0.2);
}

.error-banner {
    padding: 0.75rem 1rem;
    background: #fee2e2;
    color: #dc2626;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
}

.form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(15, 23, 42, 0.1);
}

.btn-primary {
    flex: 1;
    padding: 0.75rem 1.5rem;
    background: var(--color-navy-600);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.btn-primary:hover:not(:disabled) {
    background: var(--color-navy-700);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-secondary {
    padding: 0.75rem 1.5rem;
    background: #f1f5f9;
    color: #1e293b;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
    background: #e2e8f0;
}

.btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.upload-area {
    position: relative;
    border: 2px dashed rgba(15, 23, 42, 0.2);
    border-radius: 0.5rem;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #f8fafc;
}

.upload-area:hover {
    border-color: var(--color-navy-400);
    background: #f1f5f9;
}

.upload-area.drag-over {
    border-color: var(--color-navy-600);
    background: #eff6ff;
}

.upload-area.has-image {
    padding: 0;
    border: none;
    background: transparent;
}

.file-input {
    display: none;
}

.upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}

.upload-icon {
    font-size: 2rem;
    color: #94a3b8;
}

.upload-text {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: #475569;
}

.upload-hint {
    margin: 0;
    font-size: 0.75rem;
    color: #94a3b8;
}

.upload-preview {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0.5rem;
    overflow: hidden;
}

.upload-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.remove-image-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 50%;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.remove-image-btn:hover {
    background: rgba(0, 0, 0, 0.9);
}

.upload-error {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: #fee2e2;
    color: #dc2626;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
</style>
