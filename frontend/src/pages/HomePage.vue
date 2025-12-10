<template>
  <div class="home-page">
    <!-- Search Section -->
    <div class="search-section">
      <div class="search-container">
        <!-- Smart Search Toggle Slider -->
        <div class="smart-search-toggle-container" v-if="viewMode === 'card'">
          <label class="toggle-label">
            <span>Smart Search</span>
            <div
              class="toggle-switch"
              :class="{ active: searchMode === 'semantic' }"
              @click="toggleSearchMode"
            >
              <div class="toggle-slider"></div>
            </div>
          </label>
        </div>
        <div class="search-input-wrapper">
          <input
            type="text"
            v-model="searchQuery"
            @input="handleSearchInput"
            @keydown="handleKeyDown"
            @focus="showAutocompleteDropdown = true"
            @blur="hideAutocomplete"
            :placeholder="
              viewMode === 'network'
                ? 'Use the search bar in card view only'
                : searchMode === 'semantic'
                ? 'Describe what you\'re looking for...'
                : 'Who are you looking for?...'
            "
            class="search-input"
            :class="{ 'semantic-mode': searchMode === 'semantic' }"
            :disabled="viewMode === 'network'"
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
                  selected: selectedAutocompleteIndex === index,
                },
              ]"
              @mousedown="selectSuggestion(suggestion)"
            >
              <i :class="['fa-solid', suggestion.icon, 'suggestion-icon']"></i>
              <span class="suggestion-label">{{ suggestion.label }}</span>
              <span v-if="suggestion.type !== 'name'" class="suggestion-hint"
                >Press Enter</span
              >
            </div>
          </div>
        </div>
        <button
          @click="triggerSearch"
          class="smart-search-btn"
          :class="{ active: searchMode === 'semantic' }"
          :disabled="
            semanticLoading || !searchQuery.trim() || viewMode === 'network'
          "
          title="Search"
        >
          <span>Search</span>
        </button>
        <button
          @click="toggleView"
          class="view-toggle-btn"
          :class="{ active: viewMode === 'network' }"
        >
          {{ viewMode === "card" ? "Network View" : "Card View" }}
        </button>
      </div>

      <!-- Active Filters and Search Mode Indicator -->
      <div class="search-meta">
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
                <p class="fa-solid fa-xmark">x</p>
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
      </div>
    </div>

    <!-- Content Area -->
    <div class="content-area">
      <!-- Card View -->
      <div v-if="viewMode === 'card'" class="card-view">
        <!-- Card View Controls -->
        <div
          v-if="!loading && !semanticLoading && displayedNodes.length > 0"
          class="card-view-controls"
        >
          <div class="controls-row">
            <div class="control-group">
              <label for="cards-per-row">Cards per Row:</label>
              <input
                id="cards-per-row"
                type="number"
                v-model.number="cardsPerRow"
                min="1"
                max="7"
                class="control-input"
              />
            </div>
            <div class="control-group">
              <label for="rows-per-page">Rows per Page:</label>
              <input
                id="rows-per-page"
                type="number"
                v-model.number="rowsPerPage"
                min="1"
                max="20"
                class="control-input"
              />
            </div>
          </div>
          <div class="connections-count">
            Showing {{ startIndex + 1 }}-{{ endIndex }} out of
            {{ displayedNodes.length }} connections
          </div>
        </div>

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
        <div v-else-if="displayedNodes.length === 0" class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No connections found</h3>
          <p>
            {{
              searchMode === "semantic"
                ? "Try a different search query or switch to text search"
                : "Try adjusting your search or add connections in Edit Network"
            }}
          </p>
        </div>
        <template v-else>
          <p
            v-if="searchMode === 'semantic' && semanticResults.length > 0"
            class="muted semantic-note"
          >
            Percentages show how strongly each result matches your query (higher
            = more similar).
          </p>
          <div
            class="cards-grid"
            :style="{
              gridTemplateColumns: `repeat(${cardsPerRow}, 1fr)`,
            }"
          >
            <ConnectionCard
              v-for="node in paginatedNodes"
              :key="node.id"
              :node="node"
              @click="openProfileModal(node.id)"
            />
          </div>
          <!-- Pagination Controls -->
          <div v-if="totalPages > 1" class="pagination-controls">
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              class="pagination-btn"
            >
              <i class="fa-solid fa-chevron-left"></i>
              Previous
            </button>
            <div class="page-input-group">
              <span>Page</span>
              <input
                type="number"
                v-model.number="pageInput"
                :min="1"
                :max="totalPages"
                @keyup.enter="goToPage(pageInput)"
                @blur="validateAndGoToPage"
                class="page-input"
              />
              <span>of {{ totalPages }}</span>
            </div>
            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="pagination-btn"
            >
              Next
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </template>
      </div>

      <!-- Network View -->
      <div v-else class="network-view">
        <NetworkDisplayVis
                    @edgeCreated="handleNetworkEdgeCreated"
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
          <div
            v-if="selectedProfileData && !isEditingProfile"
            class="profile-view"
          >
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
                <p v-if="selectedProfileData.headline" class="profile-headline">
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

              <!-- Location -->
              <div v-if="selectedProfileData.location" class="detail-section">
                <h3 class="detail-title">
                  <i class="fa-solid fa-map-marker-alt"></i>
                  Location
                </h3>
                <p>{{ selectedProfileData.location }}</p>
              </div>

              <!-- Industry -->
              <div v-if="selectedProfileData.industry" class="detail-section">
                <h3 class="detail-title">
                  <i class="fa-solid fa-industry"></i>
                  Industry
                </h3>
                <p>{{ selectedProfileData.industry }}</p>
              </div>

              <!-- Summary -->
              <div v-if="selectedProfileData.summary" class="detail-section">
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

              <!-- Education -->
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
                    v-for="(edu, index) in selectedProfileData.education"
                    :key="index"
                    class="education-item"
                  >
                    <p class="education-school">
                      <strong>{{ edu.school || "School" }}</strong>
                    </p>
                    <p
                      v-if="edu.degree || edu.fieldOfStudy"
                      class="education-degree"
                    >
                      {{
                        [edu.degree, edu.fieldOfStudy]

                          .filter(Boolean)

                          .join(", ")
                      }}
                    </p>
                    <p
                      v-if="edu.startYear || edu.endYear"
                      class="education-years"
                    >
                      {{ edu.startYear || "?" }} -

                      {{ edu.endYear || "Present" }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Experience -->
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
                    <p
                      v-if="exp.startDate || exp.endDate"
                      class="experience-dates"
                    >
                      {{ exp.startDate || "?" }} -

                      {{ exp.endDate || "Present" }}
                    </p>
                    <p v-if="exp.description" class="experience-description">
                      {{ exp.description }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Tags -->
              <div
                v-if="
                  selectedProfileData.tags &&
                  selectedProfileData.tags.length > 0
                "
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
              <div v-if="selectedProfileData.profileUrl" class="detail-section">
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
          <div
            v-if="selectedProfileData && isEditingProfile"
            class="edit-profile-form"
          >
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
                  <i class="fa-solid fa-user upload-icon"></i>
                  <p class="upload-text">No profile image</p>
                  <p class="upload-hint">Supports JPG, PNG, GIF (max 5MB)</p>
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
                    <i class="fa-solid fa-xmark">x</i>
                  </button>
                </div>

                <!-- Upload button moved outside the preview/placeholder -->
                <div class="upload-actions">
                  <button
                    type="button"
                    class="upload-btn"
                    @click.prevent="triggerFilePickerProfile"
                  >
                    <i class="fa-solid fa-cloud-arrow-up"></i>
                    Upload Image
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
import { useRoute, useRouter } from "vue-router";
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
const route = useRoute();
const router = useRouter();

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

// Card view pagination state
const cardsPerRow = ref(3);
const rowsPerPage = ref(4);
const currentPage = ref(1);
const pageInput = ref(1);

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
    .filter((location) => location.includes(query) || query.includes(location))
    .slice(0, 3);
  locationMatches.forEach((location) => {
    suggestions.push({
      type: "location",
      label: `Filter by location: ${location}`,
      value: location,
      icon: "fa-map-marker-alt",
    });
  });

  // Name search - prioritize actual names (exclude the current user's own profile)
  allNodes.value.forEach((node) => {
    if (node.id === auth.userId) return; // skip the owner's own profile
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
        const nameMatch = node.displayName.toLowerCase().includes(query);
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
          (source) => source.toLowerCase() === filter.value.toLowerCase()
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
          linkedInConn?.location || profile?.profile?.location || node.location;
        return location?.toLowerCase().includes(filter.value.toLowerCase());
      });
    }
  });

  // Exclude the owner's own node from card results (but keep it in the graph)
  const ownerId = auth.userId;
  if (ownerId) {
    results = results.filter((node) => node.id !== ownerId);
  }

  return results;
});

