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

  /**
   * Get letter-based avatar for a name when no profile picture is available.
   * Returns the path to the SVG icon based on the first letter of the name.
   */
  function getLetterAvatar(name: string | undefined | null): string {
    if (!name || name.trim().length === 0) {
      return DEFAULT_AVATAR;
    }

    // Get the first letter and convert to uppercase
    const firstLetter = name.trim().charAt(0).toUpperCase();

    // Check if it's a valid letter (A-Z)
    if (firstLetter >= 'A' && firstLetter <= 'Z') {
      return `/avatars/${firstLetter}.svg`;
    }

    // For non-letter characters, use default avatar
    return DEFAULT_AVATAR;
  }

  return {
    src,
    set,
    reset,
    setForUser,
    getForUser,
    getLetterAvatar,
    DEFAULT_AVATAR,
  };
});
