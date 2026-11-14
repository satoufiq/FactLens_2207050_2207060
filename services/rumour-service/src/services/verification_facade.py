"""
Rumor / Claim Scanner pipeline.

Proposal, Module 1 "Processing Pipeline":

     1. Input reception
     2. OCR (if image) -- reviewed and corrected by the user before continuing
     3. Language detection
     4. Text normalization
     5. Claim extraction
     6. BanglaVerify inference
     7. Search query generation
     8. External evidence search
     9. Evidence extraction and storage
    10. Semantic relevance analysis
    11. Claim-evidence comparison
    12. Result aggregation
    13. Explanation generation

    Steps 6 and 7-11 run in parallel; step 12 waits on both.

That fork is implemented literally: step 6 (the model) and the 7-11 chain (the
evidence pipeline) run on separate threads and join at step 12. The first
draft's diagram forked before query generation, which is not executable -- the
search cannot begin before its queries exist -- so the fork happens *after*
claim extraction, with query generation inside the evidence branch.

Step 12 runs in two layers: the Mamdani fuzzy inference system scores the
signals, then the precedence gate enforces that evidence outranks the model.
"""

from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from factlens_common.lifecycle import RumorVerdict
from factlens_common.modelruns import record_model_run, record_raw_run
from factlens_common.scanflow import DegradationLog, ScanOutcome
from factlens_common.schema import Evidence, SearchQueryRecord, UrlAnalysis
from factlens_common.urlanalysis import get_url_analyzer
from sqlalchemy.orm import Session

from ..adapters.banglabert_adapter import BanglaVerifyAdapter
from ..core.config import settings
from .claim_preprocessing_service import ClaimPreprocessingService
from .evidence_extraction_service import EvidenceExtractionService
from .evidence_matching_service import EvidenceMatchingService
from .fuzzy_verdict_service import FuzzyVerdictService
from .link_extraction_service import LinkExtractionService
from .query_generation_service import QueryGenerationService
from .result_precedence import ResultPrecedenceGate
from .source_reliability_service import SourceReliabilityService
from .web_search_service import WebSearchService

logger = logging.getLogger("factlens.rumor.pipeline")


