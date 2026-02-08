import { useState, useEffect, useCallback } from "react";
import {
  Heart,
  Activity,
  Phone,
  Moon,
  Clock,
  Smile,
  Meh,
  Frown,
  ChevronRight,
  MessageSquare,
  FileText,
  HelpCircle,
  Loader2,
  Radio
} from "lucide-react";
import { guardianNavItems } from "@/config/guardianNavItems";
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
import { useNavigate } from "react-router-dom";
import guardiansApi from "@/api/guardians";
import callReviewsApi from "@/api/callReviews";
import usersApi from "@/api/users";
import { GuardianElderlyResponse, GuardianCallReviewResponse, MyProfileResponse } from "@/types/api";
import { NoticePopup } from "@/components/notice/NoticePopup";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

// 12시간 형식 시간 변환 함수
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

// 감정 아이콘 컴포넌트
const EmotionIcon = ({ emotion }: { emotion: string }) => {
  switch (emotion?.toUpperCase()) {
    case "GOOD":
      return <Smile className="w-5 h-5 text-success" />;
    case "NORMAL":
      return <Meh className="w-5 h-5 text-muted-foreground" />;
    case "BAD":
    case "DEPRESSED":
      return <Frown className="w-5 h-5 text-destructive" />;
    default:
      return <Meh className="w-5 h-5 text-muted-foreground" />;
  }
};

const translateRelation = (relation: string) => {
  const map: Record<string, string> = {
    CHILD: "자녀",
    SON: "아들",
    DAUGHTER: "딸",
    SPOUSE: "배우자",
    Relative: "친척",
    FRIEND: "지인",
    OTHER: "기타",
  };
  return map[relation] || relation;
};

// "05:30" -> 330 seconds
const parseDurationToSeconds = (durationStr: string): number => {
  if (!durationStr) return 0;
  try {
    const parts = durationStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    // "5분 30초" format fallback
    const numericParts = durationStr.match(/\d+/g);
    if (numericParts && numericParts.length >= 2) {
      return parseInt(numericParts[0]) * 60 + parseInt(numericParts[1]);
    }
    return 0;
  } catch (e) {
    return 0;
  }
};

