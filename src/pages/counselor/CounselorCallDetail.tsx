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
  AlertTriangle,
  Volume2,
  MessageCircle,
  Heart,
  FileText,
  MessageSquare,
  User,
  Loader2,
  Radio,
  Edit3,
  Save,
  Moon
} from "lucide-react";
import { counselorNavItems } from "@/config/counselorNavItems";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea"; // Assuming you have this component or standard textarea
import { useToast } from "@/components/ui/use-toast"; // Using local toast in future if available, or just alert? Assuming useToast hook exists or I'll use standard alert for now if not found in imports previously, wait, I saw Toaster in previous history. I'll use standard window.alert or add Toaster to main.
// Actually, I should check if `useToast` exists. In `CounselorCallDetail.tsx` imports, it wasn't there.
// I'll stick to simple state management for now, or just `alert` if needed, but better to use UI.
// Let's use `Label` and `Textarea` from shadcn/ui if available. I see `Input` was used in `CounselorCalls.tsx`. I'll assume `Textarea` exists or use standard one.
// Wait, I don't see `Textarea` imported in the original file. I'll use standard `textarea` with Tailwind classes.

import callReviewsApi from "@/api/callReviews";
import usersApi from "@/api/users";
import { CallRecordDetailResponse, MyProfileResponse } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";

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

interface ConversationMessage {
  id: number;
  type: 'prompt' | 'response';
  content: string;
  timestamp: Date;
  isDanger?: boolean;
  dangerReason?: string;
  isLive?: boolean;
}

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

const CounselorCallDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [callDetail, setCallDetail] = useState<CallRecordDetailResponse | null>(null);
  const { user } = useAuth();

  // 실시간 모니터링 상태 (통화 진행 중일 때 자동 시작)
  const isCallActive = callDetail?.state === 'ANSWERED';
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const liveScrollRef = useRef<HTMLDivElement>(null);
  const liveContainerRef = useRef<HTMLDivElement>(null);
  const prevIsCallActiveRef = useRef<boolean | null>(null);

  // 상담 일지(리뷰) 상태
  const [reviewComment, setReviewComment] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);

  const fetchCallDetail = async (showLoading = true) => {
    if (!id) return;
    try {
      if (showLoading) setIsLoading(true);
      const detail = await callReviewsApi.getCallRecordDetail(parseInt(id));
      setCallDetail(detail);
      // 기존 리뷰가 있으면 코멘트 초기화
      if (detail.review?.comment) {
        setReviewComment(detail.review.comment);
      }
    } catch (error) {
      console.error('Failed to fetch call detail:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // 상담 일지 저장
  const handleSaveReview = async () => {
    if (!callDetail || !id || !reviewComment.trim()) return;

    try {
      setIsSavingReview(true);

      if (callDetail.review) {
        // 기존 리뷰 수정
        await callReviewsApi.updateReview(callDetail.review.reviewId, {
          callId: parseInt(id),
          comment: reviewComment.trim(),
          urgent: false
        });
      } else {
        // 새 리뷰 생성
        await callReviewsApi.createReview({
          callId: parseInt(id),
          comment: reviewComment.trim(),
          urgent: false
        });
      }

      // 데이터 리프레시
      await fetchCallDetail(false);
      setIsEditingReview(false); // 저장 후 보기 모드로 전환
      alert('상담 일지가 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save review:', error);
      alert('상담 일지 저장에 실패했습니다.');
    } finally {
      setIsSavingReview(false);
    }
  };

  useEffect(() => {
    fetchCallDetail();
  }, [id]);

  // 통화 종료 감지 후 데이터 리페치
  useEffect(() => {
    if (!isCallActive && prevIsCallActiveRef.current === true) {
      // 통화가 진행 중이었다가 종료된 경우 → 데이터 리페치
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

  const [retryCount, setRetryCount] = useState(0);

  // SSE 연결은 isCallActive에 연동 (모니터링 중지해도 SSE는 유지)
  useEffect(() => {
    if (!id || !isCallActive) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setSseConnected(false);
      }
      return;
    }

    // 기존 대화 내용(prompts + responses)을 모니터링 초기 메시지로 설정
    // 재연결 시에는 초기화하지 않음 (중복 방지 및 기존 대화 유지)
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

    eventSource.onopen = () => {
      console.log(`✅ [SSE] 연결 성공: callId=${id} (Retry: ${retryCount})`);
      setSseConnected(true);
    };

    eventSource.addEventListener('connect', () => {
      console.log(`🤝 [SSE] 서버 연결 확인됨: callId=${id}`);
    });

    eventSource.addEventListener('prompt', (e: MessageEvent) => {
      console.log(`📤 [SSE] AI 발화 수신: callId=${id}, data=${e.data.substring(0, 50)}...`);
      const newLog: LiveMessage = {
        id: Date.now(),
        type: 'PROMPT',
        content: e.data,
        timestamp: new Date()
      };
      setLiveMessages(prev => [...prev, newLog]);
    });

    eventSource.addEventListener('reply', (e: MessageEvent) => {
      console.log(`📥 [SSE] 어르신 응답 수신: callId=${id}, data=${e.data.substring(0, 50)}...`);
      const newLog: LiveMessage = {
        id: Date.now(),
        type: 'REPLY',
        content: e.data,
        timestamp: new Date()
      };
      setLiveMessages(prev => [...prev, newLog]);
    });

    eventSource.addEventListener('emergency', (e: MessageEvent) => {
      console.log(`🚨 [SSE] 긴급 알림 수신: callId=${id}`, e.data);

      // 1. 글로벌 알림 팝업에게 "새 알림이 있다"고 알림 (커스텀 이벤트)
      window.dispatchEvent(new CustomEvent('emergency-alert-sync'));

      // 2. 혹은 직접 토스트 표시 (백업용)
      // alert("🚨 [긴급] 위험 상황이 감지되었습니다! 통화 내용을 확인해주세요."); // 너무 침해적이어서 제거

      fetchCallDetail(false);
    });

    eventSource.addEventListener('callEnded', () => {
      console.log('Call ended via SSE');
      eventSource.close();
      setSseConnected(false);
      setTimeout(() => fetchCallDetail(false), 2000);
    });

    eventSource.onerror = (e) => {
      console.error(`❌ [SSE] 에러 발생: callId=${id}, readyState=${eventSource.readyState}`, e);
      setSseConnected(false);
      eventSource.close();

      // 재연결 시도 (3초 후)
      if (isCallActive) {
        console.log(`🔄 [SSE] 3초 후 재연결 시도... (Current Retry: ${retryCount})`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 3000);
      } else {
        setTimeout(() => fetchCallDetail(false), 2000);
      }
    };

    return () => {
      console.log(`🔌 [SSE] 컴포넌트 언마운트로 연결 종료: callId=${id}`);
      eventSource.close();
      setSseConnected(false);
    };
  }, [id, isCallActive, retryCount]);

  // 모니터링 카드 내부에서만 자동 스크롤 (페이지 스크롤에 영향 없음)
  useEffect(() => {
    if (liveContainerRef.current && isCallActive) {
      liveContainerRef.current.scrollTop = liveContainerRef.current.scrollHeight;
    }
  }, [liveMessages, isCallActive]);

  // 대화 내용 조합 (prompts + responses 시간순 정렬)
  const transcript = useMemo(() => {
    if (!callDetail?.prompts?.length && !callDetail?.responses?.length) {
      return [];
    }
    const allMessages = [
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
        timestamp: new Date(r.respondedAt),
        danger: r.danger,
        dangerReason: r.dangerReason
      }))
    ];
    return allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [callDetail?.prompts, callDetail?.responses]);

  if (isLoading) {
    return (
      <DashboardLayout role="counselor" userName="로딩중..." navItems={counselorNavItems}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!callDetail) {
    return (
      <DashboardLayout role="counselor" userName={user?.name || "상담사"} navItems={counselorNavItems}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">통화 기록을 찾을 수 없습니다.</p>
          <Button onClick={() => navigate("/counselor/calls")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // 어르신 이름 (elderly.name 사용)
  const elderlyDisplayName = callDetail.elderly?.name || '어르신';

  // 감정 상태 추출
  const latestEmotion = callDetail.emotions?.[callDetail.emotions.length - 1];
  const emotion = latestEmotion?.emotionLevel || 'NORMAL';
  const emotionKorean = latestEmotion?.emotionLevelKorean;

  // 날짜/시간 추출
  const callDateTime = new Date(callDetail.callAt);
  const callDate = callDateTime.toLocaleDateString('ko-KR');
  const callTime = callDateTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  // 요약 추출
  const summary = callDetail.summaries?.[0]?.content || '요약 정보가 없습니다.';

  // 위험 응답 여부 (responses에서 danger 필드 확인)
  const hasRisk = callDetail.responses?.some(r => r.danger) || false;

  // 리뷰 상태 (review 여부로 확인)
  const isReviewed = !!callDetail.review;

  return (
    <DashboardLayout
      role="counselor"
      userName={user?.name || "상담사"}
      navItems={counselorNavItems}
    >
      <div className="space-y-6">
        {/* Back Button & Header */}
        <div>
          <Button
            variant="ghost"
            className="mb-4 -ml-2"
            onClick={() => navigate("/counselor/calls")}
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
                  {callDate}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {callTime}
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
                  {summary}
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
                {callDetail.recordingUrl ? (
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
              </CardContent>
            </Card>

            {/* 상담 일지 (Review Journal) */}
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-primary" />
                  상담 일지
                </CardTitle>
                <CardDescription>
                  {callDetail.review ? '작성된 상담 일지입니다.' : '상담 내용을 기록해주세요.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 보기 모드: 리뷰가 있고 편집 중이 아닐 때 */}
                {callDetail.review && !isEditingReview ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <p className="text-sm whitespace-pre-wrap">{callDetail.review.comment}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        마지막 수정: {new Date(callDetail.review.reviewedAt).toLocaleString('ko-KR')}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReviewComment(callDetail.review?.comment || '');
                          setIsEditingReview(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        수정
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* 편집 모드: 리뷰가 없거나 편집 중일 때 */
                  <div className="space-y-4">
                    <textarea
                      className="w-full min-h-[120px] p-3 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="상담 내용을 기록해주세요..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      {callDetail.review && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditingReview(false);
                            setReviewComment(callDetail.review?.comment || '');
                          }}
                        >
                          취소
                        </Button>
                      )}
                      <Button
                        onClick={handleSaveReview}
                        disabled={isSavingReview || !reviewComment.trim()}
                        className="flex items-center gap-2"
                      >
                        {isSavingReview ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        저장
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>


          </div>
        </div>
      </div>
    </DashboardLayout >
  );
};

export default CounselorCallDetail;
