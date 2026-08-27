#!/usr/bin/env python3
"""Assert the study workbooks satisfy the 2026-08-26 content rules.

Checks, independently of build_study_workbooks.py:
  - 4 problems per subject, 2 per sheet
  - exactly one step per problem
  - no answerType == "mc" on any *step* (mc scaffolds inside a hint chain are
    allowed but reported: they are invisible where giveStuHints is false)
  - required Meta flags present, giveStuFeedback only on noChat
  - every step has a non-empty Answer and every problem an "openstax KC"
    (the column the tooling actually reads -- process_sheet.py:159, :449;
    the plain "KC" column is inert and holds junk on some source tabs)
  - no datetime cells (the functions17 class of defect)
"""
import datetime
import sys
import pandas as pd

OUT = "/home/manu/OATutor-Prolific-Study/content-files"
SUBJECTS = ["Physics", "Math1", "Math2", "Chem", "Data"]

REQUIRED = {
    "yesChat": {
        "showStuMastery": "false", "doMasteryUpdate": "false",
        "keepMCOrder": "true", "allowRecycle": "false",
        "giveStuHints": "false", "fixedProblemOrder": "true",
        "chat_display_mode": "Window",
    },
    "noChat": {
        "showStuMastery": "false", "doMasteryUpdate": "false",
        "keepMCOrder": "true", "allowRecycle": "false",
        "giveStuHints": "true", "giveStuFeedback": "false",
        "fixedProblemOrder": "true", "chat_display_mode": "Off",
    },
}

fail = []
warnings = []


def err(msg):
    fail.append(msg)
    print("FAIL:", msg)


def warn(msg):
    warnings.append(msg)


for subject in SUBJECTS:
    xl = pd.ExcelFile(f"{OUT}/{subject}.xlsx")
    expected = [f"{subject}_yesChat", f"{subject}_noChat"]
    if xl.sheet_names != expected:
        err(f"{subject}: sheets {xl.sheet_names} != {expected}")

    for sheet in xl.sheet_names:
        lesson = "yesChat" if sheet.endswith("yesChat") else "noChat"
        df = xl.parse(sheet, keep_default_na=False)

        rt = df["Row Type"].astype(str).str.strip().str.lower()
        problems = df[rt == "problem"]
        steps = df[rt == "step"]

        if len(problems) != 2:
            err(f"{sheet}: {len(problems)} problems, expected 2")
        if len(steps) != 2:
            err(f"{sheet}: {len(steps)} steps, expected 2 (one per problem)")

        # one step per problem: walk the sheet and count steps between problems
        count, current = {}, None
        for _, r in df.iterrows():
            t = str(r["Row Type"]).strip().lower()
            if t == "problem":
                current = str(r["Problem Name"]).strip()
                count[current] = 0
            elif t == "step" and current is not None:
                count[current] += 1
        for name, n in count.items():
            if n != 1:
                err(f"{sheet}/{name}: {n} steps, expected exactly 1")

        mc_steps = steps[steps["answerType"].astype(str).str.strip() == "mc"]
        if len(mc_steps):
            err(f"{sheet}: {len(mc_steps)} multiple-choice STEPS")

        # mc scaffolds are permitted -- they sit inside the hint chain, so they
        # only surface where giveStuHints is true (i.e. noChat).
        mc_scaffold = df[
            (rt.isin(["hint", "scaffold"]))
            & (df["answerType"].astype(str).str.strip() == "mc")
        ]
        if len(mc_scaffold):
            reach = "reachable" if REQUIRED[lesson]["giveStuHints"] == "true" else "not rendered"
            names = sorted(set(mc_scaffold["Problem Name"].astype(str).str.strip()) - {""})
            warn(f"{sheet}: {len(mc_scaffold)} mc scaffold rows ({reach}; hint chains of "
                 f"{', '.join(names) if names else 'n/a'})")

        for _, r in steps.iterrows():
            if not str(r["Answer"]).strip():
                err(f"{sheet}/{r['Problem Name']}: step has no Answer")
        for _, r in problems.iterrows():
            if not str(r["openstax KC"]).strip():
                err(f"{sheet}/{r['Problem Name']}: problem has no openstax KC")

        metas = {}
        for m in df["Meta"]:
            m = str(m).strip()
            if not m or m == "nan":
                continue
            if ": " not in m:
                err(f"{sheet}: unparseable Meta cell {m!r}")
                continue
            k, v = m.split(": ", 1)
            metas[k] = v
        for k, v in REQUIRED[lesson].items():
            if metas.get(k) != v:
                err(f"{sheet}: Meta {k} = {metas.get(k)!r}, expected {v!r}")
        if lesson == "yesChat" and "giveStuFeedback" in metas:
            err(f"{sheet}: giveStuFeedback must not be set on yesChat")

        for i, r in df.iterrows():
            for c in df.columns:
                if isinstance(r[c], (datetime.datetime, datetime.date)):
                    err(f"{sheet} row {i} col {c}: datetime cell {r[c]}")

        kcs = sorted(set(problems["openstax KC"].astype(str).str.strip()))
        print(f"ok  {sheet:18s} {len(problems)} problems, {len(steps)} steps, KCs={kcs}")

print()
for w in warnings:
    print("note:", w)
if warnings:
    print()
if fail:
    print(f"{len(fail)} failure(s)")
    sys.exit(1)
print("all checks passed")
