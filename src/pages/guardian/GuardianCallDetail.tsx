import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Smile,
  Meh,
  Frown,
  Utensils,
  Activity,
  Volume2,
  MessageCircle,
  Heart,
  FileText,
  MessageSquare,
  Loader2,
  Radio,
  Moon,
  Shield
} from "lucide-react";
import { guardianNavItems } from "@/config/guardianNavItems";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import callReviewsApi from "@/api/callReviews";
import usersApi from "@/api/users";
import { GuardianCallReviewResponse, MyProfileResponse } from "@/types/api";

const EmotionDisplay = ({ emotion, emotionKorean }: { emotion: string; emotionKorean?: string }) => {
  const config: Record<string, { icon: typeof Smile; color: string; bg: string; label: string }> = {
    GOOD: { icon: Smile, color: "text-success", bg: "bg-success/10", label: "좋음" },
    NORMAL: { icon: Meh, color: "text-muted-foreground", bg: "bg-muted", label: "보통" },
    BAD: { icon: Frown, color: "text-destructive", bg: "bg-destructive/10", label: "주의" },
    DEPRESSED: { icon: Frown, color: "text-destructive", bg: "bg-destructive/10", label: "우울" },
  };
  const { icon: Icon, color, bg, label } = config[emotion?.toUpperCase()] || config.NORMAL;
  const displayLabel = emotionKorean || label;

  return (
    <div className={`p-6 rounded-2xl ${bg}`}>
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-8 h-8 ${color}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">감정 상태</p>
          <p className={`text-2xl font-bold ${color}`}>{displayLabel}</p>
        </div>
      </div>
    </div>
  );
};

interface LiveMessage {
  id: number;
  type: 'PROMPT' | 'REPLY';
  content: string;
  timestamp: Date;
}

