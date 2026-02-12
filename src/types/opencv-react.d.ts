declare module "opencv-react" {
  import type React from "react";

  interface OpenCvProviderProps {
    openCvPath: string;
    children: React.ReactNode;
    /** Called when cv is ready */
    onLoad?: (cv: any) => void;
    /** Called when loading fails */
    onError?: (err: Error) => void;
  }

  export function OpenCvProvider(props: OpenCvProviderProps): JSX.Element;

  export function useOpenCv(): {
    loaded: boolean;
    cv: any | null;
    error?: Error;
  };
}
