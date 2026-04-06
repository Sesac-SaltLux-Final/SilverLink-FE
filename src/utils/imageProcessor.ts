/**
 * imageProcessor.ts
 * ─────────────────────────────────────────────────────────────
 * 모바일 최적화 이미지 처리 파이프라인
 *
 * 촬영 즉시 다음 과정을 수행하여 업로드 용량을 최적화합니다:
 *  1) Canvas 기반 리사이징   – 장축 max 1920px, 종횡비 보존
 *  2) JPEG 압축              – quality 85 %, 평균 70-80 % 용량 감소
 *  3) Base64 인코딩          – Data URL 형태로 즉시 프리뷰 표시
 *  4) 성능 메트릭 수집        – 원본·결과 크기, 압축률, 소요 시간
 *
 * @module utils/imageProcessor
 */

// ─── Types ──────────────────────────────────────────────────

/** 이미지 처리 옵션 */
export interface ImageProcessingOptions {
    /** 리사이징 최대 너비 (px). 기본 1920 */
    maxWidth: number;
    /** 리사이징 최대 높이 (px). 기본 1920 */
    maxHeight: number;
    /** JPEG 압축 품질 (0-1). 기본 0.85 */
    quality: number;
    /** 출력 포맷 MIME. 기본 'image/jpeg' */
    format: 'image/jpeg' | 'image/png' | 'image/webp';
}

/** 처리 파이프라인의 각 단계 */
export type ProcessingStage =
    | 'loading'       // 파일 로딩
    | 'resizing'      // Canvas 리사이징
    | 'compressing'   // JPEG 압축
    | 'encoding'      // Base64 인코딩
    | 'complete';     // 처리 완료

/** 이미지 처리 결과 (메트릭 포함) */
export interface ImageProcessingResult {
    /** 처리 완료된 Blob (업로드용) */
    blob: Blob;
    /** 처리 완료된 File 객체 */
    file: File;
    /** Base64 Data URL (즉시 프리뷰용) */
    base64Preview: string;
    /** 원본 파일 크기 (bytes) */
    originalSize: number;
    /** 처리 후 파일 크기 (bytes) */
    processedSize: number;
    /** 압축률 (%) – 예: 78.5 → 원본 대비 78.5% 감소 */
    compressionRatio: number;
    /** 원본 해상도 */
    originalDimensions: { width: number; height: number };
    /** 처리 후 해상도 */
    processedDimensions: { width: number; height: number };
    /** 전체 처리 소요 시간 (ms) */
    processingTimeMs: number;
    /** 리사이징 필요 여부 */
    wasResized: boolean;
}

// ─── Default Options ────────────────────────────────────────

const DEFAULT_OPTIONS: ImageProcessingOptions = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    format: 'image/jpeg',
};

// ─── Main Pipeline ──────────────────────────────────────────

/**
 * 모바일 카메라 촬영 이미지를 업로드에 최적화합니다.
 *
 * 처리 흐름:
 * ```
 * File → loadImage → calculateDimensions → resizeWithCanvas
 *      → canvasToBlob(JPEG 85%) → Base64 인코딩 → 메트릭 수집
 * ```
 *
 * @param file       촬영된 원본 File (HEIC/PNG/JPEG 등)
 * @param options    리사이징·압축 옵션 (선택)
 * @param onProgress 단계별 콜백 (UI 진행률 표시용)
 * @returns          처리 결과 + 메트릭
 */
