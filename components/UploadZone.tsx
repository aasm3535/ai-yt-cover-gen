import React, { useRef, useState } from "react";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

const UploadZone: React.FC<UploadZoneProps> = ({
  onFileSelect,
  selectedFile,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Пожалуйста, загрузите файл изображения.");
      return;
    }

    onFileSelect(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null as any);
    setPreviewUrl(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="w-full space-y-2">
      <label className="text-xs font-medium text-zinc-300">Исходное фото</label>
      <div
        onClick={() => !previewUrl && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center w-full rounded-md border border-dashed transition-colors
          ${
            previewUrl
              ? "border-[#383838] bg-[#1e1e1e] p-1"
              : "h-48 cursor-pointer border-[#383838] bg-[#1e1e1e] hover:bg-[#2d2d2d]"
          }
          ${isDragging && !previewUrl ? "border-zinc-500 bg-[#2d2d2d]" : ""}
        `}
      >
        <input
          type="file"
          ref={inputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />

        {previewUrl ? (
          <div className="relative w-full aspect-video rounded-sm overflow-hidden bg-[#1e1e1e] group">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover transition-all group-hover:opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 bg-zinc-100 text-zinc-900 hover:bg-zinc-200/90 h-9 px-4 py-2 mr-2 shadow-sm"
              >
                Изменить
              </button>
              <button
                type="button"
                onClick={clearFile}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 border border-[#383838] bg-[#1e1e1e] hover:bg-[#2d2d2d] text-zinc-50 h-9 w-9 shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
                <span className="sr-only">Удалить</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-zinc-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-3 h-8 w-8 text-zinc-500"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <p className="mb-1 text-sm">
              <span className="font-semibold text-zinc-200">
                Нажмите для загрузки
              </span>{" "}
              или перетащите файл
            </p>
            <p className="text-xs text-zinc-500">JPG, PNG (Максимум 5МБ)</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadZone;
