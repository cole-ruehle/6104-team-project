<template>
    <div class="network-search-page">
        <!-- Warning Banner -->
        <div
            class="banner warning"
            style="
                margin-bottom: 1.5rem;
                padding: 1rem 1.25rem;
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 0.75rem;
                color: #92400e;
            "
        >
            <strong>⚠️ Warning:</strong> This entire tab is still under
            development. Features may be incomplete or subject to change.
        </div>

        <!-- Header -->
        <div class="search-header">
            <div class="header-content">
                <div class="header-icon">🔍</div>
                <div>
                    <h1 class="header-title">Network Search</h1>
                    <p class="header-subtitle">
                        Currently, used for dev but provides a nice search
                        interface and basic filtering with the cards
                        representing the connections.
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
                    <div class="active-filters-container" v-if="activeFilters.length > 0">
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
                        <button
                            @click="clearAllFilters"
                            class="clear-all-filters-btn"
                            aria-label="Clear all filters"
                        >
                            Clear all
                        </button>
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
                    @click="openProfileModal(node.id)"
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

    <!-- Profile Modal -->
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
                    ×
                </button>
            </div>

            <div class="modal-body">
                        <div v-if="isEditing" class="edit-form">
                            <!-- Temporary notice: profile editing currently unstable -->
                            <div class="banner warning" style="margin-bottom: 1rem; padding: 0.75rem 1rem; background: #fffbeb; border: 1px solid #f59e0b; border-radius: 0.5rem; color: #92400e;">
                                <strong>Note:</strong> Profile editing is currently not fully functional in this preview. We're actively working on fixes — changes you make here may not be saved yet.
                            </div>
                    <!-- Profile Picture Upload -->
                    <div class="form-section">
                        <label class="form-label">Profile Picture</label>
                        <div class="profile-picture-container">
                            <div v-if="editForm.profilePictureUrl" class="profile-picture-preview">
                                <img
                                    :src="editForm.profilePictureUrl"
                                    alt="Profile preview"
                                    @error="handleImageError"
                                />
                            </div>
                            <div v-else class="profile-picture-placeholder">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <button
                                type="button"
                                class="change-pic-btn"
                                @click="triggerFilePicker"
                            >
                                Change Pic
                            </button>
                            <input
                                ref="fileInput"
                                type="file"
                                accept="image/*"
                                class="file-input"
                                @change="handleFileChange"
                            />
                        </div>
                        <div v-if="uploadError" class="upload-error">
                            <i class="fa-solid fa-exclamation-circle"></i>
                            {{ uploadError }}
                        </div>
                    </div>

                    <!-- Name -->
                    <div class="form-row">
                        <div class="form-section">
                            <label class="form-label">First Name</label>
                            <input
                                v-model="editForm.firstName"
                                type="text"
                                class="form-input"
                            />
                        </div>
                        <div class="form-section">
                            <label class="form-label">Last Name</label>
                            <input
                                v-model="editForm.lastName"
                                type="text"
                                class="form-input"
                            />
                        </div>
                    </div>

                    <!-- Headline -->
                    <div class="form-section">
                        <label class="form-label">Headline</label>
                        <input
                            v-model="editForm.headline"
                            type="text"
                            class="form-input"
                        />
                    </div>

                    <!-- Company & Position -->
                    <div class="form-row">
                        <div class="form-section">
                            <label class="form-label">Current Company</label>
                            <input
                                v-model="editForm.currentCompany"
                                type="text"
                                class="form-input"
                            />
                        </div>
                        <div class="form-section">
                            <label class="form-label">Current Position</label>
                            <input
                                v-model="editForm.currentPosition"
                                type="text"
                                class="form-input"
                            />
                        </div>
                    </div>

                    <!-- Location & Industry -->
                    <div class="form-row">
                        <div class="form-section">
                            <label class="form-label">Location</label>
                            <input
                                v-model="editForm.location"
                                type="text"
                                class="form-input"
                            />
                        </div>
                        <div class="form-section">
                            <label class="form-label">Industry</label>
                            <input
                                v-model="editForm.industry"
                                type="text"
                                class="form-input"
                            />
                        </div>
                    </div>

                    <!-- LinkedIn URL -->
                    <div class="form-section">
                        <label class="form-label">LinkedIn Profile URL</label>
                        <input
                            v-model="editForm.profileUrl"
                            type="url"
                            class="form-input"
                        />
                    </div>

                    <!-- Summary -->
                    <div class="form-section">
                        <label class="form-label">Summary</label>
                        <textarea
                            v-model="editForm.summary"
                            class="form-textarea"
                            rows="4"
                        ></textarea>
                    </div>

                    <!-- Skills -->
                    <div class="form-section">
                        <label class="form-label"
                            >Skills (comma-separated)</label
                        >
                        <input
                            v-model="editForm.skillsText"
                            type="text"
                            class="form-input"
                            placeholder="JavaScript, Python, React"
                        />
                    </div>

                    <!-- Action Buttons -->
                    <div class="form-actions">
                        <button
                            @click="saveProfile"
                            class="btn-primary"
                            :disabled="saving"
                        >
                            <i class="fa-solid fa-save"></i>
                            {{ saving ? "Saving..." : "Save Changes" }}
                        </button>
                        <button @click="cancelEdit" class="btn-secondary">
                            Cancel
                        </button>
                    </div>
                </div>

                <div v-else class="profile-view">
                    <!-- Profile Header -->
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
                                <span
                                    v-if="
                                        selectedProfileData.sources.length > 0
                                    "
                                    class="profile-meta-item"
                                >
                                    <i class="fa-solid fa-link"></i>
                                    {{ selectedProfileData.sources.join(", ") }}
                                </span>
                            </div>
                        </div>
                        <button @click="startEdit" class="btn-edit">
                            <i class="fa-solid fa-pencil"></i> Edit
                        </button>
                    </div>

                    <!-- Profile Details -->
                    <div class="profile-details">
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

                        <div
                            v-if="selectedProfileData.location"
                            class="detail-section"
                        >
                            <h3 class="detail-title">
                                <i class="fa-solid fa-map-marker-alt"></i>
                                Location
                            </h3>
                            <p>{{ selectedProfileData.location }}</p>
                        </div>

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

                        <div
                            v-if="
                                selectedProfileData.skills &&
                                selectedProfileData.skills.length > 0
                            "
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

                        <div
                            v-if="
                                selectedProfileData.experience &&
                                selectedProfileData.experience.length > 0
                            "
                            class="detail-section"
                        >
                            <h3 class="detail-title">
                                <i class="fa-solid fa-briefcase"></i>
                                Experience
                            </h3>
                            <div class="experience-list">
                                <div
                                    v-for="(
                                        exp, idx
                                    ) in selectedProfileData.experience"
                                    :key="idx"
                                    class="experience-item"
                                >
                                    <div class="experience-header">
                                        <strong>{{ exp.title }}</strong>
                                        <span v-if="exp.company">
                                            at {{ exp.company }}</span
                                        >
                                    </div>
                                    <div
                                        v-if="exp.startDate || exp.endDate"
                                        class="experience-dates"
                                    >
                                        {{ exp.startDate || "?" }} -
                                        {{ exp.endDate || "Present" }}
                                    </div>
                                    <p
                                        v-if="exp.description"
                                        class="experience-description"
                                    >
                                        {{ exp.description }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div
                            v-if="
                                selectedProfileData.education &&
                                selectedProfileData.education.length > 0
                            "
                            class="detail-section"
                        >
                            <h3 class="detail-title">
                                <i class="fa-solid fa-graduation-cap"></i>
                                Education
                            </h3>
                            <div class="education-list">
                                <div
                                    v-for="(
                                        edu, idx
                                    ) in selectedProfileData.education"
                                    :key="idx"
                                    class="education-item"
                                >
                                    <div class="education-header">
                                        <strong>{{
                                            edu.school || "Unknown School"
                                        }}</strong>
                                    </div>
                                    <div
                                        v-if="edu.degree || edu.fieldOfStudy"
                                        class="education-degree"
                                    >
                                        {{
                                            [edu.degree, edu.fieldOfStudy]
                                                .filter(Boolean)
                                                .join(" in ")
                                        }}
                                    </div>
                                    <div
                                        v-if="edu.startYear || edu.endYear"
                                        class="education-years"
                                    >
                                        {{ edu.startYear || "?" }} -
                                        {{ edu.endYear || "Present" }}
                                    </div>
                                </div>
                            </div>
                        </div>

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
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
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

