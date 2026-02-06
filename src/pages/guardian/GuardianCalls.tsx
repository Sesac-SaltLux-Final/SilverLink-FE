import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Smile,
  Meh,
  Frown,
  Phone,
  Loader2,
  ChevronDown,
  X
} from "lucide-react";
import { guardianNavItems } from "@/config/guardianNavItems";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import callReviewsApi from "@/api/callReviews";
import guardiansApi from "@/api/guardians";
import usersApi from "@/api/users";
import { GuardianCallReviewResponse, MyProfileResponse } from "@/types/api";

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

const GuardianCalls = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [callRecords, setCallRecords] = useState<GuardianCallReviewResponse[]>([]);
  const [userProfile, setUserProfile] = useState<MyProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elderlyId, setElderlyId] = useState<number | null>(null);
  const [elderlyName, setElderlyName] = useState<string>("");

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  // 데이터 로드 함수
  const fetchCallRecords = useCallback(async (page: number = 0) => {
    if (!elderlyId) return;

    try {
      setIsLoading(true);
      const callsResponse = await callReviewsApi.getCallReviewsForGuardian(elderlyId, { page, size: pageSize });

      if (callsResponse) {
        setCallRecords(callsResponse.content || []);
        setTotalPages(callsResponse.totalPages || 1);
        setTotalElements(callsResponse.totalElements || 0);
        setCurrentPage(page);
      }
    } catch (error: any) {
      console.error('Failed to fetch call records:', error);
      setError(error.response?.data?.message || '데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [elderlyId, pageSize]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [profile, elderlyResponse] = await Promise.all([
          usersApi.getMyProfile(),
          guardiansApi.getMyElderly()
        ]);

        setUserProfile(profile);

        if (elderlyResponse && elderlyResponse.elderlyId) {
          setElderlyId(elderlyResponse.elderlyId);
          setElderlyName(elderlyResponse.elderlyName || "");
          const callsResponse = await callReviewsApi.getCallReviewsForGuardian(elderlyResponse.elderlyId, { page: 0, size: pageSize });

          if (callsResponse) {
            setCallRecords(callsResponse.content || []);
            setTotalPages(callsResponse.totalPages || 1);
            setTotalElements(callsResponse.totalElements || 0);
          }
        } else {
          setError('연결된 어르신이 없습니다');
        }
      } catch (error: any) {
        console.error('Failed to fetch call records:', error);
        setError(error.response?.data?.message || '데이터를 불러오는데 실패했습니다');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [pageSize]);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 0 && newPage < totalPages && !isLoading) {
      fetchCallRecords(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages, isLoading, fetchCallRecords]);

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
    { value: "completed", label: "작성됨" },
    { value: "pending", label: "미작성" }
  ];

  // 필터링
  const filteredCalls = useMemo(() => {
    return callRecords.filter((call) => {
      const matchesSearch = !searchTerm ||
        call.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.callAt?.includes(searchTerm);
      const matchesEmotion = emotionFilter === "all" ||
        call.emotionLevel?.toUpperCase() === emotionFilter ||
        (emotionFilter === "BAD" && call.emotionLevel === "DEPRESSED");
      const matchesReview = reviewFilter === "all" ||
        (reviewFilter === "completed" && call.counselorComment) ||
        (reviewFilter === "pending" && !call.counselorComment);
      return matchesSearch && matchesEmotion && matchesReview;
    });
  }, [callRecords, searchTerm, emotionFilter, reviewFilter]);

  const hasActiveFilters = emotionFilter !== "all" || reviewFilter !== "all";

  const resetFilters = () => {
    setSearchTerm("");
    setEmotionFilter("all");
    setReviewFilter("all");
  };

  if (isLoading) {
    return (
      <DashboardLayout role="guardian" userName="로딩중..." navItems={guardianNavItems}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      role="guardian"
      userName={userProfile?.name || "보호자"}
      navItems={guardianNavItems}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">통화 기록</h1>
          <p className="text-muted-foreground mt-1">
            {elderlyName ? `${elderlyName} 어르신의 AI 안부 통화 기록입니다` : '어르신과의 통화 기록을 확인하세요'}
          </p>
        </div>

        {/* Search Bar */}
        <Card className="shadow-card border-0">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="날짜 또는 요약 내용으로 검색..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md flex items-center gap-1"
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
            {error ? (
              <div className="text-center py-12">
                <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">오류 발생</h3>
                <p className="text-muted-foreground">{error}</p>
              </div>
            ) : filteredCalls.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {callRecords.length === 0 ? '통화 기록이 없습니다' : '검색 결과가 없습니다'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {callRecords.length === 0 ? 'AI 안부 통화 후 기록이 표시됩니다' : '다른 검색어나 필터를 사용해보세요'}
                </p>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto">
                    <X className="w-4 h-4" />
                    필터 초기화
                  </button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>일시</TableHead>
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
                      onClick={() => navigate(`/guardian/calls/${call.callId}`)}
                    >
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
                              call.emotionLevel?.toUpperCase() === "BAD" || call.emotionLevel === "DEPRESSED" ? "주의" : "보통"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        <p className="truncate text-sm text-muted-foreground">
                          {call.summary?.length > 40
                            ? call.summary.substring(0, 40) + '...'
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

        {/* Pagination */}
        {!error && totalElements > 0 && (
          <div className="flex flex-col items-center gap-3 mt-6">
            <div className="text-sm text-muted-foreground">
              전체 {totalElements}건 | {currentPage + 1} / {totalPages} 페이지
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0 || isLoading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                이전
              </Button>

              <div className="flex items-center gap-1">
                {totalPages > 0 && Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (currentPage < 3) {
                    pageNum = i;
                  } else if (currentPage > totalPages - 4) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isLoading}
                      className="w-10"
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1 || isLoading}
              >
                다음
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default GuardianCalls;