export async function processImageForUpload(
    file: File,
    options: Partial<ImageProcessingOptions> = {},
    onProgress?: (stage: ProcessingStage) => void,
): Promise<ImageProcessingResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = performance.now();
    const originalSize = file.size;

    // ── 1. 이미지 로드 ──────────────────────────
    onProgress?.('loading');
    const img = await loadImage(file);
    const originalDimensions = { width: img.width, height: img.height };

    // ── 2. 최적 해상도 계산 & 리사이즈 ──────────
    onProgress?.('resizing');
    const { width: targetW, height: targetH, needsResize } =
        calculateOptimalDimensions(img.width, img.height, opts.maxWidth, opts.maxHeight);

    const canvas = resizeWithCanvas(img, targetW, targetH);

    // ── 3. JPEG 압축 ────────────────────────────
    onProgress?.('compressing');
    const blob = await canvasToBlob(canvas, opts.format, opts.quality);

    // ── 4. Base64 인코딩 (즉시 프리뷰) ──────────
    onProgress?.('encoding');
    const base64Preview = await blobToBase64(blob);

    // ── 5. 메트릭 계산 ─────────────────────────
    const processingTimeMs = Math.round(performance.now() - startTime);
    const processedSize = blob.size;
    const compressionRatio =
        originalSize > 0
            ? Math.round(((originalSize - processedSize) / originalSize) * 1000) / 10
            : 0;

    // Blob → File 변환 (FormData 전송용)
    const processedFile = new File(
        [blob],
        file.name.replace(/\.[^.]+$/, '.jpg'),
        { type: opts.format, lastModified: Date.now() },
    );

    onProgress?.('complete');

    return {
        blob,
        file: processedFile,
        base64Preview,
        originalSize,
        processedSize,
        compressionRatio,
        originalDimensions,
        processedDimensions: { width: targetW, height: targetH },
        processingTimeMs,
        wasResized: needsResize,
    };
}

// ─── Internal Helpers ───────────────────────────────────────

/**
 * File → HTMLImageElement 로드
 * CSS `image-orientation: from-image` 가 적용되어
 * 모바일 카메라 EXIF 회전이 자동 보정됩니다.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
        img.src = URL.createObjectURL(file);
    });
}

/**
 * 종횡비를 유지하면서 최대 크기에 맞는 최적 해상도를 계산합니다.
 *
 * @example
 * // 4032×3024 사진 → 1920×1440 (장축 기준 축소)
 * calculateOptimalDimensions(4032, 3024, 1920, 1920)
 */
function calculateOptimalDimensions(
    srcWidth: number,
    srcHeight: number,
    maxWidth: number,
    maxHeight: number,
): { width: number; height: number; needsResize: boolean } {
    // 이미 제한 이내인 경우 리사이즈 불필요
    if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
        return { width: srcWidth, height: srcHeight, needsResize: false };
    }

    const aspectRatio = srcWidth / srcHeight;

    let width = maxWidth;
    let height = Math.round(width / aspectRatio);

    // 높이가 아직 초과하면 높이 기준으로 재계산
    if (height > maxHeight) {
        height = maxHeight;
        width = Math.round(height * aspectRatio);
    }

    return { width, height, needsResize: true };
}

/**
 * Canvas 2D API를 사용하여 이미지를 지정 해상도로 리사이징합니다.
 * `imageSmoothingQuality: 'high'` 로 고품질 보간을 적용합니다.
 */
function resizeWithCanvas(
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number,
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D 컨텍스트를 얻을 수 없습니다.');

    // 고품질 보간 적용 (Lanczos-like)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // 로드에 사용한 Object URL 해제 (메모리 누수 방지)
    URL.revokeObjectURL(img.src);

    return canvas;
}

/**
 * Canvas → Blob 변환 (JPEG 압축 수행)
 * `canvas.toBlob()` 의 Promise 래퍼
 */
function canvasToBlob(
    canvas: HTMLCanvasElement,
    format: string,
    quality: number,
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Canvas → Blob 변환에 실패했습니다.'));
                    return;
                }
                resolve(blob);
            },
            format,
            quality,
        );
    });
}

/**
 * Blob → Base64 Data URL 변환
 * FileReader.readAsDataURL 의 Promise 래퍼
 */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Base64 인코딩에 실패했습니다.'));
        reader.readAsDataURL(blob);
    });
}

// ─── Formatting Utilities ───────────────────────────────────

/**
 * 바이트 수를 사람이 읽기 쉬운 형태로 변환합니다.
 * @example formatFileSize(1536000) → "1.5 MB"
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}
