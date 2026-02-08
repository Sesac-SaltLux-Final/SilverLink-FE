import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  PhoneCall,
  Users,
  MessageSquare,
  Loader2,
  Radio,
  Smile,
  Meh,
  Frown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { counselorNavItems } from "@/config/counselorNavItems";
import { useAuth } from "@/contexts/AuthContext";
import counselorsApi from "@/api/counselors";
import callReviewsApi from "@/api/callReviews";
import emergencyAlertsApi, { EmergencyAlertSummary } from "@/api/emergencyAlerts";
import { CounselorResponse, CallRecordSummaryResponse } from "@/types/api";

import { NoticePopup } from "@/components/notice/NoticePopup";

// 12시간 형식 시간 변환 함수 (CounselorCalls와 동일)
const formatTimeAMPM = (isoTime: string) => {
  if (!isoTime) return '';
  const timePart = isoTime.split('T')[1]?.substring(0, 5);
  if (!timePart) return '';
  const [hourStr, minute] = timePart.split(':');
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:${minute} ${ampm}`;
};

// 감정 상태 아이콘 (CounselorCalls와 동일)
const EmotionIcon = ({ emotion }: { emotion: string }) => {
  switch (emotion?.toUpperCase()) {
    case "GOOD":
      return <Smile className="w-5 h-5 text-success" />;
    case "NORMAL":
      return <Meh className="w-5 h-5 text-muted-foreground" />;
    case "BAD":
      return <Frown className="w-5 h-5 text-destructive" />;
    default:
      return <Meh className="w-5 h-5 text-muted-foreground" />;
  }
};

const CounselorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const [counselorInfo, setCounselorInfo] = useState<CounselorResponse | null>(null);
  const [callRecords, setCallRecords] = useState<CallRecordSummaryResponse[]>([]);
  const [realUrgentAlerts, setRealUrgentAlerts] = useState<EmergencyAlertSummary[]>([]);


  const [stats, setStats] = useState({
    totalSeniors: 0,
    todayCalls: 0,
    pendingReviews: 0,
    urgentAlerts: 0,
  });

  // 데이터 조회 함수 (showLoading: 로딩 표시 여부)
  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);

      // 병렬 요청으로 성능 최적화 및 에러 격리
      const [
        counselorResult,
        callsResult,
        unreviewedResult,
        alertsResult,
        todayCountResult
      ] = await Promise.allSettled([
        counselorsApi.getMyInfo(),
        callReviewsApi.getCallRecordsForCounselor({ size: 10 }),
        callReviewsApi.getUnreviewedCount(),
        emergencyAlertsApi.getPendingAlertsForCounselor(),
        callReviewsApi.getTodayCallCount()
      ]);

      // 1. 상담사 정보
      let counselor = null;
      if (counselorResult.status === 'fulfilled') {
        counselor = counselorResult.value;
        setCounselorInfo(counselor);
      } else {
        console.error("Failed to fetch counselor info", counselorResult.reason);
      }

      // 2. 통화 기록
      let recentCalls: CallRecordSummaryResponse[] = [];
      if (callsResult.status === 'fulfilled') {
        recentCalls = callsResult.value.content;
        setCallRecords(recentCalls);
      } else {
        console.error("Failed to fetch call records", callsResult.reason);
      }

      // 3. 미확인 통화 건수
      let unreviewedCount = 0;
      if (unreviewedResult.status === 'fulfilled') {
        unreviewedCount = unreviewedResult.value.unreviewedCount;
      } else {
        console.error("Failed to fetch unreviewed count", unreviewedResult.reason);
      }

      // 4. 긴급 알림
      let urgentAlerts: EmergencyAlertSummary[] = [];
      if (alertsResult.status === 'fulfilled') {
        urgentAlerts = alertsResult.value;
        setRealUrgentAlerts(urgentAlerts);
      } else {
        console.error("Failed to fetch alerts", alertsResult.reason);
      }

      // 5. 오늘 통화 수
      let todayCalls = 0;
      if (todayCountResult.status === 'fulfilled') {
        todayCalls = todayCountResult.value;
      } else {
        // 실패 시 (백엔드 미반영 등) 기존 로직으로 Fallback 시도
        console.warn("Failed to fetch today call count (using fallback)", todayCountResult.reason);
        if (recentCalls.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          todayCalls = recentCalls.filter((c) => c.callAt?.startsWith(today)).length;
        }
      }

      // 6. 통계 설정
      setStats({
        totalSeniors: counselor?.assignedElderlyCount || 0,
        todayCalls: todayCalls,
        pendingReviews: unreviewedCount,
        urgentAlerts: urgentAlerts.length,
      });

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // 최초 로딩
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 10초마다 자동 갱신 (통화 시작/종료 실시간 반영)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // 페이지가 다시 보일 때 데이터 새로고침
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);

  // 팝업 공지사항 조회 logic...


  const handleViewAll = () => {
    navigate("/counselor/calls");
  };

  const handleViewDetail = (callId: number) => {
    navigate(`/counselor/calls/${callId}`);
  };

  const handleAlertClick = (alertId: number) => {
    navigate(`/counselor/alerts`); // Or specific detail? Alerts page seems safer
  };

  if (isLoading) {
    return (
      <DashboardLayout role="counselor" userName="로딩중..." navItems={counselorNavItems}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <NoticePopup userRole="COUNSELOR" />
      <DashboardLayout
        role="counselor"
        userName={user?.name || "상담사"}
        navItems={counselorNavItems}
      >
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">안녕하세요, {user?.name || "상담사"}님</h1>
            <p className="text-muted-foreground mt-1">오늘의 상담 현황을 확인하세요</p>
          </div>

          {/* Urgent Alerts - Only show if there are alerts from real data */}
          {stats.urgentAlerts > 0 && (
            <Card className="border-destructive/50 bg-destructive/5 shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <CardTitle className="text-lg text-destructive">긴급 알림</CardTitle>
                  <Badge variant="destructive">{stats.urgentAlerts}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {callRecords.filter(c => c.emotionLevel === 'BAD').map((call) => (
                  <div
                    key={call.callId}
                    className="flex items-center justify-between p-4 rounded-xl bg-card shadow-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{call.elderlyName}</span>
                          <Badge variant="outline" className="text-xs">주의</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">AI 감정 분석: 부정적 신호 감지</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {call.callAt}
                      </span>
                      <Button size="sm" variant="destructive" onClick={() => handleViewDetail(call.callId)}>
                        확인하기
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">담당 어르신</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stats.totalSeniors}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">오늘 통화</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stats.todayCalls}</p>
                    <p className="text-xs text-success flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      84% 완료
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <PhoneCall className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">미확인 통화</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stats.pendingReviews}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">긴급 알림</p>
                    <p className="text-3xl font-bold text-destructive mt-1">{stats.urgentAlerts}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call Records Table - CounselorCalls와 동일한 UI */}
          <Card className="shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">오늘의 통화 현황</CardTitle>
                <CardDescription>담당 어르신별 통화 상태를 확인하세요</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary" onClick={handleViewAll}>
                전체보기 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {callRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  통화 기록이 없습니다.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>어르신</TableHead>
                      <TableHead>일시</TableHead>
                      <TableHead>통화시간</TableHead>
                      <TableHead>감정상태</TableHead>
                      <TableHead>요약</TableHead>
                      <TableHead>상담사 코멘트</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callRecords.slice(0, 5).map((call) => (
                      <TableRow
                        key={call.callId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewDetail(call.callId)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{call.elderlyName}</p>
                            {call.state === 'ANSWERED' && (
                              <Badge variant="outline" className="animate-pulse text-green-600 border-green-600 text-xs px-1.5 py-0">
                                <Radio className="w-3 h-3 mr-1" />
                                통화 중
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{call.callAt?.split('T')[0]}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAMPM(call.callAt)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{call.duration}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <EmotionIcon emotion={call.emotionLevel || 'NORMAL'} />
                            <span className="text-sm">
                              {call.emotionLevel?.toUpperCase() === "GOOD" ? "좋음" :
                                call.emotionLevel?.toUpperCase() === "BAD" ? "주의" : "보통"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="truncate text-sm text-muted-foreground">
                            {call.summaryPreview?.length > 30
                              ? call.summaryPreview.substring(0, 30) + '...'
                              : call.summaryPreview || '요약 없음'}
                          </p>
                        </TableCell>
                        <TableCell>
                          {call.reviewed ? (
                            <span className="text-xs text-success">완료</span>
                          ) : (
                            <span className="text-xs text-warning">미작성</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

      </DashboardLayout>
    </>
  );
};

export default CounselorDashboard;

