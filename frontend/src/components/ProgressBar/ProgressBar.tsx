import type { UploadProgress } from '@/types';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  CheckSquare,
  Database,
  Sparkles,
  X
} from 'lucide-react';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  taskId: string;
  progress: UploadProgress | null;
  error: string | null;
  onDismiss: () => void;
}

const extractCountsFromMessage = (
  message: string | undefined
): { processed: number; total: number } | null => {
  if (!message) return null;

  const match = message.match(/Imported\s+([\d,]+)\s+of\s+([\d,]+)\s+products/);

  if (match) {
    const processed = parseInt(match[1].replace(/,/g, ''), 10);
    const total = parseInt(match[2].replace(/,/g, ''), 10);

    if (!isNaN(processed) && !isNaN(total)) {
      return { processed, total };
    }
  }

  return null;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  taskId,
  progress,
  error,
  onDismiss,
}) => {
  if (!progress) {
    return null;
  }

  const stages = [
    { key: 'parsing', label: 'Parsing', icon: FileText },
    { key: 'validating', label: 'Validating', icon: CheckSquare },
    { key: 'importing', label: 'Importing', icon: Database },
    { key: 'finalizing', label: 'Finalizing', icon: Sparkles },
  ];

  const getStageStatus = (stageKey: string) => {
    if (!progress.stage) return 'pending';

    const stageOrder = ['parsing', 'validating', 'importing', 'finalizing', 'complete'];
    const currentStageIndex = stageOrder.indexOf(progress.stage);
    const checkStageIndex = stageOrder.indexOf(stageKey);

    if (progress.status === 'failed') return 'error';
    if (progress.stage === 'complete' || progress.status === 'completed') return 'completed';
    if (checkStageIndex < currentStageIndex) return 'completed';
    if (checkStageIndex === currentStageIndex) return 'active';
    return 'pending';
  };

  const messageCounts = extractCountsFromMessage(progress.message);
  const totalRows = messageCounts?.total ?? progress.total_rows ?? 0;
  const processedRows = messageCounts?.processed ?? progress.processed_rows ?? 0;
  const failedRows = progress.failed_rows ?? 0;
  const progressPercent = Math.min(progress.progress ?? 0, 100);
  const isCompleted = progress.status === 'completed' || progress.status === 'failed';

  return (
    <div
      className={`${styles.progressCard} ${styles[progress.status]}`}
      data-status={progress.status}
    >
      {/* Header with Task Info */}
      <div className={styles.progressHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.statusIcon}>
            {progress.status === 'completed' && (
              <CheckCircle2 className="w-5 h-5" style={{ color: '#22C55E' }} />
            )}
            {progress.status === 'failed' && (
              <XCircle className="w-5 h-5" style={{ color: '#EF4444' }} />
            )}
            {progress.status === 'processing' && (
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#3B82F6' }} />
            )}
          </div>

          <div className={styles.headerInfo}>
            <p className={styles.taskId}>
              Task {taskId.slice(0, 8)}...
            </p>
            {progress.message && (
              <p className={styles.statusMessage}>{progress.message}</p>
            )}
          </div>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.percentage}>{progressPercent.toFixed(0)}%</span>

          {isCompleted && (
            <button
              onClick={onDismiss}
              className={styles.dismissBtn}
              title="Remove from list"
              aria-label="Dismiss upload"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Stage Indicators - Only when processing */}
      {progress.status === 'processing' && progress.stage && (
        <div className={styles.stagesContainer}>
          {stages.map((stage) => {
            const status = getStageStatus(stage.key);
            const Icon = stage.icon;

            return (
              <div key={stage.key} className={styles.stageItem}>
                <div className={`${styles.stageIcon} ${styles[`stage_${status}`]}`}>
                  {status === 'completed' ? (
                    <CheckCircle2 size={14} />
                  ) : status === 'active' ? (
                    <Loader2 size={14} className={styles.spinning} />
                  ) : (
                    <Icon size={14} />
                  )}
                </div>
                <span className={styles.stageLabel}>{stage.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Progress Bar */}
      <div className={styles.progressBarContainer}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          >
            {progress.status === 'processing' && (
              <div className={styles.shimmer} />
            )}
          </div>
        </div>
      </div>

      {/* Statistics Row */}
      <div className={styles.statsContainer}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Processed</span>
          <span className={styles.statValue}>
            {processedRows.toLocaleString()} / {totalRows.toLocaleString()}
          </span>
        </div>

        {failedRows > 0 && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Failed</span>
            <span className={`${styles.statValue} ${styles.statError}`}>
              {failedRows.toLocaleString()}
            </span>
          </div>
        )}

        <div className={styles.stat}>
          <span className={styles.statLabel}>Status</span>
          <span className={styles.statValue}>
            {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {(progress.error_message || error) && (
        <div className={styles.errorBox}>
          <XCircle size={16} />
          <p>{progress.error_message || error}</p>
        </div>
      )}
    </div>
  );
};

