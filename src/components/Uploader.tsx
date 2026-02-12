import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

export function Uploader({ onFile }: { onFile: (f: File) => void }) {
  const onDrop = useCallback(
    (files: File[]) => {
      if (files[0]) onFile(files[0]);
    },
    [onFile]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
  });

  return (
    <div
      {...getRootProps()}
      style={{
        border: "1px dashed #3b3f46",
        padding: 16,
        borderRadius: 12,
        textAlign: "center",
      }}
    >
      <input {...getInputProps()} />
      {isDragActive
        ? "Drop the image here..."
        : "Drag & drop an image, or click to select"}
    </div>
  );
}
