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
            <h3 class="card-name">{{ node.displayName }}</h3>
            <div v-if="node.currentJob || node.company" class="card-job-company">
                <p v-if="node.currentJob" class="card-job">{{ node.currentJob }}</p>
                <p v-if="node.company" class="card-company">{{ node.company }}</p>
            </div>
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
    /* Avatar size scales with card width - customize the values below */
    /* The size will be between min-size and max-size, scaling with card width */
    --avatar-size-percent: 70%; /* Percentage of card width (adjust: 30%, 40%, 50%, etc.) */
    --avatar-max-size: 200px; /* Maximum size in pixels (adjust this value) */
    --avatar-min-size: 60px; /* Minimum size in pixels (adjust this value) */

    width: clamp(var(--avatar-min-size), var(--avatar-size-percent), var(--avatar-max-size));
    aspect-ratio: 1;
    border-radius: 50%;
    overflow: hidden;
    background: #dbeafe;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    flex-shrink: 0;
}

.card-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.avatar-placeholder {
    font-size: clamp(1.5rem, 40%, 3rem);
    font-weight: 600;
    color: #1e293b;
}

.card-info {
    flex: 1;
    min-width: 0;
}

.card-name {
    margin: 0 0 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
}

.card-job-company {
    margin: 0;
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
