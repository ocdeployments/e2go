'use client';

interface ClusterItem {
  number: number;
  label: string;
  status: 'complete' | 'active' | 'empty';
}

interface DocumentItem {
  name: string;
  status: 'building' | 'waiting' | 'complete';
}

interface SectionSideNavProps {
  sectionName: string;
  answeredCount: number;
  totalCount: number;
  clusters: ClusterItem[];
  documents: DocumentItem[];
  activeCluster: number;
  onClusterClick: (clusterNumber: number) => void;
}

export default function SectionSideNav({
  sectionName,
  answeredCount,
  totalCount,
  clusters,
  documents,
  activeCluster,
  onClusterClick,
}: SectionSideNavProps) {
  return (
    <div className="flex h-full flex-col p-5">
      {/* Section name */}
      <h2
        className="mb-1 text-[15px] font-light"
        style={{ fontFamily: "'Cormorant Garamond', serif", color: '#f5f0e8' }}
      >
        {sectionName}
      </h2>
      <p
        className="mb-6 text-[9px] uppercase tracking-[0.1em]"
        style={{ color: 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif" }}
      >
        {answeredCount} of {totalCount} answered
      </p>

      {/* Cluster list */}
      <nav className="flex-1">
        <ul className="space-y-1">
          {clusters.map((cluster) => {
            const isActive = cluster.number === activeCluster;
            const isComplete = cluster.status === 'complete';

            return (
              <li key={cluster.number}>
                <button
                  onClick={() => onClusterClick(cluster.number)}
                  className="flex w-full items-center gap-3 border-r px-3 py-2 text-left transition-colors"
                  style={{
                    borderColor: isActive ? '#C9A84C' : 'transparent',
                    backgroundColor: isActive ? 'rgba(201,168,76,0.05)' : 'transparent',
                  }}
                >
                  {/* Indicator */}
                  <span
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center border text-[9px]"
                    style={{
                      borderColor: isComplete
                        ? '#10B981'
                        : isActive
                          ? '#C9A84C'
                          : 'rgba(245,240,232,0.12)',
                      color: isComplete
                        ? '#10B981'
                        : isActive
                          ? '#C9A84C'
                          : 'rgba(245,240,232,0.28)',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {isComplete ? (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isActive ? (
                      <span>&rarr;</span>
                    ) : (
                      cluster.number
                    )}
                  </span>

                  {/* Label */}
                  <span
                    className="text-[11px]"
                    style={{
                      color: isActive
                        ? '#f5f0e8'
                        : isComplete
                          ? 'rgba(245,240,232,0.55)'
                          : 'rgba(245,240,232,0.28)',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {cluster.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Document preview box */}
      {documents.length > 0 && (
        <div
          className="mt-auto border p-4"
          style={{ borderColor: 'rgba(201,168,76,0.12)', backgroundColor: '#0a0a0a' }}
        >
          <p
            className="mb-3 text-[9px] uppercase tracking-[0.1em]"
            style={{ color: 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif" }}
          >
            Building
          </p>
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.name} className="flex items-center justify-between">
                <span
                  className="text-[11px]"
                  style={{ color: 'rgba(245,240,232,0.4)', fontFamily: "'DM Sans', sans-serif" }}
                >
                  {doc.name}
                </span>
                <span
                  className="text-[9px] uppercase tracking-[0.08em]"
                  style={{
                    color: doc.status === 'building'
                      ? '#C9A84C'
                      : doc.status === 'complete'
                        ? '#10B981'
                        : 'rgba(245,240,232,0.15)',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {doc.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