// Pagination computed properties
const cardsPerPage = computed(() => cardsPerRow.value * rowsPerPage.value);
const totalPages = computed(() => {
  if (displayedNodes.value.length === 0) return 1;
  return Math.ceil(displayedNodes.value.length / cardsPerPage.value);
});
const startIndex = computed(() => (currentPage.value - 1) * cardsPerPage.value);
const endIndex = computed(() => {
  const end = startIndex.value + cardsPerPage.value;
  return Math.min(end, displayedNodes.value.length);
});
const paginatedNodes = computed(() => {
  return displayedNodes.value.slice(startIndex.value, endIndex.value);
});

const selectedProfileData = computed(() => {
  if (!selectedProfileId.value) {
    return null;
  }

  // First check if it's a semantic search result
  const semanticResult = semanticResults.value.find(
    (r) => r.id === selectedProfileId.value
  );
  if (semanticResult) {
    const linkedInConn = linkedInConnections.value[selectedProfileId.value];
    const profile = nodeProfiles.value[selectedProfileId.value];
    const profileData = profile?.profile || {};

    return {
      id: semanticResult.id,
      displayName: semanticResult.displayName,
      firstName: linkedInConn?.firstName || profileData.firstName || "",
      lastName: linkedInConn?.lastName || profileData.lastName || "",
      headline: linkedInConn?.headline || profileData.headline || "",
      currentCompany:
        linkedInConn?.currentCompany ||
        profileData.currentCompany ||
        profileData.company ||
        semanticResult.company ||
        "",
      currentPosition:
        linkedInConn?.currentPosition ||
        profileData.currentPosition ||
        semanticResult.currentJob ||
        "",
      location:
        linkedInConn?.location ||
        profileData.location ||
        semanticResult.location ||
        "",
      industry: linkedInConn?.industry || profileData.industry || "",
      summary: linkedInConn?.summary || profileData.summary || "",
      profileUrl: linkedInConn?.profileUrl || profileData.profileUrl || "",
      avatarUrl: semanticResult.avatarUrl,
      initials: semanticResult.initials,
      skills: linkedInConn?.skills || profileData.skills || [],
      education: linkedInConn?.education || profileData.education || [],
      experience: linkedInConn?.experience || profileData.experience || [],
      tags: profileData.tags || [],
    };
  }

  // Otherwise, check allNodes (text search mode)
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
      linkedInConn?.currentPosition || profileData.currentPosition || "",
    location:
      linkedInConn?.location || profileData.location || node.location || "",
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
    // Don't auto-search when toggling - wait for user to click search button
  } else {
    searchMode.value = "text";
    semanticResults.value = [];
  }
}

