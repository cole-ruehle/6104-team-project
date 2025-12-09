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
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="modal-body">
                <div v-if="loading" class="loading-state">
                    <div class="loading-icon">📡</div>
                    <p>Loading connection data...</p>
                </div>
                <form v-else @submit.prevent="handleSubmit" class="connection-form">
                    <!-- Profile Picture Upload -->
                    <div class="form-section">
                        <label class="form-label">Profile Picture</label>
                        <div
                            class="upload-area"
                            :class="{
                                'drag-over': isDragging,
                                'has-image': form.avatarUrl,
                            }"
                            @dragover.prevent="handleDragOver"
                            @dragleave.prevent="handleDragLeave"
                            @drop.prevent="handleDrop"
                            @click="triggerFilePicker"
                        >
                            <input
                                ref="fileInput"
                                type="file"
                                accept="image/*"
                                class="file-input"
                                @change="handleFileChange"
                            />
                            <div
                                v-if="!form.avatarUrl"
                                class="upload-placeholder"
                            >
                                <i
                                    class="fa-solid fa-cloud-arrow-up upload-icon"
                                ></i>
                                <p class="upload-text">
                                    Drag and drop an image here, or click to
                                    browse
                                </p>
                                <p class="upload-hint">
                                    Supports JPG, PNG, GIF (max 5MB)
                                </p>
                            </div>
                            <div v-else class="upload-preview">
                                <img
                                    :src="form.avatarUrl"
                                    alt="Preview"
                                    @error="handleImageError"
                                />
                                <button
                                    type="button"
                                    class="remove-image-btn"
                                    @click.stop="removeImage"
                                    aria-label="Remove image"
                                >
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
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
const isDragging = ref(false);
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
        const errorMessage = err instanceof Error ? err.message : "Failed to update connection. Please try again.";
        error.value = errorMessage;
    } finally {
        saving.value = false;
    }
}

function triggerFilePicker() {
    fileInput.value?.click();
}

function handleDragOver(event: DragEvent) {
    isDragging.value = true;
    event.preventDefault();
}

function handleDragLeave(event: DragEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        isDragging.value = false;
    }
}

function handleDrop(event: DragEvent) {
    isDragging.value = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
        processFile(files[0]);
    }
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

function removeImage() {
    form.value.avatarUrl = "";
    uploadError.value = "";
    if (fileInput.value) {
        fileInput.value.value = "";
    }
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

.upload-area {
    position: relative;
    border: 2px dashed rgba(15, 23, 42, 0.2);
    border-radius: 0.5rem;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #f8fafc;
}

.upload-area:hover {
    border-color: var(--color-navy-400);
    background: #f1f5f9;
}

.upload-area.drag-over {
    border-color: var(--color-navy-600);
    background: #eff6ff;
}

.upload-area.has-image {
    padding: 0;
    border: none;
    background: transparent;
}

.file-input {
    display: none;
}

.upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}

.upload-icon {
    font-size: 2rem;
    color: #94a3b8;
}

.upload-text {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: #475569;
}

.upload-hint {
    margin: 0;
    font-size: 0.75rem;
    color: #94a3b8;
}

.upload-preview {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0.5rem;
    overflow: hidden;
}

.upload-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.remove-image-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 50%;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.remove-image-btn:hover {
    background: rgba(0, 0, 0, 0.9);
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

