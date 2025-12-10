<template>
    <div class="network-display">
        <!-- Zoom Controls -->
        <div class="zoom-controls">
            <div class="zoom-buttons">
                <button @click="zoomOut" class="zoom-btn" title="Zoom Out">
                    <span>−</span>
                </button>
                <span class="zoom-level"
                    >{{ Math.round(zoomLevel * 100) }}%</span
                >
                <button @click="zoomIn" class="zoom-btn" title="Zoom In">
                    <span>+</span>
                </button>
                <button @click="resetView" class="zoom-btn" title="Reset View">
                    <span>↻</span>
                </button>
            </div>
            <div class="zoom-hint">
                <span>Ctrl/Cmd + wheel to zoom, drag to pan</span>
            </div>
        </div>

        <!-- Network Container -->
        <div
            ref="networkWrapper"
            class="network-wrapper"
            :class="{ 'is-panning': isPanning }"
            @wheel="handleWheel"
            @mousedown="startPan"
            @mousemove="pan"
            @mouseup="endPan"
            @mouseleave="endPan"
        >
            <div ref="scrollContainer" class="scroll-container">
                <div
                    ref="networkContainer"
                    class="network-container"
                    :style="containerStyle"
                >
                    <!-- SVG for edges -->
                    <svg
                        ref="svgCanvas"
                        class="network-svg"
                        :width="networkBounds.width"
                        :height="networkBounds.height"
                    >
                        <defs>
                            <marker
                                id="arrowhead"
                                markerWidth="10"
                                markerHeight="10"
                                refX="9"
                                refY="3"
                                orient="auto"
                            >
                                <polygon
                                    points="0 0, 10 3, 0 6"
                                    fill="#415a77"
                                />
                            </marker>
                        </defs>
                        <!-- Edges -->
                        <g id="edges-group">
                            <line
                                v-for="(edge, index) in computedEdges"
                                :key="`edge-${index}`"
                                :x1="edge.x1"
                                :y1="edge.y1"
                                :x2="edge.x2"
                                :y2="edge.y2"
                                stroke="#415a77"
                                stroke-width="2"
                                stroke-linecap="round"
                                marker-end="url(#arrowhead)"
                                class="network-edge"
                            />
                        </g>
                    </svg>

                    <!-- Nodes -->
                    <div class="nodes-container">
                        <div
                            v-for="node in computedNodes"
                            :key="node.id"
                            class="network-node"
                            :class="{
                                'is-root': node.isRoot,
                                'is-selected': selectedNodeId === node.id,
                            }"
                            :style="nodeStyle(node)"
                            @click="selectNode(node.id)"
                        >
                            <div class="node-circle">
                                <img
                                    v-if="node.avatarUrl && node.avatarUrl.trim() !== ''"
                                    :src="node.avatarUrl"
                                    :alt="node.label"
                                    class="node-avatar"
                                    :data-node-id="node.id"
                                    @error="handleImageError"
                                />
                                <span v-else class="node-initials">{{
                                    node.initials
                                }}</span>
                            </div>
                            <div class="node-tooltip">
                                <div class="tooltip-name">{{ node.label }}</div>
                                <div
                                    v-if="
                                        node.username &&
                                        node.username !== node.label
                                    "
                                    class="tooltip-username"
                                >
                                    {{ node.username }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-if="!hasNodes" class="empty-state">
            <div class="empty-icon">🔗</div>
            <h3>No Network Data</h3>
            <p>Create a network and add nodes to see the visualization.</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import type { AdjacencyMap } from "@/services/conceptClient";
import { useAvatarStore } from "@/stores/useAvatarStore";

interface Node {
    id: string;
    x: number;
    y: number;
    label: string;
    username?: string;
    avatarUrl: string;
    initials: string;
    isRoot: boolean;
}

interface Edge {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

interface Props {
    adjacency: AdjacencyMap | null;
    nodeProfiles: Record<
        string,
        { profile?: any; avatarUrl: string; username?: string }
    >;
    rootNodeId?: string | null;
    currentUserId?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
    rootNodeId: null,
    currentUserId: null,
});

const emit = defineEmits<{
    nodeSelected: [nodeId: string];
}>();

const avatarStore = useAvatarStore();

// Refs
const networkWrapper = ref<HTMLElement | null>(null);
const scrollContainer = ref<HTMLElement | null>(null);
const networkContainer = ref<HTMLElement | null>(null);
const svgCanvas = ref<SVGElement | null>(null);

// State
const zoomLevel = ref(0.5);
const isPanning = ref(false);
const panStartX = ref(0);
const panStartY = ref(0);
const networkBounds = ref({ width: 2000, height: 1500 });
const selectedNodeId = ref<string | null>(null);
const layoutedNodes = ref<Node[]>([]);
const layoutedEdges = ref<Edge[]>([]);
const lastAdjacencyHash = ref<string>("");

// Computed
const hasNodes = computed(() => {
    if (!props.adjacency) return false;
    return Object.keys(props.adjacency).length > 0;
});

const containerStyle = computed(() => ({
    transform: `scale(${zoomLevel.value})`,
    transformOrigin: "0 0",
    width: `${networkBounds.value.width}px`,
    height: `${networkBounds.value.height}px`,
}));

// Stable layout algorithm - calculates positions once
function calculateLayout(): { nodes: Node[]; edges: Edge[] } {
    if (!props.adjacency) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const nodeMap = new Map<string, Node>();
    const allNodeIds = new Set<string>();

    // Collect all node IDs
    Object.keys(props.adjacency).forEach((nodeId) => {
        allNodeIds.add(nodeId);
        props.adjacency![nodeId].forEach((edge) => {
            allNodeIds.add(edge.to);
        });
    });

    // Create nodes
    allNodeIds.forEach((nodeId) => {
            const profileData = props.nodeProfiles[nodeId] || {
            avatarUrl: "",
            username: nodeId,
        };

        const isRoot =
            nodeId === props.rootNodeId || nodeId === props.currentUserId;
        const label =
            profileData.profile?.headline || profileData.username || nodeId;
        const initials = getInitials(label);
        // Use empty string if avatar is default so initials will show
        const avatarUrl = profileData.avatarUrl === avatarStore.DEFAULT_AVATAR
            ? ""
            : profileData.avatarUrl;

        const node: Node = {
            id: nodeId,
            x: 0,
            y: 0,
            label,
            username: profileData.username,
            avatarUrl,
            initials,
            isRoot,
        };

        nodes.push(node);
        nodeMap.set(nodeId, node);
    });

    // Simple grid layout for now (can be improved with force-directed layout)
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const spacing = 200;
    const startX = 300;
    const startY = 300;

    nodes.forEach((node, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        node.x = startX + col * spacing;
        node.y = startY + row * spacing;
    });

    // If there's a root node, center it
    const rootNode = nodes.find((n) => n.isRoot);
    if (rootNode && nodes.length > 1) {
        rootNode.x = networkBounds.value.width / 2;
        rootNode.y = 200;

        // Arrange other nodes around root
        const otherNodes = nodes.filter((n) => !n.isRoot);
        const angleStep = (2 * Math.PI) / otherNodes.length;
        const radius = 300;

        otherNodes.forEach((node, index) => {
            const angle = index * angleStep;
            node.x = rootNode.x + Math.cos(angle) * radius;
            node.y = rootNode.y + Math.sin(angle) * radius;
        });
    }

    // Update bounds
    if (nodes.length > 0) {
        const minX = Math.min(...nodes.map((n) => n.x)) - 200;
        const maxX = Math.max(...nodes.map((n) => n.x)) + 200;
        const minY = Math.min(...nodes.map((n) => n.y)) - 200;
        const maxY = Math.max(...nodes.map((n) => n.y)) + 200;

        networkBounds.value = {
            width: Math.max(maxX - minX, 2000),
            height: Math.max(maxY - minY, 1500),
        };

        // Adjust positions to account for padding
        const offsetX = 200 - minX;
        const offsetY = 200 - minY;
        nodes.forEach((node) => {
            node.x += offsetX;
            node.y += offsetY;
        });
    }

    // Calculate edges
    const edges: Edge[] = [];

    if (props.adjacency) {
        Object.entries(props.adjacency).forEach(([fromId, edgeList]) => {
            const fromNode = nodeMap.get(fromId);
            if (!fromNode) return;

            edgeList.forEach((edge) => {
                const toNode = nodeMap.get(edge.to);
                if (!toNode) return;

                // Calculate edge endpoints (on node circle perimeter)
                const dx = toNode.x - fromNode.x;
                const dy = toNode.y - fromNode.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const nodeRadius = fromNode.isRoot ? 30 : 25;

                if (dist > 0) {
                    const offsetX = (dx / dist) * nodeRadius;
                    const offsetY = (dy / dist) * nodeRadius;

                    edges.push({
                        x1: fromNode.x + offsetX,
                        y1: fromNode.y + offsetY,
                        x2: toNode.x - offsetX,
                        y2: toNode.y - offsetY,
                    });
                }
            });
        });
    }

    return { nodes, edges };
}

// Create a hash of adjacency data to detect actual changes
function createAdjacencyHash(): string {
    if (!props.adjacency) return "";
    const keys = Object.keys(props.adjacency).sort();
    return JSON.stringify(
        keys.map((key) => ({
            key,
            edges: props.adjacency![key].map((e) => ({
                to: e.to,
                source: e.source,
            })),
        }))
    );
}

// Update layout only when adjacency or profiles actually change
function updateLayout() {
    if (!props.adjacency || Object.keys(props.adjacency).length === 0) {
        layoutedNodes.value = [];
        layoutedEdges.value = [];
        lastAdjacencyHash.value = "";
        return;
    }

    const currentHash = createAdjacencyHash();
    // Only recalculate if the adjacency structure actually changed
    if (currentHash === lastAdjacencyHash.value) {
        return;
    }

    lastAdjacencyHash.value = currentHash;
    const result = calculateLayout();
    layoutedNodes.value = result.nodes;
    layoutedEdges.value = result.edges;
}

// Computed properties that return stable refs
const computedNodes = computed(() => layoutedNodes.value);
const computedEdges = computed(() => layoutedEdges.value);

// Helper functions
function getInitials(text: string): string {
    if (!text) return "??";
    const trimmed = text.trim();
    if (trimmed.length === 0) return "??";

    // Split by spaces to get name parts
    const parts = trimmed.split(/\s+/).filter(part => part.length > 0);

    if (parts.length === 0) return "??";

    // If only one part, use first letter twice
    if (parts.length === 1) {
        const letter = parts[0][0].toUpperCase();
        return letter + letter;
    }

    // Get first letter of first name and first letter of last name
    const firstLetter = parts[0][0].toUpperCase();
    const lastLetter = parts[parts.length - 1][0].toUpperCase();
    return firstLetter + lastLetter;
}

function nodeStyle(node: Node) {
    return {
        left: `${node.x}px`,
        top: `${node.y}px`,
    };
}

function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    // Find which node this image belongs to and set their avatarUrl to empty
    const nodeId = img.getAttribute("data-node-id");
    if (nodeId) {
        const node = layoutedNodes.value.find(n => n.id === nodeId);
        if (node) {
            node.avatarUrl = "";
        }
    }
}

