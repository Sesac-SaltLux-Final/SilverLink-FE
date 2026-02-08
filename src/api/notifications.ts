import apiClient from './index';
import { PageResponse, ApiResponse } from '@/types/api';

// =====================
// 일반 알림 관련 타입 정의
// =====================

// 알림 유형
export type NotificationType =
    | 'INQUIRY_ANSWERED'      // 문의 답변
    | 'COMPLAINT_ANSWERED'    // 민원 답변
    | 'ACCESS_REQUEST'        // 접근권한 요청
    | 'ACCESS_APPROVED'       // 접근권한 승인
    | 'ACCESS_REJECTED'       // 접근권한 거부
    | 'ASSIGNMENT'            // 담당자 배정
    | 'NOTICE'                // 공지사항
    | 'COUNSELOR_COMMENT'     // 상담사 코멘트
    | 'EMERGENCY_NEW'         // 긴급 알림 (새로 추가)
    | 'SYSTEM';               // 시스템 알림

// 알림 요약 응답 (목록용)
export interface NotificationSummary {
    notificationId: number;
    notificationType: NotificationType;
    notificationTypeText: string;
    title: string;
    content: string;
    referenceId?: number;     // 중복 체크용
    linkUrl?: string;
    isRead: boolean;
    createdAt: string;
    timeAgo: string;
}

// 알림 상세 응답
export interface NotificationDetail {
    notificationId: number;
    notificationType: NotificationType;
    notificationTypeText: string;
    title: string;
    content: string;
    referenceType?: string;
    referenceId?: number;
    linkUrl?: string;
    isRead: boolean;
    readAt?: string;
    smsSent?: boolean;
    smsSentAt?: string;
    createdAt: string;
    timeAgo: string;
}

// 알림 통계 응답
export interface NotificationStats {
    totalCount: number;
    unreadCount: number;
    todayCount: number;
    countByType: {
        type: NotificationType;
        typeText: string;
        count: number;
    }[];
}

// 미확인 알림 수 응답
export interface UnreadCountResponse {
    totalUnread: number;
    emergencyUnread: number;
    notificationUnread: number;
}

// =====================
// API 함수
// =====================

/**
 * 알림 목록 조회
 * GET /api/notifications
 */
export const getNotifications = async (
    params?: { page?: number; size?: number }
): Promise<PageResponse<NotificationSummary>> => {
    const response = await apiClient.get<ApiResponse<PageResponse<NotificationSummary>>>(
        '/api/notifications',
        { params }
    );
    return response.data.data;
};

/**
 * 미확인 알림 목록
 * GET /api/notifications/unread
 */
export const getUnreadNotifications = async (): Promise<NotificationSummary[]> => {
    const response = await apiClient.get<ApiResponse<NotificationSummary[]>>('/api/notifications/unread');
    return response.data.data || [];
};

/**
 * 미확인 알림 수
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (): Promise<number> => {
    const response = await apiClient.get<ApiResponse<number>>('/api/notifications/unread-count');
    return response.data.data || 0;
};

/**
 * 최근 알림 조회 (팝업용)
 * GET /api/notifications/recent
 */
export const getRecentNotifications = async (limit: number = 5): Promise<NotificationSummary[]> => {
    const response = await apiClient.get<ApiResponse<NotificationSummary[]>>('/api/notifications/recent', {
        params: { limit }
    });
    return response.data.data || [];
};

/**
 * 알림 상세 조회 (자동 읽음 처리)
 * GET /api/notifications/{notificationId}
 */
export const getNotificationDetail = async (notificationId: number): Promise<NotificationDetail> => {
    const response = await apiClient.get<ApiResponse<NotificationDetail>>(`/api/notifications/${notificationId}`);
    return response.data.data;
};

/**
 * 알림 읽음 처리
 * POST /api/notifications/{notificationId}/read
 */
export const markAsRead = async (notificationId: number): Promise<void> => {
    await apiClient.post(`/api/notifications/${notificationId}/read`);
};

/**
 * 전체 읽음 처리
 * POST /api/notifications/read-all
 */
export const markAllAsRead = async (): Promise<void> => {
    await apiClient.post('/api/notifications/read-all');
};

/**
 * 알림 통계
 * GET /api/notifications/stats
 */
export const getStats = async (): Promise<NotificationStats> => {
    const response = await apiClient.get<ApiResponse<NotificationStats>>('/api/notifications/stats');
    return response.data.data;
};

export default {
    getNotifications,
    getUnreadNotifications,
    getUnreadCount,
    getRecentNotifications,
    getNotificationDetail,
    markAsRead,
    markAllAsRead,
    getStats,
};
