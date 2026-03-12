import { describe, it, expect } from "vitest";
import { parseDocument, parseRefreshInterval } from "../parser";
import type { RunBlock, MarkdownBlock } from "../types";

describe("parseRefreshInterval", () => {
  it("parses milliseconds", () => {
    expect(parseRefreshInterval("500ms")).toBe(500);
  });

  it("parses seconds", () => {
    expect(parseRefreshInterval("30s")).toBe(30000);
  });

  it("parses minutes", () => {
    expect(parseRefreshInterval("5m")).toBe(300000);
  });

  it("parses bare number as ms", () => {
    expect(parseRefreshInterval("1000")).toBe(1000);
  });

  it("returns 0 for invalid input", () => {
    expect(parseRefreshInterval("abc")).toBe(0);
  });
});

describe("parseDocument", () => {
  it("extracts a basic run block", () => {
    const doc = [
      "```tsx run",
      "console.log('hello');",
      "```",
    ].join("\n");

    const result = parseDocument(doc);
    expect(result.blocks).toHaveLength(1);

    const block = result.blocks[0] as RunBlock;
    expect(block.type).toBe("run");
    expect(block.lang).toBe("tsx");
    expect(block.code).toBe("console.log('hello');");
    expect(block.line).toBe(0);
    expect(block.envRefs).toEqual([]);
  });

  it("handles multiple blocks (markdown + run + markdown)", () => {
    const doc = [
      "# Title",
      "",
      "Some text.",
      "",
      "```tsx run",
      "<div>hi</div>",
      "```",
      "",
      "More text.",
    ].join("\n");

    const result = parseDocument(doc);
    expect(result.blocks).toHaveLength(3);

    const first = result.blocks[0] as MarkdownBlock;
    expect(first.type).toBe("markdown");
    expect(first.content).toBe("# Title\n\nSome text.\n");
    expect(first.line).toBe(0);

    const run = result.blocks[1] as RunBlock;
    expect(run.type).toBe("run");
    expect(run.lang).toBe("tsx");
    expect(run.code).toBe("<div>hi</div>");
    expect(run.line).toBe(4);

    const last = result.blocks[2] as MarkdownBlock;
    expect(last.type).toBe("markdown");
    expect(last.content).toBe("\nMore text.");
    expect(last.line).toBe(7);
  });

  it("parses options: refresh, title, cols", () => {
    const doc = [
      '```tsx run refresh=30s title="My Dashboard" cols=3',
      "// code",
      "```",
    ].join("\n");

    const result = parseDocument(doc);
    const block = result.blocks[0] as RunBlock;
    expect(block.options.refresh).toBe(30000);
    expect(block.options.title).toBe("My Dashboard");
    expect(block.options.cols).toBe(3);
  });

  it("extracts env references", () => {
    const doc = [
      "```tsx run",
      "const url = `${{{env.API_URL}}}/data`;",
      "const key = {{env.API_KEY}};",
      "```",
    ].join("\n");

    const result = parseDocument(doc);
    const block = result.blocks[0] as RunBlock;
    expect(block.envRefs).toEqual(["API_URL", "API_KEY"]);
  });

  it("deduplicates env references", () => {
    const doc = [
      "```tsx run",
      "{{env.TOKEN}} + {{env.TOKEN}}",
      "```",
    ].join("\n");

    const result = parseDocument(doc);
    const block = result.blocks[0] as RunBlock;
    expect(block.envRefs).toEqual(["TOKEN"]);
  });

  it("handles empty code blocks", () => {
    const doc = [
      "```tsx run",
      "```",
    ].join("\n");

    const result = parseDocument(doc);
    const block = result.blocks[0] as RunBlock;
    expect(block.type).toBe("run");
    expect(block.code).toBe("");
    expect(block.envRefs).toEqual([]);
  });

  it("handles nested fences (4 backticks containing 3)", () => {
    const doc = [
      "````tsx run",
      "const md = `",
      "```js",
      "console.log('nested');",
      "```",
      "`;",
      "````",
    ].join("\n");

    const result = parseDocument(doc);
    expect(result.blocks).toHaveLength(1);

    const block = result.blocks[0] as RunBlock;
    expect(block.type).toBe("run");
    expect(block.code).toContain("```js");
    expect(block.code).toContain("console.log('nested');");
  });

  it("treats frontmatter as markdown", () => {
    const doc = [
      "---",
      "title: Test",
      "---",
      "",
      "# Hello",
      "",
      "```tsx run",
      "<p>hi</p>",
      "```",
    ].join("\n");

    const result = parseDocument(doc);
    expect(result.blocks).toHaveLength(2);

    const first = result.blocks[0] as MarkdownBlock;
    expect(first.type).toBe("markdown");
    expect(first.content).toContain("---");
    expect(first.content).toContain("title: Test");

    const run = result.blocks[1] as RunBlock;
    expect(run.type).toBe("run");
    expect(run.code).toBe("<p>hi</p>");
  });

  it("keeps non-run code blocks as markdown", () => {
    const doc = [
      "# Example",
      "",
      "```ts",
      "const x = 1;",
      "```",
      "",
      "```tsx run",
      "<div>{x}</div>",
      "```",
    ].join("\n");

    const result = parseDocument(doc);
    expect(result.blocks).toHaveLength(2);

    const md = result.blocks[0] as MarkdownBlock;
    expect(md.type).toBe("markdown");
    expect(md.content).toContain("```ts");
    expect(md.content).toContain("const x = 1;");

    const run = result.blocks[1] as RunBlock;
    expect(run.type).toBe("run");
    expect(run.code).toBe("<div>{x}</div>");
  });

  it("tracks correct line numbers", () => {
    const doc = [
      "# Line 0",        // line 0
      "",                 // line 1
      "```tsx run",       // line 2
      "code1",            // line 3
      "```",              // line 4
      "",                 // line 5
      "text",             // line 6
      "",                 // line 7
      "```tsx run",       // line 8
      "code2",            // line 9
      "```",              // line 10
    ].join("\n");

    const result = parseDocument(doc);
    expect(result.blocks).toHaveLength(4);

    expect(result.blocks[0].line).toBe(0); // markdown
    expect(result.blocks[1].line).toBe(2); // first run block
    expect(result.blocks[2].line).toBe(5); // markdown
    expect(result.blocks[3].line).toBe(8); // second run block
  });

  it("handles run blocks with different languages", () => {
    const doc = [
      "```python run",
      "print('hello')",
      "```",
    ].join("\n");

    const result = parseDocument(doc);
    const block = result.blocks[0] as RunBlock;
    expect(block.lang).toBe("python");
    expect(block.code).toBe("print('hello')");
  });

  it("parses document with only markdown", () => {
    const doc = "# Just a heading\n\nSome text.";

    const result = parseDocument(doc);
    expect(result.blocks).toHaveLength(1);

    const block = result.blocks[0] as MarkdownBlock;
    expect(block.type).toBe("markdown");
    expect(block.content).toBe("# Just a heading\n\nSome text.");
  });

  it("parses document with only a run block", () => {
    const doc = "```tsx run\n<App />\n```";

    const result = parseDocument(doc);
    expect(result.blocks).toHaveLength(1);

    const block = result.blocks[0] as RunBlock;
    expect(block.type).toBe("run");
    expect(block.code).toBe("<App />");
  });
});
