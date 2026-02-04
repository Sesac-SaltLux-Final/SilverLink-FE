import { useState, useEffect } from "react";
import {
  Plus,
  Clock,
  CheckCircle2,
  Send,
  MessageSquare,
  Loader2
} from "lucide-react";
import { guardianNavItems } from "@/config/guardianNavItems";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import inquiriesApi from "@/api/inquiries";
import usersApi from "@/api/users";
import { InquiryResponse, MyProfileResponse } from "@/types/api";

const INQUIRY_CATEGORIES = [
  { value: "COMPLAINT", label: "불편사항" },
  { value: "ERROR", label: "오류신고" },
  { value: "SUGGESTION", label: "건의사항" },
  { value: "OTHER", label: "기타문의" },
];

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateString;
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "PENDING":
      return <Badge className="bg-warning/10 text-warning border-0">답변 대기</Badge>;
    case "ANSWERED":
      return <Badge className="bg-success/10 text-success border-0">답변 완료</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const GuardianInquiry = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryResponse | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [inquiries, setInquiries] = useState<InquiryResponse[]>([]);
  const [userProfile, setUserProfile] = useState<MyProfileResponse | null>(null);

  // 새 문의 폼
  // 새 문의 폼
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // 사용자 프로필 조회
      const profile = await usersApi.getMyProfile();
      setUserProfile(profile);

      // 문의 목록 조회
      const inquiriesResponse = await inquiriesApi.getInquiries();
      setInquiries(inquiriesResponse);
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInquiry = async () => {
    if (!newTitle.trim() || !newQuestionText.trim() || !newCategory) {
      toast.error("문의 유형, 제목, 내용을 모두 입력해주세요.");
      return;
    }

    const categoryLabel = INQUIRY_CATEGORIES.find(c => c.value === newCategory)?.label || "문의";
    const fullTitle = `[${categoryLabel}] ${newTitle}`;

    try {
      setIsSubmitting(true);
      await inquiriesApi.createInquiry({
        title: fullTitle,
        questionText: newQuestionText,
      });

      // 목록 새로고침
      await fetchData();

      // 폼 초기화 및 다이얼로그 닫기
      setNewTitle("");
      setNewQuestionText("");
      setNewCategory("");
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create inquiry:', error);
    } finally {
      setIsSubmitting(false);
    }
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

  const waitingCount = inquiries.filter(i => i.status === 'PENDING').length;
  const answeredCount = inquiries.filter(i => i.status === 'ANSWERED').length;

  return (
    <DashboardLayout
      role="guardian"
      userName={userProfile?.name || "보호자"}
      navItems={guardianNavItems}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">1:1 문의</h1>
            <p className="text-muted-foreground mt-1">담당 상담사에게 문의하세요</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                새 문의 작성
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 문의 작성</DialogTitle>
                <DialogDescription>담당 상담사에게 문의를 보냅니다</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>문의 유형</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {INQUIRY_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>제목</Label>
                  <Input
                    placeholder="문의 제목을 입력하세요"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>문의 내용</Label>
                  <Textarea
                    placeholder="문의 내용을 상세히 작성해 주세요"
                    rows={5}
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
                <Button onClick={handleCreateInquiry} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  문의 등록
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inquiries.length}</p>
                  <p className="text-sm text-muted-foreground">전체 문의</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{waitingCount}</p>
                  <p className="text-sm text-muted-foreground">답변 대기</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">{answeredCount}</p>
                  <p className="text-sm text-muted-foreground">답변 완료</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inquiry List */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">문의 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {inquiries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                등록된 문의가 없습니다.
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {inquiries.map((inquiry) => (
                  <AccordionItem key={inquiry.id} value={inquiry.id.toString()}>
                    <AccordionTrigger className="hover:no-underline py-4 px-2">
                      <div className="flex items-center gap-4 w-full pr-4 text-left">
                        <StatusBadge status={inquiry.status} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate text-base">{inquiry.title}</h3>
                        </div>
                        <div className="text-right text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                          <p>{inquiry.elderlyName} 어르신</p>
                          <p>{formatDate(inquiry.createdAt)}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-6 bg-muted/5 border-t">
                      <div className="space-y-6 pt-4">
                        {/* 문의 내용 (Question) */}
                        <div className="flex gap-4">
                          <div className="font-bold text-lg text-muted-foreground w-6">Q.</div>
                          <div className="flex-1 space-y-2">
                            <h4 className="font-medium text-base">{inquiry.title}</h4>
                            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                              {inquiry.questionText}
                            </p>
                          </div>
                        </div>

                        {/* 구분선 */}
                        {inquiry.answerText && <div className="h-px w-full bg-border/50" />}

                        {/* 답변 (Answer) */}
                        {inquiry.answerText ? (
                          <div className="flex gap-4">
                            <div className="text-muted-foreground w-6 flex justify-center">
                              <div className="w-4 h-4 border-l-2 border-b-2 border-muted-foreground/30 translate-y-2 translate-x-1" />
                            </div>
                            <div className="flex-1 bg-muted/30 rounded-lg p-6">
                              <div className="flex items-center gap-2 mb-3">
                                <Badge className="bg-primary hover:bg-primary">답변</Badge>
                                <span className="font-medium text-sm">상담사</span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {formatDate(inquiry.answeredAt)}
                                </span>
                              </div>
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                {inquiry.answerText}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-4 opacity-50">
                            <div className="w-6"></div>
                            <div className="flex-1 p-4 bg-muted/10 rounded-lg border border-dashed border-muted text-sm text-muted-foreground">
                              아직 답변이 등록되지 않았습니다.
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GuardianInquiry;
