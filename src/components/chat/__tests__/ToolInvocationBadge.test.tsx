import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, test, expect } from "vitest";
import { ToolInvocation } from "ai";
import {
  getToolLabel,
  ToolInvocationBadge,
} from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// getToolLabel — pure function tests
// ---------------------------------------------------------------------------

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "partial-call" | "result" = "call"
): ToolInvocation {
  return { toolCallId: "test", toolName, args, state } as ToolInvocation;
}

test("getToolLabel: str_replace_editor create", () => {
  const label = getToolLabel(
    makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" })
  );
  expect(label).toBe("Creating App.jsx");
});

test("getToolLabel: str_replace_editor str_replace", () => {
  const label = getToolLabel(
    makeInvocation("str_replace_editor", { command: "str_replace", path: "/App.jsx" })
  );
  expect(label).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor insert", () => {
  const label = getToolLabel(
    makeInvocation("str_replace_editor", { command: "insert", path: "/App.jsx" })
  );
  expect(label).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor undo_edit", () => {
  const label = getToolLabel(
    makeInvocation("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })
  );
  expect(label).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor view", () => {
  const label = getToolLabel(
    makeInvocation("str_replace_editor", { command: "view", path: "/App.jsx" })
  );
  expect(label).toBe("Reading App.jsx");
});

test("getToolLabel: file_manager delete", () => {
  const label = getToolLabel(
    makeInvocation("file_manager", { command: "delete", path: "/src/Foo.tsx" })
  );
  expect(label).toBe("Deleting Foo.tsx");
});

test("getToolLabel: file_manager rename", () => {
  const label = getToolLabel(
    makeInvocation("file_manager", {
      command: "rename",
      path: "/src/Old.tsx",
      new_path: "/src/New.tsx",
    })
  );
  expect(label).toBe("Renaming Old.tsx → New.tsx");
});

test("getToolLabel: extracts basename from nested path", () => {
  const label = getToolLabel(
    makeInvocation("str_replace_editor", {
      command: "create",
      path: "src/components/Card.jsx",
    })
  );
  expect(label).toBe("Creating Card.jsx");
});

test("getToolLabel: unknown tool falls back to toolName", () => {
  const label = getToolLabel(
    makeInvocation("some_other_tool", { command: "create", path: "/App.jsx" })
  );
  expect(label).toBe("some_other_tool");
});

test("getToolLabel: missing args.path falls back to toolName", () => {
  const label = getToolLabel(makeInvocation("str_replace_editor", {}));
  expect(label).toBe("str_replace_editor");
});

test("getToolLabel: unknown command on known tool falls back to toolName", () => {
  const label = getToolLabel(
    makeInvocation("str_replace_editor", {
      command: "unknown_cmd",
      path: "/App.jsx",
    })
  );
  expect(label).toBe("str_replace_editor");
});

// ---------------------------------------------------------------------------
// ToolInvocationBadge — render tests
// ---------------------------------------------------------------------------

test("shows spinner when state is call", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/App.jsx",
      })}
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeTruthy();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows spinner when state is partial-call", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/App.jsx",
      }, "partial-call")}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeTruthy();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows green dot when state is result with truthy result", () => {
  const invocation = {
    ...makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "result"),
    result: "ok",
  } as ToolInvocation;
  const { container } = render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("shows spinner when state is result but result is null", () => {
  const invocation = {
    ...makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "result"),
    result: null,
  } as unknown as ToolInvocation;
  const { container } = render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(container.querySelector(".animate-spin")).toBeTruthy();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("badge has correct CSS classes", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/App.jsx",
      })}
    />
  );
  const badge = container.firstChild as HTMLElement;
  expect(badge.className).toContain("inline-flex");
  expect(badge.className).toContain("bg-neutral-50");
  expect(badge.className).toContain("rounded-lg");
  expect(badge.className).toContain("font-mono");
  expect(badge.className).toContain("border-neutral-200");
});

test("rename label shows both filenames", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("file_manager", {
        command: "rename",
        path: "/src/Old.tsx",
        new_path: "/src/New.tsx",
      })}
    />
  );
  expect(screen.getByText("Renaming Old.tsx → New.tsx")).toBeDefined();
});
