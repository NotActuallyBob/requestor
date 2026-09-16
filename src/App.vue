<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useTheme } from "vuetify";
import { HttpResponse } from "./model/HttpResponse";
import { HttpRequest } from "./model/HttpRequest";
import { HttpMethod } from "./model/HttpMethod";
import { HttpContentType } from "./model/HttpContentType";
import { RequestHistoryEntry } from "./model/RequestHistoryEntry";
import { useRequestStore } from "./stores/requestStore";
import { useSettingsStore } from "./stores/settingsStore";
import JsonEditor from "./components/JsonEditor.vue";

const requestStore = useRequestStore();
const settingsStore = useSettingsStore();
const theme = useTheme();
const isDarkTheme = computed({
  get: () => settingsStore.theme === "dark",
  set: (enabled) => {
    void settingsStore.setTheme(enabled ? "dark" : "light");
  },
});
const methods = Object.values(HttpMethod);
const contentTypeOptions = [
  { title: "None", value: null },
  { title: "JSON", value: HttpContentType.JSON },
  { title: "Text", value: HttpContentType.TEXT_PLAIN },
];
const recentRequests = computed(() => [...requestStore.history].reverse());
const activeTab = ref("headers");
const responseTab = ref("body");
const contentType = ref<HttpContentType | null>(HttpContentType.JSON);
const requestPaneSize = ref(50);
const splitLayout = ref<HTMLElement | null>(null);
const urlError = ref("");

void requestStore.initialize();
void settingsStore.initialize();
const headerRows = ref([
  { id: 0, enabled: true, key: "Content-Type", value: "application/json" },
]);
let nextHeaderId = 1;

const response = ref<HttpResponse>({
  statusCode: 0,
  time_ms: 0,
  headers: {},
  body: ""
});

function emptyResponse(): HttpResponse {
  return {
    statusCode: 0,
    time_ms: 0,
    headers: {},
    body: "",
  };
}

const request = ref<HttpRequest>({
  method: HttpMethod.GET,
  url: "https://google.com",
  headers: {
    "Content-Type": "application/json",
  },
  body: {}
});

watch(
  () => settingsStore.theme,
  (value) => {
    theme.global.name.value = value;
  },
  { immediate: true }
);

async function sendRequest() {
  if (!validateUrl()) {
    return;
  }

  console.log("Sending request:", request.value);
  const enabledHeaders = headerRows.value.reduce<Record<string, string>>(
    (headers, header) => {
      if (header.enabled && header.key.trim()) {
        headers[header.key.trim()] = header.value;
      }
      return headers;
    },
    {}
  );
  const requestToSend = {
    ...request.value,
    headers: enabledHeaders,
  };

  response.value = await invoke<HttpResponse>("send_request", requestToSend);
  await requestStore.addRequest(requestToSend, response.value);
}

function validateUrl() {
  try {
    const parsedUrl = new URL(request.value.url);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      urlError.value = "Use an HTTP or HTTPS URL.";
      return false;
    }

    urlError.value = "";
    return true;
  } catch {
    urlError.value = "Include the protocol, for example https://www.google.com/";
    return false;
  }
}

function loadRequest(savedRequest: HttpRequest) {
  request.value = {
    ...savedRequest,
    headers: { ...savedRequest.headers },
    body: typeof savedRequest.body === "string"
      ? savedRequest.body
      : { ...savedRequest.body },
  };
  headerRows.value = Object.entries(savedRequest.headers).map(
    ([key, value], index) => ({
      id: index,
      enabled: true,
      key,
      value,
    })
  );
  const savedContentType = Object.entries(savedRequest.headers).find(
    ([key]) => key.toLowerCase() === "content-type"
  )?.[1];
  if (
    contentTypeOptions.some((option) => option.value === savedContentType)
  ) {
    contentType.value = savedContentType as HttpContentType;
  } else {
    contentType.value = null;
  }
  nextHeaderId = headerRows.value.length;
}

