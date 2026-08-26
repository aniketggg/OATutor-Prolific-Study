/**
 * Re-derive the study's A/B lesson arms and meta-lessons in coursePlans.json.
 *
 * The content pipeline (content_script/final.py -> pipe_oatutor_content.sh)
 * regenerates coursePlans.json from the workbooks and emits only the two base
 * lessons per course, wiping the study structure that used to be maintained by
 * hand. This script rebuilds that structure from the base lessons, so a content
 * rebuild is no longer destructive.
 *
 * For each course it produces, per arm:
 *   <Course>-<Arm>-yesChat   the chatbot lesson, carrying that arm's prompt
 *   <Course>-<Arm>-noChat    the no-chatbot lesson
 * and three meta-lessons: meta-<Course> picks one arm at random, and
 * meta-<Course>-<Arm> plays that arm's two lessons in sequence.
 *
 * Idempotent: existing arm lessons and meta-lessons are discarded and rebuilt,
 * so running it twice is the same as running it once.
 *
 * Usage: node scripts/buildStudyCoursePlans.js [--check]
 *   --check  report what would change and exit non-zero if anything would,
 *            without writing.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const coursePlansPath = path.join(
  root, "src", "content-sources", "oatutor", "coursePlans.json"
);
const configPath = path.join(__dirname, "studyArms.json");
const promptDir = path.join(root, "aws", "aiAgentGeneration");

function baseLessonFor(course, suffix) {
  const matches = course.lessons.filter(
    (l) => !l.metaId && typeof l.name === "string" && l.name.endsWith(suffix)
  );
  if (matches.length !== 1) {
    throw new Error(
      `${course.courseName}: expected exactly one base lesson ending in ` +
      `"${suffix}", found ${matches.length}`
    );
  }
  return matches[0];
}

function buildCourse(course, config, warnings) {
  const { arms, displayNames } = config;
  const prompts = config.courses[course.courseName];
  if (!prompts) {
    throw new Error(`${course.courseName}: no entry in studyArms.json courses`);
  }

  const base = {
    yesChat: baseLessonFor(course, "_yesChat"),
    noChat: baseLessonFor(course, "_noChat"),
  };

  if (base.noChat.giveStuFeedback !== false) {
    warnings.push(
      `${course.courseName}: base noChat lesson does not set ` +
      `giveStuFeedback:false -- wrong answers will still block progression. ` +
      `Add "giveStuFeedback: false" to the Meta column of the noChat sheet.`
    );
  }

  const armLessons = [];
  for (const arm of arms) {
    for (const kind of ["yesChat", "noChat"]) {
      const lesson = { ...base[kind] };
      lesson.metaId = `${course.courseName}-${arm}-${kind}`;
      lesson.name = `${base[kind].name} (Arm ${arm})`;
      lesson.displayName = displayNames[kind];
      if (kind === "yesChat") {
        const prompt = prompts[arm] || config.defaultPrompt;
        lesson.chat_prompt = prompt;
        if (!fs.existsSync(path.join(promptDir, prompt))) {
          warnings.push(
            `${course.courseName} arm ${arm}: prompt "${prompt}" is not in ` +
            `aws/aiAgentGeneration/ -- verify it exists in the deployed ` +
            `prompt library, or the Lambda will fall back.`
          );
        }
      } else {
        // the no-chatbot lesson must never carry a prompt
        delete lesson.chat_prompt;
      }
      armLessons.push(lesson);
    }
  }

  const name = course.courseName;
  const metaLessons = [
    {
      id: `meta-${name}`,
      type: "meta_lesson",
      name: `${name} Study`,
      order: "random",
      choose: "1",
      lessons: arms.map((a) => `meta-${name}-${a}`),
    },
    ...arms.map((a) => ({
      id: `meta-${name}-${a}`,
      type: "meta_lesson",
      name: `${name} Arm ${a}`,
      order: "sequence",
      choose: "all",
      lessons: [`${name}-${a}-yesChat`, `${name}-${a}-noChat`],
    })),
  ];

  return {
    ...course,
    lessons: [base.yesChat, base.noChat, ...armLessons],
    metaLessons,
  };
}

function main() {
  const check = process.argv.includes("--check");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const before = fs.readFileSync(coursePlansPath, "utf8");
  const data = JSON.parse(before);

  if (!Array.isArray(data)) {
    throw new Error("Expected coursePlans.json to contain an array at top level");
  }

  const warnings = [];
  const rebuilt = data.map((course) => buildCourse(course, config, warnings));
  const after = JSON.stringify(rebuilt, null, 4) + "\n";

  for (const w of warnings) console.warn("warning:", w);

  for (const course of rebuilt) {
    console.log(
      `${course.courseName}: ${course.lessons.length} lessons ` +
      `(${course.lessons.filter((l) => l.metaId).length} arm), ` +
      `${course.metaLessons.length} meta-lessons`
    );
  }

  if (check) {
    if (after !== before) {
      console.error("coursePlans.json is out of date -- run without --check");
      process.exit(1);
    }
    console.log("coursePlans.json is up to date");
    return;
  }

  fs.writeFileSync(coursePlansPath, after, "utf8");
  console.log(after === before ? "no change" : "wrote coursePlans.json");
}

main();