function selectNode(nodeId: string) {
    selectedNodeId.value = nodeId;
    emit("nodeSelected", nodeId);
}

// Zoom and pan functions
function zoomIn() {
    if (!scrollContainer.value) return;

    const centerX =
        scrollContainer.value.clientWidth / 2 +
        scrollContainer.value.scrollLeft;
    const centerY =
        scrollContainer.value.clientHeight / 2 +
        scrollContainer.value.scrollTop;
    const oldZoom = zoomLevel.value;

    zoomLevel.value = Math.min(zoomLevel.value * 1.2, 2);
    const scaleChange = zoomLevel.value / oldZoom;

    scrollContainer.value.scrollLeft =
        centerX - (centerX - scrollContainer.value.scrollLeft) * scaleChange;
    scrollContainer.value.scrollTop =
        centerY - (centerY - scrollContainer.value.scrollTop) * scaleChange;
}

function zoomOut() {
    if (!scrollContainer.value) return;

    const centerX =
        scrollContainer.value.clientWidth / 2 +
        scrollContainer.value.scrollLeft;
    const centerY =
        scrollContainer.value.clientHeight / 2 +
        scrollContainer.value.scrollTop;
    const oldZoom = zoomLevel.value;

    zoomLevel.value = Math.max(zoomLevel.value / 1.2, 0.1);
    const scaleChange = zoomLevel.value / oldZoom;

    scrollContainer.value.scrollLeft =
        centerX - (centerX - scrollContainer.value.scrollLeft) * scaleChange;
    scrollContainer.value.scrollTop =
        centerY - (centerY - scrollContainer.value.scrollTop) * scaleChange;
}

