import type { EvidenceSource } from '@/data/mockData';
import { ExternalLink, Building2, Newspaper, GraduationCap, Users, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface EvidenceCardProps {
  evidence: EvidenceSource;
  index?: number;
}

const sourceTypeIcon = (type: EvidenceSource['sourceType']) => {
  switch (type) {
    case 'government':
      return <Building2 size={18} />;
    case 'news':
      return <Newspaper size={18} />;
    case 'university':
      return <GraduationCap size={18} />;
    case 'social_media':
      return <Users size={18} />;
    case 'organization':
      return <Globe size={18} />;
  }
};

const sourceTypeLabel = (type: EvidenceSource['sourceType']) => {
  switch (type) {
    case 'government': return 'Government Source';
    case 'news': return 'News Source';
    case 'university': return 'University Source';
    case 'social_media': return 'Social Media';
    case 'organization': return 'Organization';
  }
};

const relationshipBadge = (rel: EvidenceSource['relationship']) => {
  switch (rel) {
    case 'supports':
      return <span className="badge badge-supported text-xs">Supports</span>;
    case 'contradicts':
      return <span className="badge badge-contradicted text-xs">Contradicts</span>;
    case 'neutral':
      return <span className="badge badge-unverified text-xs">No Confirmation</span>;
  }
};

export default function EvidenceCard({ evidence, index = 0 }: EvidenceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="card card-interactive"
    >
      <div className="flex items-start gap-3">
        {/* Source type icon */}
        <div className="w-10 h-10 rounded-lg bg-[var(--color-neutral-50)] border border-[var(--color-neutral-200)] flex items-center justify-center text-[var(--color-neutral-500)] flex-shrink-0">
          {sourceTypeIcon(evidence.sourceType)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <p className="text-xs text-[var(--color-neutral-400)] mb-0.5">
                {sourceTypeLabel(evidence.sourceType)}
              </p>
              <h4 className="text-sm font-semibold text-[var(--color-neutral-800)] leading-snug">
                {evidence.titleBn || evidence.title}
              </h4>
            </div>
            {relationshipBadge(evidence.relationship)}
          </div>

          {/* Source name & date */}
          <p className="text-xs text-[var(--color-neutral-500)] mb-2">
            {evidence.sourceName} · Published: {new Date(evidence.publishedDate).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>

          {/* Relevant quote */}
          {evidence.relevantQuoteBn && (
            <blockquote className="text-sm text-[var(--color-neutral-600)] bg-[var(--color-neutral-50)] border-l-3 border-[var(--color-neutral-300)] pl-3 py-2 rounded-r-md mb-3 font-bengali leading-relaxed">
              "{evidence.relevantQuoteBn}"
            </blockquote>
          )}

          {/* View source link */}
          <a
            href={evidence.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-dark)] transition-colors"
          >
            View Source <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
