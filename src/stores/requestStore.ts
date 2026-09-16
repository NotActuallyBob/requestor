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
          const storedHistory = (await historyStore.get<unknown[]>("history")) ?? [];
          history.value = storedHistory.map((entry) => {
            if (isPersistedEntry(entry)) {
              return {
                request: cloneRequest(entry.request),
                timestamp: entry.timestamp,
              };
            }

            return {
              request: cloneRequest(entry as HttpRequest),
              timestamp: new Date().toISOString(),
            };
          });
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
      timestamp: new Date().toISOString(),
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
      history.value.map(({ request, timestamp }) => ({ request, timestamp }))
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

  function isPersistedEntry(value: unknown): value is {
    request: HttpRequest;
    timestamp: string;
  } {
    return (
      typeof value === "object" &&
      value !== null &&
      "request" in value &&
      "timestamp" in value &&
      typeof value.timestamp === "string"
    );
  }

  return {
    history,
    initialize,
    addRequest,
    clearHistory,
  };
});
