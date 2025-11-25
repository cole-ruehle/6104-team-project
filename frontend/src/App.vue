<template>
  <div class="app-shell">
    <header>
      <div>
        <h1 class="app-title">Concept Control Center</h1>
        <p class="app-subtitle">
          Manage the MultiSourceNetwork and PublicProfile concepts from a single
          workspace.
        </p>
        <nav>
          <RouterLink to="/network">MultiSource Network</RouterLink>
          <RouterLink to="/profiles">Public Profiles</RouterLink>
        </nav>
      </div>
      <div class="auth-status" v-if="auth.isAuthenticated">
        <p class="muted" style="margin: 0">
          Logged in as <strong>{{ auth.username }}</strong>
        </p>
        <button type="button" @click="auth.logout()">Logout</button>
      </div>
    </header>

    <main>
      <RouterView />
    </main>

    <AuthModal v-if="!auth.isAuthenticated" />
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import AuthModal from "@/components/AuthModal.vue";
import { useAuthStore } from "@/stores/useAuthStore";

const auth = useAuthStore();
</script>