function resetView() {
    zoomLevel.value = 0.5;
    if (scrollContainer.value) {
        scrollContainer.value.scrollLeft = 0;
        scrollContainer.value.scrollTop = 0;
    }
}

function handleWheel(event: WheelEvent) {
    if (!scrollContainer.value) return;

    // Check if Ctrl/Cmd is held for zoom
    if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        const delta = event.deltaY;
        const zoomFactor = delta > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(
            0.1,
            Math.min(2, zoomLevel.value * zoomFactor)
        );

        // Zoom towards mouse position
        const rect = scrollContainer.value.getBoundingClientRect();
        const mouseX =
            event.clientX - rect.left + scrollContainer.value.scrollLeft;
        const mouseY =
            event.clientY - rect.top + scrollContainer.value.scrollTop;

        const scaleChange = newZoom / zoomLevel.value;
        zoomLevel.value = newZoom;

        scrollContainer.value.scrollLeft =
            mouseX - (mouseX - scrollContainer.value.scrollLeft) * scaleChange;
        scrollContainer.value.scrollTop =
            mouseY - (mouseY - scrollContainer.value.scrollTop) * scaleChange;
    }
}

function startPan(event: MouseEvent) {
    if (event.button !== 0) return;
    if (
        (event.target as HTMLElement).closest(".network-node") ||
        (event.target as HTMLElement).closest("button")
    ) {
        return;
    }

    isPanning.value = true;
    if (scrollContainer.value) {
        panStartX.value = event.clientX + scrollContainer.value.scrollLeft;
        panStartY.value = event.clientY + scrollContainer.value.scrollTop;
        scrollContainer.value.style.cursor = "grabbing";
    }
    event.preventDefault();
}