// Profile modal state
const selectedProfileId = ref<string | null>(null);
const isEditing = ref(false);
const saving = ref(false);
const uploadError = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const editForm = ref({
    firstName: "",
    lastName: "",
    headline: "",
    location: "",
    industry: "",
    currentPosition: "",
    currentCompany: "",
    profileUrl: "",
    profilePictureUrl: "",
    summary: "",
    skillsText: "",
});
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

// Computed profile data for selected profile
const selectedProfileData = computed(() => {
    if (!selectedProfileId.value) {
        return {
            id: "",
            displayName: "",
            headline: "",
            currentCompany: "",
            currentPosition: "",
            location: "",
            industry: "",
            summary: "",
            skills: [] as string[],
            experience: [] as any[],
            education: [] as any[],
            profileUrl: "",
            avatarUrl: "",
            initials: "",
            sources: [] as string[],
        };
    }

    const node = allNodes.value.find((n) => n.id === selectedProfileId.value);
    if (!node) {
        return {
            id: selectedProfileId.value,
            displayName: selectedProfileId.value,
            headline: "",
            currentCompany: "",
            currentPosition: "",
            location: "",
            industry: "",
            summary: "",
            skills: [] as string[],
            experience: [] as any[],
            education: [] as any[],
            profileUrl: "",
            avatarUrl: "",
            initials: selectedProfileId.value.substring(0, 2).toUpperCase(),
            sources: [] as string[],
        };
    }

    const linkedInConn = linkedInConnections.value[selectedProfileId.value];
    const profile = nodeProfiles.value[selectedProfileId.value];
    const profileData = profile?.profile || {};

    // Get all available data from different sources, prioritizing LinkedIn data
    return {
        id: node.id,
        displayName: node.displayName,
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
            "",
        industry:
            linkedInConn?.industry ||
            profileData.industry ||
            "",
        summary:
            linkedInConn?.summary ||
            profileData.summary ||
            "",
        skills:
            linkedInConn?.skills ||
            profileData.skills ||
            [],
        experience:
            linkedInConn?.experience ||
            profileData.experience ||
            [],
        education:
            linkedInConn?.education ||
            profileData.education ||
            [],
        profileUrl:
            linkedInConn?.profileUrl ||
            profileData.profileUrl ||
            "",
        avatarUrl: node.avatarUrl,
        initials: node.initials,
        sources: node.sources,
        tags: profileData.tags || [],
    };
});

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
            // const degree = parseInt(filter.value); (unused placeholder)
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

