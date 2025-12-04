<template>
  <div class="duplicate-confirmation-page">
    <section class="header card">
      <h2 style="margin-top: 0">Review Potential Duplicates</h2>
      <p class="muted">
        This page helps you review potential duplicate individuals in your network. 
        <strong>When you click "Compare Connections Now"</strong>, it compares your newly imported LinkedIn connections 
        to existing nodes in your network using AI. High confidence matches (≥85% similarity) are 
        automatically merged. Only medium confidence matches are shown here for your review (low confidence 
        matches are not similar enough to be worth reviewing).
      </p>
      <div v-if="!loading && comparisons.length === 0" style="margin-top: 1rem;">
        <button 
          type="button" 
          class="btn-refresh"
          @click="loadComparisons"
          :disabled="loading"
        >
          {{ loading ? "Comparing..." : "Compare Connections Now" }}
        </button>
      </div>
    </section>

    <StatusBanner
      v-if="banner"
      :type="banner.type"
      :message="banner.message"
    />

    <section v-if="loading" class="loading card">
      <p>{{ loadingMessage || "Loading comparisons..." }}</p>
      <div v-if="comparisonProgress" class="progress-info">
        <p class="muted">{{ comparisonProgress }}</p>
      </div>
    </section>

    <section v-else-if="comparisons.length === 0" class="empty card">
      <p>No pending comparisons found.</p>
      <p class="muted" style="margin-top: 0.5rem">
        All potential duplicates have been reviewed, or there aren't enough nodes in your network to compare yet.
      </p>
    </section>

    <section v-else class="comparisons">
      <div
        v-for="comparison in comparisons"
        :key="comparison._id"
        class="comparison-card card"
      >
        <div class="comparison-header">
          <h3>Potential Match</h3>
          <div class="confidence-badge" :class="comparison.llmConfidence || 'pending'">
            <span v-if="comparison.llmSimilarityScore === undefined">
              Pending Analysis
            </span>
            <span v-else>
              {{ comparison.llmConfidence || "unknown" }} confidence
              ({{ Math.round(comparison.llmSimilarityScore * 100) }}% similar)
            </span>
          </div>
        </div>

        <div class="comparison-content">
          <div class="node-comparison">
            <div class="node-info">
              <h4>Node 1</h4>
              <div class="node-details">
                <p v-if="getNodeName(comparison.node1Info)">
                  <strong>Name:</strong> {{ getNodeName(comparison.node1Info) }}
                </p>
                <p v-if="comparison.node1Info?.headline">
                  <strong>Headline:</strong> {{ comparison.node1Info.headline }}
                </p>
                <p v-if="comparison.node1Info?.currentCompany">
                  <strong>Company:</strong> {{ comparison.node1Info.currentCompany }}
                </p>
                <p v-if="comparison.node1Info?.location">
                  <strong>Location:</strong> {{ comparison.node1Info.location }}
                </p>
                <p class="node-id"><small>ID: {{ comparison.node1 }}</small></p>
              </div>
            </div>

            <div class="vs-divider">vs</div>

            <div class="node-info">
              <h4>Node 2</h4>
              <div class="node-details">
                <p v-if="getNodeName(comparison.node2Info)">
                  <strong>Name:</strong> {{ getNodeName(comparison.node2Info) }}
                </p>
                <p v-if="comparison.node2Info?.headline">
                  <strong>Headline:</strong> {{ comparison.node2Info.headline }}
                </p>
                <p v-if="comparison.node2Info?.currentCompany">
                  <strong>Company:</strong> {{ comparison.node2Info.currentCompany }}
                </p>
                <p v-if="comparison.node2Info?.location">
                  <strong>Location:</strong> {{ comparison.node2Info.location }}
                </p>
                <p class="node-id"><small>ID: {{ comparison.node2 }}</small></p>
              </div>
            </div>
          </div>

          <div v-if="comparison.llmSimilarityScore === undefined" class="reasoning" style="background-color: #fff3cd; border-left-color: #ffc107;">
            <h4>Analysis Pending</h4>
            <p>This comparison has not been analyzed yet. Click "Analyze with AI" to get similarity assessment.</p>
            <button
              type="button"
              class="btn-analyze"
              @click="handleAnalyze(comparison)"
              :disabled="processing.has(comparison._id + '_analyze')"
              style="margin-top: 0.5rem;"
            >
              {{ processing.has(comparison._id + '_analyze') ? "Analyzing..." : "Analyze with AI" }}
            </button>
          </div>

          <div v-if="comparison.llmReasoning" class="reasoning">
            <h4>AI Reasoning:</h4>
            <p>{{ comparison.llmReasoning }}</p>
          </div>

          <div class="actions">
            <button
              type="button"
              class="btn-same"
              @click="handleConfirm(comparison, 'same')"
              :disabled="processing.has(comparison._id)"
            >
              {{ processing.has(comparison._id) ? "Processing..." : "Same Person" }}
            </button>
            <button
              type="button"
              class="btn-different"
              @click="handleConfirm(comparison, 'different')"
              :disabled="processing.has(comparison._id)"
            >
              {{ processing.has(comparison._id) ? "Processing..." : "Different People" }}
            </button>
            <button
              type="button"
              class="btn-cancel"
              @click="handleCancel(comparison)"
              :disabled="processing.has(comparison._id)"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import StatusBanner from "@/components/StatusBanner.vue";
