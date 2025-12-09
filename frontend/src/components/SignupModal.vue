<template>
    <div class="modal-overlay" @click.self="handleClose">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">
                    Create Account
                </h2>
                <button
                    class="modal-close"
                    @click="handleClose"
                    aria-label="Close"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="modal-body">
                <!-- Account Creation Form -->
                <div class="step-content">
                    <p class="step-description">
                        Create your account. Your profile and network will be set up automatically.
                    </p>
                    <form @submit.prevent="handleAccountCreation" class="auth-form">
                        <div class="form-section">
                            <label class="form-label">Username *</label>
                            <input
                                v-model.trim="accountForm.username"
                                type="text"
                                class="form-input"
                                autocomplete="username"
                                required
                                placeholder="Choose a username"
                            />
                            <p class="form-hint">
                                This will be your unique identifier on the
                                platform.
                            </p>
                        </div>
                        <div class="form-section">
                            <label class="form-label">Password *</label>
                            <input
                                v-model="accountForm.password"
                                type="password"
                                class="form-input"
                                autocomplete="new-password"
                                required
                                minlength="6"
                                placeholder="Create a password (min. 6 characters)"
                            />
                            <p class="form-hint">
                                Use at least 6 characters for security.
                            </p>
                        </div>

                        <div v-if="auth.error" class="error-banner">
                            <i class="fa-solid fa-exclamation-circle"></i>
                            <span>{{ auth.error }}</span>
                        </div>

                        <div class="form-actions">
                            <button
                                type="submit"
                                class="btn-primary"
                                :disabled="auth.loading || submitting"
                            >
                                <i class="fa-solid fa-user-plus"></i>
                                {{ (auth.loading || submitting) ? "Creating Account..." : "Create Account" }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useAuthStore } from "@/stores/useAuthStore";
import { PublicProfileAPI, MultiSourceNetworkAPI } from "@/services/conceptClient";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const router = useRouter();

const submitting = ref(false);

const accountForm = reactive({
    username: "",
    password: "",
});

const emit = defineEmits<{
    close: [];
}>();

function handleClose() {
    emit("close");
}

async function handleAccountCreation() {
    if (!accountForm.username || !accountForm.password) return;

    // Validate password length
    if (accountForm.password.length < 6) {
        auth.error = "Password must be at least 6 characters long.";
        return;
    }

    // Clear any previous errors
    auth.error = null;
    submitting.value = true;
    
    try {
        console.log("Attempting to register user:", accountForm.username);
        const userId = await auth.register({
            username: accountForm.username.trim(),
            password: accountForm.password,
        });
        
        console.log("Registration successful, userId:", userId);
        
        // Only proceed if registration was successful and we have a userId
        if (userId && auth.userId) {
            accountForm.password = ""; // Clear password for security
            
            // Automatically create profile and network
            console.log("Automatically creating profile and network for new user");
            
            try {
                // Create profile with default headline
                const profileResult = await PublicProfileAPI.createProfile({
                    user: auth.userId,
                    headline: `${auth.username || accountForm.username}'s Profile`,
                    attributes: [],
                    links: [],
                });
                
                console.log("Profile created:", profileResult);
                
                // Create network with user as root
                const networkResult = await MultiSourceNetworkAPI.createNetwork({
                    owner: auth.userId,
                    root: auth.userId,
                });
                
                console.log("Network created:", networkResult);
                
                // Success - close modal and redirect
                console.log("Account setup complete, redirecting to home");
                emit("close");
                router.push("/home");
            } catch (setupError) {
                console.error("Error setting up profile/network:", setupError);
                // Even if profile/network creation fails, user is registered
                // They can create these later if needed
                const errorMessage = setupError instanceof Error 
                    ? setupError.message 
                    : "Account created but profile setup failed. You can create it later.";
                auth.error = errorMessage;
                // Still redirect to home - user can set up profile/network later
                emit("close");
                router.push("/home");
            }
        } else {
            auth.error = "Registration failed. Please try again.";
        }
    } catch (error) {
        // Error is handled by auth store and displayed in template
        console.error("Registration error:", error);
        // Ensure error is set if auth store didn't set it
        if (!auth.error) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : "Registration failed. Please try again.";
            auth.error = errorMessage;
        }
        // Don't clear password on error so user can retry
    } finally {
        submitting.value = false;
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
    max-width: 600px;
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
    overflow-y: auto;
    flex: 1;
}

.step-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.step-description {
    margin: 0 0 0.5rem;
    color: #475569;
    line-height: 1.6;
    font-size: 0.95rem;
}

.step-description strong {
    color: #1e293b;
    font-weight: 600;
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.label-hint {
    font-weight: 400;
    color: #64748b;
    font-size: 0.8rem;
}

.optional-badge {
    padding: 0.125rem 0.5rem;
    background: #e2e8f0;
    color: #64748b;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
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

.form-hint {
    margin: 0;
    font-size: 0.75rem;
    color: #64748b;
    line-height: 1.4;
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
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
}

.btn-primary {
    flex: 1;
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

.btn-secondary {
    padding: 0.75rem 1.5rem;
    background: #f1f5f9;
    color: #1e293b;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
    background: #e2e8f0;
}

.btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>

