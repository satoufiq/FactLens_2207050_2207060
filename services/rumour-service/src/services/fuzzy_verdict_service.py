import os
import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
from typing import Dict, Any, List, Optional, Tuple

class FuzzyVerdictService:
    """
    Mamdani Fuzzy Inference System (FIS) combining BanglaBERT stance logits
    with real-world web evidence, source authority, directness, and temporal alignment.
    Uses centroid defuzzification with an explicit primary authority override hierarchy.
    """

    def __init__(self):
        self._build_fuzzy_system()

    def _build_fuzzy_system(self):
        universe = np.arange(0, 101, 1)

        # -------------------------------------------------------------
        # 1. Antecedents (8 Input Variables: Universe 0 - 100)
        # -------------------------------------------------------------
        # A. BanglaBERT Confidence
        self.banglabert_conf = ctrl.Antecedent(universe, "banglabert_confidence")
        self.banglabert_conf["low"] = fuzz.trimf(universe, [0, 0, 45])
        self.banglabert_conf["medium"] = fuzz.trimf(universe, [35, 50, 65])
        self.banglabert_conf["high"] = fuzz.trimf(universe, [55, 100, 100])

        # B. Evidence Relevance
        self.evidence_rel = ctrl.Antecedent(universe, "evidence_relevance")
        self.evidence_rel["low"] = fuzz.trimf(universe, [0, 0, 40])
        self.evidence_rel["medium"] = fuzz.trimf(universe, [30, 55, 75])
        self.evidence_rel["high"] = fuzz.trimf(universe, [65, 100, 100])

        # C. Source Reliability
        self.source_rel = ctrl.Antecedent(universe, "source_reliability")
        self.source_rel["very_low"] = fuzz.trimf(universe, [0, 0, 30])
        self.source_rel["low"] = fuzz.trimf(universe, [20, 35, 50])
        self.source_rel["medium"] = fuzz.trimf(universe, [40, 55, 70])
        self.source_rel["high"] = fuzz.trimf(universe, [65, 80, 90])
        self.source_rel["very_high"] = fuzz.trimf(universe, [85, 100, 100])

        # D. Evidence Directness
        self.evidence_dir = ctrl.Antecedent(universe, "evidence_directness")
        self.evidence_dir["indirect"] = fuzz.trimf(universe, [0, 0, 35])
        self.evidence_dir["partial"] = fuzz.trimf(universe, [25, 45, 65])
        self.evidence_dir["direct"] = fuzz.trimf(universe, [55, 75, 90])
        self.evidence_dir["very_direct"] = fuzz.trimf(universe, [80, 100, 100])

        # E. Independent Corroboration
        self.indep_corrob = ctrl.Antecedent(universe, "independent_corroboration")
        self.indep_corrob["none"] = fuzz.trimf(universe, [0, 0, 20])
        self.indep_corrob["low"] = fuzz.trimf(universe, [15, 35, 50])
        self.indep_corrob["medium"] = fuzz.trimf(universe, [40, 60, 75])
        self.indep_corrob["high"] = fuzz.trimf(universe, [70, 100, 100])

        # F. Temporal Relevance
        self.temp_rel = ctrl.Antecedent(universe, "temporal_relevance")
        self.temp_rel["low"] = fuzz.trimf(universe, [0, 0, 40])
        self.temp_rel["medium"] = fuzz.trimf(universe, [30, 55, 75])
        self.temp_rel["high"] = fuzz.trimf(universe, [65, 100, 100])

        # G. Supporting Evidence Strength
        self.sup_strength = ctrl.Antecedent(universe, "supporting_evidence_strength")
        self.sup_strength["weak"] = fuzz.trimf(universe, [0, 0, 35])
        self.sup_strength["moderate"] = fuzz.trimf(universe, [25, 50, 70])
        self.sup_strength["strong"] = fuzz.trimf(universe, [60, 80, 95])
        self.sup_strength["very_strong"] = fuzz.trimf(universe, [85, 100, 100])

        # H. Contradicting Evidence Strength
        self.contra_strength = ctrl.Antecedent(universe, "contradicting_evidence_strength")
        self.contra_strength["weak"] = fuzz.trimf(universe, [0, 0, 35])
        self.contra_strength["moderate"] = fuzz.trimf(universe, [25, 50, 70])
        self.contra_strength["strong"] = fuzz.trimf(universe, [60, 80, 95])
        self.contra_strength["very_strong"] = fuzz.trimf(universe, [85, 100, 100])

        # -------------------------------------------------------------
        # 2. Consequents (Outputs: Universe 0 - 100)
        # -------------------------------------------------------------
        self.support_verdict = ctrl.Consequent(universe, "support_score", defuzzify_method="centroid")
        self.support_verdict["low"] = fuzz.trimf(universe, [0, 0, 35])
        self.support_verdict["medium"] = fuzz.trimf(universe, [25, 50, 70])
        self.support_verdict["high"] = fuzz.trimf(universe, [60, 80, 90])
        self.support_verdict["very_high"] = fuzz.trimf(universe, [85, 100, 100])

        self.contradiction_verdict = ctrl.Consequent(universe, "contradiction_score", defuzzify_method="centroid")
        self.contradiction_verdict["low"] = fuzz.trimf(universe, [0, 0, 35])
        self.contradiction_verdict["medium"] = fuzz.trimf(universe, [25, 50, 70])
        self.contradiction_verdict["high"] = fuzz.trimf(universe, [60, 80, 90])
        self.contradiction_verdict["very_high"] = fuzz.trimf(universe, [85, 100, 100])

        # -------------------------------------------------------------
        # 3. Mamdani Fuzzy Rules (10 Required Rules + Boundary Guard Rules)
        # -------------------------------------------------------------
        rules = [
            # Rule 1 — Direct confirmation from an official source (Overrides weak/medium BanglaBERT)
            ctrl.Rule(
                self.evidence_rel["high"] & self.source_rel["very_high"] &
                self.evidence_dir["very_direct"] & self.temp_rel["high"] &
                self.sup_strength["very_strong"],
                (self.support_verdict["very_high"], self.contradiction_verdict["low"])
            ),

            # Rule 2 — Direct confirmation from a reputable news source with corroboration
            ctrl.Rule(
                self.evidence_rel["high"] & self.source_rel["high"] &
                self.evidence_dir["direct"] & self.temp_rel["high"] &
                self.sup_strength["strong"] & (self.indep_corrob["medium"] | self.indep_corrob["high"]),
                (self.support_verdict["very_high"], self.contradiction_verdict["low"])
            ),

            # Rule 3 — Strong contradiction from an authoritative official source
            ctrl.Rule(
                self.evidence_rel["high"] & self.source_rel["very_high"] &
                self.evidence_dir["very_direct"] & self.temp_rel["high"] &
                self.contra_strength["very_strong"],
                (self.contradiction_verdict["very_high"], self.support_verdict["low"])
            ),

            # Rule 4 — BanglaBERT indicates a rumour, but reliable official evidence supports the claim
            ctrl.Rule(
                self.evidence_rel["high"] & self.source_rel["very_high"] &
                self.evidence_dir["very_direct"] & self.sup_strength["very_strong"],
                (self.support_verdict["very_high"], self.contradiction_verdict["low"])
            ),

            # Rule 5 — Model indicates a rumour, but there is no external web evidence
            ctrl.Rule(
                self.sup_strength["weak"] & self.contra_strength["weak"],
                (self.support_verdict["low"], self.contradiction_verdict["low"])
            ),

            # Rule 6 — High model confidence without external evidence
            ctrl.Rule(
                self.banglabert_conf["high"] & self.sup_strength["weak"] & self.contra_strength["weak"],
                (self.support_verdict["low"], self.contradiction_verdict["low"])
            ),

            # Rule 7 — Weak source with matching keywords (relevance high but source very low)
            ctrl.Rule(
                self.evidence_rel["high"] & self.source_rel["very_low"] & self.evidence_dir["indirect"],
                (self.support_verdict["low"], self.contradiction_verdict["low"])
            ),

            # Rule 8 — Multiple independent confirmations from reputable media
            ctrl.Rule(
                self.sup_strength["strong"] & self.indep_corrob["high"] &
                self.source_rel["high"] & self.temp_rel["high"],
                (self.support_verdict["very_high"], self.contradiction_verdict["low"])
            ),

            # Rule 9 — Conflicting evidence (both strong)
            ctrl.Rule(
                self.sup_strength["strong"] & self.contra_strength["strong"],
                (self.support_verdict["medium"], self.contradiction_verdict["medium"])
            ),

            # Rule 10 — No usable evidence / weak sources
            ctrl.Rule(
                self.evidence_rel["low"] & self.sup_strength["weak"],
                (self.support_verdict["low"], self.contradiction_verdict["low"])
            ),

            # Boundary guard: Contradiction from reputable news
            ctrl.Rule(
                self.evidence_rel["high"] & self.source_rel["high"] &
                self.contra_strength["strong"],
                (self.contradiction_verdict["high"], self.support_verdict["low"])
            ),

            # Boundary guard: General moderate support
            ctrl.Rule(
                self.sup_strength["moderate"] & self.source_rel["medium"],
                (self.support_verdict["medium"], self.contradiction_verdict["low"])
            ),
        ]

        self.control_system = ctrl.ControlSystem(rules)

    def evaluate_verdict(
        self,
        banglabert_confidence: float,
        banglabert_label: str,
        evidence_items: List[Dict[str, Any]],
        independent_sources_count: int = 0,
        temporal_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Runs the Mamdani FIS and applies the decision hierarchy.
        Returns numerical support/contradiction scores, decision margin, and final verdict.
        """
        temporal_profile = temporal_profile or {}
        timeline_scope = temporal_profile.get("timeline_scope", "GENERAL")
        strict_temporal = temporal_profile.get("strict_date_filtering", False)

        # 1. Aggregate evidence signals across retrieved articles
        if not evidence_items:
            # No evidence path
            max_rel = 10.0
            max_rel_source = 10.0
            max_directness = 10.0
            max_temporal = 50.0
            sup_strength = 10.0
            contra_strength = 10.0
            corrob_score = 0.0
            has_stale_evidence = False
            sup_items = []
            contra_items = []
        else:
            max_rel = max(float(e.get("relevance_score", 0.0)) for e in evidence_items)
            max_rel_source = max(float(e.get("source_reliability", 0.0)) for e in evidence_items)
            max_directness = max(float(e.get("directness_score", 0.0)) for e in evidence_items)
            max_temporal = max(float(e.get("temporal_match_score", 50.0)) for e in evidence_items)
            has_stale_evidence = any(e.get("temporal_is_stale", False) for e in evidence_items)

            # Separate supporting and contradicting pools
            sup_items = [e for e in evidence_items if e.get("stance") == "SUPPORTING"]
            contra_items = [e for e in evidence_items if e.get("stance") == "CONTRADICTING"]

            sup_strength = max([float(e.get("support_score", 0.0)) for e in sup_items], default=10.0)
            contra_strength = max([float(e.get("contradiction_score", 0.0)) for e in contra_items], default=10.0)

            # Corroboration score mapped from independent source count
            corrob_score = min(100.0, independent_sources_count * 30.0)

        # 2. Execute FIS Simulation
        raw_sup = 15.0
        raw_contra = 15.0

        try:
            sim = ctrl.ControlSystemSimulation(self.control_system)
            sim.input["banglabert_confidence"] = float(np.clip(banglabert_confidence * 100.0, 0, 100))
            sim.input["evidence_relevance"] = float(np.clip(max_rel, 0, 100))
            sim.input["source_reliability"] = float(np.clip(max_rel_source, 0, 100))
            sim.input["evidence_directness"] = float(np.clip(max_directness, 0, 100))
            sim.input["independent_corroboration"] = float(np.clip(corrob_score, 0, 100))
            sim.input["temporal_relevance"] = float(np.clip(max_temporal, 0, 100))
            sim.input["supporting_evidence_strength"] = float(np.clip(sup_strength, 0, 100))
            sim.input["contradicting_evidence_strength"] = float(np.clip(contra_strength, 0, 100))

            sim.compute()
            raw_sup = float(sim.output.get("support_score", 15.0))
            raw_contra = float(sim.output.get("contradiction_score", 15.0))
        except Exception as sim_err:
            # Defuzzification fallback: rule-weighted centroid estimate
            if sup_strength > 65.0 and max_rel_source > 75.0 and contra_strength < 30.0:
                raw_sup = min(96.0, 0.6 * sup_strength + 0.4 * max_rel_source)
                raw_contra = 10.0
            elif contra_strength > 65.0 and max_rel_source > 75.0 and sup_strength < 30.0:
                raw_contra = min(96.0, 0.6 * contra_strength + 0.4 * max_rel_source)
                raw_sup = 10.0
            else:
                raw_sup = 20.0
                raw_contra = 20.0

        # -------------------------------------------------------------
        # 3. Explicit Authority & Direct Evidence Override Policy
        # -------------------------------------------------------------
        # A direct official primary source or verified official news media confirming/contradicting must override uncertain model
        primary_official_support = any(
            e.get("stance") == "SUPPORTING" and
            float(e.get("source_reliability", 0.0)) >= 90.0 and
            float(e.get("directness_score", 0.0)) >= 60.0 and
            float(e.get("temporal_match_score", 0.0)) >= 60.0
            for e in evidence_items
        )

        primary_official_contra = any(
            e.get("stance") == "CONTRADICTING" and
            float(e.get("source_reliability", 0.0)) >= 90.0 and
            float(e.get("directness_score", 0.0)) >= 60.0 and
            float(e.get("temporal_match_score", 0.0)) >= 60.0
            for e in evidence_items
        )

        if primary_official_support and not primary_official_contra:
            raw_sup = max(raw_sup, 94.5)
            raw_contra = min(raw_contra, 8.5)
        elif primary_official_contra and not primary_official_support:
            raw_contra = max(raw_contra, 94.5)
            raw_sup = min(raw_sup, 8.5)

        # Conflicting evidence check (both sides strong)
        is_conflicted = (sup_strength >= 60.0 and contra_strength >= 60.0) or (raw_sup >= 50.0 and raw_contra >= 50.0)

        # Reputable news with multiple independent confirmations override (Web Evidence Dominance)
        # User requirement: If supported web sources are abundant, prioritize web result fuzzy mainly
        num_supporting = len(sup_items)
        num_contradicting = len(contra_items)
        no_external_stance = (num_supporting == 0 and num_contradicting == 0)

        norm_label = (banglabert_label or "").strip().upper()
        conf_pct = float(np.clip(banglabert_confidence * 100.0, 0, 100))

        if not is_conflicted and contra_strength < 40.0:
            if num_supporting >= 2 and sup_strength >= 55.0 and max_rel_source >= 65.0:
                # Strong corroboration across multiple media/official outlets
                boosted_sup = 88.0 + min(8.0, num_supporting * 2.5)
                raw_sup = max(raw_sup, boosted_sup)
                raw_contra = min(raw_contra, 10.0)
            elif num_supporting >= 1 and sup_strength >= 65.0 and max_rel_source >= 80.0:
                raw_sup = max(raw_sup, 88.0)
                raw_contra = min(raw_contra, 12.0)

        # -------------------------------------------------------------
        # User requirement: If NO supporting or contradictory news or notice found,
        # it should mostly rely on the BanglaBERT model result.
        # -------------------------------------------------------------
        if no_external_stance and not (primary_official_support or primary_official_contra):
            if norm_label in ("RUMOR", "RUMOUR", "FAKE"):
                # BanglaBERT detected rumor patterns
                raw_contra = max(68.0, conf_pct)
                raw_sup = min(20.0, max(5.0, 100.0 - conf_pct))
            elif norm_label in ("AUTHENTIC", "NON-RUMOUR", "NON-RUMOR", "REAL"):
                # BanglaBERT evaluated statement as authentic/plausible
                raw_sup = max(68.0, conf_pct)
                raw_contra = min(20.0, max(5.0, 100.0 - conf_pct))
            else:
                # Model uncertain
                raw_sup = 35.0
                raw_contra = 35.0

        # Low credibility blog check: a weak source (reliability < 40) must NOT elevate support
        if max_rel_source < 40.0 and not primary_official_support and not no_external_stance:
            raw_sup = min(raw_sup, 35.0)

        # Outdated news check: if temporal match is very low (< 40), evidence is stale
        if max_temporal < 40.0 and not (primary_official_support and max_temporal >= 40.0) and not no_external_stance:
            raw_sup = min(raw_sup, 35.0)
            raw_contra = min(raw_contra, 35.0)

        # If conflicted, balance the scores and ensure neither dominates
        if is_conflicted and not (primary_official_support and not primary_official_contra):
            raw_sup = 55.0
            raw_contra = 55.0

        support_score = round(float(raw_sup), 1)
        contradiction_score = round(float(raw_contra), 1)
        margin = round(abs(support_score - contradiction_score), 1)

        # -------------------------------------------------------------
        # 4. Final Verdict Mapping
        # -------------------------------------------------------------
        if is_conflicted:
            verdict = "UNVERIFIED"
            display_label = "Conflicting evidence detected — Unverified"
        elif support_score >= 60.0 and (support_score - contradiction_score) >= 20.0:
            verdict = "SUPPORTED"
            display_label = "Classified as Authentic by BanglaBERT AI Model" if no_external_stance else "Supported by authoritative evidence"
        elif contradiction_score >= 60.0 and (contradiction_score - support_score) >= 20.0:
            verdict = "CONTRADICTED"
            display_label = "Flagged as Rumour by BanglaBERT AI Model" if no_external_stance else "Contradicted by authoritative clarification"
        else:
            verdict = "UNVERIFIED"
            display_label = "Insufficient authoritative evidence — Unverified"

        # -------------------------------------------------------------
        # 5. Bilingual Explanations
        # -------------------------------------------------------------
        is_temporally_stale = has_stale_evidence or (strict_temporal and max_temporal < 40.0)

        explanation = self._generate_explanation(
            verdict=verdict,
            evidence_items=evidence_items,
            support_score=support_score,
            contra_score=contradiction_score,
            primary_override=primary_official_support or primary_official_contra,
            is_conflicted=is_conflicted,
            temporal_stale=is_temporally_stale,
            timeline_scope=timeline_scope,
            no_external_stance=no_external_stance
        )

        return {
            "verdict": verdict,
            "display_label": display_label,
            "support_score": support_score,
            "contradiction_score": contradiction_score,
            "decision_margin": margin,
            "explanation": explanation
        }

    def _generate_explanation(
        self,
        verdict: str,
        evidence_items: List[Dict[str, Any]],
        support_score: float,
        contra_score: float,
        primary_override: bool,
        is_conflicted: bool,
        temporal_stale: bool,
        timeline_scope: str = "GENERAL",
        no_external_stance: bool = False
    ) -> Dict[str, str]:
        top_sup = next((e for e in evidence_items if e.get("stance") == "SUPPORTING"), None)
        top_contra = next((e for e in evidence_items if e.get("stance") == "CONTRADICTING"), None)

        if no_external_stance:
            if verdict == "CONTRADICTED":
                en = f"No supporting or contradictory news or official notice was found online. Relying on the BanglaBERT neural model, the claim was flagged as a rumour with {int(contra_score)}% confidence based on linguistic patterns."
                bn = f"অনলাইনে এই তথ্যের সপক্ষে বা বিপক্ষে কোনো সংবাদ বা প্রজ্ঞাপন পাওয়া যায়নি। বাংলাবার্ট নিউরাল এআই মডেল ভাষাগত ও কাঠামোগত বিশ্লেষণের ভিত্তিতে দাবিটিকে {int(contra_score)}% আত্মবিশ্বাসে 'গুজব' হিসেবে চিহ্নিত করেছে।"
            elif verdict == "SUPPORTED":
                en = f"No direct news or circulars were found online. Relying on the BanglaBERT neural model, the statement was evaluated as authentic or plausible with {int(support_score)}% confidence."
                bn = f"অনলাইনে কোনো নির্দিষ্ট সংবাদ বা সরকারি প্রজ্ঞাপন পাওয়া যায়নি। বাংলাবার্ট নিউরাল মডেল ভাষাগত গঠনের বিচারে তথ্যটিকে {int(support_score)}% আত্মবিশ্বাসে নির্ভরযোগ্য বা বাস্তবিক বলে মূল্যায়ন করেছে।"
            elif temporal_stale and timeline_scope in ("DAY", "MONTH"):
                en = f"The claim references a specific timeline ({timeline_scope}), but retrieved matching articles are outdated reports from previous years. No current official announcement exists for the requested period. Recycled old news cannot substantiate a current notice."
                bn = f"দাবিটিতে নির্দিষ্ট সময়সীমার (যেমন: আজকে/আগামীকাল/চলতি সময়) কথা বলা হয়েছে, কিন্তু ইন্টারনেটে প্রাপ্ত প্রতিবেদনগুলো বিগত বছরগুলোর পুরোনো খবর। বর্তমান তারিখের জন্য কোনো নতুন সরকারি প্রজ্ঞাপন নেই। পুরোনো খবর দিয়ে বর্তমানের তথ্য সত্য বলা যাবে না।"
            else:
                en = "No supporting or contradictory news or notices were found online, and the BanglaBERT neural model evaluation remains uncertain."
                bn = "দাবিটির সপক্ষে বা বিপক্ষে কোনো সংবাদ বা প্রজ্ঞাপন পাওয়া যায়নি এবং বাংলাবার্ট এআই মডেলেও কোনো নিশ্চিত সিদ্ধান্ত মেলেনি।"
        elif verdict == "SUPPORTED":
            source_name = (top_sup.get("publisher") or top_sup.get("source_name") or top_sup.get("title") or "authoritative sources") if top_sup else "official sources"
            num_sup = sum(1 for e in evidence_items if e.get("stance") == "SUPPORTING")
            if num_sup > 1:
                en = f"The submitted claim is corroborated and confirmed by multiple independent news outlets and verified sources including '{source_name}' ({num_sup} supporting reports, Fuzzy confidence: {support_score}%)."
                bn = f"দাবিটির পক্ষে {source_name} সহ একাধিক মূলধারার সংবাদমাধ্যম ও নির্ভরযোগ্য উৎসের নিশ্চিত প্রতিবেদন পাওয়া গেছে (মোট {num_sup}টি সমর্থক সূত্র, ফাজি সাপোর্ট স্কোর: {support_score}%)।"
            else:
                en = f"The submitted claim is confirmed by verified authoritative evidence from '{source_name}'. Fuzzy logic decision confidence is {support_score}%."
                bn = f"দাবিটির পক্ষে {source_name} এর প্রকাশিত নির্ভরযোগ্য প্রজ্ঞাপন বা সংবাদ প্রতিবেদন পাওয়া গেছে (ফাজি সাপোর্ট স্কোর: {support_score}%)।"
        elif verdict == "CONTRADICTED":
            source_name = (top_contra.get("publisher") or top_contra.get("title") or "authoritative authorities") if top_contra else "official bodies"
            en = f"Official announcements and reports from '{source_name}' directly contradict and refute this claim as unfounded (Fuzzy contradiction score: {contra_score}%)."
            bn = f"{source_name} এর অফিশিয়াল স্পষ্টীকরণ ও তথ্য অনুযায়ী দাবিটি ভিত্তিহীন বা অসত্য প্রমাণিত হয়েছে (ফাজি খণ্ডন স্কোর: {contra_score}%)।"
        elif is_conflicted:
            en = "Contradictory reports were identified from multiple sources without definitive resolution. Further verification is advised."
            bn = "বিভিন্ন উৎস থেকে পরস্পরবিরোধী তথ্য পাওয়ায় চূড়ান্ত সিদ্ধান্তে পৌঁছানো সম্ভব হয়নি। বিষয়টি এখনও অসত্যায়িত রয়েছে।"
        elif temporal_stale and timeline_scope in ("DAY", "MONTH"):
            en = f"The claim references a specific timeline ({timeline_scope}), but retrieved matching articles are outdated reports from previous years. No current official announcement exists for the requested period. Recycled old news cannot substantiate a current notice."
            bn = f"দাবিটিতে নির্দিষ্ট সময়সীমার (যেমন: আজকে/আগামীকাল/চলতি সময়) কথা বলা হয়েছে, কিন্তু ইন্টারনেটে প্রাপ্ত প্রতিবেদনগুলো বিগত বছরগুলোর পুরোনো খবর। বর্তমান তারিখের জন্য কোনো নতুন সরকারি প্রজ্ঞাপন নেই। পুরোনো খবর দিয়ে বর্তমানের তথ্য সত্য বলা যাবে না।"
        elif temporal_stale:
            en = "Matching articles were found from past dates, but no current announcement substantiates this specific event."
            bn = "সম্পর্কিত পুরনো খবর পাওয়া গেলেও বর্তমান তারিখের জন্য কোনো নিশ্চিত ঘোষণা পাওয়া যায়নি।"
        else:
            en = "No authoritative government circular, gazette notice, or established news report corroborates the claim at this time."
            bn = "দাবিটির পক্ষে বা বিপক্ষে কোনো সরকারি প্রজ্ঞাপন, গেজেট বা মূলধারার গণমাধ্যমের নিশ্চিত প্রতিবেদন পাওয়া যায়নি।"

        return {
            "english": en,
            "bangla": bn
        }
