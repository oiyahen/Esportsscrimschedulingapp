interface StatusChipProps {
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  className?: string;
}

export function StatusChip({ status, className = '' }: StatusChipProps) {
  const statusConfig = {
    confirmed: {
      label: 'Confirmed',
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      border: 'border-green-500/20',
      dot: 'bg-green-400',
    },
    pending: {
      label: 'Pending',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      dot: 'bg-amber-400',
    },
    completed: {
      label: 'Completed',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      dot: 'bg-blue-400',
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-gray-500/10',
      text: 'text-gray-400',
      border: 'border-gray-500/20',
      dot: 'bg-gray-400',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${config.bg} ${config.text} ${config.border} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