const formatTimeAMPM = (date: Date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m} ${ampm}`;
};

const GuardianCallDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<MyProfileResponse | null>(null);
  const [callDetail, setCallDetail] = useState<GuardianCallReviewResponse | null>(null);

  // 실시간 모니터링 상태
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const liveContainerRef = useRef<HTMLDivElement>(null);
  const prevIsCallActiveRef = useRef<boolean | null>(null);

  // 통화 상태 확인
  const isCallActive = callDetail?.state === 'ANSWERED';

  const fetchCallDetail = async (showLoading = true) => {
    if (!id) return;
    try {
      if (showLoading) setIsLoading(true);

      const profile = await usersApi.getMyProfile();
      setUserProfile(profile);

      const callId = parseInt(id);
      const detail = await callReviewsApi.getCallDetailForGuardian(callId);
      setCallDetail(detail);
    } catch (error) {
      console.error('Failed to fetch call detail:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCallDetail();
  }, [id]);

  // 통화 종료 감지 후 데이터 리페치
  useEffect(() => {
    if (!isCallActive && prevIsCallActiveRef.current === true) {
      setTimeout(() => fetchCallDetail(false), 2000);
    }
    prevIsCallActiveRef.current = isCallActive ?? null;
  }, [isCallActive]);

  // 통화 중일 때 5초마다 상태 폴링 (종료 감지)
  useEffect(() => {
    if (!isCallActive || !id) return;
    const interval = setInterval(() => {
      fetchCallDetail(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [isCallActive, id]);

  // 대화 내용 조합 (prompts + responses 시간순 정렬)
  const transcript = useMemo(() => {
    if (!callDetail) return [];
    if (!callDetail.prompts?.length && !callDetail.responses?.length) {
      return [];
    }
    const allMessages = [
      ...(callDetail.prompts || []).map(p => ({
        id: p.promptId,
        type: 'PROMPT' as const,
        content: p.content,
        timestamp: new Date(p.createdAt)
      })),
      ...(callDetail.responses || []).map(r => ({
        id: r.responseId,
        type: 'REPLY' as const,
        content: r.content,
        timestamp: new Date(r.respondedAt),
        danger: r.danger,
        dangerReason: r.dangerReason
      }))
    ];
    return allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [callDetail]);

  const [retryCount, setRetryCount] = useState(0);

  // SSE 연결 (통화 진행 중일 때만)
  useEffect(() => {
    if (!id || !isCallActive) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setSseConnected(false);
      }
      return;
    }

    // 기존 대화 내용을 모니터링 초기 메시지로 설정
    // (재연결 시에는 메시지가 중복 추가되지 않도록, liveMessages가 비어있을 때만 초기화하거나, 
    //  OR: 서버에서 보내주는 데이터가 전체 데이터가 아니므로, 기존 state 유지하면서 연결만 복구)
    if (liveMessages.length === 0) {
      const initialMessages: LiveMessage[] = [
        ...(callDetail?.prompts || []).map(p => ({
          id: p.promptId,
          type: 'PROMPT' as const,
          content: p.content,
          timestamp: new Date(p.createdAt)
        })),
        ...(callDetail?.responses || []).map(r => ({
          id: r.responseId,
          type: 'REPLY' as const,
          content: r.content,
          timestamp: new Date(r.respondedAt)
        }))
      ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setLiveMessages(initialMessages);
    }

    // SSE 연결
    const eventSource = new EventSource(`/api/internal/callbot/calls/${id}/sse`);
    eventSourceRef.current = eventSource;

    // 타임아웃 방지용
    // 45초 동안 메시지가 없으면 재연결 시도 (선택 사항, 일단 에러 핸들링만 강화)

    eventSource.onopen = () => {
      console.log(`✅ [SSE] 연결 성공: callId=${id} (Retry: ${retryCount})`);
      setSseConnected(true);
    };

    eventSource.addEventListener('connect', () => {
      console.log(`🤝 [SSE] 서버 연결 확인됨: callId=${id}`);
    });

    eventSource.addEventListener('prompt', (e: MessageEvent) => {
      console.log(`📤 [SSE] AI 발화 수신: callId=${id}`);
      const newLog: LiveMessage = {
        id: Date.now(),
        type: 'PROMPT',
        content: e.data,
        timestamp: new Date()
      };
      setLiveMessages(prev => [...prev, newLog]);
    });

    eventSource.addEventListener('reply', (e: MessageEvent) => {
      console.log(`📥 [SSE] 어르신 응답 수신: callId=${id}`);
      const newLog: LiveMessage = {
        id: Date.now(),
        type: 'REPLY',
        content: e.data,
        timestamp: new Date()
      };
      setLiveMessages(prev => [...prev, newLog]);
    });

    eventSource.addEventListener('callEnded', () => {
      console.log('Call ended via SSE');
      eventSource.close();
      setSseConnected(false);
      setTimeout(() => fetchCallDetail(false), 2000);
    });

    eventSource.onerror = (e) => {
      console.error(`❌ [SSE] 에러 발생: callId=${id}`, e);
      setSseConnected(false);
      eventSource.close();

      // 재연결 시도 (3초 후)
      if (isCallActive) {
        console.log(`🔄 [SSE] 3초 후 재연결 시도... (Current Retry: ${retryCount})`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 3000);
      }
    };

    return () => {
      console.log(`🔌 [SSE] 연결 종료: callId=${id}`);
      eventSource.close();
      setSseConnected(false);
    };
  }, [id, isCallActive, retryCount]);

  // 모니터링 카드 내부 자동 스크롤
  useEffect(() => {
    if (liveContainerRef.current && isCallActive) {
      liveContainerRef.current.scrollTop = liveContainerRef.current.scrollHeight;
    }
  }, [liveMessages, isCallActive]);

  if (isLoading) {
    return (
      <DashboardLayout role="guardian" userName="로딩중..." navItems={guardianNavItems}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!callDetail) {
    return (
      <DashboardLayout role="guardian" userName={userProfile?.name || "보호자"} navItems={guardianNavItems}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">통화 기록을 찾을 수 없습니다.</p>
          <Button onClick={() => navigate("/guardian/calls")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // 어르신 이름
  const elderlyDisplayName = callDetail.elderlyName || '어르신';

  // 감정 상태 추출
  const emotion = callDetail.emotionLevel?.toUpperCase() || 'NORMAL';
  const emotionKorean = callDetail.emotionLevelKorean;

  // 날짜 파싱
  const callDate = callDetail.callAt ? new Date(callDetail.callAt) : null;
  const formattedDate = callDate ? callDate.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : '-';
  const formattedTime = callDate ? callDate.toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit'
  }) : '-';

  // 위험 응답 여부
  const hasRisk = callDetail.hasDangerResponse || false;

  // 리뷰 상태
  const isReviewed = !!callDetail.counselorComment;

  return (
    <DashboardLayout
      role="guardian"
      userName={userProfile?.name || "보호자"}
      navItems={guardianNavItems}
    >
      <div className="space-y-6">
        {/* Back Button & Header */}
        <div>
          <Button
            variant="ghost"
            className="mb-4 -ml-2"
            onClick={() => navigate("/guardian/calls")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            통화 기록으로 돌아가기
          </Button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {elderlyDisplayName}님 통화 상세 기록
                </h1>
                {isCallActive && (
                  <Badge variant="outline" className="animate-pulse text-green-600 border-green-600">
                    <Radio className="w-3 h-3 mr-1" />
                    통화 중
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formattedDate}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formattedTime}
                </span>
                <Badge variant="secondary">{callDetail.duration}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* 실시간 모니터링 카드 - 통화 진행 중일 때만 표시 */}
            {isCallActive && (
              <Card className="shadow-card border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Radio className="w-5 h-5 text-primary" />
                      실시간 통화 모니터링
                    </CardTitle>
                    {sseConnected && (
                      <Badge variant="outline" className="animate-pulse text-red-600 border-red-600">
                        ● Live
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    실시간으로 통화 내용을 확인하고 있습니다
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div ref={liveContainerRef} className="bg-secondary/30 rounded-xl p-4 h-[400px] overflow-y-auto">
                    <div className="space-y-3">
                      {liveMessages.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          대화 내용을 기다리고 있습니다...
                        </div>
                      ) : (
                        liveMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.type === 'PROMPT' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div className="max-w-[80%]">
                              <div
                                className={`rounded-lg p-3 ${msg.type === 'PROMPT'
                                  ? 'bg-primary/10 text-foreground'
                                  : 'bg-primary text-primary-foreground'
                                  }`}
                              >
                                <div className="text-xs opacity-70 mb-1">
                                  {msg.type === 'PROMPT' ? 'AI 상담봇' : elderlyDisplayName}
                                </div>
                                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                              </div>
                              <div className="text-[11px] opacity-50 mt-1 text-right">
                                {formatTimeAMPM(msg.timestamp)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Card */}
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  통화 요약
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed">
                  {callDetail.summary || "요약 정보가 없습니다."}
                </p>
              </CardContent>
            </Card>

            {/* Audio Player */}
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-primary" />
                  통화 녹음
                </CardTitle>
                <CardDescription>AI 안부 전화 녹음을 들어보세요</CardDescription>
              </CardHeader>
              <CardContent>
                {callDetail.isAccessGranted === false ? (
                  <div className="bg-secondary/30 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2">
                      <Shield className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">접근 권한이 필요합니다</h3>
                    <p className="text-muted-foreground text-sm max-w-xs">
                      통화 녹음 및 상세 내용을 확인하려면<br />
                      어르신의 민감 정보 조회 동의가 필요합니다.
                    </p>
                  </div>
                ) : callDetail.recordingUrl ? (
                  <div className="bg-secondary/50 rounded-xl p-4">
                    <audio
                      controls
                      className="w-full"
                      src={callDetail.recordingUrl}
                    >
                      브라우저가 오디오 재생을 지원하지 않습니다.
                    </audio>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      통화 시간: {callDetail.duration}
                    </p>
                  </div>
                ) : (
                  <div className="bg-secondary/50 rounded-xl p-6 text-center">
                    <Volume2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">녹음 파일이 없습니다.</p>
                    {isCallActive && (
                      <p className="text-xs text-muted-foreground mt-1">
                        통화 종료 후 녹음 파일이 생성됩니다.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transcript - 통화 종료 후에만 표시 */}
            {!isCallActive && (
              <Card className="shadow-card border-0">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    대화 내용
                  </CardTitle>
                  <CardDescription>AI와 어르신의 대화 기록입니다</CardDescription>
                </CardHeader>
                <CardContent>
                  {callDetail.isAccessGranted === false ? (
                    <div className="bg-secondary/30 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2">
                        <Shield className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold">접근 권한이 필요합니다</h3>
                      <p className="text-muted-foreground text-sm max-w-xs">
                        상세 대화 내용을 확인하려면<br />
                        어르신의 민감 정보 조회 동의가 필요합니다.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transcript.length > 0 ? (
                        transcript.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.type === 'PROMPT' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div className="max-w-[80%]">
                              <div
                                className={`rounded-lg p-3 ${msg.type === 'PROMPT'
                                  ? 'bg-primary/10 text-foreground'
                                  : 'bg-primary text-primary-foreground'
                                  }`}
                              >
                                <div className="text-xs opacity-70 mb-1">
                                  {msg.type === 'PROMPT' ? 'AI 상담봇' : elderlyDisplayName}
                                </div>
                                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                              </div>
                              <div className="text-[11px] opacity-50 mt-1 text-right">
                                {formatTimeAMPM(msg.timestamp)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          대화 내용이 없습니다.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Emotion */}
            <EmotionDisplay emotion={emotion} emotionKorean={emotionKorean} />

            {/* Status Cards */}
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg">오늘의 상태</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {callDetail.isAccessGranted === false ? (
                  <div className="bg-secondary/30 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2">
                    <Shield className="w-8 h-8 text-muted-foreground mb-1" />
                    <p className="text-muted-foreground text-sm">
                      민감 정보 조회 권한이<br />필요합니다.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Meal Status */}
                    <div className="p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Utensils className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">식사</span>
                      </div>
                      <p className={`text-sm font-medium ${callDetail.dailyStatus?.meal?.taken === true ? 'text-success' :
                        callDetail.dailyStatus?.meal?.taken === false ? 'text-warning' :
                          'text-muted-foreground'
                        }`}>
                        {callDetail.dailyStatus?.meal?.status || '미확인'}
                      </p>
                    </div>

                    {/* Health Status */}
                    <div className="p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4 text-red-500" />
                        <span className="font-medium">건강</span>
                      </div>
                      <p className={`text-sm font-medium ${callDetail.dailyStatus?.health?.level === 'GOOD' ? 'text-success' :
                        callDetail.dailyStatus?.health?.level === 'NORMAL' ? 'text-warning' :
                          callDetail.dailyStatus?.health?.level === 'BAD' ? 'text-destructive' :
                            'text-muted-foreground'
                        }`}>
                        {callDetail.dailyStatus?.health?.levelKorean || '미확인'}
                      </p>
                      {callDetail.dailyStatus?.health?.detail && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {callDetail.dailyStatus.health.detail}
                        </p>
                      )}
                    </div>

                    {/* Sleep Status */}
                    <div className="p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Moon className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium">수면</span>
                      </div>
                      <p className={`text-sm font-medium ${callDetail.dailyStatus?.sleep?.level === 'GOOD' ? 'text-success' :
                        callDetail.dailyStatus?.sleep?.level === 'NORMAL' ? 'text-warning' :
                          callDetail.dailyStatus?.sleep?.level === 'BAD' ? 'text-destructive' :
                            'text-muted-foreground'
                        }`}>
                        {callDetail.dailyStatus?.sleep?.levelKorean || '미확인'}
                      </p>
                      {callDetail.dailyStatus?.sleep?.detail && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {callDetail.dailyStatus.sleep.detail}
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Risk Response Status */}
                    <div className="p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-primary" />
                        <span className="font-medium">위험 응답</span>
                      </div>
                      <p className={`font-medium ${hasRisk ? 'text-destructive' : 'text-success'}`}>
                        {hasRisk ? '위험 응답 감지됨' : '이상 없음'}
                      </p>
                    </div>

                    {/* Review Status */}
                    <div className="p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-info" />
                          <span className="font-medium">리뷰 상태</span>
                        </div>
                      </div>
                      <p className={`font-medium ${isReviewed ? 'text-success' : 'text-warning'}`}>
                        {isReviewed ? '리뷰 완료' : '리뷰 대기'}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Counselor Comment (Read-only) */}
            {callDetail.counselorComment && (
              <Card className="shadow-card border-0">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    상담사 코멘트
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm whitespace-pre-wrap">{callDetail.counselorComment}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GuardianCallDetail;
