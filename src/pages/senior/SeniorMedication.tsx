import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";
import {
  ArrowLeft,
  Camera,
  Pill,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Bell,
  Check,
  Volume2,
  ImageIcon,
  Calendar,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Loader2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import medicationsApi, { MedicationResponse, MedicationRequest } from "@/api/medications";
import ocrApi from "@/api/ocr";
import { getErrorMessage } from "@/utils/errorUtils";

interface Medication {
  id: number;
  name: string;
  dosage: string;
  times: string[];
  reminder: boolean;
  startDate: string;
  endDate?: string;
  instructions?: string;
}

const TIME_OPTIONS = [
  { id: "morning", label: "아침", icon: Sunrise, time: "08:00" },
  { id: "noon", label: "점심", icon: Sun, time: "12:00" },
  { id: "evening", label: "저녁", icon: Sunset, time: "18:00" },
  { id: "night", label: "취침전", icon: Moon, time: "22:00" },
];

// API 응답을 로컬 형식으로 변환
const mapToLocal = (response: MedicationResponse): Medication => ({
  id: response.id,
  name: response.name,
  dosage: response.dosage || "",
  times: response.times || [],
  reminder: response.reminder,
  startDate: response.startDate || new Date().toISOString().split('T')[0],
  endDate: response.endDate || undefined,
  instructions: response.instructions || undefined,
});

// 텍스트에서 복용 시간 추출
const parseTimesFromText = (text: string): string[] => {
  const times: string[] = [];
  const lowerText = text.toLowerCase();

  if (lowerText.includes("아침") || lowerText.includes("조식") || lowerText.includes("기상")) {
    times.push("morning");
  }
  if (lowerText.includes("점심") || lowerText.includes("중식") || lowerText.includes("낮")) {
    times.push("noon");
  }
  if (lowerText.includes("저녁") || lowerText.includes("석식")) {
    times.push("evening");
  }
  if (lowerText.includes("취침") || lowerText.includes("자기") || lowerText.includes("밤")) {
    times.push("night");
  }

  // 하루 3회 패턴
  if (lowerText.includes("1일 3회") || lowerText.includes("하루 3회")) {
    return ["morning", "noon", "evening"];
  }
  // 하루 2회 패턴
  if (lowerText.includes("1일 2회") || lowerText.includes("하루 2회")) {
    if (!times.includes("morning")) times.push("morning");
    if (!times.includes("evening")) times.push("evening");
  }

  return times.length > 0 ? times : ["morning"]; // 기본값
};

// OCR 텍스트 정제 함수 - 불필요한 마크다운 기호와 메타데이터 제거
const cleanOCRText = (text: string): string => {
  if (!text) return "";

  // 줄 단위로 분리
  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  for (let line of lines) {
    // 앞뒤 공백 제거
    line = line.trim();

    // 빈 줄 건너뛰기
    if (!line) continue;

    // 마크다운 리스트 기호 제거 (-, *, +)
    line = line.replace(/^[-*+]\s+/, '');

    // 불필요한 메타데이터 라인 필터링 (더 강력하게)
    const skipPatterns = [
      /^환자정보/i,
      /^교부번호/i,
      /^병원정보/i,
      /^조제\s*약사/i,
      /^처방\s*의사/i,
      /^처방\s*일자/i,
      /^조제\s*일자/i,
      /^약국\s*명/i,
      /^약국\s*주소/i,
      /^약국\s*전화/i,
      /^약품사진/i,
      /^약품명/i,
      /^복약안내/i,
      /^주의사항/i,
      /^투약량/i,
      /^투여수/i,
      /^투여시간/i,
      /^\d{4}-\d{2}-\d{2}$/,  // 날짜 형식 (2014-09-18)
      /^만\d+세/,              // 나이 정보
      /^\(.*\)$/,              // 괄호만 있는 라인
    ];

    // 메타데이터 라인이면 건너뛰기
    if (skipPatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    // 콜론(:)이 포함된 라벨 라인 건너뛰기
    if (/^[가-힣\s]+:\s*$/.test(line) || /^[가-힣\s]+:$/.test(line)) {
      continue;
    }

    // 너무 짧은 라인 건너뛰기 (1글자)
    if (line.length < 2) {
      continue;
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join('. ');
};

// 약 이름 추출 함수 - 여러 약 이름 추출
const extractMedicationNames = (text: string): string[] => {
  const cleanedText = cleanOCRText(text);
  const lines = cleanedText.split('.').map(l => l.trim()).filter(l => l);
  const medications: string[] = [];

  for (const line of lines) {
    // 너무 짧거나 긴 라인 제외
    if (line.length < 2 || line.length > 50) continue;

    // 숫자나 특수문자로만 이루어진 라인 제외
    if (/^[\d\s\-\/\(\)]+$/.test(line)) continue;

    // 약 이름 패턴 (정, 캡슐, 시럽 등)
    if (/정|캡슐|시럽|액|크림|연고|주사|약/.test(line)) {
      medications.push(line);
    }
  }

  // 최대 5개까지
  return medications.slice(0, 5);
};

// 첫 번째 약 이름 추출 (단일 약용)
const extractMedicationName = (text: string): string => {
  const medications = extractMedicationNames(text);
  return medications.length > 0 ? medications[0] : "인식된 약";
};

// 음성 읽기용 텍스트 생성 - 더 자연스럽게
const generateSpeechText = (medication: Partial<Medication>, timeLabels: string): string => {
  const parts: string[] = [];

  // 약 이름
  if (medication.name) {
    parts.push(medication.name);
  }

  // 복용량
  if (medication.dosage) {
    // "1정", "2알" 등의 단위가 있으면 그대로, 없으면 추가
    const dosage = medication.dosage.trim();
    if (dosage && !dosage.match(/정|알|캡슐|포|ml|mg/)) {
      parts.push(`${dosage}정`);
    } else {
      parts.push(dosage);
    }
  }

  // 복용 시간
  if (timeLabels) {
    parts.push(`${timeLabels}에 드세요`);
  }

  // 복용 방법
  if (medication.instructions) {
    const instructions = cleanOCRText(medication.instructions);
    if (instructions) {
      parts.push(instructions);
    }
  }

  return parts.filter(p => p).join('. ');
};

const SeniorMedication = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showOCRResult, setShowOCRResult] = useState(false);
  const [showOCRConfirmDialog, setShowOCRConfirmDialog] = useState(false);
  const [ocrResult, setOcrResult] = useState<Partial<Medication> | null>(null);
  const [isSpeakingOCR, setIsSpeakingOCR] = useState(false);

  // New medication form states
  const [newMedName, setNewMedName] = useState("");
  const [newMedDosage, setNewMedDosage] = useState("");
  const [newMedTimes, setNewMedTimes] = useState<string[]>([]);
  const [newMedInstructions, setNewMedInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 데이터 로드
  useEffect(() => {
    const fetchMedications = async () => {
      try {
        setLoading(true);
        const data = await medicationsApi.getMyMedications();
        setMedications(data.map(mapToLocal));
      } catch (error) {
        // 로그인되지 않은 경우 빈 목록 유지
        setMedications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMedications();
  }, []);

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      toast.info("이미지 최적화 중...");

      // 압축 옵션 설정
      const options = {
        maxSizeMB: 1,          // 1MB 이하로 압축 (WAF/Spring 제한 통과)
        maxWidthOrHeight: 1920, // FHD 수준 리사이징 (OCR 인식률 최적)
        useWebWorker: true,     // 메인 스레드 멈춤 방지
        fileType: 'image/jpeg'  // 호환성 좋은 포맷으로 변환
      };

      // 라이브러리가 압축 및 EXIF 회전 보정을 자동 수행
      const compressedFile = await imageCompression(file, options);

      // 압축된 파일로 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);

      // 압축된 파일로 OCR 처리
      processImage(compressedFile);
    } catch (error) {
      toast.error("사진을 처리하는 데 실패했습니다. 다시 시도해주세요.");
    }
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    toast.info("약봉투를 분석하고 있어요...");

    try {
      const result = await ocrApi.analyzeDocument(file);

      let medicationInfo: Partial<Medication>;

      // OCR 결과에서 약 정보 추출
      if (result.medication) {
        // API가 직접 약 정보를 반환한 경우
        medicationInfo = {
          name: result.medication.name || "인식된 약",
          dosage: result.medication.dosage,
          times: result.medication.times || parseTimesFromText(result.text || ""),
          instructions: result.medication.instructions,
        };
      } else if (result.text) {
        // 텍스트에서 파싱
        const text = result.text;
        const cleanedText = cleanOCRText(text);
        const lines = cleanedText.split('.').map(l => l.trim()).filter(l => l);

        // 여러 약 감지
        const allMedications = extractMedicationNames(text);

        if (allMedications.length > 1) {
          // 여러 약이 감지되면 SeniorOCR 페이지로 안내
          toast.info(`${allMedications.length}개의 약이 감지되었어요. 약봉지 읽기 페이지를 이용해주세요.`, {
            duration: 5000,
          });
          resetCapture();
          return;
        }

        medicationInfo = {
          name: extractMedicationName(text),
          dosage: lines.find(l => l.includes("정") || l.includes("mg") || l.includes("ml") || l.includes("알") || l.includes("캡슐"))?.trim(),
          times: parseTimesFromText(text),
          instructions: lines.find(l => l.includes("복용") || l.includes("식후") || l.includes("식전") || l.includes("회"))?.trim(),
        };
      } else {
        throw new Error("인식된 내용이 없어요.");
      }

      setOcrResult(medicationInfo);
      setShowOCRResult(true);
      setShowOCRConfirmDialog(true);
      toast.success("약 정보를 읽었어요!");
    } catch (error: any) {

      // 타임아웃 에러 처리
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error("처리 시간이 너무 오래 걸려요. 더 밝은 곳에서 다시 찍어보세요.");
      } else {
        toast.error(getErrorMessage(error, "약봉투 인식에 실패했어요. 다시 찍어보세요."));
      }
      resetCapture();
    } finally {
      setIsProcessing(false);
    }
  };

  const speakOCRResult = () => {
    if (!ocrResult) return;

    if (isSpeakingOCR) {
      window.speechSynthesis.cancel();
      setIsSpeakingOCR(false);
      return;
    }

    const timeLabels = ocrResult.times?.map(t => getTimeLabel(t)).join(", ") || "";
    const text = generateSpeechText(ocrResult, timeLabels);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeakingOCR(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeakingOCR(true);
  };

  const confirmOCRResult = async () => {
    if (ocrResult) {
      try {
        setSubmitting(true);

        // times 배열 검증
        const validTimes = ocrResult.times && ocrResult.times.length > 0
          ? ocrResult.times
          : ["morning"];

        const request: MedicationRequest = {
          medicationName: ocrResult.name || "새 약",
          dosageText: ocrResult.dosage || undefined,
          times: validTimes,
          instructions: ocrResult.instructions || undefined,
          reminder: true,
        };

        const response = await medicationsApi.createMedication(request);
        setMedications([...medications, mapToLocal(response)]);
        toast.success("복약 일정이 등록되었어요!");
        setShowOCRConfirmDialog(false);
        resetCapture();
      } catch (error: any) {

        const errorMessage = error.response?.data?.message
          || error.response?.data?.error
          || "등록에 실패했습니다.";

        toast.error(errorMessage);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const rejectOCRResult = () => {
    window.speechSynthesis.cancel();
    setIsSpeakingOCR(false);
    setShowOCRConfirmDialog(false);
    resetCapture();
  };

  const resetCapture = () => {
    window.speechSynthesis.cancel();
    setIsSpeakingOCR(false);
    setCapturedImage(null);
    setOcrResult(null);
    setShowOCRResult(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleTime = (timeId: string) => {
    setNewMedTimes(prev =>
      prev.includes(timeId)
        ? prev.filter(t => t !== timeId)
        : [...prev, timeId]
    );
  };

  const handleAddMedication = async () => {
    if (!newMedName.trim()) {
      toast.error("약 이름을 입력해주세요");
      return;
    }
    if (newMedTimes.length === 0) {
      toast.error("복용 시간을 선택해주세요");
      return;
    }

    try {
      setSubmitting(true);
      const request: MedicationRequest = {
        medicationName: newMedName,
        dosageText: newMedDosage || undefined,
        times: newMedTimes,
        instructions: newMedInstructions || undefined,
        reminder: true,
      };

      const response = await medicationsApi.createMedication(request);
      setMedications([...medications, mapToLocal(response)]);
      resetForm();
      setShowAddDialog(false);
      toast.success("복약 일정이 등록되었어요!");
    } catch (error: any) {

      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || "등록에 실패했습니다.";

      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewMedName("");
    setNewMedDosage("");
    setNewMedTimes([]);
    setNewMedInstructions("");
  };

  const deleteMedication = async (id: number) => {
    try {
      await medicationsApi.deleteMedication(id);
      setMedications(medications.filter(m => m.id !== id));
      toast.success("복약 일정이 삭제되었어요");
    } catch (error) {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const toggleReminder = async (id: number) => {
    try {
      const response = await medicationsApi.toggleReminder(id);
      setMedications(medications.map(m =>
        m.id === id ? { ...m, reminder: response.reminder } : m
      ));
    } catch (error) {
      toast.error("설정 변경에 실패했습니다.");
    }
  };

  const getTimeLabel = (timeId: string) => {
    return TIME_OPTIONS.find(t => t.id === timeId)?.label || timeId;
  };

  const speakMedication = (med: Medication) => {
    const timeLabels = med.times.map(t => getTimeLabel(t)).join(", ");
    const text = generateSpeechText(med, timeLabels);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-success" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <header className="bg-success text-success-foreground p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate("/senior")}
            className="text-success-foreground hover:bg-success-foreground/20 p-3"
          >
            <ArrowLeft className="w-8 h-8" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-success-foreground/20 flex items-center justify-center">
              <Pill className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">복약 일정</h1>
              <p className="text-success-foreground/80 text-sm">약 복용 시간을 알려드려요</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* 약봉투 촬영 안내 카드 */}
        <Card className="bg-info/5 border-info/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-info" />
                </div>
                <div>
                  <p className="font-bold">약봉투 촬영으로 등록하기</p>
                  <p className="text-sm text-muted-foreground">사진으로 간편하게 등록해요</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/senior/ocr")}
                className="gap-2"
              >
                <Camera className="w-4 h-4" />
                촬영하기
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* My Medications List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-success" />
              내 복약 목록
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="gap-2"
            >
              <Plus className="w-5 h-5" />
              직접 추가
            </Button>
          </div>

          <div className="space-y-4">
            {medications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Pill className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    등록된 복약 일정이 없어요<br />
                    위의 '촬영하기' 또는 '직접 추가'를 눌러주세요
                  </p>
                </CardContent>
              </Card>
            ) : (
              medications.map((med) => (
                <Card key={med.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Pill className="w-5 h-5 text-success" />
                          {med.name}
                        </CardTitle>
                        <p className="text-muted-foreground text-sm mt-1">{med.dosage}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => speakMedication(med)}
                        className="text-muted-foreground hover:text-success"
                      >
                        <Volume2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    {/* Time badges */}
                    <div className="flex flex-wrap gap-2">
                      {med.times.map((time) => {
                        const timeOption = TIME_OPTIONS.find(t => t.id === time);
                        const Icon = timeOption?.icon || Clock;
                        return (
                          <Badge
                            key={time}
                            variant="secondary"
                            className="py-2 px-4 text-sm gap-2"
                          >
                            <Icon className="w-4 h-4" />
                            {timeOption?.label} ({timeOption?.time})
                          </Badge>
                        );
                      })}
                    </div>

                    {/* Instructions */}
                    {med.instructions && (
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                        💊 {med.instructions}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-3">
                        <Bell className={`w-5 h-5 ${med.reminder ? "text-success" : "text-muted-foreground"}`} />
                        <span className="text-sm">알림</span>
                        <Switch
                          checked={med.reminder}
                          onCheckedChange={() => toggleReminder(med.id)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMedication(med.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      {/* OCR Result Confirmation Dialog */}
      <Dialog open={showOCRConfirmDialog} onOpenChange={setShowOCRConfirmDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <Check className="w-8 h-8 text-success" />
              이 내용이 맞나요?
            </DialogTitle>
            <DialogDescription className="text-base">
              읽은 약 정보를 확인해주세요
            </DialogDescription>
          </DialogHeader>

          {ocrResult && (
            <div className="space-y-5 py-4">
              {/* 촬영한 이미지 */}
              {capturedImage && (
                <div className="rounded-xl overflow-hidden border">
                  <img
                    src={capturedImage}
                    alt="촬영한 약봉투"
                    className="w-full"
                  />
                </div>
              )}

              {/* 약 정보 */}
              <div className="space-y-4 p-5 bg-muted/50 rounded-xl">
                <div>
                  <Label className="text-sm text-muted-foreground">💊 약 이름</Label>
                  <p className="text-2xl font-bold mt-1">{ocrResult.name}</p>
                </div>

                {ocrResult.dosage && (
                  <div>
                    <Label className="text-sm text-muted-foreground">📋 복용량</Label>
                    <p className="text-xl font-medium mt-1">{ocrResult.dosage}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm text-muted-foreground">⏰ 복용 시간</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ocrResult.times?.map(t => {
                      const timeOption = TIME_OPTIONS.find(opt => opt.id === t);
                      const Icon = timeOption?.icon || Clock;
                      return (
                        <Badge key={t} variant="secondary" className="text-base py-2 px-4 gap-2">
                          <Icon className="w-4 h-4" />
                          {getTimeLabel(t)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {ocrResult.instructions && (
                  <div>
                    <Label className="text-sm text-muted-foreground">📝 복용 방법</Label>
                    <p className="text-base mt-1">{ocrResult.instructions}</p>
                  </div>
                )}
              </div>

              {/* 소리로 읽어주기 버튼 */}
              <Button
                onClick={speakOCRResult}
                variant="outline"
                className={`w-full h-16 text-lg font-bold gap-3 ${isSpeakingOCR ? "bg-warning/10 border-warning text-warning" : ""
                  }`}
              >
                <Volume2 className="w-6 h-6" />
                {isSpeakingOCR ? "읽기 중지" : "소리로 읽어주기"}
              </Button>
            </div>
          )}

          <DialogFooter className="flex gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={rejectOCRResult}
              disabled={submitting}
              className="flex-1 h-16 text-xl font-bold rounded-xl border-2"
            >
              아니요<br />
              <span className="text-sm font-normal">다시 찍기</span>
            </Button>
            <Button
              onClick={confirmOCRResult}
              disabled={submitting}
              className="flex-1 h-16 text-xl font-bold rounded-xl bg-success hover:bg-success/90"
            >
              {submitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  예<br />
                  <span className="text-sm font-normal">등록하기</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Medication Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Plus className="w-6 h-6 text-success" />
              복약 일정 추가
            </DialogTitle>
            <DialogDescription>
              약 정보를 직접 입력해주세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">약 이름 *</Label>
              <Input
                value={newMedName}
                onChange={(e) => setNewMedName(e.target.value)}
                placeholder="예: 혈압약"
                className="h-12 text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">복용량</Label>
              <Input
                value={newMedDosage}
                onChange={(e) => setNewMedDosage(e.target.value)}
                placeholder="예: 1정"
                className="h-12 text-lg"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">복용 시간 *</Label>
              <div className="grid grid-cols-2 gap-3">
                {TIME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = newMedTimes.includes(option.id);
                  return (
                    <Button
                      key={option.id}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => toggleTime(option.id)}
                      className={`h-16 flex-col gap-1 ${isSelected ? "bg-success hover:bg-success/90" : ""}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{option.label}</span>
                      <span className="text-xs opacity-70">{option.time}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">복용 방법</Label>
              <Input
                value={newMedInstructions}
                onChange={(e) => setNewMedInstructions(e.target.value)}
                placeholder="예: 식후 30분"
                className="h-12 text-lg"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setShowAddDialog(false);
              }}
              className="flex-1 h-12"
            >
              취소
            </Button>
            <Button
              onClick={handleAddMedication}
              disabled={submitting}
              className="flex-1 h-12 bg-success hover:bg-success/90"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              등록하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Emergency Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          onClick={() => navigate("/senior")}
          variant="outline"
          className="w-full h-16 text-lg font-bold rounded-2xl"
        >
          <ArrowLeft className="w-6 h-6 mr-2" />
          홈으로 돌아가기
        </Button>
      </div>
    </div>
  );
};

export default SeniorMedication;
