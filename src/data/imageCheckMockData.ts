export interface ImageCheckData {
  fileName: string;
  fileType: string;
  fileSize: string;
  dimensions: string;
  colorMode: string;
  status: 'IDLE' | 'CHECKING' | 'READY' | 'INVALID_FORMAT' | 'OVERSIZED';
  metadata: {
    camera: string;
    date: string;
    location: string;
    software: string;
  };
  supportedFormats: string[];
}

export const imageCheckMockData: ImageCheckData = {
  fileName: "event_poster_example.webp",
  fileType: "WebP",
  fileSize: "1.7 MB",
  dimensions: "1920 × 1080",
  colorMode: "RGB",
  status: "READY",
  metadata: {
    camera: "Available",
    date: "Available",
    location: "Not available",
    software: "Available (Adobe Photoshop 2025)"
  },
  supportedFormats: ["JPEG", "PNG", "WebP"]
};

export const imageCheckEmptyState = {
  title: "Upload an image to begin",
  description:
    "FactLens can inspect supported images for visual, technical, metadata, and AI-generation signals."
};
