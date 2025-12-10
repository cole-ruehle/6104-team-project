<template>
    <div class="network-display-vis">
        <!-- Degree Legend -->
        <div
            v-if="hasNodes"
            class="degree-legend"
        >
            <div class="legend-title">
                Connection Levels (by shortest path):
            </div>
            <div class="legend-item">
                <div class="legend-color" style="border-color: #dc2626;"></div>
                <span>Root (Self)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="border-color: #facc15;"></div>
                <span>1st Degree</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="border-color: #22c55e;"></div>
                <span>2nd Degree</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="border-color: #38bdf8;"></div>
                <span>3rd Degree</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="border-color: #a855f7;"></div>
                <span>4th Degree</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="border-color: #6b7280;"></div>
                <span>5th+ Degree</span>
            </div>
        </div>

        <!-- Network Container -->
        <div class="network-visualization-container">
            <!-- Search Bar (inside graph) -->
            <div v-if="hasNodes" class="graph-search-bar">
                <div class="search-input-wrapper">
                    <input
                        type="text"
                        v-model="searchQuery"
                        @input="handleSearchInput"
                        @keydown.enter="handleSearchSubmit"
                        placeholder="Search nodes..."
                        class="search-input"
                    />
                    <p class="fa-solid fa-search search-icon"></p>
                </div>
                <button
                    @click="handleSearchSubmit"
                    class="search-submit-btn"
                    title="Search"
                >
                    <p class="fa-solid fa-search">🔍</p>
                </button>
                <button
                    v-if="searchQuery"
                    @click="clearSearch"
                    class="clear-search-btn"
                    title="Clear search"
                >
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>

            <!-- Connection Mode Toggle (inside graph) -->
            <div v-if="hasNodes" class="connection-mode-toggle-inside">
                <label class="toggle-label">
                    <span>Connection Mode</span>
                    <div
                        class="toggle-switch"
                        :class="{ active: connectionMode }"
                        @click="connectionMode = !connectionMode; onConnectionModeChange()"
                    >
                        <div class="toggle-slider"></div>
                    </div>
                </label>
                <p v-if="connectionMode" class="toggle-hint">
                    Click two nodes to connect them
                </p>
                <div v-if="connectionMode && selectedNodes.length > 0" class="selected-nodes-info">
                    <p>Selected: {{ selectedNodes.length }}/2</p>
                    <button @click="clearSelection" class="clear-selection-btn">Clear</button>
                </div>
            </div>

            <div ref="networkContainer" class="network-graph"></div>
            <!-- Center button (below search bar) -->
            <button
                v-if="networkInstance && hasNodes"
                @click="centerOnRoot"
                class="center-graph-btn"
                title="Center on root node"
            >
                <i class="fa-solid fa-crosshairs"></i>Center Root</button>
            <!-- Zoom indicator (bottom right) -->
            <div
                v-if="networkInstance && hasNodes"
                class="zoom-indicator"
            >
                {{ Math.round(currentZoom * 100) }}%
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
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { Network, DataSet } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";
import type { AdjacencyMap } from "@/services/conceptClient";
import { MultiSourceNetworkAPI } from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAvatarStore } from "@/stores/useAvatarStore";

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
    edgeCreated: [];
}>();

const auth = useAuthStore();
const avatarStore = useAvatarStore();
const connectionMode = ref(false);
const creatingEdge = ref(false);
const selectedNodes = ref<string[]>([]);
const edgeDataSet = ref<DataSet<any> | null>(null);
const nodeDataSet = ref<DataSet<any> | null>(null);
const originalNodeColors = ref<Map<string, string>>(new Map());
const searchQuery = ref("");

