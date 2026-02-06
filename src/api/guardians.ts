import apiClient from './index';
import { GuardianResponse, GuardianRequest, GuardianElderlyResponse } from '@/types/api';

/**
 * 보호자 회원가입
 * POST /api/guardians/signup
 */
export const signup = async (data: GuardianRequest): Promise<GuardianResponse> => {
    const response = await apiClient.post<GuardianResponse>('/api/guardians/signup', data);
    return response.data;
};

export const registerGuardian = signup;

/**
 * 내 정보 조회 (보호자)
 * GET /api/guardians/me
 */
export const getMyInfo = async (): Promise<GuardianResponse> => {
    const response = await apiClient.get<GuardianResponse>('/api/guardians/me');
    return response.data;
};

/**
 * 내 어르신 목록 조회 (보호자)
 * GET /api/guardians/me/elderly
 */
export const getMyElderly = async (): Promise<GuardianElderlyResponse> => {
    const response = await apiClient.get<GuardianElderlyResponse>('/api/guardians/me/elderly');
    return response.data;
};

/**
 * 보호자 정보 조회 (관리자용)
 * GET /api/guardians/admin/{id}
 */
export const getGuardianByAdmin = async (id: number): Promise<GuardianResponse> => {
    const response = await apiClient.get<GuardianResponse>(`/api/guardians/admin/${id}`);
    return response.data;
};

/**
 * 보호자 정보 조회 (상담사용)
 * GET /api/guardians/counselor/{id}
 */
export const getGuardianByCounselor = async (id: number): Promise<GuardianResponse> => {
    const response = await apiClient.get<GuardianResponse>(`/api/guardians/counselor/${id}`);
    return response.data;
};

/**
 * 모든 보호자 목록 조회 (관리자용)
 * GET /api/guardians
 */
export const getAllGuardians = async (): Promise<GuardianResponse[]> => {
    const response = await apiClient.get<GuardianResponse[]>('/api/guardians');
    return response.data;
};

/**
 * 보호자-어르신 연결 (관리자용)
 * POST /api/guardians/{id}/connect
 */
export const connectElderly = async (
    guardianId: number,
    elderlyId: number,
    relationType: string
): Promise<void> => {
    await apiClient.post(`/api/guardians/${guardianId}/connect`, null, {
        params: { elderlyId, relationType },
    });
};

/**
 * 보호자별 어르신 목록 조회 (관리자용)
 * GET /api/guardians/admin/{id}/elderly
 */
export const getElderlyByGuardianForAdmin = async (guardianId: number): Promise<GuardianElderlyResponse> => {
    const response = await apiClient.get<GuardianElderlyResponse>(`/api/guardians/admin/${guardianId}/elderly`);
    return response.data;
};

/**
 * 어르신별 보호자 조회 (관리자용)
 * GET /api/guardians/admin/elderly/{elderlyId}
 */
export const getGuardianByElderlyForAdmin = async (elderlyId: number): Promise<GuardianResponse> => {
    const response = await apiClient.get<GuardianResponse>(`/api/guardians/admin/elderly/${elderlyId}`);
    return response.data;
};

export default {
    signup,
    getMyInfo,
    getMyElderly,
    getGuardianByAdmin,
    getGuardianByCounselor,
    getAllGuardians,
    connectElderly,
    getElderlyByGuardianForAdmin,
    getGuardianByElderlyForAdmin,
    registerGuardian,
};
