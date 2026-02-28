/**
 * On-device attention tracker using MediaPipe Face Mesh.
 *
 * Extracts gaze direction, head pose, and blink rate from facial landmarks,
 * then runs a lightweight classifier to determine focused vs. distracted state.
 * All processing happens in-browser — no video data ever leaves the device.
 */

export interface AttentionFrame {
  attentionScore: number; // 0.0 - 1.0
  isFocused: boolean;
  gazeX: number;
  gazeY: number;
  headPitch: number;
  headYaw: number;
  blinkRate: number;
  timestamp: number;
}

type AttentionCallback = (frame: AttentionFrame) => void;

const EAR_THRESHOLD = 0.21;
const GAZE_THRESHOLD = 0.35;
const HEAD_YAW_THRESHOLD = 25;
const HEAD_PITCH_THRESHOLD = 20;
const SMOOTHING_WINDOW = 5;

// Key landmark indices for Face Mesh (468 landmarks)
const LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
const LEFT_IRIS = [468, 469, 470, 471, 472];
const RIGHT_IRIS = [473, 474, 475, 476, 477];
const NOSE_TIP = 1;
const CHIN = 152;
const LEFT_EAR = 234;
const RIGHT_EAR = 454;
const FOREHEAD = 10;

export class AttentionTracker {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private faceMesh: any = null;
  private camera: any = null;
  private callback: AttentionCallback | null = null;
  private isRunning = false;
  private recentScores: number[] = [];
  private blinkTimestamps: number[] = [];
  private frameCount = 0;

