import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, FileText } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect?: (file: File) => void;
  accept?: string;
  label?: string;
  labelBn?: string;
}

export default function UploadZone({
  onFileSelect,
  accept = 'image/*',
  label = 'Drop your screenshot or image here',
  labelBn = 'আপনার স্ক্রিনশট বা ছবি এখানে ড্রপ করুন',
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    onFileSelect?.(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setPreview(null);
    setFileName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  if (preview) {
    return (
      <div className="relative card p-4">
        <button
          onClick={clearFile}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[var(--color-neutral-100)] flex items-center justify-center hover:bg-[var(--color-neutral-200)] transition-colors cursor-pointer z-10"
        >
          <X size={14} />
        </button>
        <div className="flex items-start gap-4">
          <img
            src={preview}
            alt="Preview"
            className="w-24 h-24 object-cover rounded-lg border border-[var(--color-neutral-200)]"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-[var(--color-neutral-400)]" />
              <span className="text-sm font-medium text-[var(--color-neutral-700)] truncate">
                {fileName}
              </span>
            </div>
            <p className="text-xs text-[var(--color-verified)]">✓ Ready for analysis</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center">
          {isDragOver ? (
            <ImageIcon size={24} className="text-[var(--color-accent)]" />
          ) : (
            <Upload size={24} className="text-[var(--color-accent)]" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-neutral-700)]">{label}</p>
          <p className="text-sm font-bengali text-[var(--color-neutral-400)] mt-0.5">{labelBn}</p>
        </div>
        <p className="text-xs text-[var(--color-neutral-400)]">
          JPEG, PNG, WebP · Max 10MB
        </p>
      </div>
    </div>
  );
}
