import apiClient from './index';
import { PageResponse, ApiResponse } from '@/types/api';

// =====================
// 긴급 알림 관련 타입 정의
// =====================

// 알림 상태
export type AlertStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';

// 심각도
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// 알림 유형
export type AlertType = 'HEALTH_RISK' | 'MENTAL_RISK' | 'NO_RESPONSE' | 'SYSTEM';

// 긴급 알림 요약 응답 (목록용)
export interface EmergencyAlertSummary {
    alertId: number;
    severity: Severity;
    severityText: string;
    alertType: AlertType;
    alertTypeText: string;
    status: AlertStatus;
    statusText: string;
    title: string;
    description: string;
    elderlyName: string;
    elderlyAge: number;
    guardianName?: string;
    guardianPhone?: string;
    createdAt: string;
    timeAgo: string;
}

// 수신자별 알림 응답 (백엔드 원본 구조)
interface RecipientAlertRawResponse {
    alertId: number;
    alert: EmergencyAlertSummary;
    isRead: boolean;
    readAt: string | null;
}

// 수신자별 알림 응답 (프론트엔드에서 사용하는 플랫 구조)
export interface RecipientAlertResponse {
    alertId: number;
    severity: Severity;
    severityText: string;
    alertType: AlertType;
    alertTypeText: string;
    title: string;
    elderlyName: string;
    elderlyAge: number;
    isRead: boolean;
    createdAt: string;
    timeAgo: string;
}

// 긴급 알림 상세 응답
export interface EmergencyAlertDetail {
    alertId: number;
    severity: Severity;
    severityText: string;
    alertType: AlertType;
    alertTypeText: string;
    status: AlertStatus;
    statusText: string;
    title: string;
    description: string;
    dangerKeywords?: string[];
    relatedSttContent?: string;
    elderly: {
        id: number;
        name: string;
        age: number;
        gender: string;
        phone: string;
        address: string;
    };
    guardian?: {
        id: number;
        name: string;
        phone: string;
        relation: string;
    };
    counselor?: {
        id: number;
        name: string;
        phone: string;
        department: string;
    };
    call?: {
        callId: number;
        callAt: string;
        duration: string;
        state: string;
        emotionLevel: string;
        recordingUrl?: string;
    };
    process?: {
        processedByName: string;
        processedAt: string;
        resolutionNote?: string;
    };
    createdAt: string;
}

// 긴급 알림 통계 응답
export interface EmergencyAlertStats {
    totalCount: number;
    pendingCount: number;
    inProgressCount: number;
    resolvedCount: number;
    escalatedCount: number;
    criticalCount: number;
    highCount: number;
}

// 알림 처리 요청
export interface ProcessRequest {
    status: AlertStatus;
    resolutionNote?: string;
}

// =====================
// API 함수
// =====================

/**
 * 긴급 알림 상세 조회
 * GET /api/emergency-alerts/{alertId}
 */
export const getAlertDetail = async (alertId: number): Promise<EmergencyAlertDetail> => {
    const response = await apiClient.get<ApiResponse<EmergencyAlertDetail>>(`/api/emergency-alerts/${alertId}`);
    return response.data.data;
};

/**
 * 미확인 알림 목록
 * GET /api/emergency-alerts/unread
 */
export const getUnreadAlerts = async (): Promise<RecipientAlertResponse[]> => {
    const response = await apiClient.get<ApiResponse<RecipientAlertRawResponse[]>>('/api/emergency-alerts/unread');
    const rawData = response.data.data || [];

    // 백엔드 중첩 구조를 프론트엔드 플랫 구조로 변환
    return rawData.map((item) => ({
        alertId: item.alertId,
        severity: item.alert?.severity ?? 'CRITICAL' as Severity,
        severityText: item.alert?.severityText ?? '긴급',
        alertType: item.alert?.alertType ?? 'HEALTH_RISK' as AlertType,
        alertTypeText: item.alert?.alertTypeText ?? '긴급위험',
        title: item.alert?.title ?? '긴급 알림',
        elderlyName: item.alert?.elderlyName ?? '알 수 없음',
        elderlyAge: item.alert?.elderlyAge ?? 0,
        isRead: item.isRead,
        createdAt: item.alert?.createdAt ?? '',
        timeAgo: item.alert?.timeAgo ?? '',
    }));
};

/**
 * 미확인 알림 수
 * GET /api/emergency-alerts/unread-count
 */