function clearAllFilters() {
    activeFilters.value = [];
}

function hideAutocomplete() {
    setTimeout(() => {
        showAutocompleteDropdown.value = false;
        selectedAutocompleteIndex.value = -1;
    }, 200);
}

function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    // Hide the image - the placeholder will show via v-else
    img.style.display = "none";
    const placeholder = img.parentElement?.querySelector(".avatar-placeholder, .avatar-placeholder-large") as HTMLElement;
    if (placeholder) {
        placeholder.style.display = "flex";
    }
}

function openProfileModal(nodeId: string) {
    selectedProfileId.value = nodeId;
    isEditing.value = false;
}

function closeProfileModal() {
    selectedProfileId.value = null;
    isEditing.value = false;
}

function startEdit() {
    if (!selectedProfileId.value) return;

    const data = selectedProfileData.value;
    const linkedInConn = linkedInConnections.value[selectedProfileId.value];

    editForm.value = {
        firstName: linkedInConn?.firstName || "",
        lastName: linkedInConn?.lastName || "",
        headline: data.headline || "",
        location: data.location || "",
        industry: data.industry || "",
        currentPosition: data.currentPosition || "",
        currentCompany: data.currentCompany || "",
        profileUrl: data.profileUrl || "",
        profilePictureUrl: data.avatarUrl || "",
        summary: data.summary || "",
        skillsText: data.skills.join(", ") || "",
    };

    isEditing.value = true;
}

function cancelEdit() {
    isEditing.value = false;
}

function triggerFilePicker() {
    fileInput.value?.click();
}

