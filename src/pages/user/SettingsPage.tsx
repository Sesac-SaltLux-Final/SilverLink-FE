import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, getRoleHomePath } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
    Settings,
    Bell,
    Moon,
    Sun,
    Monitor,
    Globe,
    Volume2,
    Shield,
    Loader2,
    ChevronLeft,
} from "lucide-react";
import { adminNavItems } from "@/config/adminNavItems";
import { guardianNavItems } from "@/config/guardianNavItems";
import { counselorNavItems } from "@/config/counselorNavItems";

interface UserSettings {
    notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
        emergencyAlerts: boolean;
    };
    display: {
        theme: 'light' | 'dark' | 'system';
        fontSize: 'small' | 'medium' | 'large';
    };
    privacy: {
        showOnlineStatus: boolean;
        allowDataCollection: boolean;
    };
}

const defaultSettings: UserSettings = {
    notifications: {
        email: true,
        push: true,
        sms: false,
        emergencyAlerts: true,
    },
    display: {
        theme: 'system',
        fontSize: 'medium',
    },
    privacy: {
        showOnlineStatus: true,
        allowDataCollection: true,
    },
};

const SettingsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // 역할별 네비게이션
    const getNavItems = () => {
        switch (user?.role) {
            case 'ADMIN': return adminNavItems;
            case 'GUARDIAN': return guardianNavItems;
            case 'COUNSELOR': return counselorNavItems;
            default: return [];
        }
    };

    // 역할 표시명
    const getRoleDisplay = () => {
        switch (user?.role) {
            case 'ADMIN': return 'admin';
            case 'GUARDIAN': return 'guardian';
            case 'COUNSELOR': return 'counselor';
            default: return 'guardian';
        }
    };

    // 설정 불러오기 (로컬 스토리지)
    useEffect(() => {
        const loadSettings = () => {
            setLoading(true);
            try {
                const savedSettings = localStorage.getItem('user_settings');
                if (savedSettings) {
                    setSettings(JSON.parse(savedSettings));
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    // 설정 저장
    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            localStorage.setItem('user_settings', JSON.stringify(settings));
            toast.success('설정이 저장되었습니다.');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('설정 저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 알림 설정 변경
    const updateNotification = (key: keyof UserSettings['notifications'], value: boolean) => {
        setSettings(prev => ({
            ...prev,
            notifications: { ...prev.notifications, [key]: value }
        }));
    };

    // 디스플레이 설정 변경
    const updateDisplay = (key: keyof UserSettings['display'], value: string) => {
        setSettings(prev => ({
            ...prev,
            display: { ...prev.display, [key]: value }
        }));
    };

    // 개인정보 설정 변경
    const updatePrivacy = (key: keyof UserSettings['privacy'], value: boolean) => {
        setSettings(prev => ({
            ...prev,
            privacy: { ...prev.privacy, [key]: value }
        }));
    };

    if (loading) {
        return (
            <DashboardLayout
                role={getRoleDisplay() as "admin" | "guardian" | "counselor"}
                userName={user?.name || "사용자"}
                navItems={getNavItems()}
            >
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            role={getRoleDisplay() as "admin" | "guardian" | "counselor"}
            userName={user?.name || "사용자"}
            navItems={getNavItems()}
        >
            <div className="space-y-6 max-w-3xl">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Settings className="w-6 h-6" />
                            설정
                        </h1>
                        <p className="text-muted-foreground mt-1">앱 설정을 관리합니다</p>
                    </div>
                </div>

                {/* 알림 설정 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-primary" />
                            알림 설정
                        </CardTitle>
                        <CardDescription>알림 수신 방법을 설정합니다</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>이메일 알림</Label>
                                <p className="text-sm text-muted-foreground">중요 알림을 이메일로 받습니다</p>
                            </div>
                            <Switch
                                checked={settings.notifications.email}
                                onCheckedChange={(checked) => updateNotification('email', checked)}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>푸시 알림</Label>
                                <p className="text-sm text-muted-foreground">브라우저 푸시 알림을 받습니다</p>
                            </div>
                            <Switch
                                checked={settings.notifications.push}
                                onCheckedChange={(checked) => updateNotification('push', checked)}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>SMS 알림</Label>
                                <p className="text-sm text-muted-foreground">긴급 알림을 SMS로 받습니다</p>
                            </div>
                            <Switch
                                checked={settings.notifications.sms}
                                onCheckedChange={(checked) => updateNotification('sms', checked)}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="flex items-center gap-2">
                                    긴급 알림
                                    <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">중요</span>
                                </Label>
                                <p className="text-sm text-muted-foreground">어르신 응급 상황 알림을 받습니다</p>
                            </div>
                            <Switch
                                checked={settings.notifications.emergencyAlerts}
                                onCheckedChange={(checked) => updateNotification('emergencyAlerts', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 화면 설정 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Monitor className="w-5 h-5 text-primary" />
                            화면 설정
                        </CardTitle>
                        <CardDescription>화면 표시 방식을 설정합니다</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>테마</Label>
                                <p className="text-sm text-muted-foreground">화면 테마를 선택합니다</p>
                            </div>
                            <Select
                                value={settings.display.theme}
                                onValueChange={(value) => updateDisplay('theme', value)}
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">
                                        <div className="flex items-center gap-2">
                                            <Sun className="w-4 h-4" />
                                            라이트
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="dark">
                                        <div className="flex items-center gap-2">
                                            <Moon className="w-4 h-4" />
                                            다크
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="system">
                                        <div className="flex items-center gap-2">
                                            <Monitor className="w-4 h-4" />
                                            시스템
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>글자 크기</Label>
                                <p className="text-sm text-muted-foreground">화면의 글자 크기를 조정합니다</p>
                            </div>
                            <Select
                                value={settings.display.fontSize}
                                onValueChange={(value) => updateDisplay('fontSize', value)}
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="small">작게</SelectItem>
                                    <SelectItem value="medium">보통</SelectItem>
                                    <SelectItem value="large">크게</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* 개인정보 설정 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            개인정보 설정
                        </CardTitle>
                        <CardDescription>개인정보 관련 설정을 관리합니다</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>온라인 상태 표시</Label>
                                <p className="text-sm text-muted-foreground">다른 사용자에게 온라인 상태를 표시합니다</p>
                            </div>
                            <Switch
                                checked={settings.privacy.showOnlineStatus}
                                onCheckedChange={(checked) => updatePrivacy('showOnlineStatus', checked)}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>서비스 개선 데이터 수집</Label>
                                <p className="text-sm text-muted-foreground">서비스 개선을 위한 익명 데이터 수집에 동의합니다</p>
                            </div>
                            <Switch
                                checked={settings.privacy.allowDataCollection}
                                onCheckedChange={(checked) => updatePrivacy('allowDataCollection', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 저장 버튼 */}
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        취소
                    </Button>
                    <Button onClick={handleSaveSettings} disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        저장
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SettingsPage;
