use regex::Regex;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde_json::Value;

use crate::env::EnvStore;

/// Replace all `{{env.KEY}}` patterns with actual values from the env store.
fn inject_env(input: &str, env_store: &EnvStore) -> String {
    let re = Regex::new(r"\{\{env\.([A-Za-z_][A-Za-z0-9_]*)\}\}").unwrap();
    re.replace_all(input, |caps: &regex::Captures| {
        let key = &caps[1];
        env_store.get(key).unwrap_or_default().to_string()
    })
    .into_owned()
}

/// Proxy an HTTP fetch request, injecting env vars into URL, headers, and body.
pub async fn proxy_fetch(
    url: &str,
    method: &str,
    headers: &Value,
    body: Option<&Value>,
    env_store: &EnvStore,
) -> Result<Value, String> {
    let resolved_url = inject_env(url, env_store);

    let client = reqwest::Client::new();
    let mut req = match method.to_uppercase().as_str() {
        "GET" => client.get(&resolved_url),
        "POST" => client.post(&resolved_url),
        "PUT" => client.put(&resolved_url),
        "PATCH" => client.patch(&resolved_url),
        "DELETE" => client.delete(&resolved_url),
        "HEAD" => client.head(&resolved_url),
        other => return Err(format!("Unsupported method: {other}")),
    };

    // Inject env vars into headers
    if let Some(obj) = headers.as_object() {
        let mut header_map = HeaderMap::new();
        for (k, v) in obj {
            if let Some(val_str) = v.as_str() {
                let resolved = inject_env(val_str, env_store);
                if let (Ok(name), Ok(value)) = (
                    k.parse::<HeaderName>(),
                    HeaderValue::from_str(&resolved),
                ) {
                    header_map.insert(name, value);
                }
            }
        }
        req = req.headers(header_map);
    }

    // Inject env vars into body
    if let Some(body_val) = body {
        let body_str = match body_val {
            Value::String(s) => inject_env(s, env_store),
            other => {
                let serialized = serde_json::to_string(other).map_err(|e| e.to_string())?;
                inject_env(&serialized, env_store)
            }
        };
        req = req.body(body_str);
    }

    let response = req.send().await.map_err(|e| format!("Fetch failed: {e}"))?;

    let status = response.status().as_u16();
    let resp_headers: Value = response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), Value::String(v.to_str().unwrap_or("").into())))
        .collect::<serde_json::Map<String, Value>>()
        .into();

    let body_text = response.text().await.map_err(|e| format!("Read body failed: {e}"))?;

    // Try to parse as JSON, fall back to string
    let body_value = serde_json::from_str::<Value>(&body_text).unwrap_or(Value::String(body_text));

    Ok(serde_json::json!({
        "status": status,
        "headers": resp_headers,
        "body": body_value,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::env::EnvStore;

    #[test]
    fn test_inject_env() {
        let mut store = EnvStore::new();
        store.set("API_KEY", "secret123");
        store.set("BASE_URL", "https://api.example.com");

        assert_eq!(
            inject_env("{{env.API_KEY}}", &store),
            "secret123"
        );
        assert_eq!(
            inject_env("{{env.BASE_URL}}/users", &store),
            "https://api.example.com/users"
        );
        assert_eq!(
            inject_env("Bearer {{env.API_KEY}}", &store),
            "Bearer secret123"
        );
        // Unknown key → empty
        assert_eq!(
            inject_env("{{env.UNKNOWN}}", &store),
            ""
        );
        // No replacement needed
        assert_eq!(
            inject_env("plain text", &store),
            "plain text"
        );
    }
}
