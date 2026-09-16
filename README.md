# Requestor

Requestor is a lightweight desktop HTTP client built with Tauri, Vue, TypeScript, and Vuetify. It provides a focused request editor with persistent request history and an in-session response viewer.

## Features

- HTTP methods: `GET`, `POST`, `PUT`, and `DELETE`
- URL validation with clear HTTP/HTTPS protocol feedback
- Editable request headers with enable, disable, add, and remove controls
- JSON and plain-text request bodies
- JSON editor with validation, indentation, and `Tab`/`Shift+Tab` support
- Response body and response headers in separate tabs
- Status code and response timing
- Resizable request and response panels
- Request history ordered newest first
- Select a history item to restore its request and current-session response
- Persistent request history using the Tauri Store plugin
- Persistent light/dark theme preference
- Responsive layout with a temporary history drawer on small screens

## Requirements

- Node.js and npm
- Rust and Cargo
- Tauri system prerequisites for your operating system

See the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) documentation for platform-specific setup.

## Getting Started

Install frontend dependencies:

```bash
npm install
```

Start the desktop application in development mode:

```bash
npm run tauri dev
```

The Vite frontend can also be started independently:

```bash
npm run dev
```

## Validation and Build

Build the frontend:

```bash
npm run build
```

Check the Rust backend:

```bash
cd src-tauri
cargo check
```

Create a production Tauri bundle:

```bash
npm run tauri build
```

## Persistence

Request history is stored locally through `@tauri-apps/plugin-store` and survives application restarts. Responses are kept in Pinia for the current session only and are intentionally not persisted. The selected theme is stored separately and restored when the application starts.

## Project Structure

```text
src/
	components/       Reusable UI components, including the JSON editor
	model/            Request, response, method, content type, and history types
	stores/           Pinia stores for request history and settings
	App.vue           Main application layout and request workflow
	main.ts           Vue, Pinia, Vuetify, and icon setup

src-tauri/
	src/lib.rs        Tauri command and HTTP request implementation
	capabilities/     Tauri permissions
	icons/            Application icon assets
	tauri.conf.json   Application and bundling configuration
```

## Request Body Rules

When the content type is JSON, the body must be a JSON object with string values. Text and no-content-type modes send the body as raw text. URLs must include an `http://` or `https://` protocol.
