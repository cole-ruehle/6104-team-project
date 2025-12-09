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

                    <!-- Advanced Connection Options -->
                    <div class="form-section advanced-section">
                        <div class="advanced-toggle">
                            <button
                                type="button"
                                @click="showAdvanced = !showAdvanced"
                                class="advanced-toggle-btn"
                            >
                                <i class="fa-solid" :class="showAdvanced ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                                <span>Advanced Options</span>
                            </button>
                        </div>
                        <div v-if="showAdvanced" class="advanced-content">
                            <div class="form-section">
                                <label class="form-label">Connection Type</label>
                                <select
                                    v-model="form.connectionType"
                                    class="form-input"
                                >
                                    <option value="direct">Direct Connection (1st Degree)</option>
                                    <option value="through">Connected Through Someone Else</option>
                                </select>
                                <p class="form-hint">
                                    {{
                                        form.connectionType === "direct"
                                            ? "This person is directly connected to you."
                                            : "This person is connected to you through another connection."
                                    }}
                                </p>
                            </div>

                            <div
                                v-if="form.connectionType === 'through'"
                                class="form-section"
                            >
                                <label class="form-label">
                                    Connected Through *
                                </label>
                                <div class="search-input-wrapper">
                                    <input
                                        v-model.trim="form.connectedThroughDisplay"
                                        type="text"
                                        class="form-input"
                                        :required="form.connectionType === 'through'"
                                        placeholder="Search for a connection..."
                                        @input="searchConnectedThrough"
                                        @focus="showConnectedThroughDropdown = true"
                                        @blur="hideConnectedThroughDropdown"
                                    />
                                    <ul
                                        v-if="
                                            showConnectedThroughDropdown &&
                                            connectedThroughResults.length > 0
                                        "
                                        class="dropdown"
                                    >
                                        <li
                                            v-for="result in connectedThroughResults"
                                            :key="result._id"
                                            @mousedown="selectConnectedThrough(result)"
                                        >
                                            {{
                                                (
                                                    (result.firstName || "") +
                                                    " " +
                                                    (result.lastName || "")
                                                ).trim() ||
                                                result.label ||
                                                result._id
                                            }}
                                        </li>
                                    </ul>
                                </div>
                                <p class="form-hint">
                                    Search for the person who connects you to this
                                    new connection.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button
                            type="button"
                            class="btn-primary"
                            :disabled="saving || !form.firstName.trim() || !form.lastName.trim()"
                            @click="handleSubmit"
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
const showAdvanced = ref(false);
const showConnectedThroughDropdown = ref(false);
const connectedThroughResults = ref<Array<Record<string, any>>>([]);

const form = ref({
    firstName: "",
    lastName: "",
    location: "",
    company: "",
    jobTitle: "",
    headline: "",
    connectionType: "direct" as "direct" | "through",
    connectedThroughId: "",
    connectedThroughDisplay: "",
});

const emit = defineEmits<{
    close: [];
    success: [];
}>();

async function searchConnectedThrough() {
    if (!auth.userId) return;
    const query = form.value.connectedThroughDisplay.trim();
    if (query === "") {
        connectedThroughResults.value = [];
        return;
    }
    try {
        const res = await MultiSourceNetworkAPI.searchNodes({
            owner: auth.userId,
            query: query,
            limit: 8,
        });
        connectedThroughResults.value =
            (res.results as Array<Record<string, any>>) || [];
    } catch (e) {
        connectedThroughResults.value = [];
    }
}

function selectConnectedThrough(result: Record<string, any>) {
    const id = String(result._id || result._id);
    const name =
        ((result.firstName || "") + " " + (result.lastName || "")).trim() ||
        result.label ||
        id;
    form.value.connectedThroughId = id;
    form.value.connectedThroughDisplay = name;
    connectedThroughResults.value = [];
    showConnectedThroughDropdown.value = false;
}

function hideConnectedThroughDropdown() {
    setTimeout(() => {
        showConnectedThroughDropdown.value = false;
    }, 200);
}

