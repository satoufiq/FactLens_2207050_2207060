import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

// Import Mock Data
import {
  savedEvidenceMockData,
  initialCollectionsData,
  type SavedEvidenceItem,
  type CollectionItem
} from '../../data/savedEvidenceMockData';

// Import Subcomponents
import { Breadcrumb } from './components/Breadcrumb';
import { SavedEvidenceHeader } from './components/SavedEvidenceHeader';
import { EvidenceStats } from './components/EvidenceStats';
import { EvidenceToolbar } from './components/EvidenceToolbar';
import { FilterPanel, type FilterState } from './components/FilterPanel';
import { ActiveFilterChips } from './components/ActiveFilterChips';
import { CollectionsSection } from './components/CollectionsSection';
import { EvidenceGrid } from './components/EvidenceGrid';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { AddToCollectionModal } from './components/AddToCollectionModal';
import { ShareEvidenceModal } from './components/ShareEvidenceModal';
import { NewCollectionModal } from './components/NewCollectionModal';
import { EmptyEvidence } from './components/EmptyEvidence';
import { NoSearchResults } from './components/NoSearchResults';
import { EvidenceSkeleton } from './components/EvidenceSkeleton';
import { Pagination } from './components/Pagination';
import { SaveToast } from '../ScanDetails/components/SaveToast';
import type { SortOption } from './components/SortMenu';

