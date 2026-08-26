#!/usr/bin/env python3
"""Build the five Prolific-study workbooks from the upstream source workbooks.

Replaces the obsolete shreyaHelp/scripts/build_sheets.py.

Content rules, set 2026-08-26:
  1. exactly one step per problem  -- KEEP_STEP picks which one
  2. no multiple-choice steps

Each subject gets two sheets, <Subject>_yesChat (problems 1-2, chatbot on) and
<Subject>_noChat (problems 3-4, chatbot off). Sheet row order is the problem
order, which is what process_sheet.py turns into fixedProblemOrder.

Run:  .venv/bin/python build_study_workbooks.py [--dry-run]
"""
import sys
import pandas as pd

SRC = "/home/manu/OATutorChatbotMod/content_files/source"
OUT = "/home/manu/OATutor-Prolific-Study/content-files"

PHYS = f"{SRC}/OpenStax_ University Physics .xlsx"
PREC = f"{SRC}/OpenStax_ Pre-Calculus.xlsx"
M1B = f"{SRC}/Pre-Calculus Essentials (UC Berkeley Math 1B).xlsx"
CHEM = f"{SRC}/Chemistry 1A Summer Content.xlsx"
DATA = f"{SRC}/data_100/Midterm 1 Worksheets.xlsx"

MOTION = "4. Motion in Two and Three Dime"
FUNCS = "1.1 Functions and Function Nota"
QUAD = "3.2 - Quadratic Functions"
COMP = "Composition of Functions"
EXPO = "Algebra with Exponents and Loga"
MODB = "Quantum Periodic Properties (Mo"
MODG = "Acid Base (Module G)"
REGEX = "Regex A"

# (file, tab, problem name, 1-based step to keep or None when the problem is
# already a single step)
SELECTION = {
    "Physics": {
        "yesChat": [(PHYS, MOTION, "motion2d10", 1), (PHYS, MOTION, "motion2d18", None)],
        "noChat": [(PHYS, MOTION, "motion2d9", 1), (PHYS, MOTION, "motion2d19", None)],
    },
    "Math1": {
        "yesChat": [(PREC, FUNCS, "functions8", 4), (PREC, QUAD, "quadratic16", None)],
        "noChat": [(PREC, FUNCS, "functions30", 2), (PREC, QUAD, "quadratic26", None)],
    },
    "Math2": {
        "yesChat": [(M1B, COMP, "funccomp4", None), (M1B, EXPO, "exp9", None)],
        "noChat": [(M1B, COMP, "funccomp3", None), (M1B, EXPO, "exp4", None)],
    },
    "Chem": {
        "yesChat": [(CHEM, MODB, "chem15", 3), (CHEM, MODG, "acidbase11", None)],
        "noChat": [(CHEM, MODB, "chem12", None), (CHEM, MODG, "acidbase9", None)],
    },
    "Data": {
        "yesChat": [(DATA, REGEX, "row5", 2), (DATA, REGEX, "row2", None)],
        "noChat": [(DATA, REGEX, "row4", None), (DATA, REGEX, "row1", 1)],
    },
}

# Trimming a problem to one step can leave the surviving step title referring
# to steps that no longer exist. Overrides are (tab, problem) -> new step title.
TITLE_OVERRIDES = {
    (FUNCS, "functions8"): "Evaluate (f(a+h)-f(a))/h",
}

# Meta flags land in the Meta column. process_sheet.py:533 scans the whole
# column and ignores Row Type, so the row they sit on does not matter -- but
# they must not be on a row that a later edit deletes.
META = {
    "yesChat": [
        "showStuMastery: false",
        "doMasteryUpdate: false",
        "keepMCOrder: true",
        "allowRecycle: false",
        "giveStuHints: false",
        "fixedProblemOrder: true",
        "chat_display_mode: Window",
    ],
    "noChat": [
        "showStuMastery: false",
        "doMasteryUpdate: false",
        "keepMCOrder: true",
        "allowRecycle: false",
        "giveStuHints: true",
        "giveStuFeedback: false",
        "fixedProblemOrder: true",
        "chat_display_mode: Off",
    ],
}

COLUMNS = [
    "Problem Name", "Row Type", "Title", "Body Text", "Answer", "answerType",
    "HintID", "Dependency", "mcChoices", "Images (space delimited)", "Parent",
    "OER src", "openstax KC", "KC", "Taxonomy", "License", "Unnamed: 16",
    "Validator Check", "Time Last Checked", "Debug Link", "Problem ID",
    "Lesson ID", "Image Checksum", "Meta",
]

