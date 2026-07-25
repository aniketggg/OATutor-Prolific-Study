import { resolveMetaLesson, resolveMetaLessonBranchAware, resolveMetaLessonDeterministic } from "./metaLessonUtils";

describe("resolveMetaLessonBranchAware", () => {
  const lessonsById = {
    lesson_a1: { id: "lesson_a1" },
    lesson_a2: { id: "lesson_a2" },
    lesson_a3: { id: "lesson_a3" },
    lesson_b1: { id: "lesson_b1" },
    lesson_b2: { id: "lesson_b2" },
    lesson_b3: { id: "lesson_b3" },
    lesson_c1: { id: "lesson_c1" },
    lesson_c2: { id: "lesson_c2" },
    lesson_c3: { id: "lesson_c3" },
  };

  const metaLessonsById = {
    condition_a: {
      id: "condition_a",
      type: "meta_lesson",
      order: "sequence",
      choose: "all",
      lessons: ["lesson_a1", "lesson_a2", "lesson_a3"],
    },
    condition_b: {
      id: "condition_b",
      type: "meta_lesson",
      order: "sequence",
      choose: "all",
      lessons: ["lesson_b1", "lesson_b2", "lesson_b3"],
    },
    condition_c: {
      id: "condition_c",
      type: "meta_lesson",
      order: "sequence",
      choose: "all",
      lessons: ["lesson_c1", "lesson_c2", "lesson_c3"],
    },
    root_ab: {
      id: "root_ab",
      type: "meta_lesson",
      order: "random",
      choose: "1",
      lessons: ["condition_a", "condition_b", "condition_c"],
    },
    root_sequence_all: {
      id: "root_sequence_all",
      type: "meta_lesson",
      order: "sequence",
      choose: "all",
      lessons: ["condition_a", "condition_b"],
    },
    root_with_invalid_child: {
      id: "root_with_invalid_child",
      type: "meta_lesson",
      order: "random",
      choose: "1",
      lessons: ["missing_child", "condition_a"],
    },
    circular_root: {
      id: "circular_root",
      type: "meta_lesson",
      order: "random",
      choose: "1",
      lessons: ["circular_root"],
    },
  };

  const findLessonById = (id) => lessonsById[id];
  const findMetaLessonById = (id) => metaLessonsById[id];

  it("returns one full nested condition sequence for random choose=1 roots", () => {
    const selectedPath = resolveMetaLessonBranchAware(
      metaLessonsById.root_ab,
      findLessonById,
      findMetaLessonById
    );

    const validConditionPaths = [
      ["lesson_a1", "lesson_a2", "lesson_a3"],
      ["lesson_b1", "lesson_b2", "lesson_b3"],
      ["lesson_c1", "lesson_c2", "lesson_c3"],
    ];

    expect(selectedPath).toHaveLength(3);
    expect(validConditionPaths).toContainEqual(selectedPath);
  });

  it("keeps legacy sequence/all flattening behavior", () => {
    const flattened = resolveMetaLessonBranchAware(
      metaLessonsById.root_sequence_all,
      findLessonById,
      findMetaLessonById
    );

    expect(flattened).toEqual([
      "lesson_a1",
      "lesson_a2",
      "lesson_a3",
      "lesson_b1",
      "lesson_b2",
      "lesson_b3",
    ]);
  });

  it("skips invalid children for random choose=1 branch selection", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const selectedPath = resolveMetaLessonBranchAware(
      metaLessonsById.root_with_invalid_child,
      findLessonById,
      findMetaLessonById
    );

    expect(selectedPath).toEqual(["lesson_a1", "lesson_a2", "lesson_a3"]);
    warnSpy.mockRestore();
  });

  it("terminates safely on circular references", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const selectedPath = resolveMetaLessonBranchAware(
      metaLessonsById.circular_root,
      findLessonById,
      findMetaLessonById
    );

    expect(selectedPath).toEqual([]);
    warnSpy.mockRestore();
  });
});

