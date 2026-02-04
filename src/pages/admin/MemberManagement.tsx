import { useState, useEffect } from "react";
import {
  Search,
  MoreVertical,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Pencil,
  Trash2,
  Download,
  Loader2,
  Users,
  X
} from "lucide-react";
import { toast } from "sonner";
import { adminNavItems } from "@/config/adminNavItems";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import usersApi from "@/api/users";
import counselorsApi from "@/api/counselors";
import guardiansApi from "@/api/guardians";
import elderlyApi from "@/api/elderly";
import assignmentsApi from "@/api/assignments";
import { MyProfileResponse, CounselorResponse, GuardianResponse, ElderlySummaryResponse, GuardianElderlyResponse } from "@/types/api";
import { AssignmentResponse } from "@/api/assignments";
import { useAuth } from "@/contexts/AuthContext";

// 전화번호 포맷팅 함수
const formatPhoneNumber = (phone: string | undefined): string => {
  if (!phone) return '-';

  // 숫자만 추출
  const numbers = phone.replace(/[^0-9]/g, '');

  // 010-xxxx-xxxx 형식으로 변환
  if (numbers.length === 11 && numbers.startsWith('010')) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  }

  // 02-xxx-xxxx 또는 02-xxxx-xxxx 형식 (서울 지역번호)
  if (numbers.length === 9 && numbers.startsWith('02')) {
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5)}`;
  }
  if (numbers.length === 10 && numbers.startsWith('02')) {
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }

  // 지역번호 3자리 (031, 032 등)
  if (numbers.length === 10) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  }
  if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  }

  // 포맷팅 불가능한 경우 원본 반환
  return phone;
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "active":
    case "ACTIVE":
      return <Badge className="bg-success/10 text-success border-0">활성</Badge>;
    case "pending":
    case "PENDING":
      return <Badge className="bg-warning/10 text-warning border-0">승인대기</Badge>;
    case "inactive":
    case "INACTIVE":
      return <Badge className="bg-muted text-muted-foreground border-0">비활성</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const RoleBadge = ({ role }: { role: string }) => {
  switch (role) {
    case "counselor":
    case "COUNSELOR":
      return <Badge className="bg-primary/10 text-primary border-0">상담사</Badge>;
    case "guardian":
    case "GUARDIAN":
      return <Badge className="bg-accent/10 text-accent border-0">보호자</Badge>;
    case "senior":
    case "ELDERLY":
      return <Badge className="bg-info/10 text-info border-0">어르신</Badge>;
    case "admin":
    case "ADMIN":
      return <Badge className="bg-destructive/10 text-destructive border-0">관리자</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
};

const MemberManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<MyProfileResponse | null>(null);

  // Data states
  const [counselors, setCounselors] = useState<CounselorResponse[]>([]);
  const [guardians, setGuardians] = useState<GuardianResponse[]>([]);
  const [elderly, setElderly] = useState<ElderlySummaryResponse[]>([]);

  // Relationship caches
  const [guardianElderlyMap, setGuardianElderlyMap] = useState<Map<number, GuardianElderlyResponse>>(new Map());
  const [counselorAssignmentsMap, setCounselorAssignmentsMap] = useState<Map<number, AssignmentResponse[]>>(new Map());
  const [elderlyRelationsMap, setElderlyRelationsMap] = useState<Map<number, { assignment: AssignmentResponse | null, guardian: GuardianResponse | null }>>(new Map());

  // Detail dialog states
  const [selectedCounselor, setSelectedCounselor] = useState<CounselorResponse | null>(null);
  const [counselorElderly, setCounselorElderly] = useState<AssignmentResponse[]>([]);
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianResponse | null>(null);
  const [guardianElderly, setGuardianElderly] = useState<GuardianElderlyResponse[]>([]);
  const [selectedElderly, setSelectedElderly] = useState<ElderlySummaryResponse | null>(null);
  const [elderlyAssignment, setElderlyAssignment] = useState<AssignmentResponse | null>(null);
  const [elderlyGuardian, setElderlyGuardian] = useState<GuardianResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    counselors: 0,
    guardians: 0,
    seniors: 0,
    pending: 0
  });

  useEffect(() => {
    fetchData();
    fetchData();
  }, []);

  const handleDeleteMember = async (userId: number, role: string) => {
    if (!window.confirm("정말 이 회원을 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.")) {
      return;
    }
    try {
      await usersApi.deleteUser(userId);
      toast.success("회원이 삭제되었습니다.");
      fetchData();
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("회원 삭제에 실패했습니다.");
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Get current user profile
      const profile = await usersApi.getMyProfile();
      setUserProfile(profile);

      // Fetch all data in parallel
      const [counselorList, guardianList, elderlyList] = await Promise.all([
        counselorsApi.getAllCounselors(),
        guardiansApi.getAllGuardians(),
        elderlyApi.getAllElderlyForAdmin()
      ]);

      setCounselors(counselorList);
      setGuardians(guardianList);
      setElderly(elderlyList);

      // Fetch guardian-elderly mappings for all guardians
      const guardianElderlyPromises = guardianList.map(async (guardian) => {
        try {
          const elderlyData: GuardianElderlyResponse = await guardiansApi.getElderlyByGuardianForAdmin(guardian.id);
          return { guardianId: guardian.id, data: elderlyData as GuardianElderlyResponse };
        } catch (error) {
          // 보호자에게 연결된 어르신이 없을 수 있음
          return { guardianId: guardian.id, data: null as GuardianElderlyResponse | null };
        }
      });

      const guardianElderlyResults = await Promise.all(guardianElderlyPromises);
      const guardianMap = new Map<number, GuardianElderlyResponse>();
      guardianElderlyResults.forEach(result => {
        if (result.data) {
          guardianMap.set(result.guardianId, result.data);
        }
      });
      setGuardianElderlyMap(guardianMap);

      // Fetch counselor assignments for all counselors
      const counselorAssignmentPromises = counselorList.map(async (counselor) => {
        try {
          const assignments = await assignmentsApi.getCounselorAssignments(counselor.id);
          return { counselorId: counselor.id, data: assignments };
        } catch (error) {
          return { counselorId: counselor.id, data: [] };
        }
      });

      const counselorAssignmentResults = await Promise.all(counselorAssignmentPromises);
      const counselorMap = new Map<number, AssignmentResponse[]>();
      counselorAssignmentResults.forEach(result => {
        counselorMap.set(result.counselorId, result.data);
      });
      setCounselorAssignmentsMap(counselorMap);

      // Fetch elderly relations (counselor + guardian) for all elderly
      // Suppress 400 errors as they indicate no data exists (expected)
      const elderlyRelationPromises = elderlyList.map(async (elderlyMember) => {
        let assignment: AssignmentResponse | null = null;
        let guardian: GuardianResponse | null = null;

        // Fetch assignment - suppress 400/404/204 errors
        try {
          assignment = await assignmentsApi.getElderlyAssignment(elderlyMember.userId);
        } catch (error: any) {
          // 400/404/204 means no assignment - this is normal, not an error
          if (error?.response?.status !== 400 && error?.response?.status !== 404 && error?.response?.status !== 204) {
            console.error(`Failed to fetch assignment for elderly ${elderlyMember.userId}:`, error);
          }
        }

        // Fetch guardian - suppress 400/404/204 errors
        try {
          guardian = await guardiansApi.getGuardianByElderlyForAdmin(elderlyMember.userId);
        } catch (error: any) {
          // 400/404/204 means no guardian - this is normal, not an error
          if (error?.response?.status !== 400 && error?.response?.status !== 404 && error?.response?.status !== 204) {
            console.error(`Failed to fetch guardian for elderly ${elderlyMember.userId}:`, error);
          }
        }

        return {
          elderlyId: elderlyMember.userId,
          data: { assignment, guardian }
        };
      });

      const elderlyRelationResults = await Promise.all(elderlyRelationPromises);
      const elderlyMap = new Map<number, { assignment: AssignmentResponse | null, guardian: GuardianResponse | null }>();
      elderlyRelationResults.forEach(result => {
        elderlyMap.set(result.elderlyId, result.data);
      });
      setElderlyRelationsMap(elderlyMap);

      // Update stats
      setStats({
        counselors: counselorList.length,
        guardians: guardianList.length,
        seniors: elderlyList.length,
        pending: 0
      });

    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Counselor click handler - show assigned elderly
  const handleCounselorClick = async (counselor: CounselorResponse) => {
    setSelectedCounselor(counselor);
    setIsDetailLoading(true);
    try {
      // Use cached data if available
      const cachedAssignments = counselorAssignmentsMap.get(counselor.id);
      if (cachedAssignments) {
        setCounselorElderly(cachedAssignments);
      } else {
        const assignments = await assignmentsApi.getCounselorAssignments(counselor.id);
        setCounselorElderly(assignments);
      }
    } catch (error) {
      console.error('Failed to fetch counselor assignments:', error);
      setCounselorElderly([]);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Guardian click handler - show assigned elderly
  const handleGuardianClick = async (guardian: GuardianResponse) => {
    setSelectedGuardian(guardian);
    setIsDetailLoading(true);
    try {
      // Use cached data if available
      const cachedElderly = guardianElderlyMap.get(guardian.id);
      if (cachedElderly) {
        setGuardianElderly(cachedElderly);
      } else {
        const elderlyData = await guardiansApi.getElderlyByGuardianForAdmin(guardian.id);
        setGuardianElderly(elderlyData);
      }
    } catch (error) {
      console.error('Failed to fetch guardian elderly:', error);
      setGuardianElderly([]);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Elderly click handler - show counselor and guardian
  const handleElderlyClick = async (elderlyMember: ElderlySummaryResponse) => {
    setSelectedElderly(elderlyMember);
    setIsDetailLoading(true);

    try {
      // Check cache first
      const cachedRelations = elderlyRelationsMap.get(elderlyMember.userId);
      if (cachedRelations) {
        setElderlyAssignment(cachedRelations.assignment);
        setElderlyGuardian(cachedRelations.guardian);
        setIsDetailLoading(false);
        return;
      }

      // Fetch detailed data only when clicked
      setElderlyAssignment(null);
      setElderlyGuardian(null);

      // Fetch assignment (suppress 400 errors)
      try {
        const assignment = await assignmentsApi.getElderlyAssignment(elderlyMember.userId);
        setElderlyAssignment(assignment);
      } catch (error: any) {
        if (error?.response?.status !== 400) {
          console.error('Failed to fetch elderly assignment:', error);
        }
      }

      // Fetch guardian (suppress 400 errors)
      try {
        const guardian = await guardiansApi.getGuardianByElderlyForAdmin(elderlyMember.userId);
        setElderlyGuardian(guardian);
      } catch (error: any) {
        if (error?.response?.status !== 400) {
          console.error('Failed to fetch elderly guardian:', error);
        }
      }

      // Cache the results
      elderlyRelationsMap.set(elderlyMember.userId, {
        assignment: elderlyAssignment,
        guardian: elderlyGuardian
      });
    } catch (error) {
      console.error('Failed to fetch elderly details:', error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Filter functions
  const filteredCounselors = counselors.filter((c) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const filteredGuardians = guardians.filter((g) =>
    g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.phone?.includes(searchQuery)
  );

  const filteredElderly = elderly.filter((e) =>
    e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.phone?.includes(searchQuery) ||
    e.fullAddress?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Combine for All Tab
  const allMembers = [
    ...counselors.map(c => ({ ...c, role: 'COUNSELOR', id: c.id, original: c })),
    ...guardians.map(g => ({ ...g, role: 'GUARDIAN', id: g.id, original: g })),
    ...elderly.map(e => ({ ...e, role: 'ELDERLY', id: e.userId, original: e }))
  ];

  const filteredAllMembers = allMembers.filter(m => {
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = m.name?.toLowerCase().includes(searchLower);
    const phoneMatch = m.phone?.includes(searchQuery);
    const emailMatch = (m as any).email?.toLowerCase().includes(searchLower);
    const roleMatch = m.role.toLowerCase().includes(searchLower);

    return nameMatch || phoneMatch || emailMatch || roleMatch;
  });



  if (isLoading) {
    return (
      <DashboardLayout role="admin" userName={user?.name || "관리자"} navItems={adminNavItems}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      role="admin"
      userName={user?.name || userProfile?.name || "관리자"}
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">회원 관리</h1>
            <p className="text-muted-foreground mt-1">상담사, 보호자, 어르신 계정을 관리합니다</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              내보내기
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.counselors}</p>
                  <p className="text-sm text-muted-foreground">상담사</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.guardians}</p>
                  <p className="text-sm text-muted-foreground">보호자</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.seniors}</p>
                  <p className="text-sm text-muted-foreground">어르신</p>
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
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">승인 대기</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="shadow-card border-0">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="이름, 이메일, 전화번호로 검색..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
            <TabsTrigger value="all" className="text-xs sm:text-sm">전체</TabsTrigger>
            <TabsTrigger value="counselors" className="text-xs sm:text-sm">상담사 ({filteredCounselors.length})</TabsTrigger>
            <TabsTrigger value="guardians" className="text-xs sm:text-sm">보호자 ({filteredGuardians.length})</TabsTrigger>
            <TabsTrigger value="seniors" className="text-xs sm:text-sm">어르신 ({filteredElderly.length})</TabsTrigger>
          </TabsList>



          {/* All Members Tab */}
          <TabsContent value="all" className="space-y-4">
            <Card className="shadow-card border-0">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%] min-w-[120px]">이름</TableHead>
                        <TableHead className="w-[10%] min-w-[80px]">역할</TableHead>
                        <TableHead className="w-[15%] min-w-[120px]">연락처</TableHead>
                        <TableHead className="w-[30%] min-w-[200px]">관련 정보</TableHead>
                        <TableHead className="w-[15%] min-w-[100px]">등록일</TableHead>
                        <TableHead className="w-[15%] min-w-[80px] text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAllMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {searchQuery ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAllMembers.map((member: any) => (
                          <TableRow
                            key={`${member.role}-${member.id}`}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              if (member.role === 'COUNSELOR') handleCounselorClick(member.original);
                              else if (member.role === 'GUARDIAN') handleGuardianClick(member.original);
                              else if (member.role === 'ELDERLY') handleElderlyClick(member.original);
                            }}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-9 h-9">
                                  <AvatarFallback className={`text-sm ${member.role === 'COUNSELOR' ? 'bg-primary/10 text-primary' :
                                    member.role === 'GUARDIAN' ? 'bg-accent/10 text-accent' :
                                      'bg-info/10 text-info'
                                    }`}>
                                    {member.name?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{member.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {(member as any).email || '-'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><RoleBadge role={member.role} /></TableCell>
                            <TableCell className="text-muted-foreground">{formatPhoneNumber(member.phone)}</TableCell>
                            <TableCell className="text-sm">
                              {member.role === 'COUNSELOR' ? (
                                // 상담사: 담당 어르신 목록
                                counselorAssignmentsMap.get(member.id)?.length ? (
                                  <div className="flex flex-wrap gap-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {counselorAssignmentsMap.get(member.id)?.length}명
                                    </Badge>
                                    {(counselorAssignmentsMap.get(member.id) || []).slice(0, 2).map((assignment, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {assignment.elderlyName}
                                      </Badge>
                                    ))}
                                    {(counselorAssignmentsMap.get(member.id)?.length || 0) > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{(counselorAssignmentsMap.get(member.id)?.length || 0) - 2}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">담당 0명</span>
                                )
                              ) : member.role === 'GUARDIAN' ? (
                                // 보호자: 담당 어르신 정보
                                guardianElderlyMap.get(member.id) ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {guardianElderlyMap.get(member.id)?.elderlyName} ({guardianElderlyMap.get(member.id)?.relationType})
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">어르신 없음</span>
                                )
                              ) : (
                                // 어르신: 담당 상담사 + 보호자
                                <div className="flex flex-wrap gap-1">
                                  {elderlyRelationsMap.get(member.id)?.assignment ? (
                                    <Badge variant="secondary" className="text-xs">
                                      상담사: {elderlyRelationsMap.get(member.id)?.assignment?.counselorName}
                                    </Badge>
                                  ) : member.counselorName ? (
                                    <Badge variant="secondary" className="text-xs">
                                      상담사: {member.counselorName}
                                    </Badge>
                                  ) : null}

                                  {elderlyRelationsMap.get(member.id)?.guardian ? (
                                    <Badge variant="outline" className="text-xs bg-accent/5 text-accent border-accent/20">
                                      보호자: {elderlyRelationsMap.get(member.id)?.guardian?.name}
                                    </Badge>
                                  ) : member.guardianName ? (
                                    <Badge variant="outline" className="text-xs bg-accent/5 text-accent border-accent/20">
                                      보호자: {member.guardianName}
                                    </Badge>
                                  ) : null}

                                  {!elderlyRelationsMap.get(member.id)?.assignment && !member.counselorName &&
                                    !elderlyRelationsMap.get(member.id)?.guardian && !member.guardianName && (
                                      <span className="text-muted-foreground">미배정</span>
                                    )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {member.createdAt?.split('T')[0] || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    if (member.role === 'COUNSELOR') handleCounselorClick(member.original);
                                    else if (member.role === 'GUARDIAN') handleGuardianClick(member.original);
                                    else if (member.role === 'ELDERLY') handleElderlyClick(member.original);
                                  }}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    상세보기
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                    <Pencil className="w-4 h-4 mr-2 text-blue-500" />
                                    수정
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMember(member.id, member.role);
                                  }}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    삭제
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          {/* Counselors Tab */}
          <TabsContent value="counselors" className="space-y-4">
            <Card className="shadow-card border-0">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%] min-w-[120px]">이름</TableHead>
                        <TableHead className="w-[10%] min-w-[80px] text-transparent select-none">&nbsp;Role</TableHead>
                        <TableHead className="w-[15%] min-w-[120px]">연락처</TableHead>
                        <TableHead className="w-[30%] min-w-[200px]">담당 어르신</TableHead>
                        <TableHead className="w-[15%] min-w-[100px]">등록일</TableHead>
                        <TableHead className="w-[15%] min-w-[80px] text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCounselors.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {searchQuery ? '검색 결과가 없습니다.' : '등록된 상담사가 없습니다.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCounselors.map((counselor) => {
                          // Get cached assignments
                          const cachedAssignments = counselorAssignmentsMap.get(counselor.id) || [];

                          return (
                            <TableRow
                              key={counselor.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleCounselorClick(counselor)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-9 h-9">
                                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                      {counselor.name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{counselor.name}</p>
                                    <p className="text-sm text-muted-foreground">{counselor.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-muted-foreground">{formatPhoneNumber(counselor.phone)}</TableCell>
                              <TableCell>
                                {cachedAssignments.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    <Badge variant="secondary">{cachedAssignments.length}명</Badge>
                                    {cachedAssignments.slice(0, 2).map((assignment, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {assignment.elderlyName}
                                      </Badge>
                                    ))}
                                    {cachedAssignments.length > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{cachedAssignments.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="secondary">0명</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {counselor.createdAt?.split('T')[0]}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCounselorClick(counselor); }}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      상세보기
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                      <Pencil className="w-4 h-4 mr-2 text-blue-500" />
                                      수정
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMember(counselor.id, 'COUNSELOR');
                                    }}>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      삭제
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Guardians Tab */}
          <TabsContent value="guardians" className="space-y-4">
            <Card className="shadow-card border-0">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%] min-w-[120px]">이름</TableHead>
                        <TableHead className="w-[10%] min-w-[80px] text-transparent select-none">&nbsp;Role</TableHead>
                        <TableHead className="w-[15%] min-w-[120px]">연락처</TableHead>
                        <TableHead className="w-[30%] min-w-[200px]">관련 어르신</TableHead>
                        <TableHead className="w-[15%] min-w-[100px]">등록일</TableHead>
                        <TableHead className="w-[15%] min-w-[80px] text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGuardians.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {searchQuery ? '검색 결과가 없습니다.' : '등록된 보호자가 없습니다.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredGuardians.map((guardian) => {
                          const guardianElderlyData = guardianElderlyMap.get(guardian.id);

                          return (
                            <TableRow
                              key={guardian.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleGuardianClick(guardian)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-9 h-9">
                                    <AvatarFallback className="bg-accent/10 text-accent text-sm">
                                      {guardian.name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{guardian.name}</p>
                                    <p className="text-sm text-muted-foreground">{guardian.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-muted-foreground">{formatPhoneNumber(guardian.phone)}</TableCell>
                              <TableCell>
                                {guardianElderlyData ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {guardianElderlyData.elderlyName} ({guardianElderlyData.relationType})
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {guardian.createdAt?.split('T')[0] || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleGuardianClick(guardian); }}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      상세보기
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                      <Pencil className="w-4 h-4 mr-2 text-blue-500" />
                                      수정
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMember(guardian.id, 'GUARDIAN');
                                    }}>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      삭제
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Seniors Tab */}
          <TabsContent value="seniors" className="space-y-4">
            <Card className="shadow-card border-0">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%] min-w-[120px]">이름</TableHead>
                        <TableHead className="w-[10%] min-w-[80px]">나이</TableHead>
                        <TableHead className="w-[10%] min-w-[80px]">성별</TableHead>
                        <TableHead className="w-[15%] min-w-[120px]">보호자</TableHead>
                        <TableHead className="w-[15%] min-w-[120px]">연락처</TableHead>
                        <TableHead className="w-[20%] min-w-[180px]">주소</TableHead>
                        <TableHead className="w-[15%] min-w-[100px]">담당 상담사</TableHead>
                        <TableHead className="w-[10%] min-w-[80px] text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredElderly.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {searchQuery ? '검색 결과가 없습니다.' : '등록된 어르신이 없습니다.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredElderly.map((elderlyMember) => {
                          // Get cached relations
                          const cachedRelations = elderlyRelationsMap.get(elderlyMember.userId);
                          const guardianInfo = cachedRelations?.guardian;
                          const assignmentInfo = cachedRelations?.assignment;

                          return (
                            <TableRow
                              key={elderlyMember.userId}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleElderlyClick(elderlyMember)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-9 h-9">
                                    <AvatarFallback className="bg-info/10 text-info text-sm">
                                      {elderlyMember.name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{elderlyMember.name}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{elderlyMember.age}세</TableCell>
                              <TableCell>
                                {elderlyMember.gender === 'M' ? '남성' :
                                  elderlyMember.gender === 'F' ? '여성' : '-'}
                              </TableCell>
                              <TableCell>
                                {guardianInfo ? (
                                  <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20">
                                    {guardianInfo.name}
                                  </Badge>
                                ) : elderlyMember.guardianName ? (
                                  <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20">
                                    {elderlyMember.guardianName}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{formatPhoneNumber(elderlyMember.phone)}</TableCell>
                              <TableCell className="text-muted-foreground max-w-[200px] truncate">
                                {elderlyMember.fullAddress || elderlyMember.addressLine1}
                              </TableCell>
                              <TableCell>
                                {assignmentInfo ? (
                                  <Badge variant="secondary">{assignmentInfo.counselorName}</Badge>
                                ) : elderlyMember.counselorName ? (
                                  <Badge variant="secondary">{elderlyMember.counselorName}</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">미배정</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleElderlyClick(elderlyMember); }}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      상세보기
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                      <Pencil className="w-4 h-4 mr-2 text-blue-500" />
                                      수정
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMember(elderlyMember.userId, 'ELDERLY');
                                    }}>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      삭제
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Counselor Detail Dialog */}
        <Dialog open={!!selectedCounselor} onOpenChange={() => setSelectedCounselor(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedCounselor?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span>{selectedCounselor?.name}</span>
                  <p className="text-sm font-normal text-muted-foreground">상담사</p>
                </div>
              </DialogTitle>
              <DialogDescription>담당 어르신 목록</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">이메일</p>
                  <p className="font-medium">{selectedCounselor?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">연락처</p>
                  <p className="font-medium">{formatPhoneNumber(selectedCounselor?.phone)}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">담당 어르신 ({counselorElderly.length}명)</h4>
                {isDetailLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : counselorElderly.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">배정된 어르신이 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {counselorElderly.map((assignment) => (
                      <div key={assignment.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-info/10 text-info text-xs">
                            {assignment.elderlyName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{assignment.elderlyName}</p>
                          <p className="text-xs text-muted-foreground">
                            배정일: {assignment.assignedAt?.split('T')[0]}
                          </p>
                        </div>
                        <StatusBadge status={assignment.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Guardian Detail Dialog */}
        <Dialog open={!!selectedGuardian} onOpenChange={() => setSelectedGuardian(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-accent/10 text-accent">
                    {selectedGuardian?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span>{selectedGuardian?.name}</span>
                  <p className="text-sm font-normal text-muted-foreground">보호자</p>
                </div>
              </DialogTitle>
              <DialogDescription>담당 어르신 목록</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">이메일</p>
                  <p className="font-medium">{selectedGuardian?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">연락처</p>
                  <p className="font-medium">{formatPhoneNumber(selectedGuardian?.phone)}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">담당 어르신</h4>
                {isDetailLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : !guardianElderly ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">연결된 어르신이 없습니다.</p>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-info/10 text-info text-xs">
                        {guardianElderly.elderlyName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{guardianElderly.elderlyName}</p>
                      <p className="text-xs text-muted-foreground">{formatPhoneNumber(guardianElderly.elderlyPhone)}</p>
                    </div>
                    <Badge variant="outline">{guardianElderly.relationType}</Badge>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Elderly Detail Dialog */}
        <Dialog open={!!selectedElderly} onOpenChange={() => setSelectedElderly(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-info/10 text-info">
                    {selectedElderly?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span>{selectedElderly?.name}</span>
                  <p className="text-sm font-normal text-muted-foreground">
                    {selectedElderly?.age}세 | {selectedElderly?.gender}
                  </p>
                </div>
              </DialogTitle>
              <DialogDescription>관계 정보</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm">
                <p className="text-muted-foreground">주소</p>
                <p className="font-medium">{selectedElderly?.fullAddress || selectedElderly?.addressLine1 || '정보 없음'}</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">연락처</p>
                <p className="font-medium">{formatPhoneNumber(selectedElderly?.phone)}</p>
              </div>

              {isDetailLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="font-medium mb-2">담당 상담사</h4>
                    {elderlyAssignment ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {elderlyAssignment.counselorName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{elderlyAssignment.counselorName}</p>
                          <p className="text-xs text-muted-foreground">
                            배정일: {elderlyAssignment.assignedAt?.split('T')[0]}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">배정된 상담사가 없습니다.</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">보호자</h4>
                    {elderlyGuardian ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-accent/10 text-accent">
                            {elderlyGuardian.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{elderlyGuardian.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPhoneNumber(elderlyGuardian.phone)}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">연결된 보호자가 없습니다.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default MemberManagement;