const formatSecondsToDuration = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}분 ${seconds}초`;
};

const GuardianDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<MyProfileResponse | null>(null);
  const [elderlyData, setElderlyData] = useState<GuardianElderlyResponse | null>(null);
  const [recentCalls, setRecentCalls] = useState<GuardianCallReviewResponse[]>([]);

  // Stats State
  const [stats, setStats] = useState({
    avgDuration: "0분 0초",
    totalCalls: 0,
    sleepStatus: "확인 필요",
    sleepDetail: "-"
  });

  // Chart Data
  const [chartData, setChartData] = useState<any[]>([]);

  // 데이터 조회 함수 (showLoading: 로딩 표시 여부)
  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);

      // 사용자 프로필 및 어르신 정보 조회
      const [profile, elderlyResponse] = await Promise.all([
        usersApi.getMyProfile(),
        guardiansApi.getMyElderly()
      ]);

      setUserProfile(profile);
      setElderlyData(elderlyResponse);

      if (elderlyResponse) {
        const elderlyId = elderlyResponse.elderlyId;
        // 통계 및 차트를 위해 넉넉하게 최근 20건 조회
        const callsResponse = await callReviewsApi.getCallReviewsForGuardian(elderlyId);
        const calls = callsResponse.content;

        setRecentCalls(calls.slice(0, 5)); // 최근 5건 표시

        // 1. Calculate Stats
        let totalSeconds = 0;
        let validDurationCount = 0;

        calls.forEach(call => {
          const secs = parseDurationToSeconds(call.duration);
          if (secs > 0) {
            totalSeconds += secs;
            validDurationCount++;
          }
        });

        const avgDurationStr = validDurationCount > 0
          ? formatSecondsToDuration(totalSeconds / validDurationCount)
          : "0분 0초";

        // Sleep Status from latest call
        const latestCall = calls[0];
        let sleepStatusStr = "미확인";
        let sleepDetailStr = "-";

        if (latestCall?.dailyStatus?.sleep) {
          sleepStatusStr = latestCall.dailyStatus.sleep.levelKorean || "미확인";
          sleepDetailStr = latestCall.dailyStatus.sleep.detail || "-";
        }

        setStats({
          avgDuration: avgDurationStr,
          totalCalls: callsResponse.totalElements || calls.length,
          sleepStatus: sleepStatusStr,
          sleepDetail: sleepDetailStr
        });

        // 2. Process Chart Data (Emotion Trend)
        // Reverse to show chronological order (oldest to newest)
        const trendData = [...calls].reverse().map(call => {
          let score = 2; // Default NEUTRAL
          if (call.emotionLevel === 'GOOD') score = 3;
          if (call.emotionLevel === 'BAD') score = 1;

          return {
            date: call.callAt.split('T')[0].substring(5), // MM-DD
            score: score,
            emotion: call.emotionLevelKorean || '보통',
            fullDate: call.callAt.split('T')[0]
          };
        });
        setChartData(trendData);
      }

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

  if (isLoading) {
    return (
      <DashboardLayout role="guardian" userName="로딩중..." navItems={guardianNavItems}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // 어르신 정보 (단일 객체)
  const parentName = elderlyData?.elderlyName || "정보 없음";

  return (
    <>
      <NoticePopup userRole="GUARDIAN" />
      <DashboardLayout
        role="guardian"
        userName={userProfile?.name || "보호자"}
        navItems={guardianNavItems}
      >
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {userProfile?.name}님, 안녕하세요!
              </h1>
              <p className="text-muted-foreground mt-1">
                {parentName} 어르신의 오늘 하루를 한눈에 확인하세요.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-medium">
              <Activity className="w-4 h-4" />
              <span>실시간 모니터링 중</span>
            </div>
          </div>

          {/* 1. Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Avg Duration */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">평균 통화 시간</p>
                  <h3 className="text-2xl font-bold text-foreground">{stats.avgDuration}</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Clock className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            {/* Total Call Count */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">총 통화 횟수</p>
                  <h3 className="text-2xl font-bold text-foreground">{stats.totalCalls}회</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Phone className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            {/* Sleep Status */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">최근 수면 상태</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-foreground">{stats.sleepStatus}</h3>
                    {stats.sleepStatus === '좋음' && <Smile className="w-5 h-5 text-success" />}
                    {stats.sleepStatus === '나쁨' && <Frown className="w-5 h-5 text-destructive" />}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Moon className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">

            {/* 2. Emotion Trend Chart */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-card h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500" />
                    <CardTitle>감정 변화 추이</CardTitle>
                  </div>
                  <CardDescription>최근 어르신의 감정 상태 변화를 보여줍니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-2">
                    <div className="h-[200px] flex-1 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                          />
                          <YAxis
                            hide={true}
                            domain={[0, 4]}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '5 5' }}
                            formatter={(value: any, name: any, props: any) => {
                              return [props.payload.emotion, '감정 상태'];
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#f43f5e"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorScore)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    {/* 범례: Y축 레벨에 맞춰 배치 (0-4 도메인 기준, 그래프 영역 약 85% 사용) */}
                    <div className="relative h-[170px] text-xs text-muted-foreground w-10 mt-1">
                      {/* score 3 = 좋음: 상단에서 약 18% */}
                      <div className="absolute flex items-center gap-1" style={{ top: '18%' }}>
                        <div className="w-3 h-0.5 bg-rose-500 rounded"></div>
                        <span>좋음</span>
                      </div>
                      {/* score 2 = 보통: 상단에서 약 48% */}
                      <div className="absolute flex items-center gap-1" style={{ top: '48%', transform: 'translateY(-50%)' }}>
                        <div className="w-3 h-0.5 bg-rose-400 rounded"></div>
                        <span>보통</span>
                      </div>
                      {/* score 1 = 나쁨: 상단에서 약 72% */}
                      <div className="absolute flex items-center gap-1" style={{ top: '72%', transform: 'translateY(-50%)' }}>
                        <div className="w-3 h-0.5 bg-rose-300 rounded"></div>
                        <span>나쁨</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 3. Quick Actions & Status */}
            <div className="space-y-4">
              {/* Quick Actions */}
              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">빠른 실행</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => navigate('/guardian/inquiry')}>
                    <MessageSquare className="w-5 h-5 mr-3 text-primary" />
                    상담사에게 문의하기
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => navigate('/guardian/welfare')}>
                    <FileText className="w-5 h-5 mr-3 text-primary" />
                    복지 서비스 확인
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => navigate('/guardian/faq')}>
                    <HelpCircle className="w-5 h-5 mr-3 text-primary" />
                    자주 묻는 질문
                  </Button>
                </CardContent>
              </Card>

              {/* Latest Call Summary - 축소된 UI */}
              {recentCalls.length > 0 && (
                <div
                  className="p-3 rounded-lg bg-primary/10 cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => navigate(`/guardian/calls/${recentCalls[0].callId}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">최근 통화</p>
                        <p className="text-xs text-muted-foreground">{recentCalls[0].callAt.split('T')[0]}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 pl-11">
                    {recentCalls[0].summary || '요약 없음'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 4. Recent Calls Table */}
          <Card className="border-0 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>최근 통화 기록</CardTitle>
                <CardDescription>어르신과의 최근 대화 내역입니다.</CardDescription>
              </div>
              <Button variant="ghost" className="text-primary hover:text-primary/80" onClick={() => navigate('/guardian/calls')}>
                전체보기 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentCalls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  통화 기록이 없습니다.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>일시</TableHead>
                      <TableHead>통화시간</TableHead>
                      <TableHead>감정상태</TableHead>
                      <TableHead>요약</TableHead>
                      <TableHead>상담사 코멘트</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCalls.slice(0, 5).map((call) => (
                      <TableRow
                        key={call.callId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/guardian/calls/${call.callId}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <p>{call.callAt?.split('T')[0]}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTimeAMPM(call.callAt)}
                              </p>
                            </div>
                            {call.state === 'ANSWERED' && (
                              <Badge variant="outline" className="animate-pulse text-green-600 border-green-600 text-xs px-1.5 py-0">
                                <Radio className="w-3 h-3 mr-1" />
                                통화 중
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{call.duration}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <EmotionIcon emotion={call.emotionLevel || 'NORMAL'} />
                            <span className="text-sm">
                              {call.emotionLevel?.toUpperCase() === "GOOD" ? "좋음" :
                                call.emotionLevel?.toUpperCase() === "BAD" || call.emotionLevel === "DEPRESSED" ? "주의" : "보통"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="truncate text-sm text-muted-foreground">
                            {call.summary?.length > 30
                              ? call.summary.substring(0, 30) + '...'
                              : call.summary || '요약 없음'}
                          </p>
                        </TableCell>
                        <TableCell>
                          {call.counselorComment ? (
                            <span className="text-xs text-success">작성됨</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
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

export default GuardianDashboard;
