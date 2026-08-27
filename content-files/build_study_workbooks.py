#!/usr/bin/env python3
"""Build the five Prolific-study workbooks from the upstream source workbooks.

Replaces the obsolete shreyaHelp/scripts/build_sheets.py.

Content rules, set 2026-08-26:
  1. exactly one step per problem  -- KEEP_STEP picks which one
  2. no multiple-choice steps

Each subject gets two sheets, <Subject>_yesChat (problems 1-2, chatbot on) and
<Subject>_noChat (problems 3-4, chatbot off). Sheet row order is the problem
order, which is what process_sheet.py turns into fixedProblemOrder.

Run:  .venv/bin/python build_study_workbooks.py [--dry-run] [--only Math1 Math2]

--only restricts the rebuild to the named subjects. Use it: every rebuilt sheet
carries a fresh Lesson ID unless the old one is carried over (see build_sheet),
and there is no reason to disturb subjects that are not changing.
"""
import os
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
QUAD = "3.2 - Quadratic Functions"
COMP = "Composition of Functions"
MODB = "Quantum Periodic Properties (Mo"
MODG = "Acid Base (Module G)"
REGEX = "Regex A"
PANDAS = "Pandas A"
VECT = "8.8 - Vectors"
COREPOLY = "Core Functions Constant, Linear"

# (file, tab, problem name, 1-based step to keep or None when the problem is
# already a single step)
SELECTION = {
    "Physics": {
        "yesChat": [(PHYS, MOTION, "motion2d10", 1), (PHYS, MOTION, "motion2d18", None)],
        "noChat": [(PHYS, MOTION, "motion2d9", 1), (PHYS, MOTION, "motion2d19", None)],
    },
    "Math1": {
        "yesChat": [(PREC, VECT, "vector3", 1), (PREC, QUAD, "quadratic16", None)],
        "noChat": [(PREC, VECT, "vector8", None), (PREC, QUAD, "quadratic26", None)],
    },
    "Math2": {
        "yesChat": [(M1B, COMP, "funccomp4", None), (M1B, COREPOLY, "corepoly1", None)],
        "noChat": [(M1B, COMP, "funccomp3", None), (M1B, COREPOLY, "corepoly2", None)],
    },
    "Chem": {
        "yesChat": [(CHEM, MODB, "chem15", 3), (CHEM, MODG, "acidbase11", None)],
        "noChat": [(CHEM, MODB, "chem12", None), (CHEM, MODG, "acidbase9", None)],
    },
    # row4/row5 also exist on the "Pandas A" tab; extract() keys on
    # (file, tab, name), so the Regex A ones are unambiguous.
    "Data": {
        "yesChat": [(DATA, REGEX, "row5", 2), (DATA, PANDAS, "S25FQ1B", 1)],
        "noChat": [(DATA, REGEX, "row4", None), (DATA, PANDAS, "S25FQ1B", 2)],
    },
}

