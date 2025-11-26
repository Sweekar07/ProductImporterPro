import { useState } from 'react';
import type { Webhook, WebhookCreate } from '@/types';
import { useWebhooks } from '../../hooks/useWebhooks';
import { webhookAPI } from '../../api/endpoints';
import {
  Plus,
  Trash2,
  TestTube,
  Power,
  PowerOff,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/formatters';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import styles from './WebhookConfig.module.css';

export const WebhookConfig: React.FC = () => {
  const { webhooks, loading, fetchWebhooks, deleteWebhook, testWebhook } = useWebhooks();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<number | null>(null);
  
  const [addForm, setAddForm] = useState<WebhookCreate>({
    name: '',
    url: '',
    event_type: 'upload_complete',
    is_enabled: true,
    secret_key: '',
  });

  const [editForm, setEditForm] = useState<Partial<WebhookCreate>>({});

  const eventTypes = [
    { value: 'upload_complete', label: 'Upload Complete' },
    { value: 'product_created', label: 'Product Created' },
    { value: 'product_updated', label: 'Product Updated' },
    { value: 'product_deleted', label: 'Product Deleted' },
    { value: 'products_bulk_deleted', label: 'Products Bulk Deleted' },
  ];

  // Add handler
  const handleAdd = async () => {
    if (!addForm.name || !addForm.url) {
      toast.error('Name and URL are required');
      return;
    }

    try {
      await webhookAPI.create(addForm);
      toast.success('Webhook created successfully');
      setShowAddModal(false);
      setAddForm({
        name: '',
        url: '',
        event_type: 'upload_complete',
        is_enabled: true,
        secret_key: '',
      });
      fetchWebhooks();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create webhook');
    }
  };

  // Edit handlers
  const startEdit = (webhook: Webhook) => {
    setEditingId(webhook.id);
    setEditForm({
      name: webhook.name,
      url: webhook.url,
      event_type: webhook.event_type,
      is_enabled: webhook.is_enabled,
      secret_key: webhook.secret_key,
    });
  };

  const saveEdit = async (id: number) => {
    try {
      await webhookAPI.update(id, editForm);
      toast.success('Webhook updated successfully');
      setEditingId(null);
      setEditForm({});
      fetchWebhooks();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update webhook');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Delete handler
  const confirmDelete = (id: number) => {
    setWebhookToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (webhookToDelete) {
      await deleteWebhook(webhookToDelete);
      setDeleteDialogOpen(false);
      setWebhookToDelete(null);
    }
  };

  // Toggle webhook status
  const toggleWebhook = async (webhook: Webhook) => {
    try {
      await webhookAPI.update(webhook.id, { is_enabled: !webhook.is_enabled });
      toast.success(`Webhook ${!webhook.is_enabled ? 'enabled' : 'disabled'}`);
      fetchWebhooks();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to toggle webhook');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>Webhooks</h2>
          <p className={styles.subtitle}>
            Configure webhooks to receive notifications for events
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className={styles.addButton}
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      {/* Webhooks List */}
      <div className={styles.webhooksList}>
        {loading ? (
          <div className={styles.loadingState}>
            <p className={styles.loadingText}>Loading webhooks...</p>
          </div>
        ) : webhooks.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No webhooks configured</p>
            <button
              onClick={() => setShowAddModal(true)}
              className={styles.emptyButton}
            >
              Add your first webhook
            </button>
          </div>
        ) : (
          webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className={`${styles.webhookCard} ${
                webhook.is_enabled ? styles.webhookCardEnabled : styles.webhookCardDisabled
              }`}
            >
              {editingId === webhook.id ? (
                // Edit Mode
                <div className={styles.editForm}>
                  <input
                    type="text"
                    placeholder="Webhook Name"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className={styles.editInput}
                  />
                  <input
                    type="url"
                    placeholder="Webhook URL"
                    value={editForm.url || ''}
                    onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                    className={styles.editInput}
                  />
                  <select
                    value={editForm.event_type || 'upload_complete'}
                    onChange={(e) =>
                      setEditForm({ ...editForm, event_type: e.target.value })
                    }
                    className={styles.editInput}
                  >
                    {eventTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Secret Key (optional)"
                    value={editForm.secret_key || ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, secret_key: e.target.value })
                    }
                    className={styles.editInput}
                  />
                  <div className={styles.editButtons}>
                    <button
                      onClick={() => saveEdit(webhook.id)}
                      className={styles.saveButton}
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className={styles.cancelButton}
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div>
                  <div className={styles.viewContent}>
                    <div className={styles.webhookInfo}>
                      <div className={styles.webhookHeader}>
                        <h3 className={styles.webhookName}>
                          {webhook.name}
                        </h3>
                        <span
                          className={`${styles.statusBadge} ${
                            webhook.is_enabled
                              ? styles.statusBadgeEnabled
                              : styles.statusBadgeDisabled
                          }`}
                        >
                          {webhook.is_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className={styles.webhookDetail}>
                        <span className={styles.webhookDetailLabel}>URL:</span> {webhook.url}
                      </p>
                      <p className={styles.webhookDetail}>
                        <span className={styles.webhookDetailLabel}>Event:</span>{' '}
                        {eventTypes.find((t) => t.value === webhook.event_type)?.label}
                      </p>
                      <p className={styles.webhookMeta}>
                        Created: {formatDate(webhook.created_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => toggleWebhook(webhook)}
                        className={styles.actionButton}
                        title={webhook.is_enabled ? 'Disable' : 'Enable'}
                      >
                        {webhook.is_enabled ? (
                          <PowerOff className={`w-4 h-4 ${styles.iconGray}`} />
                        ) : (
                          <Power className={`w-4 h-4 ${styles.iconGray}`} />
                        )}
                      </button>
                      <button
                        onClick={() => testWebhook(webhook.id)}
                        className={`${styles.actionButton} ${styles.actionButtonTest}`}
                        title="Test Webhook"
                      >
                        <TestTube className={`w-4 h-4 ${styles.iconBlue}`} />
                      </button>
                      <button
                        onClick={() => startEdit(webhook)}
                        className={`${styles.actionButton} ${styles.actionButtonEdit}`}
                        title="Edit"
                      >
                        <Pencil className={`w-4 h-4 ${styles.iconBlue}`} />
                      </button>
                      <button
                        onClick={() => confirmDelete(webhook.id)}
                        className={`${styles.actionButton} ${styles.actionButtonDelete}`}
                        title="Delete"
                      >
                        <Trash2 className={`w-4 h-4 ${styles.iconRed}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Webhook Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>
              Add New Webhook
            </h3>
            <div className={styles.modalForm}>
              <input
                type="text"
                placeholder="Webhook Name *"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className={styles.modalInput}
              />
              <input
                type="url"
                placeholder="Webhook URL *"
                value={addForm.url}
                onChange={(e) => setAddForm({ ...addForm, url: e.target.value })}
                className={styles.modalInput}
              />
              <select
                value={addForm.event_type}
                onChange={(e) =>
                  setAddForm({ ...addForm, event_type: e.target.value })
                }
                className={styles.modalInput}
              >
                {eventTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Secret Key (optional)"
                value={addForm.secret_key}
                onChange={(e) =>
                  setAddForm({ ...addForm, secret_key: e.target.value })
                }
                className={styles.modalInput}
              />
              <label className={styles.modalCheckbox}>
                <input
                  type="checkbox"
                  checked={addForm.is_enabled}
                  onChange={(e) =>
                    setAddForm({ ...addForm, is_enabled: e.target.checked })
                  }
                />
                <span>Enabled</span>
              </label>
            </div>
            <div className={styles.modalButtons}>
              <button
                onClick={() => setShowAddModal(false)}
                className={styles.modalButtonCancel}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className={styles.modalButtonSubmit}
              >
                Add Webhook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Webhook"
        message="Are you sure you want to delete this webhook? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isDangerous={true}
      />
    </div>
  );
};
