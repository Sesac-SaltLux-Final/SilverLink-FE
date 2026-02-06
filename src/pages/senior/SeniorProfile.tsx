import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Heart,
  User,
  Phone,
  ArrowLeft,
  Clock,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getMySchedule, createScheduleChangeRequest, getMyChangeRequests, CallScheduleResponse, ScheduleChangeRequest } from "@/api/callSchedules";
import { useAuth } from "@/contexts/AuthContext";

const DAY_LABELS: Record<string, string> = {
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
};

const SeniorProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<CallScheduleResponse | null>(null);
  const [requests, setRequests] = useState<ScheduleChangeRequest[]>([]);
  // 변경 요청 폼
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedDays, setSelectedDays] = useState<string[]>(["MON", "WED", "FRI"]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleData, requestsData] = await Promise.all([
        getMySchedule(),
        getMyChangeRequests(),
      ]);
      setSchedule(scheduleData);
      setRequests(requestsData);

      if (scheduleData.preferredCallTime) {
        setSelectedTime(scheduleData.preferredCallTime);
      }
      if (scheduleData.preferredCallDays?.length > 0) {
        setSelectedDays(scheduleData.preferredCallDays);
      }
    } catch (err: any) {
      console.error("Failed to load schedule:", err);
      const message = err.response?.data?.message || err.message || "알 수 없는 오류";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (selectedDays.length === 0) {
      toast.error("통화 요일을 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await createScheduleChangeRequest({
        preferredCallTime: selectedTime,
        preferredCallDays: selectedDays,
      });
      toast.success("변경 요청이 접수되었습니다. 상담사 승인 후 적용됩니다.");
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.message || "변경 요청에 실패했습니다.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasPendingRequest = requests.some(r => r.status === "PENDING");

  // 변경 사항이 있는지 확인 (Dirty Checking)
  const isChanged = schedule ? (
    selectedTime !== schedule.preferredCallTime ||
    JSON.stringify(selectedDays.sort()) !== JSON.stringify([...schedule.preferredCallDays].sort())
  ) : false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background">
      {/* Header */}
      <header className="p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12"
            onClick={() => navigate("/senior")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary flex items-center justify-center">
              <Heart className="w-7 h-7 sm:w-10 sm:h-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">내 정보</h1>
              <p className="text-sm sm:text-base text-muted-foreground">계정 설정</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6">
        <div className="w-full max-w-2xl mx-auto space-y-5">
          {/* Profile Info Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl">프로필 정보</CardTitle>
                  <CardDescription className="text-base">
                    내 계정 정보를 확인하세요
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">이름</Label>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-lg">{user?.name || "어르신"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  휴대폰 번호
                </Label>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-lg">010-****-****</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call Schedule Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Clock className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl">통화 스케줄</CardTitle>
                    <CardDescription className="text-base">
                      원하는 통화 시간과 요일을 선택하고 변경 요청을 보내세요
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">스케줄 정보를 불러올 수 없습니다</p>
                  <p className="text-sm text-red-500 mb-4">{error}</p>
                  <Button variant="outline" size="sm" onClick={loadData}>
                    다시 시도
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        통화 시간
                      </Label>
                      <Select value={selectedTime} onValueChange={setSelectedTime}>
                        <SelectTrigger className="h-14 text-lg">
                          <SelectValue placeholder="시간 선택" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {[
                            "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
                            "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
                            "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
                          ].map((time) => (
                            <SelectItem key={time} value={time} className="text-lg py-3">
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        통화 요일
                      </Label>
                      <div className="flex gap-2">
                        {Object.entries(DAY_LABELS).map(([value, label]) => (
                          <div
                            key={value}
                            onClick={() => {
                              setSelectedDays(prev =>
                                prev.includes(value)
                                  ? prev.filter(d => d !== value)
                                  : [...prev, value]
                              );
                            }}
                            className={`
                              flex-1 cursor-pointer rounded-lg h-12 flex items-center justify-center transition-all border
                              ${selectedDays.includes(value)
                                ? "bg-primary text-primary-foreground font-bold shadow-md border-primary"
                                : "bg-background text-muted-foreground hover:bg-muted border-input"}
                            `}
                          >
                            <span className="text-base">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmitRequest}
                    className="w-full h-14 text-lg font-bold mt-4"
                    size="lg"
                    disabled={submitting || hasPendingRequest || selectedDays.length === 0 || !isChanged}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        요청 중...
                      </>
                    ) : hasPendingRequest ? (
                      "변경 요청 대기 중..."
                    ) : (
                      "스케줄 변경 요청"
                    )}
                  </Button>

                  {hasPendingRequest && (
                    <p className="text-sm text-center text-muted-foreground bg-muted/50 p-2 rounded-lg">
                      * 이미 대기 중인 변경 요청이 있습니다.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Change Request History */}
          {requests.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">변경 요청 내역</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {requests.slice(0, 3).map((req) => (
                  <div key={req.id} className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                      <Badge
                        variant={
                          req.status === "APPROVED" ? "default" :
                            req.status === "REJECTED" ? "destructive" : "secondary"
                        }
                      >
                        {req.status === "APPROVED" ? "승인됨" :
                          req.status === "REJECTED" ? "거절됨" : "대기중"}
                      </Badge>
                    </div>
                    <p className="text-base font-medium">
                      {req.requestedCallTime} / {req.requestedCallDays.map(d => DAY_LABELS[d] || d).join(", ")}
                    </p>
                    {req.rejectReason && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {req.rejectReason}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default SeniorProfile;