// Handle connection mode toggle
function onConnectionModeChange() {
    if (!networkInstance.value) return;

    // Clear selection when toggling off
    if (!connectionMode.value) {
        clearSelection();
        // Reset all node borders to original state with degree-based colors
        if (nodeDataSet.value) {
            const nodes = nodeDataSet.value;
            nodes.forEach((node: any) => {
                const isRoot = node.id === props.rootNodeId || node.id === props.currentUserId;
                const originalBorderColor = originalNodeColors.value.get(node.id) || node.color.border;
                nodes.update({
                    id: node.id,
                    borderWidth: isRoot ? 6 : 4,
                    color: {
                        ...node.color,
                        border: originalBorderColor,
                    },
                });
            });
        }
    }

    // Enable/disable node dragging
    networkInstance.value.setOptions({
        interaction: {
            dragNodes: !connectionMode.value,
        },
        manipulation: {
            enabled: false,
        },
    });
}

// Handle node selection for connection mode
function handleNodeClick(nodeId: string) {
    if (!connectionMode.value) return;

    // If clicking the same node, deselect it
    if (selectedNodes.value.includes(nodeId)) {
        selectedNodes.value = selectedNodes.value.filter(id => id !== nodeId);
        updateNodeSelection();
        return;
    }

    // Add node to selection (max 2)
    if (selectedNodes.value.length < 2) {
        selectedNodes.value.push(nodeId);
        updateNodeSelection();

        // If we have 2 nodes selected, create the edge
        if (selectedNodes.value.length === 2) {
            createEdgeFromSelection();
        }
    } else {
        // Replace the first selected node with the new one
        selectedNodes.value = [selectedNodes.value[1], nodeId];
        updateNodeSelection();
        createEdgeFromSelection();
    }
}

// Update node visual selection
function updateNodeSelection() {
    if (!networkInstance.value || !nodeDataSet.value) return;

    const nodes = nodeDataSet.value;
    nodes.forEach((node: any) => {
        const isSelected = selectedNodes.value.includes(node.id);
        const isRoot = node.id === props.rootNodeId || node.id === props.currentUserId;

        // Get original border color from stored map, fallback to current color
        const originalBorderColor = originalNodeColors.value.get(node.id) || node.color.border;

        nodes.update({
            id: node.id,
            borderWidth: isSelected ? 8 : (isRoot ? 6 : 4),
            color: {
                ...node.color,
                border: isSelected ? "#9333ea" : originalBorderColor,
            },
        });
    });
}

// Clear node selection
function clearSelection() {
    selectedNodes.value = [];
    updateNodeSelection();
}

// Handle search input
function handleSearchInput() {
    applySearchFilter();
}

// Handle search submit (Enter key or button click)
function handleSearchSubmit() {
    applySearchFilter();
}

// Clear search
function clearSearch() {
    searchQuery.value = "";
    applySearchFilter();
}

// Apply search filter to nodes
function applySearchFilter() {
    if (!nodeDataSet.value || !networkInstance.value) return;

    const nodes = nodeDataSet.value;
    const query = searchQuery.value.toLowerCase().trim();

    if (!query) {
        // Show all nodes
        nodes.forEach((node: any) => {
            nodes.update({
                id: node.id,
                hidden: false,
            });
        });
        return;
    }

    // Filter nodes based on search query and find matching nodes
    const matchingNodeIds: string[] = [];
    nodes.forEach((node: any) => {
        const nodeLabel = (node.label || "").toLowerCase();
        const matches = nodeLabel.includes(query);

        if (matches) {
            matchingNodeIds.push(node.id);
        }

        nodes.update({
            id: node.id,
            hidden: !matches,
        });
    });

    // Auto-zoom and center on the first matching node
    if (matchingNodeIds.length > 0) {
        setTimeout(() => {
            if (!networkInstance.value) return;

            try {
                const targetNodeId = matchingNodeIds[0];
                const currentScale = networkInstance.value.getScale() || 1;

                // Focus on the matching node with animation
                networkInstance.value.focus(targetNodeId, {
                    scale: Math.min(currentScale * 1.5, 2), // Zoom in a bit more
                    animation: {
                        duration: 500,
                        easingFunction: "easeInOutQuad",
                    },
                });

                // Update zoom indicator
                setTimeout(() => {
                    if (networkInstance.value) {
                        const newScale = networkInstance.value.getScale();
                        if (newScale !== undefined) {
                            currentZoom.value = newScale;
                        }
                    }
                }, 100);
            } catch (error) {
                console.warn("Error focusing on searched node:", error);
                // Fallback to fit view if focus fails
                if (networkInstance.value) {
                    try {
                        networkInstance.value.fit({
                            animation: {
                                duration: 300,
                                easingFunction: "easeInOutQuad",
                            },
                        });
                    } catch (fitError) {
                        console.warn("Error fitting network after search:", fitError);
                    }
                }
            }
        }, 100);
    } else {
        // No matches, just fit to show all visible nodes
        setTimeout(() => {
            if (networkInstance.value) {
                try {
                    networkInstance.value.fit({
                        animation: {
                            duration: 300,
                            easingFunction: "easeInOutQuad",
                        },
                    });
                } catch (error) {
                    console.warn("Error fitting network after search:", error);
                }
            }
        }, 100);
    }
}

