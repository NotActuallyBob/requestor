import { defineStore } from "pinia";
import { ref } from "vue";
import { load } from "@tauri-apps/plugin-store";
import { HttpRequest } from "../model/HttpRequest";
import { HttpResponse } from "../model/HttpResponse";
import { RequestHistoryEntry } from "../model/RequestHistoryEntry";

export const useRequestStore = defineStore("request", () => {
  const history = ref<RequestHistoryEntry[]>([]);
  let historyStore: Awaited<ReturnType<typeof load>> | null = null;
  let initializationPromise: Promise<void> | null = null;

  async function initialize() {
    if (!initializationPromise) {
      initializationPromise = (async () => {
        try {
          historyStore = await load("request-history.json", { autoSave: true });
          const storedRequests = (await historyStore.get<HttpRequest[]>("history")) ?? [];
          history.value = storedRequests.map((request) => ({
            request: cloneRequest(request),
          }));
        } catch (error) {
          console.error("Failed to load request history:", error);
        }
      })();
    }

    return initializationPromise;
  }

  async function addRequest(request: HttpRequest, response: HttpResponse) {
    await initialize();
    history.value.push({
      request: cloneRequest(request),
      response: cloneResponse(response),
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

    await historyStore.set(
      "history",
      history.value.map((entry) => entry.request)
    );
    await historyStore.save();
  }

  function cloneRequest(request: HttpRequest): HttpRequest {
    return {
      ...request,
      headers: { ...request.headers },
      body: typeof request.body === "string" ? request.body : { ...request.body },
    };
  }

  function cloneResponse(response: HttpResponse): HttpResponse {
    return {
      ...response,
      headers: { ...response.headers },
    };
  }

  return {
    history,
    initialize,
    addRequest,
    clearHistory,
  };
});
