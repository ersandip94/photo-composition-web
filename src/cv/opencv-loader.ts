// URL can be switched to a locally hosted copy for reliability.
export const OPENCV_CDN = "https://docs.opencv.org/4.x/opencv.js";

export function loadOpenCVInWorker(
  selfCtx: DedicatedWorkerGlobalScope
): Promise<any> {
  return new Promise((resolve) => {
    (selfCtx as any).Module = {}; // must exist before loading
    selfCtx.importScripts(OPENCV_CDN);
    const cv = (selfCtx as any).cv;
    if (cv && cv["onRuntimeInitialized"]) {
      cv["onRuntimeInitialized"] = () => resolve(cv);
    } else {
      // Fallback poll
      const iv = setInterval(() => {
        const cv2 = (selfCtx as any).cv;
        if (cv2 && cv2.imread) {
          clearInterval(iv);
          resolve(cv2);
        }
      }, 50);
    }
  });
}