function loadHistoryEntry(entry: RequestHistoryEntry) {
  loadRequest(entry.request);
  response.value = entry.response
    ? {
        ...entry.response,
        headers: { ...entry.response.headers },
      }
    : emptyResponse();
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function updateContentType(value: HttpContentType | null) {
  contentType.value = value;

  if (value === null) {
    headerRows.value = headerRows.value.filter(
      (header) => header.key.toLowerCase() !== "content-type"
    );
    return;
  }

  const contentTypeHeader = headerRows.value.find(
    (header) => header.key.toLowerCase() === "content-type"
  );

  if (contentTypeHeader) {
    contentTypeHeader.value = value;
    return;
  }

  headerRows.value.push({
    id: nextHeaderId++,
    enabled: true,
    key: "Content-Type",
    value,
  });
}

function addHeader() {
  headerRows.value.push({
    id: nextHeaderId++,
    enabled: false,
    key: "",
    value: "",
  });
}

function removeHeader(id: number) {
  headerRows.value = headerRows.value.filter((header) => header.id !== id);
}

function startResize() {
  window.addEventListener("pointermove", resizePanes);
  window.addEventListener("pointerup", stopResize);
  document.body.style.cursor = "row-resize";
  document.body.style.userSelect = "none";
}

function resizePanes(event: PointerEvent) {
  if (!splitLayout.value) {
    return;
  }

  const bounds = splitLayout.value.getBoundingClientRect();
  const percentage = ((event.clientY - bounds.top) / bounds.height) * 100;
  requestPaneSize.value = Math.min(75, Math.max(25, percentage));
}

function stopResize() {
  window.removeEventListener("pointermove", resizePanes);
  window.removeEventListener("pointerup", stopResize);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
}

onBeforeUnmount(stopResize);
</script>

<template>
  <v-app>
    <v-navigation-drawer permanent>
      <div class="drawer-content">
        <div class="history-heading">
          <v-list-item title="Request history" />
          <v-tooltip text="Clear request history" location="bottom">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon="mdi-delete-sweep-outline"
                variant="text"
                aria-label="Clear request history"
                @click="requestStore.clearHistory"
              />
            </template>
          </v-tooltip>
        </div>
        <v-divider />

        <div class="history-list">
          <v-list v-if="recentRequests.length" density="compact">
            <v-list-item
              v-for="(item, index) in recentRequests"
              :key="`${item.request.url}-${index}`"
              :title="`${item.request.method} ${item.request.url}`"
              :subtitle="formatTimestamp(item.timestamp)"
              @click="loadHistoryEntry(item)"
            />
          </v-list>
          <v-list v-else>
            <v-list-item title="No requests yet" />
          </v-list>
        </div>

        <v-divider />
        <v-tooltip
          :text="isDarkTheme ? 'Use light theme' : 'Use dark theme'"
          location="right"
        >
          <template #activator="{ props }">
            <v-switch
              v-bind="props"
              v-model="isDarkTheme"
              class="theme-switch ma-2"
              :prepend-icon="isDarkTheme ? 'mdi-weather-night' : 'mdi-white-balance-sunny'"
              color="primary"
              density="compact"
              hide-details
              inset
              :aria-label="isDarkTheme ? 'Use light theme' : 'Use dark theme'"
            />
          </template>
        </v-tooltip>
      </div>
    </v-navigation-drawer>

    <v-main class="main-content">
      <div
        ref="splitLayout"
        class="split-layout"
        :style="{ gridTemplateRows: `${requestPaneSize}% 8px 1fr` }"
      >
        <v-container fluid class="request-pane pa-6">
        <v-row align="center" no-gutters>
          <v-col cols="12" sm="3" md="2" class="pr-sm-3 mb-3 mb-sm-0">
            <v-select
              v-model="request.method"
              :items="methods"
              label="Method"
              hide-details
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" sm class="pr-sm-3 mb-3 mb-sm-0">
            <v-text-field
              v-model="request.url"
              label="Request URL"
              placeholder="https://example.com"
              :error-messages="urlError ? [urlError] : []"
              hide-details="auto"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" sm="auto">
            <v-btn color="primary" size="large" block @click="sendRequest">
              Send
            </v-btn>
          </v-col>
        </v-row>

        <v-tabs v-model="activeTab" class="mt-8" color="primary">
          <v-tab value="headers">Headers</v-tab>
          <v-tab value="body">Body</v-tab>
        </v-tabs>

        <v-window v-model="activeTab" class="mt-4">
          <v-window-item value="headers">
            <v-row class="header-row header-row-heading" no-gutters>
              <v-col cols="1">Use</v-col>
              <v-col cols="4">Key</v-col>
              <v-col cols="5">Value</v-col>
              <v-col cols="2"></v-col>
            </v-row>

            <v-row
              v-for="header in headerRows"
              :key="header.id"
              class="header-row"
              align="center"
              no-gutters
            >
              <v-col cols="1">
                <v-checkbox v-model="header.enabled" hide-details />
              </v-col>
              <v-col cols="4" class="pr-3">
                <v-text-field v-model="header.key" label="Key" hide-details variant="outlined" />
              </v-col>
              <v-col cols="5" class="pr-3">
                <v-text-field v-model="header.value" label="Value" hide-details variant="outlined" />
              </v-col>
              <v-col cols="2">
                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  aria-label="Remove header"
                  @click="removeHeader(header.id)"
                />
              </v-col>
            </v-row>

            <v-btn class="mt-3" variant="outlined" @click="addHeader">Add header</v-btn>
          </v-window-item>

          <v-window-item value="body" class="pt-2">
            <v-select
              :model-value="contentType"
              :items="contentTypeOptions"
              item-title="title"
              item-value="value"
              label="Content-Type"
              variant="outlined"
              class="mb-4"
              @update:model-value="updateContentType"
            />
            <JsonEditor
              v-model="request.body"
              :content-type="contentType"
            />
          </v-window-item>
        </v-window>
        </v-container>

        <div
          class="split-divider"
          role="separator"
          aria-label="Resize request and response panels"
          aria-orientation="horizontal"
          @pointerdown="startResize"
        />

        <section class="response-pane pa-6">
          <div class="response-heading">
            <h2 class="text-h6">Response</h2>
            <div class="response-meta">
              <v-chip size="small" variant="tonal">Status: {{ response.statusCode }}</v-chip>
              <v-chip size="small" variant="tonal">{{ response.time_ms }} ms</v-chip>
            </div>
          </div>

          <v-tabs v-model="responseTab" class="mt-4" color="primary">
            <v-tab value="body">Body</v-tab>
            <v-tab value="headers">Headers</v-tab>
          </v-tabs>

          <v-window v-model="responseTab" class="mt-4">
            <v-window-item value="body">
              <pre class="response-body">{{ response.body }}</pre>
            </v-window-item>
            <v-window-item value="headers">
              <div v-if="Object.keys(response.headers).length" class="response-headers">
                <div
                  v-for="(value, key) in response.headers"
                  :key="key"
                  class="response-header"
                >
                  <span class="response-header-key">{{ key }}</span>
                  <span>{{ value }}</span>
                </div>
              </div>
              <p v-else class="text-medium-emphasis">No response headers.</p>
            </v-window-item>
          </v-window>
        </section>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.main-content {
  height: 100vh;
  max-height: 100vh;
  min-height: 0;
  overflow: hidden !important;
}

.main-content :deep(.v-main__wrap) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.split-layout {
  display: grid;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.request-pane,
.response-pane {
  min-height: 0;
  overflow: auto;
}

.split-divider {
  cursor: row-resize;
  background: rgba(var(--v-theme-on-surface), 0.12);
  transition: background-color 0.15s ease;
}

.split-divider:hover {
  background: rgb(var(--v-theme-primary));
}

.response-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.response-meta {
  display: flex;
  gap: 8px;
}

.response-body {
  min-height: 120px;
  margin: 0;
  padding: 16px;
  overflow: auto;
  white-space: pre-wrap;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 4px;
  font-family: monospace;
}

.response-headers {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 4px;
}

.response-header {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) 2fr;
  gap: 16px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.response-header:last-child {
  border-bottom: 0;
}

.response-header-key {
  font-weight: 600;
}

.history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.theme-switch {
  min-height: 32px;
}

.header-row {
  min-height: 64px;
}

.header-row-heading {
  min-height: 32px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.875rem;
}

:global(html),
:global(body),
:global(#app) {
  height: 100%;
  overflow: hidden;
}
</style>
