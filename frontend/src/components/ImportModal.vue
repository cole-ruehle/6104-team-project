<template>
    <div class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content import-modal">
            <div class="modal-header">
                <h2 class="modal-title">Import LinkedIn Connections</h2>
                <button
                    class="modal-close"
                    @click="$emit('close')"
                    aria-label="Close"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="modal-body">
                <p class="import-description">
                    Upload a CSV or JSON file containing your LinkedIn
                    connections to import them into your network.
                </p>

                <StatusBanner
                    v-if="banner"
                    :type="banner.type"
                    :message="banner.message"
                />

                <div class="file-upload-section">
                    <div class="file-input-wrapper">
                        <input
                            type="file"
                            id="file-input"
                            ref="fileInput"
                            accept=".csv,.json,text/csv,application/json"
                            @change="handleFileSelect"
                            :disabled="uploading"
                        />
                        <label
                            for="file-input"
                            class="file-input-label"
                            :class="{ disabled: uploading }"
                        >
                            <i class="fa-solid fa-upload"></i>
                            <span v-if="!selectedFile">Choose File</span>
                            <span v-else>{{ selectedFile.name }}</span>
                        </label>
                    </div>

                    <div v-if="selectedFile" class="file-info">
                        <div class="file-details">
                            <p><strong>File:</strong> {{ selectedFile.name }}</p>
                            <p><strong>Size:</strong> {{ formatFileSize(selectedFile.size) }}</p>
                            <p><strong>Type:</strong> {{ fileType }}</p>
                        </div>
                        <button
                            type="button"
                            class="clear-btn"
                            @click="clearFile"
                            :disabled="uploading"
                        >
                            <i class="fa-solid fa-times"></i>
                            Clear
                        </button>
                    </div>

                    <button
                        type="button"
                        class="upload-btn"
                        @click="handleUpload"
                        :disabled="!selectedFile || uploading"
                    >
                        <i class="fa-solid fa-cloud-upload-alt"></i>
                        {{ uploading ? "Uploading..." : "Upload & Import" }}
                    </button>
                </div>

                <div v-if="importResult" class="import-result">
                    <h3>Import Result</h3>
                    <div class="result-details">
                        <p><strong>Status:</strong> {{ importResult.status }}</p>
                        <p v-if="importResult.importJob">
                            <strong>Import Job ID:</strong>
                            {{ importResult.importJob }}
                        </p>
                        <p v-if="importResult.connectionsImported !== undefined">
                            <strong>Connections Imported:</strong>
                            {{ importResult.connectionsImported }}
                        </p>
                        <p v-if="importResult.error" class="error-text">
                            <strong>Error:</strong> {{ importResult.error }}
                        </p>
                    </div>
                </div>

                <div class="file-format-info">
                    <h4>File Format Requirements</h4>
                    <div class="format-grid">
                        <div class="format-card">
                            <h5><i class="fa-solid fa-file-csv"></i> CSV Format</h5>
                            <p>
                                Your CSV file should contain columns for connection
                                information such as: First Name, Last Name, Headline,
                                Location, Company, etc.
                            </p>
                            <p class="format-hint">
                                The system will automatically map your columns to the
                                appropriate fields.
                            </p>
                        </div>
                        <div class="format-card">
                            <h5><i class="fa-solid fa-file-code"></i> JSON Format</h5>
                            <p>
                                Your JSON file should be an array of connection objects,
                                or a single connection object.
                            </p>
                            <p class="format-hint">
                                Each object should contain fields like firstName,
                                lastName, headline, etc.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import StatusBanner from "@/components/StatusBanner.vue";
import {
    LinkedInImportAPI,
    ConceptApiError,
    type LinkedInConnection,
} from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";

const auth = useAuthStore();
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const uploading = ref(false);
const banner = ref<{ type: "success" | "error"; message: string } | null>(null);
const importResult = ref<{
    status: string;
    importJob?: string;
    connectionsImported?: number;
    connections?: Array<Record<string, unknown>> | LinkedInConnection[];
    error?: string;
} | null>(null);

const emit = defineEmits<{
    close: [];
    success: [];
}>();

const fileType = computed(() => {
    if (!selectedFile.value) return "";
    const name = selectedFile.value.name.toLowerCase();
    if (name.endsWith(".csv")) return "CSV";
    if (name.endsWith(".json")) return "JSON";
    return selectedFile.value.type || "Unknown";
});

function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        selectedFile.value = file;
        importResult.value = null;
        banner.value = null;
    }
}

