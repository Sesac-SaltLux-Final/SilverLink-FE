import { Home, Phone, BarChart3, MessageSquare, FileText, HelpCircle, AlertTriangle, Megaphone, Heart, MapPin, User, Lock } from "lucide-react";

export const guardianNavItems = [
  { title: "홈", href: "/guardian", icon: <Home className="w-5 h-5" /> },
  { title: "통화 기록", href: "/guardian/calls", icon: <Phone className="w-5 h-5" /> },
  { title: "통화 기록 통계", href: "/guardian/stats", icon: <BarChart3 className="w-5 h-5" /> },
  { title: "1:1 문의", href: "/guardian/inquiry", icon: <MessageSquare className="w-5 h-5" /> },
  { title: "불편사항 신고", href: "/guardian/complaint", icon: <AlertTriangle className="w-5 h-5" /> },
  { title: "주변 시설 찾기", href: "/map", icon: <MapPin className="w-5 h-5" /> },
  { title: "민감정보 열람 신청", href: "/guardian/sensitive-info", icon: <Lock className="w-5 h-5" /> },
  { title: "복지 서비스", href: "/guardian/welfare", icon: <Heart className="w-5 h-5" /> },
  { title: "공지사항", href: "/guardian/notices", icon: <Megaphone className="w-5 h-5" /> },
  { title: "FAQ", href: "/guardian/faq", icon: <HelpCircle className="w-5 h-5" /> },
  { title: "내 프로필", href: "/my-profile", icon: <User className="w-5 h-5" /> },
];
