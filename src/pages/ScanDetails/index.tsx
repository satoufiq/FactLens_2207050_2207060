import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft, Layers, SearchCheck, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

// Import Mock Data
import { scanDetailsDataMap, type ScanDetailsData } from '../../data/scanDetailsMockData';

// Import Subcomponents
import { Breadcrumb } from './components/Breadcrumb';
import { ScanDetailsHeader } from './components/ScanDetailsHeader';
import { ResultSummaryHero } from './components/ResultSummaryHero';
import { SubmittedContent } from './components/SubmittedContent';
import { OriginalInputPreview } from './components/OriginalInputPreview';
import { InputMetadata } from './components/InputMetadata';
import { AnalysisSummary } from './components/AnalysisSummary';
import { ProcessingTimeline } from './components/ProcessingTimeline';
import { EvidenceSection } from './components/EvidenceSection';
import { RiskIndicators } from './components/RiskIndicators';
import { URLAnalysis } from './components/URLAnalysis';
import { ImageSignals } from './components/ImageSignals';
import { ExplanationCard } from './components/ExplanationCard';
import { AnalysisDetails } from './components/AnalysisDetails';
import { ScanInformation } from './components/ScanInformation';
import { TransparencyNotice } from './components/TransparencyNotice';
import { ResultActions } from './components/ResultActions';
import { ShareModal } from './components/ShareModal';
import { DeleteConfirmation } from './components/DeleteConfirmation';
import { SaveToast } from './components/SaveToast';

