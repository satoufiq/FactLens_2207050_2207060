from typing import List, Dict, Any, Optional
from rapidfuzz import fuzz
from ..utils.source_registry import evaluate_source_reliability
from ..strategies.reliability_strategies import ReliabilityStrategyResolver

class SourceReliabilityService:
    """
    Evaluates institutional authority, domain trustworthiness, and deduplicates
    syndicated agency stories to prevent echo-chamber corroboration inflation.
    Uses Strategy pattern via ReliabilityStrategyResolver to determine baseline credibility.
    """

    def evaluate_source(
        self,
        url: str,
        publisher: Optional[str] = None,
        claim_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        info = evaluate_source_reliability(url, publisher)
        domain = info.get("domain", "")

        # Apply Strategy Pattern evaluation
        strategy = ReliabilityStrategyResolver.resolve(domain)
        strategy_eval = strategy.evaluate(domain, publisher)
        info["strategy_tier"] = strategy_eval["tier"]
        info["verification_status"] = strategy_eval["verification_status"]

        base_score = info["source_reliability"]

        # Authority context adjustment
        if claim_context:
            entities = [e.get("bn", "") for e in claim_context.get("entities", [])]
            domain = info["domain"].lower()

            # Education authority match
            if any(e in ["বিশ্ববিদ্যালয়", "ইউজিসি", "শিক্ষা মন্ত্রণালয়"] for e in entities):
                if any(k in domain for k in ["ugc.gov.bd", "moedu.gov.bd", "ac.bd", "edu.bd"]):
                    base_score = min(100.0, base_score + 2.0)
                    info["authority_context_match"] = True

        info["adjusted_reliability"] = round(base_score, 1)
        return info

    def cluster_and_deduplicate(self, evidence_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Detects syndicated or copied articles across news outlets.
        Articles with title/lead text similarity > 85% are clustered as a single news wire.
        """
        if not evidence_items:
            return {
                "clusters": [],
                "independent_sources_count": 0,
                "items": []
            }

        clusters: List[List[int]] = []

        for i, item_a in enumerate(evidence_items):
            text_a = (item_a.get("title", "") + " " + item_a.get("snippet", "")[:120]).strip()
            assigned = False

            for cluster in clusters:
                rep_idx = cluster[0]
                item_b = evidence_items[rep_idx]
                text_b = (item_b.get("title", "") + " " + item_b.get("snippet", "")[:120]).strip()

                sim = fuzz.token_set_ratio(text_a, text_b)
                if sim >= 85:
                    cluster.append(i)
                    assigned = True
                    break

            if not assigned:
                clusters.append([i])

        # Mark duplicates
        enriched_items = []
        for i, item in enumerate(evidence_items):
            # Find its cluster
            cluster_id = next((cid for cid, c in enumerate(clusters) if i in c), 0)
            is_primary_in_cluster = (clusters[cluster_id][0] == i)
            copy = dict(item)
            copy["cluster_id"] = cluster_id
            copy["is_syndicated_copy"] = not is_primary_in_cluster
            enriched_items.append(copy)

        return {
            "clusters": clusters,
            "independent_sources_count": len(clusters),
            "items": enriched_items
        }