_cache = {}


def load(path, tab):
    if (path, tab) not in _cache:
        _cache[(path, tab)] = pd.ExcelFile(path).parse(tab, keep_default_na=False)
    return _cache[(path, tab)]


def row_type(row):
    return str(row.get("Row Type", "")).strip().lower()


def extract(path, tab, name, keep_step):
    """Return the rows for one problem: its problem row plus one step block."""
    df = load(path, tab)
    rows = [r for _, r in df.iterrows()]

    start = None
    for i, r in enumerate(rows):
        if row_type(r) == "problem" and str(r.get("Problem Name", "")).strip() == name:
            start = i
            break
    if start is None:
        raise SystemExit(f"{tab}: problem {name!r} not found")

    end = len(rows)
    for i in range(start + 1, len(rows)):
        if row_type(rows[i]) == "problem":
            end = i
            break
    block = rows[start:end]

    # split the block into the problem row and one list per step
    problem_row = block[0]
    steps, current = [], None
    for r in block[1:]:
        if row_type(r) == "step":
            current = [r]
            steps.append(current)
        elif current is not None:
            current.append(r)

    if not steps:
        raise SystemExit(f"{tab}/{name}: no step rows")
    if keep_step is None:
        if len(steps) != 1:
            raise SystemExit(
                f"{tab}/{name}: {len(steps)} steps but no step selected"
            )
        chosen = steps[0]
    else:
        if not 1 <= keep_step <= len(steps):
            raise SystemExit(
                f"{tab}/{name}: step {keep_step} out of range (has {len(steps)})"
            )
        chosen = steps[keep_step - 1]

    if str(chosen[0].get("answerType", "")).strip() == "mc":
        raise SystemExit(f"{tab}/{name}: selected step is multiple choice")

    override = TITLE_OVERRIDES.get((tab, name))
    if override is not None:
        chosen = list(chosen)
        chosen[0] = chosen[0].copy()
        chosen[0]["Title"] = override

    return [problem_row] + chosen


def build_sheet(subject, lesson):
    out = []
    for path, tab, name, keep in SELECTION[subject][lesson]:
        for r in extract(path, tab, name, keep):
            out.append({c: r.get(c, "") for c in COLUMNS})

    df = pd.DataFrame(out, columns=COLUMNS)
    # Problem ID / Lesson ID are minted by the tooling (process_sheet.py:254-261)
    df["Problem ID"] = ""
    df["Lesson ID"] = ""
    df["Validator Check"] = ""
    df["Time Last Checked"] = ""
    df["Debug Link"] = ""
    df["Image Checksum"] = ""

    meta = META[lesson]
    if len(meta) > len(df):
        raise SystemExit(f"{subject}_{lesson}: more meta flags than rows")
    df["Meta"] = meta + [""] * (len(df) - len(meta))
    return df


def main():
    dry = "--dry-run" in sys.argv
    for subject in SELECTION:
        sheets = {
            f"{subject}_{lesson}": build_sheet(subject, lesson)
            for lesson in ("yesChat", "noChat")
        }
        for sheet_name, df in sheets.items():
            steps = df[df["Row Type"].str.strip().str.lower() == "step"]
            probs = df[df["Row Type"].str.strip().str.lower() == "problem"]
            print(f"{sheet_name:18s} {len(probs)} problems, {len(steps)} steps, "
                  f"{len(df)} rows, types={sorted(set(steps['answerType']))}")
            # KC lives on the problem row, not the step row
            kcs = dict(zip(probs["Problem Name"].str.strip(), probs["KC"]))
            for _, r in steps.iterrows():
                name = str(r["Problem Name"]).strip()
                print(f"    {name:12s} [{r['answerType']:7s}] "
                      f"ans={str(r['Answer'])[:30]!r}  KC={str(kcs.get(name,''))[:40]!r}")
        if not dry:
            path = f"{OUT}/{subject}.xlsx"
            with pd.ExcelWriter(path, engine="openpyxl") as w:
                for sheet_name, df in sheets.items():
                    df.to_excel(w, sheet_name=sheet_name, index=False)
            print(f"  -> wrote {path}")


if __name__ == "__main__":
    main()
