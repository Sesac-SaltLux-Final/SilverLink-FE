// =====================
// 공통 타입 정의
// =====================

// API 공통 응답 형식
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

// 페이지네이션 응답
export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

// =====================
// 인증 관련 타입
// =====================
export interface SignupRequest {
    loginId: string;
    password: string;
    name: string;
    phone: string;
    email?: string;
    role: string;
}

export interface LoginRequest {
    loginId: string;
    password: string;
}

export interface TokenResponse {
    accessToken: string;
    ttl: number;
    role: string;
}

export interface RefreshResponse {
    accessToken: string;
    ttl: number;
}

// =====================
// 사용자 관련 타입
// =====================
export interface MyProfileResponse {
    id: number;
    email: string;
    name: string;
    phone: string;
    role: 'ADMIN' | 'COUNSELOR' | 'GUARDIAN' | 'ELDERLY';
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    createdAt: string;
}

export interface UpdateMyProfileRequest {
    name?: string;
    phone?: string;
    email?: string;
}

// =====================
// 관리자 관련 타입
// =====================
export interface AdminResponse {
    userId: number;
    email: string;
    name: string;
    level: 'NATIONAL' | 'PROVINCIAL' | 'CITY' | 'DISTRICT';
    admCode: number;
    admName: string;
    createdAt: string;
}

export interface AdminCreateRequest {
    email: string;
    password: string;
    name: string;
    phone: string;
    level: 'NATIONAL' | 'PROVINCIAL' | 'CITY' | 'DISTRICT';
    admCode: number;
}

export interface AdminUpdateRequest {
    name?: string;
    phone?: string;
    level?: 'NATIONAL' | 'PROVINCIAL' | 'CITY' | 'DISTRICT';
    admCode?: number;
}

// =====================
// 상담사 관련 타입
// =====================
export interface CounselorResponse {
    id: number;
    userId: number;
    email: string;
    name: string;
    phone: string;
    status: string;
    assignedElderlyCount: number;
    createdAt: string;
    // 근무 정보
    department?: string;
    employeeNo?: string;
    officePhone?: string;
    // 행정구역 정보
    admCode?: number;
    sidoName?: string;
    sigunguName?: string;
    dongName?: string;
    fullAddress?: string;
}

export interface CounselorRequest {
    loginId: string;
    password: string;
    name: string;
    email?: string;
    phone: string;
    employeeNo?: string;
    department?: string;
    officePhone?: string;
    joinedAt?: string; // YYYY-MM-DD
    admCode: number;
}

// =====================
// 어르신 관련 타입
// =====================
export interface ElderlySummaryResponse {
    userId: number;        // Elderly 엔티티의 ID (= User ID)
    name: string;
    phone: string;
    admCode?: number;
    sidoName?: string;
    sigunguName?: string;
    dongName?: string;
    fullAddress?: string;
    birthDate?: string;
    age: number;
    gender: string;
    addressLine1?: string;
    addressLine2?: string;
    zipcode?: string;
    // 추가 정보 (조인 시)
    counselorName?: string;
    guardianName?: string;
}

export interface HealthInfoResponse {
    elderlyId: number;
    bloodPressure?: string;
    bloodSugar?: string;
    medications: string[];
    diseases: string[];
    notes?: string;
}

// =====================
// 보호자 관련 타입
// =====================
export interface GuardianResponse {
    id: number;
    userId: number;
    email: string;
    name: string;
    phone: string;
    createdAt: string;
    elderlyCount: number;
    elderlyName?: string;
}

export interface GuardianRequest {
    email: string;
    password: string;
    name: string;
    phone: string;
}

export interface GuardianElderlyResponse {
    id: number;
    guardianId: number;
    guardianName: string;
    guardianPhone: string;
    elderlyId: number;
    elderlyName: string;
    elderlyPhone: string;
    relationType: string;
    connectedAt: string;
}

// =====================
// 공지사항 관련 타입
// =====================
export interface NoticeResponse {
    id: number;
    title: string;
    content: string;
    category: string;
    categoryDescription?: string;
    targetMode?: string;
    targetRoles: string[];
    isPriority: boolean;  // isImportant에서 isPriority로 변경
    isPopup: boolean;
    popupStartAt?: string;
    popupEndAt?: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'DELETED';
    viewCount: number;
    createdAt: string;
    updatedAt?: string;
    isRead: boolean;
    readCount?: number;
    totalTargetCount?: number;
    attachments?: Array<{
        fileName: string;
        originalFileName: string;
        filePath: string;
        fileSize: number;
    }>;
}

