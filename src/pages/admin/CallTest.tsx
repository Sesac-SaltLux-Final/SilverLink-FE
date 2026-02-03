import { useState } from "react";
import { Phone, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { adminNavItems } from "@/config/adminNavItems";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

interface TestResult {
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: any;
}

const CallTest = () => {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("+821012345678");
  const [elderlyName, setElderlyName] = useState("테스트 어르신");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleTestCall = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      // Python AI의 schedule-call API 직접 호출
      const response = await fetch('/api/callbot/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schedule_id: 9999, // 테스트용 ID
          elderly_id: 9999,
          elderly_name: elderlyName,
          phone_number: phoneNumber,
          scheduled_time: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          status: 'success',
          message: '통화 요청이 성공적으로 전송되었습니다!',
          data: data,
        });
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
