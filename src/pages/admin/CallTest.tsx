import { useState, useEffect, useRef } from "react";
import { Phone, Loader2, CheckCircle, XCircle, AlertCircle, Radio } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { adminNavItems } from "@/config/adminNavItems";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

interface TestResult {
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: any;
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

const CallTest = () => {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("+821012345678");
  const [elderlyName, setElderlyName] = useState("테스트 어르신");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  
  // 실시간 모니터링 상태
  const [activeCallId, setActiveCallId] = useState<number | null>(null);
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const liveContainerRef = useRef<HTMLDivElement>(null);

  const handleTestCall = async () => {
    setIsLoading(true);
    setResult(null);
    setLiveMessages([]);
    setActiveCallId(null);

    try {
      // Python AI의 call API 호출 (배포 환경변수 지원)
      const aiApiBaseUrl = import.meta.env.VITE_AI_API_BASE_URL || '';
      const response = await fetch(`${aiApiBaseUrl}/api/callbot/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elderly_id: 682, // 테스트용 ID
          elderly_name: elderlyName,
          phone_number: phoneNumber,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          status: 'success',
          message: '통화 요청이 성공적으로 전송되었습니다!',
          data: data,
        });
        
        // callId가 있으면 실시간 모니터링 시작
        if (data.call_id) {
          setActiveCallId(data.call_id);
          setIsMonitoring(true);
        }
      } else {
        setResult({
          status: 'error',
          message: data.detail || '통화 요청 실패',
          data: data,
        });
      }
    } catch (error: any) {
      setResult({
        status: 'error',
        message: error.message || '네트워크 오류가 발생했습니다',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // SSE 연결 관리
  useEffect(() => {
    if (!activeCallId || !isMonitoring) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setSseConnected(false);
      }
      return;
    }

    // SSE 연결 - CloudFront 우회하고 ALB로 직접 연결
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const sseUrl = `${apiBaseUrl}/api/internal/callbot/calls/${activeCallId}/sse`;
    console.log(`🔌 [SSE] 연결 시도: ${sseUrl}`);
    
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log(`✅ [SSE] 연결 성공: callId=${activeCallId}, readyState=${eventSource.readyState}`);
      setSseConnected(true);
    };

    eventSource.addEventListener('connect', () => {
      console.log(`🤝 [SSE] 서버 연결 확인됨: callId=${activeCallId}`);
    });

    eventSource.addEventListener('prompt', (e: MessageEvent) => {
      console.log(`📤 [SSE] AI 발화 수신: callId=${activeCallId}, data=${e.data.substring(0, 50)}...`);
      const newLog: LiveMessage = {
        id: Date.now(),
        type: 'PROMPT',
        content: e.data,
        timestamp: new Date()
      };
      setLiveMessages(prev => [...prev, newLog]);
    });

    eventSource.addEventListener('reply', (e: MessageEvent) => {
      console.log(`📥 [SSE] 어르신 응답 수신: callId=${activeCallId}, data=${e.data.substring(0, 50)}...`);
      const newLog: LiveMessage = {
        id: Date.now(),
        type: 'REPLY',
        content: e.data,
        timestamp: new Date()
      };
      setLiveMessages(prev => [...prev, newLog]);
    });

    eventSource.addEventListener('callEnded', () => {
      console.log('✅ [SSE] 통화 종료 이벤트 수신');
      eventSource.close();
      setSseConnected(false);
      setIsMonitoring(false);
    });

    eventSource.onerror = (e) => {
      console.error(`❌ [SSE] 에러 발생: callId=${activeCallId}, readyState=${eventSource.readyState}`, e);
      setSseConnected(false);
      eventSource.close();
    };

    return () => {
      console.log(`🔌 [SSE] 컴포넌트 언마운트로 연결 종료: callId=${activeCallId}`);
      eventSource.close();
      setSseConnected(false);
    };
  }, [activeCallId, isMonitoring]);

  // 자동 스크롤
  useEffect(() => {
    if (liveContainerRef.current && isMonitoring) {
      liveContainerRef.current.scrollTop = liveContainerRef.current.scrollHeight;
    }
  }, [liveMessages, isMonitoring]);

  return (
    <DashboardLayout
      role="admin"
      userName={user?.name || "관리자"}
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">CallBot 테스트</h1>
          <p className="text-muted-foreground mt-1">
            AI 통화 시스템을 테스트합니다
          </p>
        </div>

        {/* Test Form */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              통화 테스트
            </CardTitle>
            <CardDescription>
              전화번호를 입력하고 테스트 통화를 시작하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 어르신 이름 */}
            <div className="space-y-2">
              <Label htmlFor="elderlyName">어르신 이름</Label>
              <Input
                id="elderlyName"
                value={elderlyName}
                onChange={(e) => setElderlyName(e.target.value)}
                placeholder="테스트 어르신"
              />
            </div>

            {/* 전화번호 */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">전화번호 (E.164 형식)</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+821012345678"
              />
              <p className="text-xs text-muted-foreground">
                형식: +82 (국가코드) + 10 (지역번호 0 제외) + 나머지 번호
              </p>
            </div>

            {/* 테스트 버튼 */}
            <Button
              onClick={handleTestCall}
              disabled={isLoading || !phoneNumber}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  통화 요청 중...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  통화 요청하기
                </>
              )}
            </Button>

            {/* 결과 표시 */}
            {result && (
              <Alert
                className={
                  result.status === 'success'
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                }
              >
                <div className="flex items-start gap-2">
                  {result.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription className="text-sm">
                      <p className="font-medium mb-2">{result.message}</p>
                      {result.data && (
                        <div className="mt-2 p-2 bg-white rounded text-xs font-mono">
                          <pre>{JSON.stringify(result.data, null, 2)}</pre>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 실시간 모니터링 카드 */}
        {isMonitoring && activeCallId && (
          <Card className="shadow-card border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Radio className="w-5 h-5 text-primary" />
                  실시간 통화 모니터링
                </CardTitle>
                <div className="flex items-center gap-2">
                  {sseConnected && (
                    <Badge variant="outline" className="animate-pulse text-red-600 border-red-600">
                      ● Live
                    </Badge>
                  )}
                  <Badge variant="secondary">Call ID: {activeCallId}</Badge>
                </div>
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
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p>대화 내용을 기다리고 있습니다...</p>
                      </div>
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
                              {msg.type === 'PROMPT' ? 'AI 상담봇' : elderlyName}
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
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsMonitoring(false);
                    if (eventSourceRef.current) {
                      eventSourceRef.current.close();
                      eventSourceRef.current = null;
                      setSseConnected(false);
                    }
                  }}
                >
                  모니터링 중지
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 사용 안내 */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-info" />
              사용 안내
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">1. 전화번호 형식</p>
              <p>E.164 형식으로 입력해야 합니다 (예: +821012345678)</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">2. 통화 흐름</p>
              <p>
                통화 요청 → SQS 큐 → Worker 처리 → Twilio 발신 → AI 응답
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">3. 예상 소요 시간</p>
              <p>통화 요청 후 약 5-10초 내에 전화가 옵니다</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">4. 실시간 모니터링</p>
              <p>
                통화 중 내용은 "통화 모니터링" 메뉴에서 실시간으로 확인할 수 있습니다
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CallTest;
