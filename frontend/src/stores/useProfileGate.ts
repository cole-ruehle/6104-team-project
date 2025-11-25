import { defineStore } from "pinia";
import { ref } from "vue";

export const useProfileGateStore = defineStore("profile-gate", () => {
  const isOpen = ref(false);

  function requireProfile() {
    isOpen.value = true;
  }

  function closeGate() {
    isOpen.value = false;
  }

  return {
    isOpen,
    requireProfile,
    closeGate,
  };
});