function pan(event: MouseEvent) {
    if (!isPanning.value || !scrollContainer.value) return;

    const deltaX = panStartX.value - event.clientX;
    const deltaY = panStartY.value - event.clientY;
    scrollContainer.value.scrollLeft = deltaX;
    scrollContainer.value.scrollTop = deltaY;
    event.preventDefault();
}

function endPan() {
    if (isPanning.value) {
        isPanning.value = false;
        if (scrollContainer.value) {
            scrollContainer.value.style.cursor = "grab";
        }
    }
}

// Watch for adjacency structure changes to recalculate layout
watch(
    () => props.adjacency,
    () => {
        updateLayout();
    },
    { deep: true, immediate: true }
);

// Watch for profile changes to update node labels/avatars without recalculating positions
watch(
    () => props.nodeProfiles,
    () => {
        // Update node data (labels, avatars) but keep positions stable
        if (layoutedNodes.value.length > 0) {
            layoutedNodes.value.forEach((node) => {
                const profileData = props.nodeProfiles[node.id] || {
                    avatarUrl: "",
                    username: node.id,
                };
                node.label =
                    profileData.profile?.headline ||
                    profileData.username ||
                    node.id;
                node.username = profileData.username;
                // Use empty string if avatar is default so initials will show
                node.avatarUrl = profileData.avatarUrl === avatarStore.DEFAULT_AVATAR
                    ? ""
                    : profileData.avatarUrl;
                node.initials = getInitials(node.label);
            });
        }
    },
    { deep: true }
);

