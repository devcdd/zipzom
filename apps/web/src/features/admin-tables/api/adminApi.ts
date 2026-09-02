import { request } from '@/shared/api';

export interface TableInfo {
  name: string;
  rows: number;
}

export interface TablePage {
  columns: { name: string; type: string }[];
  rows: Record<string, unknown>[];
  total: number;
}

export const adminApi = {
  tables: () => request<TableInfo[]>('/admin/tables'),
  rows: (table: string, limit: number, offset: number) => request<TablePage>(`/admin/tables/${table}?limit=${limit}&offset=${offset}`),
};
