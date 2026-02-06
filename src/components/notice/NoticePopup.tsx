import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import noticesApi from "@/api/notices";
import type { NoticeResponse } from "@/types/api";
import { Bell, X } from "lucide-react";

interface NoticePopupProps {
  userRole: "GUARDIAN" | "COUNSELOR" | "ELDERLY" | "ADMIN";
}

const STORAGE_KEY = "noticePopupHideUntil_v2";

export const NoticePopup = ({ userRole }: NoticePopupProps) => {
  const [notices, setNotices] = useState<NoticeResponse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);

  useEffect(() => {
    const fetchPopupNotices = async () => {
      try {
        // 오늘 하루 보지 않기 체크 확인
        const hideUntil = localStorage.getItem(STORAGE_KEY);
        if (hideUntil) {
          const hideDate = new Date(hideUntil);
          if (hideDate > new Date()) {
            return; // 오늘 하루 보지 않기 설정되어 있음
          }
        }

        // 팝업 공지사항 조회
        const response = await noticesApi.getPopups();

        if (response && response.length > 0) {
          setNotices(response);
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Failed to fetch popup notices:", error);
      }
    };

    fetchPopupNotices();
  }, [userRole]);

  const handleClose = async () => {
    // 현재 공지사항 읽음 처리
    if (notices[currentIndex]) {
      try {
        await noticesApi.markAsRead(notices[currentIndex].id);
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }

    // 다음 공지사항이 있으면 표시
    if (currentIndex < notices.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 모든 공지사항을 확인했으면 닫기
      if (dontShowToday) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        localStorage.setItem(STORAGE_KEY, tomorrow.toISOString());
      }
      setIsOpen(false);
    }
  };

  const handleSkipAll = () => {
    if (dontShowToday) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      localStorage.setItem(STORAGE_KEY, tomorrow.toISOString());
    }
    setIsOpen(false);
  };

  if (!isOpen || notices.length === 0) {
    return null;
  }

  const currentNotice = notices[currentIndex];

  const getCategoryBadge = (category: string) => {
    const categoryMap: Record<string, { label: string; className: string }> = {
      NOTICE: { label: "공지", className: "bg-primary/10 text-primary border-0" },
      EVENT: { label: "이벤트", className: "bg-success/10 text-success border-0" },
      SYSTEM: { label: "시스템", className: "bg-info/10 text-info border-0" },
      NEWS: { label: "소식", className: "bg-accent/10 text-accent border-0" },
    };

    const config = categoryMap[category] || { label: category, className: "bg-muted text-muted-foreground" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <DialogTitle>새로운 공지사항</DialogTitle>
            </div>
            {notices.length > 1 && (
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {notices.length}
              </span>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getCategoryBadge(currentNotice.category)}
              {currentNotice.isPriority && (
                <Badge className="bg-destructive/10 text-destructive border-0">
                  중요
                </Badge>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">{currentNotice.title}</h3>
              <div
                className="text-sm text-muted-foreground whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: currentNotice.content }}
              />
            </div>

            {currentNotice.attachments && currentNotice.attachments.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">첨부파일</p>
                <div className="space-y-2">
                  {currentNotice.attachments.map((file, index) => (
                    <a
                      key={index}
                      href={file.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      📎 {file.originalFileName}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {new Date(currentNotice.createdAt).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-col gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dontShowToday"
              checked={dontShowToday}
              onCheckedChange={(checked) => setDontShowToday(checked as boolean)}
            />
            <Label
              htmlFor="dontShowToday"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              오늘 하루 보지 않기
            </Label>
          </div>

          <div className="flex gap-2 w-full">
            {notices.length > 1 && currentIndex < notices.length - 1 && (
              <Button variant="outline" onClick={handleSkipAll} className="flex-1">
                모두 닫기
              </Button>
            )}
            <Button onClick={handleClose} className="flex-1">
              {currentIndex < notices.length - 1 ? "다음" : "확인"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
