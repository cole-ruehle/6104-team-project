<template>
    <div class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Log In</h2>
                <button
                    class="modal-close"
                    @click="$emit('close')"
                    aria-label="Close"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="modal-body">
                <form @submit.prevent="handleSubmit" class="auth-form">
                    <div class="form-section">
                        <label class="form-label">Username</label>
                        <input
                            v-model.trim="form.username"
                            type="text"
                            class="form-input"
                            autocomplete="username"
                            required
                            placeholder="Enter your username"
                        />
                    </div>
                    <div class="form-section">
                        <label class="form-label">Password</label>
                        <input
                            v-model="form.password"
                            type="password"
                            class="form-input"
                            autocomplete="current-password"
                            required
                            minlength="6"
                            placeholder="Enter your password"
                        />
                    </div>

                    <div v-if="auth.error" class="error-banner">
                        <i class="fa-solid fa-exclamation-circle"></i>
                        {{ auth.error }}
                    </div>

                    <div class="form-actions">
                        <button
                            type="submit"
                            class="btn-primary"
                            :disabled="auth.loading"
                        >
                            <i class="fa-solid fa-sign-in-alt"></i>
                            {{ auth.loading ? "Logging in..." : "Log In" }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const router = useRouter();

const form = reactive({
    username: "",
    password: "",
});

const emit = defineEmits<{
    close: [];
}>();

async function handleSubmit() {
    if (!form.username || !form.password) return;

    // Clear any previous errors
    auth.error = null;

    try {
        const userId = await auth.login({
            username: form.username,
            password: form.password,
        });
        
        // Only close and redirect if login was successful
        if (userId) {
            emit("close");
            router.push("/home");
            form.password = "";
        }
    } catch (error) {
        // Error is handled by auth store and displayed in template
        console.error("Login error:", error);
        // Don't clear password on error so user can retry
    }
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
}

.modal-content {
    background: white;
    border-radius: 1rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid rgba(15, 23, 42, 0.1);
}

.modal-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
}

.modal-close {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: #64748b;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
}

.modal-close:hover {
    background: #f1f5f9;
    color: #1e293b;
}

.modal-body {
    padding: 1.5rem;
}

.auth-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.form-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e293b;
}

.form-input {
    padding: 0.75rem;
    border: 1px solid rgba(15, 23, 42, 0.2);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-family: inherit;
    transition: all 0.2s ease;
    outline: none;
}

.form-input:focus {
    border-color: var(--color-navy-400);
    box-shadow: 0 0 0 3px rgba(102, 153, 204, 0.2);
}

.error-banner {
    padding: 0.75rem 1rem;
    background: #fee2e2;
    color: #dc2626;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
}

.form-actions {
    margin-top: 0.5rem;
}

.btn-primary {
    width: 100%;
    padding: 0.75rem 1.5rem;
    background: var(--color-navy-600);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.btn-primary:hover:not(:disabled) {
    background: var(--color-navy-700);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>