async function handleSubmit(event?: Event) {
    console.log("[AddConnection] handleSubmit called", { event, form: form.value, userId: auth.userId });
    
    if (event) {
        event.preventDefault();
    }

    if (!auth.userId) {
        console.error("[AddConnection] No userId");
        alert("You must be signed in to add a connection.");
        return;
    }

    if (!form.value.firstName.trim() || !form.value.lastName.trim()) {
        console.error("[AddConnection] Missing firstName or lastName", { 
            firstName: form.value.firstName, 
            lastName: form.value.lastName 
        });
        alert("First name and last name are required.");
        return;
    }

    // Validate connected through if using that option
    if (
        form.value.connectionType === "through" &&
        (!form.value.connectedThroughId || !form.value.connectedThroughDisplay.trim())
    ) {
        console.error("[AddConnection] Missing intermediate connection");
        alert("Please select who you're connected through.");
        return;
    }

    console.log("[AddConnection] Starting submission...");
    saving.value = true;

    try {
        // Step 0: Ensure network exists and root is set (replicating old flow requirement)
        console.log("[AddConnection] Step 0: Ensuring network exists and root is set...");
        try {
            // Try to create network with user as root (will fail silently if network already exists)
            await MultiSourceNetworkAPI.createNetwork({
                owner: auth.userId,
                root: auth.userId,
            });
            console.log("[AddConnection] Network created with root");
        } catch (networkError: any) {
            // Network might already exist, that's fine
            // Try to set root node if it's not set
            try {
                await MultiSourceNetworkAPI.setRootNode({
                    owner: auth.userId,
                    root: auth.userId,
                });
                console.log("[AddConnection] Root node set");
            } catch (rootError: any) {
                // Root might already be set, that's fine
                console.log("[AddConnection] Network and root already exist or set");
            }
        }

        console.log("[AddConnection] Step 1: Creating node...");
        // Step 1: Create the node (same pattern as MultiSourceNetworkPage)
        const label = `${form.value.firstName} ${form.value.lastName}`.trim();
        const headline = form.value.headline || form.value.jobTitle || "";

        const createPayload: Record<string, unknown> = {
            owner: auth.userId,
            firstName: form.value.firstName.trim(),
            lastName: form.value.lastName.trim(),
            label: label,
            headline: headline,
            location: form.value.location.trim() || undefined,
            currentCompany: form.value.company.trim() || undefined,
            currentPosition: form.value.jobTitle.trim() || undefined,
            // Don't pass sourceIds for manual additions - this causes deduplication
            // Each manual addition should create a new node
        };

        console.log("[AddConnection] createNodeForUser payload:", createPayload);
        const created = await MultiSourceNetworkAPI.createNodeForUser(
            createPayload as any
        );
        console.log("[AddConnection] createNodeForUser response:", created);
        
        if (!created || !("node" in created)) {
            const errorMsg = String((created as any)?.error || "createNodeForUser failed");
            console.error("[AddConnection] createNodeForUser failed:", errorMsg, created);
            throw new Error(errorMsg);
        }
        
        const nodeId = (created as any).node as string;
        console.log("[AddConnection] Node created with ID:", nodeId);

        console.log("[AddConnection] Step 2: Adding node to network...");
        // Step 2: Add node to network with source "manual" (same pattern as MultiSourceNetworkPage)
        await MultiSourceNetworkAPI.addNodeToNetwork({
            owner: auth.userId,
            node: nodeId,
            source: "manual",
        });
        console.log("[AddConnection] Node added to network");

        console.log("[AddConnection] Step 3: Creating edge(s)...");
        // Step 3: Create edge(s) based on connection type
        // By default, connect to the current user (auth.userId)
        // If "connected through" is specified, connect through that intermediate node
        if (form.value.connectionType === "direct") {
            // Direct connection: user -> new connection (1st degree)
            console.log("[AddConnection] Creating direct edge from", auth.userId, "to", nodeId);
            await MultiSourceNetworkAPI.addEdge({
                owner: auth.userId,
                from: auth.userId,
                to: nodeId,
                source: "manual",
            });
            console.log("[AddConnection] Direct edge created");
        } else {
            // Connected through someone: user -> intermediate -> new connection (2nd degree)
            const intermediateId = form.value.connectedThroughId;

            if (!intermediateId) {
                throw new Error("Intermediate connection ID is required");
            }

            // Ensure intermediate is in network
            try {
                await MultiSourceNetworkAPI.addNodeToNetwork({
                    owner: auth.userId,
                    node: intermediateId,
                    source: "manual",
                });
            } catch (e) {
                console.log("[AddConnection] Intermediate may already be in network");
            }

            // Create edge from intermediate to new connection
            await MultiSourceNetworkAPI.addEdge({
                owner: auth.userId,
                from: intermediateId,
                to: nodeId,
                source: "manual",
            });

            // Ensure there's a path from user to intermediate (if not already exists)
            try {
                await MultiSourceNetworkAPI.addEdge({
                    owner: auth.userId,
                    from: auth.userId,
                    to: intermediateId,
                    source: "manual",
                });
            } catch (e) {
                // Edge may already exist, that's fine
                console.log("[AddConnection] User-to-intermediate edge may already exist");
            }
        }

        console.log("[AddConnection] SUCCESS - All steps completed!");

        // Reset form
        form.value = {
            firstName: "",
            lastName: "",
            location: "",
            company: "",
            jobTitle: "",
            headline: "",
            connectionType: "direct",
            connectedThroughId: "",
            connectedThroughDisplay: "",
        };
        showAdvanced.value = false;
        connectedThroughResults.value = [];

        emit("success");
        emit("close");
    } catch (error) {
        console.error("[AddConnection] ERROR:", error);
        const errorMessage =
            error instanceof Error
                ? error.message
                : "Failed to add connection. Please try again.";
        console.error("[AddConnection] Error message:", errorMessage);
        alert(errorMessage);
    } finally {
        saving.value = false;
        console.log("[AddConnection] handleSubmit finished, saving set to false");
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

.advanced-section {
    margin-top: 1rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(15, 23, 42, 0.1);
}

.advanced-toggle {
    margin-bottom: 1rem;
}

.advanced-toggle-btn {
    background: transparent;
    border: none;
    color: var(--color-navy-600);
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    transition: color 0.2s ease;
}

.advanced-toggle-btn:hover {
    color: var(--color-navy-900);
}

.advanced-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 0.5rem;
    border: 1px solid rgba(15, 23, 42, 0.08);
}

.form-hint {
    margin: 0;
    font-size: 0.75rem;
    color: #64748b;
    line-height: 1.4;
}

.search-input-wrapper {
    position: relative;
}

.dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 10;
    background: white;
    border: 1px solid rgba(15, 23, 42, 0.2);
    border-radius: 0.5rem;
    margin-top: 0.25rem;
    max-height: 200px;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dropdown li {
    padding: 0.75rem;
    cursor: pointer;
    transition: background 0.2s ease;
    font-size: 0.875rem;
    color: #1e293b;
}

.dropdown li:hover {
    background: #f1f5f9;
}

select.form-input {
    cursor: pointer;
}
</style>

