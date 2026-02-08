import { ReactNode, useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Heart,
  Home,
  Phone,
  BarChart3,
  MessageSquare,
  HelpCircle,
  LogOut,
  Menu,
  X,
  User,
  Settings,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleHomePath } from "@/contexts/AuthContext";
import { SessionTimer } from "@/components/auth/SessionTimer";
import { toast } from "sonner";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import NotificationDropdown from "@/components/notification/NotificationDropdown";
import accessRequestsApi from "@/api/accessRequests";
import { EmergencyAlertPopup } from "@/components/alert/EmergencyAlertPopup";
import NotificationToastListener from "@/components/notification/NotificationToastListener";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface DashboardLayoutProps {
  children: ReactNode;
  role: "guardian" | "counselor" | "admin";
  userName: string;
  userAvatar?: string;
  navItems: NavItem[];
}

const DashboardLayout = ({
  children,
  role,
  userName,
  userAvatar,
  navItems
}: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingAccessCount, setPendingAccessCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // 관리자일 때 민감정보 대기 건수 조회
  useEffect(() => {
    if (role !== "admin") return;

    const fetchPendingCount = async () => {
      try {
        const stats = await accessRequestsApi.getPendingStats();
        setPendingAccessCount(stats.total || 0);
      } catch (error) {
        console.error("Failed to fetch pending stats:", error);
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [role]);

  // navItems에 badge 주입
  const enrichedNavItems = useMemo(() => {
    if (role !== "admin" || pendingAccessCount === 0) return navItems;
    return navItems.map(item =>
      item.href === "/admin/sensitive-info"
        ? { ...item, badge: pendingAccessCount }
        : item
    );
  }, [navItems, role, pendingAccessCount]);

  // 로고 클릭 핸들러
  const handleLogoClick = () => {
    if (user) {
      // 로그인 상태: 현재 역할의 대시보드로 이동
      navigate(getRoleHomePath(user.role));
    } else {
      // 비로그인 상태: 메인 페이지로 이동
      navigate("/");
    }
  };

  const roleConfig = {
    guardian: {
      title: "보호자",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    counselor: {
      title: "상담사",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    admin: {
      title: "관리자",
      color: "text-info",
      bgColor: "bg-info/10",
    },
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - 화면 전체 높이 고정 */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 w-72 h-screen bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ease-in-out lg:transform-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <button
                onClick={handleLogoClick}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
                  <Heart className="w-5 h-5 text-sidebar-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-sidebar-foreground">실버링크</h1>
                  <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">SilverLink</p>
                </div>
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 min-h-0 pb-12 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {enrichedNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  {item.icon}
                  <span className="flex-1">{item.title}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Section - 항상 하단 고정 */}
          <div className="p-4 pt-3 border-t border-sidebar-border flex-shrink-0">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/30">
              <Avatar className="w-10 h-10">
                <AvatarImage src={userAvatar} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                  {userName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sidebar-foreground truncate">{userName}</p>
                <p className={cn("text-xs", roleConfig[role].color)}>
                  {roleConfig[role].title}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full mt-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 lg:flex-none" />

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <NotificationDropdown role={role} />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={userAvatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{userName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/my-profile')} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    내 프로필
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    설정
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
      <ChatbotWidget />
      <NotificationToastListener />
    </div>
  );
};

export default DashboardLayout;
