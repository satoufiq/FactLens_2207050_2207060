import type { ProcessingStep } from '@/data/mockData';
import { Check, Circle, Loader2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProcessingStepsProps {
  steps: ProcessingStep[];
  title?: string;
  titleBn?: string;
}

const statusIcon = (status: ProcessingStep['status']) => {
  switch (status) {
    case 'completed':
      return <Check size={16} className="text-[var(--color-verified)]" />;
    case 'in_progress':
      return <Loader2 size={16} className="text-[var(--color-accent)] animate-spin" />;
    case 'pending':
      return <Circle size={16} className="text-[var(--color-neutral-300)]" />;
    case 'failed':
      return <XCircle size={16} className="text-[var(--color-danger)]" />;
  }
};

export default function ProcessingSteps({ steps, title = 'Analyzing your content', titleBn = 'আপনার বিষয়বস্তু বিশ্লেষণ করা হচ্ছে' }: ProcessingStepsProps) {
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="card max-w-lg mx-auto text-center">
      <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-1">{title}</h2>
      <p className="text-sm text-[var(--color-neutral-500)] font-bengali mb-6">{titleBn}</p>

      {/* Progress bar */}
      <div className="progress-bar mb-8">
        <motion.div
          className="progress-fill bg-[var(--color-accent)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Steps list */}
      <div className="space-y-3 text-left">
        {steps.map((step, i) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className={`flex items-center gap-3 py-1 ${
              step.status === 'pending' ? 'opacity-40' : ''
            }`}
          >
            {statusIcon(step.status)}
            <span className={`text-sm ${
              step.status === 'in_progress'
                ? 'text-[var(--color-accent)] font-medium'
                : step.status === 'completed'
                ? 'text-[var(--color-neutral-700)]'
                : 'text-[var(--color-neutral-400)]'
            }`}>
              {step.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
