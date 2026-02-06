import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Megaphone,
  Pin,
  Calendar,
  Volume2,
  Loader2
} from "lucide-react";
import noticesApi from "@/api/notices";
import { NoticeResponse } from "@/types/api";

const SeniorNotices = () => {
  const navigate = useNavigate();
  const [selectedNotice, setSelectedNotice] = useState<NoticeResponse | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notices, setNotices] = useState<NoticeResponse[]>([]);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        setIsLoading(true);
        const response = await noticesApi.getNotices({ size: 30 });
        setNotices(response.content);
      } catch (error) {
        console.error('Failed to fetch notices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotices();
  }, []);

  const handleNoticeClick = async (notice: NoticeResponse) => {
    setSelectedNotice(notice);
    if (!notice.isRead) {
      try {
        await noticesApi.markAsRead(notice.id);
        setNotices(prev =>
          prev.map(n => n.id === notice.id ? { ...n, isRead: true } : n)
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleSpeak = () => {
    if (!selectedNotice) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = `${selectedNotice.title}. ${selectedNotice.content}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.8;
    utterance.onend = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case "긴급":
        return "bg-destructive text-destructive-foreground";
      case "이벤트":
        return "bg-success text-success-foreground";
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "긴급":
        return <Badge className="bg-destructive/10 text-destructive border-0 text-base px-3 py-1">긴급</Badge>;
      case "이벤트":
        return <Badge className="bg-success/10 text-success border-0 text-base px-3 py-1">이벤트</Badge>;
      default:
        return <Badge className="bg-primary/10 text-primary border-0 text-base px-3 py-1">공지</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-warning text-warning-foreground p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate("/senior")}
            className="text-warning-foreground hover:bg-warning-foreground/20 p-3"
          >
            <ArrowLeft className="w-8 h-8" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warning-foreground/20 flex items-center justify-center">
              <Megaphone className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">공지사항</h1>
              <p className="text-warning-foreground/80 text-sm">새로운 소식을 확인해요</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-4">
        {notices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-lg">
            공지사항이 없습니다.
          </div>
        ) : (
          notices.map((notice) => (
            <button
              key={notice.id}
              onClick={() => handleNoticeClick(notice)}
              className="w-full text-left"
            >
              <Card className={`hover:shadow-lg transition-all active:scale-[0.98] ${notice.isPriority ? 'border-l-4 border-l-red-500 bg-red-50' : ''
                }`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl ${getCategoryStyle(notice.category)} flex items-center justify-center flex-shrink-0`}>
                      {notice.isPriority ? (
                        <Pin className="w-7 h-7" />
                      ) : (
                        <Megaphone className="w-7 h-7" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getCategoryBadge(notice.category)}
                        {notice.isPriority && (
                          <Badge variant="destructive" className="text-sm font-semibold">📌 중요</Badge>
                        )}
                        {!notice.isRead && (
                          <Badge className="bg-primary text-primary-foreground text-sm">NEW</Badge>
                        )}
                      </div>
                      <p className={`font-bold text-lg line-clamp-2 ${notice.isPriority ? "text-red-800" : ""
                        }`}>
                        {notice.isPriority && "📌 "}
                        {notice.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{notice.createdAt?.split('T')[0]}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))
        )}
      </main>

      {/* Notice Detail Dialog */}
      <Dialog open={!!selectedNotice} onOpenChange={() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setSelectedNotice(null);
      }}>
        <DialogContent className="max-w-lg mx-4">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              {selectedNotice && getCategoryBadge(selectedNotice.category)}
            </div>
            <DialogTitle className="text-2xl leading-tight">
              {selectedNotice?.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {selectedNotice?.createdAt?.split('T')[0]}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-lg whitespace-pre-wrap leading-relaxed">
              {selectedNotice?.content}
            </p>
          </div>

          {/* 첨부파일 섹션 */}
          {selectedNotice?.attachments && selectedNotice.attachments.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-lg font-bold mb-3">첨부파일 ({selectedNotice.attachments.length})</h4>
              <div className="space-y-3">
                {selectedNotice.attachments.map((file, index) => (
                  <a
                    key={index}
                    href={`${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')}${file.filePath}`}
                    download={file.originalFileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl border-2 hover:bg-muted/50 transition-colors active:scale-[0.98]"
                  >
                    <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base truncate">
                        {file.originalFileName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <svg className="w-6 h-6 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col gap-3 sm:flex-col">
            <Button
              onClick={handleSpeak}
              className={`w-full h-16 text-lg font-bold rounded-xl gap-3 ${isSpeaking ? "bg-warning hover:bg-warning/90" : ""
                }`}
            >
              <Volume2 className="w-6 h-6" />
              {isSpeaking ? "읽기 중지" : "소리로 읽어주기"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
                setSelectedNotice(null);
              }}
              className="w-full h-14 text-lg font-bold rounded-xl"
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeniorNotices;