# Cell fixes applied to the rows we keep, so that they survive a rebuild.
#
# Key is (tab, problem, row), where row is
#   "problem"        the problem row
#   N                the step row of source step N (1-based)
#   (N, "h3")        the hint/scaffold row with HintID h3 inside step N
# Value is {column: replacement}. Anything fixed here lands in the study
# workbook and therefore in the generated JSON; fixing the generated JSON
# instead does not survive the next pipeline run (see motion2d9 below).
OVERRIDES = {
    # The tooling wraps a bare "(...)" containing $$math$$ in another $$...$$
    # and escapes the inner delimiters, turning ($$1.5\,\text{m}$$) into
    # $$(\$\$1.5\, \text{m}\$\$)$$ -- which renders as literal dollar signs.
    # Moving the parens inside the math is visually identical and leaves the
    # tooling nothing to grab. Commit 80874b8508 patched the generated JSON
    # instead and was reverted by the very next pipeline run.
    (MOTION, "motion2d9", "problem"): {
        "Body Text": r"A bullet is shot horizontally from shoulder height "
                     r"$$(1.5\,\text{m})$$ with an initial speed "
                     r"$$200\,\tfrac{\text{m}}{\text{s}}$$.",
    },

    # answerType "algebra" becomes "arithmetic" in the generated JSON, which
    # checkAnswer.js:142-198 hands to KAS. KAS cannot parse the "sqrt" glyph, so
    # a stored answer containing one never matches any input and the step is
    # unanswerable. ASCII costs nothing: KAS compares symbolically, so
    # 6*sqrt(2) still accepts 6sqrt(2), sqrt(72), 6*2^(1/2), the decimal, and
    # the \sqrt{72} the equation editor emits.
    (VECT, "vector3", 1): {"Answer": "6*sqrt(2)"},

    # S25FQ1B ships as multiple choice; the study needs free entry. The
    # conversion is both halves: answerType -> string picks the TextBox widget
    # (handle_answer_type), and mcChoices must be emptied because
    # create_content.py:249-256 builds a choices array whenever that cell is
    # non-blank, whatever the answerType says, and latex-mangles the answer on
    # the way. Step 1 is Data_yesChat P2, step 2 is Data_noChat P4.
    (PANDAS, "S25FQ1B", 1): {"answerType": "string", "mcChoices": ""},
    (PANDAS, "S25FQ1B", 2): {"answerType": "string", "mcChoices": ""},

    # Same "algebra" -> KAS trap as vector3, but on scaffolds: these answers are
    # Python, which KAS cannot parse, so they can never be satisfied. Step 2's
    # chain is reachable -- Data_noChat sets giveStuHints: true.
    (PANDAS, "S25FQ1B", (1, "h3")): {"answerType": "string"},
    (PANDAS, "S25FQ1B", (2, "h3")): {"answerType": "string"},
    (PANDAS, "S25FQ1B", (2, "h4")): {"answerType": "string"},
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

    step_no = 1 if keep_step is None else keep_step
    if str(apply_overrides(tab, name, step_no, chosen[0])
           .get("answerType", "")).strip() == "mc":
        raise SystemExit(f"{tab}/{name}: selected step is multiple choice")

    return [apply_overrides(tab, name, "problem", problem_row)] + [
        apply_overrides(tab, name, step_no if i == 0 else (step_no, hint_id(r)), r)
        for i, r in enumerate(chosen)
    ]


def hint_id(row):
    return str(row.get("HintID", "")).strip()


# every OVERRIDES key that actually matched a row -- an entry that matches
# nothing is a typo, and silently shipping the unfixed cell is the failure mode
# this whole table exists to prevent
_used_overrides = set()


def apply_overrides(tab, name, row_key, row):
    """Return row with any OVERRIDES entry for it applied."""
    key = (tab, name, row_key)
    fixes = OVERRIDES.get(key)
    if not fixes:
        return row
    _used_overrides.add(key)
    row = row.copy()
    for column, value in fixes.items():
        row[column] = value
    return row


def existing_lesson_id(subject, lesson):
    """The Lesson ID already in the study workbook, or "" if there is none.

    process_sheet.py:361-364 mints a Lesson ID only when the cell is blank, so
    carrying the old one over keeps the lesson's identity -- and its Firestore
    logs -- stable across a content rebuild. It lives on row 0 only.
    """
    path = f"{OUT}/{subject}.xlsx"
    if not os.path.exists(path):
        return ""
    xl = pd.ExcelFile(path)
    sheet = f"{subject}_{lesson}"
    if sheet not in xl.sheet_names:
        return ""
    df = xl.parse(sheet, keep_default_na=False)
    if "Lesson ID" not in df.columns or df.empty:
        return ""
    return str(df.at[0, "Lesson ID"]).strip()


def build_sheet(subject, lesson):
    out = []
    for path, tab, name, keep in SELECTION[subject][lesson]:
        for r in extract(path, tab, name, keep):
            out.append({c: r.get(c, "") for c in COLUMNS})

    df = pd.DataFrame(out, columns=COLUMNS)
    # Problem ID is deterministic -- create_dir.py:15 builds it as
    # 'a' + sha1(sheet_name)[:6] + problem_name -- so blanking it here is safe:
    # the tooling writes back the same value for every problem that stays.
    df["Problem ID"] = ""
    # Lesson ID is a random generate_id(), so it must be carried over by hand.
    df["Lesson ID"] = ""
    lesson_id = existing_lesson_id(subject, lesson)
    if lesson_id:
        df.at[0, "Lesson ID"] = lesson_id
    df["Validator Check"] = ""
    df["Time Last Checked"] = ""
    df["Debug Link"] = ""
    df["Image Checksum"] = ""

    meta = META[lesson]
    if len(meta) > len(df):
        raise SystemExit(f"{subject}_{lesson}: more meta flags than rows")
    df["Meta"] = meta + [""] * (len(df) - len(meta))
    return df


def subjects_from_argv():
    """Subjects named after --only, or all of them."""
    if "--only" not in sys.argv:
        return list(SELECTION)
    named = [a for a in sys.argv[sys.argv.index("--only") + 1:]
             if not a.startswith("--")]
    if not named:
        raise SystemExit("--only needs at least one subject")
    unknown = [s for s in named if s not in SELECTION]
    if unknown:
        raise SystemExit(
            f"unknown subject(s) {', '.join(unknown)} -- "
            f"choose from {', '.join(SELECTION)}"
        )
    return named


def check_overrides_used(subjects):
    """Fail on an OVERRIDES entry that matched no row in the rebuilt subjects."""
    tabs = {tab for s in subjects for l in SELECTION[s].values() for _, tab, _, _ in l}
    unused = [k for k in OVERRIDES if k[0] in tabs and k not in _used_overrides]
    if unused:
        raise SystemExit(
            "OVERRIDES entries matched no row: "
            + ", ".join(repr(k) for k in unused)
        )


def main():
    dry = "--dry-run" in sys.argv
    subjects = subjects_from_argv()
    for subject in subjects:
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
            kcs = dict(zip(probs["Problem Name"].str.strip(), probs["openstax KC"]))
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
    check_overrides_used(subjects)


if __name__ == "__main__":
    main()
