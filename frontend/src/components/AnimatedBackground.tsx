export function AnimatedBackground() {
  return (
    <div className="animated-bg" aria-hidden="true">
      {/* Moving gradient base */}
      <div className="animated-gradient" />
      {/* Floating blur blobs */}
      <div className="animated-blob blob-1" />
      <div className="animated-blob blob-2" />
      <div className="animated-blob blob-3" />
      <div className="animated-blob blob-4" />
    </div>
  );
}
