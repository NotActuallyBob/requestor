<script setup lang="ts">
import { ref, watch } from "vue";
import { HttpContentType } from "../model/HttpContentType";

type JsonObject = Record<string, string>;
type EditorValue = JsonObject | string;

const props = defineProps<{
  modelValue: EditorValue;
  contentType: HttpContentType | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: EditorValue];
}>();

const editorText = ref(formatValue(props.modelValue));
const errorMessage = ref("");
let locallyUpdatedValue: JsonObject | null = null;

watch(
  () => props.modelValue,
  (value) => {
    if (
      locallyUpdatedValue &&
      typeof value !== "string" &&
      JSON.stringify(value) === JSON.stringify(locallyUpdatedValue)
    ) {
      locallyUpdatedValue = null;
      return;
    }

    editorText.value = formatValue(value);
    errorMessage.value = "";
  },
  { deep: true }
);

function formatValue(value: EditorValue) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function handleInput(value: string) {
  editorText.value = value;

  if (props.contentType !== HttpContentType.JSON) {
    errorMessage.value = "";
    emit("update:modelValue", value);
    return;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!isStringObject(parsed)) {
      errorMessage.value = "Body must be a JSON object with string values.";
      return;
    }

    errorMessage.value = "";
    locallyUpdatedValue = parsed;
    emit("update:modelValue", parsed);
  } catch {
    errorMessage.value = "Invalid JSON.";
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== "Tab") {
    return;
  }

  const textarea = event.target as HTMLTextAreaElement;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const indentation = "  ";
  event.preventDefault();

  if (event.shiftKey && start === end) {
    const lineStart = editorText.value.lastIndexOf("\n", start - 1) + 1;
    const canOutdent = editorText.value.slice(lineStart, lineStart + indentation.length) === indentation;

    if (canOutdent) {
      editorText.value = `${editorText.value.slice(0, lineStart)}${editorText.value.slice(lineStart + indentation.length)}`;
      requestAnimationFrame(() => textarea.setSelectionRange(start - indentation.length, start - indentation.length));
    }
    return;
  }

  editorText.value = `${editorText.value.slice(0, start)}${indentation}${editorText.value.slice(end)}`;
  requestAnimationFrame(() => {
    const cursor = start + indentation.length;
    textarea.setSelectionRange(cursor, cursor);
  });
}

function isStringObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}
</script>

<template>
  <v-textarea
    :model-value="editorText"
    :label="contentType === HttpContentType.JSON ? 'JSON body' : 'Text body'"
    variant="outlined"
    rows="14"
    auto-grow
    spellcheck="false"
    :error="contentType === HttpContentType.JSON && Boolean(errorMessage)"
    :error-messages="contentType === HttpContentType.JSON ? errorMessage : []"
    @update:model-value="handleInput"
    @keydown="handleKeydown"
  />
</template>

<style scoped>
:deep(textarea) {
  font-family: monospace;
  line-height: 1.5;
}
</style>