// Initialize layout on mount
onMounted(() => {
    updateLayout();
});
</script>

<style scoped>
.network-display {
    width: 100%;
    position: relative;
}

.zoom-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--color-card);
    border-radius: 12px;
    border: 1px solid rgba(15, 23, 42, 0.08);
}

.zoom-buttons {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.zoom-btn {
    width: 36px;
    height: 36px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    font-size: 1.2rem;
    font-weight: 600;
    background: var(--color-navy-600);
    color: white;
    cursor: pointer;
    transition: background 0.2s ease;
}

.zoom-btn:hover {
    background: var(--color-navy-400);
}

.zoom-level {
    min-width: 60px;
    text-align: center;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--color-navy-900);
}

.zoom-hint {
    font-size: 0.75rem;
    color: var(--color-muted);
}

.network-wrapper {
    background: var(--color-card);
    border-radius: 16px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    overflow: hidden;
    position: relative;
    height: 70vh;
    min-height: 500px;
}

.network-wrapper.is-panning {
    cursor: grabbing;
}

.network-wrapper:not(.is-panning) {
    cursor: grab;
}

.scroll-container {
    width: 100%;
    height: 100%;
    overflow: auto;
    position: relative;
}

.network-container {
    position: relative;
    min-width: 100%;
    min-height: 100%;
}

.network-svg {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
}

.network-edge {
    pointer-events: none;
}

.nodes-container {
    position: relative;
    width: 100%;
    height: 100%;
}

.network-node {
    position: absolute;
    cursor: pointer;
    transform: translate(-50%, -50%);
    transition: z-index 0.2s ease;
    z-index: 10;
    will-change: transform;
}

.network-node:hover {
    transform: translate(-50%, -50%) scale(1.1);
    z-index: 20;
}

.network-node.is-selected {
    z-index: 15;
}

.node-circle {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #dbeafe;
    border: 3px solid #93c5fd;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    overflow: hidden;
}

.network-node.is-root .node-circle {
    width: 60px;
    height: 60px;
    border: 4px solid var(--color-navy-400);
    background: rgba(102, 153, 204, 0.2);
    box-shadow: 0 6px 16px rgba(65, 90, 119, 0.3);
}

.network-node.is-selected .node-circle {
    border-color: var(--color-navy-600);
    box-shadow: 0 0 0 4px rgba(65, 90, 119, 0.2);
}

.network-node:hover .node-circle {
    border-color: var(--color-navy-600);
    box-shadow: 0 6px 20px rgba(65, 90, 119, 0.4);
}

.node-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.node-initials {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-navy-900);
}

.network-node.is-root .node-initials {
    font-size: 1rem;
}

.node-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 8px;
    padding: 0.5rem 0.75rem;
    background: rgba(15, 23, 42, 0.95);
    color: white;
    border-radius: 8px;
    font-size: 0.85rem;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 100;
}

.network-node:hover .node-tooltip {
    opacity: 1;
}

.tooltip-name {
    font-weight: 600;
}

.tooltip-username {
    font-size: 0.75rem;
    opacity: 0.8;
    margin-top: 0.25rem;
}

.empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: var(--color-card);
    border-radius: 16px;
    border: 1px solid rgba(15, 23, 42, 0.08);
}

.empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.empty-state h3 {
    margin: 0 0 0.5rem;
    color: var(--color-navy-900);
}

.empty-state p {
    margin: 0;
    color: var(--color-muted);
}

@media (max-width: 768px) {
    .network-wrapper {
        height: 60vh;
        min-height: 400px;
    }

    .zoom-controls {
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
    }

    .zoom-hint {
        font-size: 0.7rem;
    }
}
</style>
