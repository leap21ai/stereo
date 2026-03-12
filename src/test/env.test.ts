import { describe, it, expect } from "vitest";
import { parseEnvFile } from "../env";

describe("parseEnvFile", () => {
  it("parses basic key=value pairs", () => {
    const result = parseEnvFile("KEY=value\nOTHER=123");
    expect(result.get("KEY")).toBe("value");
    expect(result.get("OTHER")).toBe("123");
  });

  it("handles double-quoted values", () => {
    const result = parseEnvFile('API_KEY="my-secret-key"');
    expect(result.get("API_KEY")).toBe("my-secret-key");
  });

  it("handles single-quoted values", () => {
    const result = parseEnvFile("API_KEY='my-secret-key'");
    expect(result.get("API_KEY")).toBe("my-secret-key");
  });

  it("ignores comments", () => {
    const result = parseEnvFile("# This is a comment\nKEY=value");
    expect(result.size).toBe(1);
    expect(result.get("KEY")).toBe("value");
  });

  it("ignores empty lines", () => {
    const result = parseEnvFile("\n\nKEY=value\n\n");
    expect(result.size).toBe(1);
  });

  it("handles export prefix", () => {
    const result = parseEnvFile("export REGION=us-east-1");
    expect(result.get("REGION")).toBe("us-east-1");
  });

  it("handles values with equals signs", () => {
    const result = parseEnvFile("URL=https://example.com?foo=bar");
    expect(result.get("URL")).toBe("https://example.com?foo=bar");
  });

  it("returns empty map for empty input", () => {
    const result = parseEnvFile("");
    expect(result.size).toBe(0);
  });

  it("trims whitespace around keys and values", () => {
    const result = parseEnvFile("  KEY  =  value  ");
    expect(result.get("KEY")).toBe("value");
  });
});
