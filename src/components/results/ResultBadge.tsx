import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, ShieldCheck, ShieldAlert, ShieldX, AlertOctagon } from 'lucide-react';

type AssessmentType =
  | 'supported' | 'contradicted' | 'unverified' | 'unable_to_analyze'
  | 'high' | 'medium' | 'low'
  | 'likely_authentic' | 'possible_manipulation' | 'likely_ai_generated';

interface ResultBadgeProps {
  type: AssessmentType;
  label: string;
  labelBn: string;
  size?: 'sm' | 'md' | 'lg';
}

const getConfig = (type: AssessmentType) => {
  switch (type) {
    case 'supported':
    case 'likely_authentic':
    case 'low':
      return {
        bg: 'bg-[var(--color-verified-bg)]',
        border: 'border-[var(--color-verified)]/20',
        text: 'text-[var(--color-verified)]',
        icon: type === 'low' ? ShieldCheck : CheckCircle2,
        glow: 'rgba(22, 163, 74, 0.15)',
      };
    case 'contradicted':
    case 'high':
      return {
        bg: 'bg-[var(--color-danger-bg)]',
        border: 'border-[var(--color-danger)]/20',
        text: 'text-[var(--color-danger)]',
        icon: type === 'high' ? ShieldX : XCircle,
        glow: 'rgba(220, 38, 38, 0.15)',
      };
    case 'unverified':
    case 'medium':
    case 'possible_manipulation':
      return {
        bg: type === 'medium' ? 'bg-[var(--color-warning-bg)]' : 'bg-[var(--color-unverified-bg)]',
        border: type === 'medium' ? 'border-[var(--color-warning)]/20' : 'border-[var(--color-unverified)]/20',
        text: type === 'medium' ? 'text-amber-700' : 'text-[var(--color-unverified)]',
        icon: type === 'medium' ? ShieldAlert : AlertTriangle,
        glow: type === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
      };
    case 'likely_ai_generated':
      return {
        bg: 'bg-[var(--color-warning-bg)]',
        border: 'border-[var(--color-warning)]/20',
        text: 'text-amber-700',
        icon: AlertOctagon,
        glow: 'rgba(245, 158, 11, 0.15)',
      };
    case 'unable_to_analyze':
    default:
      return {
        bg: 'bg-[var(--color-neutral-50)]',
        border: 'border-[var(--color-neutral-300)]/30',
        text: 'text-[var(--color-neutral-500)]',
        icon: HelpCircle,
        glow: 'rgba(100, 116, 139, 0.1)',
      };
  }
};

export default function ResultBadge({ type, label, labelBn, size = 'lg' }: ResultBadgeProps) {
  const config = getConfig(type);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'py-2 px-4',
    md: 'py-4 px-6',
    lg: 'py-6 px-8',
  };

  const iconSize = {
    sm: 20,
    md: 28,
    lg: 36,
  };

  const textSize = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`${config.bg} ${sizeClasses[size]} rounded-2xl border ${config.border} inline-flex flex-col items-center gap-2`}
      style={{ boxShadow: `0 0 30px ${config.glow}` }}
    >
      <Icon size={iconSize[size]} className={config.text} />
      <span className={`${textSize[size]} font-bold ${config.text} tracking-wide uppercase`}>
        {label}
      </span>
      <span className={`text-sm ${config.text} opacity-80 font-bengali`}>
        {labelBn}
      </span>
    </motion.div>
  );
}
