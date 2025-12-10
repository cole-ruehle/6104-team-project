<template>
  <div class="app-shell">
    <!-- Show landing page when not authenticated -->
    <LandingPage v-if="!auth.isAuthenticated" />

    <!-- Show main app when authenticated -->
    <template v-else>
      <header>
        <div>
          <h1 class="app-title">Contact Web</h1>
          <nav>
            <RouterLink to="/home">Home</RouterLink>
            <RouterLink to="/tutorials">Tutorials</RouterLink>
            <RouterLink to="/export">Export</RouterLink>
            <RouterLink to="/edit-network">Edit Network</RouterLink>
          </nav>
        </div>
        <div class="auth-status">
          <div class="user-chip">
            <img class="avatar-chip" :src="avatar.src" alt="Profile avatar" @click="showSettings = true" style="cursor: pointer;" />
            <button type="button" class="settings-btn" @click="showSettings = true" title="Settings">
              ⚙️
            </button>
          </div>
          <button type="button" @click="handleLogout">Logout</button>
        </div>
      </header>

      <main>
        <RouterView />
      </main>

      <UserSettingsPanel
        v-if="showSettings"
        @close="showSettings = false"
      />

      <!-- Floating Network Button -->
      <FloatingNetworkButton
        :isMinimized="false"
        :showSettings="showSettings"
        :showTooltip="showNetworkTooltip"
        @toggle="toggleNetworkModal"
        @tooltipDismissed="dismissNetworkTooltip"
      />

      <!-- Network Graph Modal -->
      <NetworkGraphModal
        :isOpen="showNetworkModal"
        @close="closeNetworkModal"
        @nodeSelected="handleNetworkNodeSelected"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from "vue-router";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import LandingPage from "@/pages/LandingPage.vue";
import UserSettingsPanel from "@/components/UserSettingsPanel.vue";
import FloatingNetworkButton from "@/components/FloatingNetworkButton.vue";
import NetworkGraphModal from "@/components/NetworkGraphModal.vue";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAvatarStore } from "@/stores/useAvatarStore";
import { PublicProfileAPI } from "@/services/conceptClient";

const auth = useAuthStore();
const avatar = useAvatarStore();
const router = useRouter();
const showSettings = ref(false);
const showNetworkModal = ref(false);
const showNetworkTooltip = ref(false);

// Check if tooltip should be shown (first visit or after CSV import)
function checkShouldShowTooltip() {
  if (!auth.isAuthenticated) return;

  // Check localStorage for tooltip dismissal
  const tooltipDismissed = localStorage.getItem("networkTooltipDismissed");
  const csvImportCompleted = sessionStorage.getItem("csvImportCompleted");

  // Show tooltip if:
  // 1. It hasn't been dismissed before, OR
  // 2. CSV import was just completed
  if (csvImportCompleted === "true" || !tooltipDismissed) {
    showNetworkTooltip.value = true;
    // Clear the CSV import flag after showing
    if (csvImportCompleted === "true") {
      sessionStorage.removeItem("csvImportCompleted");
    }
  }
}

function dismissNetworkTooltip() {
  showNetworkTooltip.value = false;
  localStorage.setItem("networkTooltipDismissed", "true");
}

// Load profile picture when user logs in
async function loadUserProfilePicture() {
  if (!auth.userId) return;
  try {
    const result = await PublicProfileAPI.getProfile({ user: auth.userId });
    const profile = result[0]?.profile;
    if (profile && (profile as any).profilePictureUrl) {
      avatar.set((profile as any).profilePictureUrl);
      avatar.setForUser(auth.userId, (profile as any).profilePictureUrl);
    } else {
      // Use letter-based avatar if no profile picture is available
      const username = auth.username || auth.userId;
      const letterAvatar = avatar.getLetterAvatar(username);
      avatar.set(letterAvatar);
      avatar.setForUser(auth.userId, letterAvatar);
    }
  } catch {
    // Silently fail - profile might not exist yet, use letter-based avatar
    const username = auth.username || auth.userId || "";
    const letterAvatar = avatar.getLetterAvatar(username);
    avatar.set(letterAvatar);
    if (auth.userId) {
      avatar.setForUser(auth.userId, letterAvatar);
    }
  }
}

// Load on mount if already authenticated
onMounted(() => {
  if (auth.isAuthenticated) {
    loadUserProfilePicture();
    checkShouldShowTooltip();
  }
  // Listen for profile picture updates
  window.addEventListener("profilePictureUpdated", handleProfilePictureUpdated);
  // Listen for CSV import completion
  window.addEventListener("csvImportCompleted", () => {
    sessionStorage.setItem("csvImportCompleted", "true");
    checkShouldShowTooltip();
  });
});

// Clean up event listener
onBeforeUnmount(() => {
  window.removeEventListener("profilePictureUpdated", handleProfilePictureUpdated);
});

// Handle profile picture updates
async function handleProfilePictureUpdated() {
  await loadUserProfilePicture();
}

// Load when user logs in
watch(() => auth.userId, (userId) => {
  if (userId) {
    loadUserProfilePicture();
    checkShouldShowTooltip();
    // Redirect to home if not already there
    if (router.currentRoute.value.path === "/" || router.currentRoute.value.path === "/landing") {
      router.push("/home");
    }
  }
});

function handleLogout() {
  auth.logout();
  router.push("/");
}

function toggleNetworkModal() {
  showNetworkModal.value = !showNetworkModal.value;
}

function closeNetworkModal() {
  showNetworkModal.value = false;
}

function handleNetworkNodeSelected(nodeId: string) {
  // Navigate to home page with nodeId query param to open profile modal
  router.push({ path: "/home", query: { nodeId } });
}
</script>
