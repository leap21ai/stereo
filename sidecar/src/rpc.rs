use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::env::EnvStore;
use crate::proxy;

#[derive(Debug, Deserialize)]
pub struct RpcRequest {
    pub jsonrpc: String,
    pub id: u64,
    pub method: String,
    #[serde(default)]
    pub params: Value,
}

#[derive(Debug, Serialize)]
pub struct RpcResponse {
    pub jsonrpc: String,
    pub id: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<RpcError>,
}

#[derive(Debug, Serialize)]
pub struct RpcError {
    pub code: i32,
    pub message: String,
}

impl RpcResponse {
    pub fn success(id: u64, result: Value) -> Self {
        Self {
            jsonrpc: "2.0".into(),
            id,
            result: Some(result),
            error: None,
        }
    }

    pub fn error(id: u64, code: i32, message: &str) -> Self {
        Self {
            jsonrpc: "2.0".into(),
            id,
            result: None,
            error: Some(RpcError {
                code,
                message: message.into(),
            }),
        }
    }
}

pub async fn handle_request(req: RpcRequest, env_store: &mut EnvStore) -> RpcResponse {
    match req.method.as_str() {
        "initialize" => {
            if let Some(path) = req.params.get("envPath").and_then(|v| v.as_str()) {
                match env_store.load(path) {
                    Ok(count) => RpcResponse::success(
                        req.id,
                        serde_json::json!({ "loaded": count }),
                    ),
                    Err(e) => RpcResponse::error(req.id, -32000, &format!("Failed to load .env: {e}")),
                }
            } else {
                RpcResponse::success(req.id, serde_json::json!({ "loaded": 0 }))
            }
        }

        "proxy/fetch" => {
            let url = req.params.get("url").and_then(|v| v.as_str()).unwrap_or("");
            let method = req.params.get("method").and_then(|v| v.as_str()).unwrap_or("GET");
            let headers = req.params.get("headers").cloned().unwrap_or(Value::Object(Default::default()));
            let body = req.params.get("body").cloned();

            match proxy::proxy_fetch(url, method, &headers, body.as_ref(), env_store).await {
                Ok(result) => RpcResponse::success(req.id, result),
                Err(e) => RpcResponse::error(req.id, -32001, &e),
            }
        }

        "env/list" => {
            let names: Vec<&str> = env_store.keys().collect();
            RpcResponse::success(req.id, serde_json::json!({ "keys": names }))
        }

        "health" => {
            RpcResponse::success(req.id, serde_json::json!({ "status": "ok" }))
        }

        _ => RpcResponse::error(req.id, -32601, &format!("Method not found: {}", req.method)),
    }
}
