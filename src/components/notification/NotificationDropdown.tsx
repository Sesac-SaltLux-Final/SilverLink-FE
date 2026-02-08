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
import { mapLinkUrl } from "@/utils/notificationUtils";


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

    // Logging for debugging
    useEffect(() => {
        if (emergencyAlerts.length > 0 || notifications.length > 0) {
            console.log("🔔 [NotificationDropdown Debug]");
            console.log("   - Emergency Alerts:", emergencyAlerts);
            console.log("   - Recent Notifications:", notifications);

            const emergencyIds = emergencyAlerts.map(a => a.alertId);
            console.log("   - Emergency IDs:", emergencyIds);

            notifications.forEach(n => {
                if (n.notificationType === 'EMERGENCY_NEW') {
                    const isFiltered = emergencyAlerts.some(a => a.alertId === n.referenceId);
                    console.log(`   - checking notification ${n.notificationId} (refId=${n.referenceId}): filtered=${isFiltered}`);
                    if (isFiltered) {
                        const match = emergencyAlerts.find(a => a.alertId === n.referenceId);
                        console.log(`     -> Matched with alertId=${match?.alertId}`);
                        console.log(`     -> Type comparison: alertId(${typeof match?.alertId}) vs referenceId(${typeof n.referenceId})`);
                    }
                }
            });
        }
    }, [emergencyAlerts, notifications]);

    // 초기 로드 및 주기적 알림 수 갱신 (30초마다) + SSE 연결
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);

        const handleBadgeUpdate = () => {
            console.log("알림 수신: 배지 업데이트");
            fetchData();

            // 알림음 재생 (선택적)
            try {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(e => console.log('Audio play failed:', e));
            } catch (e) {
                console.log('Audio creation failed:', e);
            }
        };

        window.addEventListener('silverlink:notification-received', handleBadgeUpdate);
        window.addEventListener('silverlink:emergency-alert-received', handleBadgeUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('silverlink:notification-received', handleBadgeUpdate);
            window.removeEventListener('silverlink:emergency-alert-received', handleBadgeUpdate);
        };
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
            } else {
                navigate("/guardian/alerts");
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    // 백엔드 linkUrl을 프론트엔드 라우트로 매핑 (Moved to utils)
    // const mapLinkUrl = ...

    // 일반 알림 클릭
    const handleNotificationClick = async (notification: NotificationSummary) => {
        try {
            if (!notification.isRead) {
                await markNotificationAsRead(notification.notificationId);
            }
            setIsOpen(false);
            const targetUrl = mapLinkUrl(notification.linkUrl, role);
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

    const allItems = [
        // emergencyAlerts (API)와 notifications (API) 중복 가능성 처리
        // EMERGENCY_NEW 타입의 알림이 notifications 목록에도 있을 수 있음.
        // 우선 emergencyAlerts(미확인 실시간)를 보여주고, notifications에서 동일한 referenceId를 가진 항목은 제외할 수도 있으나,
        // 여기서는 간단히 두 리스트를 합치되, notifications에 있는 EMERGENCY_NEW는 위에서 처리된 로직으로 렌더링됨.
        // 다만, emergencyAlerts는 'RecipientAlertResponse' 타입이고 notifications는 'NotificationSummary' 타입임.
        // 중복 방지를 위해 alertId와 referen    const allItems = [
        ...emergencyAlerts.map(a => ({ ...a, type: 'emergency' as const, date: new Date(a.createdAt) })),
        ...notifications.filter(n => {
            // [DEBUG] deduplication disabled to ensure visibility
            // if (n.notificationType === 'EMERGENCY_NEW') {
            //     return !emergencyAlerts.some(a => a.alertId === n.referenceId);
            // }
            return true;
        }).map(n => ({ ...n, type: 'normal' as const, date: new Date(n.createdAt) }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    // [DEBUG] increased limit to 10
    const displayedItems = allItems.slice(0, 10);

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
                ) : displayedItems.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        새로운 알림이 없습니다
                    </div>
                ) : (
                    <ScrollArea className="max-h-[400px]">
                        {displayedItems.map((item: any) => {
                            if (item.type === 'emergency') {
                                // 긴급 알림 렌더링
                                return (
                                    <DropdownMenuItem
                                        key={`emergency-${item.alertId}`}
                                        className={`flex flex-col items-start gap-1 py-3 cursor-pointer ${!item.isRead ? 'bg-destructive/5' : ''}`}
                                        onClick={() => handleEmergencyClick(item)}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Badge className={`${getSeverityColor(item.severity)} text-xs`}>
                                                {item.severityText}
                                            </Badge>
                                            <span className="font-medium truncate flex-1">{item.title}</span>
                                            {!item.isRead && (
                                                <span className="w-2 h-2 bg-destructive rounded-full shrink-0" />
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {item.elderlyName} ({item.elderlyAge}세) · {item.timeAgo}
                                        </div>
                                    </DropdownMenuItem>
                                );
                            } else if (item.notificationType === 'EMERGENCY_NEW') {
                                // 일반 알림 목록에 있는 EMERGENCY_NEW 타입 처리 (영구 보관용)
                                return (
                                    <DropdownMenuItem
                                        key={`notification-${item.notificationId}`}
                                        className={`flex flex-col items-start gap-1 py-3 cursor-pointer ${!item.isRead ? 'bg-destructive/5' : ''}`}
                                        onClick={() => handleNotificationClick(item)}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Badge className="bg-destructive text-destructive-foreground text-xs">
                                                긴급
                                            </Badge>
                                            <span className="font-medium truncate flex-1">{item.title}</span>
                                            {!item.isRead && (
                                                <span className="w-2 h-2 bg-destructive rounded-full shrink-0" />
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {item.content}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{item.timeAgo}</span>
                                    </DropdownMenuItem>
                                );
                            } else {
                                // 일반 알림 렌더링
                                return (
                                    <DropdownMenuItem
                                        key={`notification-${item.notificationId}`}
                                        className={`flex flex-col items-start gap-1 py-3 cursor-pointer ${!item.isRead ? 'bg-primary/5' : ''}`}
                                        onClick={() => handleNotificationClick(item)}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Badge variant="outline" className="text-xs">
                                                {item.notificationTypeText}
                                            </Badge>
                                            <span className="font-medium truncate flex-1">{item.title}</span>
                                            {!item.isRead && (
                                                <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-1 w-full">
                                            {item.content}
                                        </p>
                                        <span className="text-xs text-muted-foreground">{item.timeAgo}</span>
                                    </DropdownMenuItem>
                                );
                            }
                        })}
                    </ScrollArea>
                )}

                {/* Footer - 항상 표시 (알림이 있을 경우) */}
                {(emergencyAlerts.length > 0 || notifications.length > 0) && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="justify-center text-primary cursor-pointer py-3 font-medium flex-col gap-1"
                            onClick={() => {
                                setIsOpen(false);
                                if (role === 'counselor') {
                                    navigate("/counselor/notifications");
                                } else if (role === 'admin') {
                                    navigate("/admin/notifications");
                                } else {
                                    navigate("/notifications");
                                }
                            }}
                        >
                            {allItems.slice(4).filter(item => !item.isRead).length > 0 && (
                                <span className="text-xs text-muted-foreground mb-1">
                                    + {allItems.slice(4).filter(item => !item.isRead).length}개의 안 읽은 알림
                                </span>
                            )}
                            <div className="flex items-center">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                모든 알림 보기
                            </div>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default NotificationDropdown;