  async initialize(videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement): Promise<void> {
    this.videoElement = videoEl;
    this.canvasElement = canvasEl;

    const { FaceMesh } = await import("@mediapipe/face_mesh");
    const { Camera } = await import("@mediapipe/camera_utils");

    this.faceMesh = new FaceMesh({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.faceMesh.onResults((results: any) => this.processResults(results));

    this.camera = new Camera(videoEl, {
      onFrame: async () => {
        if (this.isRunning && this.faceMesh) {
          await this.faceMesh.send({ image: videoEl });
        }
      },
      width: 640,
      height: 480,
    });
  }

  start(callback: AttentionCallback): void {
    this.callback = callback;
    this.isRunning = true;
    this.recentScores = [];
    this.blinkTimestamps = [];
    this.frameCount = 0;
    this.camera?.start();
  }

  stop(): void {
    this.isRunning = false;
    this.camera?.stop();
    this.callback = null;
  }

  destroy(): void {
    this.stop();
    this.faceMesh?.close();
    this.faceMesh = null;
    this.camera = null;
  }

  private processResults(results: any): void {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      this.callback?.({
        attentionScore: 0,
        isFocused: false,
        gazeX: 0,
        gazeY: 0,
        headPitch: 0,
        headYaw: 0,
        blinkRate: 0,
        timestamp: Date.now(),
      });
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    this.frameCount++;

    const leftEAR = this.calculateEAR(landmarks, LEFT_EYE_INDICES);
    const rightEAR = this.calculateEAR(landmarks, RIGHT_EYE_INDICES);
    const avgEAR = (leftEAR + rightEAR) / 2;

    const isBlink = avgEAR < EAR_THRESHOLD;
    if (isBlink) {
      this.blinkTimestamps.push(Date.now());
      const oneMinuteAgo = Date.now() - 60000;
      this.blinkTimestamps = this.blinkTimestamps.filter((t) => t > oneMinuteAgo);
    }

    const { gazeX, gazeY } = this.calculateGaze(landmarks);
    const { pitch, yaw } = this.calculateHeadPose(landmarks);

    const gazeScore = 1 - Math.min(Math.sqrt(gazeX * gazeX + gazeY * gazeY) / GAZE_THRESHOLD, 1);
    const headScore = 1 - Math.min(
      (Math.abs(yaw) / HEAD_YAW_THRESHOLD + Math.abs(pitch) / HEAD_PITCH_THRESHOLD) / 2,
      1
    );

    const blinkRate = this.blinkTimestamps.length;
    const blinkScore = blinkRate >= 8 && blinkRate <= 25 ? 1 : 0.5;

    const rawScore = gazeScore * 0.45 + headScore * 0.40 + blinkScore * 0.15;

    this.recentScores.push(rawScore);
    if (this.recentScores.length > SMOOTHING_WINDOW) {
      this.recentScores.shift();
    }
    const smoothedScore = this.recentScores.reduce((a, b) => a + b, 0) / this.recentScores.length;
    const clampedScore = Math.max(0, Math.min(1, smoothedScore));

    this.callback?.({
      attentionScore: clampedScore,
      isFocused: clampedScore >= 0.5,
      gazeX,
      gazeY,
      headPitch: pitch,
      headYaw: yaw,
      blinkRate,
      timestamp: Date.now(),
    });
  }

  private calculateEAR(landmarks: any[], indices: number[]): number {
    const p = indices.map((i) => landmarks[i]);
    const vertical1 = this.distance(p[1], p[5]);
    const vertical2 = this.distance(p[2], p[4]);
    const horizontal = this.distance(p[0], p[3]);
    return (vertical1 + vertical2) / (2 * horizontal);
  }

  private calculateGaze(landmarks: any[]): { gazeX: number; gazeY: number } {
    if (landmarks.length <= Math.max(...LEFT_IRIS, ...RIGHT_IRIS)) {
      return { gazeX: 0, gazeY: 0 };
    }

    const leftIrisCenter = this.centroid(LEFT_IRIS.map((i) => landmarks[i]));
    const rightIrisCenter = this.centroid(RIGHT_IRIS.map((i) => landmarks[i]));

    const leftEyeCenter = this.centroid(LEFT_EYE_INDICES.map((i) => landmarks[i]));
    const rightEyeCenter = this.centroid(RIGHT_EYE_INDICES.map((i) => landmarks[i]));

    const leftOffset = {
      x: leftIrisCenter.x - leftEyeCenter.x,
      y: leftIrisCenter.y - leftEyeCenter.y,
    };
    const rightOffset = {
      x: rightIrisCenter.x - rightEyeCenter.x,
      y: rightIrisCenter.y - rightEyeCenter.y,
    };

    return {
      gazeX: (leftOffset.x + rightOffset.x) / 2,
      gazeY: (leftOffset.y + rightOffset.y) / 2,
    };
  }

  private calculateHeadPose(landmarks: any[]): { pitch: number; yaw: number } {
    const nose = landmarks[NOSE_TIP];
    const chin = landmarks[CHIN];
    const leftEar = landmarks[LEFT_EAR];
    const rightEar = landmarks[RIGHT_EAR];
    const forehead = landmarks[FOREHEAD];

    const faceWidth = this.distance(leftEar, rightEar);
    const leftDist = this.distance(nose, leftEar);
    const rightDist = this.distance(nose, rightEar);
    const yaw = ((rightDist - leftDist) / faceWidth) * 90;

    const faceHeight = this.distance(forehead, chin);
    const noseToForehead = this.distance(nose, forehead);
    const noseToChin = this.distance(nose, chin);
    const pitch = ((noseToForehead - noseToChin) / faceHeight) * 90;

    return { pitch, yaw };
  }

  private distance(a: any, b: any): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private centroid(points: any[]): { x: number; y: number; z: number } {
    const sum = points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + (p.z || 0) }),
      { x: 0, y: 0, z: 0 }
    );
    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
      z: sum.z / points.length,
    };
  }
}

let trackerInstance: AttentionTracker | null = null;

export function getAttentionTracker(): AttentionTracker {
  if (!trackerInstance) {
    trackerInstance = new AttentionTracker();
  }
  return trackerInstance;
}
