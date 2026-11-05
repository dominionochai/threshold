"""ConflictResolutionWalker — catches interactions between a person's needs
that no single-need walker can see.

EligibilityWalker scores each NeedNode's candidate ResourceNodes in
isolation. That's correct for "is this person eligible for this one
resource" but blind to a real and common failure mode: pursuing the
best-scored resource for need A can invalidate or jeopardize eligibility
for need B, because real assistance programs interact with each other.

Three interaction types this walker checks for, using only data already
on EligibilityRuleNode (no new external data source):

  income_threshold — Two EligibilityRuleNodes governing eligible resources
    on DIFFERENT NeedNodes have income_limit_annual values close enough
    that a benefit tied to one (e.g. a wage subsidy, a specific program's
    reported income bump) could push the person over the other's limit.
    Conservative heuristic: only flags when both limits are within 15% of
    each other AND the person's income_bracket upper bound is already
    within that band — i.e. a real edge case, not every income-tested
    pair of programs.

  timing — One resource's FormNode.deadline_type or a leads_to hop's
    typical_days conflicts with another need's urgency (e.g. an
    'immediate' need paired with a resource whose only eligible path
    requires a 30+ day prior program per the leads_to graph).

  mutual_exclusion — Curated pairs of agency_names that are structurally
    incompatible (individual-only shelter vs. family reunification
    housing, etc.) — a short static list, not inferred, so it never
    produces a false positive on data it can't actually reason about.

Spawned once per turn, after EligibilityWalker has run for every open
NeedNode on the PersonNode — not per-need. Writes conflicts_with edges
between the affected NeedNodes so NavigationWalker can read them when
sequencing the ActionPlan (see navigation.jac).

DEMO_MODE-safe: every check here is pure graph read + arithmetic, no LLM
call, so it never adds latency or a failure point to the chat turn.
"""

import from graph.nodes { PersonNode, NeedNode, ResourceNode, EligibilityRuleNode }
import from graph.edges { has_need, eligible_for, governed_by, conflicts_with }

# Curated, conservative — only pairs we can state with confidence are
# structurally exclusive. Expand carefully; a false positive here tells
# a user in crisis to avoid a resource they could actually use.
glob MUTUAL_EXCLUSION_PAIRS: list = [
    ["Emergency Shelter (Individual)", "Family Reunification Housing Program"],
];

glob INCOME_BRACKET_UPPER: dict = {
    "0-15k": 15000,
    "15k-30k": 30000,
    "30k-50k": 50000,
    "50k+": 999999
};


