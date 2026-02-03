import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Calendar,
  Clock,
  ChevronRight,
  Smile,
  Meh,
  Frown,
  Phone,
  Loader2,
  Radio,
  ChevronDown,
  X
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { counselorNavItems } from "@/config/counselorNavItems";
import callReviewsApi from "@/api/callReviews";
import { CallRecordSummaryResponse } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

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

// duration 문자열("분:초")을 초 단위로 변환
const parseDurationToSeconds = (duration: string): number => {
  if (!duration) return 0;
  const parts = duration.split(':');
  if (parts.length === 2) {
    const [min, sec] = parts.map(p => parseInt(p, 10) || 0);
    return min * 60 + sec;
  }
  return 0;
};

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

// 필터 헤더 컴포넌트
const FilterableHeader = ({
  label,
  value,
  options,
  onSelect,
  className = ""
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  className?: string;
}) => {
  const isFiltered = value !== "all";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-1 text-left font-medium text-sm hover:text-primary transition-colors ${isFiltered ? 'text-primary' : ''} ${className}`}
        >
          {label}
          {isFiltered && <span className="text-xs">✓</span>}
          <ChevronDown className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[120px]">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={value === option.value ? 'bg-muted' : ''}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const CounselorCalls = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [elderlyFilter, setElderlyFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [emotionFilter, setEmotionFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [callRecords, setCallRecords] = useState<CallRecordSummaryResponse[]>([]);
  const { user } = useAuth();

  const fetchCallRecords = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const callsResponse = await callReviewsApi.getCallRecordsForCounselor({ size: 200 });
      setCallRecords(callsResponse.content);
    } catch (error) {
      console.error('Failed to fetch call records:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // 최초 로딩
  useEffect(() => {
    fetchCallRecords();
  }, [fetchCallRecords]);

  // 10초마다 자동 갱신 (통화 시작/종료 실시간 반영)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCallRecords(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchCallRecords]);

  // 페이지가 다시 보일 때 (상세에서 돌아올 때) 데이터 새로고침
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCallRecords(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchCallRecords]);

  // 어르신 목록 (고유값 추출)
  const elderlyOptions = useMemo(() => {
    const uniqueNames = [...new Set(callRecords.map(c => c.elderlyName).filter(Boolean))];
    return [
      { value: "all", label: "전체" },
      ...uniqueNames.map(name => ({ value: name, label: name }))
    ];
  }, [callRecords]);

  // 날짜 목록 (고유값 추출)
  const dateOptions = useMemo(() => {
    const uniqueDates = [...new Set(callRecords.map(c => c.callAt?.split('T')[0]).filter(Boolean))];
    uniqueDates.sort((a, b) => b.localeCompare(a)); // 최신순 정렬
    return [
      { value: "all", label: "전체" },
      ...uniqueDates.map(date => ({ value: date, label: date }))
    ];
  }, [callRecords]);

  // 감정 옵션
  const emotionOptions = [
    { value: "all", label: "전체" },
    { value: "GOOD", label: "좋음" },
    { value: "NORMAL", label: "보통" },
    { value: "BAD", label: "주의" }
  ];

  // 코멘트 옵션
  const reviewOptions = [
    { value: "all", label: "전체" },
    { value: "completed", label: "작성 완료" },
    { value: "pending", label: "미작성" }
  ];

  const filteredCalls = useMemo(() => {
    return callRecords.filter((call) => {
      const matchesSearch = !searchTerm ||
        call.elderlyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.summaryPreview?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesElderly = elderlyFilter === "all" || call.elderlyName === elderlyFilter;
      const matchesDate = dateFilter === "all" || call.callAt?.startsWith(dateFilter);
      const matchesEmotion = emotionFilter === "all" || call.emotionLevel?.toUpperCase() === emotionFilter;
      const matchesReview = reviewFilter === "all" ||
        (reviewFilter === "completed" && call.reviewed) ||
        (reviewFilter === "pending" && !call.reviewed);
      return matchesSearch && matchesElderly && matchesDate && matchesEmotion && matchesReview;
    });
  }, [callRecords, searchTerm, elderlyFilter, dateFilter, emotionFilter, reviewFilter]);

  // 필터가 활성화되어 있는지 확인
  const hasActiveFilters = elderlyFilter !== "all" || dateFilter !== "all" || emotionFilter !== "all" || reviewFilter !== "all";

  // 필터 초기화 함수
  const resetFilters = () => {
    setSearchTerm("");
    setElderlyFilter("all");
    setDateFilter("all");
    setEmotionFilter("all");
    setReviewFilter("all");
  };

  // 통계 계산
  const today = new Date().toISOString().split('T')[0];
  const todayCalls = callRecords.filter(c => c.callAt?.startsWith(today)).length;
  const totalSeconds = callRecords.reduce((sum, c) => sum + parseDurationToSeconds(c.duration), 0);
  const avgDurationMinutes = callRecords.length > 0
    ? Math.round(totalSeconds / callRecords.length / 60)
    : 0;
  const badEmotionCount = callRecords.filter(c =>
    c.emotionLevel?.toUpperCase() === 'BAD' || c.hasDangerResponse
  ).length;

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
    <DashboardLayout
      role="counselor"
      userName={user?.name || "상담사"}
      navItems={counselorNavItems}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">통화 기록 통계</h1>
            <p className="text-muted-foreground mt-1">어르신들과의 통화 내역을 확인하세요</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{callRecords.length}</p>
                  <p className="text-sm text-muted-foreground">전체 통화</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/10">
                  <Calendar className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayCalls}</p>
                  <p className="text-sm text-muted-foreground">오늘 통화</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-info/10">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{avgDurationMinutes}분</p>
                  <p className="text-sm text-muted-foreground">평균 통화시간</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <Frown className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{badEmotionCount}</p>
                  <p className="text-sm text-muted-foreground">주의 필요</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="shadow-card border-0">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="어르신 이름, 요약 내용으로 검색..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md flex items-center gap-1"
                  title="필터 초기화"
                >
                  <X className="w-4 h-4" />
                  필터 초기화
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Call Records Table */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle>통화 기록 목록</CardTitle>
            <CardDescription>헤더를 클릭하여 필터링하세요</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCalls.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {callRecords.length === 0 ? '통화 기록이 없습니다.' : '조건에 맞는 통화 기록이 없습니다.'}
                </p>
                {hasActiveFilters && callRecords.length > 0 && (
                  <button
                    onClick={resetFilters}
                    className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <X className="w-4 h-4" />
                    필터 초기화
                  </button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <FilterableHeader
                        label="어르신"
                        value={elderlyFilter}
                        options={elderlyOptions}
                        onSelect={setElderlyFilter}
                      />
                    </TableHead>
                    <TableHead>
                      <FilterableHeader
                        label="일시"
                        value={dateFilter}
                        options={dateOptions}
                        onSelect={setDateFilter}
                      />
                    </TableHead>
                    <TableHead>통화시간</TableHead>
                    <TableHead>
                      <FilterableHeader
                        label="감정상태"
                        value={emotionFilter}
                        options={emotionOptions}
                        onSelect={setEmotionFilter}
                      />
                    </TableHead>
                    <TableHead>요약</TableHead>
                    <TableHead>
                      <FilterableHeader
                        label="상담사 코멘트"
                        value={reviewFilter}
                        options={reviewOptions}
                        onSelect={setReviewFilter}
                      />
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map((call) => (
                    <TableRow
                      key={call.callId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/counselor/calls/${call.callId}`)}
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
                              call.emotionLevel?.toUpperCase() === "NORMAL" ? "보통" : "주의"}
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
  );
};

export default CounselorCalls;
