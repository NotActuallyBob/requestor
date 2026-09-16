import { defineStore } from "pinia";
import { ref } from "vue";
import { load } from "@tauri-apps/plugin-store";
import { HttpRequest } from "../model/HttpRequest";

export const useRequestStore = defineStore("request", () => {
  const history = ref<HttpRequest[]>([]);
  let historyStore: Awaited<ReturnType<typeof load>> | null = null;
  let initializationPromise: Promise<void> | null = null;

  async function initialize() {
    if (!initializationPromise) {
      initializationPromise = (async () => {
        try {
          historyStore = await load("request-history.json", { autoSave: true });
          history.value = (await historyStore.get<HttpRequest[]>("history")) ?? [];
        } catch (error) {
          console.error("Failed to load request history:", error);
        }
      })();
    }

    return initializationPromise;
  }

  async function addRequest(request: HttpRequest) {
    await initialize();
    history.value.push({
      ...request,
      headers: { ...request.headers },
      body: typeof request.body === "string" ? request.body : { ...request.body },
    });
    await saveHistory();
  }

  async function clearHistory() {
    await initialize();
    history.value = [];
    await saveHistory();
  }

  async function saveHistory() {
    if (!historyStore) {
      return;
    }

    await historyStore.set("history", history.value);
    await historyStore.save();
  }

  return {
    history,
    initialize,
    addRequest,
    clearHistory,
  };
});