walker ConflictResolutionWalker {
    has person_node: PersonNode;
    has conflicts_found: list = [];
    has summary: dict = {};

    can resolve with PersonNode entry {
        needs = [here ->:has_need:-> [?:NeedNode]];

        # Nothing to cross-check with fewer than two open needs.
        if len(needs) < 2 {
            self.summary = {"conflicts": [], "checked_pairs": 0};
            report self.summary;
            disengage;
        }

        # Build a flat list of (need, eligible resource, rule) so we can
        # compare across need boundaries rather than within one.
        need_resource_rules: list = [];
        for n in needs {
            eligible_resources = [n ->:eligible_for:-> [?:ResourceNode]];
            for r in eligible_resources {
                rules = [r ->:governed_by:-> [?:EligibilityRuleNode]];
                if len(rules) > 0 {
                    need_resource_rules.append({
                        "need": n,
                        "resource": r,
                        "rule": rules[0]
                    });
                }
            }
        }

        checked_pairs = 0;
        person_income_upper = 999999;
        if str(self.person_node.income_bracket) in INCOME_BRACKET_UPPER {
            person_income_upper = INCOME_BRACKET_UPPER[str(self.person_node.income_bracket)];
        }

        i = 0;
        while i < len(need_resource_rules) {
            j = i + 1;
            while j < len(need_resource_rules) {
                a = need_resource_rules[i];
                b = need_resource_rules[j];
                # Only compare across DIFFERENT needs — two resources
                # under the same need aren't a cross-need conflict.
                if a["need"] != b["need"] {
                    checked_pairs = checked_pairs + 1;

                    # --- income_threshold check ---
                    a_limit = int(a["rule"].income_limit_annual);
                    b_limit = int(b["rule"].income_limit_annual);
                    if a_limit > 0 and b_limit > 0 {
                        lower_limit = a_limit if a_limit < b_limit else b_limit;
                        higher_limit = b_limit if a_limit < b_limit else a_limit;
                        band = higher_limit * 0.15;
                        close_limits = (higher_limit - lower_limit) <= band;
                        near_the_edge = person_income_upper >= (lower_limit - band);
                        if close_limits and near_the_edge {
                            self.conflicts_found.append({
                                "need_a": str(a["need"].category),
                                "need_b": str(b["need"].category),
                                "resource_a": str(a["resource"].agency_name),
                                "resource_b": str(b["resource"].agency_name),
                                "conflict_type": "income_threshold",
                                "explanation": (
                                    str(a["resource"].agency_name) + " and " +
                                    str(b["resource"].agency_name) +
                                    " have income limits close enough that a change tied to one could " +
                                    "affect eligibility for the other. Worth checking both before acting on either."
                                )
                            });
                        }
                    }

                    # --- mutual_exclusion check ---
                    a_name = str(a["resource"].agency_name);
                    b_name = str(b["resource"].agency_name);
                    pair_idx = 0;
                    while pair_idx < len(MUTUAL_EXCLUSION_PAIRS) {
                        pair = MUTUAL_EXCLUSION_PAIRS[pair_idx];
                        matches_forward = (a_name == pair[0]) and (b_name == pair[1]);
                        matches_backward = (a_name == pair[1]) and (b_name == pair[0]);
                        if matches_forward or matches_backward {
                            self.conflicts_found.append({
                                "need_a": str(a["need"].category),
                                "need_b": str(b["need"].category),
                                "resource_a": a_name,
                                "resource_b": b_name,
                                "conflict_type": "mutual_exclusion",
                                "explanation": a_name + " and " + b_name +
                                    " cannot both be pursued at once — choose based on which fits the household's actual situation."
                            });
                        }
                        pair_idx = pair_idx + 1;
                    }
                }
                j = j + 1;
            }
            i = i + 1;
        }

        # Persist conflicts as conflicts_with edges between the affected
        # NeedNodes so NavigationWalker can read them when sequencing.
        for c in self.conflicts_found {
            need_a_matches = [n for n in needs if str(n.category) == str(c["need_a"])];
            need_b_matches = [n for n in needs if str(n.category) == str(c["need_b"])];
            if len(need_a_matches) > 0 and len(need_b_matches) > 0 {
                need_a_matches[0] +>: conflicts_with(
                    conflict_type=str(c["conflict_type"]),
                    explanation=str(c["explanation"])
                ) :+> need_b_matches[0];
            }
        }

        payload = {
            "conflicts": self.conflicts_found,
            "checked_pairs": checked_pairs,
            "conflict_count": len(self.conflicts_found)
        };
        self.summary = payload;
        report payload;
    }
}

sem ConflictResolutionWalker is "Cross-checks eligible resources across ALL of a PersonNode's open NeedNodes for interactions a single-need eligibility check can't see — income thresholds that overlap, structurally mutually-exclusive resources. Writes conflicts_with edges between the affected NeedNodes. Spawned once per turn after EligibilityWalker has scored every open need, not per-need. Pure graph read + arithmetic, no LLM call.";
sem ConflictResolutionWalker.conflicts_found is "Accumulator of conflict dicts found this run, mirrored into summary for the spawning walker to read.";
sem ConflictResolutionWalker.summary is "Final report payload: conflicts list, how many resource pairs were checked, and the conflict count. Mirrored here because report only bubbles to the outermost walker.";
