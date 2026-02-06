import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Phone,
  Brain,
  ChevronRight,
  Loader2
} from "lucide-react";
import { adminNavItems } from "@/config/adminNavItems";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, MessageSquare, UserCog } from "lucide-react";
import usersApi from "@/api/users";
import adminsApi from "@/api/admins";
import counselorsApi from "@/api/counselors";
import guardiansApi from "@/api/guardians";
import { MyProfileResponse, AdminResponse, CounselorResponse, GuardianResponse, AuditLogResponse } from "@/types/api";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";

const dailyCallData = [
  { hour: "06시", calls: 12 },
  { hour: "08시", calls: 45 },
  { hour: "10시", calls: 128 },
  { hour: "12시", calls: 85 },
  { hour: "14시", calls: 142 },
  { hour: "16시", calls: 156 },
  { hour: "18시", calls: 98 },
  { hour: "20시", calls: 42 },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<MyProfileResponse | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    counselors: 0,
    guardians: 0,
    seniors: 0,
    todayCalls: 0,
    pendingComplaints: 0,
    aiAccuracy: 94.5,
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // 사용자 프로필 조회
        const profile = await usersApi.getMyProfile();
        setUserProfile(profile);

        // 상담사 목록 조회
        const counselors = await counselorsApi.getAllCounselors();

        // 보호자 목록 조회
        const guardians = await guardiansApi.getAllGuardians();

        // 통계 업데이트
        setStats({
          totalUsers: counselors.length + guardians.length,
          counselors: counselors.length,
          guardians: guardians.length,
          seniors: counselors.reduce((acc, c) => acc + (c.assignedElderlyCount || 0), 0),
          todayCalls: 0, // API 추가 필요
          pendingComplaints: 0, // API 추가 필요
          aiAccuracy: 94.5, // 고정값
        });

        // 감사 로그 조회
        const logsResponse = await adminsApi.getAuditLogs({ size: 5 });
        setAuditLogs(logsResponse.content);
      } catch (error) {
        console.error('Failed to fetch admin dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout role="admin" userName={user?.name || "관리자"} navItems={adminNavItems}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout
        role="admin"
        userName={user?.name || userProfile?.name || "관리자"}
        navItems={adminNavItems}
      >
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">관리자 대시보드</h1>
            <p className="text-muted-foreground mt-1">시스템 현황을 한눈에 확인하세요</p>
          </div>


          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">전체 회원</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stats.totalUsers.toLocaleString()}</p>
                    <p className="text-xs text-success flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      +12 오늘
                    </p>
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
                      진행률 78%
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">AI 정확도</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stats.aiAccuracy}%</p>
                    <p className="text-xs text-success flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      +0.5% 주간
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-info" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">대기 불편사항</p>
                    <p className="text-3xl font-bold text-warning mt-1">{stats.pendingComplaints}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Daily Call Distribution */}
            <div className="lg:col-span-2">
              <Card className="shadow-card border-0">
                <CardHeader>
                  <CardTitle className="text-lg">시간대별 통화량</CardTitle>
                  <CardDescription>오늘의 시간대별 AI 통화 분포</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyCallData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="통화 수" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User Distribution */}
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg">회원 분포</CardTitle>
                <CardDescription>유형별 회원 현황</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-primary/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">어르신</span>
                    <span className="font-bold text-primary">{stats.seniors}</span>
                  </div>
                  <Progress value={(stats.seniors / stats.totalUsers) * 100} className="h-2" />
                </div>
                <div className="p-4 rounded-xl bg-accent/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">보호자</span>
                    <span className="font-bold text-accent">{stats.guardians}</span>
                  </div>
                  <Progress value={(stats.guardians / stats.totalUsers) * 100} className="h-2" />
                </div>
                <div className="p-4 rounded-xl bg-success/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">상담사</span>
                    <span className="font-bold text-success">{stats.counselors}</span>
                  </div>
                  <Progress value={(stats.counselors / stats.totalUsers) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card className="shadow-card border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">최근 활동</CardTitle>
                <CardDescription>시스템 주요 활동 내역</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => {
                    let type = 'info';
                    let Icon = Activity;
                    let bgClass = 'bg-info/10';
                    let iconClass = 'text-info';

                    // 활동 타입에 따른 아이콘/색상 결정 (키워드 매칭)
                    const action = log.action.toUpperCase();
                    if (action.includes('USER') || action.includes('MEMBER') || action.includes('SIGNUP')) {
                      type = 'user';
                      Icon = Users;
                      bgClass = 'bg-primary/10';
                      iconClass = 'text-primary';
                    } else if (action.includes('COMPLAINT') || action.includes('ERROR')) {
                      type = 'complaint';
                      Icon = MessageSquare;
                      bgClass = 'bg-warning/10';
                      iconClass = 'text-warning';
                    } else if (action.includes('ALERT') || action.includes('EMERGENCY') || action.includes('DELETE')) {
                      type = 'alert';
                      Icon = AlertTriangle;
                      bgClass = 'bg-destructive/10';
                      iconClass = 'text-destructive';
                    } else if (action.includes('ASSIGNMENT') || action.includes('UPDATE')) {
                      type = 'assignment';
                      Icon = UserCog;
                      bgClass = 'bg-accent/10';
                      iconClass = 'text-accent';
                    }

                    // 활동 메시지 포맷팅 함수
                    const formatActivityMessage = (action: string) => {
                      const upperAction = action.toUpperCase();
                      switch (upperAction) {
                        case 'CREATE_POLICY':
                          return '새로운 운영 정책을 생성했습니다.';
                        case 'ASSIGN_ELDERLY':
                          return '어르신 담당 상담사를 배정했습니다.';
                        case 'UNASSIGN_ELDERLY':
                          return '어르신 담당 상담사 배정을 해제했습니다.';
                        case 'LOGIN':
                        case 'LOGIN_PHONE':
                          return '통합 대시보드에 로그인했습니다.';
                        default:
                          return action; // 정의되지 않은 코드는 그대로 출력
                      }
                    };

                    return (
                      <div
                        key={log.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgClass}`}>
                          <Icon className={`w-5 h-5 ${iconClass}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            <span className="font-bold mr-1">{log.actorName}:</span>
                            {formatActivityMessage(log.action)}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: ko })}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    최근 활동 내역이 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </>
  );
};

export default AdminDashboard;