export const SavedEvidence: React.FC = () => {
  const { lang } = useLanguage();
  const isBn = lang === 'bn';
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // State Management
  const [isLoading, setIsLoading] = useState(true);
  const [evidenceList, setEvidenceList] = useState<SavedEvidenceItem[]>(savedEvidenceMockData);
  const [collections, setCollections] = useState<CollectionItem[]>(initialCollectionsData);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    type: 'ALL',
    relationship: 'ALL',
    dateRange: 'ALL'
  });
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  // Drawer & Modals
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<SavedEvidenceItem | null>(null);
  const [addToCollectionTarget, setAddToCollectionTarget] = useState<SavedEvidenceItem | null>(null);
  const [shareTarget, setShareTarget] = useState<SavedEvidenceItem | null>(null);
  const [showCreateColModal, setShowCreateColModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleSave = (id: string) => {
    setEvidenceList((prev) => {
      const exists = prev.find((item) => item.id === id);
      if (exists) {
        triggerToast(isBn ? 'প্রমাণটি সংরক্ষণ তালিকা থেকে সরানো হয়েছে' : 'Evidence removed from Saved Evidence');
        return prev.filter((item) => item.id !== id);
      }
      return prev;
    });
  };

  const handleCreateCollection = (name: string) => {
    const newCol: CollectionItem = {
      id: `col-${Date.now()}`,
      name,
      nameBn: name,
      count: 0,
      color: '#2563EB',
      bgClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60',
      iconBg: 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
    };
    setCollections((prev) => [...prev, newCol]);
    triggerToast(isBn ? `'${name}' ফোল্ডার তৈরি করা হয়েছে` : `Collection '${name}' created`);
  };

  const handleAssignCollection = (evidenceId: string, collectionName: string) => {
    setEvidenceList((prev) =>
      prev.map((item) => (item.id === evidenceId ? { ...item, collection: collectionName } : item))
    );
    triggerToast(isBn ? 'প্রমাণটি ফোল্ডারে যোগ করা হয়েছে' : `Added to ${collectionName}`);
  };

  // Calculate statistics totals
  const totalCount = evidenceList.length;
  const claimCount = evidenceList.filter((item) => item.type === 'CLAIM_EVIDENCE').length;
  const scamCount = evidenceList.filter((item) => item.type === 'SCAM_SIGNAL').length;
  const imageCount = evidenceList.filter((item) => item.type === 'IMAGE_SIGNAL').length;

  // Filter & Search & Sort logic
  const filteredList = useMemo(() => {
    let result = [...evidenceList];

    // Filter by Search Term
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          (item.titleBn && item.titleBn.toLowerCase().includes(query)) ||
          item.description.toLowerCase().includes(query) ||
          item.source.toLowerCase().includes(query) ||
          item.scanId.toLowerCase().includes(query) ||
          (item.url && item.url.toLowerCase().includes(query))
      );
    }

    // Filter by Collection
    if (activeCollection) {
      result = result.filter((item) => item.collection === activeCollection);
    }

    // Filter by Type
    if (filters.type !== 'ALL') {
      result = result.filter((item) => item.type === filters.type);
    }

    // Filter by Relationship
    if (filters.relationship !== 'ALL') {
      result = result.filter((item) => item.relationship === filters.relationship);
    }

    // Filter by Date Range
    if (filters.dateRange === 'TODAY') {
      result = result.filter((item) => item.savedAt.includes('min') || item.savedAt.includes('hour'));
    } else if (filters.dateRange === 'THIS_WEEK') {
      result = result.filter((item) => !item.savedAt.includes('month'));
    }

    // Sort items
    result.sort((a, b) => {
      if (sortBy === 'recent') return a.id < b.id ? 1 : -1;
      if (sortBy === 'oldest') return a.id > b.id ? 1 : -1;
      if (sortBy === 'type') return a.type.localeCompare(b.type);
      if (sortBy === 'source') return a.source.localeCompare(b.source);
      return 0;
    });

    return result;
  }, [evidenceList, searchTerm, activeCollection, filters, sortBy]);

  // Paginated subset
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedItems = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const isFilterActive =
    filters.type !== 'ALL' || filters.relationship !== 'ALL' || filters.dateRange !== 'ALL';

  return (
    <div className={`min-h-screen relative pb-28 ${isLight ? 'bg-[#F7F9FC]' : 'bg-slate-950 text-white'}`}>
      {/* Soft Background Radial Glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-400/5 dark:bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-8 relative z-10">

        {/* 1. Breadcrumb */}
        <Breadcrumb isBn={isBn} />

        {/* 2. Page Header */}
        <SavedEvidenceHeader isBn={isBn} />

        {/* 3. Summary Statistics */}
        <EvidenceStats
          totalCount={totalCount}
          claimCount={claimCount}
          scamCount={scamCount}
          imageCount={imageCount}
          isBn={isBn}
        />

        {/* 4. Search & Filter Controls Toolbar */}
        <div className="relative">
          <EvidenceToolbar
            searchTerm={searchTerm}
            onSearchChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            onToggleFilterPanel={() => setShowFilterPanel(!showFilterPanel)}
            isFilterActive={isFilterActive}
            sortBy={sortBy}
            onSortChange={(opt) => setSortBy(opt)}
            viewMode={viewMode}
            onViewModeChange={(mode) => setViewMode(mode)}
            isBn={isBn}
          />

          <FilterPanel
            isOpen={showFilterPanel}
            onClose={() => setShowFilterPanel(false)}
            filters={filters}
            onApplyFilters={(newFilters) => {
              setFilters(newFilters);
              setCurrentPage(1);
            }}
            onResetFilters={() => {
              setFilters({ type: 'ALL', relationship: 'ALL', dateRange: 'ALL' });
              setCurrentPage(1);
            }}
            isBn={isBn}
          />
        </div>

        {/* Active Filter Chips */}
        <ActiveFilterChips
          filters={filters}
          activeCollection={activeCollection}
          onRemoveType={() => setFilters({ ...filters, type: 'ALL' })}
          onRemoveRelationship={() => setFilters({ ...filters, relationship: 'ALL' })}
          onRemoveDate={() => setFilters({ ...filters, dateRange: 'ALL' })}
          onRemoveCollection={() => setActiveCollection(null)}
          onClearAll={() => {
            setFilters({ type: 'ALL', relationship: 'ALL', dateRange: 'ALL' });
            setActiveCollection(null);
            setSearchTerm('');
          }}
          isBn={isBn}
        />

        {/* 5. Collections Section */}
        <CollectionsSection
          collections={collections}
          activeCollection={activeCollection}
          onSelectCollection={(name) => {
            setActiveCollection(name);
            setCurrentPage(1);
          }}
          onCreateCollection={handleCreateCollection}
          isBn={isBn}
        />

        {/* 6. Main Evidence Grid / States */}
        {isLoading ? (
          <EvidenceSkeleton />
        ) : evidenceList.length === 0 ? (
          <EmptyEvidence isBn={isBn} />
        ) : filteredList.length === 0 ? (
          <NoSearchResults
            onClearSearch={() => {
              setSearchTerm('');
              setActiveCollection(null);
              setFilters({ type: 'ALL', relationship: 'ALL', dateRange: 'ALL' });
            }}
            isBn={isBn}
          />
        ) : (
          <div className="space-y-6">
            <EvidenceGrid
              items={paginatedItems}
              viewMode={viewMode}
              onOpenDrawer={(item) => setSelectedDrawerItem(item)}
              onToggleSave={handleToggleSave}
              onAddToCollection={(item) => setAddToCollectionTarget(item)}
              isBn={isBn}
            />

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredList.length}
              pageSize={pageSize}
              onPageChange={(p: number) => setCurrentPage(p)}
              isBn={isBn}
            />
          </div>
        )}

        {/* Right-side Evidence Drawer */}
        <EvidenceDrawer
          item={selectedDrawerItem}
          onClose={() => setSelectedDrawerItem(null)}
          onShareItem={(item) => setShareTarget(item)}
          isBn={isBn}
        />

        {/* Add to Collection Modal */}
        <AddToCollectionModal
          isOpen={Boolean(addToCollectionTarget)}
          onClose={() => setAddToCollectionTarget(null)}
          evidence={addToCollectionTarget}
          collections={collections}
          onAssignCollection={handleAssignCollection}
          onOpenCreateCollection={() => setShowCreateColModal(true)}
          isBn={isBn}
        />

        {/* New Collection Modal */}
        <NewCollectionModal
          isOpen={showCreateColModal}
          onClose={() => setShowCreateColModal(false)}
          onCreateCollection={handleCreateCollection}
          isBn={isBn}
        />

        {/* Share Evidence Modal */}
        <ShareEvidenceModal
          isOpen={Boolean(shareTarget)}
          onClose={() => setShareTarget(null)}
          evidence={shareTarget}
          onCopyLink={() =>
            triggerToast(isBn ? 'প্রমাণ লিংক ক্লিপবোর্ডে অনুলিপি করা হয়েছে' : 'Evidence link copied')
          }
          isBn={isBn}
        />

        {/* Toast Notifications */}
        <SaveToast message={toastMessage} />
      </div>
    </div>
  );
};

export default SavedEvidence;
