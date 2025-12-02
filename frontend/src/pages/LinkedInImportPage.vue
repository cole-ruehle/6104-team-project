<template>
  <div class="import-page">
    <section class="import-actions card">
      <h2 style="margin-top: 0">Import LinkedIn Connections</h2>
      <p class="muted">
        Upload a CSV or JSON file containing your LinkedIn connections to import them into your network.
      </p>
      <div class="banner info" style="margin-bottom: 1rem;">
        🚧 You can still upload files, but nodes won't be automatically populated. Synchronization of reading the import and automatically adding nodes is still needed.
      </div>

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
          <label for="file-input" class="file-input-label" :class="{ disabled: uploading }">
            <span v-if="!selectedFile">Choose File</span>
            <span v-else>{{ selectedFile.name }}</span>
          </label>
        </div>

        <div v-if="selectedFile" class="file-info">
          <p>
            <strong>File:</strong> {{ selectedFile.name }}<br />
            <strong>Size:</strong> {{ formatFileSize(selectedFile.size) }}<br />
            <strong>Type:</strong> {{ fileType }}
          </p>
          <button type="button" class="muted-btn" @click="clearFile" :disabled="uploading">
            Clear
          </button>
        </div>

        <button
          type="button"
          class="upload-btn"
          @click="handleUpload"
          :disabled="!selectedFile || uploading"
        >
          {{ uploading ? "Uploading..." : "Upload & Import" }}
        </button>
      </div>

      <div v-if="importResult" class="import-result">
        <h3>Import Result</h3>
        <p><strong>Status:</strong> {{ importResult.status }}</p>
        <p v-if="importResult.importJob">
          <strong>Import Job ID:</strong> {{ importResult.importJob }}
        </p>
        <p v-if="importResult.connectionsImported !== undefined">
          <strong>Connections Imported:</strong> {{ importResult.connectionsImported }}
        </p>
        <p v-if="importResult.error" class="error-text">
          <strong>Error:</strong> {{ importResult.error }}
        </p>
      </div>
    </section>

    <section class="import-info card">
      <h3>File Format Requirements</h3>
      <div class="info-grid">
        <div>
          <h4>CSV Format</h4>
          <p>
            Your CSV file should contain columns for connection information such as:
            First Name, Last Name, Headline, Location, Company, etc.
          </p>
          <p class="muted">
            The system will automatically map your columns to the appropriate fields using AI.
          </p>
        </div>
        <div>
          <h4>JSON Format</h4>
          <p>
            Your JSON file should be an array of connection objects, or a single connection object.
          </p>
          <p class="muted">
            Each object should contain fields like firstName, lastName, headline, etc.
            The system will automatically map your fields using AI.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import StatusBanner from "@/components/StatusBanner.vue";
import { LinkedInImportAPI, ConceptApiError } from "@/services/conceptClient";
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
  error?: string;
} | null>(null);

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
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

function showBanner(type: "success" | "error", message: string) {
  banner.value = { type, message };
}

async function getOrCreateLinkedInAccount(): Promise<string> {
  if (!auth.userId) {
    throw new Error("You must be logged in to import connections");
  }

  // Try to get existing account
  try {
    const accounts = await LinkedInImportAPI.getLinkedInAccount({ user: auth.userId });
    if (accounts.length > 0) {
      return accounts[0]._id;
    }
  } catch (error) {
    // Account doesn't exist, we'll create one
  }

  // Create a placeholder account for file imports
  // Since we don't have OAuth tokens, we'll use placeholder values
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
    // Read file content
    const fileContent = await readFileContent(selectedFile.value);

    // Get or create LinkedIn account
    const account = await getOrCreateLinkedInAccount();

    // Determine file type and call appropriate import method
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
    };

    showBanner(
      "success",
      `Successfully imported ${result.connectionsImported} connections!`
    );
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
.import-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.import-actions {
  margin-bottom: 2rem;
}

.file-upload-section {
  margin-top: 1.5rem;
}

.file-input-wrapper {
  margin-bottom: 1rem;
}

.file-input-wrapper input[type="file"] {
  display: none;
}

.file-input-label {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: var(--primary-color, #007bff);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.file-input-label:hover:not(.disabled) {
  background: var(--primary-hover, #0056b3);
}

.file-input-label.disabled {
  background: #ccc;
  cursor: not-allowed;
}

.file-info {
  margin: 1rem 0;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.file-info p {
  margin: 0;
  line-height: 1.6;
}

.upload-btn {
  padding: 0.75rem 2rem;
  background: var(--success-color, #28a745);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.upload-btn:hover:not(:disabled) {
  background: var(--success-hover, #218838);
}

.upload-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.import-result {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f9f9f9;
  border-radius: 4px;
  border-left: 4px solid var(--primary-color, #007bff);
}

.import-result h3 {
  margin-top: 0;
}

.import-result p {
  margin: 0.5rem 0;
}

.error-text {
  color: var(--error-color, #dc3545);
}

.import-info {
  margin-top: 2rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 1rem;
}

.info-grid h4 {
  margin-top: 0;
  color: var(--primary-color, #007bff);
}

.muted-btn {
  padding: 0.5rem 1rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.muted-btn:hover:not(:disabled) {
  background: #5a6268;
}

.muted-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
