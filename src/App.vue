<script setup lang="ts">
import { computed, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { HttpResponse } from "./model/HttpResponse";
import { HttpRequest } from "./model/HttpRequest";
import { HttpMethod } from "./model/HttpMethod";
import { useRequestStore } from "./stores/requestStore";

const requestStore = useRequestStore();
const methods = Object.values(HttpMethod);
const recentRequests = computed(() => [...requestStore.history].reverse());

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

async function sendRequest() {
  console.log("Sending request:", request.value);
  response.value = await invoke<HttpResponse>("send_request", request.value);
  requestStore.addRequest(request.value);
}

function loadRequest(savedRequest: HttpRequest) {
  request.value = {
    ...savedRequest,
    headers: { ...savedRequest.headers },
    body: { ...savedRequest.body },
  };
}
</script>

<template>
  <v-app>
    <v-navigation-drawer permanent>
      <v-list-item title="Request history" class="py-3" />
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
      </v-container>
    </v-main>
  </v-app>
</template>
