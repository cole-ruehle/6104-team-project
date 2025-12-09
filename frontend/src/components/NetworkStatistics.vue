<template>
    <div class="network-statistics">
        <h2 class="statistics-title">Network Statistics</h2>
        <div class="statistics-grid">
            <div class="stat-card">
                <div class="stat-value">{{ totalConnections }}</div>
                <div class="stat-label">Total Connections</div>
            </div>
            <div class="stat-card" v-for="(count, source) in connectionsBySource" :key="source">
                <div class="stat-value">{{ count }}</div>
                <div class="stat-label">{{ formatSourceName(source) }}</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    totalConnections: number;
    connectionsBySource: Record<string, number>;
}>();

function formatSourceName(source: string): string {
    const sourceMap: Record<string, string> = {
        linkedin: "LinkedIn",
        manual: "Manual",
        instagram: "Instagram",
        handshake: "Handshake",
    };
    return sourceMap[source.toLowerCase()] || source;
}
</script>

<style scoped>
.network-statistics {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(15, 23, 42, 0.08);
}

.statistics-title {
    margin: 0 0 1.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
}

.statistics-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.stat-card {
    padding: 1rem;
    background: #f8fafc;
    border-radius: 0.75rem;
    border: 1px solid rgba(15, 23, 42, 0.08);
}

.stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-navy-600);
    margin-bottom: 0.25rem;
}

.stat-label {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
}
</style>