import {
  LLMDisambiguationAPI,
  LinkedInImportAPI,
  MultiSourceNetworkAPI,
  PublicProfileAPI,
  ConceptApiError,
  type Comparison,
} from "@/services/conceptClient";
import { useAuthStore } from "@/stores/useAuthStore";

const auth = useAuthStore();
const loading = ref(true);
const loadingMessage = ref<string>("");
const comparisonProgress = ref<string>("");
const comparisons = ref<Comparison[]>([]);
const processing = ref<Set<string>>(new Set());
const banner = ref<{ type: "success" | "error"; message: string } | null>(null);

function getNodeName(nodeInfo?: Record<string, unknown>): string {
  if (!nodeInfo) return "";
  const firstName = nodeInfo.firstName as string | undefined;
  const lastName = nodeInfo.lastName as string | undefined;
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (lastName) return lastName;
  return "";
}

/**
 * Calculate string similarity using Levenshtein distance (0-1 scale, 1 = identical)
 */
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
}

/**
 * Check if two nodes have high string similarity in names/identifiers
 * Returns true if they should be compared with LLM
 */
function hasStringSimilarity(
  node1Info: Record<string, unknown>,
  node2Info: Record<string, unknown>
): boolean {
  // Compare names
  const name1 = getNodeName(node1Info);
  const name2 = getNodeName(node2Info);
  
  if (name1 && name2) {
    const nameSim = stringSimilarity(name1, name2);
    if (nameSim > 0.3) return true; // 30% name similarity threshold
  }
  
  // Compare first names
  const fn1 = (node1Info.firstName as string)?.toLowerCase().trim() || "";
  const fn2 = (node2Info.firstName as string)?.toLowerCase().trim() || "";
  if (fn1 && fn2 && stringSimilarity(fn1, fn2) > 0.5) return true;
  
  // Compare last names
  const ln1 = (node1Info.lastName as string)?.toLowerCase().trim() || "";
  const ln2 = (node2Info.lastName as string)?.toLowerCase().trim() || "";
  if (ln1 && ln2 && stringSimilarity(ln1, ln2) > 0.5) return true;
  
  // Compare companies
  const comp1 = (node1Info.currentCompany as string)?.toLowerCase().trim() || "";
  const comp2 = (node2Info.currentCompany as string)?.toLowerCase().trim() || "";
  if (comp1 && comp2 && stringSimilarity(comp1, comp2) > 0.6) return true;
  
  // Compare locations
  const loc1 = (node1Info.location as string)?.toLowerCase().trim() || "";
  const loc2 = (node2Info.location as string)?.toLowerCase().trim() || "";
  if (loc1 && loc2 && stringSimilarity(loc1, loc2) > 0.6) return true;
  
  return false;
}

/**
 * Get information about a node from various sources
 */
