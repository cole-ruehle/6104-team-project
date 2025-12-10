<template>
    <div class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Edit Connection</h2>
                <button
                    class="modal-close"
                    @click="$emit('close')"
                    aria-label="Close"
                >
                    ×
                </button>
            </div>
            <div class="modal-body">
                <div v-if="loading" class="loading-state">
                    <div class="loading-icon">📡</div>
                    <p>Loading connection data...</p>
                </div>
                <form
                    v-else
                    @submit.prevent="handleSubmit"
                    class="connection-form"
                >
                    <!-- Profile Picture Upload -->
                    <div class="form-section">
                        <label class="form-label">Profile Picture</label>
                        <div class="profile-picture-container">
                            <div
                                v-if="form.avatarUrl"
                                class="profile-picture-preview"
                            >
                                <img
                                    :src="form.avatarUrl"
                                    alt="Profile preview"
                                    @error="handleImageError"
                                />
                            </div>
                            <div v-else class="profile-picture-placeholder">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <button
                                type="button"
                                class="change-profile-pic-btn"
                                @click="triggerFilePicker"
                            >
                                Upload Profile Picture
                            </button>
                            <input
                                ref="fileInput"
                                type="file"
                                accept="image/*"
                                class="file-input"
                                @change="handleFileChange"
                            />
                        </div>
                        <div v-if="uploadError" class="upload-error">
                            <i class="fa-solid fa-exclamation-circle"></i>
                            {{ uploadError }}
                        </div>
                    </div>

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
                    <div v-if="error" class="error-banner">
                        <i class="fa-solid fa-exclamation-circle"></i>
                        <span>{{ error }}</span>
                    </div>
                    <div class="form-actions">
                        <button
                            type="submit"
                            class="btn-primary"
                            :disabled="saving"
                        >
                            <i class="fa-solid fa-save"></i>
                            {{ saving ? "Saving..." : "Save Changes" }}
                        </button>
                        <button
                            type="button"
                            @click="$emit('close')"
                            class="btn-secondary"
                            :disabled="saving"
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
import { ref, onMounted } from "vue";
import { MultiSourceNetworkAPI } from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";

interface Props {
    nodeId: string;
}

const props = defineProps<Props>();
const auth = useAuthStore();
const saving = ref(false);
const loading = ref(true);
const error = ref<string | null>(null);
const uploadError = ref<string>("");
const fileInput = ref<HTMLInputElement | null>(null);

const form = ref({
    firstName: "",
    lastName: "",
    location: "",
    company: "",
    jobTitle: "",
    headline: "",
    avatarUrl: "",
});

const emit = defineEmits<{
    close: [];
    success: [];
}>();

async function loadNodeData() {
    if (!auth.userId || !props.nodeId) {
        error.value = "Missing user or node ID.";
        loading.value = false;
        return;
    }

    loading.value = true;
    error.value = null;

    try {
        // Get node data
        const nodes = await MultiSourceNetworkAPI.getNodes({
            ids: [props.nodeId],
            owner: auth.userId,
        });

        if (!nodes || nodes.length === 0) {
            error.value = "Connection not found.";
            loading.value = false;
            return;
        }

        const nodeData = nodes[0] as any;

        // Populate form with existing data
        form.value = {
            firstName: nodeData.firstName || "",
            lastName: nodeData.lastName || "",
            location: nodeData.location || "",
            company: nodeData.currentCompany || nodeData.company || "",
            jobTitle: nodeData.currentPosition || nodeData.jobTitle || "",
            headline: nodeData.headline || "",
            avatarUrl: nodeData.avatarUrl || nodeData.profilePictureUrl || "",
        };

        loading.value = false;
    } catch (err) {
        console.error("Error loading node data:", err);
        error.value = "Failed to load connection data. Please try again.";
        loading.value = false;
    }
}

async function handleSubmit() {
    if (!auth.userId || !props.nodeId) {
        error.value = "Missing user or node ID.";
        return;
    }

    if (!form.value.firstName.trim() || !form.value.lastName.trim()) {
        error.value = "First name and last name are required.";
        return;
    }

    saving.value = true;
    error.value = null;

    try {
        const label = `${form.value.firstName} ${form.value.lastName}`.trim();
        const headline = form.value.headline || form.value.jobTitle || "";

        console.log("Updating node:", props.nodeId);

        // Update the existing node using updateNode
        const nodeResult = await MultiSourceNetworkAPI.updateNode({
            node: props.nodeId,
            updater: auth.userId,
            meta: {
                firstName: form.value.firstName.trim(),
                lastName: form.value.lastName.trim(),
                label: label,
                headline: headline,
                location: form.value.location.trim() || undefined,
                currentCompany: form.value.company.trim() || undefined,
                currentPosition: form.value.jobTitle.trim() || undefined,
                avatarUrl: form.value.avatarUrl || undefined,
                profilePictureUrl: form.value.avatarUrl || undefined,
            },
        });

        console.log("Node update result:", nodeResult);

        if (nodeResult.error) {
            throw new Error(nodeResult.error);
        }

        emit("success");
        emit("close");
    } catch (err) {
        console.error("Error updating connection:", err);
        const errorMessage =
            err instanceof Error
                ? err.message
                : "Failed to update connection. Please try again.";
        error.value = errorMessage;
    } finally {
        saving.value = false;
    }
}

function triggerFilePicker() {
    fileInput.value?.click();
}

function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file: File) {
    uploadError.value = "";

    // Validate file type
    if (!file.type.startsWith("image/")) {
        uploadError.value = "Please select an image file";
        return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        uploadError.value = "Image size must be less than 5MB";
        return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
            form.value.avatarUrl = result;
            uploadError.value = "";
        }
    };
    reader.onerror = () => {
        uploadError.value = "Failed to read image file";
    };
    reader.readAsDataURL(file);
}

function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = "";
}

onMounted(() => {
    loadNodeData();
});
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
    background: #f1f5f9;
    border: 2px solid #e2e8f0;
    font-size: 1.75rem;
    font-weight: 600;
    color: #1e293b;
    cursor: pointer;
    padding: 0;
    border-radius: 50%;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    line-height: 1;
}

.modal-close:hover {
    background: #e2e8f0;
    border-color: #cbd5e1;
    color: #0f172a;
    transform: scale(1.1);
}

.modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
}

.loading-state {
    text-align: center;
    padding: 3rem 2rem;
}

.loading-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
}

.loading-state p {
    margin: 0;
    color: #64748b;
    font-size: 0.9rem;
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
    margin-top: 1rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(15, 23, 42, 0.1);
}

.btn-primary {
    flex: 1;
    padding: 0.75rem 1.5rem;
    /* default: dark blue background with white text */
    background: #003b6d;
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
    filter: drop-shadow(0 8px 16px rgba(51, 84, 162, 0.08));
    transform: translateY(-2px);
    /* hover: light blue background with dark text */
    background: #e6f4ff;
    color: #003b6d;
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

/* Profile Picture Upload */
.profile-picture-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
}

.profile-picture-preview {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
}

.profile-picture-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.profile-picture-placeholder {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 2rem;
}

.change-profile-pic-btn {
    padding: 0.5rem 1rem;
    background: var(--color-navy-600);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.change-profile-pic-btn:hover {
    background: #003b6d;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.file-input {
    display: none;
}

.upload-error {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: #fee2e2;
    color: #dc2626;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
</style>