export const getUnreadCount = async (): Promise<number> => {
    const response = await apiClient.get<ApiResponse<number>>('/api/emergency-alerts/unread-count');
    return response.data.data || 0;
};

/**
 * 알림 읽음 처리
 * POST /api/emergency-alerts/{alertId}/read
 */
export const markAsRead = async (alertId: number): Promise<void> => {
    await apiClient.post(`/api/emergency-alerts/${alertId}/read`);
};

/**
 * 전체 읽음 처리
 * POST /api/emergency-alerts/read-all
 */
export const markAllAsRead = async (): Promise<void> => {
    await apiClient.post('/api/emergency-alerts/read-all');
};

// =====================
// 상담사용 API
// =====================

/**
 * 상담사용 알림 목록
 * GET /api/emergency-alerts/counselor
 */
export const getAlertsForCounselor = async (
    params?: { page?: number; size?: number }
): Promise<PageResponse<EmergencyAlertSummary>> => {
    const response = await apiClient.get<ApiResponse<PageResponse<EmergencyAlertSummary>>>(
        '/api/emergency-alerts/counselor',
        { params }
    );
    return response.data.data;
};

/**
 * 상담사용 미처리 알림
 * GET /api/emergency-alerts/counselor/pending
 */
export const getPendingAlertsForCounselor = async (): Promise<EmergencyAlertSummary[]> => {
    const response = await apiClient.get<ApiResponse<EmergencyAlertSummary[]>>('/api/emergency-alerts/counselor/pending');
    return response.data.data || [];
};

/**
 * 상담사용 통계
 * GET /api/emergency-alerts/counselor/stats
 */
export const getStatsForCounselor = async (): Promise<EmergencyAlertStats> => {
    const response = await apiClient.get<ApiResponse<EmergencyAlertStats>>('/api/emergency-alerts/counselor/stats');
    return response.data.data;
};

// =====================
// 관리자용 API
// =====================

/**
 * 관리자용 알림 목록
 * GET /api/emergency-alerts/admin
 */
export const getAlertsForAdmin = async (
    params?: { page?: number; size?: number }
): Promise<PageResponse<EmergencyAlertSummary>> => {
    const response = await apiClient.get<ApiResponse<PageResponse<EmergencyAlertSummary>>>(
        '/api/emergency-alerts/admin',
        { params }
    );
    return response.data.data;
};

/**
 * 관리자용 통계
 * GET /api/emergency-alerts/admin/stats
 */
export const getStatsForAdmin = async (): Promise<EmergencyAlertStats> => {
    const response = await apiClient.get<ApiResponse<EmergencyAlertStats>>('/api/emergency-alerts/admin/stats');
    return response.data.data;
};

// =====================
// 보호자용 API
// =====================

/**
 * 보호자용 알림 목록
 * GET /api/emergency-alerts/guardian
 */
export const getAlertsForGuardian = async (
    params?: { page?: number; size?: number }
): Promise<PageResponse<EmergencyAlertSummary>> => {
    const response = await apiClient.get<ApiResponse<PageResponse<EmergencyAlertSummary>>>(
        '/api/emergency-alerts/guardian',
        { params }
    );
    return response.data.data;
};

// =====================
// 알림 처리 API
// =====================

/**
 * 알림 처리 (처리 완료, 상위 보고 등)
 * POST /api/emergency-alerts/{alertId}/process
 */
export const processAlert = async (
    alertId: number,
    request: ProcessRequest
): Promise<EmergencyAlertDetail> => {
    const response = await apiClient.post<ApiResponse<EmergencyAlertDetail>>(
        `/api/emergency-alerts/${alertId}/process`,
        request
    );
    return response.data.data;
};

/**
 * 처리 시작
 * POST /api/emergency-alerts/{alertId}/start
 */
export const startProcessing = async (alertId: number): Promise<EmergencyAlertDetail> => {
    const response = await apiClient.post<ApiResponse<EmergencyAlertDetail>>(
        `/api/emergency-alerts/${alertId}/start`
    );
    return response.data.data;
};

export default {
    getAlertDetail,
    getUnreadAlerts,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    getAlertsForCounselor,
    getPendingAlertsForCounselor,
    getStatsForCounselor,
    getAlertsForAdmin,
    getStatsForAdmin,
    getAlertsForGuardian,
    processAlert,
    startProcessing,
};
