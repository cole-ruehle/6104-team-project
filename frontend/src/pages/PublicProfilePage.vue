<template>
  <div class="profile-page">
    <section class="profile-actions card">
      <h2 style="margin-top: 0">Profile actions</h2>
      <p class="muted">Manage your public profile.</p>
      <div class="action-buttons">
        <button type="button" @click="showCreateModal = true">
          Create Profile
        </button>
        <button type="button" @click="showUpdateModal = true">
          Update Profile
        </button>
      </div>
    </section>

    <section class="profile-main card">
      <div class="search-hero">
        <RouterLink class="network-button" to="/network">View My Network</RouterLink>
        <p class="muted" style="margin: 0.5rem 0; font-size: 0.9rem;">
          You can see people on our application by searching their username.
        </p>
        <form class="search-form" @submit.prevent="searchConnections">
          <input
            class="search-input"
            v-model.trim="inspectUser"
            :disabled="inspectLoading"
            placeholder="Describe the connection you're looking for..."
            placeholder="Search by username..."
            required
          />
          <button type="submit" :disabled="inspectLoading">
            {{ inspectLoading ? "Searching…" : "Search" }}
          </button>
        </form>
      </div>

      <StatusBanner
        v-if="banner && banner.section === 'inspect'"
        :type="banner.type"
        :message="banner.message"
      />

      <p v-if="inspectResult" class="muted" style="margin: 0.75rem 0">
        {{ inspectResult }}
      </p>

      <div v-if="connectionResults.length" class="connection-results">
        <article
          v-for="result in connectionResults"
          :key="result.connectionId"
          class="connection-card"
        >
          <header class="connection-card__header">
            <div>
              <h3>{{ connectionDisplayName(result.connection) }}</h3>
              <p class="muted" v-if="result.connection?.headline">
                {{ result.connection?.headline }}
              </p>
            </div>
            <span class="score-pill">{{ result.score.toFixed(3) }}</span>
          </header>
          <p v-if="result.connection?.currentPosition || result.connection?.currentCompany">
            {{ result.connection?.currentPosition || "" }}
            <template v-if="result.connection?.currentCompany">
              · {{ result.connection?.currentCompany }}
            </template>
          </p>
          <p class="muted" v-if="result.connection?.location">
            {{ result.connection.location }}
          </p>
          <p class="snippet" v-if="result.text">
            {{ result.text }}
          </p>
          <div class="result-links">
            <a
              v-if="result.connection?.profileUrl"
              :href="result.connection.profileUrl"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn profile →
            </a>
          </div>
        </article>
      </div>
    </section>

    <section class="profile-main card" style="margin-top: 1.5rem">
      <h2 style="margin-top: 0">Semantic Search</h2>
      <p class="muted" style="font-style: italic; margin-bottom: 1rem;">
        🚧 Still under construction - Semantic search functionality is being developed.
      </p>
      <form class="search-form" @submit.prevent="searchConnections">
        <input
          class="search-input"
          v-model.trim="semanticQuery"
          :disabled="semanticLoading"
          placeholder="Describe the connection you're looking for..."
          required
        />
        <button type="submit" :disabled="semanticLoading">
          {{ semanticLoading ? "Searching…" : "Search" }}
        </button>
      </form>
      <StatusBanner
        v-if="banner && banner.section === 'semantic'"
        :type="banner.type"
        :message="banner.message"
      />
      <div v-if="semanticResults.length" class="connection-results" style="margin-top: 1rem">
        <article
          v-for="result in semanticResults"
          :key="result.connectionId"
          class="connection-card"
        >
          <header class="connection-card__header">
            <div>
              <h3>{{ connectionDisplayName(result.connection) }}</h3>
              <p class="muted" v-if="result.connection?.headline">
                {{ result.connection?.headline }}
              </p>
            </div>
            <span class="score-pill">{{ result.score.toFixed(3) }}</span>
          </header>
          <p v-if="result.connection?.currentPosition || result.connection?.currentCompany">
            {{ result.connection?.currentPosition || "" }}
            <template v-if="result.connection?.currentCompany">
              · {{ result.connection?.currentCompany }}
            </template>
          </p>
          <p class="muted" v-if="result.connection?.location">
            {{ result.connection.location }}
          </p>
          <p class="snippet" v-if="result.text">
            {{ result.text }}
          </p>
          <div class="result-links">
            <a
              v-if="result.connection?.profileUrl"
              :href="result.connection.profileUrl"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn profile →
            </a>
          </div>
        </article>
      </div>
    </section>

    <section class="profile-main card" style="margin-top: 1.5rem">
      <h2 style="margin-top: 0">Semantic Search</h2>
      <p class="muted" style="font-style: italic; margin-bottom: 1rem;">
        🚧 Still under construction - Semantic search functionality is being developed.
      </p>
      <form class="search-form" @submit.prevent="searchConnections">
        <input
          class="search-input"
          v-model.trim="semanticQuery"
          :disabled="semanticLoading"
          placeholder="Describe the connection you're looking for..."
          required
        />
        <button type="submit" :disabled="semanticLoading">
          {{ semanticLoading ? "Searching…" : "Search" }}
        </button>
      </form>
      <StatusBanner
        v-if="banner && banner.section === 'semantic'"
        :type="banner.type"
        :message="banner.message"
      />
      <div v-if="semanticResults.length" class="connection-results" style="margin-top: 1rem">
        <article
          v-for="result in semanticResults"
          :key="result.connectionId"
          class="connection-card"
        >
          <header class="connection-card__header">
            <div>
              <h3>{{ connectionDisplayName(result.connection) }}</h3>
              <p class="muted" v-if="result.connection?.headline">
                {{ result.connection?.headline }}
              </p>
            </div>
            <span class="score-pill">{{ result.score.toFixed(3) }}</span>
          </header>
          <p v-if="result.connection?.currentPosition || result.connection?.currentCompany">
            {{ result.connection?.currentPosition || "" }}
            <template v-if="result.connection?.currentCompany">
              · {{ result.connection?.currentCompany }}
            </template>
          </p>
          <p class="muted" v-if="result.connection?.location">
            {{ result.connection.location }}
          </p>
          <p class="snippet" v-if="result.text">
            {{ result.text }}
          </p>
          <div class="result-links">
            <a
              v-if="result.connection?.profileUrl"
              :href="result.connection.profileUrl"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn profile →
            </a>
          </div>
        </article>
      </div>
    </section>

  </div>

  <div class="modal-overlay" v-if="showCreateModal">
    <div class="modal-card half">
      <button class="close-btn" type="button" @click="showCreateModal = false">×</button>
      <h2>Create Your Public Profile</h2>
      <p class="muted">
        Logged in as <strong>{{ activeUsername }}</strong>
      </p>
      <StatusBanner
        v-if="banner && banner.section === 'create'"
        :type="banner.type"
        :message="banner.message"
      />
      <form class="form-grid" @submit.prevent="handleCreateProfile">
        <label>
          Headline
          <input v-model.trim="createForm.headline" required />
        </label>
        <label>
          Attributes (comma separated)
          <input
            v-model="createForm.attributes"
            placeholder="Go-to connector, Product leader, Startup mentor"
          />
        </label>
        <label>
          Links (comma separated URLs)
          <input
            v-model="createForm.links"
            placeholder="https://example.com, https://linkedin.com/in/me"
          />
        </label>
        <div class="modal-actions">
          <button type="button" class="muted-btn" @click="showCreateModal = false">
            Cancel
          </button>
          <button type="submit">Create Profile</button>
        </div>
      </form>
    </div>
  </div>

  <div class="modal-overlay" v-if="showUpdateModal">
    <div class="modal-card half">
      <button class="close-btn" type="button" @click="showUpdateModal = false">×</button>
      <h2>Update Your Profile</h2>
      <p class="muted">
        Only fill the fields you want to change. Leave blank to keep existing data.
      </p>
      <StatusBanner
        v-if="banner && banner.section === 'update'"
        :type="banner.type"
        :message="banner.message"
      />
      <form class="form-grid" @submit.prevent="handleUpdateProfile">
        <label>
          Headline
          <input v-model="updateForm.headline" placeholder="New headline" />
        </label>
        <label>
          Attributes (comma separated)
          <input
            v-model="updateForm.attributes"
            placeholder="Leave blank to skip"
          />
        </label>
        <label>
          Links (comma separated URLs)
          <input v-model="updateForm.links" placeholder="Leave blank to skip" />
        </label>
        <div class="modal-actions">
          <button type="button" class="muted-btn" @click="showUpdateModal = false">
            Cancel
          </button>
          <button type="submit">Update Profile</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from "vue";
