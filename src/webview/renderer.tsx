import React, { useMemo } from "react";
import MarkdownIt from "markdown-it";
import type { Block, RunBlock as RunBlockType } from "../types";
import RunBlockComponent from "./components/RunBlock";

interface ExecutionResult {
  html: string | null;
  error: string | null;
  errorStack?: string | null;
  duration: number | null;
  isRunning: boolean;
}

interface RendererProps {
  blocks: Block[];
  executionResults: Map<number, ExecutionResult>;
  sourceVisibility: Map<number, boolean>;
  onToggleSource: (index: number) => void;
  onRunBlock: (index: number) => void;
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
});

const MarkdownBlock: React.FC<{ content: string }> = ({ content }) => {
  const html = useMemo(() => md.render(content), [content]);

  return (
    <div
      className="md-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const Renderer: React.FC<RendererProps> = ({
  blocks,
  executionResults,
  sourceVisibility,
  onToggleSource,
  onRunBlock,
}) => {
  return (
    <div className="stereo-renderer stereo-scroll">
      {blocks.map((block, index) => {
        if (block.type === "markdown") {
          return <MarkdownBlock key={index} content={block.content} />;
        }

        if (block.type === "run") {
          const result = executionResults.get(index);
          return (
            <div className="md-content" key={index}>
              <RunBlockComponent
                block={block as RunBlockType}
                index={index}
                output={result?.html ?? null}
                error={result?.error ?? null}
                errorStack={result?.errorStack ?? null}
                isSourceVisible={sourceVisibility.get(index) ?? false}
                isRunning={result?.isRunning ?? false}
                duration={result?.duration ?? null}
                onToggleSource={() => onToggleSource(index)}
                onRun={() => onRunBlock(index)}
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default Renderer;