// Create edge from selected nodes
async function createEdgeFromSelection() {
    if (selectedNodes.value.length !== 2 || !auth.userId || creatingEdge.value) {
        return;
    }

    const [fromNode, toNode] = selectedNodes.value;

    if (fromNode === toNode) {
        return;
    }

    creatingEdge.value = true;

    try {
        // Create edge in backend
        await MultiSourceNetworkAPI.addEdge({
            owner: auth.userId,
            from: fromNode,
            to: toNode,
            source: "manual",
        });

        // Emit event to refresh adjacency data
        window.dispatchEvent(new CustomEvent("networkEdgeCreated"));
        emit("edgeCreated");

        // Clear selection after successful creation
        clearSelection();

        // Show success feedback
        console.log(`Edge created from ${fromNode} to ${toNode}`);
    } catch (error) {
        console.error("Error creating edge:", error);
        // Keep selection so user can try again
    } finally {
        creatingEdge.value = false;
    }
}

// Expose method to center on root node
function centerOnRoot() {
    if (!networkInstance.value) return;

    const rootId = props.rootNodeId || props.currentUserId;
    if (!rootId) return;

    try {
        const currentScale = networkInstance.value.getScale();
        networkInstance.value.focus(rootId, {
            scale: currentScale,
            animation: {
                duration: 500,
                easingFunction: "easeInOutQuad",
            },
        });
    } catch (error) {
        console.warn("Error centering on root node:", error);
    }
}

// Expose the centerOnRoot function for parent component
defineExpose({
    centerOnRoot,
});

// Refs
const networkContainer = ref<HTMLElement | null>(null);
const networkInstance = ref<Network | null>(null);
const currentZoom = ref<number>(1.0);

// Computed
const hasNodes = computed(() => {
    if (!props.adjacency) return false;
    return Object.keys(props.adjacency).length > 0;
});

// Helper function to get degree color
function getDegreeColor(nodeId: string, nodeDegrees: Map<string, number>): string {
    const degree = nodeDegrees.get(nodeId) ?? 999;
    const isRoot = nodeId === props.rootNodeId || nodeId === props.currentUserId;

    if (isRoot) {
        return "#dc2626"; // Red for root/self node
    } else if (degree === 1) {
        return "#facc15"; // Yellow for 1st degree
    } else if (degree === 2) {
        return "#22c55e"; // Green for 2nd degree
    } else if (degree === 3) {
        return "#38bdf8"; // Sky blue for 3rd degree
    } else if (degree === 4) {
        return "#a855f7"; // Purple for 4th degree
    } else {
        return "#6b7280"; // Gray for 5+ degree or disconnected
    }
}

