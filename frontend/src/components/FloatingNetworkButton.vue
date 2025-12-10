<template>
  <div class="floating-network-container" v-if="!showSettings">
    <!-- Tooltip Bubble -->
    <div v-if="showTooltip" class="network-tooltip-bubble">
      <div class="tooltip-content">
        <button class="tooltip-close" @click="dismissTooltip" aria-label="Close tooltip">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <p>Click here to view your network graph!</p>
        <div class="tooltip-arrow"></div>
      </div>
    </div>

    <!-- Floating Button -->
    <button
      class="floating-network-btn"
      :class="{ minimized: isMinimized }"
      @click="handleToggle"
      aria-label="Toggle Network Graph"
    >
      <img src="/Float_bubble_logo.png" alt="Network Graph" class="floating-btn-icon" />
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  isMinimized?: boolean;
  showSettings?: boolean;
  showTooltip?: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  tooltipDismissed: [];
}>();

function handleToggle() {
  emit("toggle");
}

function dismissTooltip() {
  emit("tooltipDismissed");
}
</script>

<style scoped>
.floating-network-container {
  position: fixed;
  bottom: 2rem;
  left: 2rem;
  z-index: 999;
}

.floating-network-btn {
  width: 6rem;
  height: 6rem;
  border-radius: 50%;
  background: var(--color-navy-600);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  z-index: 999;
  padding: 0;
  overflow: hidden;
}

.floating-btn-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.floating-network-btn:hover {
  background: var(--color-navy-700);
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.floating-network-btn:active {
  transform: scale(0.95);
}

.floating-network-btn.minimized {
  background: var(--color-navy-500);
}

/* Tooltip Styles */
.network-tooltip-bubble {
  position: absolute;
  bottom: calc(100% + 1rem);
  left: 0;
  z-index: 1000;
  animation: tooltipAppear 0.5s ease-out;
}

.tooltip-content {
  background: white;
  color: #1e293b;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
  max-width: 400px;
  min-width: 300px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.tooltip-content p {
  margin: 0;
  padding-right: 0rem;
}

.tooltip-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.tooltip-close:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.tooltip-arrow {
  position: absolute;
  bottom: -8px;
  left: 2rem;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}

@keyframes tooltipAppear {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
