import { useState, useEffect } from "react";
import {
  Lock,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Send,
  X,
  FileText,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { guardianNavItems } from "@/config/guardianNavItems";
import { useAuth } from "@/contexts/AuthContext";
import guardiansApi from "@/api/guardians";
import accessRequestsApi, { AccessScope } from "@/api/accessRequests";
import { GuardianElderlyResponse } from "@/types/api";
import { toast } from "sonner";

const infoTypes = [
  { value: "HEALTH_INFO", label: "건강정보" },
  { value: "MEDICATION", label: "복약정보" },
  { value: "CALL_RECORDS", label: "통화기록" },
];

const mapScopeToLabel = (scope: string) => {
  const found = infoTypes.find(t => t.value === scope);
  return found ? found.label : scope;
};

interface RequestItem {
  id: number;
  elderlyName: string;
  infoType: string;
  scope: string;
  status: string;
  statusDescription: string;
  documentVerified: boolean;
  requestDate: string;
  decidedAt: string | null;
  decisionNote: string | null;
  reviewedBy: string | null;
  accessGranted: boolean;
}

interface GroupedRequest {
  key: string;
  elderlyName: string;
  requestDate: string;
  items: RequestItem[];
  // 그룹의 대표 상태 (모든 항목 중 가장 낮은 우선순위 상태)
  overallStatus: string;
  decidedAt: string | null;
}

const statusPriority: Record<string, number> = {
  pending: 0,
  rejected: 1,
  revoked: 2,
  expired: 3,
  cancelled: 4,
  approved: 5,
};

function groupRequests(requests: RequestItem[]): GroupedRequest[] {
  const groups: Record<string, RequestItem[]> = {};

  for (const req of requests) {
    const key = `${req.elderlyName}__${req.requestDate}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(req);
  }

  return Object.entries(groups).map(([key, items]) => {
    // 대표 상태: 가장 낮은 priority (아직 처리 안 된 것이 있으면 pending)
    const overallStatus = items.reduce((worst, item) => {
      const wp = statusPriority[worst] ?? 99;
      const ip = statusPriority[item.status] ?? 99;
      return ip < wp ? item.status : worst;
    }, items[0].status);

    const decidedDates = items.map(i => i.decidedAt).filter(Boolean);
    const latestDecided = decidedDates.length > 0
      ? decidedDates.sort().reverse()[0]
      : null;

    return {
      key,
      elderlyName: items[0].elderlyName,
      requestDate: items[0].requestDate,
      items,
      overallStatus,
      decidedAt: latestDecided,
    };
  }).sort((a, b) => b.requestDate.localeCompare(a.requestDate));
}

const GuardianSensitiveInfo = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [myElderly, setMyElderly] = useState<GuardianElderlyResponse[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<GroupedRequest | null>(null);
  const [detailGroup, setDetailGroup] = useState<GroupedRequest | null>(null);

  const [newRequest, setNewRequest] = useState({
    elderlyName: "",
    elderlyUserId: 0,
    infoTypes: [] as string[],
  });

  const fetchMyElderly = async () => {
    try {
      const data = await guardiansApi.getMyElderly();
      if (Array.isArray(data)) {
        setMyElderly(data);
      } else {
        setMyElderly(data ? [data] : []);
      }
    } catch (error) {
      // Failed to fetch my elderly
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await accessRequestsApi.getMyRequests();


      const mappedRequests: RequestItem[] = data.map(r => ({
        id: r.id,
        elderlyName: r.elderlyName,
        infoType: mapScopeToLabel(r.scope),
        scope: r.scope,
        status: r.status.toLowerCase(),
        statusDescription: r.statusDescription,
        documentVerified: r.documentVerified,
        requestDate: r.requestedAt ? r.requestedAt.split('T')[0] : '',
        decidedAt: r.decidedAt ? r.decidedAt.split('T')[0] : null,
        decisionNote: r.decisionNote,
        reviewedBy: r.reviewedBy,
        accessGranted: r.accessGranted,
      }));

      setRequests(mappedRequests);
    } catch (error: any) {
      // Failed to fetch requests
      toast.error("요청 목록을 불러오는 중 오류가 발생했습니다.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      fetchMyElderly();
    }
  };

  const handleElderlyChange = (name: string) => {
    const selected = myElderly.find(e => e.elderlyName === name);
    setNewRequest({
      ...newRequest,
      elderlyName: name,
      elderlyUserId: selected?.elderlyId || 0,
    });
  };

  const grouped = groupRequests(requests);

  const filteredGroups = grouped.filter((group) => {
    const matchesSearch = group.elderlyName.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || group.overallStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = grouped.filter(g => g.overallStatus === "pending").length;
  const approvedCount = grouped.filter(g => g.overallStatus === "approved").length;
  const rejectedCount = grouped.filter(g => g.overallStatus === "rejected").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success/10 text-success border-0">승인됨</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning border-0">대기중</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive border-0">거부됨</Badge>;
      case "revoked":
        return <Badge className="bg-muted text-muted-foreground border-0">철회됨</Badge>;
      case "expired":
        return <Badge className="bg-muted text-muted-foreground border-0">만료됨</Badge>;
      case "cancelled":
        return <Badge className="bg-muted text-muted-foreground border-0">취소됨</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleInfoTypeToggle = (value: string, checked: boolean) => {
    setNewRequest(prev => ({
      ...prev,
      infoTypes: checked
        ? [...prev.infoTypes, value]
        : prev.infoTypes.filter(t => t !== value),
    }));
  };

  const handleSubmitRequest = async () => {
    if (!newRequest.elderlyUserId || newRequest.infoTypes.length === 0) {
      toast.error("어르신과 정보 유형을 선택해주세요.");
      return;
    }

    try {
      const results = await Promise.allSettled(
        newRequest.infoTypes.map(type =>
          accessRequestsApi.createRequest({
            elderlyUserId: newRequest.elderlyUserId,
            scope: type as AccessScope,
            reason: "",
          })
        )
      );

      const succeeded = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected");

      if (succeeded > 0) {
        toast.success(`${succeeded}건의 민감정보 열람 요청이 전송되었습니다.`);
      }
      if (failed.length > 0) {
        failed.forEach(r => {
          if (r.status === "rejected") {
            const message = (r.reason as any)?.response?.data?.message || "일부 요청 전송에 실패했습니다.";
            toast.error(message);
          }
        });
      }

      setIsDialogOpen(false);
      setNewRequest({ elderlyName: "", elderlyUserId: 0, infoTypes: [] });
      fetchRequests();
    } catch (error: any) {
      // Request failed
      const message = error?.response?.data?.message || "요청 전송에 실패했습니다.";
      toast.error(message);
    }
  };

  const handleCancelGroup = async () => {
    if (!cancelTarget) return;
    try {
      const pendingItems = cancelTarget.items.filter(i => i.status === "pending");
      await Promise.all(pendingItems.map(item => accessRequestsApi.cancelRequest(item.id)));
      toast.success("요청이 취소되었습니다.");
      setCancelDialogOpen(false);
      setCancelTarget(null);
      fetchRequests();
    } catch (error: any) {
      // Cancel failed
      const message = error?.response?.data?.message || "요청 취소에 실패했습니다.";
      toast.error(message);
    }
  };

  return (
    <DashboardLayout
      role="guardian"
      userName={user?.name || "보호자"}
      navItems={guardianNavItems}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">민감정보 열람 신청</h1>
            <p className="text-muted-foreground mt-1">어르신의 민감정보 열람을 위한 권한을 신청하세요</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                새 신청
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>민감정보 열람 신청</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>어르신 선택</Label>
                  <Select
                    value={newRequest.elderlyName}
                    onValueChange={handleElderlyChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="어르신을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {myElderly.map((elderly) => (
                        <SelectItem key={elderly.elderlyId} value={elderly.elderlyName}>
                          {elderly.elderlyName} ({elderly.relationType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>정보 유형 (복수 선택 가능)</Label>
                  <div className="space-y-3 pt-1">
                    {infoTypes.map((type) => (
                      <div key={type.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`info-type-${type.value}`}
                          checked={newRequest.infoTypes.includes(type.value)}
                          onCheckedChange={(checked) =>
                            handleInfoTypeToggle(type.value, checked === true)
                          }
                        />
                        <Label
                          htmlFor={`info-type-${type.value}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSubmitRequest} className="gap-2">
                  <Send className="w-4 h-4" />
                  신청하기
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alert */}
        <Card className="border-warning/50 bg-warning/5 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">민감정보 열람 안내</p>
                <p className="text-sm text-muted-foreground mt-1">
                  민감정보 열람은 관리자의 서류 확인 및 승인이 필요합니다.
                  승인 후 열람이 가능하며, 승인된 정보는 개인 목적으로만 사용해주세요.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{grouped.length}</p>
                  <p className="text-sm text-muted-foreground">전체 신청</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">대기중</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{approvedCount}</p>
                  <p className="text-sm text-muted-foreground">승인됨</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rejectedCount}</p>
                  <p className="text-sm text-muted-foreground">거부됨</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-card border-0">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="어르신 이름으로 검색..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">대기중</SelectItem>
                  <SelectItem value="approved">승인됨</SelectItem>
                  <SelectItem value="rejected">거부됨</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle>신청 목록</CardTitle>
            <CardDescription>민감정보 열람 신청 현황입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>어르신</TableHead>
                  <TableHead>정보 유형</TableHead>
                  <TableHead>신청일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>처리일</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {loading ? "불러오는 중..." : "신청 내역이 없습니다."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGroups.map((group) => (
                    <TableRow key={group.key}>
                      <TableCell className="font-medium">{group.elderlyName}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {group.items.map(item => (
                            <Badge key={item.id} variant="outline">{item.infoType}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{group.requestDate}</TableCell>
                      <TableCell>{getStatusBadge(group.overallStatus)}</TableCell>
                      <TableCell>{group.decidedAt || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {group.overallStatus === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-destructive hover:text-destructive"
                              onClick={() => {
                                setCancelTarget(group);
                                setCancelDialogOpen(true);
                              }}
                            >
                              <X className="w-4 h-4" />
                              취소
                            </Button>
                          )}
                          {(group.overallStatus === "approved" || group.overallStatus === "rejected") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              onClick={() => setDetailGroup(group)}
                            >
                              <Eye className="w-4 h-4" />
                              상세
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>신청 취소</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {cancelTarget?.elderlyName}님에 대한 민감정보 열람 신청({cancelTarget?.items.map(i => i.infoType).join(', ')})을 취소하시겠습니까? 취소 후에는 다시 신청해야 합니다.
            </p>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                아니오
              </Button>
              <Button variant="destructive" onClick={handleCancelGroup}>
                취소하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={!!detailGroup} onOpenChange={() => setDetailGroup(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>신청 상세 정보</DialogTitle>
            </DialogHeader>
            {detailGroup && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-xl">
                  <div>
                    <p className="text-sm text-muted-foreground">대상 어르신</p>
                    <p className="font-medium">{detailGroup.elderlyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">신청일</p>
                    <p className="font-medium">{detailGroup.requestDate}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">신청 항목별 처리 현황</p>
                  {detailGroup.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{item.infoType}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                  ))}
                </div>

                {detailGroup.items.some(i => i.decidedAt) && (
                  <div className="p-4 bg-secondary/30 rounded-xl space-y-2">
                    <p className="text-sm text-muted-foreground">처리일</p>
                    <p className="font-medium text-sm">{detailGroup.decidedAt}</p>
                  </div>
                )}

                {detailGroup.items.some(i => i.reviewedBy) && (
                  <div className="p-4 bg-secondary/30 rounded-xl space-y-2">
                    <p className="text-sm text-muted-foreground">처리자</p>
                    <p className="font-medium text-sm">{detailGroup.items.find(i => i.reviewedBy)?.reviewedBy}</p>
                  </div>
                )}

                {detailGroup.items.some(i => i.decisionNote) && (
                  <div className="p-4 bg-secondary/30 rounded-xl space-y-2">
                    <p className="text-sm text-muted-foreground">처리 사유</p>
                    {detailGroup.items
                      .filter(i => i.decisionNote)
                      .map(i => (
                        <p key={i.id} className="text-sm">
                          <span className="font-medium">{i.infoType}:</span> {i.decisionNote}
                        </p>
                      ))
                    }
                  </div>
                )}

                {detailGroup.overallStatus === "approved" && (
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-success/10">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <span className="text-sm font-medium">승인된 정보는 해당 메뉴에서 열람하실 수 있습니다.</span>
                  </div>
                )}

                {detailGroup.overallStatus === "rejected" && (
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10">
                    <XCircle className="w-5 h-5 text-destructive" />
                    <span className="text-sm font-medium">거부된 요청은 사유 확인 후 다시 신청하실 수 있습니다.</span>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDetailGroup(null)}>
                닫기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default GuardianSensitiveInfo;
