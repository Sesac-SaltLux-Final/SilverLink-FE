import apiClient from './index';
import { ElderlySummaryResponse, HealthInfoResponse, ApiResponse } from '@/types/api';

/**
 * 어르신 요약 정보 조회
 * GET /api/elderly/{elderlyUserId}/summary
 */
export const getSummary = async (elderlyUserId: number): Promise<ElderlySummaryResponse> => {
    const response = await apiClient.get<ElderlySummaryResponse>(
        `/api/elderly/${elderlyUserId}/summary`
    );
    return response.data;
};

/**
 * 어르신 건강 정보 조회 (민감정보)
 * GET /api/elderly/{elderlyUserId}/health
 */
export const getHealthInfo = async (elderlyUserId: number): Promise<HealthInfoResponse> => {
    const response = await apiClient.get<HealthInfoResponse>(
        `/api/elderly/${elderlyUserId}/health`
    );
    return response.data;
};

/**
 * 관리자용 어르신 전체 목록 조회
 * GET /api/admin/elderly
 */
export const getAllElderlyForAdmin = async (): Promise<ElderlySummaryResponse[]> => {
    const response = await apiClient.get<ElderlySummaryResponse[]>('/api/admin/elderly');
    return response.data;
};

/**
 * 관리자용 어르신 이름 검색
 * GET /api/admin/elderly/search?name={name}
 */
export const searchByName = async (name: string): Promise<ElderlySummaryResponse[]> => {
    const response = await apiClient.get<ElderlySummaryResponse[]>('/api/admin/elderly/search', {
        params: { name }
    });
    return response.data;
};

export const registerElderly = async (data: any): Promise<ElderlySummaryResponse> => {
    const response = await apiClient.post<ElderlySummaryResponse>('/api/admin/elderly', data);
    return response.data;
};

export default {
    getSummary,
    getHealthInfo,
    getAllElderlyForAdmin,
    searchByName,
    registerElderly,
};
