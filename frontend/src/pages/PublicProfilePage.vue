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
        <RouterLink class="network-button" to="/network"
          >View My Network</RouterLink
        >
        <form class="search-form" @submit.prevent="searchConnections">
          <input
            class="search-input"
            v-model.trim="inspectUser"
            :disabled="inspectLoading"
            placeholder="Describe the connection you're looking for..."
            required
          />
          <button type="submit" :disabled="inspectLoading">
            {{ inspectLoading ? "Searching" : "Search" }}
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

      <div v-if="uniqueConnectionResults.length" class="connection-results">
        <article
          v-for="result in uniqueConnectionResults.filter((r) => r.connection)"
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
          <p
            v-if="
              result.connection?.currentPosition ||
              result.connection?.currentCompany
            "
          >
            {{ result.connection?.currentPosition || "" }}
            <template v-if="result.connection?.currentCompany">
              at {{ result.connection.currentCompany }}
            </template>
          </p>

          <p v-if="result.connection?.summary">
            {{ result.connection.summary }}
          </p>

          <p v-if="result.connection?.profileUrl">
            <a
              :href="result.connection.profileUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on LinkedIn
            </a>
          </p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import StatusBanner from "../components/StatusBanner.vue";
import { useAuthStore } from "../stores/useAuthStore";
import { SemanticSearchAPI } from "../services/conceptClient";
const auth = useAuthStore();

const showCreateModal = ref(false);
const showUpdateModal = ref(false);

const inspectUser = ref("");
const inspectLoading = ref(false);
const inspectResult = ref<string | null>(null);

type BannerSection = "inspect" | "profile";
type BannerType = "info" | "success" | "error";

const banner = ref<{
  section: BannerSection;
  type: BannerType;
  message: string;
} | null>(null);

interface LinkedInConnectionPreview {
  _id: string;
  firstName?: string;
  lastName?: string;
  headline?: string | null;
  location?: string | null;
  industry?: string | null;
  currentPosition?: string | null;
  currentCompany?: string | null;
  profileUrl?: string | null;
  profilePictureUrl?: string | null;
  summary?: string | null;
}

interface SemanticConnectionResult {
  connectionId: string;
  score: number;
  text: string;
  connection?: LinkedInConnectionPreview;
}

const connectionResults = ref<SemanticConnectionResult[]>([]);

const uniqueConnectionResults = computed(() => {
  const seen = new Set<string>();
  const out: SemanticConnectionResult[] = [];
  for (const r of connectionResults.value) {
    const id = r.connectionId || r.connection?._id;
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out;
});

const currentUserId = computed(() => auth.userId || "");

function setBanner(section: BannerSection, type: BannerType, message: string) {
  banner.value = { section, type, message };
}

function clearBanner(section: BannerSection) {
  if (banner.value && banner.value.section === section) {
    banner.value = null;
  }
}

function connectionDisplayName(connection?: LinkedInConnectionPreview) {
  if (!connection) return "Unknown connection";
  const first = connection.firstName?.trim();
  const last = connection.lastName?.trim();
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return "Unknown connection";
}

async function searchConnections() {
  clearBanner("inspect");
  inspectResult.value = null;
  connectionResults.value = [];

  const owner = currentUserId.value;
  if (!owner) {
    setBanner(
      "inspect",
      "error",
      "You must be signed in to search your network."
    );
    return;
  }

  const queryText = inspectUser.value.trim();
  if (!queryText) {
    setBanner("inspect", "error", "Please enter a description to search.");
    return;
  }

  inspectLoading.value = true;
  try {
    const { results } = await SemanticSearchAPI.searchConnections({
      owner,
      queryText,
      limit: 20,
    });

    connectionResults.value = results ?? [];

    if (!connectionResults.value.length) {
      setBanner(
        "inspect",
        "info",
        "No semantic matches found in your network for this description."
      );
      inspectResult.value = null;
    } else {
      setBanner(
        "inspect",
        "success",
        `Network search completed. Showing ${connectionResults.value.length} semantic matches.`
      );
      inspectResult.value = null;
    }
  } catch (error) {
    console.error("searchConnections error", error);
    setBanner(
      "inspect",
      "error",
      "Something went wrong while searching your network."
    );
  } finally {
    inspectLoading.value = false;
  }
}
</script>
