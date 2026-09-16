import { load } from "@tauri-apps/plugin-store";
import { defineStore } from "pinia";
import { ref } from "vue";

export type ThemeName = "light" | "dark";

export const useSettingsStore = defineStore("settings", () => {
  const theme = ref<ThemeName>("light");
  let settingsStore: Awaited<ReturnType<typeof load>> | null = null;
  let initializationPromise: Promise<void> | null = null;

  async function initialize() {
    if (!initializationPromise) {
      initializationPromise = (async () => {
        try {
          settingsStore = await load("settings.json", { autoSave: true });
          const savedTheme = await settingsStore.get<ThemeName>("theme");

          if (savedTheme === "light" || savedTheme === "dark") {
            theme.value = savedTheme;
          }
        } catch (error) {
          console.error("Failed to load settings:", error);
        }
      })();
    }

    return initializationPromise;
  }

  async function setTheme(value: ThemeName) {
    await initialize();
    theme.value = value;

    if (settingsStore) {
      await settingsStore.set("theme", value);
      await settingsStore.save();
    }
  }

  return {
    theme,
    initialize,
    setTheme,
  };
});