import { RouterLink } from "vue-router";
import StatusBanner from "@/components/StatusBanner.vue";
import {
  PublicProfileAPI,
  SemanticSearchAPI,
  UserAuthenticationAPI,
  type SemanticConnectionResult,
  ConceptApiError,
  SemanticSearchAPI,
  type SemanticConnectionResult,
  type LinkedInConnectionPreview,
} from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";

type Section = "create" | "update" | "inspect" | "semantic";

const auth = useAuthStore();
const activeUserId = computed(() => auth.userId ?? "");
const activeUsername = computed(() => auth.username ?? "");

const updateForm = reactive({
  headline: "",
  attributes: "",
  links: "",
});

const createForm = reactive({
  headline: "",
  attributes: "",
  links: "",
});

const inspectUser = ref("");
const inspectLoading = ref(false);
const connectionResults = ref<SemanticConnectionResult[]>([]);
const inspectResult = ref("");
const banner = ref<{ section: Section; type: "success" | "error"; message: string } | null>(null);
const showCreateModal = ref(false);
const showUpdateModal = ref(false);
const semanticQuery = ref("");
const semanticLoading = ref(false);
const semanticResults = ref<SemanticConnectionResult[]>([]);

function showBanner(section: Section, type: "success" | "error", message: string) {
  banner.value = { section, type, message };
}

