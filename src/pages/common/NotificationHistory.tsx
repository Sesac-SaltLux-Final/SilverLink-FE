
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Bell,
    AlertTriangle,
    MessageSquare,
    CheckCircle2,
    Loader2,
    ArrowLeft,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { guardianNavItems } from "@/config/guardianNavItems";
import { counselorNavItems } from "@/config/counselorNavItems";
import { adminNavItems } from "@/config/adminNavItems";
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

const NotificationHistory = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState("all");
    const [emergencyAlerts, setEmergencyAlerts] = useState<RecipientAlertResponse[]>([]);
    const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
    const [loading, setLoading] = useState(true);

    // Determine role based on path for layout
    const getRoleInfo = () => {
        if (location.pathname.startsWith("/admin")) return { role: "admin", navItems: adminNavItems, label: "관리자" };
        if (location.pathname.startsWith("/counselor")) return { role: "counselor", navItems: counselorNavItems, label: "상담사" };
        return { role: "guardian", navItems: guardianNavItems, label: "보호자" };
    };

    const { role, navItems, label } = getRoleInfo();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch more history than the dropdown (e.g., 50)
            const [emergencyRes, notificationRes] = await Promise.all([
                getUnreadAlerts(), // This might need an API update to fetch READ alerts too if we want full history
                getRecentNotifications(50)
            ]);
            setEmergencyAlerts(emergencyRes);
            setNotifications(notificationRes);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            toast.error("알림 목록을 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    // Helper to map urgency colors
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "CRITICAL": return "bg-destructive text-destructive-foreground";
            case "HIGH": return "bg-warning text-warning-foreground";
            default: return "bg-muted";
        }
    };

    const allItems = [
        ...emergencyAlerts.map(a => ({ ...a, type: 'emergency', date: new Date(a.createdAt) })),
        ...notifications.filter(n => {
            if (n.notificationType === 'EMERGENCY_NEW') {
                return !emergencyAlerts.some(a => a.alertId === n.referenceId);
            }
            return true;
        }).map(n => ({ ...n, type: 'normal', date: new Date(n.createdAt) }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const filteredItems = activeTab === "all"
        ? allItems
        : activeTab === "emergency"
            ? allItems.filter(i => i.type === 'emergency')
            : allItems.filter(i => i.type === 'normal');

    return (
        <DashboardLayout role={role as any} userName={label} navItems={navItems}>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">알림 보관함</h1>
                        <p className="text-muted-foreground">지난 알림 내역을 확인할 수 있습니다</p>
                    </div>
                </div>

                <Card className="shadow-card border-0">
                    <CardHeader className="pb-2">
                        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <div className="flex items-center justify-between mb-4">
                                <TabsList>
                                    <TabsTrigger value="all">전체</TabsTrigger>
                                    <TabsTrigger value="emergency">긴급 알림</TabsTrigger>
                                    <TabsTrigger value="normal">일반 알림</TabsTrigger>
                                </TabsList>
                                <Button variant="outline" size="sm" onClick={fetchData}>
                                    <Loader2 className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                    새로고침
                                </Button>
                            </div>

                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : filteredItems.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        알림 내역이 없습니다.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {filteredItems.map((item: any) => (
                                            <div
                                                key={`${item.type}-${item.type === 'emergency' ? item.alertId : item.notificationId}`}
                                                className={`p-4 hover:bg-muted/30 transition-colors flex gap-4 cursor-pointer ${!item.isRead ? 'bg-primary/5' : ''}`}
                                                onClick={() => {
                                                    const targetUrl = mapLinkUrl(item.linkUrl, role);
                                                    if (targetUrl) navigate(targetUrl);
                                                }}
                                            >
                                                <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.type === 'emergency' || item.notificationType === 'EMERGENCY_NEW'
                                                    ? 'bg-destructive/10 text-destructive'
                                                    : 'bg-primary/10 text-primary'
                                                    }`}>
                                                    {item.type === 'emergency' || item.notificationType === 'EMERGENCY_NEW'
                                                        ? <AlertTriangle className="w-5 h-5" />
                                                        : <MessageSquare className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {item.type === 'emergency' ? (
                                                            <Badge className={getSeverityColor(item.severity)}>{item.severityText}</Badge>
                                                        ) : item.notificationType === 'EMERGENCY_NEW' ? (
                                                            <Badge className="bg-destructive text-destructive-foreground">긴급</Badge>
                                                        ) : (
                                                            <Badge variant="outline">{item.notificationTypeText}</Badge>
                                                        )}
                                                        <span className="font-medium truncate">{item.title}</span>
                                                        {!item.isRead && <span className="w-2 h-2 bg-primary rounded-full" />}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-1">
                                                        {item.type === 'emergency'
                                                            ? `${item.elderlyName} (${item.elderlyAge}세)`
                                                            : item.notificationType === 'EMERGENCY_NEW'
                                                                ? item.content // EMERGENCY_NEW contents are pre-formatted
                                                                : item.content}
                                                    </p>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(item.date).toLocaleString()} ({item.timeAgo})
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Tabs>
                    </CardHeader>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default NotificationHistory;
