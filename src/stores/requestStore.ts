import { defineStore } from "pinia";
import { ref } from "vue";
import { HttpRequest } from "../model/HttpRequest";

export const useRequestStore = defineStore("request", () => {
  const history = ref<HttpRequest[]>([]);

  function addRequest(request: HttpRequest) {
    history.value.push({
      ...request,
      headers: { ...request.headers },
      body: { ...request.body },
    });
  }

  function clearHistory() {
    history.value = [];
  }

  return {
    history,
    addRequest,
    clearHistory,
  };
});
