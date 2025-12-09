<template>
  <div class="auth-overlay" @click.self="emit('close')">
    <div class="auth-panel user-settings-panel">
      <div class="panel-header">
        <div>
          <h2>Profile Settings</h2>
          <p class="user-info">
            Signed in as <strong>{{ auth.username }}</strong>
          </p>
        </div>
        <button class="close-btn" type="button" @click="emit('close')" aria-label="Close">
          ×
        </button>
      </div>

      <StatusBanner
        v-if="banner"
        :type="banner.type"
        :message="banner.message"
      />

      <!-- Profile Picture Section -->
      <div class="profile-section">
        <div class="profile-picture-container">
          <div class="avatar-wrapper">
            <img :src="displayedAvatar" alt="Profile picture" class="profile-avatar" />
            <div v-if="savingPhoto" class="avatar-overlay">
              <div class="spinner"></div>
            </div>
          </div>
          <div class="profile-picture-actions">
            <button
              type="button"
              class="change-photo-btn"
              @click="triggerPicker"
              :disabled="savingPhoto"
            >
              <i class="fa-solid fa-camera"></i>
              <span>{{ savingPhoto ? "Saving…" : "Change Photo" }}</span>
            </button>
            <p class="photo-hint">Click to upload a new profile picture</p>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="file-input-hidden"
            @change="handleFileChange"
          />
        </div>
      </div>

      <!-- User ID Section -->
      <div class="info-section">
        <label class="info-label">User ID</label>
        <div class="user-id-display">
          <code>{{ auth.userId }}</code>
          <button
            type="button"
            class="copy-btn"
            @click="copyUserId"
            :title="copied ? 'Copied!' : 'Copy User ID'"
          >
            <i class="fa-solid fa-copy"></i>
          </button>
        </div>
      </div>

      <!-- Profile Details Section -->
      <div v-if="profile" class="profile-details-section">
        <h3 class="section-title">Profile Information</h3>
        <div class="detail-item" v-if="profile.headline">
          <label class="detail-label">Headline</label>
          <p class="detail-value">{{ profile.headline }}</p>
        </div>
        <div class="detail-item" v-if="profile.attributes && profile.attributes.length > 0">
          <label class="detail-label">Attributes</label>
          <div class="tags-list">
            <span v-for="attr in profile.attributes" :key="attr" class="tag">{{ attr }}</span>
          </div>
        </div>
        <div class="detail-item" v-if="profile.links && profile.links.length > 0">
          <label class="detail-label">Links</label>
          <div class="links-list">
            <a
              v-for="link in profile.links"
              :key="link"
              :href="link"
              target="_blank"
              rel="noreferrer"
              class="link-item"
            >
              <i class="fa-solid fa-external-link"></i>
              {{ link }}
            </a>
          </div>
        </div>
      </div>
      <div v-else class="no-profile-message">
        <i class="fa-solid fa-info-circle"></i>
        <p>No public profile found yet.</p>
      </div>

      <!-- Danger Zone -->
      <div class="danger-zone">
        <h3 class="section-title danger-title">Danger Zone</h3>
        <button
          type="button"
          class="danger-btn"
          @click="handleDeleteProfile"
          :disabled="deleting"
        >
          <i class="fa-solid fa-trash"></i>
          <span>{{ deleting ? "Deleting…" : "Delete Profile" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import StatusBanner from "@/components/StatusBanner.vue";
import {
  PublicProfileAPI,
  type PublicProfile,
} from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAvatarStore } from "@/stores/useAvatarStore";

const emit = defineEmits<{ (e: "close"): void }>();

const auth = useAuthStore();
const avatarStore = useAvatarStore();
const profile = ref<PublicProfile | null>(null);
const previewUrl = ref<string | null>(null);
const banner = ref<{ type: "success" | "error"; message: string } | null>(null);
const deleting = ref(false);
const savingPhoto = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const displayedAvatar = computed(() =>
  previewUrl.value || avatarStore.src || avatarStore.DEFAULT_AVATAR
);

async function loadProfile() {
  if (!auth.userId) return;
  try {
    const result = await PublicProfileAPI.getProfile({ user: auth.userId });
    profile.value = result[0]?.profile ?? null;

    // Load profile picture if available
    if (profile.value && (profile.value as any).profilePictureUrl) {
      const pictureUrl = (profile.value as any).profilePictureUrl;
      avatarStore.set(pictureUrl);
      avatarStore.setForUser(auth.userId, pictureUrl);
      previewUrl.value = pictureUrl;
    } else {
      // Use stored avatar, or letter-based avatar, or default
      const storedAvatar = avatarStore.getForUser(auth.userId);
      if (storedAvatar === avatarStore.DEFAULT_AVATAR) {
        // Use letter-based avatar based on username
        const username = auth.username || auth.userId || "";
        previewUrl.value = avatarStore.getLetterAvatar(username);
      } else {
        previewUrl.value = storedAvatar;
      }
    }
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unable to load profile.";
    banner.value = { type: "error", message };
  }
}

function triggerPicker() {
  fileInput.value?.click();
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    banner.value = { type: "error", message: "Please select an image file" };
    return;
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    banner.value = { type: "error", message: "Image size must be less than 5MB" };
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    previewUrl.value = reader.result as string;
    // Auto-save when file is selected
    await handleSavePhoto();
  };
  reader.readAsDataURL(file);
}

const copied = ref(false);
function copyUserId() {
  if (!auth.userId) return;
  navigator.clipboard.writeText(auth.userId).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
}

async function handleSavePhoto() {
  if (!auth.userId || !previewUrl.value) return;

  savingPhoto.value = true;
  banner.value = null;

  try {
    // Update profile with the profile picture URL (data URL)
    await PublicProfileAPI.updateProfile({
      user: auth.userId,
      profilePictureUrl: previewUrl.value,
    });

    // Update avatar store
    avatarStore.set(previewUrl.value);
    avatarStore.setForUser(auth.userId, previewUrl.value);

    // Reload profile to get updated data
    await loadProfile();

    // Dispatch custom event to notify other components (like HomePage) to refresh
    window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
      detail: { userId: auth.userId }
    }));

    banner.value = { type: "success", message: "Profile photo saved successfully!" };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to save profile photo.";
    banner.value = { type: "error", message };
  } finally {
    savingPhoto.value = false;
  }
}

async function handleDeleteProfile() {
  if (!auth.userId) return;
  deleting.value = true;
  banner.value = null;
  try {
    await PublicProfileAPI.deleteProfile({ user: auth.userId });
    profile.value = null;
    banner.value = { type: "success", message: "Profile deleted." };
    previewUrl.value = null;
    avatarStore.reset();
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to delete profile.";
    banner.value = { type: "error", message };
  } finally {
    deleting.value = false;
  }
}

watch(
  () => auth.userId,
  () => {
    loadProfile();
  },
  { immediate: true },
);

onMounted(() => {
  loadProfile();
  // previewUrl will be set by loadProfile if profile picture exists
});
</script>
