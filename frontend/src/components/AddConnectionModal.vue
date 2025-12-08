<template>
    <div class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Add Connection</h2>
                <button
                    class="modal-close"
                    @click="$emit('close')"
                    aria-label="Close"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="modal-body">
                <form @submit.prevent="handleSubmit" class="connection-form">
                    <div class="form-section">
                        <label class="form-label">First Name *</label>
                        <input
                            v-model.trim="form.firstName"
                            type="text"
                            class="form-input"
                            required
                            placeholder="First name"
                        />
                    </div>
                    <div class="form-section">
                        <label class="form-label">Last Name *</label>
                        <input
                            v-model.trim="form.lastName"
                            type="text"
                            class="form-input"
                            required
                            placeholder="Last name"
                        />
                    </div>
                    <div class="form-section">
                        <label class="form-label">Location</label>
                        <input
                            v-model.trim="form.location"
                            type="text"
                            class="form-input"
                            placeholder="City, State"
                        />
                    </div>
                    <div class="form-section">
                        <label class="form-label">Company</label>
                        <input
                            v-model.trim="form.company"
                            type="text"
                            class="form-input"
                            placeholder="Current company"
                        />
                    </div>
                    <div class="form-section">
                        <label class="form-label">Job Title</label>
                        <input
                            v-model.trim="form.jobTitle"
                            type="text"
                            class="form-input"
                            placeholder="Current job title"
                        />
                    </div>
                    <div class="form-section">
                        <label class="form-label">Headline</label>
                        <input
                            v-model.trim="form.headline"
                            type="text"
                            class="form-input"
                            placeholder="Professional headline"
                        />
                    </div>
                    <div class="form-actions">
                        <button
                            type="submit"
                            class="btn-primary"
                            :disabled="saving"
                        >
                            <i class="fa-solid fa-save"></i>
                            {{ saving ? "Adding..." : "Add Connection" }}
                        </button>
                        <button
                            type="button"
                            @click="$emit('close')"
                            class="btn-secondary"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { MultiSourceNetworkAPI } from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";

const auth = useAuthStore();
const saving = ref(false);

const form = ref({
    firstName: "",
    lastName: "",
    location: "",
    company: "",
    jobTitle: "",
    headline: "",
});

const emit = defineEmits<{
    close: [];
    success: [];
}>();

async function handleSubmit() {
    if (!auth.userId) {
        alert("You must be signed in to add a connection.");
        return;
    }

    saving.value = true;

    try {
        // Create node
        const label = `${form.value.firstName} ${form.value.lastName}`.trim();
        const headline = form.value.headline || form.value.jobTitle || "";

        const nodeResult = await MultiSourceNetworkAPI.createNodeForUser({
            owner: auth.userId,
            firstName: form.value.firstName,
            lastName: form.value.lastName,
            label: label,
            headline: headline,
            sourceIds: { manual: "manual" },
        });

        const nodeId = nodeResult.node;

        // Create edge from current user to new connection
        await MultiSourceNetworkAPI.addEdge({
            owner: auth.userId,
            from: auth.userId,
            to: nodeId,
            source: "manual",
        });

        emit("success");
        emit("close");
    } catch (error) {
        console.error("Error adding connection:", error);
        alert("Failed to add connection. Please try again.");
    } finally {
        saving.value = false;
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

.connection-form {
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

.form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(15, 23, 42, 0.1);
}

.btn-primary {
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

.btn-secondary:hover {
    background: #e2e8f0;
}
</style>

