import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE, ngrokSkipBrowserWarningHeaders } from "@/lib/api";

type CanvasCourse = {
  id: number;
  name: string;
  course_code?: string;
  workflow_state?: string;
  start_at?: string | null;
  end_at?: string | null;
};

export default function Schedule() {
  const [courses, setCourses] = useState<CanvasCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const res = await fetch(`${API_BASE}/canvas/courses`, {
        credentials: "include",
        headers: {
          ...ngrokSkipBrowserWarningHeaders(),
        },
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : null;

      if (res.status === 401) {
        setConnected(false);
        setCourses([]);
        return;
      }

      if (!res.ok) {
        throw new Error(
          (data && (data.detail || data.error)) || "Failed to fetch Canvas courses"
        );
      }

      setConnected(true);
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching Canvas courses:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setCourses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen px-4 pt-24 pb-12">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Schedule
          </h1>
          <p className="mt-2 text-muted-foreground">Loading your Canvas courses...</p>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen px-4 pt-24 pb-12">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Schedule
            </h1>
            <p className="mt-2 text-muted-foreground">
              Canvas is not connected for this session.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-500" />
              <div>
                <h2 className="font-medium text-foreground">Connect Canvas first</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Go to the Integrations page, connect your Canvas account, then come back here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-24 pb-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Schedule
            </h1>
            <p className="mt-1 text-muted-foreground">
              Real courses loaded from your Canvas LMS
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => fetchCourses(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {courses.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-muted-foreground">
              Canvas is connected, but no active courses were returned for this account.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/30"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-medium text-foreground">
                      {course.name}
                    </h2>

                    {course.course_code && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {course.course_code}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {course.workflow_state && (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                          {course.workflow_state}
                        </span>
                      )}
                      <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-400">
                        Canvas
                      </span>
                    </div>

                    {(course.start_at || course.end_at) && (
                      <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                        {course.start_at && (
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                              Starts: {new Date(course.start_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {course.end_at && (
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                              Ends: {new Date(course.end_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}