export const ScanDetails: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isBn = lang === 'bn';
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [currentId, setCurrentId] = useState<string>(id || 'FL-RUMOR-0024');
  const [scanData, setScanData] = useState<ScanDetailsData | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  // Modals & Toasts
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load scan data simulate loading
  useEffect(() => {
    setIsLoading(true);
    const targetId = id || currentId;
    const matched = scanDetailsDataMap[targetId] || scanDetailsDataMap['FL-RUMOR-0024'];
    
    const timer = setTimeout(() => {
      setScanData(matched);
      setCurrentId(matched.id);
      setIsLoading(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [id, currentId]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleSave = () => {
    setIsSaved(!isSaved);
    triggerToast(
      !isSaved
        ? (isBn ? '✓ স্ক্যান ফলাফল সংরক্ষিত করা হয়েছে' : '✓ Scan saved successfully')
        : (isBn ? 'স্ক্যান সংরক্ষণ তালিকা থেকে সরানো হয়েছে' : 'Scan removed from saved items')
    );
  };

  const handleCopyScanId = () => {
    triggerToast(isBn ? 'স্ক্যান আইডি অনুলিপি করা হয়েছে' : 'Scan ID copied');
  };

  const handleCopyShareLink = () => {
    triggerToast(isBn ? 'রিপোর্ট লিঙ্ক ক্লিপবোর্ডে অনুলিপি করা হয়েছে' : 'Scan report link copied');
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    setIsDeleted(true);
    triggerToast(isBn ? 'স্ক্যান রেকর্ড ডিলিট করা হয়েছে' : 'Scan record deleted');
  };

  const handleCheckAgain = () => {
    if (!scanData) return;
    if (scanData.type === 'RUMOR') navigate('/app/rumor');
    else if (scanData.type === 'SCAM') navigate('/app/scam');
    else navigate('/app/image');
  };

  // Error / Deleted State
  if (isDeleted) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
          <HelpCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isBn ? 'স্ক্যান রেকর্ডটি উপলব্ধ নেই' : 'Scan record unavailable'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {isBn ? 'এই স্ক্যান রেকর্ডটি মুছে ফেলা হয়েছে বা সিস্টেম থেকে সরানো হয়েছে।' : 'This scan record has been deleted or is no longer available in the case file system.'}
          </p>
        </div>
        <Link
          to="/app/history"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-md hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isBn ? 'স্ক্যান হিস্ট্রিতে ফিরে যান' : 'Back to Scan History'}</span>
        </Link>
      </div>
    );
  }

  // Skeleton Loading State (Section 31)
  if (isLoading || !scanData) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-6 space-y-8 animate-pulse">
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="space-y-3">
          <div className="h-8 w-72 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative pb-28 ${isLight ? 'bg-[#F7F9FC]' : 'bg-slate-950 text-white'}`}>
      {/* Background Soft Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-400/5 dark:bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-10 w-[400px] h-[400px] bg-indigo-500/5 dark:bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-8 relative z-10">

        {/* Demo Scan Type Switcher Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-500 dark:text-slate-400">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>{isBn ? 'কেস ফাইল ভিউ সুইচ করুন:' : 'CASE FILE SAMPLE SWITCHER:'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCurrentId('FL-RUMOR-0024')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                currentId === 'FL-RUMOR-0024'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <SearchCheck className="w-3.5 h-3.5" />
              <span>FL-RUMOR-0024 (Rumor)</span>
            </button>
            <button
              onClick={() => setCurrentId('FL-SCAM-0018')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                currentId === 'FL-SCAM-0018'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>FL-SCAM-0018 (Scam)</span>
            </button>
            <button
              onClick={() => setCurrentId('FL-IMAGE-0012')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                currentId === 'FL-IMAGE-0012'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>FL-IMAGE-0012 (Image)</span>
            </button>
          </div>
        </div>

        {/* 1. Breadcrumb */}
        <Breadcrumb scanId={scanData.id} isBn={isBn} />

        {/* 2. Page Header */}
        <ScanDetailsHeader
          scanId={scanData.id}
          title={scanData.title}
          titleBn={scanData.titleBn}
          type={scanData.type}
          status={scanData.status}
          isSaved={isSaved}
          onToggleSave={handleToggleSave}
          onOpenShare={() => setShowShareModal(true)}
          onCheckAgain={handleCheckAgain}
          onDeleteScan={() => setShowDeleteModal(true)}
          isBn={isBn}
        />

        {/* 3. Result Summary Hero */}
        <ResultSummaryHero
          result={scanData.result}
          scanType={scanData.type}
          explanation={scanData.explanation}
          explanationBn={scanData.explanationBn}
          statistics={scanData.statistics}
          isBn={isBn}
        />

        {/* 4. Two-Column Section: Submitted Content / Analysis Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <SubmittedContent
              claim={scanData.claim}
              claimBn={scanData.claimBn}
              inputType={scanData.inputType}
              language={scanData.language}
              ocrConfirmed={scanData.ocrConfirmed}
              isBn={isBn}
            />

            {scanData.type === 'RUMOR' && (
              <OriginalInputPreview
                title={scanData.title}
                isBn={isBn}
              />
            )}

            <InputMetadata
              inputType={scanData.inputType}
              language={scanData.language}
              ocrStatus={scanData.ocrConfirmed ? 'Confirmed' : 'N/A'}
              submittedAt={scanData.submittedAt}
              scanId={scanData.id}
              onCopyScanId={handleCopyScanId}
              isBn={isBn}
            />
          </div>

          <div className="space-y-6">
            <AnalysisSummary
              scanType={scanData.type}
              inputType={scanData.inputType}
              language={scanData.language}
              status={scanData.status}
              result={scanData.result}
              isBn={isBn}
            />

            <ProcessingTimeline
              steps={scanData.processingSteps}
              isBn={isBn}
            />
          </div>
        </div>

        {/* 5. Type-Aware Evidence / Risk / Signal Section */}
        {scanData.type === 'RUMOR' && scanData.evidence && (
          <EvidenceSection
            evidenceList={scanData.evidence}
            result={scanData.result}
            isBn={isBn}
          />
        )}

        {scanData.type === 'SCAM' && (
          <div className="space-y-6">
            {scanData.riskIndicators && (
              <RiskIndicators indicators={scanData.riskIndicators} isBn={isBn} />
            )}
            <URLAnalysis urlData={scanData.urlAnalysis} isBn={isBn} />
          </div>
        )}

        {scanData.type === 'IMAGE' && (
          <ImageSignals
            visualSignals={scanData.visualSignals}
            technicalSignals={scanData.technicalSignals}
            metadata={scanData.imageMetadata}
            isBn={isBn}
          />
        )}

        {/* 6. Explanation Card */}
        <ExplanationCard
          explanation={scanData.explanation}
          explanationBn={scanData.explanationBn}
          result={scanData.result}
          isBn={isBn}
        />

        {/* 7. Analysis Details Accordion */}
        <AnalysisDetails
          steps={scanData.analysisDetailsSteps}
          isBn={isBn}
        />

        {/* 8. Scan Technical Information */}
        <ScanInformation
          scanId={scanData.id}
          scanType={scanData.type}
          inputType={scanData.inputType}
          language={scanData.language}
          status={scanData.status}
          startedAt={scanData.submittedAt}
          completedAt={scanData.completedAt}
          onCopyScanId={handleCopyScanId}
          isBn={isBn}
        />

        {/* 9. Transparency & Limitations */}
        <TransparencyNotice isBn={isBn} />

        {/* 10. Bottom Action Area & Mobile Sticky Bar */}
        <ResultActions
          isSaved={isSaved}
          onToggleSave={handleToggleSave}
          onOpenShare={() => setShowShareModal(true)}
          onCheckAgain={handleCheckAgain}
          isBn={isBn}
        />

        {/* Modals & Toasts */}
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          scanId={scanData.id}
          onCopyLink={handleCopyShareLink}
          isBn={isBn}
        />

        <DeleteConfirmation
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirmDelete={handleConfirmDelete}
          scanId={scanData.id}
          isBn={isBn}
        />

        <SaveToast message={toastMessage} />
      </div>
    </div>
  );
};

export default ScanDetails;
