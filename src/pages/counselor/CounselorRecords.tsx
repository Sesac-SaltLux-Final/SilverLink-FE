import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Calendar,
  Clock,
  User,
  CheckCircle,
  FileText
} from "lucide-react";
import { counselorNavItems } from "@/config/counselorNavItems";
import { useAuth } from "@/contexts/AuthContext";
import assignmentsApi, { AssignmentResponse } from "@/api/assignments";



import counselingApi from "@/api/counseling";
import { CounselingRecordResponse, CounselingRecordRequest } from "@/types/api";

const CounselorRecords = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<CounselingRecordResponse[]>([]);
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CounselingRecordResponse | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    seniorId: "",
    seniorName: "",
    date: "",
    time: "",
    type: "PHONE" as "PHONE" | "VISIT" | "VIDEO",
    category: "",
    summary: "",
    content: "",
    result: "",
    followUp: "",
    status: "COMPLETED" as "COMPLETED" | "IN_PROGRESS" | "SCHEDULED",
    duration: "10", // 기본값 10분
  });

  // Fetch assignments on mount
  useEffect(() => {
    fetchAssignments();
    fetchRecords();
  }, []);

  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const data = await assignmentsApi.getMyAssignments();
      setAssignments(data.filter(a => a.status === 'ACTIVE'));
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      toast.error("어르신 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoadingAssignments(false);
    }
  };

  const fetchRecords = async () => {
    try {
      const data = await counselingApi.getMyRecords();
      setRecords(data);
    } catch (error) {
      console.error("Failed to fetch records:", error);
      toast.error("상담 기록을 불러오는데 실패했습니다.");
    }
  };
  // Wait, I should add useEffect to imports in a separate chunk or just use React.useEffect if I don't want to mess up imports.
  // Actually, useState is not useEffect. I need to add useEffect import.
  // Let me check if useEffect is imported.
  // Line 1: import { useState } from "react";
  // I need to update line 1.

  const filteredRecords = records.filter((record) => {
    const matchesSearch = record.seniorName.includes(searchTerm) ||
      record.summary.includes(searchTerm);
    const matchesType = filterType === "all" || record.type === filterType;
    const matchesStatus = filterStatus === "all" || record.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreateRecord = () => {
    setIsEditMode(false);
    setFormData({
      seniorId: "",
      seniorName: "",
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 5),
      type: "PHONE",
      category: "",
      summary: "",
      content: "",
      result: "",
      followUp: "",
      status: "COMPLETED",
      duration: "10",
    });
    setIsDialogOpen(true);
  };

  const handleEditRecord = (record: CounselingRecordResponse) => {
    setIsEditMode(true);
    setSelectedRecord(record);
    setFormData({
      seniorId: String(record.seniorId),
      seniorName: record.seniorName,
      date: record.date,
      time: String(record.time),
      type: record.type,
      category: record.category,
      summary: record.summary,
      content: record.content.replace(/^\[상담시간:\s*\d+분\]\s*/, ''),
      result: record.result,
      followUp: record.followUp,
      status: record.status,
      duration: extractDuration(record.content),
    });
    setIsDialogOpen(true);
  };

  const extractDuration = (content: string) => {
    const match = content.match(/^\[상담시간:\s*(\d+)분\]/);
    return match ? match[1] : "";
  };

  const handleViewRecord = (record: CounselingRecordResponse) => {
    setSelectedRecord(record);
    setIsViewDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.seniorId) {
        toast.error("어르신을 선택해주세요.");
        return;
      }

      const requestData: CounselingRecordRequest = {
        seniorId: Number(formData.seniorId),
        date: formData.date,
        time: formData.time.length === 5 ? `${formData.time}:00` : formData.time,
        type: formData.type as any,
        category: formData.category,
        summary: formData.summary,
        // 소요 시간을 content 앞에 추가
        content: formData.duration ? `[상담시간: ${formData.duration}분]\n\n${formData.content}` : formData.content,
        result: formData.result,
        followUp: formData.followUp,
        status: (formData.status || "COMPLETED") as any
      };

      if (isEditMode && selectedRecord) {
        await counselingApi.updateRecord(selectedRecord.id, requestData);
        toast.success("상담 기록이 수정되었습니다.");
      } else {
        await counselingApi.createRecord(requestData);
        toast.success("새 상담 기록이 등록되었습니다.");
      }

      fetchRecords(); // Refresh list
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to save record:", error);
      toast.error("상담 기록 저장에 실패했습니다.");
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "PHONE": return "전화";
      case "VISIT": return "방문";
      case "VIDEO": return "영상";
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-success/10 text-success border-0">완료</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-warning/10 text-warning border-0">진행중</Badge>;
      case "SCHEDULED":
        return <Badge className="bg-info/10 text-info border-0">예정</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case "정상":
        return <Badge className="bg-success/10 text-success border-0">정상</Badge>;
      case "주의필요":
        return <Badge className="bg-warning/10 text-warning border-0">주의필요</Badge>;
      case "지속관찰":
        return <Badge className="bg-info/10 text-info border-0">지속관찰</Badge>;
      default:
        return result ? <Badge variant="outline">{result}</Badge> : "-";
    }
  };

  return (
    <DashboardLayout
      role="counselor"
      userName={user?.name || "상담사"}
      navItems={counselorNavItems}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">상담 기록 관리</h1>
            <p className="text-muted-foreground">상담 내용을 작성하고 관리합니다</p>
          </div>
          <Button onClick={handleCreateRecord} className="gap-2">
            <Plus className="w-4 h-4" />
            새 상담 기록
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">전체 기록</p>
                  <p className="text-xl font-bold">{records.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">완료</p>
                  <p className="text-xl font-bold">{records.filter((r) => r.status === "COMPLETED").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">진행중</p>
                  <p className="text-xl font-bold">{records.filter((r) => r.status === "IN_PROGRESS").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">예정</p>
                  <p className="text-xl font-bold">{records.filter((r) => r.status === "SCHEDULED").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="어르신 이름, 상담 내용 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="상담 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 유형</SelectItem>
                  <SelectItem value="PHONE">전화</SelectItem>
                  <SelectItem value="VISIT">방문</SelectItem>
                  <SelectItem value="VIDEO">영상</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="COMPLETED">완료</SelectItem>
                  <SelectItem value="IN_PROGRESS">진행중</SelectItem>
                  <SelectItem value="SCHEDULED">예정</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>상담 기록 목록</CardTitle>
            <CardDescription>총 {filteredRecords.length}건의 상담 기록</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>일시</TableHead>
                    <TableHead>어르신</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>분류</TableHead>
                    <TableHead>상담 요약</TableHead>
                    <TableHead>결과</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{record.date}</p>
                          <p className="text-muted-foreground">{record.time}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">{record.seniorName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(record.type)}</Badge>
                      </TableCell>
                      <TableCell>{record.category}</TableCell>
                      <TableCell className="max-w-xs truncate">{record.summary}</TableCell>
                      <TableCell>{getResultBadge(record.result)}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRecord(record)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRecord(record)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "상담 기록 수정" : "새 상담 기록 작성"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "상담 기록을 수정합니다." : "새로운 상담 기록을 작성합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>어르신 이름</Label>
                <Select
                  value={formData.seniorId}
                  onValueChange={(value) => {
                    const selected = assignments.find(a => String(a.elderlyId) === value);
                    if (selected) {
                      setFormData({
                        ...formData,
                        seniorId: String(selected.elderlyId),
                        seniorName: selected.elderlyName
                      });
                    }
                  }}
                  disabled={loadingAssignments}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingAssignments ? "로딩 중..." : "어르신 선택"} />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map((assignment) => (
                      <SelectItem key={assignment.elderlyId} value={String(assignment.elderlyId)}>
                        {assignment.elderlyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>상담 유형</Label>
                <Select
                  onValueChange={(value: "PHONE" | "VISIT" | "VIDEO") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHONE">전화</SelectItem>
                    <SelectItem value="VISIT">방문</SelectItem>
                    <SelectItem value="VIDEO">영상</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>상담 일자</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>상담 시간 (시작)</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>소요 시간 (분)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="5"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="예: 30"
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">분</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>상담 분류</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="분류 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="안부확인">안부확인</SelectItem>
                  <SelectItem value="건강상담">건강상담</SelectItem>
                  <SelectItem value="정서지원">정서지원</SelectItem>
                  <SelectItem value="복지안내">복지안내</SelectItem>
                  <SelectItem value="긴급상황">긴급상황</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>상담 요약</Label>
              <Input
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="상담 내용을 한 줄로 요약해주세요"
              />
            </div>
            <div className="space-y-2">
              <Label>상담 내용</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="상담 내용을 상세히 기록해주세요"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>상담 결과</Label>
              <Select
                value={formData.result}
                onValueChange={(value) => setFormData({ ...formData, result: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="결과 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="정상">정상</SelectItem>
                  <SelectItem value="주의필요">주의필요</SelectItem>
                  <SelectItem value="지속관찰">지속관찰</SelectItem>
                  <SelectItem value="긴급조치">긴급조치</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>후속 조치</Label>
              <Textarea
                value={formData.followUp}
                onChange={(e) => setFormData({ ...formData, followUp: e.target.value })}
                placeholder="후속 조치 사항을 기록해주세요"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSubmit}>
              {isEditMode ? "수정 완료" : "기록 저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>상담 기록 상세</DialogTitle>
            <DialogDescription>
              {selectedRecord?.date} {selectedRecord?.time} 상담 기록
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">어르신</p>
                  <p className="font-medium">{selectedRecord.seniorName}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">상담 유형</p>
                  <p className="font-medium">{getTypeLabel(selectedRecord.type)}</p>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">상담 분류</p>
                <p className="font-medium">{selectedRecord.category}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">상담 요약</p>
                <p className="font-medium">{selectedRecord.summary}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">상담 내용</p>
                <p className="font-medium">{selectedRecord.content || "-"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">상담 결과</p>
                  <div className="mt-1">{getResultBadge(selectedRecord.result)}</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">상태</p>
                  <div className="mt-1">{getStatusBadge(selectedRecord.status)}</div>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">후속 조치</p>
                <p className="font-medium">{selectedRecord.followUp || "-"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              닫기
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false);
              if (selectedRecord) handleEditRecord(selectedRecord);
            }}>
              수정하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CounselorRecords;
