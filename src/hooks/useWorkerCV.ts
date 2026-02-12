import { useEffect, useRef, useState } from "react";
import type { CVRequest, CVResponse } from "../cv/types";

export function useWorkerCV() {
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const w = new Worker(new URL("../cv/worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = w;
    w.onmessage = (e: MessageEvent<CVResponse>) => {
      if (e.data.type === "READY") setReady(true);
      if (e.data.type === "RESULT") setResult(e.data.payload);
    };
    w.postMessage({ type: "INIT" } satisfies CVRequest);
    return () => {
      w.terminate();
    };
  }, []);

  async function analyze(file: File) {
    const bmp = await createImageBitmap(file);
    workerRef.current?.postMessage(
      { type: "ANALYZE", payload: { bitmap: bmp } } as CVRequest,
      [bmp]
    );
  }

  return { ready, analyze, result };
}
