import { useState, useEffect, useCallback } from 'react';
import { productAPI } from '../api/endpoints';
import type { Product } from '@/types';
import toast from 'react-hot-toast';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState<{
    sku?: string;
    name?: string;
    is_active?: boolean;
  }>({});

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productAPI.getAll({
        page,
        page_size: pageSize,
        ...filters,
      });
      setProducts(data.products);
      setTotal(data.total);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const deleteProduct = async (id: number) => {
    try {
      await productAPI.delete(id);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete product');
    }
  };

  const deleteAllProducts = async () => {
    try {
      await productAPI.deleteAll();
      toast.success('All products deleted successfully');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete all products');
    }
  };

  return {
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
  };
};