// Helper function to get node size based on degree
function getNodeSize(nodeId: string, nodeDegrees: Map<string, number>): number {
    const degree = nodeDegrees.get(nodeId) ?? 999;
    const isRoot = nodeId === props.rootNodeId || nodeId === props.currentUserId;

    if (isRoot) {
        return 70; // Largest for root
    } else if (degree === 1) {
        return 50; // Large for 1st degree
    } else if (degree === 2) {
        return 40; // Medium for 2nd degree
    } else {
        return 35; // Smaller for 3+ degree
    }
}

// Calculate node degrees (distance from root) using BFS
function calculateNodeDegrees(
    nodeIds: string[],
    adjacency: AdjacencyMap
): Map<string, number> {
    const nodeDegrees = new Map<string, number>();
    const rootId = props.rootNodeId || props.currentUserId;

    if (!rootId) {
        // No root, set all to unknown degree
        nodeIds.forEach((nodeId) => nodeDegrees.set(nodeId, 999));
        return nodeDegrees;
    }

    // Build bidirectional adjacency map
    const bidirectionalAdj: Record<string, Set<string>> = {};
    for (const nodeId of nodeIds) {
        bidirectionalAdj[nodeId] = new Set<string>();
    }

    // Add all edges bidirectionally
    for (const nodeId of nodeIds) {
        const nodeEdges = adjacency[nodeId] || [];
        for (const edge of nodeEdges) {
            bidirectionalAdj[nodeId].add(edge.to);
            if (!bidirectionalAdj[edge.to]) {
                bidirectionalAdj[edge.to] = new Set<string>();
            }
            bidirectionalAdj[edge.to].add(nodeId);
        }
    }

    // BFS to calculate shortest distances from root
    if (rootId && (nodeIds.includes(rootId) || bidirectionalAdj[rootId])) {
        const queue: Array<{ id: string; degree: number }> = [
            { id: rootId, degree: 0 },
        ];
        nodeDegrees.set(rootId, 0);
        const visited = new Set<string>([rootId]);

        while (queue.length > 0) {
            const current = queue.shift()!;
            const neighbors = bidirectionalAdj[current.id] || new Set<string>();

            for (const neighborId of neighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    const nextDegree = current.degree + 1;
                    nodeDegrees.set(neighborId, nextDegree);
                    queue.push({ id: neighborId, degree: nextDegree });
                }
            }
        }

        // Set degree for any unvisited nodes (disconnected components)
        for (const nodeId of nodeIds) {
            if (!nodeDegrees.has(nodeId)) {
                nodeDegrees.set(nodeId, 999);
            }
        }

        // Also check for nodes that are targets but not in nodeIds
        for (const nodeId in bidirectionalAdj) {
            if (!nodeDegrees.has(nodeId)) {
                nodeDegrees.set(nodeId, 999);
            }
        }
    } else {
        // No root found, set all to unknown degree
        nodeIds.forEach((nodeId) => nodeDegrees.set(nodeId, 999));
    }

    return nodeDegrees;
}

