<template>
  <div class="connection-card" @click="$emit('click', node.id)">
    <div class="card-avatar">
      <img
        v-if="node.avatarUrl"
        :src="node.avatarUrl"
        :alt="node.displayName"
        @error="handleImageError"
      />
      <div v-else class="avatar-placeholder">
        {{ node.initials }}
      </div>
    </div>
    <div class="card-info">
      <div class="card-header-row">
        <h3 class="card-name">
          {{ node.displayName }}
        </h3>
        <span v-if="node.score != null" class="card-score">
          {{ Math.round(node.score * 100) }}%
        </span>
      </div>
      <p v-if="node.location" class="card-location">
        <i class="fa-solid fa-map-marker-alt"></i>
        {{ node.location }}
      </p>
      <p v-if="node.currentJob" class="card-job">
        {{ node.currentJob }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  node: {
    id: string;
    displayName: string;
    avatarUrl: string;
    initials: string;
    score?: number;
    location?: string;
    currentJob?: string;
        company?: string;
  };
}>();

defineEmits<{
  click: [nodeId: string];
}>();

function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    // Hide the image - the placeholder will show via v-else
    img.style.display = "none";
    const placeholder = img.parentElement?.querySelector(".avatar-placeholder") as HTMLElement;
    if (placeholder) {
        placeholder.style.display = "flex";
    }
}
</script>

<style scoped>
.connection-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.75rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.connection-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-avatar {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #dbeafe;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 2.5rem;
  font-weight: 600;
  color: #1e293b;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-name {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.card-score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.75rem;
  font-weight: 600;
}

.card-location {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.card-location i {
  font-size: 0.75rem;
}

.card-job {
    margin: 0;
    font-size: 0.875rem;
    color: #475569;
    line-height: 1.4;
    font-weight: 500;
}

.card-company {
    margin: 0;
    font-size: 0.875rem;
    color: #475569;
    line-height: 1.4;
    font-weight: 500;
}
</style>
