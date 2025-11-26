import { AlertTriangle } from 'lucide-react';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.content}>
          <div className={`${styles.iconContainer} ${
            isDangerous ? styles.iconContainerDangerous : styles.iconContainerNormal
          }`}>
            <AlertTriangle 
              className={`w-6 h-6 ${isDangerous ? styles.iconDangerous : styles.iconNormal}`} 
            />
          </div>
          <div className={styles.textContainer}>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.message}>{message}</p>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <button
            onClick={onCancel}
            className={styles.buttonCancel}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`${styles.buttonConfirm} ${
              isDangerous 
                ? styles.buttonConfirmDangerous 
                : styles.buttonConfirmNormal
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