describe("resolveMetaLessonDeterministic", () => {
  const lessonsById = {
    lesson_a1: { id: "lesson_a1" },
    lesson_a2: { id: "lesson_a2" },
    lesson_a3: { id: "lesson_a3" },
    lesson_b1: { id: "lesson_b1" },
    lesson_b2: { id: "lesson_b2" },
    lesson_b3: { id: "lesson_b3" },
    lesson_c1: { id: "lesson_c1" },
    lesson_c2: { id: "lesson_c2" },
    lesson_c3: { id: "lesson_c3" },
  };

  const metaLessonsById = {
    condition_a: {
      id: "condition_a",
      type: "meta_lesson",
      order: "sequence",
      choose: "all",
      lessons: ["lesson_a1", "lesson_a2", "lesson_a3"],
    },
    condition_b: {
      id: "condition_b",
      type: "meta_lesson",
      order: "sequence",
      choose: "all",
      lessons: ["lesson_b1", "lesson_b2", "lesson_b3"],
    },
    condition_c: {
      id: "condition_c",
      type: "meta_lesson",
      order: "sequence",
      choose: "all",
      lessons: ["lesson_c1", "lesson_c2", "lesson_c3"],
    },
    root_ab: {
      id: "root_ab",
      type: "meta_lesson",
      order: "random",
      choose: "1",
      lessons: ["condition_a", "condition_b", "condition_c"],
    },
    root_two_way: {
      id: "root_two_way",
      type: "meta_lesson",
      order: "random",
      choose: "1",
      lessons: ["condition_a", "condition_b"],
    },
    root_sequence_all: {
      id: "root_sequence_all",
      type: "meta_lesson",
      order: "sequence",
      choose: "all",
      lessons: ["condition_a", "condition_b"],
    },
    root_with_invalid_child: {
      id: "root_with_invalid_child",
      type: "meta_lesson",
      order: "random",
      choose: "1",
      lessons: ["missing_child", "condition_a"],
    },
    circular_root: {
      id: "circular_root",
      type: "meta_lesson",
      order: "random",
      choose: "1",
      lessons: ["circular_root"],
    },
  };

  const findLessonById = (id) => lessonsById[id];
  const findMetaLessonById = (id) => metaLessonsById[id];

  it("is deterministic -- same userId always resolves to the same path", () => {
    const first = resolveMetaLessonDeterministic(metaLessonsById.root_ab, "student-alpha", findLessonById, findMetaLessonById);
    const second = resolveMetaLessonDeterministic(metaLessonsById.root_ab, "student-alpha", findLessonById, findMetaLessonById);
    expect(first).toEqual(second);
  });

  it("resolves different known userIds to their correct branch in a 3-way split", () => {
    // These userId -> branch mappings are pre-computed from the real hash function --
    // if this test ever fails, the hash function's behavior changed.
    expect(
      resolveMetaLessonDeterministic(metaLessonsById.root_ab, "student-bravo", findLessonById, findMetaLessonById)
    ).toEqual(["lesson_a1", "lesson_a2", "lesson_a3"]);

    expect(
      resolveMetaLessonDeterministic(metaLessonsById.root_ab, "student-delta", findLessonById, findMetaLessonById)
    ).toEqual(["lesson_b1", "lesson_b2", "lesson_b3"]);

    expect(
      resolveMetaLessonDeterministic(metaLessonsById.root_ab, "student-alpha", findLessonById, findMetaLessonById)
    ).toEqual(["lesson_c1", "lesson_c2", "lesson_c3"]);
  });

  it("also works correctly for a 2-way split, not just 3-way", () => {
    expect(
      resolveMetaLessonDeterministic(metaLessonsById.root_two_way, "student-alpha", findLessonById, findMetaLessonById)
    ).toEqual(["lesson_a1", "lesson_a2", "lesson_a3"]);

    expect(
      resolveMetaLessonDeterministic(metaLessonsById.root_two_way, "student-echo", findLessonById, findMetaLessonById)
    ).toEqual(["lesson_b1", "lesson_b2", "lesson_b3"]);
  });

  it("keeps legacy sequence/all flattening behavior unaffected by userId", () => {
    const flattened = resolveMetaLessonDeterministic(
      metaLessonsById.root_sequence_all,
      "student-alpha",
      findLessonById,
      findMetaLessonById
    );
    expect(flattened).toEqual([
      "lesson_a1",
      "lesson_a2",
      "lesson_a3",
      "lesson_b1",
      "lesson_b2",
      "lesson_b3",
    ]);
  });

  it("skips invalid children regardless of which position they land in after reordering", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    // student-alpha and student-echo hash to different indices in this 2-item list,
    // so this also confirms the fallback works no matter which position the invalid
    // entry ends up in after reordering.
    const resultA = resolveMetaLessonDeterministic(
      metaLessonsById.root_with_invalid_child,
      "student-alpha",
      findLessonById,
      findMetaLessonById
    );
    const resultB = resolveMetaLessonDeterministic(
      metaLessonsById.root_with_invalid_child,
      "student-echo",
      findLessonById,
      findMetaLessonById
    );
    expect(resultA).toEqual(["lesson_a1", "lesson_a2", "lesson_a3"]);
    expect(resultB).toEqual(["lesson_a1", "lesson_a2", "lesson_a3"]);
    warnSpy.mockRestore();
  });

  it("terminates safely on circular references", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const result = resolveMetaLessonDeterministic(
      metaLessonsById.circular_root,
      "student-alpha",
      findLessonById,
      findMetaLessonById
    );
    expect(result).toEqual([]);
    warnSpy.mockRestore();
  });
});

describe("resolveMetaLesson", () => {
  it("still flattens nested meta lessons", () => {
    const lessonsById = {
      l1: { id: "l1" },
      l2: { id: "l2" },
      l3: { id: "l3" },
    };
    const nestedMeta = {
      id: "nested",
      type: "meta_lesson",
      lessons: ["l2", "l3"],
      order: "sequence",
      choose: "all",
    };
    const rootMeta = {
      id: "root",
      type: "meta_lesson",
      lessons: ["l1", "nested"],
      order: "sequence",
      choose: "all",
    };
    const metaLessonsById = { nested: nestedMeta };

    const findLessonById = (id) => lessonsById[id];
    const findMetaLessonById = (id) => metaLessonsById[id];

    expect(resolveMetaLesson(rootMeta, findLessonById, findMetaLessonById)).toEqual(["l1", "l2", "l3"]);
  });
});