// Render the network visualization
async function renderNetwork() {
    if (!props.adjacency) {
        console.log("No adjacency data available");
        return;
    }

    const nodeCount = Object.keys(props.adjacency).length;
    if (nodeCount === 0) {
        console.log("No nodes in adjacency data");
        return;
    }

    console.log(`Rendering network with ${nodeCount} node(s)`);

    // Wait for container to be available
    let attempts = 0;
    while (!networkContainer.value && attempts < 10) {
        await nextTick();
        await new Promise((resolve) => setTimeout(resolve, 50));
        attempts++;
    }

    if (!networkContainer.value) {
        console.error("Network container not available after waiting");
        return;
    }

    const nodes = new DataSet<any>([]);
    const edges = new DataSet<any>([]);

    // Clear and reset original node colors map
    originalNodeColors.value.clear();

    // Create nodes
    const nodeIds = Object.keys(props.adjacency);
    const allNodeIds = new Set<string>(nodeIds);

    // Collect all target nodes
    for (const nodeId of nodeIds) {
        const nodeEdges = props.adjacency[nodeId] || [];
        for (const edge of nodeEdges) {
            allNodeIds.add(edge.to);
        }
    }

    // Calculate node degrees
    const nodeDegrees = calculateNodeDegrees(Array.from(allNodeIds), props.adjacency);

    const isRoot = (nodeId: string) =>
        nodeId === props.rootNodeId || nodeId === props.currentUserId;

    // Track edges we've already added
    const addedEdges = new Set<string>();

    // Create nodes
    for (const nodeId of Array.from(allNodeIds)) {
        let profileData = props.nodeProfiles[nodeId];
        if (!profileData) {
            if (nodeId === props.currentUserId) {
                profileData = {
                    avatarUrl: avatarStore.getForUser(nodeId),
                    username: auth.username || nodeId,
                };
            } else {
                profileData = {
                    avatarUrl: avatarStore.DEFAULT_AVATAR,
                    username: nodeId,
                };
            }
        }

        // For root node: ensure we use profile picture from PublicProfile if available
        let avatarUrl = profileData.avatarUrl;
        if (nodeId === props.currentUserId && profileData.profile) {
            const publicProfile = profileData.profile as { profilePictureUrl?: string } | undefined;
            if (publicProfile?.profilePictureUrl) {
                avatarUrl = publicProfile.profilePictureUrl;
            }
        }

        // Use letter-based avatar if no profile picture is available
        if (avatarUrl === avatarStore.DEFAULT_AVATAR) {
            const nodeLabel =
                nodeId === props.currentUserId
                    ? auth.username || profileData.username || nodeId
                    : profileData.username || nodeId;
            avatarUrl = avatarStore.getLetterAvatar(nodeLabel);
        }

        const nodeColor = getDegreeColor(nodeId, nodeDegrees);
        const nodeLabel =
            nodeId === props.currentUserId
                ? auth.username || profileData.username || nodeId
                : profileData.username || nodeId;

        // Store original border color for later restoration
        originalNodeColors.value.set(nodeId, nodeColor);

        const node: any = {
            id: nodeId,
            label: nodeLabel,
            shape: "circularImage",
            image: avatarUrl,
            brokenImage: avatarStore.DEFAULT_AVATAR,
            borderWidth: isRoot(nodeId) ? 6 : 4,
            borderColor: nodeColor,
            color: {
                border: nodeColor,
                background: "#ffffff",
                highlight: {
                    border: nodeColor,
                    background: "#f0f0f0",
                },
            },
            font: {
                size: isRoot(nodeId) ? 16 : 14,
                face: "Inter",
                bold: isRoot(nodeId),
            },
            size: getNodeSize(nodeId, nodeDegrees),
            fixed: isRoot(nodeId) ? { x: true, y: true } : false,
        };

        nodes.add(node);

        // Create edges (only for nodes that are sources)
        if (nodeIds.includes(nodeId)) {
            const nodeEdges = props.adjacency[nodeId] || [];

            for (const edge of nodeEdges) {
                // Create a canonical edge ID (smaller ID first to avoid duplicates)
                const edgeId =
                    nodeId < edge.to
                        ? `${nodeId}-${edge.to}`
                        : `${edge.to}-${nodeId}`;

                if (addedEdges.has(edgeId)) {
                    continue; // Skip if we've already added this edge
                }
                addedEdges.add(edgeId);

                const fromDegree = nodeDegrees.get(nodeId) ?? 999;
                const toDegree = nodeDegrees.get(edge.to) ?? 999;
                const maxDegree = Math.max(fromDegree, toDegree);

                // Make edges match node colors
                let edgeOpacity = 1.0;
                let edgeWidth = edge.weight
                    ? Math.max(1, Math.min(5, edge.weight))
                    : 2;
                let edgeColor = "#dc2626";

                if (maxDegree === 0) {
                    edgeOpacity = 1.0;
                    edgeWidth = edge.weight ? Math.max(2, Math.min(5, edge.weight)) : 3;
                    edgeColor = "#dc2626";
                } else if (maxDegree === 1) {
                    edgeOpacity = 0.8;
                    edgeWidth = edge.weight ? Math.max(2, Math.min(5, edge.weight)) : 2.5;
                    edgeColor = "#facc15";
                } else if (maxDegree === 2) {
                    edgeOpacity = 0.7;
                    edgeWidth = edge.weight ? Math.max(1.5, Math.min(4, edge.weight)) : 2;
                    edgeColor = "#22c55e";
                } else if (maxDegree === 3) {
                    edgeOpacity = 0.6;
                    edgeWidth = edge.weight ? Math.max(1, Math.min(3, edge.weight)) : 1.5;
                    edgeColor = "#38bdf8";
                } else if (maxDegree === 4) {
                    edgeOpacity = 0.5;
                    edgeWidth = edge.weight ? Math.max(1, Math.min(3, edge.weight)) : 1.5;
                    edgeColor = "#a855f7";
                } else {
                    edgeOpacity = 0.4;
                    edgeWidth = edge.weight ? Math.max(1, Math.min(2, edge.weight)) : 1;
                    edgeColor = "#6b7280";
                }

                edges.add({
                    id: edgeId,
                    from: nodeId,
                    to: edge.to,
                    label: edge.weight ? String(edge.weight) : "",
                    width: edgeWidth,
                    arrows: {
                        to: {
                            enabled: false, // No arrows for bidirectional edges
                        },
                    },
                    color: {
                        color: edgeColor,
                        opacity: edgeOpacity,
                        highlight:
                            maxDegree === 0
                                ? "#dc2626"
                                : maxDegree === 1
                                ? "#facc15"
                                : maxDegree === 2
                                ? "#22c55e"
                                : maxDegree === 3
                                ? "#38bdf8"
                                : maxDegree === 4
                                ? "#a855f7"
                                : "#6b7280",
                    },
                });
            }
        }
    }

    const data = { nodes, edges };
    const options = {
        nodes: {
            shape: "circularImage",
            font: {
                size: 14,
                face: "Inter",
            },
            margin: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 20,
            },
            borderWidth: 4,
            chosen: {
                node: (values: any) => {
                    values.borderWidth = 6;
                },
                label: false,
            },
        },
        edges: {
            arrows: {
                to: {
                    enabled: false,
                },
            },
            smooth: {
                enabled: true,
                type: "curvedCW",
                roundness: 0.6,
            },
            length: 350,
            width: 2,
        },
        physics: {
            enabled: true,
            stabilization: {
                enabled: true,
                iterations: 200,
            },
            barnesHut:
                nodes.length > 1
                    ? {
                          gravitationalConstant: -4000,
                          centralGravity: 0.04,
                          springLength: 400,
                          springConstant: 0.02,
                          damping: 0.1,
                          avoidOverlap: 1.5,
                      }
                    : {
                          gravitationalConstant: -500,
                          centralGravity: 0.1,
                          springLength: 350,
                          springConstant: 0.001,
                          damping: 0.09,
                          avoidOverlap: 0,
                      },
        },
        interaction: {
            hover: true,
            tooltipDelay: 200,
            zoomView: true,
            dragView: true,
            dragNodes: true,
        },
        manipulation: {
            enabled: false,
        },
        layout: {
            improvedLayout: nodes.length > 1,
        },
    };

    // Destroy existing network if it exists
    if (networkInstance.value) {
        try {
            networkInstance.value.destroy();
        } catch (destroyError) {
            console.warn("Error destroying existing network instance:", destroyError);
        }
        networkInstance.value = null;
    }

    // Wait a bit to ensure cleanup is complete
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
        console.log(
            "Creating network visualization with",
            nodes.length,
            "nodes and",
            edges.length,
            "edges"
        );
        if (!networkContainer.value) {
            console.error("Network container is null, cannot create visualization");
            return;
        }
        networkInstance.value = new Network(
            networkContainer.value,
            data,
            options
        );
        console.log("Network visualization created successfully");

        // Store dataset references for later use
        edgeDataSet.value = edges;
        nodeDataSet.value = nodes;

        // Apply search filter if active
        applySearchFilter();

        // Handle node click
        networkInstance.value.on("click", (params: any) => {
            if (params.nodes && params.nodes.length > 0) {
                const nodeId = params.nodes[0];

                if (connectionMode.value) {
                    // In connection mode, handle node selection
                    handleNodeClick(nodeId);
                } else {
                    // Normal mode: emit node selection
                    emit("nodeSelected", nodeId);
                }
            }
        });

        // Frame the graph to show all nodes
        if (nodes.length > 0) {
            setTimeout(() => {
                try {
                    networkInstance.value?.fit({
                        animation: {
                            duration: 500,
                            easingFunction: "easeInOutQuad",
                        },
                    });

                    setTimeout(() => {
                        const currentScale = networkInstance.value?.getScale();
                        if (currentScale !== undefined && networkInstance.value) {
                            currentZoom.value = currentScale;

                            // Center the view on the root node if it exists
                            const rootId = props.rootNodeId || props.currentUserId;
                            if (rootId && nodes.get(rootId)) {
                                try {
                                    networkInstance.value.focus(rootId, {
                                        scale: currentScale,
                                        animation: {
                                            duration: 300,
                                            easingFunction: "easeInOutQuad",
                                        },
                                    });
                                } catch (error) {
                                    console.warn("Error focusing on root node:", error);
                                }
                            }

                            // Listen for zoom events
                            networkInstance.value.on("zoom", () => {
                                const scale = networkInstance.value?.getScale();
                                if (scale !== undefined) {
                                    currentZoom.value = scale;
                                }
                            });
                        }
                    }, 600);
                } catch (error) {
                    console.warn("Error fitting network:", error);
                }
            }, 500);
        } else {
            currentZoom.value = 1.0;
        }
    } catch (error) {
        console.error("Error creating network visualization:", error);
    }
}

