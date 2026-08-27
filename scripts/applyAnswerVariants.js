/**
 * Widen exact-match step answers in the generated content pool.
 *
 * checkAnswer.js:176-185 compares answerType "string" literally: parsed =
 * attempt, then _equality, with no normalisation (the whitespace strip at :108
 * is overwritten in that branch). _equality takes an array, so the platform
 * already supports several correct answers per step -- but the tooling throws
 * that away, hardcoding stepAnswer: [answer] at create_content.py:265.
 *
 * This script re-applies the list from scripts/answerVariants.json after each
 * content rebuild. It never drops the generated answer, only adds to it.
 *
 * Usage: node scripts/applyAnswerVariants.js [--check]
 *   --check  report what would change and exit non-zero if anything would.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const poolDir = path.join(root, "src", "content-sources", "oatutor", "content-pool");
const configPath = path.join(__dirname, "answerVariants.json");

/**
 * Content-pool directories are a 7-character prefix followed by the name.
 *
 * A key may also be an exact directory name. That is needed when one problem is
 * used in both lessons of a course and each copy keeps a different step: the
 * bare name then matches two directories whose correct answers differ.
 */
function findProblemDir(name) {
  if (fs.existsSync(path.join(poolDir, name))) return name;
  const re = new RegExp(`^[0-9a-z]{7}${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  const matches = fs.readdirSync(poolDir).filter((d) => re.test(d));
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new Error(`${name}: ${matches.length} content-pool dirs match (${matches.join(", ")})`);
  }
  return matches[0];
}

/** All ways of joining a comma-separated list with "," or ", ". */
function commaSpacings(answer) {
  const parts = answer.split(/,\s*/);
  if (parts.length < 2) return [answer];
  const out = [];
  for (let mask = 0; mask < 1 << (parts.length - 1); mask++) {
    let s = parts[0];
    for (let i = 1; i < parts.length; i++) {
      s += (mask & (1 << (i - 1))) ? ", " : ",";
      s += parts[i];
    }
    out.push(s);
  }
  return out;
}

/** Add the wrappers a participant might reasonably type around a pattern. */
function expand(answer, commaSpacing) {
  const bare = answer.replace(/^`(.*)`$/s, "$1");
  const seeds = commaSpacing ? commaSpacings(bare) : [bare];
  const out = [];
  for (const s of seeds) {
    out.push(s, "`" + s + "`");
    if (!commaSpacing) {
      out.push(`r"${s}"`, `r'${s}'`, `"${s}"`, `'${s}'`);
    }
  }
  return out;
}

function main() {
  const check = process.argv.includes("--check");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  let changed = 0;
  const missing = [];

  for (const [name, spec] of Object.entries(config.problems)) {
    const dir = findProblemDir(name);
    if (!dir) {
      missing.push(name);
      continue;
    }

    const stepsDir = path.join(poolDir, dir, "steps");
    const stepIds = fs.readdirSync(stepsDir);
    if (stepIds.length !== 1) {
      throw new Error(
        `${dir}: ${stepIds.length} steps -- the study expects exactly one, ` +
        `so there is no way to tell which step these answers belong to`
      );
    }
    const stepPath = path.join(stepsDir, stepIds[0], `${stepIds[0]}.json`);
    const step = JSON.parse(fs.readFileSync(stepPath, "utf8"));

    if (step.answerType !== "string") {
      throw new Error(
        `${dir}: answerType is "${step.answerType}", not "string" -- literal ` +
        `comparison does not apply and these variants would be misleading`
      );
    }

    // Derive the list from the config alone. Feeding the current stepAnswer
    // back in would re-wrap already-wrapped forms on every run, so the file
    // would never converge.
    const seen = new Set();
    const answers = [];
    for (const a of spec.accept) {
      for (const v of expand(a, spec.commaSpacing === true)) {
        if (!seen.has(v)) {
          seen.add(v);
          answers.push(v);
        }
      }
    }

    // The generated answer must be covered, or a content change has moved the
    // reference answer out from under this config and we would be silently
    // replacing the only correct answer with a stale list.
    const generated = step.stepAnswer[0];
    if (!seen.has(generated) && !seen.has(String(generated).replace(/^`(.*)`$/s, "$1"))) {
      throw new Error(
        `${dir}: the generated answer ${JSON.stringify(generated)} is not among ` +
        `the variants in answerVariants.json. The source content changed -- ` +
        `update the "accept" list for "${name}" before re-running.`
      );
    }

    const before = JSON.stringify(step.stepAnswer);
    if (before === JSON.stringify(answers)) {
      console.log(`${dir}: unchanged (${answers.length} accepted)`);
      continue;
    }
    changed++;
    console.log(`${dir}: ${step.stepAnswer.length} -> ${answers.length} accepted answers`);
    if (!check) {
      step.stepAnswer = answers;
      fs.writeFileSync(stepPath, JSON.stringify(step, null, 4) + "\n", "utf8");
    }
  }

  if (missing.length) {
    console.error(
      `error: no content-pool directory for: ${missing.join(", ")}. ` +
      `Rebuild the content, or drop them from answerVariants.json.`
    );
    process.exit(1);
  }

  if (check && changed) {
    console.error(`${changed} step(s) out of date -- run without --check`);
    process.exit(1);
  }
  console.log(check ? "up to date" : `applied to ${changed} step(s)`);
}

main();