function clearFile() {
    selectedFile.value = null;
    importResult.value = null;
    if (fileInput.value) {
        fileInput.value.value = "";
    }
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function showBanner(type: "success" | "error", message: string) {
    banner.value = { type, message };
}

async function getOrCreateLinkedInAccount(): Promise<string> {
    if (!auth.userId) {
        throw new Error("You must be logged in to import connections");
    }

    try {
        const accounts = await LinkedInImportAPI.getLinkedInAccount({
            user: auth.userId,
        });
        if (accounts.length > 0) {
            return accounts[0]._id;
        }
    } catch (error) {
        // Account doesn't exist, we'll create one
    }

    const result = await LinkedInImportAPI.connectLinkedInAccount({
        user: auth.userId,
        accessToken: "file-import-placeholder",
        linkedInUserId: `file-import-${auth.userId}`,
        linkedInEmail: auth.username || undefined,
        linkedInName: auth.username || undefined,
    });

    if ("error" in result) {
        throw new Error(String(result.error));
    }

    return result.account;
}

async function handleUpload() {
    if (!selectedFile.value || !auth.userId) {
        showBanner("error", "Please select a file and ensure you're logged in");
        return;
    }

    uploading.value = true;
    importResult.value = null;
    banner.value = null;

    try {
        const fileContent = await readFileContent(selectedFile.value);
        const account = await getOrCreateLinkedInAccount();
        const isCSV = selectedFile.value.name.toLowerCase().endsWith(".csv");

        let result;
        if (isCSV) {
            result = await LinkedInImportAPI.importConnectionsFromCSV({
                account,
                csvContent: fileContent,
            });
        } else {
            result = await LinkedInImportAPI.importConnectionsFromJSON({
                account,
                jsonContent: fileContent,
            });
        }

        importResult.value = {
            status: "success",
            importJob: result.importJob,
            connectionsImported: result.connectionsImported,
            connections: result.connections,
        };

        showBanner(
            "success",
            `Successfully imported ${result.connectionsImported} connections!`
        );

        // Emit success event after a short delay to show the result
        setTimeout(() => {
            emit("success");
            emit("close");
        }, 2000);
    } catch (error) {
        const errorMessage = formatError(error);
        importResult.value = {
            status: "error",
            error: errorMessage,
        };
        showBanner("error", errorMessage);
    } finally {
        uploading.value = false;
    }
}

function readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result;
            if (typeof content === "string") {
                resolve(content);
            } else {
                reject(new Error("Failed to read file content"));
            }
        };
        reader.onerror = () => reject(new Error("Error reading file"));
        reader.readAsText(file);
    });
}

function formatError(error: unknown): string {
    if (error instanceof ConceptApiError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "Unexpected error occurred during import";
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

.modal-content.import-modal {
    background: white;
    border-radius: 1rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 700px;
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

.import-description {
    margin: 0 0 1.5rem;
    color: #475569;
    line-height: 1.6;
}

.file-upload-section {
    margin-bottom: 2rem;
}

.file-input-wrapper {
    margin-bottom: 1rem;
}

.file-input-wrapper input[type="file"] {
    display: none;
}

.file-input-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--color-navy-600);
    color: white;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 600;
}

.file-input-label:hover:not(.disabled) {
    background: var(--color-navy-700);
    transform: translateY(-1px);
}

.file-input-label.disabled {
    background: #cbd5e1;
    cursor: not-allowed;
}

.file-info {
    margin: 1rem 0;
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
}

.file-details {
    flex: 1;
}

.file-details p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
    color: #475569;
}

.clear-btn {
    padding: 0.5rem 1rem;
    background: #f1f5f9;
    color: #64748b;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
}

.clear-btn:hover:not(:disabled) {
    background: #e2e8f0;
    color: #1e293b;
}

.clear-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.upload-btn {
    width: 100%;
    padding: 0.75rem 1.5rem;
    background: var(--color-navy-600);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.upload-btn:hover:not(:disabled) {
    background: var(--color-navy-700);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.upload-btn:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
}

.import-result {
    margin-top: 1.5rem;
    padding: 1.25rem;
    background: #f8fafc;
    border-radius: 0.5rem;
    border-left: 4px solid var(--color-navy-600);
}

.import-result h3 {
    margin: 0 0 1rem;
    font-size: 1.125rem;
    font-weight: 700;
    color: #1e293b;
}

.result-details p {
    margin: 0.5rem 0;
    font-size: 0.875rem;
    color: #475569;
}

.error-text {
    color: #dc2626;
}

.file-format-info {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(15, 23, 42, 0.1);
}

.file-format-info h4 {
    margin: 0 0 1rem;
    font-size: 1rem;
    font-weight: 700;
    color: #1e293b;
}

.format-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
}

.format-card {
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 0.5rem;
}

.format-card h5 {
    margin: 0 0 0.75rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.format-card h5 i {
    color: var(--color-navy-600);
}

.format-card p {
    margin: 0.5rem 0;
    font-size: 0.875rem;
    color: #475569;
    line-height: 1.5;
}

.format-hint {
    font-size: 0.75rem !important;
    color: #64748b !important;
    font-style: italic;
}
</style>

