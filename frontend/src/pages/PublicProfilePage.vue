<template>
  <div class="page-grid">
    <section class="card">
      <h2>Create Your Public Profile</h2>
      <p class="muted">
        Logged in as <strong>{{ auth.username }}</strong> (ID: {{ activeUserId }})
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
        <button type="submit">Create Profile</button>
      </form>
    </section>

    <section class="card">
      <h2>Update Your Profile</h2>
      <p class="muted">
        Only fill the fields you want to change. Leave a field blank to keep the
        current value.
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
        <button type="submit">Update Profile</button>
      </form>
    </section>

    <section class="card">
      <h2>Delete Profile</h2>
      <StatusBanner
        v-if="banner && banner.section === 'delete'"
        :type="banner.type"
        :message="banner.message"
      />
      <form class="form-grid" @submit.prevent="handleDeleteProfile">
        <button type="submit" style="background: linear-gradient(120deg, #ef4444, #f97316)">
          Delete Profile
        </button>
      </form>
    </section>

    <section class="card" style="grid-column: 1 / -1">
      <h2>Profile Inspector</h2>
      <p class="muted">
        Query the concept to verify that changes landed in MongoDB.
      </p>
      <StatusBanner
        v-if="banner && banner.section === 'inspect'"
        :type="banner.type"
        :message="banner.message"
      />
      <form class="form-grid" @submit.prevent="fetchProfile">
        <label>
          User ID
          <input v-model.trim="inspectUser" required />
        </label>
        <button type="submit" :disabled="inspectLoading">
          {{ inspectLoading ? "Fetching…" : "Fetch Profile" }}
        </button>
      </form>

      <article v-if="fetchedProfile" class="list-item" style="margin-top: 1.5rem">
        <h3 style="margin-top: 0">{{ fetchedProfile.headline }}</h3>
        <p class="muted">User: {{ fetchedProfile.user }}</p>
        <p>
          <strong>Attributes:</strong>
          {{ fetchedProfile.attributes.join(", ") || "—" }}
        </p>
        <p>
          <strong>Links:</strong>
        </p>
        <ul>
          <li v-for="link in fetchedProfile.links" :key="link">
            <a :href="link" target="_blank" rel="noreferrer">{{ link }}</a>
          </li>
        </ul>
      </article>
      <p v-else-if="inspectResult" class="muted" style="margin-top: 1rem">
        {{ inspectResult }}
      </p>
    </section>

    <ActivityLog :entries="activityLog.recent" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from "vue";
import StatusBanner from "@/components/StatusBanner.vue";
import ActivityLog from "@/components/ActivityLog.vue";
import {
  PublicProfileAPI,
  type PublicProfile,
  ConceptApiError,
} from "@/services/conceptClient";
import { useActivityLogStore } from "@/stores/useActivityLog";
import { useAuthStore } from "@/stores/useAuthStore";

type Section = "create" | "update" | "delete" | "inspect";

const auth = useAuthStore();
const activeUserId = computed(() => auth.userId ?? "");

const createForm = reactive({
  headline: "",
  attributes: "",
  links: "",
});

const updateForm = reactive({
  headline: "",
  attributes: "",
  links: "",
});

const inspectUser = ref("");
const inspectLoading = ref(false);
const fetchedProfile = ref<PublicProfile | null>(null);
const inspectResult = ref("");
const banner = ref<{ section: Section; type: "success" | "error"; message: string } | null>(null);
const activityLog = useActivityLogStore();

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
  activityLog.push({
    concept: "PublicProfile",
    action: conceptAction,
    payload,
    status,
    message,
  });
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
  } catch (error) {
    log("updateProfile", payload, "error", formatError(error), "update");
  }
}

async function handleDeleteProfile() {
  const payload = { user: activeUserId.value };
  try {
    await PublicProfileAPI.deleteProfile(payload);
    log("deleteProfile", payload, "success", "Profile deleted.", "delete");
  } catch (error) {
    log("deleteProfile", payload, "error", formatError(error), "delete");
  }
}

async function fetchProfile() {
  if (!inspectUser.value) return;
  inspectLoading.value = true;
  fetchedProfile.value = null;
  inspectResult.value = "";
  const payload = { user: inspectUser.value };
  try {
    const result = await PublicProfileAPI.getProfile(payload);
    if (result.length === 0) {
      inspectResult.value = "No profile found for this user.";
    } else {
      fetchedProfile.value = result[0].profile;
      inspectResult.value = "";
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
  () => auth.userId,
  (next) => {
    if (next) {
      inspectUser.value = next;
    }
  },
  { immediate: true },
);
</script>
