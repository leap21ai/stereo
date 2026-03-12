import React, { useState } from "react";
import type { RunBlock as RunBlockType } from "../../types";

interface RunBlockProps {
  block: RunBlockType;
  index: number;
  output: string | null;
  error: string | null;
  errorStack?: string | null;
  isSourceVisible: boolean;
  isRunning: boolean;
  duration: number | null;
  onToggleSource: () => void;
  onRun: () => void;
}

const RunBlockComponent: React.FC<RunBlockProps> = ({
  block,
  index,
  output,
  error,
  errorStack,
  isSourceVisible,
  isRunning,
  duration,
  onToggleSource,
  onRun,
}) => {
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const title = block.options.title || `${block.lang} block`;
  const refreshLabel = block.options.refresh
    ? ` \u00b7 auto-refresh ${block.options.refresh / 1000}s`
    : "";

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="run-block">
      <div className="run-header">
        <div className="run-header-left">
          <span className={`run-badge${block.options.refresh ? " live" : ""}`}>
            {block.options.refresh ? "live" : "run"}
          </span>
          <span className="run-lang">
            {block.lang}
            {refreshLabel}
          </span>
          {duration !== null && (
            <span className="run-duration">{formatDuration(duration)}</span>
          )}
        </div>
        <div className="run-actions">
          <button
            className={`run-action-btn source${isSourceVisible ? " active" : ""}`}
            onClick={onToggleSource}
          >
            Source
          </button>
          <button
            className={`run-action-btn run${isRunning ? " running" : ""}`}
            onClick={onRun}
            disabled={isRunning}
          >
            {isRunning ? "\u25A0 Running" : "\u25B6 Run"}
          </button>
        </div>
      </div>

      {isSourceVisible && (
        <div className="run-source">{block.code}</div>
      )}

      {isRunning && !output && !error && (
        <div className="run-loading">
          <div className="run-loading-spinner" />
          Executing {block.lang} block...
        </div>
      )}

      {output && (
        <div
          className="live-output"
          dangerouslySetInnerHTML={{ __html: output }}
        />
      )}

      {error && (
        <div className="run-error">
          <div className="run-error-title">Execution Error</div>
          <div className="run-error-message">{error}</div>
          {errorStack && (
            <>
              <button
                className="run-error-details-toggle"
                onClick={() => setShowErrorDetails((prev) => !prev)}
              >
                {showErrorDetails ? "\u25BC Hide Details" : "\u25B6 Show Details"}
              </button>
              {showErrorDetails && (
                <div className="run-error-stack">{errorStack}</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RunBlockComponent;
