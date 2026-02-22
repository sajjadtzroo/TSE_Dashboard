"""
Risk profiling scoring service.
Server-side scoring mirrors frontend logic + CFA L3 willingness/ability reconciliation.
"""

from datetime import UTC, datetime, timedelta

# ── Question definitions (mirrored from frontend constants) ─────────────────

QUESTIONS = [
    {"id": "q1", "dimension": "ability", "max": 10},
    {"id": "q2", "dimension": "ability", "max": 10},
    {"id": "q3", "dimension": "ability", "max": 10},
    {"id": "q4", "dimension": "ability", "max": 10},
    {"id": "q5", "dimension": "willingness", "max": 10},
    {"id": "q6", "dimension": "willingness", "max": 10},
    {"id": "q7", "dimension": "ability", "max": 10},
    {"id": "q8", "dimension": "willingness", "max": 10},
    {"id": "q9", "dimension": "willingness", "max": 10},
    {"id": "q10", "dimension": "willingness", "max": 10},
    {"id": "q11", "dimension": "willingness", "max": 10},
    {"id": "q12", "dimension": "willingness", "max": 10},
]

MAX_SCORE = 120

RISK_CATEGORIES = [
    {"key": "conservative", "range": (0, 20), "allocation": {"stocks": 10, "etfs": 40, "crypto": 0, "options": 0, "bonds": 50}},
    {"key": "moderate_conservative", "range": (21, 40), "allocation": {"stocks": 25, "etfs": 35, "crypto": 0, "options": 0, "bonds": 40}},
    {"key": "moderate", "range": (41, 60), "allocation": {"stocks": 40, "etfs": 25, "crypto": 5, "options": 0, "bonds": 30}},
    {"key": "moderate_aggressive", "range": (61, 80), "allocation": {"stocks": 55, "etfs": 15, "crypto": 10, "options": 5, "bonds": 15}},
    {"key": "aggressive", "range": (81, 100), "allocation": {"stocks": 50, "etfs": 10, "crypto": 20, "options": 10, "bonds": 10}},
]


def compute_risk_score(answers: dict) -> dict:
    """
    Compute risk profile from questionnaire answers.

    CFA L3 IPS reconciliation:
    final = min(ability, willingness) * 0.6 + composite * 0.4

    Returns dict with all scores and category info.
    """
    total_score = 0
    ability_sum = 0
    ability_count = 0
    willingness_sum = 0
    willingness_count = 0

    for q in QUESTIONS:
        val = answers.get(q["id"])
        if val is None:
            continue
        val = int(val)
        total_score += val
        if q["dimension"] == "ability":
            ability_sum += val
            ability_count += 1
        else:
            willingness_sum += val
            willingness_count += 1

    composite = round((total_score / MAX_SCORE) * 100, 2) if MAX_SCORE > 0 else 0
    ability = round((ability_sum / (ability_count * 10)) * 100, 2) if ability_count > 0 else 0
    willingness = round((willingness_sum / (willingness_count * 10)) * 100, 2) if willingness_count > 0 else 0

    # CFA L3 IPS reconciliation: conservative bias
    final = round(min(ability, willingness) * 0.6 + composite * 0.4, 2)

    # Find category based on final score
    category = "moderate"
    allocation = RISK_CATEGORIES[2]["allocation"]
    for cat in RISK_CATEGORIES:
        if cat["range"][0] <= final <= cat["range"][1]:
            category = cat["key"]
            allocation = cat["allocation"]
            break

    return {
        "composite_score": composite,
        "ability_score": ability,
        "willingness_score": willingness,
        "final_score": final,
        "profile_category": category,
        "target_allocation": allocation,
        "expires_at": datetime.now(UTC) + timedelta(days=365),
    }
