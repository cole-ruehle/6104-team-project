<template>
  <div class="network-display-styled">
    <!-- Header Banner -->
    <div class="network-header">
      <div class="header-content">
        <div class="header-icon">🔗</div>
        <div>
          <h1 class="header-title">Network Explorer</h1>
          <p class="header-subtitle">
            Explore and visualize your professional network connections
          </p>
        </div>
      </div>
    </div>

    <!-- Zoom Controls -->
    <div class="zoom-controls">
      <div class="zoom-buttons">
        <button
          @click="zoomOut"
          class="zoom-btn"
          title="Zoom Out"
        >
          <span>−</span>
        </button>
        <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
        <button
          @click="zoomIn"
          class="zoom-btn"
          title="Zoom In"
        >
          <span>+</span>
        </button>
        <button
          @click="resetView"
          class="zoom-btn reset-btn"
          title="Reset View"
        >
          <span>↻</span>
        </button>
      </div>
      <div class="zoom-hint">
        <span>💡</span>
        <span>Ctrl/Cmd + wheel to zoom, drag to pan</span>
      </div>
      <div class="network-stats" v-if="hasNodes">
        <span class="stat-item">
          Total: {{ layoutedNodes.length }} nodes
        </span>
        <span class="stat-item">
          Visible: {{ visibleNodes.length }} nodes
        </span>
        <span class="stat-item">
          Zoom: {{ Math.round(zoomLevel * 100) }}%
        </span>
      </div>
    </div>

    <!-- Network Container -->
    <div class="network-wrapper-container">
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
        <div
          ref="scrollContainer"
          class="scroll-container"
        >
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
                  id="arrowhead-styled"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
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
                  stroke="#3b82f6"
                  stroke-width="2"
                  stroke-linecap="round"
                  marker-end="url(#arrowhead-styled)"
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
                :class="{ 'is-root': node.isRoot, 'is-selected': selectedNodeId === node.id }"
                :style="nodeStyle(node)"
                @click="selectNode(node.id)"
              >
                <div class="node-circle">
                  <img
                    v-if="node.avatarUrl"
                    :src="node.avatarUrl"
                    :alt="node.displayName"
                    class="node-avatar"
                    @error="handleImageError"
                  />
                  <span v-else class="node-initials">{{ node.initials }}</span>
                </div>
                <!-- Tooltip showing name -->
                <div class="node-tooltip">
                  <div class="tooltip-name">{{ node.displayName }}</div>
                  <div v-if="node.username && node.username !== node.displayName" class="tooltip-username">
                    {{ node.username }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!hasNodes" class="empty-state">
      <div class="empty-state-content">
        <div class="empty-icon">🔗</div>
        <h3>No Network Data Available</h3>
        <p>Network graph data will appear here once it's loaded from the backend.</p>
        <p class="empty-hint">Create a network and add connections to see the visualization.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import type { AdjacencyMap } from "@/services/conceptClient";
import { useAvatarStore } from "@/stores/useAvatarStore";

interface Node {
  id: string;
  x: number;
  y: number;
  displayName: string;
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
  nodeProfiles: Record<string, { profile?: any; avatarUrl: string; username?: string }>;
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
const viewportBounds = ref({ x: 0, y: 0, width: 0, height: 0 });
const maxVisibleNodes = ref(500); // Maximum nodes to render at once

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

// Helper to get display name (prioritize name over ID)
function getDisplayName(nodeId: string, profileData: any): string {
  // Try profile headline first
  if (profileData?.profile?.headline) {
    return profileData.profile.headline;
  }
  // Try username
  if (profileData?.username && profileData.username !== nodeId) {
    return profileData.username;
  }
  // Try profile name if available
  if (profileData?.profile?.name) {
    return profileData.profile.name;
  }
  // Fallback to nodeId but try to make it readable
  return nodeId;
}

// Helper to get initials from display name
function getInitials(text: string): string {
  if (!text) return "?";
  const words = text.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return text.substring(0, 2).toUpperCase();
}

// Stable layout algorithm - calculates positions once
function calculateLayout(): { nodes: Node[]; edges: Edge[] } {
  if (!props.adjacency) return { nodes: [], edges: [] };

  const nodes: Node[] = [];
  const nodeMap = new Map<string, Node>();
  const allNodeIds = new Set<string>();

  // Collect all node IDs
  Object.keys(props.adjacency).forEach(nodeId => {
    allNodeIds.add(nodeId);
    props.adjacency![nodeId].forEach(edge => {
      allNodeIds.add(edge.to);
    });
  });

  // Create nodes with display names
  allNodeIds.forEach(nodeId => {
    const profileData = props.nodeProfiles[nodeId] || {
      avatarUrl: avatarStore.DEFAULT_AVATAR,
      username: nodeId,
    };

    const isRoot = nodeId === props.rootNodeId || nodeId === props.currentUserId;
    const displayName = getDisplayName(nodeId, profileData);
    const initials = getInitials(displayName);

    const node: Node = {
      id: nodeId,
      x: 0,
      y: 0,
      displayName,
      username: profileData.username,
      avatarUrl: profileData.avatarUrl,
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
  const rootNode = nodes.find(n => n.isRoot);
  if (rootNode && nodes.length > 1) {
    rootNode.x = networkBounds.value.width / 2;
    rootNode.y = 200;
    
    // Arrange other nodes around root
    const otherNodes = nodes.filter(n => !n.isRoot);
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
    const minX = Math.min(...nodes.map(n => n.x)) - 200;
    const maxX = Math.max(...nodes.map(n => n.x)) + 200;
    const minY = Math.min(...nodes.map(n => n.y)) - 200;
    const maxY = Math.max(...nodes.map(n => n.y)) + 200;

    networkBounds.value = {
      width: Math.max(maxX - minX, 2000),
      height: Math.max(maxY - minY, 1500),
    };

    // Adjust positions to account for padding
    const offsetX = 200 - minX;
    const offsetY = 200 - minY;
    nodes.forEach(node => {
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

      edgeList.forEach(edge => {
        const toNode = nodeMap.get(edge.to);
        if (!toNode) return;

        // Calculate edge endpoints (on node circle perimeter)
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nodeRadius = fromNode.isRoot ? 40 : 32;

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
  return JSON.stringify(keys.map(key => ({
    key,
    edges: props.adjacency![key].map(e => ({ to: e.to, source: e.source }))
  })));
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

// Update viewport bounds based on scroll position and zoom
function updateViewportBounds() {
  if (!scrollContainer.value) return;
  
  const rect = scrollContainer.value.getBoundingClientRect();
  const scale = zoomLevel.value;
  const scrollLeft = scrollContainer.value.scrollLeft;
  const scrollTop = scrollContainer.value.scrollTop;
  
  // Calculate visible area in network coordinates (accounting for zoom)
  viewportBounds.value = {
    x: scrollLeft / scale - 100, // Add padding for edge rendering
    y: scrollTop / scale - 100,
    width: (rect.width / scale) + 200,
    height: (rect.height / scale) + 200,
  };
}

// Check if a point is in viewport
function isInViewport(x: number, y: number, padding = 50): boolean {
  const vp = viewportBounds.value;
  return x >= vp.x - padding && 
         x <= vp.x + vp.width + padding &&
         y >= vp.y - padding && 
         y <= vp.y + vp.height + padding;
}

// Check if an edge is in viewport
function isEdgeInViewport(edge: Edge): boolean {
  // Check if either endpoint or midpoint is in viewport
  const midX = (edge.x1 + edge.x2) / 2;
  const midY = (edge.y1 + edge.y2) / 2;
  return isInViewport(edge.x1, edge.y1) || 
         isInViewport(edge.x2, edge.y2) ||
         isInViewport(midX, midY);
}

// Computed: Get visible nodes based on viewport and zoom level
const visibleNodes = computed(() => {
  if (layoutedNodes.value.length === 0) return [];
  
  // At very low zoom, show only root nodes and high-degree nodes
  if (zoomLevel.value < 0.2) {
    // Show only root nodes and nodes with many connections
    const nodeConnectionCount = new Map<string, number>();
    if (props.adjacency) {
      Object.entries(props.adjacency).forEach(([nodeId, edges]) => {
        nodeConnectionCount.set(nodeId, edges.length);
        edges.forEach(e => {
          nodeConnectionCount.set(e.to, (nodeConnectionCount.get(e.to) || 0) + 1);
        });
      });
    }
    
    return layoutedNodes.value
      .filter(node => {
        const isRoot = node.isRoot;
        const connections = nodeConnectionCount.get(node.id) || 0;
        return isRoot || connections > 10; // Show nodes with >10 connections
      })
      .slice(0, 100); // Limit to 100 nodes at very low zoom
  }
  
  // At medium zoom, show nodes in viewport
  if (zoomLevel.value < 0.5) {
    const inViewport = layoutedNodes.value.filter(node => 
      isInViewport(node.x, node.y)
    );
    
    // If too many, prioritize root nodes and selected nodes
    if (inViewport.length > maxVisibleNodes.value) {
      const priority = inViewport.filter(n => n.isRoot || n.id === selectedNodeId.value);
      const others = inViewport.filter(n => !n.isRoot && n.id !== selectedNodeId.value);
      return [...priority, ...others.slice(0, maxVisibleNodes.value - priority.length)];
    }
    return inViewport;
  }
  
  // At high zoom, show all nodes in viewport
  const inViewport = layoutedNodes.value.filter(node => 
    isInViewport(node.x, node.y)
  );
  
  // Still limit to maxVisibleNodes for performance
  if (inViewport.length > maxVisibleNodes.value) {
    const priority = inViewport.filter(n => n.isRoot || n.id === selectedNodeId.value);
    const others = inViewport.filter(n => !n.isRoot && n.id !== selectedNodeId.value);
    return [...priority, ...others.slice(0, maxVisibleNodes.value - priority.length)];
  }
  
  return inViewport;
});

// Create a map of node positions for efficient edge lookup
const nodePositionMap = computed(() => {
  const map = new Map<string, { x: number; y: number }>();
  layoutedNodes.value.forEach(node => {
    map.set(node.id, { x: node.x, y: node.y });
  });
  return map;
});

// Computed: Get visible edges (only edges between visible nodes)
const visibleEdges = computed(() => {
  if (layoutedEdges.value.length === 0) return [];
  
  const visibleNodeIds = new Set(visibleNodes.value.map(n => n.id));
  const posMap = nodePositionMap.value;
  
  // At very low zoom, show only edges to/from root nodes
  if (zoomLevel.value < 0.2) {
    const rootNodeIds = new Set(
      layoutedNodes.value.filter(n => n.isRoot).map(n => n.id)
    );
    return layoutedEdges.value.filter(edge => {
      // Find nodes by matching edge endpoints to node positions
      let fromId: string | null = null;
      let toId: string | null = null;
      
      for (const [nodeId, pos] of posMap.entries()) {
        if (Math.abs(pos.x - edge.x1) < 10 && Math.abs(pos.y - edge.y1) < 10) {
          fromId = nodeId;
        }
        if (Math.abs(pos.x - edge.x2) < 10 && Math.abs(pos.y - edge.y2) < 10) {
          toId = nodeId;
        }
        if (fromId && toId) break;
      }
      
      return fromId && toId && 
             (rootNodeIds.has(fromId) || rootNodeIds.has(toId)) &&
             visibleNodeIds.has(fromId) && 
             visibleNodeIds.has(toId);
    }).slice(0, 200); // Limit edges at low zoom
  }
  
  // Filter edges that are in viewport and connect visible nodes
  return layoutedEdges.value.filter(edge => {
    if (!isEdgeInViewport(edge)) return false;
    
    // Find nodes by matching edge endpoints to node positions
    let fromId: string | null = null;
    let toId: string | null = null;
    
    for (const [nodeId, pos] of posMap.entries()) {
      if (Math.abs(pos.x - edge.x1) < 10 && Math.abs(pos.y - edge.y1) < 10) {
        fromId = nodeId;
      }
      if (Math.abs(pos.x - edge.x2) < 10 && Math.abs(pos.y - edge.y2) < 10) {
        toId = nodeId;
      }
      if (fromId && toId) break;
    }
    
    return fromId && toId && 
           visibleNodeIds.has(fromId) && 
           visibleNodeIds.has(toId);
  }).slice(0, maxVisibleNodes.value * 2); // Limit edges
});

// Computed properties that return visible nodes/edges
const computedNodes = computed(() => visibleNodes.value);
const computedEdges = computed(() => visibleEdges.value);

function nodeStyle(node: Node) {
  return {
    left: `${node.x}px`,
    top: `${node.y}px`,
  };
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.src = avatarStore.DEFAULT_AVATAR;
}

function selectNode(nodeId: string) {
  selectedNodeId.value = nodeId;
  emit("nodeSelected", nodeId);
}

// Zoom and pan functions
function zoomIn() {
  if (!scrollContainer.value) return;
  
  const centerX = scrollContainer.value.clientWidth / 2 + scrollContainer.value.scrollLeft;
  const centerY = scrollContainer.value.clientHeight / 2 + scrollContainer.value.scrollTop;
  const oldZoom = zoomLevel.value;
  
  zoomLevel.value = Math.min(zoomLevel.value * 1.2, 2);
  const scaleChange = zoomLevel.value / oldZoom;
  
  scrollContainer.value.scrollLeft = centerX - (centerX - scrollContainer.value.scrollLeft) * scaleChange;
  scrollContainer.value.scrollTop = centerY - (centerY - scrollContainer.value.scrollTop) * scaleChange;
  
  updateViewportBounds();
}

function zoomOut() {
  if (!scrollContainer.value) return;
  
  const centerX = scrollContainer.value.clientWidth / 2 + scrollContainer.value.scrollLeft;
  const centerY = scrollContainer.value.clientHeight / 2 + scrollContainer.value.scrollTop;
  const oldZoom = zoomLevel.value;
  
  zoomLevel.value = Math.max(zoomLevel.value / 1.2, 0.1);
  const scaleChange = zoomLevel.value / oldZoom;
  
  scrollContainer.value.scrollLeft = centerX - (centerX - scrollContainer.value.scrollLeft) * scaleChange;
  scrollContainer.value.scrollTop = centerY - (centerY - scrollContainer.value.scrollTop) * scaleChange;
  
  updateViewportBounds();
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
    const newZoom = Math.max(0.1, Math.min(2, zoomLevel.value * zoomFactor));

    // Zoom towards mouse position
    const rect = scrollContainer.value.getBoundingClientRect();
    const mouseX = event.clientX - rect.left + scrollContainer.value.scrollLeft;
    const mouseY = event.clientY - rect.top + scrollContainer.value.scrollTop;

    const scaleChange = newZoom / zoomLevel.value;
    zoomLevel.value = newZoom;

    scrollContainer.value.scrollLeft = mouseX - (mouseX - scrollContainer.value.scrollLeft) * scaleChange;
    scrollContainer.value.scrollTop = mouseY - (mouseY - scrollContainer.value.scrollTop) * scaleChange;
    
    updateViewportBounds();
  } else {
    // Update viewport on regular scroll
    updateViewportBounds();
  }
}

function startPan(event: MouseEvent) {
  if (event.button !== 0) return;
  if ((event.target as HTMLElement).closest(".network-node") || 
      (event.target as HTMLElement).closest("button")) {
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
  updateViewportBounds();
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
      layoutedNodes.value.forEach(node => {
        const profileData = props.nodeProfiles[node.id] || {
          avatarUrl: avatarStore.DEFAULT_AVATAR,
          username: node.id,
        };
        node.displayName = getDisplayName(node.id, profileData);
        node.username = profileData.username;
        node.avatarUrl = profileData.avatarUrl;
        node.initials = getInitials(node.displayName);
      });
    }
  },
  { deep: true }
);

let viewportUpdateInterval: number | null = null;

// Initialize layout on mount
onMounted(() => {
  updateLayout();
  updateViewportBounds();
  
  // Update viewport on scroll
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener('scroll', updateViewportBounds);
  }
  
  // Update viewport periodically and on resize
  viewportUpdateInterval = window.setInterval(() => {
    updateViewportBounds();
  }, 100);
  
  window.addEventListener('resize', updateViewportBounds);
});

onBeforeUnmount(() => {
  if (viewportUpdateInterval !== null) {
    clearInterval(viewportUpdateInterval);
  }
  window.removeEventListener('resize', updateViewportBounds);
  if (scrollContainer.value) {
    scrollContainer.value.removeEventListener('scroll', updateViewportBounds);
  }
});
</script>

<style scoped>
.network-display-styled {
  width: 100%;
  position: relative;
}

/* Header Banner */
.network-header {
  margin-bottom: 1.5rem;
  padding: 0 0.5rem;
}

.header-content {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.header-icon {
  font-size: 1.5rem;
  color: var(--color-navy-600);
}

.header-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.025em;
  color: var(--color-navy-900);
}

.header-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #475569;
}

/* Zoom Controls */
.zoom-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.zoom-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.zoom-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  background: white;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(15, 23, 42, 0.1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.zoom-btn:hover {
  background: #f1f5f9;
  color: var(--color-navy-900);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.zoom-btn.reset-btn {
  margin-left: 0.5rem;
}

.zoom-level {
  min-width: 60px;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-navy-900);
}

.zoom-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #64748b;
}

.zoom-hint span:first-child {
  font-size: 0.875rem;
}

.network-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: #64748b;
}

.stat-item {
  padding: 0.25rem 0.5rem;
  background: #f1f5f9;
  border-radius: 0.25rem;
  font-weight: 600;
}

/* Network Wrapper Container */
.network-wrapper-container {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(15, 23, 42, 0.08);
  overflow: hidden;
  padding: 1.5rem;
}

.network-wrapper {
  position: relative;
  height: 70vh;
  min-height: 500px;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
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

/* Network Nodes - Styled like reference */
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
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #dbeafe;
  border: 2px solid #93c5fd;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

.network-node.is-root .node-circle {
  width: 80px;
  height: 80px;
  border: 3px solid #dc2626;
  background: rgba(220, 38, 38, 0.1);
  box-shadow: 0 6px 20px rgba(220, 38, 38, 0.3);
}

.network-node.is-selected .node-circle {
  border-color: #dc2626;
  box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.2);
}

.network-node:hover .node-circle {
  border-color: #dc2626;
  box-shadow: 0 8px 24px rgba(220, 38, 38, 0.4);
}

.node-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.node-initials {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.network-node.is-root .node-initials {
  font-size: 1.25rem;
}

.node-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 10px;
  padding: 0.5rem 0.75rem;
  background: rgba(15, 23, 42, 0.95);
  color: white;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 1rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.empty-state-content {
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-state h3 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-navy-900);
}

.empty-state p {
  margin: 0.5rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.empty-hint {
  margin-top: 0.75rem !important;
  font-size: 0.85rem !important;
  color: #94a3b8 !important;
}

@media (max-width: 768px) {
  .network-wrapper {
    height: 60vh;
    min-height: 400px;
  }

  .network-wrapper-container {
    padding: 1rem;
  }

  .zoom-controls {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .zoom-hint {
    font-size: 0.7rem;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .header-title {
    font-size: 1.1rem;
  }

  .header-subtitle {
    font-size: 0.8rem;
  }
}
</style>

