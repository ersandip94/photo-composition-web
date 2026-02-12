import { OpenCvProvider } from "opencv-react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <OpenCvProvider openCvPath="/opencv/opencv.js">
    <App />
  </OpenCvProvider>
);
