
from dataclasses import dataclass
from typing import Any
from bsp_score_engine.constants import *  # noqa: F403



@dataclass(frozen=True)
class QuadrantSums:
    blue: float
    red: float
    green: float
    grey: float

    @property
    def energy(self) -> float:
        return self.blue + self.red + self.green - self.grey



def get_quadrant(bspinfo: dict[str, Any], prefix: str) -> QuadrantSums:
    """Sum blue/red/green/grey for one quadrant (15 questions)."""
    b = r = g = gr = 0.0
    for i in range(1, 16):
        b += float(bspinfo.get(f"{prefix}-{i}-blue", 0) or 0)
        r += float(bspinfo.get(f"{prefix}-{i}-red", 0) or 0)
        g += float(bspinfo.get(f"{prefix}-{i}-green", 0) or 0)
        gr += float(bspinfo.get(f"{prefix}-{i}-grey", 0) or 0)
    return QuadrantSums(blue=b, red=r, green=g, grey=gr)


def add_quadrants(a: QuadrantSums, b: QuadrantSums, mult: float) -> QuadrantSums:
    return QuadrantSums(
        blue=(a.blue + b.blue) * mult,
        red=(a.red + b.red) * mult,
        green=(a.green + b.green) * mult,
        grey=(a.grey + b.grey) * mult,
    )


def scale_quadrant(q: QuadrantSums, mult: float) -> QuadrantSums:
    return QuadrantSums(
        blue=q.blue * mult,
        red=q.red * mult,
        green=q.green * mult,
        grey=q.grey * mult,
    )


def rank_colors(green: float, red: float, grey: float) -> tuple[str, str, str, float, float, float]:
    """
    Returns (highest_color, second_color, lowest_color, highest_val, second_val, lowest_val).
    Only green, red, grey are ranked (blue excluded).
    """
    order = [
        ("green", green),
        ("red", red),
        ("grey", grey),
    ]
    order.sort(key=lambda x: -x[1])
    high_c, high_v = order[0]
    sec_c, sec_v = order[1]
    low_c, low_v = order[2]
    return high_c, sec_c, low_c, high_v, sec_v, low_v


def decode_single(
    green: float,
    red: float,
    grey: float,
    divisor: float,
    style_names: tuple[str, ...],
) -> tuple[str, str, int]:
    """
    Single-quadrant decoder (PRT, PRS, PET, PES).
    Thresholds: diff >= 33 basic, 12--32 plural, else split; adaptarian if high - low <= 10.
    Returns (type, style_name, oct).
    """
    hi_c, sec_c, low_c, hi_v, sec_v, low_v = rank_colors(green, red, grey)
    diff = hi_v - sec_v
    spread = hi_v - low_v

    # Adaptarian override
    if spread <= 10:
        return "split", style_names[12], 13  # adaptarian

    if diff >= 33:
        # basic
        if hi_c == "red":
            return "basic", style_names[11], 12   # authoritarian
        if hi_c == "green":
            return "basic", style_names[3], 4     # nurturitarian
        return "basic", style_names[7], 8        # solitarian
    if 12 <= diff <= 32:
        # plural
        if hi_c == "red":
            if low_c == "grey":
                return "plural", style_names[0], 1   # pioneer
            return "plural", style_names[10], 11    # competitor
        if hi_c == "green":
            if low_c == "red":
                return "plural", style_names[4], 5  # advocate
            return "plural", style_names[2], 3       # gregarian
        # grey highest
        if low_c == "green":
            return "plural", style_names[8], 9   # philosopher
        return "plural", style_names[6], 7       # geek
    # split
    if (hi_c == "red" and sec_c == "green") or (hi_c == "green" and sec_c == "red"):
        return "split", style_names[1], 2   # enthusitarian
    if (hi_c == "red" and sec_c == "grey") or (hi_c == "grey" and sec_c == "red"):
        return "split", style_names[9], 10  # innovitarian
    return "split", style_names[5], 6         # humanitarian


def decode_combo(
    green: float,
    red: float,
    grey: float,
    style_names: tuple[str, ...],
) -> tuple[str, str]:
    """
    Combo decoder (professional/personal/typical/stressful).
    Thresholds: diff >= 65 basic, 23--64 plural, else split; adaptarian if high - low <= 21.
    Returns (type, style_name). No oct in combo in PHP.
    """
    hi_c, sec_c, low_c, hi_v, sec_v, low_v = rank_colors(green, red, grey)
    diff = hi_v - sec_v
    spread = hi_v - low_v

    if spread <= 21:
        return "split", style_names[12]  # adaptarian

    if diff >= 65:
        if hi_c == "red":
            return "basic", style_names[11]
        if hi_c == "green":
            return "basic", style_names[3]
        return "basic", style_names[7]
    if 23 <= diff <= 64:
        if hi_c == "red":
            if low_c == "grey":
                return "plural", style_names[0]
            return "plural", style_names[10]
        if hi_c == "green":
            if low_c == "red":
                return "plural", style_names[4]
            return "plural", style_names[2]
        if low_c == "green":
            return "plural", style_names[8]
        return "plural", style_names[6]
    if (hi_c == "red" and sec_c == "green") or (hi_c == "green" and sec_c == "red"):
        return "split", style_names[1]
    if (hi_c == "red" and sec_c == "grey") or (hi_c == "grey" and sec_c == "red"):
        return "split", style_names[9]
    return "split", style_names[5]


def decode_overall(
    green: float,
    red: float,
    grey: float,
    style_names: tuple[str, ...],
) -> tuple[str, str, str]:
    """
    Overall decoder. Thresholds: diff >= 129 basic, 45--128 plural, else split;
    adaptarian if odiff <= 43. Returns (type, style_name, octnumber).
    """
    hi_c, sec_c, low_c, hi_v, sec_v, low_v = rank_colors(green, red, grey)
    diff = hi_v - sec_v
    odiff = hi_v - low_v

    if odiff <= 43:
        return "split", "adaptarian", STYLE_TO_OCT["adaptarian"]

    if diff >= 129:
        if hi_c == "red":
            return "basic", "authoritarian", "12"
        if hi_c == "green":
            return "basic", "nurturitarian", "4"
        return "basic", "solitarian", "8"
    if 45 <= diff <= 128:
        if hi_c == "red":
            if low_c == "grey":
                return "plural", "pioneer", "1"
            return "plural", "competitor", "11"
        if hi_c == "green":
            if low_c == "red":
                return "plural", "advocate", "5"
            return "plural", "gregarian", "3"
        if low_c == "green":
            return "plural", "philosopher", "9"
        return "plural", "geek", "7"
    if (hi_c == "red" and sec_c == "green") or (hi_c == "green" and sec_c == "red"):
        return "split", "enthusitarian", "2"
    if (hi_c == "red" and sec_c == "grey") or (hi_c == "grey" and sec_c == "red"):
        return "split", "innovitarian", "10"
    return "split", "humanitarian", "6"


def oct_for_style(style: str) -> str:
    """Map style name to oct number (for overall cclientStyle)."""
    return STYLE_TO_OCT.get(style, "11")