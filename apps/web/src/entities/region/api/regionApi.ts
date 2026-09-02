import { request } from '@/shared/api';
import type { Region } from '../model/types';

export const regionApi = {
  list: () => request<Region[]>('/regions'),
};
