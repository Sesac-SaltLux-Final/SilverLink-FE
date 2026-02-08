import { useEffect } from "react";
import { EventSourcePolyfill } from 'event-source-polyfill';
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { NotificationDetail } from "@/api/notifications";

const NotificationToastListener = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;

        const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
        const token = localStorage.getItem('accessToken');
        const sseUrl = `${API_BASE_URL}/api/sse/subscribe`;

        if (!token) return;

        let eventSource: EventSource | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

        const connect = () => {
            try {
                // @ts-ignore
                eventSource = new EventSourcePolyfill(sseUrl, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    withCredentials: true,
                    heartbeatTimeout: 3600000,
                }) as unknown as EventSource;

                eventSource.addEventListener('notification', (event: MessageEvent) => {
                    try {
                        const data: NotificationDetail = JSON.parse(event.data);

                        // 전역 이벤트 발생 (배지 업데이트용)
                        window.dispatchEvent(new Event('silverlink:notification-received'));

                        // COUNSELOR_COMMENT 타입인 경우 토스트 알림 표시
                        if (data.notificationType === 'COUNSELOR_COMMENT') {
                            toast.info("새로운 상담사 코멘트", {
                                description: data.content,
                                action: {
                                    label: "확인",
                                    onClick: () => {
                                        if (data.linkUrl) {
                                            navigate(data.linkUrl);
                                        }
                                    }
                                },
                                duration: 5000,
                            });
                        }
                    } catch (e) {
                        console.error("Failed to parse notification event:", e);
                    }
                });

                eventSource.addEventListener('emergency-alert', (event: MessageEvent) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log("🚨 [NotificationToastListener] Emergency Alert Received:", data);

                        // 전역 이벤트 발생 (데이터 포함)
                        const customEvent = new CustomEvent('silverlink:emergency-alert-received', {
                            detail: data
                        });
                        window.dispatchEvent(customEvent);
                    } catch (e) {
                        console.error("Failed to parse emergency alert event:", e);
                    }
                });

                eventSource.addEventListener('unread-count', (event: MessageEvent) => {
                    // 미확인 수 업데이트 이벤트 필요 시 구현
                    window.dispatchEvent(new Event('silverlink:notification-received'));
                });

                eventSource.onerror = () => {
                    eventSource?.close();
                    reconnectTimer = setTimeout(connect, 5000);
                };

            } catch (e) {
                console.error("Failed to create EventSource for notifications:", e);
            }
        };

        connect();

        return () => {
            eventSource?.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, [user, navigate]);

    return null;
};

export default NotificationToastListener;
