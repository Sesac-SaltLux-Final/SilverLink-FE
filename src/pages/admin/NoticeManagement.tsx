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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Pin,
  Loader2,
  Archive,
  Settings,
  Users,
  CheckCircle2,
  Upload,
  File,
  X,
  Edit
} from "lucide-react";
import { adminNavItems } from "@/config/adminNavItems";
import { Megaphone } from "lucide-react";
import noticesApi from "@/api/notices";
import type { NoticeRequest } from "@/api/notices";
import { NoticeResponse } from "@/types/api";
import filesApi from "@/api/files";
import type { FileUploadResponse } from "@/api/files";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface Notice {
  id: number;
  title: string;
  content: string;
  category: string;
  targetRoles: string[];
  isPinned: boolean;
  status: "DRAFT" | "PUBLISHED" | "DELETED";
  createdAt: string;
  updatedAt: string;
  readCount?: number;
  totalTargetCount?: number;
}

const NoticeManagement = () => {
  const { user } = useAuth();



  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isViewEditMode, setIsViewEditMode] = useState(false);
  const [viewFormData, setViewFormData] = useState({
    title: "",
    content: "",
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReadStatusDialogOpen, setIsReadStatusDialogOpen] = useState(false);
  const [readStatusData, setReadStatusData] = useState<{
    confirmUsers: Array<{
      userId: number;
      name: string;
      confirmedAt: string;
    }>;
    loading: boolean;
    noticeTitle: string;
  }>({
    confirmUsers: [],
    loading: false,
    noticeTitle: "",
  });
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "공지",
    target: "전체",
    targetRoles: [] as string[], // 여러 역할 선택을 위한 배열
    isPinned: false,
    isPopup: false,
    status: "PUBLISHED" as "DRAFT" | "PUBLISHED",
  });

  // 파일 업로드 상태 관리
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResponse[]>([]);
  const [fileUploading, setFileUploading] = useState(false);

  // 파일 업로드 핸들러
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // 허용된 파일 형식
    const allowedTypes = [
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
    ];

    const allowedFiles = Array.from(files).filter(file => allowedTypes.includes(file.type));

    if (allowedFiles.length === 0) {
      toast.error("지원하지 않는 파일 형식입니다. PDF, Word, Excel, 이미지 파일만 업로드 가능합니다.");
      return;
    }

    if (allowedFiles.length !== files.length) {
      toast.error("일부 파일은 지원하지 않는 형식이어서 제외되었습니다.");
    }

    // 파일 크기 체크 (10MB)
    const maxSize = 10 * 1024 * 1024;
    const oversizedFiles = allowedFiles.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error(`파일 크기는 10MB를 초과할 수 없습니다. (${oversizedFiles.map(f => f.name).join(', ')})`);
      return;
    }

    try {
      setFileUploading(true);

      const uploadPromises = allowedFiles.map(file =>
        filesApi.uploadFile(file, 'notices')
      );

      const uploadResults = await Promise.all(uploadPromises);

      setUploadedFiles(prev => [...prev, ...uploadResults]);
      toast.success(`${uploadResults.length}개의 파일이 업로드되었습니다.`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "파일 업로드에 실패했습니다.";
      toast.error(`파일 업로드 실패: ${errorMessage}`);
    } finally {
      setFileUploading(false);
      // 파일 입력 초기화
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // 파일 삭제 핸들러
  const handleFileRemove = async (fileIndex: number) => {
    const fileToRemove = uploadedFiles[fileIndex];
    if (!fileToRemove) return;

    try {

      await filesApi.deleteFile(fileToRemove.filePath);
      setUploadedFiles(prev => prev.filter((_, index) => index !== fileIndex));
      toast.success("파일이 삭제되었습니다.");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "파일 삭제에 실패했습니다.";
      toast.error(`파일 삭제 실패: ${errorMessage}`);
    }
  };

  // 데이터 로드
  const fetchNotices = async () => {
    try {
      setLoading(true);

      const response = await noticesApi.getAdminNotices({
        keyword: searchTerm || undefined,
        size: 100
      });

      // API 응답을 Notice 형식으로 변환
      const mappedNotices: Notice[] = (response.content || []).map((n: NoticeResponse) => {

        // 백엔드 카테고리를 프론트엔드 카테고리로 매핑
        let frontendCategory = '공지';
        if (n.category === 'NOTICE') {
          frontendCategory = '공지';
        } else if (n.category === 'EVENT') {
          frontendCategory = '이벤트';
        } else if (n.category === 'SYSTEM') {
          frontendCategory = '업데이트';
        } else if (n.category === 'NEWS') {
          frontendCategory = '긴급';
        }

        // 백엔드 역할을 프론트엔드 역할로 매핑 (관리자 제외)
        const frontendRoles = (n.targetRoles || [])
          .filter(role => role !== 'ADMIN') // 관리자 제외
          .map(role => {
            switch (role) {
              case 'COUNSELOR': return '상담사';
              case 'GUARDIAN': return '보호자';
              case 'ELDERLY': return '어르신';
              default: return '전체';
            }
          });

        const mappedNotice = {
          id: n.id,
          title: n.title,
          content: n.content || '',
          category: frontendCategory,
          targetRoles: frontendRoles.length > 0 ? frontendRoles : ['전체'],
          isPinned: n.isPriority || false, // 백엔드의 isPriority를 isPinned로 매핑
          status: n.status,
          createdAt: n.createdAt ? new Date(n.createdAt).toLocaleDateString('ko-KR') : '',
          updatedAt: n.updatedAt ? new Date(n.updatedAt).toLocaleDateString('ko-KR') : '',
          readCount: n.readCount || 0, // 백엔드에서 제공하는 실제 데이터 사용
          totalTargetCount: n.totalTargetCount || 0, // 백엔드에서 제공하는 실제 데이터 사용
        };

        return mappedNotice;
      });

      setNotices(mappedNotices);
    } catch (error: any) {
      console.error("공지사항 로드 실패:", error);
      console.error("오류 상세:", error.response?.data || error.message);

      // 인증 오류인 경우 특별 처리
      if (error.response?.status === 401) {
        toast.error("로그인이 필요합니다. 다시 로그인해주세요.");
        return;
      }

      // 서버 연결 오류인 경우
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        toast.error("서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.");
        return;
      }

      const errorMessage = error.response?.data?.message || error.message || "알 수 없는 오류가 발생했습니다.";
      toast.error(`공지사항을 불러오는데 실패했습니다: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const filteredNotices = notices.filter((notice) => {
    const matchesSearch = notice.title.includes(searchTerm) || notice.content.includes(searchTerm);
    const matchesCategory = filterCategory === "all" || notice.category === filterCategory;
    const matchesStatus = filterStatus === "all" || notice.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleCreate = () => {
    setIsEditMode(false);
    setFormData({
      title: "",
      content: "",
      category: "공지",
      target: "전체",
      targetRoles: [],
      isPinned: false,
      isPopup: false,
      status: "PUBLISHED",
    });
    setUploadedFiles([]); // 파일 목록 초기화
    setIsDialogOpen(true);
  };

  const handleEdit = async (notice: Notice) => {
    setIsEditMode(true);
    setSelectedNotice(notice);

    // targetRoles 배열을 백엔드 형식으로 변환 (관리자 제외)
    const backendRoles = notice.targetRoles
      .filter(role => role !== "전체" && role !== "관리자") // 관리자 제외
      .map(role => {
        switch (role) {
          case '보호자': return 'GUARDIAN';
          case '상담사': return 'COUNSELOR';
          case '어르신': return 'ELDERLY';
          default: return '';
        }
      })
      .filter(role => role !== '');

    setFormData({
      title: notice.title,
      content: notice.content,
      category: notice.category,
      target: notice.targetRoles.includes("전체") ? "전체" : "선택",
      targetRoles: notice.targetRoles.filter(role => role !== "전체" && role !== "관리자"), // 관리자 제외
      isPinned: notice.isPinned,
      isPopup: false, // 기본값으로 설정
      status: notice.status,
    });

    // 기존 첨부파일 로드
    try {

      const detailResponse = await noticesApi.getAdminNoticeDetail(notice.id);

      if (detailResponse.attachments && detailResponse.attachments.length > 0) {
        setUploadedFiles(detailResponse.attachments);
      } else {
        setUploadedFiles([]);
      }
    } catch (error: any) {
      console.error("첨부파일 로드 실패:", error);
      setUploadedFiles([]);
      // 첨부파일 로드 실패는 치명적이지 않으므로 에러 토스트는 표시하지 않음
    }

    setIsDialogOpen(true);
  };

  const handleView = (notice: Notice) => {
    setSelectedNotice(notice);
    setViewFormData({
      title: notice.title,
      content: notice.content,
    });
    setIsViewEditMode(false);
    setIsViewDialogOpen(true);
  };

  // 읽음 현황 상세 조회
  const handleReadStatusClick = async (notice: Notice) => {
    setReadStatusData({
      confirmUsers: [],
      loading: true,
      noticeTitle: notice.title,
    });
    setIsReadStatusDialogOpen(true);

    try {

      const confirmUsers = await noticesApi.getConfirmList(notice.id);

      setReadStatusData({
        confirmUsers: confirmUsers.map(user => ({
          userId: user.userId,
          name: user.name,
          confirmedAt: user.confirmedAt,
        })),
        loading: false,
        noticeTitle: notice.title,
      });
    } catch (error: any) {
      console.error("읽음 현황 조회 실패:", error);
      console.error("오류 상세:", error.response?.data || error.message);

      // 백엔드 API가 아직 구현되지 않은 경우 더미 데이터 사용
      if (error.response?.status === 404 || error.response?.status === 500) {
        const dummyUsers = [
          {
            userId: 1,
            name: "김철수",
            confirmedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30분 전
          },
          {
            userId: 2,
            name: "이영희",
            confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2시간 전
          },
          {
            userId: 3,
            name: "박민수",
            confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5시간 전
          },
        ];

        setReadStatusData({
          confirmUsers: dummyUsers.slice(0, notice.readCount || 0),
          loading: false,
          noticeTitle: notice.title,
        });
      } else {
        setReadStatusData({
          confirmUsers: [],
          loading: false,
          noticeTitle: notice.title,
        });
        toast.error("읽음 현황을 불러오는데 실패했습니다.");
      }
    }
  };

  const handleDelete = (notice: Notice) => {
    setSelectedNotice(notice);
    setIsDeleteDialogOpen(true);
  };

  const handleViewSave = async () => {
    if (!selectedNotice || !viewFormData.title.trim() || !viewFormData.content.trim()) {
      toast.error("제목과 내용을 입력해주세요.");
      return;
    }

    try {
      setSubmitting(true);

      // 기존 공지사항의 설정을 유지하면서 제목과 내용만 수정
      const categoryMap: Record<string, 'NOTICE' | 'EVENT' | 'NEWS' | 'SYSTEM'> = {
        '공지': 'NOTICE',
        '긴급': 'NOTICE',
        '업데이트': 'SYSTEM',
        '이벤트': 'EVENT',
      };

      const roleMap: Record<string, 'ADMIN' | 'COUNSELOR' | 'GUARDIAN' | 'ELDERLY'> = {
        '보호자': 'GUARDIAN',
        '상담사': 'COUNSELOR',
        '어르신': 'ELDERLY',
        '관리자': 'ADMIN',
      };

      // targetRoles 배열 생성
      let targetRoles: ('ADMIN' | 'COUNSELOR' | 'GUARDIAN' | 'ELDERLY')[] | undefined;
      if (selectedNotice.targetRoles[0] !== "전체") {
        const mappedRole = roleMap[selectedNotice.targetRoles[0]];
        if (mappedRole) {
          targetRoles = [mappedRole];
        }
      }

      const request: NoticeRequest = {
        title: viewFormData.title.trim(),
        content: viewFormData.content.trim(),
        category: categoryMap[selectedNotice.category] || 'NOTICE',
        targetMode: selectedNotice.targetRoles[0] === "전체" ? 'ALL' : 'ROLE_SET',
        targetRoles: targetRoles,
        isPriority: selectedNotice.isPinned,
        isPopup: false, // 기본값
        status: selectedNotice.status,
        attachments: [], // 보기 모드에서는 첨부파일 수정 불가 (현재는 빈 배열)
      };

      await noticesApi.updateNotice(selectedNotice.id, request);
      toast.success("공지사항이 수정되었습니다.");
      await fetchNotices();
      setIsViewDialogOpen(false);
      setIsViewEditMode(false);
    } catch (error: any) {
      console.error("수정 실패:", error);

      let errorMessage = "알 수 없는 오류가 발생했습니다.";
      if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "입력 데이터가 올바르지 않습니다.";
      } else if (error.response?.status === 401) {
        errorMessage = "로그인이 필요합니다.";
      } else if (error.response?.status === 403) {
        errorMessage = "권한이 없습니다.";
      } else if (error.response?.status === 500) {
        errorMessage = "서버 내부 오류가 발생했습니다.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(`공지사항 수정에 실패했습니다: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 상태 변경 핸들러 (임시 비활성화 - 백엔드 API 미구현)
  const handleStatusChange = async (noticeId: number, newStatus: string) => {
    toast.error("상태 변경 기능은 현재 준비 중입니다. 수정 버튼을 사용해주세요.");
    return;

    /* 백엔드 API 구현 후 활성화
    try {
      console.log("=== 상태 변경 시작 ===");
      console.log("noticeId:", noticeId);
      console.log("newStatus:", newStatus);
      
      const result = await noticesApi.changeNoticeStatus(noticeId, newStatus);
      console.log("상태 변경 결과:", result);
      
      // 즉시 UI 업데이트
      setNotices(prev => prev.map(notice => 
        notice.id === noticeId 
          ? { ...notice, status: newStatus as "DRAFT" | "PUBLISHED" }
          : notice
      ));
      
      toast.success("상태가 변경되었습니다.");
      console.log("=== 상태 변경 완료 ===");
      
      // 서버에서 최신 데이터 다시 가져오기
      setTimeout(() => {
        fetchNotices();
      }, 500);
    } catch (error: any) {
      console.error("=== 상태 변경 실패 ===");
      console.error("error:", error);
      console.error("error.response:", error.response);
      console.error("error.response.data:", error.response?.data);
      console.error("error.response.status:", error.response?.status);
      
      const errorMessage = error.response?.data?.message || error.message || "알 수 없는 오류가 발생했습니다.";
      toast.error(`상태 변경에 실패했습니다: ${errorMessage}`);
      
      // 실패 시 원래 데이터로 되돌리기 위해 새로고침
      fetchNotices();
    }
    */
  };

  // 분류 변경 핸들러 (임시 비활성화 - 백엔드 API 미구현)
  const handleCategoryChange = async (noticeId: number, newCategory: string) => {
    toast.error("분류 변경 기능은 현재 준비 중입니다. 수정 버튼을 사용해주세요.");
    return;

    /* 백엔드 API 구현 후 활성화
    try {
      console.log(`분류 변경 시도: ID ${noticeId}, 새 분류: ${newCategory}`);
      
      // 한글 카테고리를 백엔드 enum으로 매핑
      const categoryMap: Record<string, string> = {
        '공지': 'NOTICE',
        '긴급': 'NOTICE',
        '업데이트': 'SYSTEM',
        '이벤트': 'EVENT',
      };
      
      const backendCategory = categoryMap[newCategory] || 'NOTICE';
      const isPriority = newCategory === '긴급';
      
      await noticesApi.changeNoticeCategory(noticeId, backendCategory, isPriority);
      
      // 즉시 UI 업데이트
      setNotices(prev => prev.map(notice => 
        notice.id === noticeId 
          ? { ...notice, category: newCategory, isPinned: isPriority }
          : notice
      ));
      
      toast.success("분류가 변경되었습니다.");
      
      setTimeout(() => {
        fetchNotices();
      }, 500);
    } catch (error: any) {
      console.error("분류 변경 실패:", error);
      const errorMessage = error.response?.data?.message || error.message || "알 수 없는 오류가 발생했습니다.";
      toast.error(`분류 변경에 실패했습니다: ${errorMessage}`);
      fetchNotices();
    }
    */
  };

  // 대상 변경 핸들러 (임시 비활성화 - 백엔드 API 미구현)
  const handleTargetChange = async (noticeId: number, newTarget: string) => {
    toast.error("대상 변경 기능은 현재 준비 중입니다. 수정 버튼을 사용해주세요.");
    return;

    /* 백엔드 API 구현 후 활성화
    try {
      console.log(`대상 변경 시도: ID ${noticeId}, 새 대상: ${newTarget}`);
      
      // 한글 대상을 백엔드 형식으로 매핑
      const roleMap: Record<string, string> = {
        '보호자': 'GUARDIAN',
        '상담사': 'COUNSELOR',
        '어르신': 'ELDERLY',
        '관리자': 'ADMIN',
      };
      
      const targetMode = newTarget === "전체" ? 'ALL' : 'ROLE_SET';
      const targetRoles = newTarget === "전체" ? undefined : [roleMap[newTarget]];
      
      await noticesApi.changeNoticeTarget(noticeId, targetMode, targetRoles);
      
      // 즉시 UI 업데이트
      setNotices(prev => prev.map(notice => 
        notice.id === noticeId 
          ? { ...notice, targetRoles: [newTarget] }
          : notice
      ));
      
      toast.success("대상이 변경되었습니다.");
      
      setTimeout(() => {
        fetchNotices();
      }, 500);
    } catch (error: any) {
      console.error("대상 변경 실패:", error);
      const errorMessage = error.response?.data?.message || error.message || "알 수 없는 오류가 발생했습니다.";
      toast.error(`대상 변경에 실패했습니다: ${errorMessage}`);
      fetchNotices();
    }
    */
  };

  const confirmDelete = async () => {
    if (selectedNotice) {
      try {

        await noticesApi.deleteNotice(selectedNotice.id);

        // UI에서 해당 공지사항 제거 (Soft Delete이므로 목록에서만 제거)
        setNotices((prev) => prev.filter((n) => n.id !== selectedNotice.id));
        toast.success("공지사항이 삭제되었습니다.");
      } catch (error: any) {
        console.error("=== 공지사항 삭제 실패 ===");
        console.error("error:", error);
        console.error("error.response:", error.response);
        console.error("error.response.data:", error.response?.data);
        console.error("error.response.status:", error.response?.status);

        let errorMessage = "알 수 없는 오류가 발생했습니다.";
        if (error.response?.status === 400) {
          errorMessage = "잘못된 요청입니다.";
        } else if (error.response?.status === 401) {
          errorMessage = "로그인이 필요합니다.";
        } else if (error.response?.status === 403) {
          errorMessage = "삭제 권한이 없습니다.";
        } else if (error.response?.status === 404) {
          errorMessage = "공지사항을 찾을 수 없습니다.";
        } else if (error.response?.status === 500) {
          errorMessage = "서버 내부 오류가 발생했습니다.";
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast.error(`공지사항 삭제에 실패했습니다: ${errorMessage}`);
      }
    }
    setIsDeleteDialogOpen(false);
  };

  const handleSubmit = async (isDraft = false) => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("제목과 내용을 입력해주세요.");
      return;
    }

    // 역할 선택 모드일 때 최소 1개 이상 선택 확인
    if (formData.target === "선택" && formData.targetRoles.length === 0) {
      toast.error("최소 1개 이상의 대상 역할을 선택해주세요.");
      return;
    }

    try {
      setSubmitting(true);

      // 한글 카테고리 → 백엔드 enum 매핑
      const categoryMap: Record<string, 'NOTICE' | 'EVENT' | 'NEWS' | 'SYSTEM'> = {
        '공지': 'NOTICE',
        '긴급': 'NEWS',
        '업데이트': 'SYSTEM',
        '이벤트': 'EVENT',
      };

      // 한글 대상 → 백엔드 Role enum 매핑
      const roleMap: Record<string, 'ADMIN' | 'COUNSELOR' | 'GUARDIAN' | 'ELDERLY'> = {
        '보호자': 'GUARDIAN',
        '상담사': 'COUNSELOR',
        '어르신': 'ELDERLY',
        '관리자': 'ADMIN',
      };

      // targetRoles 배열 생성 (백엔드에서 배열로 처리)
      let targetRoles: ('ADMIN' | 'COUNSELOR' | 'GUARDIAN' | 'ELDERLY')[] | undefined;
      if (formData.target === "선택" && formData.targetRoles.length > 0) {
        // 여러 역할 선택
        targetRoles = formData.targetRoles
          .map(role => roleMap[role])
          .filter(role => role !== undefined) as ('ADMIN' | 'COUNSELOR' | 'GUARDIAN' | 'ELDERLY')[];
      } else if (formData.target !== "전체" && formData.target !== "선택") {
        // 단일 역할 선택 (하위 호환성)
        const mappedRole = roleMap[formData.target];
        if (mappedRole) {
          targetRoles = [mappedRole];
        }
      }

      // 상태 결정: 임시저장이면 DRAFT, 아니면 사용자가 선택한 상태
      const finalStatus = isDraft ? 'DRAFT' : formData.status;

      const request: NoticeRequest = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: categoryMap[formData.category] || 'NOTICE',
        targetMode: formData.target === "전체" ? 'ALL' : 'ROLE_SET',
        targetRoles: targetRoles && targetRoles.length > 0 ? targetRoles : undefined,
        isPriority: formData.isPinned, // 카테고리와 관계없이 isPinned 값만 사용
        isPopup: formData.isPopup || false,
        status: finalStatus, // 임시저장이면 DRAFT, 아니면 사용자 선택 상태
        attachments: uploadedFiles.map(file => ({
          fileName: file.fileName,
          originalFileName: file.originalFileName,
          filePath: file.filePath,
          fileSize: file.fileSize,
        })), // 업로드된 파일들을 첨부파일로 추가
      };

      // 팝업 설정이 있는 경우 시간 설정 (현재는 기본값)
      if (request.isPopup) {
        const now = new Date();
        const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일 후
        request.popupStartAt = now.toISOString();
        request.popupEndAt = endDate.toISOString();
      }

      if (isEditMode && selectedNotice) {
        await noticesApi.updateNotice(selectedNotice.id, request);

        if (isDraft) {
          toast.success("공지사항이 임시저장되었습니다.");
        } else {
          toast.success("공지사항이 수정되었습니다.");
        }
      } else {
        const noticeId = await noticesApi.createNotice(request);

        if (isDraft) {
          toast.success("공지사항이 임시저장되었습니다.");
        } else {
          const statusMessage = finalStatus === "PUBLISHED" ? "게시되었습니다" : "비공개로 저장되었습니다";
          toast.success(`새 공지사항이 ${statusMessage}.`);
        }
      }

      await fetchNotices();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("=== 공지사항 저장 실패 ===");
      console.error("error:", error);
      console.error("error.response:", error.response);
      console.error("error.response.data:", error.response?.data);
      console.error("error.response.status:", error.response?.status);
      console.error("error.message:", error.message);

      // 구체적인 오류 메시지 처리
      let errorMessage = "알 수 없는 오류가 발생했습니다.";

      if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "입력 데이터가 올바르지 않습니다.";
      } else if (error.response?.status === 401) {
        errorMessage = "로그인이 필요합니다. 다시 로그인해주세요.";
      } else if (error.response?.status === 403) {
        errorMessage = "권한이 없습니다.";
      } else if (error.response?.status === 500) {
        errorMessage = "서버 내부 오류가 발생했습니다.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(`공지사항 저장에 실패했습니다: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "공지":
        return <Badge className="bg-primary/10 text-primary border-0">공지</Badge>;
      case "긴급":
        return <Badge className="bg-destructive/10 text-destructive border-0">긴급</Badge>;
      case "업데이트":
        return <Badge className="bg-info/10 text-info border-0">업데이트</Badge>;
      case "이벤트":
        return <Badge className="bg-success/10 text-success border-0">이벤트</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return <Badge className="bg-success/10 text-success border-0">게시중</Badge>;
      case "DRAFT":
        return <Badge className="bg-gray-100 text-gray-700 border-0">비공개</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
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
      userName={user?.name || "관리자"}
      navItems={adminNavItems}
    >
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">공지사항 관리</h1>
              <p className="text-muted-foreground">공지사항을 작성하고 관리합니다</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleCreate} className="gap-2">
                  <Plus className="w-4 h-4" />
                  새 공지사항
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>새로운 공지사항 작성</p>
              </TooltipContent>
            </Tooltip>

          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">전체</p>
                    <p className="text-xl font-bold">{notices.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">게시중</p>
                    <p className="text-xl font-bold">{notices.filter((n) => n.status === "PUBLISHED").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Pencil className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">비공개</p>
                    <p className="text-xl font-bold">{notices.filter((n) => n.status === "DRAFT").length}</p>
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="제목, 내용 검색..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>공지사항 제목이나 내용으로 검색</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="분류" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 분류</SelectItem>
                    <SelectItem value="공지">공지</SelectItem>
                    <SelectItem value="긴급">긴급</SelectItem>
                    <SelectItem value="업데이트">업데이트</SelectItem>
                    <SelectItem value="이벤트">이벤트</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="PUBLISHED">게시중</SelectItem>
                    <SelectItem value="DRAFT">비공개</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notices Table */}
          <Card>
            <CardHeader>
              <CardTitle>공지사항 목록</CardTitle>
              <CardDescription>총 {filteredNotices.length}건</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {filteredNotices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  공지사항이 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="max-w-md">제목</TableHead>
                        <TableHead className="w-24">분류</TableHead>
                        <TableHead className="w-32">대상</TableHead>
                        <TableHead className="w-28">등록일</TableHead>
                        <TableHead className="w-24">상태</TableHead>
                        <TableHead className="text-right w-28">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNotices.map((notice) => (
                        <TableRow
                          key={notice.id}
                          className={notice.isPinned ? "bg-red-50 border-l-4 border-l-red-500" : ""}
                        >
                          <TableCell>
                            {notice.isPinned && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Pin className="w-4 h-4 text-red-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>중요공지 (상단 고정)</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleView(notice)}
                              className={`font-medium line-clamp-1 text-left hover:text-primary hover:underline transition-colors ${notice.isPinned ? "text-red-700 font-semibold" : ""
                                }`}
                            >
                              {notice.isPinned && "📌 "}
                              {notice.title}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              notice.category === '긴급' ? 'bg-destructive/10 text-destructive border-0' :
                                notice.category === '공지' ? 'bg-primary/10 text-primary border-0' :
                                  notice.category === '업데이트' ? 'bg-info/10 text-info border-0' :
                                    'bg-success/10 text-success border-0'
                            }>
                              {notice.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {notice.targetRoles.map((role, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{notice.createdAt}</TableCell>
                          <TableCell>
                            <Badge className={
                              notice.status === 'PUBLISHED' ? 'bg-success/10 text-success border-0' :
                                'bg-gray-100 text-gray-700 border-0'
                            }>
                              {notice.status === 'PUBLISHED' ? '게시중' : '비공개'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleEdit(notice)}>
                                    <Settings className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>수정</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleDelete(notice)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>삭제</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "공지사항 수정" : "새 공지사항 작성"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "공지사항을 수정합니다." : "새로운 공지사항을 작성합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>제목</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="공지사항 제목"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>분류</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      category: value
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="공지">공지</SelectItem>
                    <SelectItem value="긴급">긴급</SelectItem>
                    <SelectItem value="업데이트">업데이트</SelectItem>
                    <SelectItem value="이벤트">이벤트</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>대상</Label>
                <Select
                  value={formData.target}
                  onValueChange={(value) => {
                    if (value === "전체") {
                      setFormData({ ...formData, target: value, targetRoles: [] });
                    } else {
                      setFormData({ ...formData, target: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체</SelectItem>
                    <SelectItem value="선택">역할 선택</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 역할 선택 UI */}
            {formData.target === "선택" && (
              <div className="space-y-2">
                <Label>대상 역할 선택 (복수 선택 가능)</Label>
                <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
                  {['보호자', '상담사', '어르신'].map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`role-${role}`}
                        checked={formData.targetRoles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              targetRoles: [...formData.targetRoles, role]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              targetRoles: formData.targetRoles.filter(r => r !== role)
                            });
                          }
                        }}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label
                        htmlFor={`role-${role}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {role}
                      </label>
                    </div>
                  ))}
                </div>
                {formData.targetRoles.length === 0 && (
                  <p className="text-xs text-destructive">최소 1개 이상의 역할을 선택해주세요.</p>
                )}
                {formData.targetRoles.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    선택된 역할: {formData.targetRoles.join(', ')}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="공지사항 내용을 입력하세요"
                rows={8}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex flex-col">
                <span>상단 고정</span>
                <span className="text-xs text-muted-foreground">중요한 공지사항을 목록 상단에 고정합니다</span>
              </div>
              <Switch
                checked={formData.isPinned}
                onCheckedChange={(checked) => {
                  setFormData({ ...formData, isPinned: checked });
                }}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span>팝업 공지</span>
              <Switch
                checked={formData.isPopup || false}
                onCheckedChange={(checked) => setFormData({ ...formData, isPopup: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label>게시 상태</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "DRAFT" | "PUBLISHED") => {
                  setFormData({ ...formData, status: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLISHED">게시중</SelectItem>
                  <SelectItem value="DRAFT">비공개</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.status === "PUBLISHED"
                  ? "공지사항이 즉시 게시되어 사용자들이 볼 수 있습니다."
                  : "공지사항이 비공개 상태로 저장되어 사용자들이 볼 수 없습니다."
                }
                <br />
                <span className="text-blue-600">💡 임시저장 버튼을 사용하면 작성 중인 내용을 안전하게 보관할 수 있습니다.</span>
              </p>
            </div>

            {/* 파일 첨부 섹션 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <File className="w-4 h-4" />
                파일 첨부
              </Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Upload className="w-5 h-5" />
                    <span className="text-sm">파일을 선택하거나 드래그하여 업로드</span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                    multiple
                    onChange={handleFileUpload}
                    disabled={fileUploading}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={fileUploading}
                    className="gap-2"
                  >
                    {fileUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        파일 선택
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    PDF, Word, Excel, 이미지 파일 업로드 가능 (최대 10MB)
                  </p>
                </div>

                {/* 업로드된 파일 목록 */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-foreground">
                      첨부된 파일 ({uploadedFiles.length}개)
                    </div>
                    {uploadedFiles.map((file, index) => {
                      // 파일 확장자에 따른 아이콘 색상
                      const getFileColor = (fileName: string) => {
                        const ext = fileName.split('.').pop()?.toLowerCase();
                        if (ext === 'pdf') return 'text-red-500';
                        if (ext === 'doc' || ext === 'docx') return 'text-blue-500';
                        if (ext === 'xls' || ext === 'xlsx') return 'text-green-500';
                        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'text-purple-500';
                        return 'text-gray-500';
                      };

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded border"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <File className={`w-4 h-4 ${getFileColor(file.originalFileName)} flex-shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {file.originalFileName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFileRemove(index)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              임시저장
            </Button>
            <Button onClick={() => handleSubmit(false)} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isEditMode ? "수정 완료" :
                (formData.status === "PUBLISHED" ? "게시하기" : "비공개로 저장")
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {selectedNotice?.isPinned && <Pin className="w-4 h-4 text-warning" />}
              {selectedNotice && getCategoryBadge(selectedNotice.category)}
            </div>
            <DialogTitle className="text-xl">
              {isViewEditMode ? "공지사항 수정" : "공지사항 보기"}
            </DialogTitle>
            <DialogDescription>
              {selectedNotice?.createdAt}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>제목</Label>
              {isViewEditMode ? (
                <Input
                  value={viewFormData.title}
                  onChange={(e) => setViewFormData({ ...viewFormData, title: e.target.value })}
                  placeholder="공지사항 제목"
                />
              ) : (
                <p className="font-medium text-lg">{selectedNotice?.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>내용</Label>
              {isViewEditMode ? (
                <Textarea
                  value={viewFormData.content}
                  onChange={(e) => setViewFormData({ ...viewFormData, content: e.target.value })}
                  placeholder="공지사항 내용을 입력하세요"
                  rows={8}
                />
              ) : (
                <div className="min-h-[200px] p-3 border rounded-md bg-muted/30">
                  <p className="whitespace-pre-wrap">{selectedNotice?.content}</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              닫기
            </Button>
            {isViewEditMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewEditMode(false);
                    setViewFormData({
                      title: selectedNotice?.title || "",
                      content: selectedNotice?.content || "",
                    });
                  }}
                >
                  취소
                </Button>
                <Button onClick={handleViewSave} disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  저장
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsViewEditMode(true)} className="gap-2">
                <Settings className="w-4 h-4" />
                수정
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공지사항 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 공지사항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Read Status Dialog */}
      <Dialog open={isReadStatusDialogOpen} onOpenChange={setIsReadStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              읽음 현황
            </DialogTitle>
            <DialogDescription className="line-clamp-2">
              {readStatusData.noticeTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {readStatusData.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">조회 중...</span>
              </div>
            ) : readStatusData.confirmUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  아직 읽은 사용자가 없습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">총 {readStatusData.confirmUsers.length}명이 읽었습니다</span>
                </div>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {readStatusData.confirmUsers.map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(user.confirmedAt).toLocaleString("ko-KR", {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReadStatusDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default NoticeManagement;