// Watch for adjacency changes
watch(
    () => props.adjacency,
    async (newAdjacency: AdjacencyMap | null, oldAdjacency: AdjacencyMap | null) => {
        const newKeys = newAdjacency
            ? Object.keys(newAdjacency).sort().join(",")
            : "";
        const oldKeys = oldAdjacency
            ? Object.keys(oldAdjacency).sort().join(",")
            : "";
        if (newKeys !== oldKeys || (newAdjacency && Object.keys(newAdjacency).length > 0)) {
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 200));
            await renderNetwork();
        }
    },
    { deep: true }
);

// Watch for profile changes to update node labels/avatars
watch(
    () => props.nodeProfiles,
    async () => {
        // Re-render when profiles change
        if (props.adjacency && Object.keys(props.adjacency).length > 0) {
            await nextTick();
            await renderNetwork();
        }
    },
    { deep: true }
);

// Watch for search query changes to apply filter
watch(searchQuery, () => {
    applySearchFilter();
});

// Cleanup on unmount
onBeforeUnmount(() => {
    if (networkInstance.value) {
        networkInstance.value.destroy();
    }
});

// Listen for edge creation events to refresh network
onMounted(() => {
    if (props.adjacency && Object.keys(props.adjacency).length > 0) {
        renderNetwork();
    }

    // Listen for edge creation events to refresh adjacency
    window.addEventListener("networkEdgeCreated", handleNetworkEdgeCreated);
});