class RumourVerificationFacade:
    """
    Facade coordinating the rumor verification lifecycle.

    The pipeline stages are unchanged in substance from the working service;
    what is new is that the model now sits behind a provider (and is currently
    unavailable), the verdict passes through the precedence gate, URL analysis
    is persisted, and every inference writes a model_runs row.
    """

    def __init__(self, db: Session):
        self.db = db
        self.model = BanglaVerifyAdapter()
        self.preprocessor = ClaimPreprocessingService()
        self.query_service = QueryGenerationService()
        self.search_service = WebSearchService()
        self.extraction_service = EvidenceExtractionService()
        self.reliability_service = SourceReliabilityService()
        self.matching_service = EvidenceMatchingService()
        self.fuzzy_service = FuzzyVerdictService()
        self.link_service = LinkExtractionService()
        self.url_analyzer = get_url_analyzer()
        self.precedence = ResultPrecedenceGate()

    # -- entry point -------------------------------------------------------

    def verify(
        self,
        scan_id: str,
        claim_text: str,
        input_url: Optional[str] = None,
    ) -> Tuple[ScanOutcome, DegradationLog]:
        degradation = DegradationLog()
        started = time.perf_counter()
        raw_text = (claim_text or "").strip()

        # Step 1b -- URL / article ingestion.
        link_article, claim_to_verify = self._ingest_link(raw_text, input_url)

        # Steps 3-5 -- language detection, normalization, claim extraction.
        claim_data = self.preprocessor.process_claim(claim_to_verify)
        normalized_text = claim_data["normalized_text"]
        temporal_profile = claim_data.get("temporal_profile") or {}

        if not normalized_text:
            degradation.add(
                component="input",
                reason="No claim text to verify.",
                user_message="No claim text was supplied, so there was nothing to check.",
                user_message_bn="কোনো দাবি পাওয়া যায়নি, তাই যাচাই করার মতো কিছু ছিল না।",
            )
            return self._unable_outcome(), degradation

        # Steps 6 and 7-11 in parallel; step 12 waits on both.
        # BanglaVerify gets the text as the user submitted it -- it applies its
        # own training-time cleaning -- or, for a fetched article, the headline
        # and body as the pair it was trained on. The runtime bounds the call
        # with its own timeout, so this pool never waits on a stuck model.
        with ThreadPoolExecutor(max_workers=2, thread_name_prefix="rumor") as pool:
            if link_article and link_article.get("headline") and link_article.get("body"):
                model_future = pool.submit(
                    self.model.classify_article, link_article["headline"], link_article["body"]
                )
            else:
                model_future = pool.submit(self.model.classify_claim, claim_to_verify)
            evidence_future = pool.submit(
                self._run_evidence_pipeline, claim_to_verify, claim_data, link_article, raw_text
            )

            model_prediction = model_future.result()
            evidence_bundle = evidence_future.result()

        # Every inference is recorded against its version, available or not.
        record_model_run(self.db, scan_id, model_prediction)

        if not model_prediction.available:
            degradation.add_model_unavailable(
                "BanglaVerify", model_prediction.reason or "Model unavailable."
            )

        analyzed_evidence = evidence_bundle["evidence"]
        search_performed = evidence_bundle["search_performed"]
        independent_sources = evidence_bundle["independent_sources"]
        queries_executed = evidence_bundle["queries"]
        url_results = evidence_bundle["url_results"]

        if not search_performed:
            degradation.add(
                component="SearchProvider",
                reason=evidence_bundle.get("search_error") or "Search provider unavailable.",
                user_message=(
                    "External evidence could not be retrieved for this claim, so this "
                    "verdict rests on incomplete information. Unable to retrieve "
                    "external evidence is not the same as finding none."
                ),
                user_message_bn=(
                    "এই দাবির জন্য বাইরের প্রমাণ সংগ্রহ করা যায়নি, তাই এই রায়টি অসম্পূর্ণ "
                    "তথ্যের ভিত্তিতে তৈরি। প্রমাণ আনতে না পারা আর প্রমাণ না পাওয়া এক নয়।"
                ),
            )

        # Step 12 -- result aggregation: fuzzy inference for the evidence scores,
        # then the weighted combination (BanglaVerify first, evidence as backup).
        fuzzy_result = self._run_fuzzy(
            model_prediction, analyzed_evidence, independent_sources, temporal_profile
        )

        decision = self.precedence.decide(
            fuzzy_result=fuzzy_result,
            evidence_items=analyzed_evidence,
            model_prediction=model_prediction,
            independent_sources=independent_sources,
            temporal_profile=temporal_profile,
        )

        # Step 13 -- explanation generation.
        explanation = self._build_explanation(
            decision, fuzzy_result, analyzed_evidence, model_prediction, degradation
        )

        self._persist(scan_id, analyzed_evidence, queries_executed, url_results,
                      len(evidence_bundle.get("raw_results", [])))

        elapsed_ms = (time.perf_counter() - started) * 1000.0

        outcome = ScanOutcome(
            result=decision.verdict,
            confidence=decision.confidence,
            summary=explanation["summary"],
            summary_bn=explanation["summary_bn"],
            explanation=explanation,
            limitations=self._limitations(decision, degradation, search_performed),
            detail={
                "precedence": decision.as_dict(),
                "fuzzy_scores": {
                    "support_score": fuzzy_result.get("support_score"),
                    "contradiction_score": fuzzy_result.get("contradiction_score"),
                    "decision_margin": fuzzy_result.get("decision_margin"),
                    "fuzzy_verdict": fuzzy_result.get("verdict"),
                    "engine": "Mamdani FIS, centroid defuzzification",
                },
                "banglaverify": self.model.describe(),
                "model_prediction": {
                    "available": model_prediction.available,
                    "label": model_prediction.label,
                    "confidence": model_prediction.confidence,
                    "probabilities": model_prediction.probabilities,
                    "reason": model_prediction.reason,
                    "head": (model_prediction.raw or {}).get("head"),
                    "p_fake": (model_prediction.raw or {}).get("p_fake"),
                    "threshold": (model_prediction.raw or {}).get("threshold"),
                    "n_tokens": (model_prediction.raw or {}).get("n_tokens"),
                    "model_version": model_prediction.model_version,
                    "latency_ms": model_prediction.latency_ms,
                },
                "language": claim_data.get("language"),
                "temporal_profile": temporal_profile,
                "web_search": {
                    "performed": search_performed,
                    "queries_executed": queries_executed,
                    "total_results": len(evidence_bundle.get("raw_results", [])),
                    "independent_sources": independent_sources,
                },
                "urls": [u.as_dict() for u in url_results],
                "elapsed_ms": round(elapsed_ms, 2),
                "pipeline": (
                    "normalize -> extract claim -> [BanglaVerify | "
                    "queries -> search -> extract -> relevance -> stance] -> "
                    "fuzzy -> precedence -> explain"
                ),
            },
            signal_summary={
                "model_available": model_prediction.available,
                "model_version": model_prediction.model_version,
                "search_performed": search_performed,
                "evidence_count": len(analyzed_evidence),
                "independent_sources": independent_sources,
                "decided_by": decision.decided_by,
                "degraded_components": degradation.components,
            },
        )
        return outcome, degradation

    # -- stages ------------------------------------------------------------

    def _ingest_link(
        self, raw_text: str, input_url: Optional[str]
    ) -> Tuple[Optional[Dict[str, Any]], str]:
        """Fetch and extract an article when a URL was submitted."""
        candidate = None
        if input_url and self.link_service.is_url(input_url):
            candidate = input_url
        elif self.link_service.is_url(raw_text):
            candidate = raw_text

        if not candidate:
            return None, raw_text

        try:
            extracted = self.link_service.fetch_and_extract_article(candidate)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Article extraction failed for %s: %s", candidate, exc)
            return None, raw_text

        if extracted.get("success") and extracted.get("extracted_claim"):
            return extracted, extracted["extracted_claim"]
        return None, raw_text

    def _run_evidence_pipeline(
        self,
        claim_to_verify: str,
        claim_data: Dict[str, Any],
        link_article: Optional[Dict[str, Any]],
        raw_text: str,
    ) -> Dict[str, Any]:
        """
        Steps 7-11, run as one branch.

        Query generation sits inside this branch rather than before the fork,
        because the search cannot begin before its queries exist.
        """
        temporal_profile = claim_data.get("temporal_profile") or {}
        timelimit = temporal_profile.get("timelimit_param")

        # Step 7 -- search query generation.
        queries = self.query_service.generate_queries(claim_to_verify, claim_data)

        # Step 8 -- external evidence search.
        search_performed = True
        search_error = None
        raw_results: List[Dict[str, Any]] = []
        queries_executed = queries

        try:
            response = self.search_service.search_queries(queries, timelimit=timelimit)
            search_performed = bool(response.get("performed", True))
            search_error = response.get("error")
            raw_results = response.get("results", []) or []
            queries_executed = response.get("queries_executed", queries)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Evidence search failed: %s", exc)
            search_performed = False
            search_error = str(exc)

        # Step 9 -- evidence extraction and storage.
        candidates: List[Dict[str, Any]] = []

        if link_article and link_article.get("headline"):
            candidates.append(self._submitted_article_candidate(link_article, raw_text))

        for item in raw_results[: settings.MAX_EVIDENCE_ITEMS]:
            try:
                extracted = self.extraction_service.extract_evidence(item)
                # The outlet is identified from the URL; the article title is not a publisher name.
                evaluation = self.reliability_service.evaluate_source(
                    url=item.get("url", ""),
                    publisher=None,
                    claim_context=claim_data,
                )
                candidates.append(
                    {
                        **item,
                        **extracted,
                        "source_reliability": evaluation["adjusted_reliability"],
                        "publisher": evaluation.get("source_name", "Web Source"),
                        "is_primary_official": evaluation.get("is_primary_official", False),
                        "tier": evaluation.get("tier", "SECONDARY_NEWS"),
                    }
                )
            except Exception as exc:  # noqa: BLE001
                logger.debug("Evidence extraction failed for %s: %s", item.get("url"), exc)

        # Deduplicate syndicated copies so one wire story is not counted five times.
        dedup = self.reliability_service.cluster_and_deduplicate(candidates)
        independent_sources = dedup.get("independent_sources_count", len(candidates))
        deduped = dedup.get("items", candidates)

        # Steps 10 and 11 -- relevance scoring and stance labelling.
        analyzed: List[Dict[str, Any]] = []
        for candidate in deduped:
            try:
                scores = self.matching_service.analyze_evidence_item(claim_data, candidate)
                analyzed.append({**candidate, **scores, "stance_source": "MATCHER"})
            except Exception as exc:  # noqa: BLE001
                logger.debug("Stance matching failed: %s", exc)

        # URL inspection for any link carried by the claim or the evidence.
        url_results = self._analyze_urls(claim_data, link_article, raw_text)

        return {
            "evidence": analyzed,
            "raw_results": raw_results,
            "queries": queries_executed,
            "search_performed": search_performed,
            "search_error": search_error,
            "independent_sources": independent_sources,
            "url_results": url_results,
        }

    @staticmethod
    def _submitted_article_candidate(
        link_article: Dict[str, Any], raw_text: str
    ) -> Dict[str, Any]:
        is_primary = bool(link_article.get("is_primary_official"))
        return {
            "title": link_article.get("headline", "Submitted News Article"),
            "url": link_article.get("url", raw_text),
            "domain": link_article.get("domain", ""),
            "publisher": link_article.get("publisher", "Submitted Media Outlet"),
            "snippet": (link_article.get("body") or "")[:400],
            "source_type": "Submitted News Article",
            "source_reliability": 94.0 if is_primary else 75.0,
            "is_primary_official": is_primary,
            "tier": "PRIMARY_OFFICIAL" if is_primary else "SECONDARY_NEWS",
            "relevance_score": 96.0,
            "directness_score": 95.0,
            "stance": "SUPPORTING",
            "relationship": "SUPPORTING",
        }

    def _analyze_urls(
        self,
        claim_data: Dict[str, Any],
        link_article: Optional[Dict[str, Any]],
        raw_text: str,
    ) -> List[Any]:
        """
        URL inspection for rumor scans.

        The proposal gives `url_analysis` to both the rumor and scam modules: a
        claim arriving as a link to an unfamiliar domain is a signal about the
        claim, and until now that output had nowhere to live.
        """
        targets: List[str] = []
        if link_article and link_article.get("url"):
            targets.append(link_article["url"])
        elif self.link_service.is_url(raw_text):
            targets.append(raw_text)

        results = []
        for url in targets[:2]:
            try:
                results.append(self.url_analyzer.analyze(url))
            except Exception as exc:  # noqa: BLE001
                logger.debug("URL analysis failed for %s: %s", url, exc)
        return results

    def _run_fuzzy(
        self,
        model_prediction,
        evidence_items: List[Dict[str, Any]],
        independent_sources: int,
        temporal_profile: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Run the Mamdani FIS.

        When BanglaVerify is unavailable the model antecedent is fed a neutral
        50 with an UNCERTAIN label, so the inference runs on the evidence
        antecedents alone rather than being handed a fabricated prior.
        """
        if model_prediction.available:
            confidence = float(model_prediction.confidence or 0.5) * 100.0
            label = "RUMOR" if model_prediction.label == "FAKE" else "AUTHENTIC"
        else:
            confidence = 50.0
            label = "UNCERTAIN"

        try:
            return self.fuzzy_service.evaluate_verdict(
                banglabert_confidence=confidence,
                banglabert_label=label,
                evidence_items=evidence_items,
                independent_sources_count=independent_sources,
                temporal_profile=temporal_profile,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Fuzzy inference failed; falling back to evidence counts")
            supporting = sum(1 for e in evidence_items if e.get("stance") == "SUPPORTING")
            contradicting = sum(
                1 for e in evidence_items if e.get("stance") == "CONTRADICTING"
            )
            if contradicting > supporting:
                verdict, support, contra = "CONTRADICTED", 30.0, 70.0
            elif supporting > contradicting:
                verdict, support, contra = "SUPPORTED", 70.0, 30.0
            else:
                verdict, support, contra = "UNVERIFIED", 50.0, 50.0
            return {
                "verdict": verdict,
                "support_score": support,
                "contradiction_score": contra,
                "decision_margin": abs(support - contra),
                "explanation": {"english": "", "bangla": ""},
                "fallback": f"Fuzzy inference unavailable: {exc}",
            }

    # -- explanation -------------------------------------------------------

    def _build_explanation(
        self,
        decision,
        fuzzy_result: Dict[str, Any],
        evidence_items: List[Dict[str, Any]],
        model_prediction,
        degradation: DegradationLog,
    ) -> Dict[str, Any]:
        """
        Step 13.

        Proposal, "Ethical constraints": Unverified is presented as the absence
        of evidence, never as a finding of falsehood. Every string below holds
        to that.
        """
        headline, headline_bn = self._headline(decision.verdict)
        fuzzy_text = fuzzy_result.get("explanation") or {}

        supporting = [e for e in evidence_items if e.get("stance") == "SUPPORTING"]
        contradicting = [e for e in evidence_items if e.get("stance") == "CONTRADICTING"]

        sources_cited = [
            {
                "title": e.get("title"),
                "publisher": e.get("publisher"),
                "url": e.get("url"),
                "stance": e.get("stance"),
                "reliability": e.get("source_reliability"),
                "published_at": e.get("published_date"),
            }
            for e in evidence_items[:8]
        ]

        if model_prediction.available:
            model_note = (
                f"The BanglaVerify classifier read the wording as "
                f"{(model_prediction.label or '').lower()} "
                f"({(model_prediction.confidence or 0):.0%} confidence). This is a "
                f"signal about how the text is written, not a finding about the facts."
            )
        else:
            model_note = (
                "The BanglaVerify classifier was not available for this scan, so this "
                "verdict comes from the retrieved evidence alone."
            )

        summary = self._summary(decision, supporting, contradicting, model_prediction)

        return {
            "headline": headline,
            "headline_bn": headline_bn,
            "summary": summary,
            "summary_bn": " ".join(decision.rationale_bn) or headline_bn,
            "evidence_found": {
                "supporting": len(supporting),
                "contradicting": len(contradicting),
                "total": len(evidence_items),
            },
            "sources_cited": sources_cited,
            "reasoning": decision.rationale,
            "decided_by": decision.decided_by,
            "disagreement": decision.disagreement,
            "model_note": model_note,
            "fuzzy_narrative": fuzzy_text.get("english") or "",
            "degraded": degradation.user_messages(),
            "unverified_notice": (
                "Unverified means FactLens could not find evidence either way. It does "
                "not mean the claim is false."
            )
            if decision.verdict.startswith("UNVERIFIED")
            else None,
            "unverified_notice_bn": (
                "অসত্যায়িত মানে ফ্যাক্টলেন্স পক্ষে বা বিপক্ষে কোনো প্রমাণ খুঁজে পায়নি। "
                "এর অর্থ এই নয় যে দাবিটি মিথ্যা।"
            )
            if decision.verdict.startswith("UNVERIFIED")
            else None,
        }

    @staticmethod
    def _headline(verdict: str) -> Tuple[str, str]:
        return {
            RumorVerdict.SUPPORTED.value: (
                "Supported — relevant available evidence supports this claim",
                "সমর্থিত — প্রাপ্ত প্রাসঙ্গিক প্রমাণ এই দাবিকে সমর্থন করে",
            ),
            RumorVerdict.CONTRADICTED.value: (
                "Contradicted — relevant reliable evidence conflicts with this claim",
                "খণ্ডিত — নির্ভরযোগ্য প্রাসঙ্গিক প্রমাণ এই দাবির বিরোধিতা করে",
            ),
            RumorVerdict.UNVERIFIED.value: (
                "Unverified — available evidence is insufficient to establish this claim",
                "অসত্যায়িত — এই দাবি প্রতিষ্ঠার মতো যথেষ্ট প্রমাণ পাওয়া যায়নি",
            ),
            RumorVerdict.UNVERIFIED_SUSPICIOUS.value: (
                "Unverified — suspicious pattern. No confirming evidence, and the "
                "wording resembles previously circulated false claims",
                "অসত্যায়িত — সন্দেহজনক ধরন। নিশ্চিতকারী প্রমাণ নেই, এবং লেখার ধরন আগে "
                "ছড়ানো মিথ্যা দাবির মতো",
            ),
            RumorVerdict.UNABLE_TO_ANALYZE.value: (
                "Unable to analyze — processing could not complete enough stages",
                "বিশ্লেষণ করা যায়নি — যথেষ্ট ধাপ সম্পন্ন করা যায়নি",
            ),
        }.get(
            verdict,
            (
                "Unverified — available evidence is insufficient to establish this claim",
                "অসত্যায়িত — এই দাবি প্রতিষ্ঠার মতো যথেষ্ট প্রমাণ পাওয়া যায়নি",
            ),
        )

    @staticmethod
    def _summary(decision, supporting, contradicting, model_prediction) -> str:
        parts: List[str] = []

        if supporting or contradicting:
            parts.append(
                f"FactLens retrieved {len(supporting) + len(contradicting)} source(s) "
                f"taking a position on this claim: {len(supporting)} supporting and "
                f"{len(contradicting)} contradicting."
            )
        else:
            parts.append(
                "FactLens found no source that either confirms or denies this claim."
            )

        parts.extend(decision.rationale[:2])

        if decision.disagreement:
            parts.append(decision.disagreement)

        if not model_prediction.available:
            parts.append(
                "This is a partial result: the BanglaVerify classifier was unavailable."
            )

        return " ".join(parts)

    @staticmethod
    def _limitations(decision, degradation: DegradationLog, search_performed: bool) -> List[str]:
        limitations = [
            "FactLens checks claims against online news, institutional gazettes and "
            "official advisories. It cannot verify what has not been published.",
            "A verdict reflects the evidence available at the time of the scan and may "
            "change as more reporting appears.",
        ]
        if not search_performed:
            limitations.append(
                "External evidence could not be retrieved for this scan, so the verdict "
                "rests on incomplete information."
            )
        if decision.decided_by == "model":
            limitations.append(
                "This verdict follows the BanglaVerify model's reading of the text; it "
                "was not confirmed by matching news reports."
            )
        limitations.extend(degradation.user_messages())
        return limitations

    # -- persistence -------------------------------------------------------

    def _persist(
        self,
        scan_id: str,
        evidence_items: List[Dict[str, Any]],
        queries: List[str],
        url_results: List[Any],
        total_results: int,
    ) -> None:
        for query in queries or []:
            self.db.add(
                SearchQueryRecord(
                    scan_id=scan_id, query_text=str(query)[:512], results_count=total_results
                )
            )

        for item in evidence_items:
            self.db.add(
                Evidence(
                    scan_id=scan_id,
                    title=(item.get("title") or "Evidence Document")[:512],
                    source_name=(item.get("publisher") or "Web Source")[:256],
                    publisher=(item.get("publisher") or "Web Source")[:256],
                    source_type=item.get("tier", "NEWS_MEDIA"),
                    url=(item.get("url") or "")[:1024],
                    snippet=item.get("snippet") or "",
                    published_at=(item.get("published_date") or "")[:128],
                    retrieved_at=datetime.now(timezone.utc),
                    relevance_score=float(item.get("relevance_score", 50.0) or 0.0),
                    source_reliability=float(item.get("source_reliability", 50.0) or 0.0),
                    directness_score=float(item.get("directness_score", 50.0) or 0.0),
                    temporal_match_score=float(item.get("temporal_match_score", 50.0) or 0.0),
                    stance=item.get("stance", "NEUTRAL"),
                    relationship_label=item.get("stance", "NEUTRAL"),
                    stance_source=item.get("stance_source", "MATCHER"),
                    reason=item.get("reason") or "",
                )
            )

        for result in url_results:
            self.db.add(
                UrlAnalysis(
                    scan_id=scan_id,
                    url=result.url[:2048],
                    domain=result.domain,
                    registered_domain=result.registered_domain,
                    tld=result.tld,
                    has_https=result.has_https,
                    redirect_chain=result.redirect_chain or None,
                    reputation_score=result.reputation_score,
                    reputation_source=result.reputation_source,
                    flags=[f.as_dict() for f in result.flags] or None,
                )
            )

    @staticmethod
    def _unable_outcome() -> ScanOutcome:
        return ScanOutcome(
            result=RumorVerdict.UNABLE_TO_ANALYZE.value,
            confidence=0.0,
            summary="There was no claim text to verify.",
            summary_bn="যাচাই করার মতো কোনো দাবি পাওয়া যায়নি।",
            explanation={
                "headline": "Unable to analyze",
                "headline_bn": "বিশ্লেষণ করা যায়নি",
                "summary": "No claim text was supplied.",
                "sources_cited": [],
                "reasoning": [],
            },
            limitations=["No input was available to analyze."],
        )

    def health(self) -> Dict[str, Any]:
        return {
            "model": self.model.health(),
            "url_analyzer": self.url_analyzer.health(),
        }