// 읽음 현황 관련 타입
export interface NoticeReadStatus {
    userId: number;
    userName: string;
    readAt: string;
}

// =====================
// FAQ 관련 타입
// =====================
export interface FaqResponse {
    id: number;
    category: string;
    question: string;
    answerText: string;
    displayOrder: number;
}

// =====================
// 문의 관련 타입
// =====================
export interface InquiryResponse {
    id: number;
    title: string;
    questionText: string;
    status: 'PENDING' | 'ANSWERED';
    answerText?: string;
    answeredAt?: string;
    createdAt: string;
    elderlyName: string;
}

// =====================
// 시스템/주소 관련 타입
// =====================
export interface AddressResponse {
    admCode: number;
    sidoCode?: string;
    sigunguCode?: string;
    sidoName: string;
    sigunguName?: string;
    dongName?: string;
    fullAddress: string;
    level: 'SIDO' | 'SIGUNGU' | 'DONG';
}

// =====================
// 감사 로그 타입
// =====================
export interface AuditLogResponse {
    id: number;
    action: string;
    targetEntity: string;
    targetId: number;
    actorId: number | null;
    actorName: string;
    clientIp: string;
    timestamp: string;
}

export interface InquiryRequest {
    title?: string;
    questionText?: string;
    answerText?: string;
}

// =====================
// 배정 관련 타입
// =====================
export interface AssignmentResponse {
    id: number;
    counselorId: number;
    counselorName: string;
    elderlyId: number;
    elderlyName: string;
    assignedAt: string;
}

export interface AssignmentRequest {
    counselorId: number;
    elderlyId: number;
}

// =====================
// 복지 서비스 관련 타입
// =====================
export interface WelfareListResponse {
    id: number;
    servNm: string;        // 서비스명
    source: string;        // 출처 (CENTRAL/LOCAL)
    jurMnofNm: string;     // 소관기관
    category: string;      // 카테고리
    servDgst: string;      // 요약
    rprsCtadr?: string;    // 문의처 (목록 조회 시 추가)
}

export interface WelfareDetailResponse {
    id: number;
    servNm: string;
    source: string;
    jurMnofNm: string;
    category: string;
    servDgst: string;
    targetDtlCn: string;       // 지원대상 상세
    slctCritCn: string;        // 선정기준
    alwServCn: string;         // 서비스 내용
    rprsCtadr: string;         // 문의처
    servDtlLink: string;       // 상세 링크
}

export interface WelfareSearchRequest {
    keyword?: string;
    category?: string;
    region?: string;
}

// =====================
// 통화 리뷰 관련 타입
// =====================

// 오늘의 상태 (식사, 건강, 수면) 타입
export interface MealInfo {
    taken: boolean | null;
    status: string; // "식사함", "식사 안함", "미확인"
}

export interface HealthInfo {
    level: string | null;      // "GOOD", "NORMAL", "BAD", or null
    levelKorean: string;       // "좋음", "보통", "나쁨", "미확인"
    detail: string | null;
}

export interface SleepInfo {
    level: string | null;      // "GOOD", "NORMAL", "BAD", or null
    levelKorean: string;       // "좋음", "보통", "나쁨", "미확인"
    detail: string | null;
}

export interface DailyStatusInfo {
    meal: MealInfo;
    health: HealthInfo;
    sleep: SleepInfo;
}

export interface CallRecordSummaryResponse {
    callId: number;
    elderlyId: number;
    elderlyName: string;
    callAt: string;
    duration: string; // Changed from number to string ("분:초")
    state: string;
    stateKorean: string;
    emotionLevel: 'GOOD' | 'NORMAL' | 'BAD' | null;
    emotionLevelKorean: string | null;
    hasDangerResponse: boolean;
    reviewed: boolean;
    summaryPreview?: string;
}