async function getNodeInfo(nodeId: string): Promise<Record<string, unknown> | null> {
  try {
    // First, try to get from LinkedIn connections
    try {
      const accounts = await LinkedInImportAPI.getLinkedInAccount({
        user: auth.userId!,
      });
      
      if (accounts.length > 0) {
        const connections = await LinkedInImportAPI.getConnections({
          account: accounts[0]._id,
        });
        const connection = connections.find((c) => c._id === nodeId);
        
        if (connection) {
          return {
            firstName: connection.firstName,
            lastName: connection.lastName,
            headline: connection.headline,
            location: connection.location,
            industry: connection.industry,
            currentPosition: connection.currentPosition,
            currentCompany: connection.currentCompany,
            summary: connection.summary,
            skills: connection.skills,
            education: connection.education,
            experience: connection.experience,
            profileUrl: connection.profileUrl,
          };
        }
      }
    } catch (e) {
      // LinkedIn not available, try other sources
      console.log(`Node ${nodeId} not found in LinkedIn connections`);
    }

    // Try PublicProfile
    try {
      const profileResult = await PublicProfileAPI.getProfile({ user: nodeId });
      const profile = profileResult[0]?.profile;
      if (profile) {
        return {
          headline: profile.headline,
          attributes: profile.attributes,
          links: profile.links,
        };
      }
    } catch (e) {
      // Profile not available
      console.log(`Node ${nodeId} not found in PublicProfile`);
    }

    // If no info found, return null
    return null;
  } catch (e) {
    console.error(`Error getting info for node ${nodeId}:`, e);
    return null;
  }
}

