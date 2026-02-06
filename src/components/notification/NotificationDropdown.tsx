import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bell,
    AlertTriangle,
    MessageSquare,
    CheckCircle2,
    Loader2,
    ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
    getUnreadAlerts,
    markAsRead as markEmergencyAsRead,
    markAllAsRead as markAllEmergencyAsRead,
    RecipientAlertResponse
} from "@/api/emergencyAlerts";
import {
    getRecentNotifications,
    markAsRead as markNotificationAsRead,
    markAllAsRead as markAllNotificationAsRead,
    NotificationSummary
} from "@/api/notifications";

interface NotificationDropdownProps {
    role: "guardian" | "counselor" | "admin";
}

const NotificationDropdown = ({ role }: NotificationDropdownProps) => {
    const navigate = useNavigate();
    const [emergencyAlerts, setEmergencyAlerts] = useState<RecipientAlertResponse[]>([]);
    const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const totalUnread = emergencyAlerts.filter(a => !a.isRead).length +
        notifications.filter(n => !n.isRead).length;

    // 데이터 조회
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [emergencyRes, notificationRes] = await Promise.all([
                getUnreadAlerts().catch(() => []),
                getRecentNotifications(10).catch(() => [])
            ]);
            setEmergencyAlerts(emergencyRes);
            setNotifications(notificationRes);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 드롭다운 열릴 때 데이터 조회
    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, fetchData]);

    // 초기 로드 및 주기적 알림 수 갱신 (30초마다)
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // 긴급 알림 클릭
    const handleEmergencyClick = async (alert: RecipientAlertResponse) => {
        try {
            if (!alert.isRead) {
                await markEmergencyAsRead(alert.alertId);
            }
            setIsOpen(false);
            if (role === "counselor") {
                navigate("/counselor/alerts");
            } else if (role === "admin") {
                navigate("/admin/dashboard");
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    // 백엔드 linkUrl을 프론트엔드 라우트로 매핑
    const mapLinkUrl = (linkUrl: string | undefined, notificationType: string): string | null => {
        if (!linkUrl) return null;

        // /complaints/{id} 또는 /inquiries/{id} 패턴 매핑
        if (linkUrl.startsWith('/complaints/')) {
            return role === 'admin' ? '/admin/complaints' : '/guardian/complaint';
        }
        if (linkUrl.startsWith('/inquiries/')) {
            return role === 'admin' ? '/admin/members' : '/guardian/inquiry';
        }
        if (linkUrl.startsWith('/admin/complaints/')) {
            return '/admin/complaints';
        }
        if (linkUrl.startsWith('/admin/inquiries/')) {
            return '/admin/members';
        }
        if (linkUrl.startsWith('/notices/')) {
            if (role === 'admin') return '/admin/notices';
            if (role === 'counselor') return '/counselor/notices';
            return '/guardian/notices';
        }
        if (linkUrl.startsWith('/admin/access-requests/') || linkUrl.startsWith('/access-requests/')) {
            if (role === 'admin') return '/admin/sensitive-info';
            if (role === 'guardian') return '/guardian/sensitive-info';
            if (role === 'counselor') return '/counselor/sensitive-info';
            return null;
        }

        // [Redirect] Move problematic assignment links to notification history
        if (role === 'counselor' && linkUrl.startsWith('/counselor/elderly/')) {
            return '/counselor/notifications';
        }

        // 그 외는 원본 linkUrl 사용
        return linkUrl;
    };

    // 일반 알림 클릭
    const handleNotificationClick = async (notification: NotificationSummary) => {
        try {
            if (!notification.isRead) {
                await markNotificationAsRead(notification.notificationId);
            }
            setIsOpen(false);
            const targetUrl = mapLinkUrl(notification.linkUrl, notification.notificationType);
            if (targetUrl) {
                navigate(targetUrl);
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    // 전체 읽음 처리
    const handleMarkAllAsRead = async () => {
        try {
            await Promise.all([
                markAllEmergencyAsRead(),
                markAllNotificationAsRead()
            ]);
            toast.success('모든 알림을 읽음 처리했습니다.');
            fetchData();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            toast.error('읽음 처리에 실패했습니다.');
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "CRITICAL": return "bg-destructive text-destructive-foreground";
            case "HIGH": return "bg-warning text-warning-foreground";
            default: return "bg-muted";
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative w-10 h-10">
                    <Bell className="w-6 h-6" />
                    {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                            {totalUnread > 99 ? "99+" : totalUnread}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>알림</span>
                    {totalUnread > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={handleMarkAllAsRead}
                        >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            전체 읽음
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : emergencyAlerts.length === 0 && notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        새로운 알림이 없습니다
                    </div>
                ) : (
                    <ScrollArea className="max-h-[400px]">
                        {/* 긴급 알림 */}
                        {emergencyAlerts.length > 0 && (
                            <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-destructive flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    긴급 알림
                                </div>
                                {emergencyAlerts.map((alert) => (
                                    <DropdownMenuItem
                                        key={`emergency-${alert.alertId}`}
                                        className={`flex flex-col items-start gap-1 py-3 cursor-pointer ${!alert.isRead ? 'bg-destructive/5' : ''}`}
                                        onClick={() => handleEmergencyClick(alert)}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Badge className={`${getSeverityColor(alert.severity)} text-xs`}>
                                                {alert.severityText}
                                            </Badge>
                                            <span className="font-medium truncate flex-1">{alert.title}</span>
                                            {!alert.isRead && (
                                                <span className="w-2 h-2 bg-destructive rounded-full shrink-0" />
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {alert.elderlyName} ({alert.elderlyAge}세) · {alert.timeAgo}
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                            </>
                        )}

                        {/* 일반 알림 */}
                        {notifications.length > 0 && (
                            <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" />
                                    일반 알림
                                </div>
                                {notifications.map((notification) => (
                                    <DropdownMenuItem
                                        key={`notification-${notification.notificationId}`}
                                        className={`flex flex-col items-start gap-1 py-3 cursor-pointer ${!notification.isRead ? 'bg-primary/5' : ''}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Badge variant="outline" className="text-xs">
                                                {notification.notificationTypeText}
                                            </Badge>
                                            <span className="font-medium truncate flex-1">{notification.title}</span>
                                            {!notification.isRead && (
                                                <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-1 w-full">
                                            {notification.content}
                                        </p>
                                        <span className="text-xs text-muted-foreground">{notification.timeAgo}</span>
                                    </DropdownMenuItem>
                                ))}
                            </>
                        )}
                    </ScrollArea>
                )}

                {/* Footer */}
                {(emergencyAlerts.length > 0 || notifications.length > 0) && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="justify-center text-primary cursor-pointer"
                            onClick={() => {
                                setIsOpen(false);
                                if (role === 'counselor') {
                                    navigate("/counselor/notifications");
                                } else if (role === 'admin') {
                                    navigate("/admin/notifications"); // Assuming admin/notifications will be mapped
                                } else {
                                    navigate("/notifications");
                                }
                            }}
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            모든 알림 보기
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default NotificationDropdown;