function parseList(value: string) {
  return value
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function log(_conceptAction: string, _payload: Record<string, unknown>, status: "success" | "error", message: string, section: Section) {
  showBanner(section, status, message);
}

async function handleCreateProfile() {
  const payload = {
    user: activeUserId.value,
    headline: createForm.headline,
    attributes: parseList(createForm.attributes),
    links: parseList(createForm.links),
  };
  try {
    await PublicProfileAPI.createProfile(payload);
    log("createProfile", payload, "success", "Profile created.", "create");
    createForm.headline = "";
    createForm.attributes = "";
    createForm.links = "";
    showCreateModal.value = false;
  } catch (error) {
    log("createProfile", payload, "error", formatError(error), "create");
  }
}

async function handleUpdateProfile() {
  const payload: {
    user: string;
    headline?: string;
    attributes?: string[];
    links?: string[];
  } = { user: activeUserId.value };

  if (updateForm.headline.trim()) payload.headline = updateForm.headline.trim();
  if (updateForm.attributes.trim()) payload.attributes = parseList(updateForm.attributes);
  if (updateForm.links.trim()) payload.links = parseList(updateForm.links);

  try {
    await PublicProfileAPI.updateProfile(payload);
    log("updateProfile", payload, "success", "Profile updated.", "update");
    updateForm.headline = "";
    updateForm.attributes = "";
    updateForm.links = "";
    showUpdateModal.value = false;
  } catch (error) {
    log("updateProfile", payload, "error", formatError(error), "update");
  }
}

function connectionDisplayName(connection?: LinkedInConnectionPreview) {
  if (!connection) return "Unknown connection";
  const parts = [connection.firstName, connection.lastName]
    .map((part) => part?.trim())
    .filter(Boolean);
  if (parts.length) {
    return parts.join(" ");
  }
  return connection.linkedInConnectionId ?? "LinkedIn connection";
}

async function searchConnections() {
  const query = inspectUser.value.trim();
  if (!query) return;
  if (!activeUserId.value) {
    log(
      "searchConnections",
      {},
      "error",
      "You must be signed in to search your network.",
      "inspect",
    );
    return;
  }

  inspectLoading.value = true;
  connectionResults.value = [];
  inspectResult.value = "";
  const payload = {
    owner: activeUserId.value,
    queryText: query,
    limit: 10,
  };

  avatarUrl.value = null;

  let targetId: string | null = null;

  // If it's the current user's username, use their ID
  if (inspectUser.value === activeUsername.value) {
    targetId = activeUserId.value;
  } else {
    // Try to resolve username to user ID
    try {
      const userResult = await UserAuthenticationAPI.getUserByUsername({
        username: inspectUser.value,
      });
      if (userResult.length > 0) {
        targetId = userResult[0].user;
      } else {
        // If username lookup fails, try using the input as user ID directly
        targetId = inspectUser.value;
      }
    } catch (error) {
      // If username lookup fails, assume it's already a user ID
      console.log("Username lookup failed, treating as user ID:", error);
      targetId = inspectUser.value;
    }
  }

  if (!targetId) {
    inspectResult.value = `User "${inspectUser.value}" not found.`;
    inspectLoading.value = false;
    return;
  }

  const payload = { user: targetId };
  try {
    const { results } = await SemanticSearchAPI.searchConnections(payload);
    connectionResults.value = results;
    inspectResult.value = results.length === 0
      ? "No matching connections yet. Try a different description."
      : `Showing ${results.length} semantic match${results.length === 1 ? "" : "es"}.`;
    log("searchConnections", payload, "success", "Network search completed.", "inspect");
    const result = await PublicProfileAPI.getProfile(payload);
    if (result.length === 0) {
      inspectResult.value = `No profile found for "${inspectUser.value}".`;
      avatarUrl.value = null;
    } else {
      fetchedProfile.value = result[0].profile;
      inspectResult.value = "";
      const { profilePictureUrl, user } = result[0].profile as PublicProfile & {
        profilePictureUrl?: string;
        user?: string;
      };
      if (user) {
        // Set avatar for the fetched user
        if (profilePictureUrl) {
          avatarStore.setForUser(user, profilePictureUrl);
          avatarUrl.value = avatarStore.getForUser(user);
        } else {
          // Clear avatar if no profile picture
          avatarUrl.value = null;
        }
      }
    }
    log("_getProfile", payload, "success", "Profile fetched.", "inspect");
  } catch (error) {
    connectionResults.value = [];
    inspectResult.value = `Error fetching profile: ${formatError(error)}`;
    avatarUrl.value = null;
    log("searchConnections", payload, "error", formatError(error), "inspect");
  } finally {
    inspectLoading.value = false;
  }
}

function formatError(error: unknown) {
  if (error instanceof ConceptApiError) {
    return error.message;
  }
  return "Unexpected error. Check console for details.";
}

async function searchConnections() {
  const query = semanticQuery.value.trim();
  if (!query) return;
  if (!activeUserId.value) {
    log(
      "searchConnections",
      {},
      "error",
      "You must be signed in to search your network.",
      "semantic",
    );
    return;
  }

  semanticLoading.value = true;
  semanticResults.value = [];
  const payload = {
    owner: activeUserId.value,
    queryText: query,
    limit: 10,
  };

  try {
    const { results } = await SemanticSearchAPI.searchConnections(payload);
    semanticResults.value = results;
    log(
      "searchConnections",
      payload,
      "success",
      results.length === 0
        ? "No matching connections found."
        : `Found ${results.length} semantic match${results.length === 1 ? "" : "es"}.`,
      "semantic",
    );
  } catch (error) {
    semanticResults.value = [];
    log("searchConnections", payload, "error", formatError(error), "semantic");
  } finally {
    semanticLoading.value = false;
  }
}

function connectionDisplayName(connection?: SemanticConnectionResult["connection"]): string {
  if (!connection) return "Unknown Connection";
  const firstName = connection.firstName || "";
  const lastName = connection.lastName || "";
  const name = `${firstName} ${lastName}`.trim();
  return name || "Unknown Connection";
}

watch(
  () => auth.username,
  (next) => {
    if (next) {
      inspectUser.value = next;
    }
  },
  { immediate: true },
);
</script>