onBeforeUnmount(() => {
    window.removeEventListener("networkEdgeCreated", handleNetworkEdgeCreated);
});

function handleNetworkEdgeCreated() {
    // Trigger a refresh by emitting an event that parent can listen to
    // The parent component should reload adjacency data
    emit("edgeCreated");
}
</script>

<style scoped>
.network-display-vis {
    width: 100%;
    max-width: 100%;
    position: relative;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
}

.degree-legend {
    margin: 1rem 0;
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 8px;
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    align-items: center;
}

.legend-title {
    font-weight: 600;
    color: #475569;
    font-size: 0.9rem;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.legend-color {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    border: 4px solid;
}

.legend-item span {
    font-size: 0.85rem;
    color: #64748b;
}

.network-visualization-container {
    position: relative;
    background: var(--color-card);
    border-radius: 16px;
    border: 2px solid rgba(15, 23, 42, 0.15);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    height: 70vh;
    min-height: 500px;
    max-height: 80vh;
    width: 100%;
    margin: 0 auto;
}

.network-graph {
    width: 100%;
    height: 100%;
}

.zoom-indicator {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-navy-900);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 10;
}

.center-graph-btn {
    position: absolute;
    top: calc(3.5rem + 0.5rem);
    left: 1rem;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-navy-900);
    border: 1px solid rgba(15, 23, 42, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 10;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
}

