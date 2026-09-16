use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize)]
pub struct ApiResponse {
    status: u16,
    time_ms: u128,
    body: String,
}

#[tauri::command]
async fn send_request(
    method: String,
    url: String,
    headers: Option<HashMap<String, String>>,
    body: Option<HashMap<String, String>>,
) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();
    let start = std::time::Instant::now();

    // Select the HTTP method dynamically
    let mut req = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => return Err("Unsupported HTTP method".to_string()),
    };

    // Attach headers if provided
    if let Some(hdrs) = headers {
        for (k, v) in hdrs {
            req = req.header(&k, &v);
        }
    }

    // Attach a JSON object body if provided
    if let Some(b) = body {
        if !b.is_empty() {
            req = req.json(&b);
        }
    }

    // Execute request
    let res = req.send().await.map_err(|e| e.to_string())?;
    let duration = start.elapsed().as_millis();
    let status = res.status().as_u16();
    let response_body = res.text().await.map_err(|e| e.to_string())?;

    Ok(ApiResponse {
        status,
        time_ms: duration,
        body: response_body,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![send_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
