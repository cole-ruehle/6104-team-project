<template>
  <div class="auth-overlay">
    <div class="auth-panel">
      <h2>Finish setting up your profile</h2>
      <p class="muted">
        Tell everyone who you are. Headline, attributes, and links are required before using the app.
      </p>

      <StatusBanner
        v-if="banner"
        :type="banner.type"
        :message="banner.message"
      />

      <form class="form-grid" @submit.prevent="handleSubmit">
        <label>
          Headline
          <input v-model.trim="form.headline" required />
        </label>
        <label>
          Attributes (comma separated)
          <input v-model.trim="form.attributes" required />
        </label>
        <label>
          Links (comma separated URLs)
          <input v-model.trim="form.links" required />
        </label>
        <button type="submit" :disabled="submitting">
          {{ submitting ? "Saving…" : "Create Profile" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import StatusBanner from "@/components/StatusBanner.vue";
import { PublicProfileAPI } from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileGateStore } from "@/stores/useProfileGate";

const form = reactive({
  headline: "",
  attributes: "",
  links: "",
});

const submitting = ref(false);
const banner = ref<{ type: "success" | "error"; message: string } | null>(null);

const auth = useAuthStore();
const gate = useProfileGateStore();

function parseList(value: string) {
  return value
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

async function handleSubmit() {
  if (!auth.userId) {
    banner.value = { type: "error", message: "Missing user session." };
    return;
  }
  if (!form.headline || !form.attributes || !form.links) {
    banner.value = {
      type: "error",
      message: "Please fill in headline, attributes, and links.",
    };
    return;
  }
  submitting.value = true;
  banner.value = null;
  try {
    await PublicProfileAPI.createProfile({
      user: auth.userId,
      headline: form.headline.trim(),
      attributes: parseList(form.attributes),
      links: parseList(form.links),
    });
    gate.closeGate();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create profile.";
    banner.value = { type: "error", message };
  } finally {
    submitting.value = false;
  }
}
</script>
