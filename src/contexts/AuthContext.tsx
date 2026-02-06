import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import apiClient, { setAccessToken } from '@/api/index';
import { logout as apiLogout, refresh } from '@/api/auth';
import { getMyProfile } from '@/api/users';


type UserRole = 'ADMIN' | 'COUNSELOR' | 'GUARDIAN' | 'ELDERLY';

interface User {
    id: number;
    role: UserRole;
    name: string;
    loginId?: string;
}

interface AuthContextType {
    isLoggedIn: boolean;
    user: User | null;
    role: UserRole | null;
    login: (accessToken: string, user: User) => void;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 자동 토큰 갱신 함수
    const autoRefreshToken = useCallback(async () => {
        try {
            console.log('[AutoRefresh] 토큰 자동 갱신 시도...');
            // @ts-ignore
            const response = await apiClient.post('/api/auth/refresh', null, { _skipGlobalErrorHandler: true });
            const { accessToken } = response.data;
            setAccessToken(accessToken);
            console.log('[AutoRefresh] 토큰 갱신 성공');
        } catch (error) {
            console.error('[AutoRefresh] 토큰 갱신 실패:', error);
            // 갱신 실패 시 로그아웃 처리
            setAccessToken(null);
            setUser(null);
            setIsLoggedIn(false);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }
        }
    }, []);

    // 자동 갱신 타이머 시작
    const startAutoRefresh = useCallback(() => {
        // 기존 타이머가 있으면 제거
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
        }

        // 10분마다 토큰 갱신 (Access Token TTL이 15분이므로 10분마다 갱신)
        const REFRESH_INTERVAL = 10 * 60 * 1000; // 10분
        refreshIntervalRef.current = setInterval(autoRefreshToken, REFRESH_INTERVAL);
        console.log('[AutoRefresh] 자동 갱신 타이머 시작 (10분 주기)');
    }, [autoRefreshToken]);

    // 자동 갱신 타이머 중지
    const stopAutoRefresh = useCallback(() => {
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
            console.log('[AutoRefresh] 자동 갱신 타이머 중지');
        }
    }, []);

    // 초기화: 쿠키 또는 localStorage를 통한 세션 복원
    useEffect(() => {
        const initSession = async () => {
            try {
                // 1. Refresh Token으로 Access Token 재발급 시도 (쿠키 사용)
                // 주의: 실패 시 리다이렉트 루프를 방지하기 위해 글로벌 에러 핸들러 스킵
                // @ts-ignore
                const response = await apiClient.post('/api/auth/refresh', null, { _skipGlobalErrorHandler: true });
                const { accessToken } = response.data;
                setAccessToken(accessToken);

                // 2. 사용자 프로필 정보 가져오기
                // @ts-ignore
                const profileResponse = await apiClient.get('/api/users/me', { _skipGlobalErrorHandler: true });
                const userProfile = profileResponse.data;

                // 3. 상태 업데이트
                setUser(userProfile);
                setIsLoggedIn(true);
                
                // 4. 자동 갱신 시작
                startAutoRefresh();
            } catch (error) {
                // 쿠키 인증 실패 시 localStorage 확인 (백업)
                const storedToken = localStorage.getItem('accessToken');

                if (storedToken) {
                    try {
                        // 저장된 토큰이 유효한지 검증 (프로필 조회 시도)
                        setAccessToken(storedToken);

                        // 검증 시에는 글로벌 인터셉터(자동 리다이렉트)를 끄고 진행
                        // @ts-ignore
                        const response = await apiClient.get('/api/users/me', { _skipGlobalErrorHandler: true });
                        const userProfile = response.data;

                        setUser(userProfile);
                        setIsLoggedIn(true);
                        
                        // 자동 갱신 시작
                        startAutoRefresh();
                    } catch (e) {
                        // 토큰이 만료되었거나 유효하지 않음 -> 초기화
                        console.warn("Stored session is invalid:", e);
                        setAccessToken(null);
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('user');
                        setUser(null);
                        setIsLoggedIn(false);
                    }
                } else {
                    setUser(null);
                    setIsLoggedIn(false);
                }
            } finally {
                setIsLoading(false);
            }
        };

        initSession();
        
        // 컴포넌트 언마운트 시 타이머 정리
        return () => {
            stopAutoRefresh();
        };
    }, [startAutoRefresh, stopAutoRefresh]);

    // 로그인 처리
    const login = useCallback((accessToken: string, userData: User) => {
        setAccessToken(accessToken); // API Client 헤더 설정

        // Session Persistence (localStorage)
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('user', JSON.stringify(userData));

        setUser(userData);
        setIsLoggedIn(true);
        
        // 자동 갱신 시작
        startAutoRefresh();
    }, [startAutoRefresh]);

    // 로그아웃 처리
    const logout = useCallback(async () => {
        try {
            await apiLogout();
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // 자동 갱신 중지
            stopAutoRefresh();
            
            setAccessToken(null); // 메모리 토큰 삭제
            setUser(null);
            setIsLoggedIn(false);

            // localStorage 정리
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
        }
    }, [stopAutoRefresh]);

    const value: AuthContextType = {
        isLoggedIn,
        user,
        role: user?.role ?? null,
        login,
        logout,
        isLoading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * 인증 상태를 사용하는 훅
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

/**
 * 역할별 홈 페이지 경로 반환
 */
export const getRoleHomePath = (role: UserRole | null): string => {
    switch (role) {
        case 'ADMIN':
            return '/admin';
        case 'COUNSELOR':
            return '/counselor';
        case 'GUARDIAN':
            return '/guardian';
        case 'ELDERLY':
            return '/senior';
        default:
            return '/';
    }
};

export default AuthContext;
