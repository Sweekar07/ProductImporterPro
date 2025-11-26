import { useState } from 'react';
import type { Product, ProductCreate, ProductUpdate } from '@/types';
import { useProducts } from '../../hooks/useProducts';
import { Pagination } from '../Pagination/Pagination';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { productAPI } from '../../api/endpoints';
import {
  Pencil,
  Trash2,
  Plus,
  Filter,
  X,
  Save,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/formatters';
import styles from './ProductTable.module.css';

export const ProductTable: React.FC = () => {
  const {
    products,
    total,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
    filters,
    setFilters,
    fetchProducts,
    deleteProduct,
    deleteAllProducts,
  } = useProducts();

  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ProductUpdate>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<ProductCreate>({
    sku: '',
    name: '',
    description: '',
    is_active: true,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);


  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  // Edit handlers
  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      description: product.description,
      is_active: product.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: number) => {
    try {
      await productAPI.update(id, editForm);
      toast.success('Product updated successfully');
      setEditingId(null);
      setEditForm({});
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update product');
    }
  };

  // Add handler
  const handleAdd = async () => {
    try {
      await productAPI.create(addForm);
      toast.success('Product created successfully');
      setShowAddModal(false);
      setAddForm({ sku: '', name: '', description: '', is_active: true });
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create product');
    }
  };

  // Delete handlers
  const confirmDelete = (id: number) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (productToDelete) {
      await deleteProduct(productToDelete);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleDeleteAll = async () => {
    await deleteAllProducts();
    setDeleteAllDialogOpen(false);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Products</h2>
        <div className={styles.headerButtons}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`${styles.button} ${styles.buttonOutline}`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
          <button
            onClick={() => setDeleteAllDialogOpen(true)}
            className={`${styles.button} ${styles.buttonDanger}`}
          >
            <Trash2 className="w-4 h-4" />
            Delete All
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className={styles.filtersContainer}>
          <div className={styles.filtersGrid}>
            <input
              type="text"
              placeholder="Filter by SKU..."
              value={filters.sku || ''}
              onChange={(e) => {
                const newFilters = { ...filters };
                if (e.target.value) {
                  newFilters.sku = e.target.value;
                } else {
                  delete newFilters.sku;
                }
                setFilters(newFilters);
                setPage(1);
              }}
              className={styles.filterInput}
            />
            <input
              type="text"
              placeholder="Filter by name..."
              value={filters.name || ''}
              onChange={(e) => {
                const newFilters = { ...filters };
                if (e.target.value) {
                  newFilters.name = e.target.value;
                } else {
                  delete newFilters.name;
                }
                setFilters(newFilters);
                setPage(1);
              }}
              className={styles.filterInput}
            />
            <select
              value={
                filters.is_active === undefined
                  ? ''
                  : filters.is_active
                    ? 'true'
                    : 'false'
              }
              onChange={(e) => {
                const newFilters = { ...filters };
                if (e.target.value === '') {
                  delete newFilters.is_active;
                } else {
                  newFilters.is_active = e.target.value === 'true';
                }
                setFilters(newFilters);
                setPage(1);
              }}
              className={styles.filterInput}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <button onClick={clearFilters} className={styles.clearFiltersButton}>
            Clear Filters
          </button>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeader}>SKU</th>
                <th className={styles.tableHeader}>Name</th>
                <th className={styles.tableHeader}>Description</th>
                <th className={styles.tableHeader}>Status</th>
                <th className={styles.tableHeader}>Updated</th>
                <th className={`${styles.tableHeader} ${styles.tableHeaderRight}`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>
                      <span className={styles.cellText}>{product.sku}</span>
                    </td>
                    <td className={styles.tableCell}>
                      {editingId === product.id ? (
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className={styles.cellInput}
                        />
                      ) : (
                        <span className={styles.cellText}>{product.name}</span>
                      )}
                    </td>
                    <td className={styles.tableCell}>
                      {editingId === product.id ? (
                        <input
                          type="text"
                          value={editForm.description || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, description: e.target.value })
                          }
                          className={styles.cellInput}
                        />
                      ) : (
                        <span className={styles.cellTextMuted}>
                          {product.description?.substring(0, 50)}
                          {product.description && product.description.length > 50 && '...'}
                        </span>
                      )}
                    </td>
                    <td className={styles.tableCell}>
                      {editingId === product.id ? (
                        <select
                          value={editForm.is_active?.toString()}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              is_active: e.target.value === 'true',
                            })
                          }
                          className={styles.cellSelect}
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      ) : (
                        <span
                          className={`${styles.statusBadge} ${product.is_active
                            ? styles.statusBadgeActive
                            : styles.statusBadgeInactive
                            }`}
                        >
                          {product.is_active ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className={styles.tableCell}>
                      <span className={styles.cellTextMuted}>
                        {formatDate(product.updated_at)}
                      </span>
                    </td>
                    <td className={`${styles.tableCell} ${styles.tableCellRight}`}>
                      {editingId === product.id ? (
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => saveEdit(product.id)}
                            className={`${styles.actionButton} ${styles.actionButtonSave}`}
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className={`${styles.actionButton} ${styles.actionButtonCancel}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => startEdit(product)}
                            className={`${styles.actionButton} ${styles.actionButtonEdit}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(product.id)}
                            className={`${styles.actionButton} ${styles.actionButtonDelete}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && products.length > 0 && (
          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Add New Product</h3>
            <div className={styles.modalForm}>
              <input
                type="text"
                placeholder="SKU *"
                value={addForm.sku}
                onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                className={styles.modalInput}
              />
              <input
                type="text"
                placeholder="Name *"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className={styles.modalInput}
              />
              <textarea
                placeholder="Description"
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                rows={3}
                className={styles.modalTextarea}
              />
              <label className={styles.modalCheckbox}>
                <input
                  type="checkbox"
                  checked={addForm.is_active}
                  onChange={(e) =>
                    setAddForm({ ...addForm, is_active: e.target.checked })
                  }
                />
                <span>Active</span>
              </label>
            </div>
            <div className={styles.modalButtons}>
              <button
                onClick={() => setShowAddModal(false)}
                className={styles.modalButtonCancel}
              >
                Cancel
              </button>
              <button onClick={handleAdd} className={styles.modalButtonSubmit}>
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmations */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isDangerous={true}
      />

      <ConfirmDialog
        isOpen={deleteAllDialogOpen}
        title="Delete All Products"
        message="Are you sure you want to delete ALL products? This action cannot be undone and will remove all products from the database."
        confirmText="Delete All"
        onConfirm={handleDeleteAll}
        onCancel={() => setDeleteAllDialogOpen(false)}
        isDangerous={true}
      />
    </div>
  );
};
