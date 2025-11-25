<template>
  <section class="card">
    <h2>Recent Concept Activity</h2>
    <p class="muted">
      Last {{ Math.min(entries.length, 5) }} interactions with the backend.
    </p>
    <div class="list">
      <article
        v-for="entry in entries.slice(0, 5)"
        :key="entry.id"
        class="list-item"
      >
        <strong>{{ entry.concept }}.{{ entry.action }}</strong>
        <div class="muted">
          {{ formatDate(entry.timestamp) }} ·
          <span :style="{ color: entry.status === 'success' ? '#22c55e' : '#f97316' }">
            {{ entry.status }}
          </span>
        </div>
        <pre style="white-space: pre-wrap; font-size: 0.8rem; margin-top: 0.5rem">
{{ redact(entry.payload) }}
        </pre>
        <p style="margin: 0.4rem 0 0">{{ entry.message }}</p>
      </article>
      <p v-if="entries.length === 0" class="muted">
        Interact with a concept to see your request history.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ActivityEntry } from "@/stores/useActivityLog";

defineProps<{
  entries: ActivityEntry[];
}>();

function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleString();
}

function redact(payload: Record<string, unknown>) {
  return JSON.stringify(
    payload,
    (key, value) => {
      if (key === "user" || key === "owner") {
        return "[redacted]";
      }
      return value;
    },
    2,
  );
}
</script>
