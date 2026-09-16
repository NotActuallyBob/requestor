<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useTheme } from "vuetify";
import { HttpResponse } from "./model/HttpResponse";
import { HttpRequest } from "./model/HttpRequest";
import { HttpMethod } from "./model/HttpMethod";
import { HttpContentType } from "./model/HttpContentType";
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
const contentType = ref<HttpContentType | null>(HttpContentType.JSON);

void requestStore.initialize();
void settingsStore.initialize();
const headerRows = ref([
  { id: 0, enabled: true, key: "Content-Type", value: "application/json" },
]);
let nextHeaderId = 1;

const response = ref<HttpResponse>({
  statusCode: 0,
  time_ms: 0,
  body: ""
});

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
  await requestStore.addRequest(requestToSend);
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

        <v-list v-if="recentRequests.length" density="compact">
          <v-list-item
            v-for="(item, index) in recentRequests"
            :key="`${item.url}-${index}`"
            :title="`${item.method} ${item.url}`"
            subtitle="Sent request"
            @click="loadRequest(item)"
          />
        </v-list>
        <v-list v-else>
          <v-list-item title="No requests yet" />
        </v-list>

        <v-spacer />
        <v-divider />
        <v-switch
          v-model="isDarkTheme"
          class="ma-4"
          label="Dark theme"
          color="primary"
          hide-details
          inset
        />
      </div>
    </v-navigation-drawer>

    <v-main>
      <v-container fluid class="pa-6">
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
              hide-details
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
    </v-main>
  </v-app>
</template>

<style scoped>
.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-row {
  min-height: 64px;
}

.header-row-heading {
  min-height: 32px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.875rem;
}
</style>
