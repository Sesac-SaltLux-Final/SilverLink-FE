import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Heart,
  Fingerprint,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  RefreshCw
} from "lucide-react";
import { useWebAuthn, isWebAuthnSupported } from "@/hooks/useWebAuthn";
import { requestVerificationCode, verifyCode } from "@/api/phoneVerification";
import { setAccessToken } from "@/api/index";
import apiClient from "@/api/index";
import { getErrorMessage } from "@/utils/errorUtils";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

const SeniorLogin = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user, login } = useAuth();

  // 이미 로그인된 상태라면 어르신 대시보드로 리다이렉트
  useEffect(() => {
    if (isLoggedIn && user?.role === "ELDERLY") {
      navigate("/senior", { replace: true });
    }
  }, [isLoggedIn, user, navigate]);

  // 휴대폰 인증 상태
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationId, setVerificationId] = useState<number | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);

  // 지문 인증 상태 (등록 기능 제거 - 보안상 로그인 후에만 가능)

  const {
    isPlatformAvailable,
    isAuthenticating,
    error,
    authenticate,
    checkPlatformAuthenticator,
  } = useWebAuthn();

  useEffect(() => {
    checkPlatformAuthenticator();
  }, [checkPlatformAuthenticator]);

  // 타이머 효과
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    if (expiresIn > 0) {
      const timer = setInterval(() => setExpiresIn(e => e - 1), 1000);
      return () => clearInterval(timer);
    } else if (expiresIn === 0 && isCodeSent && verificationId) {
      // 인증 만료 (상태 초기화 하지 않음)
      // 사용자가 재발송 버튼을 누르도록 유도
    }
  }, [expiresIn, isCodeSent, verificationId]);

  const resetVerification = () => {
    setIsCodeSent(false);
    setVerificationId(null);
    setVerificationCode("");
    setExpiresIn(0);
  };

  const formatPhone = (phone: string) => {
    // 숫자만 추출
    const digits = phone.replace(/\D/g, "");
    // 하이픈 추가
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneNumber(formatted);
    // 번호 변경 시 인증 상태 리셋
    if (isCodeSent) {
      resetVerification();
    }
  };

  // 인증번호 발송
  const handleSendCode = async () => {
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("휴대폰 번호를 정확히 입력해주세요.");
      return;
    }

    setIsSending(true);
    try {
      const response = await requestVerificationCode(digits, "DEVICE_REGISTRATION");

      setVerificationId(response.verificationId);
      setIsCodeSent(true);
      setCooldown(60); // 60초 재발송 대기

      // 만료 시간 계산 - 서버에서 계산한 값을 우선 사용 (시간대 불일치 방지)
      if (response.expiresInSeconds !== undefined && response.expiresInSeconds !== null) {
        setExpiresIn(Math.max(response.expiresInSeconds, 0));
      } else {
        // fallback: expireAt으로 계산 (이전 버전 호환성)
        const expireAt = new Date(response.expireAt);
        const now = new Date();
        const diffSeconds = Math.floor((expireAt.getTime() - now.getTime()) / 1000);
        setExpiresIn(Math.max(diffSeconds, 0));
      }

      toast.success("인증번호가 발송되었어요!", {
        description: "문자 메시지를 확인해주세요.",
      });
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, "인증번호 발송에 실패했어요.");
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  // 인증 확인 및 로그인
  const handleVerifyAndLogin = async () => {
    if (!verificationId || verificationCode.length !== 6) {
      toast.error("인증번호 6자리를 입력해주세요.");
      return;
    }

    setIsVerifying(true);
    try {
      const verifyResponse = await verifyCode(verificationId, verificationCode);

      if (verifyResponse.verified) {
        // proofToken으로 로그인 처리
        try {
          const loginResponse = await apiClient.post('/api/auth/login/phone', {
            phone: phoneNumber.replace(/\D/g, ""),
            proofToken: verifyResponse.proofToken,
          });

          if (loginResponse.data.accessToken) {
            setAccessToken(loginResponse.data.accessToken);

            // 사용자 정보 조회 후 AuthContext 로그인
            try {
              const profileResponse = await apiClient.get('/api/users/me');
              const userProfile = profileResponse.data;
              login(loginResponse.data.accessToken, userProfile);
            } catch (profileErr) {
              // 프로필 조회 실패
              // 프로필 조회 실패해도 기본 정보로 로그인 처리
              login(loginResponse.data.accessToken, {
                id: 0,
                role: 'ELDERLY' as const,
                name: '어르신',
              });
            }
          }

          toast.success("로그인 성공!", {
            description: "어서오세요. 마음돌봄 서비스입니다.",
          });
          navigate("/senior");
        } catch (loginErr: any) {
          // 로그인 API가 없으면 인증 성공만으로 진행 (임시)
          if (loginErr.response?.status === 404) {
            toast.success("인증 완료!", {
              description: "마음돌봄 서비스를 이용해주세요.",
            });
            navigate("/senior");
          } else {
            throw loginErr;
          }
        }
      } else {
        toast.error("인증에 실패했어요. 다시 시도해주세요.");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "인증에 실패했어요."));
    } finally {
      setIsVerifying(false);
    }
  };

  // 지문 인증 로그인 - 새 API: authenticate()가 user 프로필도 함께 반환
  const handleBiometricLogin = async () => {
    try {
      const result = await authenticate();
      if (result.success && result.accessToken && result.user) {
        // 추가 API 호출 없이 바로 로그인 처리
        login(result.accessToken, {
          id: result.user.id,
          role: result.user.role as 'ELDERLY' | 'GUARDIAN' | 'COUNSELOR' | 'ADMIN',
          name: result.user.name,
          phone: result.user.phone,
        });

        toast.success("지문 인증 성공!", {
          description: "어서오세요. 마음돌봄 서비스입니다.",
        });
        navigate("/senior");
      } else if (error) {
        // useWebAuthn 훅에서 설정한 에러 메시지 표시
        toast.error(error);
      }
    } catch (err) {
      toast.error("지문 인증 중 오류가 발생했어요. 다시 시도해주세요.");
    }
  };



  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const webAuthnSupport = isWebAuthnSupported();
  const showBiometric = webAuthnSupport && isPlatformAvailable;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex flex-col">
      {/* Header */}
      <header className="p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12"
            onClick={() => navigate("/login")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary flex items-center justify-center">
              <Heart className="w-7 h-7 sm:w-10 sm:h-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">마음돌봄</h1>
              <p className="text-sm sm:text-base text-muted-foreground">국가 복지 서비스</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center p-4 sm:p-6 pt-4">
        <div className="w-full max-w-md space-y-5">
          {/* Title */}
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              어르신 로그인
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              휴대폰 번호로 간편하게 로그인하세요
            </p>
          </div>

          {/* Phone Login Card - Main */}
          {(
            <Card className="shadow-lg border-2 border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Phone className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl">휴대폰 인증</CardTitle>
                    <CardDescription className="text-base">
                      문자로 받은 번호를 입력하세요
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 휴대폰 번호 입력 */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-base sm:text-lg font-medium">휴대폰 번호</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="010-0000-0000"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      className="h-14 text-lg flex-1"
                      disabled={isCodeSent && expiresIn > 0}
                    />
                    <Button
                      onClick={handleSendCode}
                      variant={isCodeSent ? "outline" : "default"}
                      className="h-14 px-4 text-base font-medium min-w-[100px]"
                      disabled={isSending || cooldown > 0 || phoneNumber.replace(/\D/g, "").length < 10}
                    >
                      {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : cooldown > 0 ? (
                        `${cooldown}초`
                      ) : isCodeSent ? (
                        <><RefreshCw className="w-4 h-4 mr-1" />재발송</>
                      ) : (
                        "인증요청"
                      )}
                    </Button>
                  </div>
                </div>

                {/* 인증번호 입력 (발송 후 표시) */}
                {isCodeSent && (
                  <div className="space-y-4 animate-fade-in pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-bold">인증번호 입력</Label>
                      {expiresIn > 0 ? (
                        <span className="text-base text-primary font-bold bg-primary/10 px-3 py-1 rounded-full">
                          남은 시간 {formatTime(expiresIn)}
                        </span>
                      ) : (
                        <span className="text-base text-destructive font-bold bg-destructive/10 px-3 py-1 rounded-full">
                          시간 만료
                        </span>
                      )}
                    </div>

                    <div className="flex justify-center py-2">
                      <InputOTP
                        maxLength={6}
                        value={verificationCode}
                        onChange={(value) => setVerificationCode(value)}
                        disabled={false} // 만료되어도 입력은 가능하게 하거나, 재발송 유도 위해 막을 수도 있음. 여기선 입력 가능하게 둠.
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="w-12 h-14 sm:w-14 sm:h-16 text-2xl sm:text-3xl border-2" />
                          <InputOTPSlot index={1} className="w-12 h-14 sm:w-14 sm:h-16 text-2xl sm:text-3xl border-2" />
                          <InputOTPSlot index={2} className="w-12 h-14 sm:w-14 sm:h-16 text-2xl sm:text-3xl border-2" />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} className="w-12 h-14 sm:w-14 sm:h-16 text-2xl sm:text-3xl border-2" />
                          <InputOTPSlot index={4} className="w-12 h-14 sm:w-14 sm:h-16 text-2xl sm:text-3xl border-2" />
                          <InputOTPSlot index={5} className="w-12 h-14 sm:w-14 sm:h-16 text-2xl sm:text-3xl border-2" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {expiresIn === 0 && (
                      <p className="text-center text-destructive font-medium">
                        인증 시간이 지났어요. 위쪽의 <span className="font-bold">'재발송'</span> 버튼을 눌러주세요.
                      </p>
                    )}

                    <Button
                      onClick={handleVerifyAndLogin}
                      className="w-full h-16 text-xl font-bold rounded-xl mt-4"
                      size="lg"
                      disabled={isVerifying || verificationCode.length !== 6 || expiresIn === 0}
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                          확인 중...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-6 h-6 mr-3" />
                          로그인 하기
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Biometric Options */}
          {showBiometric && (
            <>
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-background px-4 text-muted-foreground text-base">
                    또는
                  </span>
                </div>
              </div>

              {/* Biometric Login */}
              <Card className="shadow-md">
                <CardContent className="p-4">
                  <Button
                    onClick={handleBiometricLogin}
                    variant="outline"
                    className="w-full h-14 text-lg font-medium rounded-xl"
                    size="lg"
                    disabled={isAuthenticating}
                  >
                    {isAuthenticating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        인증 중...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-5 h-5 mr-2" />
                        지문으로 로그인
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* WebAuthn Not Supported - 더 작게 표시 */}
          {!showBiometric && (
            <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                이 기기에서는 지문 인증을 사용할 수 없어요
              </p>
            </div>
          )}
        </div>
      </main>



      {/* Footer */}
      {showBiometric && (
        <footer className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-success">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">이 기기는 생체 인증을 지원해요</span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default SeniorLogin;

