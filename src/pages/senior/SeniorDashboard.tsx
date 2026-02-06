import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { NoticePopup } from "@/components/notice/NoticePopup";
import {
  Heart,
  Phone,
  Camera,
  FileText,
  AlertTriangle,
  HelpCircle,
  Megaphone,
  User,
  LogOut,
  Sun,
  Moon,
  Volume2,
  Plus,
  Minus,
  Pill,
  Fingerprint,
  MapPin
} from "lucide-react";

const SeniorDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [fontSize, setFontSize] = useState(18);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useState(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  });

  const handleEmergencyCall = () => {
    setIsEmergencyOpen(true);
  };

  const confirmEmergency = () => {
    toast.success("긴급 연락이 전송되었습니다. 곧 상담사가 연락드립니다.", {
      duration: 5000,
    });
    setIsEmergencyOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const increaseFontSize = () => {
    if (fontSize < 28) setFontSize(fontSize + 2);
  };

  const decreaseFontSize = () => {
    if (fontSize > 14) setFontSize(fontSize - 2);
  };

  const menuItems = [
    {
      id: "mypage",
      title: "내 정보",
      description: "내 정보를 확인해요",
      icon: <User className="w-12 h-12" />,
      color: "bg-blue-500",
      action: () => navigate("/senior/profile"),
    },
    {
      id: "biometric",
      title: "지문 등록",
      description: "지문으로 간편 로그인",
      icon: <Fingerprint className="w-12 h-12" />,
      color: "bg-purple-500",
      action: () => navigate("/senior/biometric"),
    },
    {
      id: "facilities",
      title: "주변 시설",
      description: "가까운 복지시설을 찾아요",
      icon: <MapPin className="w-12 h-12" />,
      color: "bg-teal-500",
      action: () => navigate("/map"),
    },
    {
      id: "ocr",
      title: "약봉투 촬영",
      description: "약봉투를 찍으면 일정에 등록해요",
      icon: <Camera className="w-12 h-12" />,
      color: "bg-info",
      action: () => navigate("/senior/ocr"),
    },
    {
      id: "health",
      title: "건강 기록",
      description: "오늘의 건강을 기록해요",
      icon: <FileText className="w-12 h-12" />,
      color: "bg-success",
      action: () => navigate("/senior/health"),
    },
    {
      id: "medication",
      title: "복약 일정",
      description: "약 복용 시간을 알려드려요",
      icon: <Pill className="w-12 h-12" />,
      color: "bg-emerald-500",
      action: () => navigate("/senior/medication"),
    },
    {
      id: "notice",
      title: "공지사항",
      description: "새로운 소식을 확인해요",
      icon: <Megaphone className="w-12 h-12" />,
      color: "bg-warning",
      action: () => navigate("/senior/notices"),
    },
    {
      id: "faq",
      title: "자주 묻는 질문",
      description: "궁금한 것을 찾아보세요",
      icon: <HelpCircle className="w-12 h-12" />,
      color: "bg-accent",
      action: () => navigate("/senior/faq"),
    },
  ];

  const hour = currentTime.getHours();
  const greeting = hour < 12 ? "좋은 아침이에요" : hour < 18 ? "좋은 오후예요" : "좋은 저녁이에요";
  const isDaytime = hour >= 6 && hour < 18;

  return (
    <>
      <NoticePopup userRole="ELDERLY" />
      <div
        className="min-h-screen bg-background"
        style={{ fontSize: `${fontSize}px` }}
      >
        {/* Header */}
        <header className="bg-primary text-primary-foreground p-6 rounded-b-3xl shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                <Heart className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">마음돌봄</h1>
                <p className="text-primary-foreground/80 text-sm">어르신님</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="lg"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/20 p-3 flex items-center gap-2"
            >
              <LogOut className="w-6 h-6" />
              <span className="text-lg font-medium">로그아웃</span>
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {isDaytime ? (
              <Sun className="w-10 h-10 text-yellow-300" />
            ) : (
              <Moon className="w-10 h-10 text-yellow-200" />
            )}
            <div>
              <p className="text-2xl font-bold">{greeting}</p>
              <p className="text-primary-foreground/80">
                {currentTime.toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </p>
            </div>
          </div>
        </header>

        {/* Font Size Controls */}
        <div className="px-6 py-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  글자 크기
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={decreaseFontSize}
                    className="w-14 h-14 rounded-xl"
                  >
                    <Minus className="w-6 h-6" />
                  </Button>
                  <span className="w-12 text-center font-bold text-xl">{fontSize}</span>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={increaseFontSize}
                    className="w-14 h-14 rounded-xl"
                  >
                    <Plus className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Menu */}
        <main className="px-6 pb-32">
          <div className="grid grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                className="block"
              >
                <Card className="h-full hover:shadow-lg transition-all duration-200 active:scale-95">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <div className={`w-20 h-20 rounded-2xl ${item.color} text-primary-foreground flex items-center justify-center`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{item.title}</p>
                      <p className="text-muted-foreground text-sm mt-1">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </main>

        {/* Emergency Button - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
          <Button
            onClick={handleEmergencyCall}
            className="w-full h-20 text-xl font-bold bg-destructive hover:bg-destructive/90 rounded-2xl shadow-lg"
          >
            <AlertTriangle className="w-8 h-8 mr-3" />
            긴급 연락하기
          </Button>
        </div>

        {/* Emergency Confirmation Dialog */}
        <Dialog open={isEmergencyOpen} onOpenChange={setIsEmergencyOpen}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
              <DialogTitle className="text-2xl">긴급 연락</DialogTitle>
              <DialogDescription className="text-lg">
                상담사에게 긴급 연락을 하시겠습니까?<br />
                곧 전화가 갈 거예요.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col gap-3 sm:flex-col">
              <Button
                onClick={confirmEmergency}
                className="w-full h-16 text-lg font-bold bg-destructive hover:bg-destructive/90"
              >
                네, 연락해주세요
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEmergencyOpen(false)}
                className="w-full h-16 text-lg font-bold"
              >
                아니요, 괜찮아요
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default SeniorDashboard;
