use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// In-memory store for environment variables loaded from .env files.
pub struct EnvStore {
    vars: HashMap<String, String>,
}

impl EnvStore {
    pub fn new() -> Self {
        Self {
            vars: HashMap::new(),
        }
    }

    /// Load variables from a .env file. Returns the number of variables loaded.
    pub fn load(&mut self, path: &str) -> Result<usize, String> {
        let content = fs::read_to_string(Path::new(path))
            .map_err(|e| format!("Cannot read {path}: {e}"))?;

        let mut count = 0;
        for line in content.lines() {
            let trimmed = line.trim();

            // Skip empty lines and comments
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            if let Some((key, value)) = parse_env_line(trimmed) {
                self.vars.insert(key, value);
                count += 1;
            }
        }

        Ok(count)
    }

    pub fn get(&self, key: &str) -> Option<&str> {
        self.vars.get(key).map(|s| s.as_str())
    }

    pub fn keys(&self) -> impl Iterator<Item = &str> {
        self.vars.keys().map(|s| s.as_str())
    }

    #[cfg(test)]
    pub fn set(&mut self, key: &str, value: &str) {
        self.vars.insert(key.into(), value.into());
    }
}

/// Parse a single .env line into (key, value), handling quotes.
fn parse_env_line(line: &str) -> Option<(String, String)> {
    // Handle `export KEY=VALUE` prefix
    let line = line.strip_prefix("export ").unwrap_or(line);

    let eq_pos = line.find('=')?;
    let key = line[..eq_pos].trim().to_string();
    let mut value = line[eq_pos + 1..].trim().to_string();

    // Strip surrounding quotes
    if (value.starts_with('"') && value.ends_with('"'))
        || (value.starts_with('\'') && value.ends_with('\''))
    {
        value = value[1..value.len() - 1].to_string();
    }

    if key.is_empty() {
        return None;
    }

    Some((key, value))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_parse_env_line() {
        assert_eq!(
            parse_env_line("KEY=value"),
            Some(("KEY".into(), "value".into()))
        );
        assert_eq!(
            parse_env_line("KEY=\"quoted value\""),
            Some(("KEY".into(), "quoted value".into()))
        );
        assert_eq!(
            parse_env_line("KEY='single quoted'"),
            Some(("KEY".into(), "single quoted".into()))
        );
        assert_eq!(
            parse_env_line("export KEY=value"),
            Some(("KEY".into(), "value".into()))
        );
        assert_eq!(parse_env_line("# comment"), None);
        assert_eq!(parse_env_line(""), None);
    }

    #[test]
    fn test_env_store_load() {
        let dir = std::env::temp_dir().join("stereo-test-env");
        let _ = fs::create_dir_all(&dir);
        let path = dir.join(".env");

        let mut f = fs::File::create(&path).unwrap();
        writeln!(f, "# Database config").unwrap();
        writeln!(f, "DB_HOST=localhost").unwrap();
        writeln!(f, "DB_PORT=5432").unwrap();
        writeln!(f, "API_KEY=\"secret-123\"").unwrap();
        writeln!(f, "").unwrap();
        writeln!(f, "export REGION=us-east-1").unwrap();
        drop(f);

        let mut store = EnvStore::new();
        let count = store.load(path.to_str().unwrap()).unwrap();

        assert_eq!(count, 4);
        assert_eq!(store.get("DB_HOST"), Some("localhost"));
        assert_eq!(store.get("DB_PORT"), Some("5432"));
        assert_eq!(store.get("API_KEY"), Some("secret-123"));
        assert_eq!(store.get("REGION"), Some("us-east-1"));
        assert_eq!(store.get("NONEXISTENT"), None);

        let _ = fs::remove_dir_all(dir);
    }
}
