import { useState, useEffect, useCallback } from "react";
import {
    AlertTriangle,
    Clock,
    PhoneCall,
    Loader2,
    RefreshCw,
    User,
    MapPin
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { guardianNavItems } from "@/config/guardianNavItems";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
    getAlertsForGuardian,
    getAlertDetail,
    EmergencyAlertSummary,
    EmergencyAlertDetail,
    Severity
} from "@/api/emergencyAlerts";

const SeverityBadge = ({ severity }: { severity: Severity }) => {
    switch (severity) {
        case "CRITICAL":
            return <Badge variant="destructive" className="animate-pulse">긴급</Badge>;
        case "HIGH":
            return <Badge className="bg-warning text-warning-foreground">주의</Badge>;
        case "MEDIUM":
            return <Badge variant="outline">보통</Badge>;
        case "LOW":
            return <Badge variant="secondary">낮음</Badge>;
        default:
            return <Badge variant="secondary">{severity}</Badge>;
    }
};

const GuardianAlerts = () => {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState<EmergencyAlertSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<EmergencyAlertDetail | null>(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // 알림 목록 조회
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getAlertsForGuardian({ page, size: 20 });
            setAlerts(response.content);
            setTotalPages(response.totalPages);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
            toast.error('알림 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 알림 상세 조회
    const handleViewDetail = async (alertId: number) => {
        try {
            const detail = await getAlertDetail(alertId);
            setSelectedAlert(detail);
            setShowDetailDialog(true);
        } catch (error) {
            console.error('Failed to fetch alert detail:', error);
            toast.error('알림 상세 정보를 불러오는데 실패했습니다.');
        }
    };

    return (
        <DashboardLayout
            role="guardian"
            userName={user?.name || "보호자"}
            navItems={guardianNavItems}
        >
            {/* Alert Detail Dialog */}
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedAlert && <SeverityBadge severity={selectedAlert.severity} />}
                            {selectedAlert?.title}
                        </DialogTitle>
                        <DialogDescription>{selectedAlert?.alertTypeText}</DialogDescription>
                    </DialogHeader>

                    {selectedAlert && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-muted/50 border">
                                <p className="text-foreground whitespace-pre-wrap">{selectedAlert.description}</p>
                            </div>

                            {/* 어르신 정보 (간략) */}
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5">
                                <Avatar>
                                    <AvatarFallback>{selectedAlert.elderly.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{selectedAlert.elderly.name} ({selectedAlert.elderly.age}세)</p>
                                    <p className="text-xs text-muted-foreground">{selectedAlert.elderly.address}</p>
                                </div>
                            </div>

                            {/* 발생 시간 & 위치 */}
                            <div className="text-sm space-y-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span>발생 시각: {new Date(selectedAlert.createdAt).toLocaleString()}</span>
                                </div>
                                {/* 위치 정보가 있다면 여기에 추가 */}
                            </div>

                            {/* 위험 키워드 */}
                            {selectedAlert.dangerKeywords && selectedAlert.dangerKeywords.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">감지된 위험 키워드</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedAlert.dangerKeywords.map((keyword, idx) => (
                                            <Badge key={idx} variant="destructive" className="bg-destructive/80 hover:bg-destructive/80 pointer-events-none">
                                                {keyword}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 처리 정보 확인 */}
                            {selectedAlert.process && (
                                <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <h4 className="text-sm font-semibold text-green-600 mb-1">조치 완료됨</h4>
                                    <p className="text-sm text-foreground/80">{selectedAlert.process.processedByName}님에 의해 처리되었습니다.</p>
                                    {selectedAlert.process.resolutionNote && (
                                        <p className="text-sm text-muted-foreground mt-1">"{selectedAlert.process.resolutionNote}"</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setShowDetailDialog(false)}>
                            닫기
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">긴급 알림 기록</h1>
                        <p className="text-muted-foreground mt-1">어르신의 긴급 상황 발생 및 처리 기록입니다.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        새로고침
                    </Button>
                </div>

                <Card className="shadow-card border-0">
                    <CardHeader>
                        <CardTitle className="text-lg">알림 목록</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : alerts.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl">
                                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>등록된 긴급 알림이 없습니다.</p>
                            </div>
                        ) : (
                            alerts.map((alert) => (
                                <div
                                    key={alert.alertId}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${alert.severity === "CRITICAL" ? "border-destructive/50 bg-destructive/5" :
                                            alert.severity === "HIGH" ? "border-warning/50 bg-warning/5" :
                                                "border-border bg-card hover:bg-accent/50"
                                        }`}
                                    onClick={() => handleViewDetail(alert.alertId)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 w-2 h-2 rounded-full ${alert.status === 'RESOLVED' ? 'bg-green-500' : 'bg-red-500 animate-pulse'
                                                }`} />
                                            <div>
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <SeverityBadge severity={alert.severity} />
                                                    <span className="font-semibold">{alert.title}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(alert.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground/80 line-clamp-1">{alert.description}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                                                        {alert.alertTypeText}
                                                    </Badge>
                                                    {alert.status === 'RESOLVED' && (
                                                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                            처리 완료
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 flex flex-col items-end">
                                            <span className="text-xs text-muted-foreground mb-1">{alert.timeAgo}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 0}
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                >
                                    이전
                                </Button>
                                <span className="flex items-center px-4 text-sm text-muted-foreground">
                                    {page + 1} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages - 1}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    다음
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default GuardianAlerts;