.center-graph-btn:hover {
    background: rgba(255, 255, 255, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
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
    color: #64748b;
}

@media (max-width: 768px) {
    .network-visualization-container {
        height: 60vh;
        min-height: 400px;
    }
}

.connection-mode-toggle-inside {
    position: absolute;
    top: 1rem;
    right: 1rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border-radius: 8px;
    border: 1px solid rgba(15, 23, 42, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 10;
    min-width: 200px;
}

.toggle-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    user-select: none;
}

.toggle-switch {
    position: relative;
    width: 48px;
    height: 24px;
    background: #cbd5e1;
    border-radius: 12px;
    transition: all 0.3s ease;
    cursor: pointer;
    flex-shrink: 0;
}

.toggle-switch.active {
    background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
}

.toggle-slider {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-slider {
    transform: translateX(24px);
}

.toggle-hint {
    margin: 0.5rem 0 0 0;
    font-size: 0.85rem;
    color: #64748b;
    font-style: italic;
}

.selected-nodes-info {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(15, 23, 42, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.selected-nodes-info p {
    margin: 0;
    font-size: 0.85rem;
    color: #475569;
    font-weight: 500;
}

.clear-selection-btn {
    padding: 0.25rem 0.5rem;
    background: #f1f5f9;
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 4px;
    font-size: 0.75rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s ease;
}

.clear-selection-btn:hover {
    background: #e2e8f0;
    color: #475569;
}

.graph-search-bar {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    padding: 0.5rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(15, 23, 42, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    min-width: 250px;
}

.search-input-wrapper {
    position: relative;
    flex: 1;
}

.search-input {
    width: 100%;
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid rgba(15, 23, 42, 0.2);
    border-radius: 0.375rem;
    background: white;
    transition: all 0.2s ease;
    outline: none;
}

.search-input:focus {
    border-color: var(--color-navy-400);
    box-shadow: 0 0 0 3px rgba(102, 153, 204, 0.2);
}

.search-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    pointer-events: none;
    font-size: 0.875rem;
}

.search-submit-btn {
    padding: 0.5rem;
    background: var(--color-navy-600);
    border: 1px solid var(--color-navy-600);
    border-radius: 0.375rem;
    color: rgb(80, 127, 255);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
}

.search-submit-btn:hover {
    background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
    border-color: #9333ea;
    transform: translateY(-1px);
}

.clear-search-btn {
    padding: 0.5rem;
    background: #f1f5f9;
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 0.375rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
}

.clear-search-btn:hover {
    background: #e2e8f0;
    color: #475569;
}
</style>
