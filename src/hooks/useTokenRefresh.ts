import { useEffect, useRef } from 'react';
import { refresh } from '@/api/auth';
import { setAccessToken } from '@/api/index';

/**
 * 자동 토큰 갱신 훅
 * Access Token이 만료되기 전에 자동으로 갱신합니다.
 * 
 * @param enabled - 자동 갱신 활성화 여부
 * @param refreshIntervalMinutes - 갱신 주기 (분 단위, 기본값: 10분)
 */
export const useTokenRefresh = (enabled: boolean = true, refreshIntervalMinutes: number = 10) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const refreshToken = async () => {
      try {
        console.log('[TokenRefresh] 자동 토큰 갱신 시도...');
        const response = await refresh();
        setAccessToken(response.accessToken);
        console.log('[TokenRefresh] 토큰 갱신 성공');
      } catch (error) {
        console.error('[TokenRefresh] 토큰 갱신 실패:', error);
        // 갱신 실패 시 인터셉터에서 처리하므로 여기서는 로그만 남김
      }
    };

    // 초기 갱신 (컴포넌트 마운트 시)
    refreshToken();

    // 주기적 갱신 설정
    const intervalMs = refreshIntervalMinutes * 60 * 1000;
    intervalRef.current = setInterval(refreshToken, intervalMs);

    console.log(`[TokenRefresh] 자동 갱신 활성화 (주기: ${refreshIntervalMinutes}분)`);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('[TokenRefresh] 자동 갱신 비활성화');
      }
    };
  }, [enabled, refreshIntervalMinutes]);
};
