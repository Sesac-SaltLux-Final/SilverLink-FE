import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Phone, Clock, User, ChevronRight, Volume2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import emergencyAlertsApi, { RecipientAlertResponse, Severity } from "@/api/emergencyAlerts";
import { EventSourcePolyfill } from 'event-source-polyfill';

import { useAuth } from "@/contexts/AuthContext";

// ... existing imports

// Props interface removed as it's no longer needed
// interface EmergencyAlertPopupProps {
//     userRole: "COUNSELOR" | "GUARDIAN" | "ADMIN";
// }

export const EmergencyAlertPopup = () => {
    const navigate = useNavigate();
    const { user } = useAuth(); // Get user from context
    const [alerts, setAlerts] = useState<RecipientAlertResponse[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 미확인 긴급 알림 조회
    const fetchAlerts = useCallback(async () => {
        if (!user) return; // Guard clause
        try {
            const response = await emergencyAlertsApi.getUnreadAlerts();

            if (response.length > 0) {
                setAlerts(response);
                setCurrentIndex(0);
                setIsOpen(true);
            }
        } catch (error) {
            console.error("[EmergencyAlertPopup] Failed to fetch emergency alerts:", error);
        }
    }, [user]);

    // 페이지 로드 시 미확인 알림 조회
    useEffect(() => {
        if (user) {
            fetchAlerts();
        }
    }, [fetchAlerts, user]);

    // SSE 실시간 긴급 알림 수신
    useEffect(() => {
        if (!user) return;

        const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
        const token = localStorage.getItem('accessToken');
        const sseUrl = `${API_BASE_URL}/api/sse/subscribe`;

        if (!token) {
            return;
        }

        let eventSource: EventSource | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

        const connect = () => {
            try {
                // @ts-ignore - EventSourcePolyfill types might need casting
                eventSource = new EventSourcePolyfill(sseUrl, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    withCredentials: true,
                    heartbeatTimeout: 3600000, // 1 hour
                }) as unknown as EventSource;

                eventSource.addEventListener('emergency-alert', () => {
                    // 새 긴급 알림이 오면 미확인 알림 다시 조회
                    fetchAlerts();
                });

                eventSource.onerror = (err) => {
                    eventSource?.close();
                    // 5초 후 재연결
                    reconnectTimer = setTimeout(connect, 5000);
                };
            } catch (e) {
                console.error("[EmergencyAlertPopup] Failed to create EventSource:", e);
            }
        };

        connect();

        return () => {
            eventSource?.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, [fetchAlerts, user]);

    // 알림 확인 (읽음 처리 후 상세 페이지로 이동)
    const handleConfirm = async () => {
        const currentAlert = alerts[currentIndex];
        if (!currentAlert) return;

        try {
            setIsLoading(true);
            await emergencyAlertsApi.markAsRead(currentAlert.alertId);

            // 다음 알림이 있으면 표시
            if (currentIndex < alerts.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else {
                setIsOpen(false);
                // 상세 페이지로 이동
                navigateToAlertPage();
            }
        } catch (error) {
            console.error("Failed to mark alert as read:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // 역할별 알림 페이지로 이동
    const navigateToAlertPage = () => {
        if (!user) return;

        switch (user.role) {
            case "COUNSELOR":
                navigate("/counselor/alerts");
                break;
            case "ADMIN":
                navigate("/admin/dashboard");
                break;
            case "GUARDIAN":
                navigate("/guardian/calls");
                break;
        }
    };

    // 상세보기 (바로 이동)
    const handleViewDetail = async () => {
        const currentAlert = alerts[currentIndex];
        if (currentAlert) {
            try {
                await emergencyAlertsApi.markAsRead(currentAlert.alertId);
            } catch {
                // 읽음 처리 실패해도 이동
            }
        }
        setIsOpen(false);
        navigateToAlertPage();
    };

    // 심각도별 스타일
    const getSeverityStyles = (severity: Severity) => {
        switch (severity) {
            case "CRITICAL":
                return {
                    bg: "bg-destructive/10",
                    border: "border-destructive/30",
                    badge: "bg-destructive text-destructive-foreground",
                    icon: "text-destructive",
                    pulse: "animate-pulse",
                };
            case "HIGH":
                return {
                    bg: "bg-warning/10",
                    border: "border-warning/30",
                    badge: "bg-warning text-warning-foreground",
                    icon: "text-warning",
                    pulse: "",
                };
            default:
                return {
                    bg: "bg-info/10",
                    border: "border-info/30",
                    badge: "bg-info text-info-foreground",
                    icon: "text-info",
                    pulse: "",
                };
        }
    };

    if (!isOpen || alerts.length === 0) {
        return null;
    }

    const currentAlert = alerts[currentIndex];
    const styles = getSeverityStyles(currentAlert.severity);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent
                className={`sm:max-w-[500px] bg-background ${styles.border} border-2`}
                onInteractOutside={(e) => {
                    e.preventDefault();
                }}
                onEscapeKeyDown={(e) => {
                    e.preventDefault();
                }}
            >
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 ${styles.icon} ${styles.pulse}`}>
                            <AlertTriangle className="w-6 h-6" />
                            <DialogTitle className="text-xl">긴급 알림</DialogTitle>
                        </div>
                        {alerts.length > 1 && (
                            <span className="text-sm text-muted-foreground">
                                {currentIndex + 1} / {alerts.length}
                            </span>
                        )}
                    </div>
                    <DialogDescription className="sr-only">
                        긴급 알림을 확인하세요
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* 심각도 및 유형 배지 */}
                    <div className="flex items-center gap-2">
                        <Badge className={styles.badge}>
                            {currentAlert.severityText}
                        </Badge>
                        <Badge variant="outline">
                            {currentAlert.alertTypeText}
                        </Badge>
                    </div>

                    {/* 제목 */}
                    <h3 className="text-lg font-bold">{currentAlert.title}</h3>

                    {/* 어르신 정보 */}
                    <div className={`p-4 rounded-xl ${styles.bg} space-y-3`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full ${styles.bg} flex items-center justify-center ${styles.border} border`}>
                                <User className={`w-6 h-6 ${styles.icon}`} />
                            </div>
                            <div>
                                <p className="font-semibold text-lg">{currentAlert.elderlyName}</p>
                                <p className="text-sm text-muted-foreground">{currentAlert.elderlyAge}세</p>
                            </div>
                        </div>
                    </div>

                    {/* 발생 시간 */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>발생 시간: {currentAlert.timeAgo}</span>
                    </div>

                    {/* 경고 메시지 */}
                    {currentAlert.severity === "CRITICAL" && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/20 text-destructive">
                            <Volume2 className="w-5 h-5" />
                            <span className="text-sm font-medium">즉시 확인이 필요한 긴급 상황입니다</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button
                        variant="secondary"
                        onClick={handleViewDetail}
                        className="flex-1"
                    >
                        상세보기
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`flex-1 ${currentAlert.severity === "CRITICAL" ? "bg-destructive hover:bg-destructive/90" : ""}`}
                    >
                        <Phone className="w-4 h-4 mr-2" />
                        확인
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EmergencyAlertPopup;