// Drag and drop handlers removed - not used in this component

function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file: File) {
    uploadError.value = "";

    // Validate file type
    if (!file.type.startsWith("image/")) {
        uploadError.value = "Please select an image file";
        return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        uploadError.value = "Image size must be less than 5MB";
        return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
            editForm.value.profilePictureUrl = result;
            uploadError.value = "";
        }
    };
    reader.onerror = () => {
        uploadError.value = "Failed to read image file";
    };
    reader.readAsDataURL(file);
}

// removeImage function removed - not used in this component

async function saveProfile() {
    if (!selectedProfileId.value) return;

    saving.value = true;

    // Ensure we have a signed-in user before calling APIs that require it
    if (!auth.userId) {
        alert("You must be signed in to update a profile.");
        saving.value = false;
        return;
    }

    try {
        // Get the LinkedIn account for the current user
        const accounts = await LinkedInImportAPI.getLinkedInAccount({
            user: auth.userId,
        });
        if (accounts.length === 0) {
            alert(
                "No LinkedIn account found. Please connect your LinkedIn account first."
            );
            saving.value = false;
            return;
        }

        const accountId = accounts[0]._id;
        const linkedInConn = linkedInConnections.value[selectedProfileId.value];

        if (!linkedInConn) {
            alert("This connection does not have LinkedIn data to update.");
            saving.value = false;
            return;
        }

        // Parse skills from comma-separated string
        const skills = editForm.value.skillsText
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        // Update the connection using addConnection (which updates if exists)
        const result = await LinkedInImportAPI.addConnection({
            account: accountId,
            linkedInConnectionId: linkedInConn.linkedInConnectionId,
            firstName: editForm.value.firstName || undefined,
            lastName: editForm.value.lastName || undefined,
            headline: editForm.value.headline || undefined,
            location: editForm.value.location || undefined,
            industry: editForm.value.industry || undefined,
            currentPosition: editForm.value.currentPosition || undefined,
            currentCompany: editForm.value.currentCompany || undefined,
            profileUrl: editForm.value.profileUrl || undefined,
            profilePictureUrl: editForm.value.profilePictureUrl || undefined,
            summary: editForm.value.summary || undefined,
            skills: skills.length > 0 ? skills : undefined,
        });

        if ("error" in result) {
            alert(`Error updating profile: ${result.error}`);
        } else {
            // Reload the connection data
            await loadLinkedInConnections();
            // Update the node data
            await loadNetworkData();
            isEditing.value = false;
        }
    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Failed to save profile. Please try again.");
    } finally {
        saving.value = false;
    }
}

function getInitials(text: string): string {
    if (!text) return "?";
    const trimmed = text.trim();
    if (trimmed.length === 0) return "?";
    // Return only the first letter
    return trimmed[0].toUpperCase();
}

async function fetchNodeProfiles(nodeIds: string[], forceRefresh: string[] = []) {
    const profilePromises = nodeIds.map(async (nodeId) => {
        // Skip if already cached, unless we're forcing a refresh for this node
        if (nodeProfiles.value[nodeId] && !forceRefresh.includes(nodeId)) return;

        let profile: PublicProfile | undefined;
        let username = nodeId;
        let avatarUrl = "";

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
                // Use profile picture from PublicProfile if available
                if (profile.profilePictureUrl) {
                    avatarUrl = profile.profilePictureUrl;
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
                if (!data) {
                    adjacency.value = null;
                    return data;
                }

                // Accept both shapes: { adjacency, nodeLabels } or the legacy adjacency map
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
                        (nd.avatarUrl as string) || avatarStore.getLetterAvatar(nd.label || nd.firstName || id),
                    username: (nd.label as string) || id,
                };
            });
        } catch (e) {
            console.warn("[NetworkSearch] getNodes failed:", e);
        }

        // Then fetch profiles/usernames for any nodes not already resolved
        // Always force refresh for current user to get latest profile picture
        await fetchNodeProfiles(Array.from(allNodeIds), auth.userId ? [auth.userId] : []);

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
                // Use empty string if no profile picture so initials will show
                avatarUrl = linkedInConn.profilePictureUrl || "";

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

                // For root node (current user), prioritize profile picture from PublicProfile
                if (nodeId === auth.userId) {
                    // Root node: use profile picture from PublicProfile if available
                    const publicProfile = profileData.profile as PublicProfile | undefined;
                    if (publicProfile?.profilePictureUrl) {
                        avatarUrl = publicProfile.profilePictureUrl;
                    } else {
                        // Use empty string if avatar is default so initials will show
                        avatarUrl = profileData.avatarUrl === avatarStore.DEFAULT_AVATAR
                            ? ""
                            : profileData.avatarUrl;
                    }
                } else {
                    // Use empty string if avatar is default so initials will show
                    avatarUrl = profileData.avatarUrl === avatarStore.DEFAULT_AVATAR
                        ? ""
                        : profileData.avatarUrl;
                }
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

