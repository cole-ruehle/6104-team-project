<template>
  <div class="auth-overlay">
    <div class="auth-panel">
      <h2>Welcome! Please {{ mode === "login" ? "log in" : "sign up" }}</h2>
      <p class="muted">
        Authentication is powered by the `UserAuthentication` concept (MongoDB-backed).
      </p>

      <div class="auth-toggle">
        <button
          type="button"
          :class="{ active: mode === 'login' }"
          @click="setMode('login')"
        >
          Login
        </button>
        <button
          type="button"
          :class="{ active: mode === 'register' }"
          @click="setMode('register')"
        >
          Sign Up
        </button>
      </div>

      <form class="form-grid" @submit.prevent="handleSubmit">
        <label>
          Username
          <input v-model.trim="form.username" autocomplete="username" required />
        </label>
        <label>
          Password
          <input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            required
            minlength="6"
          />
        </label>

        <button type="submit" :disabled="auth.loading">
          {{ auth.loading ? "Working..." : mode === "login" ? "Login" : "Create Account" }}
        </button>
        <p v-if="auth.error" class="banner error">{{ auth.error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";

type Mode = "login" | "register";

const auth = useAuthStore();
const mode = ref<Mode>("login");

const form = reactive({
  username: "",
  password: "",
});

function setMode(next: Mode) {
  mode.value = next;
  auth.error = null;
}

async function handleSubmit() {
  if (!form.username || !form.password) return;
  if (mode.value === "login") {
    await auth.login({ username: form.username, password: form.password });
  } else {
    await auth.register({ username: form.username, password: form.password });
  }
  form.password = "";
}
</script>

