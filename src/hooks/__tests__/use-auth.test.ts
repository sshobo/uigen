import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock server actions
const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignInAction(...args),
  signUp: (...args: unknown[]) => mockSignUpAction(...args),
}));

// Mock anon work tracker
const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

// Mock project actions
const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-project-id" });
  });

  describe("initial state", () => {
    it("starts with isLoading false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    it("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });

  describe("signIn", () => {
    it("returns the result from signInAction on failure", async () => {
      const failResult = { success: false, error: "Invalid credentials" };
      mockSignInAction.mockResolvedValue(failResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;

      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "wrongpass");
      });

      expect(mockSignInAction).toHaveBeenCalledWith("user@example.com", "wrongpass");
      expect(returnValue).toEqual(failResult);
    });

    it("sets isLoading true during call and false after", async () => {
      let resolveSignIn!: (v: unknown) => void;
      mockSignInAction.mockReturnValue(new Promise((r) => (resolveSignIn = r)));

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signIn("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: false, error: "err" });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("does not call handlePostSignIn when signIn fails", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "wrongpass");
      });

      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("sets isLoading false even when signInAction throws", async () => {
      mockSignInAction.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("user@example.com", "password123");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });

    describe("post sign-in routing", () => {
      beforeEach(() => {
        mockSignInAction.mockResolvedValue({ success: true });
      });

      it("creates a project from anon work and navigates to it when anon messages exist", async () => {
        const anonWork = {
          messages: [{ role: "user", content: "hello" }],
          fileSystemData: { "/App.tsx": { type: "file", content: "..." } },
        };
        mockGetAnonWorkData.mockReturnValue(anonWork);
        mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: anonWork.messages,
            data: anonWork.fileSystemData,
          })
        );
        expect(mockClearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
        expect(mockGetProjects).not.toHaveBeenCalled();
      });

      it("skips anon work path when anonWork has no messages", async () => {
        mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
        mockGetProjects.mockResolvedValue([{ id: "existing-project-id" }]);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).not.toHaveBeenCalled();
        expect(mockClearAnonWork).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/existing-project-id");
      });

      it("skips anon work path when getAnonWorkData returns null", async () => {
        mockGetAnonWorkData.mockReturnValue(null);
        mockGetProjects.mockResolvedValue([{ id: "existing-project-id" }]);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/existing-project-id");
      });

      it("navigates to the most recent existing project when no anon work", async () => {
        mockGetProjects.mockResolvedValue([
          { id: "most-recent-id" },
          { id: "older-id" },
        ]);

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/most-recent-id");
        expect(mockCreateProject).not.toHaveBeenCalled();
      });

      it("creates a new project and navigates to it when no existing projects", async () => {
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "brand-new-id" });

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [],
            data: {},
          })
        );
        expect(mockPush).toHaveBeenCalledWith("/brand-new-id");
      });

      it("includes a name in the new project", async () => {
        mockGetProjects.mockResolvedValue([]);
        mockCreateProject.mockResolvedValue({ id: "brand-new-id" });

        const { result } = renderHook(() => useAuth());
        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockCreateProject).toHaveBeenCalledWith(
          expect.objectContaining({ name: expect.any(String) })
        );
      });
    });
  });

  describe("signUp", () => {
    it("returns the result from signUpAction on failure", async () => {
      const failResult = { success: false, error: "Email already registered" };
      mockSignUpAction.mockResolvedValue(failResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;

      await act(async () => {
        returnValue = await result.current.signUp("user@example.com", "password123");
      });

      expect(mockSignUpAction).toHaveBeenCalledWith("user@example.com", "password123");
      expect(returnValue).toEqual(failResult);
    });

    it("sets isLoading true during call and false after", async () => {
      let resolveSignUp!: (v: unknown) => void;
      mockSignUpAction.mockReturnValue(new Promise((r) => (resolveSignUp = r)));

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signUp("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: false, error: "err" });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("does not call handlePostSignIn when signUp fails", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("user@example.com", "password123");
      });

      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("sets isLoading false even when signUpAction throws", async () => {
      mockSignUpAction.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUp("user@example.com", "password123");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("runs the same post-sign-in flow on successful sign up", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "existing-project-id" }]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("newuser@example.com", "securepassword");
      });

      expect(mockPush).toHaveBeenCalledWith("/existing-project-id");
    });

    it("creates a project from anon work on successful sign up", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "build me something" }],
        fileSystemData: { "/App.tsx": { type: "file", content: "..." } },
      });
      mockCreateProject.mockResolvedValue({ id: "signup-anon-project" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("newuser@example.com", "securepassword");
      });

      expect(mockCreateProject).toHaveBeenCalled();
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/signup-anon-project");
    });
  });
});
