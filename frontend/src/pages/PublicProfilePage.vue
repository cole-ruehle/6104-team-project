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
      <div class="result-profile-picture" v-if="avatarUrl">
        <img :src="avatarUrl" alt="Profile avatar" />
      </div>
      <div class="search-hero">
        <RouterLink class="network-button" to="/network">View My Network</RouterLink>
        <form class="search-form" @submit.prevent="fetchProfile">
          <input
            class="search-input"
            v-model.trim="inspectUser"
            :disabled="inspectLoading"
            placeholder="Who are you looking for?..."
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

      <article v-if="fetchedProfile" class="profile-result">
        <h3>{{ fetchedProfile.headline }}</h3>
        <div>
          <strong>Attributes:</strong>
          <p>{{ fetchedProfile.attributes.join(", ") || "—" }}</p>
        </div>
        <div>
          <strong>Links:</strong>
          <ul>
            <li v-for="link in fetchedProfile.links" :key="link">
              <a :href="link" target="_blank" rel="noreferrer">{{ link }}</a>
            </li>
          </ul>
        </div>
      </article>
      <p v-else-if="inspectResult" class="muted" style="margin-top: 1rem">
        {{ inspectResult }}
      </p>
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
  type PublicProfile,
  ConceptApiError,
} from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAvatarStore } from "@/stores/useAvatarStore";

type Section = "create" | "update" | "inspect";

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
const fetchedProfile = ref<PublicProfile | null>(null);
const inspectResult = ref("");
const banner = ref<{ section: Section; type: "success" | "error"; message: string } | null>(null);
const avatarStore = useAvatarStore();
const showCreateModal = ref(false);
const showUpdateModal = ref(false);
const avatarUrl = ref<string | null>(null);

function showBanner(section: Section, type: "success" | "error", message: string) {
  banner.value = { section, type, message };
}

function parseList(value: string) {
  return value
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function log(conceptAction: string, payload: Record<string, unknown>, status: "success" | "error", message: string, section: Section) {
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

async function fetchProfile() {
  if (!inspectUser.value) return;
  inspectLoading.value = true;
  fetchedProfile.value = null;
  inspectResult.value = "";
  const targetId = inspectUser.value === activeUsername.value
    ? activeUserId.value
    : inspectUser.value;
  const payload = { user: targetId };
  try {
    const result = await PublicProfileAPI.getProfile(payload);
    if (result.length === 0) {
      inspectResult.value = "No profile found for this user.";
      avatarUrl.value = null;
    } else {
      fetchedProfile.value = result[0].profile;
      inspectResult.value = "";
      const { profilePictureUrl, user } = result[0].profile as PublicProfile & {
        profilePictureUrl?: string;
        user?: string;
      };
      if (user) {
        avatarStore.setForUser(user, profilePictureUrl);
        avatarUrl.value = avatarStore.getForUser(user);
      }
    }
    log("_getProfile", payload, "success", "Profile fetched.", "inspect");
  } catch (error) {
    inspectResult.value = "";
    log("_getProfile", payload, "error", formatError(error), "inspect");
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
