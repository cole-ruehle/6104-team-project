import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { UserAuthenticationAPI, ConceptApiError } from "@/services/conceptClient";

interface AuthState {
  userId: string | null;
  username: string | null;
}

const STORAGE_KEY = "concept-auth-state";

function loadPersistedState(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { userId: null, username: null };
    const parsed = JSON.parse(raw);
    return {
      userId: typeof parsed.userId === "string" ? parsed.userId : null,
      username: typeof parsed.username === "string" ? parsed.username : null,
    };
  } catch (_err) {
    return { userId: null, username: null };
  }
}

function persistState(state: AuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useAuthStore = defineStore("auth", () => {
  const initial = loadPersistedState();
  const userId = ref<string | null>(initial.userId);
  const username = ref<string | null>(initial.username);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => Boolean(userId.value));

  function clearState() {
    userId.value = null;
    username.value = null;
    persistState({ userId: null, username: null });
  }

  async function register(credentials: { username: string; password: string }) {
    error.value = null;
    loading.value = true;
    try {
      const result = await UserAuthenticationAPI.register(credentials);
      userId.value = result.user;
      username.value = credentials.username;
      persistState({ userId: userId.value, username: username.value });
      return result.user;
    } catch (err) {
      error.value = formatError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function login(credentials: { username: string; password: string }) {
    error.value = null;
    loading.value = true;
    try {
      const result = await UserAuthenticationAPI.authenticate(credentials);
      userId.value = result.user;
      username.value = credentials.username;
      persistState({ userId: userId.value, username: username.value });
      return result.user;
    } catch (err) {
      error.value = formatError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    clearState();
    error.value = null;
  }

  return {
    userId,
    username,
    isAuthenticated,
    loading,
    error,
    register,
    login,
    logout,
  };
});

function formatError(error: unknown) {
  if (error instanceof ConceptApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected authentication error.";
}
