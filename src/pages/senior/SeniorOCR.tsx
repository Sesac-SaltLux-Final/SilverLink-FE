import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import {
  processImageForUpload,
  formatFileSize,
  type ImageProcessingResult,
  type ProcessingStage,
} from "@/utils/imageProcessor";
import {
  Heart,
  ArrowLeft,
  Camera,
  Upload,
  Volume2,
  RotateCcw,
  FileText,
  Loader2,
  Pill,
  Plus,
  Check,
  ImageIcon,
  Zap,
  HardDrive,
  Timer,
  AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import ocrApi from "@/api/ocr";
import apiClient from "@/api";
import medicationsApi, { MedicationRequest } from "@/api/medications";
import { getErrorMessage } from "@/utils/errorUtils";
import { useAuth } from "@/contexts/AuthContext";

// LLM 검증 결과 타입
interface MedicationInfo {
  medication_name: string;
  dosage?: string;
  times: string[];
  instructions?: string;
  confidence: number;
  category?: string;
}

interface ValidationResult {
  success: boolean;
  medications: MedicationInfo[];
  raw_ocr_text: string;
  llm_analysis: string;
  warnings: string[];
  error_message?: string;
}

// 약 카테고리 매핑
const MEDICATION_CATEGORIES: Record<string, { label: string; color: string }> = {
  "혈압약": { label: "💊 혈압약", color: "bg-red-100 text-red-700 border-red-200" },
  "당뇨약": { label: "💉 당뇨약", color: "bg-blue-100 text-blue-700 border-blue-200" },
  "감기약": { label: "🤧 감기약", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  "위장약": { label: "🩺 위장약", color: "bg-green-100 text-green-700 border-green-200" },
  "진통제": { label: "💊 진통제", color: "bg-orange-100 text-orange-700 border-orange-200" },
  "수면제": { label: "😴 수면제", color: "bg-purple-100 text-purple-700 border-purple-200" },
  "비타민": { label: "🍊 비타민", color: "bg-amber-100 text-amber-700 border-amber-200" },
  "기타": { label: "💊 일반약", color: "bg-gray-100 text-gray-700 border-gray-200" },
};

const SeniorOCR = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 이미지 처리 메트릭 (포트폴리오용 시각화)
  const [imageStats, setImageStats] = useState<ImageProcessingResult | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('loading');

  // LLM 검증 관련
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // 복약 등록 관련
  const [showMedicationDialog, setShowMedicationDialog] = useState(false);
  const [extractedMedications, setExtractedMedications] = useState<MedicationInfo[]>([]);
  const [selectedMedications, setSelectedMedications] = useState<Set<string>>(new Set());
  const [selectedTimes, setSelectedTimes] = useState<Record<string, string[]>>({});
  const [isRegistering, setIsRegistering] = useState(false);

  // OCR 결과 확인 모달
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      toast.info("이미지 최적화 중...");

      // ── 1단계: Canvas 기반 리사이징 + JPEG 압축 + Base64 프리뷰 ──
      // processImageForUpload 파이프라인:
      //   File → loadImage → Canvas 리사이즈(max 1920px)
      //        → JPEG 압축(85%) → Base64 인코딩 → 메트릭 수집
      const result = await processImageForUpload(
        file,
        { maxWidth: 1920, maxHeight: 1920, quality: 0.85 },
        (stage) => setProcessingStage(stage),
      );

      // 처리 메트릭 저장 (UI에 시각화)
      setImageStats(result);
      // Base64 Data URL로 즉시 프리뷰 표시 (네트워크 요청 불필요)
      setImage(result.base64Preview);

      // ── 2단계: OCR API용 추가 압축 (Luxia API 제한 대응) ──
      const ocrOptions = {
        maxSizeMB: 0.3,         // 300KB 이하로 압축
        maxWidthOrHeight: 1280, // HD 수준으로 축소 (OCR에 충분)
        useWebWorker: true,     // Web Worker로 메인 스레드 블로킹 방지
        fileType: 'image/jpeg' as const,
        initialQuality: 0.7,    // JPEG 품질 70%
      };

      // browser-image-compression이 EXIF 회전 보정까지 자동 수행
      const ocrFile = await imageCompression(result.file, ocrOptions);
      setSelectedFile(ocrFile);

      toast.success(
        `이미지 최적화 완료! (${formatFileSize(result.originalSize)} → ${formatFileSize(result.processedSize)}, ${result.compressionRatio}% 감소)`,
      );

      // 최적화된 이미지로 OCR 파이프라인 시작
      processImage(ocrFile);
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      toast.error(`이미지 처리 실패: ${errMsg}`);
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setExtractedText("");
    setValidationResult(null);

    try {
      // 1단계: Luxia OCR 호출
      toast.info("약봉투를 분석하고 있어요...");
      const result = await ocrApi.analyzeDocument(file);

      if (!result.text) {
        setExtractedText("문서에서 텍스트를 찾을 수 없었어요.");
        toast.warning("문서 인식이 어려워요. 다시 찍어보세요.");
        return;
      }

      // 원본 텍스트 저장
      setExtractedText(result.text);
      toast.success("문서를 읽었어요!");

      // 2단계: LLM 검증 (Python AI 서버)
      setIsValidating(true);
      toast.info("약 정보를 검증하고 있어요...");

      try {
        const validationResponse = await validateMedicationOCR(result.text);
        setValidationResult(validationResponse);

        if (validationResponse.success && validationResponse.medications.length > 0) {
          setExtractedMedications(validationResponse.medications);

          // 경고 메시지 표시
          if (validationResponse.warnings.length > 0) {
            validationResponse.warnings.forEach(warning => {
              toast.warning(warning, { duration: 5000 });
            });
          }

          // 신뢰도 낮은 약 경고
          const lowConfidenceMeds = validationResponse.medications.filter(m => m.confidence < 0.7);
          if (lowConfidenceMeds.length > 0) {
            toast.warning(
              `일부 약 정보의 신뢰도가 낮습니다. 확인 후 수정해주세요.`,
              { duration: 5000 }
            );
          }

          // 확인 모달 표시
          setShowConfirmDialog(true);
          toast.success(`${validationResponse.medications.length}개의 약을 찾았어요!`);
        } else {
          // 폴백: 기본 추출 로직
          const medications = extractMedicationNames(result.text);
          if (medications.length > 0) {
            const fallbackMeds: MedicationInfo[] = medications.map(name => ({
              medication_name: name,
              times: ["morning", "evening"],
              confidence: 0.5
            }));
            setExtractedMedications(fallbackMeds);
            toast.info("기본 방식으로 약 정보를 추출했어요.");
          }
        }
      } catch (validationError: any) {
        const errMsg = validationError?.message || String(validationError);
        toast.warning(`AI 검증 실패: ${errMsg}. 기본 방식으로 추출합니다.`);

        // 폴백: 기본 추출 로직
        const medications = extractMedicationNames(result.text);
        if (medications.length > 0) {
          const fallbackMeds: MedicationInfo[] = medications.map(name => ({
            medication_name: name,
            times: ["morning", "evening"],
            confidence: 0.5
          }));
          setExtractedMedications(fallbackMeds);
        }
      } finally {
        setIsValidating(false);
      }

    } catch (error: any) {
      // 에러 메시지 추출
      const errMsg = error?.response?.data?.message || error?.message || String(error);

      // 타임아웃 에러 처리
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error("처리 시간이 너무 오래 걸려요. 더 밝은 곳에서 다시 찍어보세요.");
      } else {
        toast.error(`OCR 실패: ${errMsg}`);
      }
      setExtractedText("");
      setImage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // LLM 검증 API 호출 (Spring Boot 프록시 경유)
  const validateMedicationOCR = async (ocrText: string): Promise<ValidationResult> => {
    // apiClient를 통해 요청 (baseURL 및 인증 처리 일관성)
    const response = await apiClient.post('/api/ocr/validate-medication', {
      ocrText: ocrText,
      elderlyUserId: user?.id || 0,
    });

    return response.data;
  };

  // OCR 텍스트 정제 함수
  const cleanOCRText = (text: string): string => {
    if (!text) return "";

    const lines = text.split('\n');
    const cleanedLines: string[] = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // 마크다운 리스트 기호 제거
      line = line.replace(/^[-*+]\s+/, '');

      // 불필요한 메타데이터 라인 필터링
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
        /^\d{4}-\d{2}-\d{2}$/,
        /^만\d+세/,
        /^\(.*\)$/,
      ];

      if (skipPatterns.some(pattern => pattern.test(line))) {
        continue;
      }

      // 콜론이 포함된 라벨 라인 건너뛰기
      if (/^[가-힣\s]+:\s*$/.test(line) || /^[가-힣\s]+:$/.test(line)) {
        continue;
      }

      // 너무 짧은 라인 건너뛰기
      if (line.length < 2) {
        continue;
      }

      cleanedLines.push(line);
    }

    return cleanedLines.join('\n');
  };

  // 약 이름 추출 (폴백용 - 간단한 패턴 매칭)
  const extractMedicationNames = (text: string): string[] => {
    const medications: string[] = [];

    // 먼저 텍스트 정제
    const cleanedText = cleanOCRText(text);

    // 일반적인 약 이름 패턴 (한글, 영문+숫자)
    const patterns = [
      /([가-힣a-zA-Z]+(?:정|캡슐|시럽|액|크림|연고|주사))/g,
      /([가-힣]{2,}약)/g,
      /([a-zA-Z]+\s*\d+(?:mg|ml|mcg)?)/gi,
    ];

    patterns.forEach(pattern => {
      const matches = cleanedText.match(pattern);
      if (matches) {
        matches.forEach(m => {
          const cleaned = m.trim();
          if (cleaned.length >= 2 && !medications.includes(cleaned)) {
            medications.push(cleaned);
          }
        });
      }
    });

    // 최대 5개까지만
    return medications.slice(0, 5);
  };

  // 약 카테고리 추출 (LLM 응답 우선, 없으면 "기타")
  const getMedicationCategory = (med: MedicationInfo): string => {
    // LLM이 분류한 category가 있으면 그대로 사용
    if (med.category && MEDICATION_CATEGORIES[med.category]) {
      return med.category;
    }
    return "기타";
  };

  // 약 이름을 쉬운 표현으로 변환 (원본 약 이름 반환)
  const getMedicationDisplayName = (med: MedicationInfo): string => {
    return med.medication_name;
  };

  const handleSpeak = () => {
    if (!extractedText) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // 텍스트 정제 후 읽기
    const textToSpeak = cleanOCRText(extractedText) || extractedText;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "ko-KR";
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleReset = () => {
    window.speechSynthesis.cancel();
    setImage(null);
    setExtractedText("");
    setIsSpeaking(false);
    setExtractedMedications([]);
    setSelectedMedications(new Set());
    setValidationResult(null);
    setImageStats(null);
    setProcessingStage('loading');
  };

  const handleOpenMedicationDialog = () => {
    // 모든 약을 기본 선택
    const allMedNames = extractedMedications.map(m => m.medication_name);
    setSelectedMedications(new Set(allMedNames));

    // 각 약의 LLM 추천 시간을 기본값으로 설정
    const initialTimes: Record<string, string[]> = {};
    extractedMedications.forEach(med => {
      initialTimes[med.medication_name] = med.times.length > 0
        ? med.times
        : ["morning", "evening"];
    });
    setSelectedTimes(initialTimes);

    setShowMedicationDialog(true);
  };

  const handleToggleMedication = (medName: string) => {
    const newSet = new Set(selectedMedications);
    if (newSet.has(medName)) {
      newSet.delete(medName);
    } else {
      newSet.add(medName);
    }
    setSelectedMedications(newSet);
  };

  const handleToggleTime = (medName: string, time: string) => {
    const currentTimes = selectedTimes[medName] || [];
    const newTimes = currentTimes.includes(time)
      ? currentTimes.filter(t => t !== time)
      : [...currentTimes, time];

    setSelectedTimes({
      ...selectedTimes,
      [medName]: newTimes
    });
  };

  const handleRegisterMedications = async () => {
    if (selectedMedications.size === 0) {
      toast.error("등록할 약을 선택해주세요.");
      return;
    }

    setIsRegistering(true);
    let successCount = 0;

    try {
      for (const medName of selectedMedications) {
        const medication = extractedMedications.find(m => m.medication_name === medName);
        if (!medication) continue;

        const times = selectedTimes[medName] || ["morning", "evening"];
        if (times.length === 0) {
          toast.warning(`${getMedicationDisplayName(medication)}의 복용 시간을 선택해주세요.`);
          continue;
        }

        const request: MedicationRequest = {
          medicationName: getMedicationDisplayName(medication),
          dosageText: medication.dosage,
          times: times,
          instructions: medication.instructions,
          reminder: true,
        };

        await medicationsApi.createMedication(request);
        successCount++;
      }

      if (successCount > 0) {
        toast.success(`${successCount}개 약이 등록되었어요!`);
        setShowMedicationDialog(false);
        navigate("/senior/medication");
      } else {
        toast.error("등록된 약이 없습니다.");
      }
    } catch (error: any) {

      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || "약 등록에 실패했어요. 다시 시도해주세요.";

      toast.error(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  const timeLabels: Record<string, string> = {
    morning: "아침",
    noon: "점심",
    evening: "저녁",
    night: "자기 전",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-info text-info-foreground p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate("/senior")}
            className="text-info-foreground hover:bg-info-foreground/20 p-3"
          >
            <ArrowLeft className="w-8 h-8" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-info-foreground/20 flex items-center justify-center">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">약봉투 촬영</h1>
              <p className="text-info-foreground/80 text-sm">약봉투를 찍으면 일정에 등록해요</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Camera/Upload Section */}
        {!image && (
          <Card>
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-info/10 flex items-center justify-center">
                  <Pill className="w-12 h-12 text-info" />
                </div>
                <div>
                  <p className="text-xl font-bold mb-2">약봉지를 촬영해주세요</p>
                  <p className="text-muted-foreground">
                    약봉지를 찍으면 자동으로 일정에 등록해드려요.
                  </p>
                </div>
                <div className="space-y-4">
                  <Button
                    onClick={handleCameraCapture}
                    className="w-full h-20 text-xl font-bold rounded-2xl gap-3"
                    size="lg"
                  >
                    <Camera className="w-8 h-8" />
                    카메라로 찍기
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCameraCapture}
                    className="w-full h-16 text-lg font-bold rounded-2xl gap-3"
                    size="lg"
                  >
                    <Upload className="w-6 h-6" />
                    사진 선택하기
                  </Button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </CardContent>
          </Card>
        )}

        {/* Processing State – 단계별 진행 상태 표시 */}
        {(isProcessing || isValidating) && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center space-y-6">
                <Loader2 className="w-16 h-16 mx-auto text-info animate-spin" />
                <div>
                  <p className="text-xl font-bold">
                    {isValidating
                      ? "약 정보를 검증하고 있어요..."
                      : processingStage === 'resizing'
                        ? "이미지 리사이징 중..."
                        : processingStage === 'compressing'
                          ? "JPEG 압축 중..."
                          : processingStage === 'encoding'
                            ? "프리뷰 생성 중..."
                            : "약봉지를 읽고 있어요..."}
                  </p>
                  <p className="text-muted-foreground mt-2">잠시만 기다려주세요</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result Section */}
        {image && extractedText && !isProcessing && !isValidating && (
          <div className="space-y-6">
            {/* Image Preview */}
            <Card>
              <CardContent className="p-4">
                <img
                  src={image}
                  alt="촬영한 약봉지"
                  className="w-full rounded-xl"
                />
              </CardContent>
            </Card>

            {/* ── 이미지 처리 통계 카드 ── */}
            {imageStats && (
              <Card className="border-info/30 bg-gradient-to-br from-info/5 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-info" />
                    <span className="font-bold text-base text-info">이미지 최적화 결과</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* 원본 크기 */}
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <HardDrive className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">원본</p>
                        <p className="font-bold text-sm truncate">{formatFileSize(imageStats.originalSize)}</p>
                      </div>
                    </div>
                    {/* 압축 크기 */}
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <HardDrive className="w-4 h-4 text-info shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">최적화 후</p>
                        <p className="font-bold text-sm truncate">{formatFileSize(imageStats.processedSize)}</p>
                      </div>
                    </div>
                    {/* 해상도 변화 */}
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">해상도</p>
                        <p className="font-bold text-sm truncate">
                          {imageStats.wasResized
                            ? `${imageStats.originalDimensions.width}×${imageStats.originalDimensions.height} → ${imageStats.processedDimensions.width}×${imageStats.processedDimensions.height}`
                            : `${imageStats.processedDimensions.width}×${imageStats.processedDimensions.height}`}
                        </p>
                      </div>
                    </div>
                    {/* 압축률 & 처리 시간 */}
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <Timer className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">압축률 / 소요시간</p>
                        <p className="font-bold text-sm truncate">
                          {imageStats.compressionRatio}% 감소 · {imageStats.processingTimeMs}ms
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Extracted Medications */}
            {extractedMedications.length > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Pill className="w-6 h-6 text-primary" />
                    <span className="text-lg font-bold">찾은 약 ({extractedMedications.length}개)</span>
                  </div>

                  {/* LLM 분석 결과 */}
                  {validationResult?.llm_analysis && (
                    <div className="mb-4 p-3 bg-info/10 rounded-lg text-sm">
                      <p className="text-info-foreground">{validationResult.llm_analysis}</p>
                    </div>
                  )}

                  {/* 약 목록 */}
                  <div className="space-y-2 mb-4">
                    {extractedMedications.map((med, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-lg border border-primary/20"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-bold text-base">
                                {getMedicationDisplayName(med)}
                              </span>
                              {/* 카테고리 배지 */}
                              {(() => {
                                const category = getMedicationCategory(med);
                                const categoryInfo = MEDICATION_CATEGORIES[category];
                                return (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${categoryInfo.color}`}
                                  >
                                    {categoryInfo.label}
                                  </Badge>
                                );
                              })()}
                              {med.confidence < 0.7 && (
                                <Badge variant="outline" className="text-xs">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  확인 필요
                                </Badge>
                              )}
                            </div>
                            {med.dosage && (
                              <p className="text-sm text-muted-foreground">
                                용량: {med.dosage}
                              </p>
                            )}
                            {med.instructions && (
                              <p className="text-sm text-muted-foreground">
                                복용법: {med.instructions}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {med.times.map(time => (
                                <Badge key={time} variant="secondary" className="text-xs">
                                  {timeLabels[time] || time}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Badge
                            variant={med.confidence >= 0.8 ? "default" : "secondary"}
                            className="ml-2"
                          >
                            {Math.round(med.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleOpenMedicationDialog}
                    className="w-full h-16 text-lg font-bold rounded-2xl gap-3"
                    size="lg"
                  >
                    <Plus className="w-6 h-6" />
                    복약 일정에 등록하기
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Extracted Text */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-info" />
                  <span className="text-lg font-bold">읽은 내용</span>
                </div>
                <div className="bg-muted/50 rounded-xl p-6 whitespace-pre-wrap text-lg leading-relaxed max-h-48 overflow-y-auto">
                  {extractedText}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Button
                onClick={handleSpeak}
                className={`w-full h-20 text-xl font-bold rounded-2xl gap-3 ${isSpeaking ? "bg-warning hover:bg-warning/90" : ""
                  }`}
                size="lg"
              >
                <Volume2 className="w-8 h-8" />
                {isSpeaking ? "읽기 중지" : "소리로 읽어주기"}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full h-16 text-lg font-bold rounded-2xl gap-3"
                size="lg"
              >
                <RotateCcw className="w-6 h-6" />
                다시 찍기
              </Button>
            </div>
          </div>
        )}

        {/* Tips */}
        {!image && (
          <Card className="bg-info/5 border-info/20">
            <CardContent className="p-6">
              <p className="font-bold mb-3 text-info">💡 잘 찍는 방법</p>
              <ul className="space-y-2 text-muted-foreground">
                <li>• 밝은 곳에서 찍어주세요</li>
                <li>• 약봉지가 화면에 꽉 차게 찍어주세요</li>
                <li>• 글씨가 잘 보이게 찍어주세요</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Medication Registration Dialog */}
      <Dialog open={showMedicationDialog} onOpenChange={setShowMedicationDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">복약 일정 등록</DialogTitle>
            <DialogDescription>
              등록할 약과 복용 시간을 확인하고 수정해주세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {extractedMedications.map((med, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                {/* 약 선택 */}
                <div
                  className={`flex items-start gap-3 cursor-pointer ${selectedMedications.has(med.medication_name)
                    ? "opacity-100"
                    : "opacity-50"
                    }`}
                  onClick={() => handleToggleMedication(med.medication_name)}
                >
                  <Checkbox
                    checked={selectedMedications.has(med.medication_name)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base">
                        {getMedicationDisplayName(med)}
                      </span>
                      {med.confidence < 0.7 && (
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          확인 필요
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        신뢰도 {Math.round(med.confidence * 100)}%
                      </Badge>
                    </div>
                    {med.dosage && (
                      <p className="text-sm text-muted-foreground mt-1">
                        용량: {med.dosage}
                      </p>
                    )}
                    {med.instructions && (
                      <p className="text-sm text-muted-foreground">
                        복용법: {med.instructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* 복용 시간 선택 */}
                {selectedMedications.has(med.medication_name) && (
                  <div className="ml-8 space-y-2">
                    <Label className="text-sm font-semibold">⏰ 복용 시간</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(timeLabels).map(([key, label]) => {
                        const isSelected = (selectedTimes[med.medication_name] || []).includes(key);
                        return (
                          <div
                            key={key}
                            className={`text-center p-2 rounded-lg border cursor-pointer transition-colors ${isSelected
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted"
                              }`}
                            onClick={() => handleToggleTime(med.medication_name, key)}
                          >
                            <span className="text-sm font-medium">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMedicationDialog(false)}
              disabled={isRegistering}
            >
              취소
            </Button>
            <Button
              onClick={handleRegisterMedications}
              disabled={isRegistering || selectedMedications.size === 0}
              className="gap-2"
            >
              {isRegistering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {selectedMedications.size}개 약 등록하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OCR 결과 확인 모달 */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <Check className="w-8 h-8 text-info" />
              이 내용이 맞나요?
            </DialogTitle>
            <DialogDescription className="text-base">
              인식된 약 정보를 확인해주세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto">
            {/* 촬영한 이미지 미리보기 */}
            {image && (
              <div className="rounded-xl overflow-hidden border">
                <img
                  src={image}
                  alt="촬영한 약봉투"
                  className="w-full max-h-32 object-cover"
                />
              </div>
            )}

            {/* 인식된 약 목록 */}
            <div className="space-y-2">
              {extractedMedications.map((med, idx) => {
                const category = getMedicationCategory(med);
                const categoryInfo = MEDICATION_CATEGORIES[category];
                return (
                  <div
                    key={idx}
                    className="p-3 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold">{med.medication_name}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${categoryInfo.color}`}
                          >
                            {categoryInfo.label}
                          </Badge>
                        </div>
                        {med.dosage && (
                          <p className="text-sm text-muted-foreground">
                            용량: {med.dosage}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {med.times.map(time => (
                            <Badge key={time} variant="secondary" className="text-xs">
                              {timeLabels[time] || time}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge
                        variant={med.confidence >= 0.8 ? "default" : "secondary"}
                        className="ml-2"
                      >
                        {Math.round(med.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {extractedMedications.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>인식된 약이 없어요. 다시 촬영해주세요.</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col gap-3 sm:flex-col">
            <Button
              onClick={() => {
                setShowConfirmDialog(false);
                handleOpenMedicationDialog();
              }}
              className="w-full h-14 text-lg font-bold bg-info hover:bg-info/90"
              disabled={extractedMedications.length === 0}
            >
              <Check className="w-6 h-6 mr-2" />
              네, 맞아요
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                handleReset();
              }}
              className="w-full h-14 text-lg font-bold"
            >
              <RotateCcw className="w-6 h-6 mr-2" />
              아니요, 다시 찍을게요
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeniorOCR;

