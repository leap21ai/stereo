import type { Block, ParsedDocument, RunBlock, RunBlockOptions, MarkdownBlock } from "./types";

/**
 * Parse a refresh interval string into milliseconds.
 * Supports: "500ms", "30s", "5m", bare number (treated as ms).
 */
export function parseRefreshInterval(value: string): number {
  const trimmed = value.trim();

  const msMatch = trimmed.match(/^(\d+(?:\.\d+)?)ms$/);
  if (msMatch) {
    return Math.round(parseFloat(msMatch[1]));
  }

  const sMatch = trimmed.match(/^(\d+(?:\.\d+)?)s$/);
  if (sMatch) {
    return Math.round(parseFloat(sMatch[1]) * 1000);
  }

  const mMatch = trimmed.match(/^(\d+(?:\.\d+)?)m$/);
  if (mMatch) {
    return Math.round(parseFloat(mMatch[1]) * 60 * 1000);
  }

  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return Math.round(num);
  }

  return 0;
}

/**
 * Parse key=value options from the fence line after `run`.
 * Supports: refresh=30s, title="My Title", cols=3
 */
function parseOptions(optionStr: string): RunBlockOptions {
  const options: RunBlockOptions = {};
  // Match key=value or key="quoted value"
  const optionRegex = /(\w+)=(?:"([^"]*)"|(\S+))/g;
  let match: RegExpExecArray | null;

  while ((match = optionRegex.exec(optionStr)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3];

    switch (key) {
      case "refresh":
        options.refresh = parseRefreshInterval(value);
        break;
      case "title":
        options.title = value;
        break;
      case "cols":
        options.cols = parseInt(value, 10);
        break;
    }
  }

  return options;
}

/**
 * Extract all {{env.X}} references from code.
 */
function extractEnvRefs(code: string): string[] {
  const refs: string[] = [];
  const envRegex = /\{\{env\.(\w+)\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = envRegex.exec(code)) !== null) {
    if (!refs.includes(match[1])) {
      refs.push(match[1]);
    }
  }

  return refs;
}

/**
 * Parse a markdown document into an array of Block items.
 *
 * Fenced code blocks with `run` keyword on the fence line are extracted
 * as RunBlock. All other content (including non-run code blocks) is
 * grouped into MarkdownBlock segments.
 */
export function parseDocument(content: string): ParsedDocument {
  const lines = content.split("\n");
  const blocks: Block[] = [];

  let markdownStart = 0;
  let markdownLines: string[] = [];
  let i = 0;

  function flushMarkdown(upToLine: number): void {
    if (markdownLines.length > 0) {
      blocks.push({
        type: "markdown",
        content: markdownLines.join("\n"),
        line: markdownStart,
      } satisfies MarkdownBlock);
      markdownLines = [];
    }
    markdownStart = upToLine;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Detect fenced code block opening: 3+ backticks
    const fenceMatch = line.match(/^(`{3,})\s*(.*)$/);

    if (fenceMatch) {
      const backticks = fenceMatch[1];
      const fenceInfo = fenceMatch[2].trim();
      const fenceLen = backticks.length;

      // Check if this is a `run` block
      const runMatch = fenceInfo.match(/^(\w+)\s+run(?:\s+(.*))?$/);

      if (runMatch) {
        // This is a run block — flush preceding markdown
        flushMarkdown(i);

        const lang = runMatch[1];
        const optionStr = runMatch[2] ?? "";
        const options = parseOptions(optionStr);
        const blockStartLine = i;

        // Collect code lines until closing fence
        const codeLines: string[] = [];
        i++;
        while (i < lines.length) {
          const closingMatch = lines[i].match(/^(`{3,})\s*$/);
          if (closingMatch && closingMatch[1].length >= fenceLen) {
            break;
          }
          codeLines.push(lines[i]);
          i++;
        }

        const code = codeLines.join("\n");

        blocks.push({
          type: "run",
          lang,
          code,
          options,
          line: blockStartLine,
          envRefs: extractEnvRefs(code),
        } satisfies RunBlock);

        // Skip past closing fence
        i++;
        markdownStart = i;
      } else {
        // Non-run code block — include as markdown
        markdownLines.push(line);
        i++;

        // Consume until matching closing fence
        while (i < lines.length) {
          const closingMatch = lines[i].match(/^(`{3,})\s*$/);
          markdownLines.push(lines[i]);
          if (closingMatch && closingMatch[1].length >= fenceLen) {
            i++;
            break;
          }
          i++;
        }
      }
    } else {
      markdownLines.push(line);
      i++;
    }
  }

  // Flush any remaining markdown
  flushMarkdown(i);

  return { blocks };
}
