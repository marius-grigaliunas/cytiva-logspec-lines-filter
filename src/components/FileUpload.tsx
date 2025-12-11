import { useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label?: string;
}

export function FileUpload({ onFileSelect, accept = '.xlsx,.xls', label = 'Upload Excel File' }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      onFileSelect(file);
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

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
        transition-all duration-300 ease-in-out
        ${isDragging 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-[1.02] shadow-lg' 
          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-3">
        <div className={`text-5xl mb-2 transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}>
          📁
        </div>
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          {label}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isDragging ? (
            <span className="text-blue-600 dark:text-blue-400 font-medium">Drop file here</span>
          ) : (
            'Click to browse or drag and drop'
          )}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {accept}
        </p>
      </div>
    </div>
  );
}