.active-filters-container {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
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
    padding: 0.375rem;
    background: #dc2626;
    border: 1px solid #dc2626;
    cursor: pointer;
    color: white;
    transition: all 0.2s ease;
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
    margin-left: 0.25rem;
    position: relative;
    z-index: 1;
}

.filter-remove:hover {
    background: #b91c1c;
    border-color: #b91c1c;
    transform: scale(1.1);
}

.filter-remove i {
    font-size: 0.75rem;
    font-weight: 700;
    color: white;
    position: relative;
    z-index: 2;
    display: block;
    line-height: 1;
}

.clear-all-filters-btn {
    padding: 0.5rem 1rem;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 0.5rem;
    color: #475569;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.clear-all-filters-btn:hover {
    background: #e2e8f0;
    border-color: #94a3b8;
    color: #1e293b;
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
    cursor: pointer;
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

/* Profile View */
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

.btn-edit {
    align-self: flex-start;
    padding: 0.5rem 1rem;
    background: var(--color-navy-600);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
}

.btn-edit:hover {
    background: #003B6D;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
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

.skills-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.skill-tag {
    padding: 0.375rem 0.75rem;
    background: #e2e8f0;
    color: #1e293b;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
}

.experience-list,
.education-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.experience-item,
.education-item {
    padding: 1rem;
    background: #f8fafc;
    border-radius: 0.5rem;
    border-left: 3px solid var(--color-navy-400);
}

.experience-header,
.education-header {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    color: #1e293b;
}

.experience-dates,
.education-years {
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 0.5rem;
}

.education-degree {
    font-size: 0.875rem;
    color: #475569;
    margin-bottom: 0.25rem;
}

.experience-description {
    margin: 0.5rem 0 0;
    font-size: 0.875rem;
    color: #475569;
    line-height: 1.5;
}

.profile-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: #0a66c2;
    color: white;
    text-decoration: none;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.2s ease;
}

.profile-link:hover {
    background: #095a9e;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(10, 102, 194, 0.3);
}

/* Edit Form */
.edit-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
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

.form-input,
.form-textarea {
    padding: 0.75rem;
    border: 1px solid rgba(15, 23, 42, 0.2);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-family: inherit;
    transition: all 0.2s ease;
    outline: none;
}

.form-input:focus,
.form-textarea:focus {
    border-color: var(--color-navy-400);
    box-shadow: 0 0 0 3px rgba(102, 153, 204, 0.2);
}

.form-textarea {
    resize: vertical;
    min-height: 100px;
}

/* Profile Picture Upload */
.profile-picture-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
}

.profile-picture-preview {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
}

.profile-picture-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.profile-picture-placeholder {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 2rem;
}

.change-pic-btn {
    padding: 0.5rem 1rem;
    background: var(--color-navy-600);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.change-pic-btn:hover {
    background: var(--color-navy-700);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.file-input {
    position: absolute;
    width: 0;
    height: 0;
    opacity: 0;
    pointer-events: none;
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

.upload-error i {
    font-size: 1rem;
}

.form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(15, 23, 42, 0.1);
}

.btn-primary {
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
    gap: 0.5rem;
}

.btn-primary:hover:not(:disabled) {
    background: #003B6D;
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

.btn-secondary:hover {
    background: #e2e8f0;
}

@media (max-width: 768px) {
    .form-row {
        grid-template-columns: 1fr;
    }

    .profile-header {
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .btn-edit {
        align-self: center;
    }
}
</style>
