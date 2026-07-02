"""
BSP Assessment Score Engine.
"""
from bsp_score_engine.constants import *  # noqa: F403
from bsp_score_engine.utils import *  # noqa: F403


def generate_bsp_score(bspinfo: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    BSP score engine.

    bspinfo keys: questionnaire_type, prt-1-blue .. prt-15-grey, prs-*, pet-*, pes-*,
    and optionally started, finished, reviewed, viewed, archive.
    """
    bspinfo = bspinfo or {}
    is_12 = (bspinfo.get("questionnaire_type") == 12) or False
    mult = 5.0 if is_12 else 1.0
    style_names = STYLES

    prt = get_quadrant(bspinfo, "prt")
    prs = get_quadrant(bspinfo, "prs")
    pet = get_quadrant(bspinfo, "pet")
    pes = get_quadrant(bspinfo, "pes")

    prt = scale_quadrant(prt, mult)
    prs = scale_quadrant(prs, mult)
    pet = scale_quadrant(pet, mult)
    pes = scale_quadrant(pes, mult)

    # Percentages (single)
    def pct(v: float, base: float = SINGLE) -> float:
        return (v / base) * 100.0

    # --- Professional typical ---
    pt_type, pt_style, pt_oct = decode_single(
        prt.green, prt.red, prt.grey, SINGLE, style_names
    )
    # --- Professional stressful ---
    ps_type, ps_style, ps_oct = decode_single(
        prs.green, prs.red, prs.grey, SINGLE, style_names
    )
    # --- Personal typical ---
    pet_type, pet_style, pet_oct = decode_single(
        pet.green, pet.red, pet.grey, SINGLE, style_names
    )
    # --- Personal stressful ---
    pes_type, pes_style, pes_oct = decode_single(
        pes.green, pes.red, pes.grey, SINGLE, style_names
    )

    # Combo quadrants (double)
    pr = QuadrantSums(prt.blue + prs.blue, prt.red + prs.red, prt.green + prs.green, prt.grey + prs.grey)
    pe = QuadrantSums(pet.blue + pes.blue, pet.red + pes.red, pet.green + pes.green, pet.grey + pes.grey)
    tq = QuadrantSums(prt.blue + pet.blue, prt.red + pet.red, prt.green + pet.green, prt.grey + pet.grey)
    sq = QuadrantSums(prs.blue + pes.blue, prs.red + pes.red, prs.green + pes.green, prs.grey + pes.grey)

    pr_combo_type, pr_combo_style = decode_combo(pr.green, pr.red, pr.grey, style_names)
    pe_combo_type, pe_combo_style = decode_combo(pe.green, pe.red, pe.grey, style_names)
    t_combo_type, t_combo_style = decode_combo(tq.green, tq.red, tq.grey, style_names)
    s_combo_type, s_combo_style = decode_combo(sq.green, sq.red, sq.grey, style_names)

    s_combo_oct = 12 if s_combo_style == style_names[11] else (4 if s_combo_style == style_names[3] else 8)
    
    if 23 <= (max(sq.green, sq.red, sq.grey) - min(sq.green, sq.red, sq.grey)) <= 64 or (max(sq.green, sq.red, sq.grey) - min(sq.green, sq.red, sq.grey)) > 65:
        pass  # s_combo_oct already set by style
    else:
        hi, _, _, hv, _, lv = rank_colors(sq.green, sq.red, sq.grey)
        if hv - lv <= 21:
            s_combo_oct = 13
        elif s_combo_style == style_names[1]:
            s_combo_oct = 2
        elif s_combo_style == style_names[9]:
            s_combo_oct = 10
        elif s_combo_style == style_names[5]:
            s_combo_oct = 6
        else:
            s_combo_oct = 12 if s_combo_style == style_names[11] else (4 if s_combo_style == style_names[3] else 8)

    # Stressful combo oct: old implementation sets stressful_combo_oct in branches (12, 4, 8, 1, 11, 5, 3, 9, 7, 2, 10, 6, 13)
    def stressful_oct(stype: str, sstyle: str) -> int:
        if stype == "basic":
            return 12 if sstyle == style_names[11] else (4 if sstyle == style_names[3] else 8)
        if stype == "plural":
            if sstyle == style_names[0]: return 1
            if sstyle == style_names[10]: return 11
            if sstyle == style_names[4]: return 5
            if sstyle == style_names[2]: return 3
            if sstyle == style_names[8]: return 9
            return 7
        if sstyle == style_names[1]: return 2
        if sstyle == style_names[9]: return 10
        if sstyle == style_names[5]: return 6
        return 13
    s_combo_oct = stressful_oct(s_combo_type, s_combo_style)

    # Overall (full)
    cblue = prt.blue + prs.blue + pet.blue + pes.blue
    cred = prt.red + prs.red + pet.red + pes.red
    cgreen = prt.green + prs.green + pet.green + pes.green
    cgrey = prt.grey + prs.grey + pet.grey + pes.grey
    cenergy = cblue + cred + cgreen - cgrey
    odiff_val = max(cgreen, cred, cgrey) - min(cgreen, cred, cgrey)
    c_type, c_style, octnumber = decode_overall(cgreen, cred, cgrey, style_names)

    # Build result mirroring PHP return keys (including typo prtsecondHighestColor etc.)
    def get_meta(key: str) -> Any:
        return bspinfo.get(key)

    return {
        "is_12_questionnaire": is_12,
        "single": SINGLE,
        "double": DOUBLE,
        "full": FULL,
        "multiplier": mult,
        "pioneer": style_names[0],
        "enthusitarian": style_names[1],
        "gregarian": style_names[2],
        "nurturitarian": style_names[3],
        "advocate": style_names[4],
        "humanitarian": style_names[5],
        "geek": style_names[6],
        "solitarian": style_names[7],
        "philosopher": style_names[8],
        "innovitarian": style_names[9],
        "competitor": style_names[10],
        "authoritarian": style_names[11],
        "adaptarian": style_names[12],
        "prtred": prt.red,
        "prtgreen": prt.green,
        "prtblue": prt.blue,
        "prtgrey": prt.grey,
        "prtenergy": prt.energy,
        "prtblueperc": pct(prt.blue),
        "prtredperc": pct(prt.red),
        "prtgreenperc": pct(prt.green),
        "prtgreyperc": pct(prt.grey),
        "prtenergyperc": pct(prt.energy),
        "prthighest": max(prt.green, prt.red, prt.grey),
        "prthighestColor": rank_colors(prt.green, prt.red, prt.grey)[0],
        "prtsecondHighest": rank_colors(prt.green, prt.red, prt.grey)[4],
        "prtsecondHighestColor": rank_colors(prt.green, prt.red, prt.grey)[1],
        "prtlowest": min(prt.green, prt.red, prt.grey),
        "prtlowestColor": rank_colors(prt.green, prt.red, prt.grey)[2],
        "prthighestDiff": rank_colors(prt.green, prt.red, prt.grey)[3] - rank_colors(prt.green, prt.red, prt.grey)[4],
        "professional_typical_type": pt_type,
        "professional_typical_style": pt_style,
        "professional_typical_oct": pt_oct,
        "prsred": prs.red,
        "prsgreen": prs.green,
        "prsblue": prs.blue,
        "prsgrey": prs.grey,
        "prsenergy": prs.energy,
        "prsblueperc": pct(prs.blue),
        "prsredperc": pct(prs.red),
        "prsgreenperc": pct(prs.green),
        "prsgreyperc": pct(prs.grey),
        "prsenergyperc": pct(prs.energy),
        "prshighest": max(prs.green, prs.red, prs.grey),
        "prshighestColor": rank_colors(prs.green, prs.red, prs.grey)[0],
        "prssecondHighest": rank_colors(prs.green, prs.red, prs.grey)[4],
        "prssecondHighestColor": rank_colors(prs.green, prs.red, prs.grey)[1],
        "prslowest": min(prs.green, prs.red, prs.grey),
        "prslowestColor": rank_colors(prs.green, prs.red, prs.grey)[2],
        "prshighestDiff": rank_colors(prs.green, prs.red, prs.grey)[3] - rank_colors(prs.green, prs.red, prs.grey)[4],
        "professional_stressful_type": ps_type,
        "professional_stressful_style": ps_style,
        "professional_stressful_oct": ps_oct,
        "petred": pet.red,
        "petgreen": pet.green,
        "petblue": pet.blue,
        "petgrey": pet.grey,
        "petenergy": pet.energy,
        "petblueperc": pct(pet.blue),
        "petredperc": pct(pet.red),
        "petgreenperc": pct(pet.green),
        "petgreyperc": pct(pet.grey),
        "petenergyperc": pct(pet.energy),
        "pethighest": max(pet.green, pet.red, pet.grey),
        "pethighestColor": rank_colors(pet.green, pet.red, pet.grey)[0],
        "petsecondHighest": rank_colors(pet.green, pet.red, pet.grey)[4],
        "petsecondHighestColor": rank_colors(pet.green, pet.red, pet.grey)[1],
        "petlowest": min(pet.green, pet.red, pet.grey),
        "petlowestColor": rank_colors(pet.green, pet.red, pet.grey)[2],
        "pethighestDiff": rank_colors(pet.green, pet.red, pet.grey)[3] - rank_colors(pet.green, pet.red, pet.grey)[4],
        "personal_typical_type": pet_type,
        "personal_typical_style": pet_style,
        "personal_typical_oct": pet_oct,
        "pesred": pes.red,
        "pesgreen": pes.green,
        "pesblue": pes.blue,
        "pesgrey": pes.grey,
        "pesenergy": pes.energy,
        "pesblueperc": pct(pes.blue),
        "pesredperc": pct(pes.red),
        "pesgreenperc": pct(pes.green),
        "pesgreyperc": pct(pes.grey),
        "pesenergyperc": pct(pes.energy),
        "peshighest": max(pes.green, pes.red, pes.grey),
        "peshighestColor": rank_colors(pes.green, pes.red, pes.grey)[0],
        "pessecondHighest": rank_colors(pes.green, pes.red, pes.grey)[4],
        "pessecondHighestColor": rank_colors(pes.green, pes.red, pes.grey)[1],
        "peslowest": min(pes.green, pes.red, pes.grey),
        "peslowestColor": rank_colors(pes.green, pes.red, pes.grey)[2],
        "peshighestDiff": rank_colors(pes.green, pes.red, pes.grey)[3] - rank_colors(pes.green, pes.red, pes.grey)[4],
        "personal_stressful_type": pes_type,
        "personal_stressful_style": pes_style,
        "personal_stressful_oct": pes_oct,
        "prred": pr.red,
        "prgreen": pr.green,
        "prblue": pr.blue,
        "prgrey": pr.grey,
        "prenergy": pr.energy,
        "prblueperc": pct(pr.blue, DOUBLE),
        "prredperc": pct(pr.red, DOUBLE),
        "prgreenperc": pct(pr.green, DOUBLE),
        "prgreyperc": pct(pr.grey, DOUBLE),
        "prenergyperc": pct(pr.energy, DOUBLE),
        "prhighest": max(pr.green, pr.red, pr.grey),
        "prhighestColor": rank_colors(pr.green, pr.red, pr.grey)[0],
        "prsecondHighest": rank_colors(pr.green, pr.red, pr.grey)[4],
        "prsecondHighestColor": rank_colors(pr.green, pr.red, pr.grey)[1],
        "prlowest": min(pr.green, pr.red, pr.grey),
        "prlowestColor": rank_colors(pr.green, pr.red, pr.grey)[2],
        "prhighestDiff": rank_colors(pr.green, pr.red, pr.grey)[3] - rank_colors(pr.green, pr.red, pr.grey)[4],
        "professional_combo_type": pr_combo_type,
        "professional_combo_style": pr_combo_style,
        "pered": pe.red,
        "pegreen": pe.green,
        "peblue": pe.blue,
        "pegrey": pe.grey,
        "peenergy": pe.energy,
        "peblueperc": pct(pe.blue, DOUBLE),
        "peredperc": pct(pe.red, DOUBLE),
        "pegreenperc": pct(pe.green, DOUBLE),
        "pegreyperc": pct(pe.grey, DOUBLE),
        "peenergyperc": pct(pe.energy, DOUBLE),
        "pehighest": max(pe.green, pe.red, pe.grey),
        "pehighestColor": rank_colors(pe.green, pe.red, pe.grey)[0],
        "pesecondHighest": rank_colors(pe.green, pe.red, pe.grey)[4],
        "pesecondHighestColor": rank_colors(pe.green, pe.red, pe.grey)[1],
        "pelowest": min(pe.green, pe.red, pe.grey),
        "pelowestColor": rank_colors(pe.green, pe.red, pe.grey)[2],
        "pehighestDiff": rank_colors(pe.green, pe.red, pe.grey)[3] - rank_colors(pe.green, pe.red, pe.grey)[4],
        "personal_combo_type": pe_combo_type,
        "personal_combo_style": pe_combo_style,
        "tred": tq.red,
        "tgreen": tq.green,
        "tblue": tq.blue,
        "tgrey": tq.grey,
        "tenergy": tq.energy,
        "tblueperc": pct(tq.blue, DOUBLE),
        "tredperc": pct(tq.red, DOUBLE),
        "tgreenperc": pct(tq.green, DOUBLE),
        "tgreyperc": pct(tq.grey, DOUBLE),
        "tenergyperc": pct(tq.energy, DOUBLE),
        "thighest": max(tq.green, tq.red, tq.grey),
        "thighestColor": rank_colors(tq.green, tq.red, tq.grey)[0],
        "tsecondHighest": rank_colors(tq.green, tq.red, tq.grey)[4],
        "tsecondHighestColor": rank_colors(tq.green, tq.red, tq.grey)[1],
        "tlowest": min(tq.green, tq.red, tq.grey),
        "tlowestColor": rank_colors(tq.green, tq.red, tq.grey)[2],
        "thighestDiff": rank_colors(tq.green, tq.red, tq.grey)[3] - rank_colors(tq.green, tq.red, tq.grey)[4],
        "typical_combo_type": t_combo_type,
        "typical_combo_style": t_combo_style,
        "sred": sq.red,
        "sgreen": sq.green,
        "sblue": sq.blue,
        "sgrey": sq.grey,
        "senergy": sq.energy,
        "sblueperc": pct(sq.blue, DOUBLE),
        "sredperc": pct(sq.red, DOUBLE),
        "sgreenperc": pct(sq.green, DOUBLE),
        "sgreyperc": pct(sq.grey, DOUBLE),
        "senergyperc": pct(sq.energy, DOUBLE),
        "shighest": max(sq.green, sq.red, sq.grey),
        "shighestColor": rank_colors(sq.green, sq.red, sq.grey)[0],
        "ssecondHighest": rank_colors(sq.green, sq.red, sq.grey)[4],
        "ssecondHighestColor": rank_colors(sq.green, sq.red, sq.grey)[1],
        "slowest": min(sq.green, sq.red, sq.grey),
        "slowestColor": rank_colors(sq.green, sq.red, sq.grey)[2],
        "shighestDiff": rank_colors(sq.green, sq.red, sq.grey)[3] - rank_colors(sq.green, sq.red, sq.grey)[4],
        "stressful_combo_type": s_combo_type,
        "stressful_combo_style": s_combo_style,
        "stressful_combo_oct": s_combo_oct,
        "cred": cred,
        "cgreen": cgreen,
        "cblue": cblue,
        "cgrey": cgrey,
        "cenergy": cenergy,
        "cblueperc": pct(cblue, FULL),
        "credperc": pct(cred, FULL),
        "cgreenperc": pct(cgreen, FULL),
        "cgreyperc": pct(cgrey, FULL),
        "cenergyperc": pct(cenergy, FULL),
        "chighest": max(cgreen, cred, cgrey),
        "chighestColor": rank_colors(cgreen, cred, cgrey)[0],
        "csecondHighest": rank_colors(cgreen, cred, cgrey)[4],
        "csecondHighestColor": rank_colors(cgreen, cred, cgrey)[1],
        "clowest": min(cgreen, cred, cgrey),
        "clowestColor": rank_colors(cgreen, cred, cgrey)[2],
        "chighestDiff": rank_colors(cgreen, cred, cgrey)[3] - rank_colors(cgreen, cred, cgrey)[4],
        "odiff": odiff_val,
        "cclientStyle": c_style,
        "cclientType": c_type,
        "octnumber": octnumber,
        "started": get_meta("started"),
        "finished": get_meta("finished"),
        "reviewed": get_meta("reviewed"),
        "viewed": get_meta("viewed"),
        "archive": get_meta("archive"),
    }
