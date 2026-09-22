interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

function ErrorState({ message = "Something went wrong.", onRetry, className = "" }: ErrorStateProps) {
  return (
    <div role="alert" className={`flex flex-wrap items-center gap-3 text-sm text-muted ${className}`}>
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-line px-3 py-1 font-medium text-fg transition hover:border-accent hover:text-accent"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export default ErrorState;