async function loadComparisons() {
  loading.value = true;
  banner.value = null;

  try {
    if (!auth.userId) {
      throw new Error("Not authenticated");
    }

    console.log("[DuplicateConfirmation] Starting to load comparisons for user:", auth.userId);

    // First, get all existing pending comparisons
    let pending: Comparison[] = [];
    try {
      console.log("[DuplicateConfirmation] Calling getPendingComparisons...");
      pending = await LLMDisambiguationAPI.getPendingComparisons();
      console.log("[DuplicateConfirmation] Found", pending.length, "existing pending comparisons");
    } catch (e) {
      console.error("[DuplicateConfirmation] Error loading pending comparisons:", e);
      const errorMsg = e instanceof ConceptApiError ? e.message : String(e);
      console.error("[DuplicateConfirmation] Full error details:", {
        message: errorMsg,
        error: e,
      });
      // If this fails, it might be a server issue - show the error but continue
      banner.value = {
        type: "error",
        message: `Warning: Could not load existing comparisons: ${errorMsg}. Will try to create new ones.`,
      };
    }
    
    const existingComparisons = new Map<string, Comparison>();
    for (const comp of pending) {
      existingComparisons.set(comp._id, comp);
    }
    
    // Show existing comparisons immediately
    comparisons.value = Array.from(existingComparisons.values());

    // Get all nodes in the network
    let networkNodes: string[] = [];
    try {
      console.log("[DuplicateConfirmation] Loading network nodes...");
      const adjacency = await MultiSourceNetworkAPI.getAdjacencyArray({
        owner: auth.userId,
      });
      console.log("[DuplicateConfirmation] Got adjacency data:", adjacency);
      networkNodes = Object.keys(adjacency);
      
      // Also collect target nodes from edges
      const allNodeIds = new Set<string>(networkNodes);
      for (const nodeId of networkNodes) {
        const edges = adjacency[nodeId] || [];
        for (const edge of edges) {
          allNodeIds.add(edge.to);
        }
      }
      networkNodes = Array.from(allNodeIds);
      console.log("[DuplicateConfirmation] Total unique nodes:", networkNodes.length);
    } catch (e) {
      console.error("[DuplicateConfirmation] Error loading network nodes:", e);
      const errorMsg = e instanceof ConceptApiError ? e.message : String(e);
      console.error("[DuplicateConfirmation] Network nodes error details:", {
        message: errorMsg,
        error: e,
      });
      banner.value = {
        type: "error",
        message: `Failed to load network nodes: ${errorMsg}. Showing existing comparisons only.`,
      };
      // Keep existing comparisons that were already loaded
      loading.value = false;
      return;
    }

    // Get LinkedIn connections (these are the "new" nodes to compare)
    let connections: Array<{ _id: string; [key: string]: unknown }> = [];
    try {
      const accounts = await LinkedInImportAPI.getLinkedInAccount({
        user: auth.userId,
      });
      if (accounts.length > 0) {
        const linkedInConnections = await LinkedInImportAPI.getConnections({
          account: accounts[0]._id,
        });
        connections = linkedInConnections;
      }
    } catch (e) {
      console.log("[DuplicateConfirmation] No LinkedIn connections found:", e);
    }

    if (networkNodes.length < 2 && connections.length === 0) {
      comparisons.value = Array.from(existingComparisons.values());
      loading.value = false;
      banner.value = {
        type: "success",
        message: "No nodes in your network yet. Import connections to start comparing.",
      };
      return;
    }

    // Strategy: Compare connections (newly added) to existing nodes
    // This is much more efficient than comparing all nodes to all nodes
    const connectionIds = new Set(connections.map(c => c._id));
    const existingNodeIds = networkNodes.filter(nodeId => !connectionIds.has(nodeId));

    if (connections.length === 0 || existingNodeIds.length === 0) {
      comparisons.value = Array.from(existingComparisons.values());
      loading.value = false;
      banner.value = {
        type: "success",
        message: connections.length === 0 
          ? "No connections to compare. Import LinkedIn connections first."
          : "No existing nodes to compare against.",
      };
      return;
    }

    const newComparisons: Comparison[] = [];
    const startTime = Date.now();
    let completedCount = 0;
    let llmCallCount = 0;

    // Compare each connection to each existing node
    // Limit to first 50 connections to avoid taking forever
    const connectionsToCompare = connections.slice(0, 50);
    if (connections.length > 50) {
      banner.value = {
        type: "success",
        message: `Comparing first 50 of ${connections.length} connections...`,
      };
    }

    // Limit existing nodes to compare against (first 100 to avoid too many comparisons)
    const nodesToCompare = existingNodeIds.slice(0, 100);
    
    // Step 1: Pre-filter using string similarity (fast, no LLM calls)
    loadingMessage.value = "Pre-filtering using string similarity...";
    const candidatePairs: Array<{
      connection: typeof connections[0];
      connectionInfo: Record<string, unknown>;
      existingNodeId: string;
      node2Info: Record<string, unknown>;
    }> = [];

    for (const connection of connectionsToCompare) {
      // Prepare connection info
      const connectionInfo: Record<string, unknown> = {
        firstName: connection.firstName,
        lastName: connection.lastName,
        headline: connection.headline,
        location: connection.location,
        industry: connection.industry,
        currentPosition: connection.currentPosition,
        currentCompany: connection.currentCompany,
        summary: connection.summary,
        skills: connection.skills,
        education: connection.education,
        experience: connection.experience,
        profileUrl: connection.profileUrl,
      };

      for (const existingNodeId of nodesToCompare) {
        // Skip if comparing to itself
        if (connection._id === existingNodeId) continue;

        // Check if comparison already exists
        try {
          const existing = await LLMDisambiguationAPI.getComparison({
            node1: connection._id,
            node2: existingNodeId,
          });

          if (existing.length > 0) {
            const comp = existing[0];
            // Include all pending comparisons (even without LLM analysis)
            if (comp.userDecision === "pending" || !comp.userDecision) {
              if (!existingComparisons.has(comp._id) && !newComparisons.find(c => c._id === comp._id)) {
                newComparisons.push(comp);
                comparisons.value = [...comparisons.value, comp];
              }
            }
            continue;
          }
        } catch (e) {
          console.error(`Error checking existing comparison:`, e);
          continue;
        }

        // Get info for the existing node
        const node2Info = await getNodeInfo(existingNodeId);
        
        // Only proceed if we have info for both nodes
        if (node2Info) {
          // Pre-filter: Only add to candidates if there's string similarity
          if (hasStringSimilarity(connectionInfo, node2Info)) {
            candidatePairs.push({
              connection,
              connectionInfo,
              existingNodeId,
              node2Info,
            });
          }
        }
      }
    }

    const totalCandidates = candidatePairs.length;
    loadingMessage.value = `Found ${totalCandidates} candidate pairs with string similarity. Creating comparisons...`;

    // Step 2: Create comparisons immediately (no LLM calls - those happen on-demand)
    for (const pair of candidatePairs) {
      try {
        completedCount++;
        comparisonProgress.value = `Creating comparison ${completedCount} of ${totalCandidates}...`;

        const result = await LLMDisambiguationAPI.compareNodes({
          node1: pair.connection._id,
          node2: pair.existingNodeId,
          node1Info: pair.connectionInfo,
          node2Info: pair.node2Info,
        });

        // Skip if no string similarity (concept returns error)
        if ("error" in result) {
          if (result.error.includes("No string similarity")) {
            // This is expected - skip silently
            continue;
          }
          // Other errors should be logged
          console.error(`Error comparing nodes:`, result.error);
          continue;
        }

        // Get the comparison details
        const [compDetails] = await LLMDisambiguationAPI.getComparisonDetails({
          comparison: result.comparison,
        });

        if (compDetails) {
          // Add all comparisons (even without LLM analysis yet)
          // They'll be analyzed on-demand when user views them
          newComparisons.push(compDetails);
          // Update UI incrementally
          comparisons.value = [...comparisons.value, compDetails];
        }
      } catch (e) {
        console.error(
          `Error comparing ${pair.connection._id} to ${pair.existingNodeId}:`,
          e
        );
      }
    }

    // Merge with existing comparisons (already added incrementally above)
    // Remove duplicates
    const seenIds = new Set<string>();
    comparisons.value = comparisons.value.filter(comp => {
      if (seenIds.has(comp._id)) return false;
      seenIds.add(comp._id);
      return true;
    });

    // Filter out comparisons that are clearly different (don't need user review)
    comparisons.value = comparisons.value.filter((comp) => {
      // Show all unanalyzed comparisons (user can analyze them)
      if (comp.llmSimilarityScore === undefined) {
        return true;
      }

      const similarity = comp.llmSimilarityScore || 0;
      const confidence = comp.llmConfidence;

      // Filter out clearly different matches:
      // - High confidence with very low similarity (< 0.3) = clearly different
      // - Low confidence with very low similarity (< 0.2) = clearly different
      if (confidence === "high" && similarity < 0.3) {
        return false; // High confidence they're different
      }
      if (confidence === "low" && similarity < 0.2) {
        return false; // Low similarity, low confidence = clearly different
      }

      // Show medium confidence matches (always need review)
      if (confidence === "medium") {
        return true;
      }

      // Show high confidence with decent similarity (0.3-0.84) - might need review
      if (confidence === "high" && similarity >= 0.3 && similarity < 0.85) {
        return true;
      }

      // Show low confidence with decent similarity (>= 0.2) - might be a match
      if (confidence === "low" && similarity >= 0.2) {
        return true;
      }

      // High confidence with >= 0.85 similarity = auto-merged, don't show
      if (confidence === "high" && similarity >= 0.85) {
        return false; // Already auto-merged by sync
      }

      return false; // Default: don't show
    });

    // Sort by: analyzed first (with similarity score), then by creation date
    comparisons.value.sort((a, b) => {
      const aHasAnalysis = a.llmSimilarityScore !== undefined;
      const bHasAnalysis = b.llmSimilarityScore !== undefined;
      if (aHasAnalysis && !bHasAnalysis) return -1;
      if (!aHasAnalysis && bHasAnalysis) return 1;
      if (aHasAnalysis && bHasAnalysis) {
        return (b.llmSimilarityScore || 0) - (a.llmSimilarityScore || 0);
      }
      // Both unanalyzed - sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const analyzedCount = comparisons.value.filter(c => c.llmSimilarityScore !== undefined).length;
    banner.value = {
      type: "success",
      message: `Completed in ${totalTime}s. Found ${comparisons.value.length} potential matches requiring review (${analyzedCount} analyzed, ${comparisons.value.length - analyzedCount} pending analysis).`,
    };
  } catch (error) {
    console.error("[DuplicateConfirmation] Error loading comparisons:", error);
    const errorDetails = error instanceof ConceptApiError 
      ? `${error.message}${error.status ? ` (Status: ${error.status})` : ''}`
      : error instanceof Error 
        ? error.message 
        : String(error);
    console.error("[DuplicateConfirmation] Full error:", error);
    banner.value = {
      type: "error",
      message: `Failed to load comparisons: ${errorDetails}. Please check the console for details.`,
    };
    // Still show existing comparisons if we have any
    comparisons.value = Array.from(existingComparisons.values());
  } finally {
    loading.value = false;
  }
}

async function handleConfirm(comparison: Comparison, decision: "same" | "different") {
  processing.value.add(comparison._id);

  try {
    // Confirm the comparison
    await LLMDisambiguationAPI.confirmComparison({
      comparison: comparison._id,
      userDecision: decision,
    });

    // If confirmed as "same", merge the nodes
    if (decision === "same") {
      // Determine which node to keep (prefer node2 as the existing one)
      const keepNode = comparison.node2;
      
      await LLMDisambiguationAPI.mergeNodes({
        comparison: comparison._id,
        keepNode,
      });

      // Update the network: remove node1, ensure node2 has linkedin source
      if (auth.userId) {
        try {
          // Remove node1 from network
          await MultiSourceNetworkAPI.removeNodeFromNetwork({
            owner: auth.userId,
            node: comparison.node1,
          });

          // Ensure node2 has linkedin source
          await MultiSourceNetworkAPI.addNodeToNetwork({
            owner: auth.userId,
            node: keepNode,
            source: "linkedin",
          });
        } catch (e) {
          console.error("Error updating network after merge:", e);
          // Don't fail the whole operation if network update fails
        }
      }

      banner.value = {
        type: "success",
        message: "Nodes merged successfully",
      };
    } else {
      banner.value = {
        type: "success",
        message: "Comparison confirmed as different people",
      };
    }

    // Remove from list
    comparisons.value = comparisons.value.filter(
      (c) => c._id !== comparison._id
    );
  } catch (error) {
    console.error("Error confirming comparison:", error);
    banner.value = {
      type: "error",
      message:
        error instanceof ConceptApiError
          ? error.message
          : "Failed to confirm comparison",
    };
  } finally {
    processing.value.delete(comparison._id);
  }
}

async function handleAnalyze(comparison: Comparison) {
  const processingKey = comparison._id + '_analyze';
  processing.value.add(processingKey);

  try {
    await LLMDisambiguationAPI.analyzeComparison({
      comparison: comparison._id,
    });

    // Refresh the comparison details
    const [updated] = await LLMDisambiguationAPI.getComparisonDetails({
      comparison: comparison._id,
    });

    if (updated) {
      // Update the comparison in the list
      const index = comparisons.value.findIndex(c => c._id === comparison._id);
      if (index !== -1) {
        comparisons.value[index] = updated;
      }

      // If the analysis shows they're clearly different, remove it from the list
      const similarity = updated.llmSimilarityScore || 0;
      const confidence = updated.llmConfidence;
      
      if (
        (confidence === "high" && similarity < 0.3) ||
        (confidence === "low" && similarity < 0.2) ||
        (confidence === "high" && similarity >= 0.85) // Auto-merged
      ) {
        // Remove from list - clearly different or auto-merged
        comparisons.value = comparisons.value.filter(c => c._id !== comparison._id);
        banner.value = {
          type: "success",
          message: "Analysis complete. These nodes are clearly different (or already merged), so they've been removed from the review list.",
        };
        return;
      }
    }

    banner.value = {
      type: "success",
      message: "Analysis complete. Review the similarity assessment above.",
    };
  } catch (error) {
    console.error("Error analyzing comparison:", error);
    banner.value = {
      type: "error",
      message:
        error instanceof ConceptApiError
          ? error.message
          : "Failed to analyze comparison",
    };
  } finally {
    processing.value.delete(processingKey);
  }
}

async function handleCancel(comparison: Comparison) {
  processing.value.add(comparison._id);

  try {
    await LLMDisambiguationAPI.cancelComparison({
      comparison: comparison._id,
    });

    // Remove from list
    comparisons.value = comparisons.value.filter(
      (c) => c._id !== comparison._id
    );

    banner.value = {
      type: "success",
      message: "Comparison skipped",
    };
  } catch (error) {
    console.error("Error canceling comparison:", error);
    banner.value = {
      type: "error",
      message:
        error instanceof ConceptApiError
          ? error.message
          : "Failed to cancel comparison",
    };
  } finally {
    processing.value.delete(comparison._id);
  }
}

// Only load existing comparisons on mount, don't create new ones automatically
// User can click button to trigger new comparisons
onMounted(async () => {
  loading.value = true;
  loadingMessage.value = "Loading existing comparisons...";
  
  try {
    if (!auth.userId) {
      throw new Error("Not authenticated");
    }

    // Load all existing pending comparisons and filter out clearly different ones
    const pending = await LLMDisambiguationAPI.getPendingComparisons();
    
    // Filter out comparisons that are clearly different (don't need user review)
    comparisons.value = pending.filter((comp) => {
      // Show all unanalyzed comparisons (user can analyze them)
      if (comp.llmSimilarityScore === undefined) {
        return true;
      }

      const similarity = comp.llmSimilarityScore || 0;
      const confidence = comp.llmConfidence;

      // Filter out clearly different matches:
      // - High confidence with very low similarity (< 0.3) = clearly different
      // - Low confidence with very low similarity (< 0.2) = clearly different
      if (confidence === "high" && similarity < 0.3) {
        return false; // High confidence they're different
      }
      if (confidence === "low" && similarity < 0.2) {
        return false; // Low similarity, low confidence = clearly different
      }

      // Show medium confidence matches (always need review)
      if (confidence === "medium") {
        return true;
      }

      // Show high confidence with decent similarity (0.3-0.84) - might need review
      if (confidence === "high" && similarity >= 0.3 && similarity < 0.85) {
        return true;
      }

      // Show low confidence with decent similarity (>= 0.2) - might be a match
      if (confidence === "low" && similarity >= 0.2) {
        return true;
      }

      // High confidence with >= 0.85 similarity = auto-merged, don't show
      if (confidence === "high" && similarity >= 0.85) {
        return false; // Already auto-merged by sync
      }

      return false; // Default: don't show
    });
    
    loading.value = false;
    
    if (pending.length === 0) {
      banner.value = {
        type: "success",
        message: "No pending comparisons. Click 'Compare Connections Now' to check for duplicates.",
      };
    } else {
      banner.value = {
        type: "success",
        message: `Found ${pending.length} pending comparisons to review.`,
      };
    }
  } catch (error) {
    console.error("[DuplicateConfirmation] Error loading comparisons:", error);
    loading.value = false;
    banner.value = {
      type: "error",
      message: error instanceof ConceptApiError 
        ? error.message 
        : "Failed to load comparisons. Please try again.",
    };
  }
});
</script>

<style scoped>
.duplicate-confirmation-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  margin-bottom: 2rem;
}

.loading,
.empty {
  text-align: center;
  padding: 3rem;
}

.progress-info {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 4px;
}

.comparisons {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.comparison-card {
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  padding: 1.5rem;
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.comparison-header h3 {
  margin: 0;
}

.confidence-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.confidence-badge.high {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.confidence-badge.medium {
  background-color: #fff3e0;
  color: #e65100;
}

.confidence-badge.low {
  background-color: #fce4ec;
  color: #c2185b;
}

.confidence-badge.pending {
  background-color: #e3f2fd;
  color: #1976d2;
}

.comparison-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.node-comparison {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 2rem;
  align-items: start;
}

.node-info {
  flex: 1;
}

.node-info h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: var(--text-primary, #333);
}

.node-details p {
  margin: 0.5rem 0;
  line-height: 1.5;
}

.node-id {
  margin-top: 0.75rem;
  color: var(--text-muted, #666);
}

.vs-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: var(--text-muted, #666);
  font-size: 1.25rem;
}

.reasoning {
  padding: 1rem;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 4px;
  border-left: 3px solid var(--primary-color, #1976d2);
}

.reasoning h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.reasoning p {
  margin: 0;
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.actions button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-same {
  background-color: #4caf50;
  color: white;
}

.btn-same:hover:not(:disabled) {
  background-color: #45a049;
}

.btn-different {
  background-color: #f44336;
  color: white;
}

.btn-different:hover:not(:disabled) {
  background-color: #da190b;
}

.btn-cancel {
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
}

.btn-cancel:hover:not(:disabled) {
  background-color: var(--bg-tertiary, #e0e0e0);
}

.btn-refresh {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  background-color: var(--color-navy-400, #6699cc);
  color: white;
  transition: all 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background-color: var(--color-navy-600, #415a77);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .node-comparison {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .vs-divider {
    order: 2;
  }

  .actions {
    flex-direction: column;
  }

  .actions button {
    width: 100%;
  }
}
</style>

