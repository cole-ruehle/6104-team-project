import { defineStore } from "pinia";
import { computed, ref } from "vue";

export interface ActivityEntry {
  id: string;
  concept: string;
  action: string;
  payload: Record<string, unknown>;
  status: "success" | "error";
  message: string;
  timestamp: string;
}

export const useActivityLogStore = defineStore("activity-log", () => {
  const entries = ref<ActivityEntry[]>([]);

  function push(entry: Omit<ActivityEntry, "id" | "timestamp">) {
    entries.value.unshift({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });

    // keep last 25 events
    if (entries.value.length > 25) {
      entries.value = entries.value.slice(0, 25);
    }
  }

  const recent = computed(() => entries.value);

  return {
    entries,
    recent,
    push,
  };
});