export interface CallRecordDetailResponse extends CallRecordSummaryResponse {
    elderly: {
        id: number;
        name: string;
        phone: string;
        age: number;
        gender: string;
    };
    recordingUrl?: string;
    callTimeSec?: number;
    prompts: Array<{
        promptId: number;
        content: string;
        createdAt: string;
    }>;
    responses: Array<{
        responseId: number;
        content: string;
        respondedAt: string;
        danger: boolean;
        dangerReason?: string;
    }>;
    summaries: Array<{
        summaryId: number;
        content: string;
        createdAt: string;
    }>;
    emotions: Array<{
        emotionId: number;
        emotionLevel: string;
        emotionLevelKorean: string;
        createdAt: string;
    }>;
    review?: {
        reviewId: number;
        counselorId: number;
        counselorName: string;
        reviewedAt: string;
        comment: string;
        urgent: boolean;
    };
    dailyStatus?: DailyStatusInfo;
}

export interface ReviewResponse {
    reviewId: number;
    callId: number;
    counselorId: number;
    counselorName: string;
    comment: string;
    createdAt: string;
    updatedAt?: string;
}

export interface ReviewRequest {
    callId: number;
    comment: string;
    urgent?: boolean;
}

export interface GuardianCallReviewResponse {
    callId: number;
    elderlyName: string;
    callAt: string;
    duration: string;  // "분:초" 형식
    state: string;
    stateKorean: string;
    summary: string;
    emotionLevel: string | null;
    emotionLevelKorean: string | null;
    hasDangerResponse: boolean;
    counselorName: string | null;
    counselorComment: string | null;
    urgent: boolean;
    reviewedAt: string | null;
    prompts: Array<{
        promptId: number;
        content: string;
        createdAt: string;
    }>;
    responses: Array<{
        responseId: number;
        content: string;
        respondedAt: string;
        danger: boolean;
        dangerReason?: string;
    }>;
    dailyStatus?: DailyStatusInfo;
    recordingUrl?: string;
    isAccessGranted?: boolean;
}

export interface UnreviewedCountResponse {
    unreviewedCount: number;
    totalCount: number;
}

// =====================
// 오프라인 회원가입 요청 타입
// =====================
export interface RegisterElderlyRequest {
    loginId: string;
    password?: string;
    name: string;
    phone: string;
    email?: string;
    admCode: number;
    birthDate: string;
    gender: 'M' | 'F';
    addressLine1: string;
    addressLine2?: string;
    zipcode?: string;
    memo?: string;
    // 통화 스케줄 (선택)
    preferredCallTime?: string;
    preferredCallDays?: string[];
    callScheduleEnabled?: boolean;
}

export interface RegisterGuardianRequest {
    loginId: string;
    password?: string;
    name: string;
    phone: string;
    email?: string;
    addressLine1: string;
    addressLine2?: string;
    zipcode?: string;
    elderlyUserId: number;
    relationType: string;
    memo?: string;
}

// =====================
// 사회복지시설(Map) 관련 타입
// =====================
export interface WelfareFacilityResponse {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    type: 'ELDERLY_WELFARE_CENTER' | 'DISABLED_WELFARE_CENTER' | 'CHILD_WELFARE_CENTER' | 'COMMUNITY_WELFARE_CENTER' | 'SENIOR_CENTER' | 'DAYCARE_CENTER' | 'HOME_CARE_SERVICE';
    phone?: string;
    operatingHours?: string;
    description?: string;
    typeDescription?: string;
}

export interface WelfareFacilityRequest {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    type: 'ELDERLY_WELFARE_CENTER' | 'DISABLED_WELFARE_CENTER' | 'CHILD_WELFARE_CENTER' | 'COMMUNITY_WELFARE_CENTER' | 'SENIOR_CENTER' | 'DAYCARE_CENTER' | 'HOME_CARE_SERVICE';
    phone?: string;
    operatingHours?: string;
    description?: string;
}

// =====================
// 상담 기록 관련 타입
// =====================
export interface CounselingRecordResponse {
    id: number;
    seniorId: number;
    seniorName: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm:ss
    type: 'PHONE' | 'VISIT' | 'VIDEO';
    category: string;
    summary: string;
    content: string;
    result: string;
    followUp: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED';
}

export interface CounselingRecordRequest {
    seniorId: number;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm:ss
    type: 'PHONE' | 'VISIT' | 'VIDEO';
    category: string;
    summary: string;
    content: string;
    result: string;
    followUp: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED';
}