function triggerSearch() {
  if (!searchQuery.value.trim()) return;

  if (searchMode.value === "semantic") {
    performSemanticSearch();
  } else {
    // For text mode, the search is already handled by filtering displayedNodes
    // This button click can be used to close autocomplete if needed
    showAutocompleteDropdown.value = false;
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
          avatarUrl =
            profileData.avatarUrl === avatarStore.DEFAULT_AVATAR
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
    // In semantic mode, do not auto-search on input.
    // Only clear results when the query is emptied; actual
    // search is triggered via Enter key or the search button.
    showAutocompleteDropdown.value = false;
    if (!searchQuery.value.trim()) {
      semanticResults.value = [];
    }
  }
}

function handleKeyDown(event: KeyboardEvent) {
  // Handle Enter key for both modes
  if (event.key === "Enter") {
    event.preventDefault();

    if (searchMode.value === "semantic") {
      // In semantic mode, trigger search on Enter
      triggerSearch();
      return;
    }

    // Text mode handling
    const suggestions = autocompleteSuggestions.value;
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
        (p) => p.toLowerCase() === query || p.toLowerCase().includes(query)
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
    return;
  }

  // Arrow keys and Escape only work in text mode
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
    addFilter(
      suggestion.type,

      getFilterLabel(suggestion.type),

      suggestion.value
    );
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
    (f) => f.type === type && f.value.toLowerCase() === value.toLowerCase()
  );

  if (!existingFilter) {
    activeFilters.value.push({ type, label, value });
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

function toggleView() {
  viewMode.value = viewMode.value === "card" ? "network" : "card";

  // Clear search query when switching to network view
  if (viewMode.value === "network") {
    searchQuery.value = "";
    semanticResults.value = [];
    showAutocompleteDropdown.value = false;
  }
}

// Pagination functions
function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    pageInput.value = page;
  }
}

