import { useState, useEffect } from "react";
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import complaintsApi, { ComplaintResponse, ComplaintStats } from "@/api/complaints";
import usersApi from "@/api/users";
import { MyProfileResponse } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";

// 백엔드 상태를 프론트엔드 표시용으로 변환
const mapStatus = (status: string): string => {
  switch (status) {
    case "WAITING": return "pending";
    case "PROCESSING": return "in_progress";
    case "RESOLVED": return "completed";
    case "REJECTED": return "rejected";
    default: return status.toLowerCase();
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const mappedStatus = mapStatus(status);
  switch (mappedStatus) {
    case "pending":
      return <Badge className="bg-warning/10 text-warning border-0">접수</Badge>;
    case "in_progress":
      return <Badge className="bg-info/10 text-info border-0">처리중</Badge>;
    case "completed":
      return <Badge className="bg-success/10 text-success border-0">완료</Badge>;
    case "rejected":
      return <Badge className="bg-destructive/10 text-destructive border-0">반려</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const GuardianComplaint = () => {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintResponse | null>(null);
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([]);
  const [stats, setStats] = useState<ComplaintStats>({ pending: 0, processing: 0, resolved: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userName, setUserName] = useState(user?.name || "사용자");

  // 폼 상태
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("");

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [complaintsData, statsData, profileData] = await Promise.all([
          complaintsApi.getMyComplaints(),
          complaintsApi.getMyComplaintStats(),
          usersApi.getMyProfile()
        ]);
        setComplaints(complaintsData);
        setStats(statsData);
        setUserName(profileData.name);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
        toast.error("데이터를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 민원 등록
  const handleSubmit = async () => {
    if (!formCategory) {
      toast.error("불편 유형을 선택해주세요.");
      return;
    }
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error("제목과 내용을 입력해주세요.");
      return;
    }

    try {
      setSubmitting(true);
      const newComplaint = await complaintsApi.createComplaint({
        title: formTitle,
        content: formContent,
        category: formCategory || undefined,
      });

      setComplaints([newComplaint, ...complaints]);
      setStats(prev => ({ ...prev, pending: prev.pending + 1, total: prev.total + 1 }));

      setFormTitle("");
      setFormContent("");
      setFormCategory("");
      setIsDialogOpen(false);
      toast.success("불편 사항이 접수되었습니다.");
    } catch (error) {
      console.error("민원 등록 실패:", error);
      toast.error("접수에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="guardian" userName={userName} navItems={guardianNavItems}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      role="guardian"
      userName={userName}
      navItems={guardianNavItems}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">불편사항 신고</h1>
            <p className="text-muted-foreground mt-1">서비스 이용 중 불편한 점을 신고하세요</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                불편사항 신고하기
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>불편사항 신고</DialogTitle>
                <DialogDescription>불편 사항을 관리자에게 전달합니다</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>불편 유형</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="유형을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="상담사 관련">상담사 관련</SelectItem>
                      <SelectItem value="서비스 품질">서비스 품질</SelectItem>
                      <SelectItem value="AI 관련">AI 관련</SelectItem>
                      <SelectItem value="시스템 오류">시스템 오류</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>제목</Label>
                  <Input
                    placeholder="불편 사항 제목을 입력하세요"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>상세 내용</Label>
                  <Textarea
                    placeholder="불편 사항을 상세히 작성해 주세요. 구체적으로 작성해 주시면 빠른 처리에 도움이 됩니다."
                    rows={5}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  접수하기
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
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">접수</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-info">{stats.processing}</p>
                  <p className="text-sm text-muted-foreground">처리중</p>
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
                  <p className="text-2xl font-bold text-success">{stats.resolved}</p>
                  <p className="text-sm text-muted-foreground">완료</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="h-px bg-border my-6" />

        {/* Complaints List */}
        <Card className="shadow-card border-0">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg">접수 내역</CardTitle>
            <CardDescription>불편 사항 접수 및 처리 현황</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {complaints.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                접수된 민원이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {complaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className="p-6 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedComplaint(complaint)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <StatusBadge status={complaint.status} />
                          {complaint.category && <Badge variant="outline">{complaint.category}</Badge>}
                        </div>
                        <h3 className="font-semibold mb-1">{complaint.title}</h3>
                        <p className="text-muted-foreground line-clamp-2">{complaint.content}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">{complaint.createdAt}</p>
                        <ChevronRight className="w-5 h-5 text-muted-foreground mt-2 ml-auto" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
          <DialogContent className="max-w-lg">
            {selectedComplaint && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={selectedComplaint.status} />
                    {selectedComplaint.category && <Badge variant="outline">{selectedComplaint.category}</Badge>}
                  </div>
                  <DialogTitle>{selectedComplaint.title}</DialogTitle>
                  <DialogDescription>{selectedComplaint.createdAt}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 rounded-xl bg-secondary/30">
                    <p className="text-sm text-muted-foreground mb-1">접수 내용</p>
                    <p>{selectedComplaint.content}</p>
                  </div>
                  {selectedComplaint.response && (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                      <p className="text-sm text-success font-medium mb-1">처리 결과</p>
                      <p className="text-foreground">{selectedComplaint.response}</p>
                      {selectedComplaint.respondedAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          답변일: {selectedComplaint.respondedAt}
                          {selectedComplaint.respondedByName && ` (${selectedComplaint.respondedByName})`}
                        </p>
                      )}
                    </div>
                  )}
                  {!selectedComplaint.response && (
                    <div className="p-4 rounded-xl bg-muted/50 text-center">
                      <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">처리 중입니다. 빠른 시일 내에 답변드리겠습니다.</p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedComplaint(null)}>닫기</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default GuardianComplaint;
