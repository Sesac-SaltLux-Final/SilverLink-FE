import apiClient from './index';
import {
    CallRecordSummaryResponse,
    CallRecordDetailResponse,
    ReviewResponse,
    ReviewRequest,
    UnreviewedCountResponse,
    GuardianCallReviewResponse,
    PageResponse,
    ApiResponse,
} from '@/types/api';

interface PageParams {
    page?: number;
    size?: number;
}

// ===== 상담사용 API =====

/**
 * 담당 어르신 통화 목록 조회 (상담사)
 * GET /api/call-reviews/counselor/calls
 */
export const getCallRecordsForCounselor = async (
    params?: PageParams
): Promise<PageResponse<CallRecordSummaryResponse>> => {
    const response = await apiClient.get<ApiResponse<PageResponse<CallRecordSummaryResponse>>>(
        '/api/call-reviews/counselor/calls',
        { params }
    );
    return response.data.data;
};

/**
 * 통화 상세 조회 (상담사)
 * GET /api/call-reviews/counselor/calls/{callId}
 */
export const getCallRecordDetail = async (callId: number): Promise<CallRecordDetailResponse> => {
    const response = await apiClient.get<ApiResponse<CallRecordDetailResponse>>(
        `/api/call-reviews/counselor/calls/${callId}`
    );
    return response.data.data;
};

/**
 * 통화 리뷰 작성 (상담사)
 * POST /api/call-reviews/counselor/reviews
 */
export const createReview = async (data: ReviewRequest): Promise<ReviewResponse> => {
    const response = await apiClient.post<ApiResponse<ReviewResponse>>(
        '/api/call-reviews/counselor/reviews',
        data
    );
    return response.data.data;
};

/**
 * 통화 리뷰 수정 (상담사)
 * PUT /api/call-reviews/counselor/reviews/{reviewId}
 */
export const updateReview = async (
    reviewId: number,
    data: ReviewRequest
): Promise<ReviewResponse> => {
    const response = await apiClient.put<ApiResponse<ReviewResponse>>(
        `/api/call-reviews/counselor/reviews/${reviewId}`,
        data
    );
    return response.data.data;
};

/**
 * 미확인 통화 건수 조회 (상담사)
 * GET /api/call-reviews/counselor/unreview-count
 */
export const getUnreviewedCount = async (): Promise<UnreviewedCountResponse> => {
    const response = await apiClient.get<ApiResponse<UnreviewedCountResponse>>(
        '/api/call-reviews/counselor/unreview-count'
    );
    return response.data.data;
};

/**
 * 오늘의 통화 건수 조회 (상담사)
 * GET /api/call-reviews/counselor/today-count
 */
export const getTodayCallCount = async (): Promise<number> => {
    const response = await apiClient.get<ApiResponse<number>>(
        '/api/call-reviews/counselor/today-count'
    );
    return response.data.data;
};

// ===== 보호자용 API =====

/**
 * 어르신 통화 리뷰 목록 조회 (보호자)
 * GET /api/call-reviews/guardian/elderly/{elderlyId}
 */
export const getCallReviewsForGuardian = async (
    elderlyId: number,
    params?: PageParams
): Promise<PageResponse<GuardianCallReviewResponse>> => {
    const response = await apiClient.get<ApiResponse<PageResponse<GuardianCallReviewResponse>>>(
        `/api/call-reviews/guardian/elderly/${elderlyId}`,
        { params }
    );
    return response.data.data;
};

/**
 * 통화 상세 조회 (보호자)
 * GET /api/call-reviews/guardian/calls/{callId}
 */
export const getCallDetailForGuardian = async (
    callId: number
): Promise<GuardianCallReviewResponse> => {
    const response = await apiClient.get<ApiResponse<GuardianCallReviewResponse>>(
        `/api/call-reviews/guardian/calls/${callId}`
    );
    return response.data.data;
};

export default {
    // 상담사용
    getCallRecordsForCounselor,
    getCallRecordDetail,
    createReview,
    updateReview,
    getUnreviewedCount,
    getTodayCallCount,
    // 보호자용
    getCallReviewsForGuardian,
    getCallDetailForGuardian,
};
