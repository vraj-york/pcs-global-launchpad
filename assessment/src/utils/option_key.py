"""
Server-generated option_key slug (matches assessment db_seeder format).

Format: {life_context[:2]}{situation[:1]}-{question_order}-{color}
Example: professional + typical + order 1 + red → prt-1-red
"""


def make_option_key(situation: str, life_context: str, question_order: int, color: str) -> str:
    # Score engine expects per-quadrant indexing 1..15 (prt/prs/pet/pes).
    # Our DB question_order is globally 1..60, so normalize it into 1..15.
    idx = ((int(question_order) - 1) % 15) + 1
    return f"{life_context[:2]}{situation[:1]}-{idx}-{color}"
