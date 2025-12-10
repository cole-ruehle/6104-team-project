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
   * Get two-letter initials from a name.
   */
  function getTwoLetters(name: string): string {
    if (!name || name.trim().length === 0) {
      return "??";
    }

    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/).filter(part => part.length > 0);

    if (parts.length === 0) {
      return "??";
    }

    // If only one part, use first letter twice
    if (parts.length === 1) {
      const letter = parts[0][0].toUpperCase();
      return letter + letter;
    }

    // Get first letter of first name and first letter of last name
    const firstLetter = parts[0][0].toUpperCase();
    const lastLetter = parts[parts.length - 1][0].toUpperCase();
    return firstLetter + lastLetter;
  }

  /**
   * Generate a two-letter avatar SVG as a data URL.
   * Creates a circular avatar with two letters.
   *
   * You can customize the colors by modifying the backgroundColor and textColor variables below.
   */
  function generateTwoLetterAvatar(letters: string, size: number = 100): string {
    // Customize these colors as needed
    const backgroundColor = '#676767'; // Change this to your preferred background color
    const textColor = '#EBEDF3'; // Change this to your preferred text color

    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${backgroundColor}"/>
        <text
          x="50%"
          y="50%"
          font-family="Inter, system-ui, -apple-system, sans-serif"
          font-size="${size * 0.4}"
          font-weight="600"
          fill="${textColor}"
          text-anchor="middle"
          dominant-baseline="central"
        >${letters}</text>
      </svg>
    `.trim();

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Get letter-based avatar for a name when no profile picture is available.
   * Returns a data URL for a dynamically generated two-letter SVG avatar.
   */
  function getLetterAvatar(name: string | undefined | null): string {
    if (!name || name.trim().length === 0) {
      return DEFAULT_AVATAR;
    }

    const letters = getTwoLetters(name);

    // Check if both letters are valid (A-Z)
    if (letters[0] >= 'A' && letters[0] <= 'Z' &&
        (letters.length === 1 || (letters[1] >= 'A' && letters[1] <= 'Z'))) {
      return generateTwoLetterAvatar(letters);
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
