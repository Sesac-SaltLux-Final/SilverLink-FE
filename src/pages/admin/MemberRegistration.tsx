import { useState, useEffect } from "react";
import {
  Save,
  Pill,
  ChevronLeft,
  Phone,
  MapPin,
  Calendar,
  User,
  Heart,
  AlertCircle,
  Key,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Users
} from "lucide-react";
import { adminNavItems } from "@/config/adminNavItems";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { registerGuardian, registerElderly } from "@/api/admins";
import elderlyApi from "@/api/elderly";
import AddressSearch from "@/components/common/AddressSearch";
import PhoneVerification from "@/components/common/PhoneVerification";
import { AddressData } from "@/types/address";
import { AddressResponse } from "@/types/api";
import { addressApi } from "@/api/address";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MemberRegistration = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("senior");
  const [loading, setLoading] = useState(false);

  // Address State
  const [sidoList, setSidoList] = useState<AddressResponse[]>([]);
  const [sigunguList, setSigunguList] = useState<AddressResponse[]>([]);
  const [dongList, setDongList] = useState<AddressResponse[]>([]);

  const [selectedSido, setSelectedSido] = useState<string>('');
  const [selectedSigungu, setSelectedSigungu] = useState<string>('');
  const [selectedDong, setSelectedDong] = useState<string>('');

  // Load Sido on Mount
  useEffect(() => {
    loadSido();
  }, []);

  const loadSido = async () => {
    try {
      const data = await addressApi.getSido();
      const uniqueData = data.filter((item, index, self) =>
        index === self.findIndex((t) => t.sidoCode === item.sidoCode)
      );
      setSidoList(uniqueData);
    } catch (error) {
      console.error("Failed to load Sido:", error);
    }
  };

  // Load Sigungu when Sido changes
  useEffect(() => {
    if (selectedSido) {
      loadSigungu(selectedSido);
      setSigunguList([]);
      setDongList([]);
      setSelectedSigungu('');
      setSelectedDong('');
    }
  }, [selectedSido]);

  const loadSigungu = async (sidoCode: string) => {
    try {
      const data = await addressApi.getSigungu(sidoCode);
      const uniqueData = data.filter((item, index, self) =>
        index === self.findIndex((t) => t.sigunguCode === item.sigunguCode)
      );
      setSigunguList(uniqueData);
    } catch (error) {
      console.error("Failed to load Sigungu:", error);
    }
  };

  // Load Dong when Sigungu changes
  useEffect(() => {
    if (selectedSido && selectedSigungu) {
      loadDong(selectedSido, selectedSigungu);
      setDongList([]);
      setSelectedDong('');
    }
  }, [selectedSigungu]);

  const loadDong = async (sidoCode: string, sigunguCode: string) => {
    try {
      const data = await addressApi.getDong(sidoCode, sigunguCode);
      const uniqueData = data.filter((item, index, self) =>
        index === self.findIndex((t) => t.admCode === item.admCode)
      );
      setDongList(uniqueData);
    } catch (error) {
      console.error("Failed to load Dong:", error);
    }
  };

  const handleAddressDropdownChange = (level: 'sido' | 'sigungu' | 'dong', value: string) => {
    if (level === 'sido') {
      setSelectedSido(value);
      const sidoName = sidoList.find(s => s.sidoCode === value)?.sidoName || '';
      setSeniorData(prev => ({ ...prev, address: sidoName }));
    } else if (level === 'sigungu') {
      setSelectedSigungu(value);
      const sidoName = sidoList.find(s => s.sidoCode === selectedSido)?.sidoName || '';
      const sigunguName = sigunguList.find(s => s.sigunguCode === value)?.sigunguName || '';
      setSeniorData(prev => ({ ...prev, address: `${sidoName} ${sigunguName}` }));
    } else if (level === 'dong') {
      setSelectedDong(value);
      const sidoName = sidoList.find(s => s.sidoCode === selectedSido)?.sidoName || '';
      const sigunguName = sigunguList.find(s => s.sigunguCode === selectedSigungu)?.sigunguName || '';
      const dongName = dongList.find(d => String(d.admCode) === value)?.dongName || '';

      setSeniorData(prev => ({
        ...prev,
        admCode: value,
        address: `${sidoName} ${sigunguName} ${dongName}`
      }));
    }
  };

  // Guardian Address State
  const [guardianSigunguList, setGuardianSigunguList] = useState<AddressResponse[]>([]);
  const [guardianDongList, setGuardianDongList] = useState<AddressResponse[]>([]);

  const [guardianSelectedSido, setGuardianSelectedSido] = useState<string>('');
  const [guardianSelectedSigungu, setGuardianSelectedSigungu] = useState<string>('');
  const [guardianSelectedDong, setGuardianSelectedDong] = useState<string>('');

  // Load Sigungu when Guardian Sido changes
  useEffect(() => {
    if (guardianSelectedSido) {
      loadGuardianSigungu(guardianSelectedSido);
      setGuardianSigunguList([]);
      setGuardianDongList([]);
      setGuardianSelectedSigungu('');
      setGuardianSelectedDong('');
    }
  }, [guardianSelectedSido]);

  const loadGuardianSigungu = async (sidoCode: string) => {
    try {
      const data = await addressApi.getSigungu(sidoCode);
      const uniqueData = data.filter((item, index, self) =>
        index === self.findIndex((t) => t.sigunguCode === item.sigunguCode)
      );
      setGuardianSigunguList(uniqueData);
    } catch (error) {
      console.error("Failed to load Guardian Sigungu:", error);
    }
  };

  // Load Dong when Guardian Sigungu changes
  useEffect(() => {
    if (guardianSelectedSido && guardianSelectedSigungu) {
      loadGuardianDong(guardianSelectedSido, guardianSelectedSigungu);
      setGuardianDongList([]);
      setGuardianSelectedDong('');
    }
  }, [guardianSelectedSigungu]);

  const loadGuardianDong = async (sidoCode: string, sigunguCode: string) => {
    try {
      const data = await addressApi.getDong(sidoCode, sigunguCode);
      const uniqueData = data.filter((item, index, self) =>
        index === self.findIndex((t) => t.admCode === item.admCode)
      );
      setGuardianDongList(uniqueData);
    } catch (error) {
      console.error("Failed to load Guardian Dong:", error);
    }
  };

  const handleGuardianAddressDropdownChange = (level: 'sido' | 'sigungu' | 'dong', value: string) => {
    if (level === 'sido') {
      setGuardianSelectedSido(value);
      const sidoName = sidoList.find(s => s.sidoCode === value)?.sidoName || '';
      setGuardianData(prev => ({ ...prev, address: sidoName }));
    } else if (level === 'sigungu') {
      setGuardianSelectedSigungu(value);
      const sidoName = sidoList.find(s => s.sidoCode === guardianSelectedSido)?.sidoName || '';
      const sigunguName = guardianSigunguList.find(s => s.sigunguCode === value)?.sigunguName || '';
      setGuardianData(prev => ({ ...prev, address: `${sidoName} ${sigunguName}` }));
    } else if (level === 'dong') {
      setGuardianSelectedDong(value);
      const sidoName = sidoList.find(s => s.sidoCode === guardianSelectedSido)?.sidoName || '';
      const sigunguName = guardianSigunguList.find(s => s.sigunguCode === guardianSelectedSigungu)?.sigunguName || '';
      const dongName = guardianDongList.find(d => String(d.admCode) === value)?.dongName || '';

      setGuardianData(prev => ({
        ...prev,
        address: `${sidoName} ${sigunguName} ${dongName}`,
        // Note: Guardian API currently doesn't require admCode strictly like Elderly, but we set address string.
        // If admCode is needed later, add it to state.
      }));
    }
  };

  const [seniorData, setSeniorData] = useState({
    loginId: "",
    password: "",
    name: "",
    birthDate: "",
    gender: "M",
    phone: "",
    address: "",
    detailAddress: "",
    zipcode: "",
    admCode: "",
    memo: "",
    // 약관 동의
    sensitiveInfoApproval: false,
    medicationInfoApproval: false,
    healthInfoApproval: false,
    // 통화 스케줄
    preferredCallTime: "09:00",
    preferredCallDays: ["MON", "WED", "FRI"],
    callScheduleEnabled: true,
  });

  // 보호자 입력 데이터
  const [guardianData, setGuardianData] = useState({
    loginId: "",
    password: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    detailAddress: "",
    zipcode: "",
    relation: "CHILD",
    seniorId: "", // 연결할 어르신 ID
    memo: "",
    // 약관 동의
    sensitiveInfoApproval: false,
    medicationInfoApproval: false,
    healthInfoApproval: false,
  });

  // 휴대폰 인증 상태
  const [seniorPhoneVerified, setSeniorPhoneVerified] = useState(false);
  const [seniorProofToken, setSeniorProofToken] = useState("");

  const [guardianPhoneVerified, setGuardianPhoneVerified] = useState(false);
  const [guardianProofToken, setGuardianProofToken] = useState("");

  // 어르신 검색 상태
  const [elderlySearchName, setElderlySearchName] = useState("");
  const [elderlyCandidates, setElderlyCandidates] = useState<any[]>([]);
  const [elderlySearchResult, setElderlySearchResult] = useState<{
    id: number;
    name: string;
    phone?: string;
    birthDate?: string;
  } | null>(null);
  const [elderlySearching, setElderlySearching] = useState(false);
  const [elderlySearchError, setElderlySearchError] = useState("");

  // 어르신 검색 함수
  const handleElderlySearch = async () => {
    if (!elderlySearchName.trim()) {
      setElderlySearchError("검색할 이름을 입력하세요.");
      return;
    }

    setElderlySearching(true);
    setElderlySearchError("");
    setElderlyCandidates([]);
    setElderlySearchResult(null);

    try {
      const results = await elderlyApi.searchByName(elderlySearchName);
      if (results.length === 0) {
        setElderlySearchError("해당 이름의 어르신을 찾을 수 없습니다.");
      } else {
        setElderlyCandidates(results);
      }
    } catch (error: any) {
      setElderlySearchError("검색 중 오류가 발생했습니다.");
    } finally {
      setElderlySearching(false);
    }
  };

  const selectElderly = (e: any) => {
    setElderlySearchResult({
      id: e.userId,
      name: e.name,
      phone: e.phone,
      birthDate: e.birthDate
    });
    setGuardianData({ ...guardianData, seniorId: String(e.userId) });
    setElderlyCandidates([]); // 선택 후 목록 숨김
    setElderlySearchName(""); // 입력창 초기화
  };

  // 어르신 주소 검색 결과 처리
  const handleSeniorAddressSelect = (data: AddressData) => {
    setSeniorData({
      ...seniorData,
      address: data.address,
      zipcode: data.zonecode,
      admCode: data.bcode, // 법정동 코드를 행정코드로 활용
    });
  };

  // 보호자 주소 검색 결과 처리
  const handleGuardianAddressSelect = (data: AddressData) => {
    setGuardianData({
      ...guardianData,
      address: data.address,
      zipcode: data.zonecode,
    });
  };

  // 어르신 휴대폰 인증 완료 처리
  const handleSeniorPhoneVerified = (proofToken: string) => {
    setSeniorPhoneVerified(true);
    setSeniorProofToken(proofToken);
  };

  // 보호자 휴대폰 인증 완료 처리
  const handleGuardianPhoneVerified = (proofToken: string) => {
    setGuardianPhoneVerified(true);
    setGuardianProofToken(proofToken);
  };

  const handleSeniorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 휴대폰 인증 필수 체크
    if (!seniorPhoneVerified) {
      toast({
        variant: "destructive",
        title: "휴대폰 인증 필요",
        description: "등록 전 휴대폰 인증을 완료해주세요.",
      });
      return;
    }

    setLoading(true);

    // 약관 동의 체크
    if (!seniorData.sensitiveInfoApproval || !seniorData.medicationInfoApproval || !seniorData.healthInfoApproval) {
      toast({
        variant: "destructive",
        title: "약관 동의 필요",
        description: "모든 필수 약관에 동의해야 등록할 수 있습니다.",
      });
      setLoading(false);
      return;
    }

    try {
      await registerElderly({
        loginId: seniorData.loginId,
        password: seniorData.password,
        name: seniorData.name,
        phone: seniorData.phone,
        // email: optional
        admCode: Number(seniorData.admCode) || 12345678, // 임시 기본값 또는 입력받기
        birthDate: seniorData.birthDate,
        gender: seniorData.gender as 'M' | 'F',
        addressLine1: seniorData.address,
        addressLine2: seniorData.detailAddress,
        zipcode: seniorData.zipcode || "00000",
        memo: seniorData.memo,
        // 통화 스케줄
        preferredCallTime: seniorData.callScheduleEnabled ? seniorData.preferredCallTime : undefined,
        preferredCallDays: seniorData.callScheduleEnabled ? seniorData.preferredCallDays : undefined,
        callScheduleEnabled: seniorData.callScheduleEnabled,
      });

      toast({
        title: "어르신 등록 완료",
        description: `${seniorData.name}님이 성공적으로 등록되었습니다.`,
      });
      // Reset form
      setSeniorData({
        loginId: "", password: "", name: "", birthDate: "", gender: "M",
        phone: "", address: "", detailAddress: "", zipcode: "", admCode: "",
        memo: "", sensitiveInfoApproval: false, medicationInfoApproval: false, healthInfoApproval: false,
        preferredCallTime: "09:00", preferredCallDays: ["MON", "WED", "FRI"], callScheduleEnabled: true,
      });
      setSeniorPhoneVerified(false);
      setSeniorProofToken("");
    } catch (error: any) {
      // 백엔드에서 반환하는 오류 메시지 추출
      let errorMessage = "정보를 확인해주세요.";

      if (error.response?.data) {
        const data = error.response.data;
        // { error: "CODE", message: "메시지" } 형태
        if (data.message) {
          errorMessage = data.message;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
      }

      toast({
        variant: "destructive",
        title: "등록 실패",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuardianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 휴대폰 인증 필수 체크
    if (!guardianPhoneVerified) {
      toast({
        variant: "destructive",
        title: "휴대폰 인증 필요",
        description: "등록 전 휴대폰 인증을 완료해주세요.",
      });
      return;
    }

    // 어르신 검색 확인
    if (!elderlySearchResult) {
      toast({
        variant: "destructive",
        title: "어르신 확인 필요",
        description: "먼저 연결할 어르신을 검색해주세요.",
      });
      return;
    }

    setLoading(true);

    // 약관 동의 체크
    if (!guardianData.sensitiveInfoApproval || !guardianData.healthInfoApproval) {
      toast({
        variant: "destructive",
        title: "약관 동의 필요",
        description: "모든 필수 약관에 동의해야 등록할 수 있습니다.",
      });
      setLoading(false);
      return;
    }

    try {
      await registerGuardian({
        loginId: guardianData.loginId,
        password: guardianData.password,
        name: guardianData.name,
        phone: guardianData.phone,
        email: guardianData.email,
        addressLine1: guardianData.address,
        addressLine2: guardianData.detailAddress,
        zipcode: guardianData.zipcode || "00000",
        elderlyUserId: Number(guardianData.seniorId),
        relationType: guardianData.relation,
        memo: guardianData.memo,
        // 휴대폰 인증 토큰
      });

      toast({
        title: "보호자 등록 완료",
        description: `${guardianData.name}님이 성공적으로 등록되었습니다.`,
      });
      // Reset
      setGuardianData({
        loginId: "", password: "", name: "", phone: "", email: "",
        address: "", detailAddress: "", zipcode: "", relation: "CHILD",
        seniorId: "", memo: "", sensitiveInfoApproval: false, medicationInfoApproval: false, healthInfoApproval: false,
      });
      setGuardianPhoneVerified(false);
      setGuardianProofToken("");
      setElderlySearchResult(null);
      setElderlySearchName("");
      setElderlyCandidates([]);
    } catch (error: any) {
      // 백엔드에서 반환하는 오류 메시지 추출
      let errorMessage = "어르신 연결 정보를 확인해주세요.";

      if (error.response?.data) {
        const data = error.response.data;
        // { error: "CODE", message: "메시지" } 형태
        if (data.message) {
          errorMessage = data.message;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
      }

      toast({
        variant: "destructive",
        title: "등록 실패",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="admin" userName={user?.name || "관리자"} navItems={adminNavItems}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">

          <div>
            <h1 className="text-2xl font-bold text-foreground">회원 등록</h1>
            <p className="text-muted-foreground mt-1">방문 센터 등록 시 어르신 또는 보호자를 등록합니다</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="senior" className="flex items-center gap-2">
              <User className="w-4 h-4" /> 어르신 등록
            </TabsTrigger>
            <TabsTrigger value="guardian" className="flex items-center gap-2">
              <Heart className="w-4 h-4" /> 보호자 등록
            </TabsTrigger>
          </TabsList>

          <TabsContent value="senior" className="mt-6">
            <form onSubmit={handleSeniorSubmit}>
              <div className="max-w-4xl mx-auto space-y-6">
                {/* 계정 정보 */}
                <Card className="shadow-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Key className="w-5 h-5 text-primary" /> 계정 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>로그인 ID *</Label>
                      <Input value={seniorData.loginId} onChange={e => setSeniorData({ ...seniorData, loginId: e.target.value })} required placeholder="아이디 입력" />
                    </div>
                    <div className="space-y-2">
                      <Label>비밀번호 *</Label>
                      <Input type="password" value={seniorData.password} onChange={e => setSeniorData({ ...seniorData, password: e.target.value })} required placeholder="비밀번호" />
                    </div>
                  </CardContent>
                </Card>

                {/* 기본 정보 */}
                <Card className="shadow-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="w-5 h-5 text-primary" /> 기본 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>성명 *</Label>
                        <Input value={seniorData.name} onChange={e => setSeniorData({ ...seniorData, name: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>생년월일 *</Label>
                        <Input type="date" value={seniorData.birthDate} onChange={e => setSeniorData({ ...seniorData, birthDate: e.target.value })} required />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>성별 *</Label>
                        <Select value={seniorData.gender} onValueChange={v => setSeniorData({ ...seniorData, gender: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">남성</SelectItem>
                            <SelectItem value="F">여성</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>연락처 *</Label>
                        <Input
                          value={seniorData.phone}
                          onChange={e => {
                            setSeniorData({ ...seniorData, phone: e.target.value });
                            // 전화번호 변경 시 인증 초기화
                            if (seniorPhoneVerified) {
                              setSeniorPhoneVerified(false);
                              setSeniorProofToken("");
                            }
                          }}
                          required
                          placeholder="010-0000-0000"
                        />
                      </div>
                    </div>

                    {/* 휴대폰 인증 */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="w-4 h-4" /> 휴대폰 인증 *
                      </Label>
                      <PhoneVerification
                        phone={seniorData.phone}
                        purpose="SIGNUP"
                        onVerified={handleSeniorPhoneVerified}
                        disabled={!seniorData.phone || seniorData.phone.length < 10}
                      />
                    </div>

                    {/* 주소 검색 */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> 주소 *
                      </Label>

                      {/* 행정구역 선택 리스트 */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <Select value={selectedSido} onValueChange={(val) => handleAddressDropdownChange('sido', val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="시/도 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {sidoList.map((sido, index) => (
                              <SelectItem key={`sido-${index}`} value={sido.sidoCode || ''}>
                                {sido.sidoName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={selectedSigungu} onValueChange={(val) => handleAddressDropdownChange('sigungu', val)} disabled={!selectedSido}>
                          <SelectTrigger>
                            <SelectValue placeholder="시/군/구 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {sigunguList.map((sigungu, index) => (
                              <SelectItem key={`sigungu-${index}`} value={sigungu.sigunguCode || ''}>
                                {sigungu.sigunguName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={selectedDong} onValueChange={(val) => handleAddressDropdownChange('dong', val)} disabled={!selectedSigungu}>
                          <SelectTrigger>
                            <SelectValue placeholder="읍/면/동 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {dongList.map((dong, index) => (
                              <SelectItem key={`dong-${index}`} value={String(dong.admCode)}>
                                {dong.dongName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={seniorData.address}
                          onChange={e => setSeniorData({ ...seniorData, address: e.target.value })}
                          required
                          placeholder="기본 주소 (행정구역 선택 시 자동 입력)"
                          className="flex-1"
                        />
                      </div>
                      {seniorData.zipcode && (
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary">우편번호: {seniorData.zipcode}</Badge>
                          {seniorData.admCode && (
                            <Badge variant="outline">행정코드: {seniorData.admCode}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>상세 주소</Label>
                        <Input value={seniorData.detailAddress} onChange={e => setSeniorData({ ...seniorData, detailAddress: e.target.value })} placeholder="동/호수 입력" />
                      </div>
                      <div className="space-y-2">
                        <Label>메모</Label>
                        <Input value={seniorData.memo} onChange={e => setSeniorData({ ...seniorData, memo: e.target.value })} placeholder="관리자 메모" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 약관 및 동의 */}
                <Card className="shadow-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CheckCircle className="w-5 h-5 text-primary" /> 약관 및 동의
                    </CardTitle>
                    <CardDescription>
                      어르신 본인에게 아래 내용을 상세히 안내하고 동의를 받아주세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 전체 동의 */}
                    <div className="flex items-center space-x-2 border-b pb-4 bg-muted/20 p-4 rounded-lg">
                      <Checkbox
                        id="senior-all"
                        checked={seniorData.sensitiveInfoApproval && seniorData.medicationInfoApproval && seniorData.healthInfoApproval}
                        onCheckedChange={(checked) => {
                          const val = checked === true;
                          setSeniorData({
                            ...seniorData,
                            sensitiveInfoApproval: val,
                            medicationInfoApproval: val,
                            healthInfoApproval: val,
                          });
                        }}
                        className="w-5 h-5"
                      />
                      <Label htmlFor="senior-all" className="font-bold cursor-pointer text-base">전체 약관에 동의합니다</Label>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2 border rounded-md p-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="senior-privacy"
                            checked={seniorData.sensitiveInfoApproval}
                            onCheckedChange={(checked) => setSeniorData({ ...seniorData, sensitiveInfoApproval: checked === true })}
                            className="mt-1"
                          />
                          <div className="grid gap-1.5 leading-none flex-1">
                            <Label htmlFor="senior-privacy" className="text-base font-semibold cursor-pointer">
                              개인정보 수집 및 이용 동의 (필수)
                            </Label>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              개인정보보호법 제15조(개인정보의 수집·이용)에 따라 방문요양 서비스 제공, 본인 확인, 고지사항 전달 등을 위하여 본인의 개인정보를 수집·이용하는 것에 동의합니다.<br />
                              <span className="text-xs text-muted-foreground/80 mt-1 block">수집 항목: 성명, 생년월일, 성별, 연락처, 주소 등</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 border rounded-md p-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="senior-health"
                            checked={seniorData.healthInfoApproval}
                            onCheckedChange={(checked) => setSeniorData({ ...seniorData, healthInfoApproval: checked === true })}
                            className="mt-1"
                          />
                          <div className="grid gap-1.5 leading-none flex-1">
                            <Label htmlFor="senior-health" className="text-base font-semibold cursor-pointer">
                              민감정보(건강) 처리 동의 (필수)
                            </Label>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              개인정보보호법 제23조(민감정보의 처리 제한)에 따라 응급 상황 대처, 건강 상태 모니터링, 맞춤형 돌봄 서비스 제공을 위하여 본인의 민감정보(건강상태, 질병정보 등)를 처리하는 것에 동의합니다.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 border rounded-md p-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="senior-medication"
                            checked={seniorData.medicationInfoApproval}
                            onCheckedChange={(checked) => setSeniorData({ ...seniorData, medicationInfoApproval: checked === true })}
                            className="mt-1"
                          />
                          <div className="grid gap-1.5 leading-none flex-1">
                            <Label htmlFor="senior-medication" className="text-base font-semibold cursor-pointer">
                              투약 정보 수집 및 이용 동의 (필수)
                            </Label>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              어르신의 안전한 투약 관리와 오남용 방지를 위하여 복용 중인 약물 정보(처방전, 투약내역 등)를 수집하고 이를 돌봄 서비스에 활용하는 것에 동의합니다.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 통화 스케줄 */}
                <Card className="shadow-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Phone className="w-5 h-5 text-primary" /> 통화 스케줄
                    </CardTitle>
                    <CardDescription>어르신과의 정기 통화 일정을 설정합니다</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">스케줄 활성화</Label>
                        <p className="text-sm text-muted-foreground">정기 통화 스케줄 사용 여부</p>
                      </div>
                      <Switch
                        checked={seniorData.callScheduleEnabled}
                        onCheckedChange={(checked) => setSeniorData({ ...seniorData, callScheduleEnabled: checked })}
                      />
                    </div>

                    {seniorData.callScheduleEnabled && (
                      <>
                        <div className="space-y-2">
                          <Label>선호 통화 시간</Label>
                          <Select
                            value={seniorData.preferredCallTime}
                            onValueChange={(v) => setSeniorData({ ...seniorData, preferredCallTime: v })}
                          >
                            <SelectTrigger><SelectValue placeholder="시간 선택" /></SelectTrigger>
                            <SelectContent>
                              {["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>선호 통화 요일</Label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: "MON", label: "월" },
                              { value: "TUE", label: "화" },
                              { value: "WED", label: "수" },
                              { value: "THU", label: "목" },
                              { value: "FRI", label: "금" },
                            ].map((day) => (
                              <Badge
                                key={day.value}
                                variant={seniorData.preferredCallDays.includes(day.value) ? "default" : "outline"}
                                className="cursor-pointer px-4 py-2 text-sm"
                                onClick={() => {
                                  const newDays = seniorData.preferredCallDays.includes(day.value)
                                    ? seniorData.preferredCallDays.filter((d) => d !== day.value)
                                    : [...seniorData.preferredCallDays, day.value];
                                  setSeniorData({ ...seniorData, preferredCallDays: newDays });
                                }}
                              >
                                {day.label}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            선택된 요일: {seniorData.preferredCallDays.length > 0
                              ? seniorData.preferredCallDays.map(d =>
                                d === "MON" ? "월" : d === "TUE" ? "화" : d === "WED" ? "수" : d === "THU" ? "목" : "금"
                              ).join(", ")
                              : "없음"}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading || !seniorPhoneVerified}
                >
                  {loading ? "등록 중..." : !seniorPhoneVerified ? "휴대폰 인증 필요" : "어르신 등록하기"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="guardian" className="mt-6">
            <form onSubmit={handleGuardianSubmit}>
              <div className="max-w-4xl mx-auto space-y-6">
                {/* 계정 정보 */}
                <Card className="shadow-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Key className="w-5 h-5 text-primary" /> 계정 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>로그인 ID *</Label>
                      <Input value={guardianData.loginId} onChange={e => setGuardianData({ ...guardianData, loginId: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>비밀번호 *</Label>
                      <Input type="password" value={guardianData.password} onChange={e => setGuardianData({ ...guardianData, password: e.target.value })} required />
                    </div>
                  </CardContent>
                </Card>

                {/* 기본 정보 */}
                <Card className="shadow-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Heart className="w-5 h-5 text-primary" /> 보호자 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>성명 *</Label>
                        <Input value={guardianData.name} onChange={e => setGuardianData({ ...guardianData, name: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>연락처 *</Label>
                        <Input
                          value={guardianData.phone}
                          onChange={e => {
                            setGuardianData({ ...guardianData, phone: e.target.value });
                            // 전화번호 변경 시 인증 초기화
                            if (guardianPhoneVerified) {
                              setGuardianPhoneVerified(false);
                              setGuardianProofToken("");
                            }
                          }}
                          required
                          placeholder="010-0000-0000"
                        />
                      </div>
                    </div>

                    {/* 휴대폰 인증 */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="w-4 h-4" /> 휴대폰 인증 *
                      </Label>
                      <PhoneVerification
                        phone={guardianData.phone}
                        purpose="SIGNUP"
                        onVerified={handleGuardianPhoneVerified}
                        disabled={!guardianData.phone || guardianData.phone.length < 10}
                      />
                    </div>

                    {/* 주소 검색 */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> 주소 *
                      </Label>

                      {/* 행정구역 선택 리스트 */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <Select value={guardianSelectedSido} onValueChange={(val) => handleGuardianAddressDropdownChange('sido', val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="시/도 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {sidoList.map((sido, index) => (
                              <SelectItem key={`sido-${index}`} value={sido.sidoCode || ''}>
                                {sido.sidoName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={guardianSelectedSigungu} onValueChange={(val) => handleGuardianAddressDropdownChange('sigungu', val)} disabled={!guardianSelectedSido}>
                          <SelectTrigger>
                            <SelectValue placeholder="시/군/구 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {guardianSigunguList.map((sigungu, index) => (
                              <SelectItem key={`sigungu-${index}`} value={sigungu.sigunguCode || ''}>
                                {sigungu.sigunguName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={guardianSelectedDong} onValueChange={(val) => handleGuardianAddressDropdownChange('dong', val)} disabled={!guardianSelectedSigungu}>
                          <SelectTrigger>
                            <SelectValue placeholder="읍/면/동 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {guardianDongList.map((dong, index) => (
                              <SelectItem key={`dong-${index}`} value={String(dong.admCode)}>
                                {dong.dongName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={guardianData.address}
                          onChange={e => setGuardianData({ ...guardianData, address: e.target.value })}
                          placeholder="기본 주소 (행정구역 선택 시 자동 입력)"
                          className="flex-1" // Removed readOnly
                        />
                      </div>
                      {guardianData.zipcode && (
                        <Badge variant="secondary" className="mt-1">우편번호: {guardianData.zipcode}</Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>상세 주소</Label>
                      <Input value={guardianData.detailAddress} onChange={e => setGuardianData({ ...guardianData, detailAddress: e.target.value })} placeholder="동/호수 입력" />
                    </div>
                    <div className="space-y-2">
                      <Label>이메일</Label>
                      <Input type="email" value={guardianData.email} onChange={e => setGuardianData({ ...guardianData, email: e.target.value })} placeholder="example@email.com" />
                    </div>
                  </CardContent>
                </Card>

                {/* 약관 및 동의 */}
                <Card className="shadow-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CheckCircle className="w-5 h-5 text-primary" /> 약관 및 동의
                    </CardTitle>
                    <CardDescription>
                      보호자에게 아래 내용을 상세히 안내하고 동의를 받아주세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 전체 동의 */}
                    <div className="flex items-center space-x-2 border-b pb-4 bg-muted/20 p-4 rounded-lg">
                      <Checkbox
                        id="guardian-all"
                        checked={guardianData.sensitiveInfoApproval && guardianData.healthInfoApproval}
                        onCheckedChange={(checked) => {
                          const val = checked === true;
                          setGuardianData({
                            ...guardianData,
                            sensitiveInfoApproval: val,
                            healthInfoApproval: val,
                          });
                        }}
                        className="w-5 h-5"
                      />
                      <Label htmlFor="guardian-all" className="font-bold cursor-pointer text-base">전체 약관에 동의합니다</Label>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2 border rounded-md p-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="guardian-privacy"
                            checked={guardianData.sensitiveInfoApproval}
                            onCheckedChange={(checked) => setGuardianData({ ...guardianData, sensitiveInfoApproval: checked === true })}
                            className="mt-1"
                          />
                          <div className="grid gap-1.5 leading-none flex-1">
                            <Label htmlFor="guardian-privacy" className="text-base font-semibold cursor-pointer">
                              개인정보 수집 및 이용 동의 (필수)
                            </Label>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              개인정보보호법 제15조(개인정보의 수집·이용)에 따라 방문요양 서비스 제공, 본인 확인, 고지사항 전달 등을 위하여 본인의 개인정보를 수집·이용하는 것에 동의합니다.<br />
                              <span className="text-xs text-muted-foreground/80 mt-1 block">수집 항목: 성명, 연락처, 주소, 이메일, 가족관계 등</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 border rounded-md p-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="guardian-thirdparty"
                            checked={guardianData.healthInfoApproval}
                            onCheckedChange={(checked) => setGuardianData({ ...guardianData, healthInfoApproval: checked === true })}
                            className="mt-1"
                          />
                          <div className="grid gap-1.5 leading-none flex-1">
                            <Label htmlFor="guardian-thirdparty" className="text-base font-semibold cursor-pointer">
                              제3자 정보 제공 동의 (필수)
                            </Label>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              어르신 돌봄 서비스 제공을 위해 어르신 및 관련 기관(국민건강보험공단, 지자체 등)에 보호자 정보를 제공함에 동의합니다.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 연결 정보 */}
                <Card className="shadow-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><User className="w-5 h-5 text-info" /> 어르신 연결</CardTitle>
                    <CardDescription>연결할 어르신의 회원 ID를 입력하고 검색 버튼을 눌러 확인하세요</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 어르신 검색 */}
                    <div className="space-y-3">
                      <Label>어르신 회원 이름 검색 *</Label>
                      <div className="flex gap-2">
                        <Input
                          value={elderlySearchName}
                          onChange={e => {
                            setElderlySearchName(e.target.value);
                            setElderlySearchError("");
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleElderlySearch()}
                          placeholder="어르신 이름 입력"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleElderlySearch}
                          disabled={elderlySearching || !elderlySearchName}
                        >
                          {elderlySearching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                          <span className="ml-1">검색</span>
                        </Button>
                      </div>

                      {/* 검색 결과 후보 목록 */}
                      {elderlyCandidates.length > 0 && !elderlySearchResult && (
                        <div className="border rounded-md divide-y max-h-48 overflow-y-auto bg-white">
                          {elderlyCandidates.map((candidate) => (
                            <div
                              key={candidate.userId}
                              className="p-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => selectElderly(candidate)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                  <Users className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{candidate.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {candidate.birthDate} | {candidate.phone}
                                  </p>
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" className="h-8 text-xs">선택</Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 선택된 결과 */}
                      {elderlySearchResult && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-green-700">연결 대상 확인됨</p>
                              <p className="text-sm text-green-600">
                                이름: <strong>{elderlySearchResult.name}</strong> <span className="text-green-600/70">| {elderlySearchResult.phone}</span>
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-green-700 hover:text-green-800 hover:bg-green-100 h-8 px-2"
                            onClick={() => {
                              setElderlySearchResult(null);
                              setGuardianData({ ...guardianData, seniorId: "" });
                            }}
                          >
                            변경
                          </Button>
                        </div>
                      )}

                      {/* 검색 오류 */}
                      {elderlySearchError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-600" />
                          <p className="text-sm text-red-700">{elderlySearchError}</p>
                        </div>
                      )}
                    </div>

                    {/* 관계 선택 */}
                    <div className="space-y-2">
                      <Label>관계 *</Label>
                      <Select value={guardianData.relation} onValueChange={v => setGuardianData({ ...guardianData, relation: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CHILD">자녀</SelectItem>
                          <SelectItem value="SPOUSE">배우자</SelectItem>
                          <SelectItem value="RELATIVE">친척</SelectItem>
                          <SelectItem value="OTHER">기타</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>메모</Label>
                      <Input value={guardianData.memo} onChange={e => setGuardianData({ ...guardianData, memo: e.target.value })} placeholder="관리자 메모" />
                    </div>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading || !guardianPhoneVerified || !elderlySearchResult}
                >
                  {loading
                    ? "등록 중..."
                    : !guardianPhoneVerified
                      ? "휴대폰 인증 필요"
                      : !elderlySearchResult
                        ? "어르신 검색 필요"
                        : "보호자 등록하기"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div >
    </DashboardLayout >
  );
};

export default MemberRegistration;
