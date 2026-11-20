export default function Logo({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      {/* tronco principal */}
      <path d="M7.5 5.5v11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* rama que baja del nodo de deploy hasta el tronco */}
      <path d="M17.5 8.25c0 5.75-4.5 8.25-9.5 8.25" stroke="#3fb950" strokeWidth="2.2" strokeLinecap="round" />
      {/* nodos */}
      <circle cx="7.5" cy="19" r="2.5" fill="currentColor" />
      <circle cx="17.5" cy="5.5" r="2.5" fill="#3fb950" />
    </svg>
  );
}
