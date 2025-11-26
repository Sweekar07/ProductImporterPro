import { useState, useEffect, useCallback  } from 'react';
import { uploadAPI } from '../../api/endpoints';
import type { UploadTask } from '@/types';
import { RefreshCw, CheckCircle2, XCircle, Loader2, Clock, Trash2, FileText, Copy, AlertCircle, Check } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import toast from 'react-hot-toast';
import styles from './TaskHistory.module.css';


export const TaskHistory: React.FC = ({  }) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await uploadAPI.getAllTasks(1, 5, filter);
      setTasks(response.tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load task history');
    } finally {
    }
  }, [filter]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(() => {
      if (tasks.some(t => t.status === 'processing')) {
        fetchTasks();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [filter, fetchTasks]);

  const getStatusIcon = (status: string) => {
    const iconProps = { className: 'w-4 h-4' };
    switch (status) {
      case 'completed':
        return <CheckCircle2 {...iconProps} />;
      case 'failed':
        return <XCircle {...iconProps} />;
      case 'processing':
        return <Loader2 {...iconProps} className="w-4 h-4 animate-spin" />;
      default:
        return <Clock {...iconProps} />;
    }
  };

  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      completed: styles.statusCompleted,
      failed: styles.statusFailed,
      processing: styles.statusProcessing,
      pending: styles.statusPending,
    };
    return statusMap[status] || statusMap.pending;
  };


  const calculateProgress = (task: UploadTask) => {
    const uniqueRows = task.total_rows - (task.duplicate_rows || 0);
    if (!uniqueRows || uniqueRows === 0) return 0;
    return Math.round((task.processed_rows / uniqueRows) * 100);
  };

  const confirmDelete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;

    try {
      await uploadAPI.deleteTask(taskToDelete);
      toast.success('Task deleted successfully');
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
      fetchTasks();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete task');
    }
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.filters}>
            {['All', 'processing', 'completed', 'failed'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption === 'All' ? undefined : filterOption)}
                className={`${styles.filterButton} ${
                  (filterOption === 'All' ? !filter : filter === filterOption) ? styles.filterButtonActive : ''
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
            <button
              onClick={fetchTasks}
              className={styles.actionButton}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${styles.iconBlue}`} />
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeader}>Filename</th>
                <th className={styles.tableHeader}>Status</th>
                <th className={styles.tableHeader}>Progress</th>
                <th className={styles.tableHeader}>Analytics</th>
                <th className={styles.tableHeader}>Created</th>
                <th className={styles.tableHeader}>Action</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {tasks.map((task) => {
                const progress = calculateProgress(task);
                const duplicates = task.duplicate_rows || 0;
                const failed = task.failed_rows || 0;
                const inserted = task.processed_rows || 0;

                return (
                  <tr
                    key={task.task_id}
                    className={styles.tableRow}
                    // onClick={() => onTaskSelect(task.task_id)}
                  >
                    <td className={styles.tableCell}>{task.filename}</td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${getStatusClass(task.status)}`}>
                        {getStatusIcon(task.status)}
                        <span style={{ textTransform: 'capitalize' }}>{task.status}</span>
                      </span>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.progressCell}>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className={styles.progressText}>{progress}%</span>
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.analytics}>
                        <div className={styles.analyticsRow}>
                          <FileText className="w-3 h-3" />
                          <span className={styles.analyticsLabel}>CSV:</span>
                          <span className={styles.analyticsValue}>{task.total_rows}</span>
                        </div>
                        <div className={styles.analyticsRow}>
                          <Check className="w-3 h-3" style={{ color: '#22C55E' }} />
                          <span className={styles.analyticsLabel}>Inserted:</span>
                          <span className={`${styles.analyticsValue} ${styles.analyticsSuccess}`}>{inserted}</span>
                        </div>
                        {duplicates > 0 && (
                          <div className={styles.analyticsRow}>
                            <Copy className="w-3 h-3" style={{ color: '#F59E0B' }} />
                            <span className={styles.analyticsLabel}>Duplicates:</span>
                            <span className={`${styles.analyticsValue} ${styles.analyticsWarning}`}>{duplicates}</span>
                          </div>
                        )}
                        {failed > 0 && (
                          <div className={styles.analyticsRow}>
                            <AlertCircle className="w-3 h-3" style={{ color: '#EF4444' }} />
                            <span className={styles.analyticsLabel}>Invalid:</span>
                            <span className={`${styles.analyticsValue} ${styles.analyticsError}`}>{failed}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={styles.tableCell}>{formatDate(task.created_at)}</td>
                    <td className={styles.tableCell}>
                      <button
                        onClick={(e) => confirmDelete(task.task_id, e)}
                        className={styles.deleteButton}
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Upload Task"
        message="Are you sure you want to delete this upload task? This will only remove the task record, not the imported products."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setTaskToDelete(null);
        }}
        isDangerous={true}
      />
    </>
  );
};
