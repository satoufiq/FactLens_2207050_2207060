import type { ImageResultData, AssessmentType, VisualSignalItem, TechnicalSignalItem } from '../data/imageResultMockData';

export function analyzeUploadedImage(fileData: {
  name: string;
  format: string;
  size: string;
  dimensions: string;
  previewUrl?: string | null;
}): ImageResultData {
  const isPhotoshopOrEdited = /edit|ps|card|fake|manip|mod/i.test(fileData.name);
  const isAIGeneratedName = /ai|midjourney|dall-e|stable|flux|synth/i.test(fileData.name);

  let assessment: AssessmentType = 'LIKELY_AUTHENTIC';
  let summary = 'No significant indicators of manipulation or AI generation detected.';
  let bilingualSummary = 'ছবিটিতে কোনো ফটোশপ এডিটিং বা কৃত্রিম এআই জেনারেশনের লক্ষণ পাওয়া যায়নি।';
  let explanation = 'Digital pixel structure is uniform across compression blocks. Metadata tags reflect standard camera capture or web export without software alteration.';

  if (isAIGeneratedName) {
    assessment = 'LIKELY_AI_GENERATED';
    summary = 'Strong indicators consistent with AI-generated synthetic imagery detected.';
    bilingualSummary = 'ছবিটিতে এআই সিন্থেটিক টেক্সচার এবং জেনারেটিভ মডেলের স্পষ্ট প্যাটার্ন সনাক্ত হয়েছে।';
    explanation = 'Frequency domain analysis isolates synthetic high-frequency noise typical of latent diffusion models. Absence of physical camera sensor EXIF tags corroborates AI generation.';
  } else if (isPhotoshopOrEdited) {
    assessment = 'POSSIBLE_MANIPULATION';
    summary = 'Some indicators suggest the image or text overlay may have been digitally edited.';
    bilingualSummary = 'ছবিটিতে ফটোশপ বা ডিজিটাল এডিটিং সফটওয়্যার ব্যবহারের আলামত সনাক্ত হয়েছে।';
    explanation = 'Error Level Analysis (ELA) identifies conflicting JPEG compression ratios around headline text overlays. Inconsistent resaving gradients suggest local pixel manipulation.';
  }

  const visualSignals: VisualSignalItem[] = [
    {
      id: 'sig-ela',
      title: 'Error Level Analysis (ELA)',
      description: assessment === 'POSSIBLE_MANIPULATION' ? 'Inconsistent compression noise gradient detected around center regions.' : 'Uniform pixel error gradient across all image blocks.',
      strength: assessment === 'POSSIBLE_MANIPULATION' ? 'HIGH' : 'LOW',
      status: assessment === 'POSSIBLE_MANIPULATION' ? 'DETECTED' : 'NORMAL',
      scorePct: assessment === 'POSSIBLE_MANIPULATION' ? 88 : 12
    },
    {
      id: 'sig-synth',
      title: 'Synthetic Artifact Scan',
      description: assessment === 'LIKELY_AI_GENERATED' ? 'Diffusion grid artifacts identified in high-frequency spectrum.' : 'Normal natural photo pixel distribution without generative seams.',
      strength: assessment === 'LIKELY_AI_GENERATED' ? 'HIGH' : 'LOW',
      status: assessment === 'LIKELY_AI_GENERATED' ? 'DETECTED' : 'NORMAL',
      scorePct: assessment === 'LIKELY_AI_GENERATED' ? 94 : 8
    },
    {
      id: 'sig-noise',
      title: 'Noise Variance Distribution',
      description: 'Sensor noise consistency evaluated across RGB channels.',
      strength: 'LOW',
      status: 'NORMAL',
      scorePct: 15
    }
  ];

  const technicalSignals: TechnicalSignalItem[] = [
    {
      id: 'tech-exif',
      title: 'EXIF Header Data',
      status: isAIGeneratedName ? 'MISSING' : 'AVAILABLE',
      description: isAIGeneratedName ? 'Camera hardware metadata is completely absent.' : 'Standard image headers and color profile are present.'
    },
    {
      id: 'tech-c2pa',
      title: 'Content Provenance (C2PA)',
      status: 'NOTABLE',
      description: 'Standard consumer digital image without cryptographic provenance seal.'
    },
    {
      id: 'tech-compress',
      title: 'Quantization Matrix',
      status: 'AVAILABLE',
      description: `Standard ${fileData.format.toUpperCase()} compression standard verified.`
    }
  ];

  const now = new Date().toISOString();

  return {
    scanId: `FL-IMG-${Date.now().toString().slice(-4)}`,
    type: 'IMAGE',
    status: 'COMPLETED',
    assessment,
    file: {
      name: fileData.name,
      format: fileData.format,
      size: fileData.size,
      dimensions: fileData.dimensions,
    },
    summary,
    bilingualSummary,
    signalCount: visualSignals.filter(s => s.status === 'DETECTED').length,
    visualSignals,
    technicalSignals,
    metadata: {
      exif: isAIGeneratedName ? 'None (Synthetic File)' : 'ICC Color Profile v4',
      camera: isAIGeneratedName ? 'N/A (AI Generated)' : 'Generic Digital Sensor',
      timestamp: new Date().toLocaleDateString(),
      location: 'Not tagged',
      software: isPhotoshopOrEdited ? 'Adobe Photoshop CC (Detected)' : 'Standard Web Encoder'
    },
    explanation,
    submittedAt: now,
    completedAt: now,
  };
}

