import { useState, useRef } from 'react';
import { Upload, FileText, X, ChevronDown } from 'lucide-react';
import { uploadAPI } from '../../api/endpoints';
import type { UploadProgress } from '@/types';
import toast from 'react-hot-toast';
import styles from './FileUpload.module.css';
import { TaskHistory } from '../TaskHistory/TaskHistory';
import { ProgressBar } from '../ProgressBar/ProgressBar';

interface TaskProgress {
  progress: UploadProgress | null;
  error: string | null;
  isConnected: boolean;
}

interface FileUploadProps {
  activeTasks: { [taskId: string]: TaskProgress };
  onTaskStart: (taskId: string) => void;
  onTaskReset: (taskId: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  activeTasks,
  onTaskStart,
  onTaskReset,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
    } else {
      toast.error('Please upload a CSV file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await uploadAPI.uploadCSV(file);
      onTaskStart(response.task_id);
      toast.success('Upload started!');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLocalReset = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activeTasksCount = Object.keys(activeTasks).length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Product Importer</h1>
        <p className={styles.subtitle}>Upload CSV files to import products</p>
      </div>

      {/* Upload Area - Always Visible */}
      <div
        className={`${styles.uploadArea} ${isDragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className={styles.uploadIcon} />

        {file ? (
          <div className={styles.fileInfo}>
            <FileText className="w-6 h-6" style={{ color: '#3B82F6' }} />
            <div>
              <p className={styles.fileName}>{file.name}</p>
              <p className={styles.fileSize}>
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button onClick={() => setFile(null)} className={styles.removeBtn}>
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className={styles.uploadPrompt}>
            <p>Drag and drop your CSV file here</p>
            <p className={styles.uploadHint}>or click to browse</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className={styles.fileInput}
          id="file-upload"
        />

        <div className={styles.actions}>
          <label htmlFor="file-upload" className={styles.btnSecondary}>
            Choose File
          </label>

          {file && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className={styles.btnPrimary}
            >
              {isUploading ? (
                <>
                  <div className={styles.spinner} />
                  Uploading...
                </>
              ) : (
                'Upload & Process'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Clear File Selection Button */}
      {file && (
        <div style={{ marginTop: '16px' }}>
          <button onClick={handleLocalReset} className={styles.btnSecondary}>
            Clear File Selection
          </button>
        </div>
      )}

      {/* Active Uploads Section */}
      {activeTasksCount > 0 && (
        <div className={styles.progressContainer}>
          <div className={styles.progressHeader}>
            <h3 className={styles.progressTitle}>
              Active Uploads ({activeTasksCount})
            </h3>
          </div>

          <div className={styles.progressList}>
            {Object.entries(activeTasks).map(([taskId, task]) => (
              <ProgressBar
                key={taskId}
                taskId={taskId}
                progress={task.progress}
                error={task.error}
                onDismiss={() => onTaskReset(taskId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State for Active Uploads */}
      {activeTasksCount === 0 && (
        <div className={styles.emptyState}>
          <p>No active uploads</p>
        </div>
      )}

      {/* Upload History Section */}
      <div className={styles.historySection}>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={styles.historyToggle}
        >
          <span>Upload History</span>
          <ChevronDown
            style={{
              width: '20px',
              height: '20px',
              transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }}
          />
        </button>

        <div
          className={`${styles.historyWrapper} ${showHistory ? styles.open : styles.closed}`}
        >
          <TaskHistory />
        </div>
      </div>
    </div>
  );
};