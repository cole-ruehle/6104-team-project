import { defineStore } from "pinia";
import { ref } from "vue";

const DEFAULT_AVATAR = "/default_pfp.jpg";

const userCache = new Map<string, string>();

export const useAvatarStore = defineStore("avatar", () => {
  const src = ref<string>(DEFAULT_AVATAR);
  const lookup = ref<Record<string, string>>({});

  function set(newSrc: string | null) {
    src.value = newSrc ?? DEFAULT_AVATAR;
  }

  function reset() {
    src.value = DEFAULT_AVATAR;
  }

  function setForUser(userId: string, url: string | undefined) {
    const value = url ?? DEFAULT_AVATAR;
    userCache.set(userId, value);
    lookup.value = { ...lookup.value, [userId]: value };
  }

  function getForUser(userId: string | undefined) {
    if (!userId) return DEFAULT_AVATAR;
    return userCache.get(userId) ?? lookup.value[userId] ?? DEFAULT_AVATAR;
  }

  return {
    src,
    set,
    reset,
    setForUser,
    getForUser,
    DEFAULT_AVATAR,
  };
});
