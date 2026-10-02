export interface ProcessingStepItem {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'processing' | 'pending';
}

export interface ImageProcessingData {
  scanId: string;
  type: string;
  status: string;
  file: {
    name: string;
    format: string;
    size: string;
    dimensions: string;
  };
  steps: ProcessingStepItem[];
  metadata: {
    camera: string;
    timestamp: string;
    location: string;
    software: string;
  };
}

export const imageProcessingData: ImageProcessingData = {
  scanId: "FL-IMAGE-0012",
  type: "IMAGE",
  status: "PROCESSING",
  file: {
    name: "event_poster_example.webp",
    format: "WebP",
    size: "1.7 MB",
    dimensions: "1920 × 1080"
  },
  steps: [
    {
      id: 1,
      title: "Image received",
      description: "The submitted image has been received successfully.",
      status: "completed"
    },
    {
      id: 2,
      title: "Image validation",
      description: "Checking the image format and basic technical properties.",
      status: "completed"
    },
    {
      id: 3,
      title: "Metadata inspection",
      description: "Reviewing available metadata and technical information.",
      status: "processing"
    },
    {
      id: 4,
      title: "Image analysis",
      description: "Examining visual characteristics and image patterns.",
      status: "pending"
    },
    {
      id: 5,
      title: "Technical signal analysis",
      description: "Combining available technical inspection signals.",
      status: "pending"
    },
    {
      id: 6,
      title: "Preparing assessment",
      description: "Preparing the final image assessment and explanation.",
      status: "pending"
    }
  ],
  metadata: {
    camera: "Available",
    timestamp: "Available",
    location: "Not available",
    software: "Available"
  }
};