function validateAndGoToPage() {
  let page = pageInput.value;
  if (page < 1) page = 1;
  if (page > totalPages.value) page = totalPages.value;
  goToPage(page);
}

// Watch for changes that should reset pagination
watch([displayedNodes, cardsPerRow, rowsPerPage], () => {
  // Reset to page 1 when filters/search change or pagination settings change
  currentPage.value = 1;
  pageInput.value = 1;
});

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  // Hide the image - the placeholder will show via v-else
  img.style.display = "none";
  const placeholder = img.parentElement?.querySelector(
    ".avatar-placeholder, .avatar-placeholder-large"
  ) as HTMLElement;
  if (placeholder) {
    placeholder.style.display = "flex";
  }
}

async function openProfileModal(nodeId: string) {
  selectedProfileId.value = nodeId;
  isEditingProfile.value = false;

  // Fetch profile data if not already available (especially for semantic search results)
  if (!nodeProfiles.value[nodeId] || !linkedInConnections.value[nodeId]) {
    try {
      await fetchNodeProfiles([nodeId]);
      // Also fetch LinkedIn connection data if available
      const profile = nodeProfiles.value[nodeId];
      if (profile?.profile?.profileUrl) {
        // Try to get LinkedIn connection data
        // This might need to be fetched separately if not already in linkedInConnections
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    }
  }
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

  if (
    !editProfileForm.value.firstName.trim() ||
    !editProfileForm.value.lastName.trim()
  ) {
    errorProfile.value = "First name and last name are required.";
    return;
  }

  savingProfile.value = true;
  errorProfile.value = null;

  try {
    const label =
      `${editProfileForm.value.firstName} ${editProfileForm.value.lastName}`.trim();
    const headline =
      editProfileForm.value.headline || editProfileForm.value.jobTitle || "";

    const updateMeta = {
      firstName: editProfileForm.value.firstName.trim(),
      lastName: editProfileForm.value.lastName.trim(),
      label: label,
      headline: headline,
      location: editProfileForm.value.location.trim() || undefined,
      currentCompany: editProfileForm.value.company.trim() || undefined,
      currentPosition: editProfileForm.value.jobTitle.trim() || undefined,
      avatarUrl: editProfileForm.value.avatarUrl || undefined,
      profilePictureUrl: editProfileForm.value.avatarUrl || undefined,
    };

    // Check if this is the user's own profile node
    const isOwnProfile = selectedProfileId.value === auth.userId;
    console.log("Saving profile:", {
      selectedProfileId: selectedProfileId.value,
      userId: auth.userId,
      isOwnProfile,
    });

    // Always ensure network exists first (this creates the node document and membership for userId->userId)
    // This is critical for the user's own profile node
    await MultiSourceNetworkAPI.createNetwork({
      owner: auth.userId,
      root: auth.userId,
    });

    // Try to update the node
    let nodeResult = await MultiSourceNetworkAPI.updateNode({
      node: selectedProfileId.value,
      updater: auth.userId,
      meta: updateMeta,
    });

    // If update fails, check the error type
    if (nodeResult.error) {
      const errorMsg = nodeResult.error.toLowerCase();

      // If node doesn't exist, we need to create it
      if (
        errorMsg.includes("not found") ||
        errorMsg.includes("does not exist")
      ) {
        if (isOwnProfile) {
          // For own profile, the node should already exist after createNetwork
          // But if it doesn't, we need to ensure it exists
          // The createNetwork should have created it, so this might be a timing issue
          // Retry after a short delay, or the node ID might be wrong
          console.warn(
            "Own profile node not found after createNetwork, retrying update..."
          );
          // Wait a moment and retry
          await new Promise((resolve) => setTimeout(resolve, 100));
          nodeResult = await MultiSourceNetworkAPI.updateNode({
            node: selectedProfileId.value,
            updater: auth.userId,
            meta: updateMeta,
          });
        } else {
          // For other nodes, create it using createNodeForUser
          try {
            const createResult = await MultiSourceNetworkAPI.createNodeForUser({
              owner: auth.userId,
              firstName: updateMeta.firstName,
              lastName: updateMeta.lastName,
              label: updateMeta.label,
              headline: updateMeta.headline,
              location: updateMeta.location,
              currentCompany: updateMeta.currentCompany,
              currentPosition: updateMeta.currentPosition,
              avatarUrl: updateMeta.avatarUrl,
            });

            // Node was created - if it has a different ID, we're done
            // Otherwise, try to update it
            if (
              createResult.node &&
              createResult.node !== selectedProfileId.value
            ) {
              // Node was created with new ID - reload to see it
            } else {
              // Try updating again
              nodeResult = await MultiSourceNetworkAPI.updateNode({
                node: selectedProfileId.value,
                updater: auth.userId,
                meta: updateMeta,
              });
            }
          } catch (createErr) {
            throw new Error(
              `Failed to create node: ${
                createErr instanceof Error
                  ? createErr.message
                  : String(createErr)
              }`
            );
          }
        }
      }
      // If authorization/membership error
      else if (
        errorMsg.includes("authorized") ||
        errorMsg.includes("membership") ||
        errorMsg.includes("not authorized")
      ) {
        // If the node is not the userId, try to add it to network
        if (!isOwnProfile) {
          try {
            await MultiSourceNetworkAPI.addNodeToNetwork({
              owner: auth.userId,
              node: selectedProfileId.value,
              source: "user",
            });
          } catch (e) {
            console.log(
              "Note: Could not add node to network (may already exist):",
              e
            );
          }
        }

        // Retry the update
        nodeResult = await MultiSourceNetworkAPI.updateNode({
          node: selectedProfileId.value,
          updater: auth.userId,
          meta: updateMeta,
        });
      }

      // If there's still an error after all retries
      if (nodeResult.error) {
        throw new Error(nodeResult.error);
      }
    }

    // Reload network data to refresh the profile
    await loadNetworkData();

    isEditingProfile.value = false;
  } catch (err) {
    console.error("Error saving profile:", err);
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Failed to save profile. Please try again.";
    errorProfile.value = errorMessage;
  } finally {
    savingProfile.value = false;
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

// Helper function to extract node data consistently for both search modes
function extractNodeData(nodeId: string): {
  displayName: string;
  avatarUrl: string;
  location?: string;
  currentJob?: string;
  company?: string;
} {
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

    // For root node (current user), prioritize profile picture from PublicProfile
    if (nodeId === auth.userId) {
      const publicProfile = profile as PublicProfile | undefined;
      if (publicProfile?.profilePictureUrl) {
        avatarUrl = publicProfile.profilePictureUrl;
      } else {
        // Use empty string if avatar is default so initials will show
        avatarUrl =
          profileData.avatarUrl === avatarStore.DEFAULT_AVATAR
            ? ""
            : profileData.avatarUrl;
      }
    } else {
      // Use empty string if avatar is default so initials will show
      avatarUrl =
        profileData.avatarUrl === avatarStore.DEFAULT_AVATAR
          ? ""
          : profileData.avatarUrl;
    }
    location = profile.location;
    currentJob = profile.currentPosition || profile.headline;
    company = profile.company || profile.currentCompany;
  }

  return {
    displayName,
    avatarUrl,
    location,
    currentJob,
    company,
  };
}

async function fetchNodeProfiles(
  nodeIds: string[],

  forceRefresh: string[] = []
) {
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

function handleNetworkEdgeCreated() {
    // Reload network data to reflect the new edge
    loadNetworkData();
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
            (nd.avatarUrl as string) ||
            avatarStore.getLetterAvatar(nd.label || nd.firstName || id),
          username: (nd.label as string) || id,
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

      // Use the same extraction logic as semantic search
      const nodeData = extractNodeData(nodeId);

      // Update nodeProfiles cache if we have LinkedIn connection data
      if (linkedInConn) {
        nodeProfiles.value[nodeId] = {
          profile: {
            headline: linkedInConn.headline,
            company: linkedInConn.currentCompany,
            location: linkedInConn.location,
          },
          avatarUrl: nodeData.avatarUrl,
          username: nodeData.displayName,
        };
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
        (nodeProfiles.value[nodeId]?.profile as any)?.membershipSources || {};
      Object.keys(membershipSources).forEach((s) => {
        if (s) sources.add(s);
      });

      nodes.push({
        id: nodeId,
        displayName: nodeData.displayName,
        username: nodeProfiles.value[nodeId]?.username,
        avatarUrl: nodeData.avatarUrl,
        initials: getInitials(nodeData.displayName),
        location: nodeData.location,
        currentJob: nodeData.currentJob,
        company: nodeData.company,
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
  if (newMode === "text") {
    semanticResults.value = [];
  }
  // Don't auto-search when switching to semantic mode
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
  window.addEventListener(
    "profilePictureUpdated",
    handleProfilePictureUpdate as EventListener
  );

    // Check for nodeId in query params to open profile modal
    if (route.query.nodeId && typeof route.query.nodeId === "string") {
        openProfileModal(route.query.nodeId);
        // Clean up query param
        router.replace({ query: {} });
    }
});

// Watch for route changes to handle nodeId query param
watch(() => route.query.nodeId, (nodeId) => {
    if (nodeId && typeof nodeId === "string") {
        openProfileModal(nodeId);
        // Clean up query param
        router.replace({ query: {} });
    }
});

onBeforeUnmount(() => {
  window.removeEventListener(
    "profilePictureUpdated",
    handleProfilePictureUpdate as EventListener
  );
});
</script>

<style scoped>
.home-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.search-section {
  margin-bottom: 1.5rem;
}

.search-container {
  display: flex;
  gap: 1.25rem;
  align-items: center;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 1rem 1.25rem;
  padding-right: 2.5rem;
  font-size: 1.05rem;
  border: 1px solid rgba(15, 23, 42, 0.2);
  border-radius: 0.75rem;
  background: white;
  transition: all 0.2s ease;
  outline: none;
}

.search-input:focus {
  border-color: var(--color-navy-400);
  box-shadow: 0 0 0 3px rgba(102, 153, 204, 0.2);
}

.search-input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.7;
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
  padding: 1rem 1.6rem;
  background: white;
  border: 1px solid rgba(15, 23, 42, 0.2);
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-navy-900);
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.smart-search-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: var(--color-navy-400);
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
  padding: 1rem 1.6rem;
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

.smart-search-toggle-container {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.toggle-label {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  user-select: none;
}

.toggle-switch {
  position: relative;
  width: 48px;
  height: 24px;
  background: #cbd5e1;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  flex-shrink: 0;
}

.toggle-switch.active {
  background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-slider {
  transform: translateX(24px);
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

.active-filters-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
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

.card-view-controls {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
}

.controls-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.control-group label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
}

.control-input {
  width: 80px;
  padding: 0.5rem;
  border: 1px solid rgba(15, 23, 42, 0.2);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  text-align: center;
  transition: all 0.2s ease;
  outline: none;
}

.control-input:focus {
  border-color: var(--color-navy-400);
  box-shadow: 0 0 0 3px rgba(102, 153, 204, 0.2);
}

.connections-count {
  font-size: 0.8125rem;
  color: #64748b;
  font-weight: 500;
}

.cards-grid {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 0;
  margin-top: 2rem;
  border-top: 1px solid #e2e8f0;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid rgba(15, 23, 42, 0.2);
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-navy-900);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pagination-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: var(--color-navy-400);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.page-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #1e293b;
}

.page-input {
  width: 60px;
  padding: 0.5rem;
  border: 1px solid rgba(15, 23, 42, 0.2);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  text-align: center;
  transition: all 0.2s ease;
  outline: none;
}

.page-input:focus {
  border-color: var(--color-navy-400);
  box-shadow: 0 0 0 3px rgba(102, 153, 204, 0.2);
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
  /* increased size for better visibility */
  width: 240px;
  height: 240px;
  border-radius: 50%;
  overflow: hidden;
  background: #dbeafe;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 6px solid #e2e8f0;
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
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
}

.detail-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.detail-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 160px;
}

.detail-title i {
  font-size: 0.875rem;
  color: var(--color-navy-600);
}

/* Align detail content in a clean column next to labels */
.detail-section > p,
.detail-section > div {
  margin: 0;
  flex: 1 1 auto;
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
  background: #e6f4ff;
  color: #003b6d;
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
  background: #cfe9ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(2, 6, 23, 0.06);
  color: #002b54;
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

.modal-body .edit-profile-form .form-actions .btn-primary {
  background: #003b6d;
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(2, 6, 23, 0.08);
}

.modal-body .edit-profile-form .form-actions .btn-primary:hover:not(:disabled) {
  background: #e6f4ff;
  color: #003b6d;
  transform: translateY(-1px);
}

.upload-area {
  position: relative;
  border: 2px dashed rgba(15, 23, 42, 0.2);
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  /* show a light-blue background when no image is present */
  background: #e6f4ff;
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
  color: #0f172a;
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
  background: #f8fafc;
}

.upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.modal-body .edit-profile-form .upload-preview {
  /* double the small preview (was 96px) to improve visibility */
  width: 192px;
  height: 192px;
  aspect-ratio: 1;
  border-radius: 50%;
  margin: 0 auto 1rem;
  /* allow the remove button to overlap the preview without being clipped */
  overflow: visible;
}

.modal-body .edit-profile-form .upload-preview img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.modal-body .edit-profile-form .remove-image-btn {
  position: absolute;
  /* move further out to match larger preview */
  top: -12px;
  right: -12px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  /* red circular button */
  background: #ef4444;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.14);
  z-index: 60;
  transition: transform 120ms ease, background 120ms ease;
}

.remove-image-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.12s ease;
}

.remove-image-btn:hover {
  background: #dc2626;
  color: white;
  transform: translateY(-2px) scale(1.02);
}

/* Upload actions button below preview/placeholder */
.upload-actions {
  margin-top: 0.75rem;
  display: flex;
  justify-content: center;
}

.upload-btn {
  padding: 0.5rem 1rem;
  background: #003b6d; /* dark blue */
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.15s ease;
}

.upload-btn:hover:not(:disabled) {
  background: #e6f4ff; /* light blue on hover */
  color: #003b6d;
  transform: translateY(-1px);
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
