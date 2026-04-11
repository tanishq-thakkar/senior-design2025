import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ExternalLink,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Integration } from "@/types/chat";
import { formatDistanceToNow } from "date-fns";
import { API_BASE, ngrokSkipBrowserWarningHeaders } from "@/lib/api";

const CANVAS_BASE_URL_KEY = "unisync_canvas_base_url";
const CANVAS_TOKEN_KEY = "unisync_canvas_token";
const OUTLOOK_TOKEN_KEY = "unisync_outlook_token";

const initialIntegrations: Integration[] = [
  {
    id: "canvas",
    name: "Canvas LMS",
    icon: "📘",
    status: "not_connected",
    permissions: [
      "View assignments and deadlines",
      "Read course announcements",
      "Access grades",
    ],
  },
  {
    id: "outlook",
    name: "Outlook",
    icon: "📧",
    status: "not_connected",
    permissions: [
      "Send email",
      "Read Outlook profile",
      "Use connected Outlook account in chat",
    ],
  },
  {
    id: "email",
    name: "University Email",
    icon: "📨",
    status: "not_connected",
    permissions: [
      "Reserved for future email integration",
      "Read email subjects and summaries",
      "Detect important notifications",
    ],
  },
  {
    id: "corq",
    name: "Corq Events",
    icon: "🎓",
    status: "connected",
    permissions: ["View campus events", "Access event details and locations"],
  },
  {
    id: "library",
    name: "Library System",
    icon: "📚",
    status: "not_connected",
    permissions: ["View due dates", "Check book availability"],
  },
];

const statusConfig = {
  connected: {
    icon: CheckCircle2,
    label: "Connected",
    className: "text-source-events",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    className: "text-source-calendar",
  },
  not_connected: {
    icon: XCircle,
    label: "Not connected",
    className: "text-muted-foreground",
  },
};

type CanvasStatusResponse = {
  connected: boolean;
  user?: {
    name?: string;
    id?: number | string;
  };
};

type OutlookStatusResponse = {
  connected: boolean;
  user?: {
    name?: string;
    id?: number | string;
    email?: string;
  };
};

function IntegrationCard({
  integration,
  onCanvasConnectClick,
  onCanvasRefresh,
  onCanvasDisconnect,
  onOutlookConnectClick,
  onOutlookRefresh,
  onOutlookDisconnect,
  canvasUserName,
  outlookUserName,
  outlookEmail,
  loadingCanvas,
  loadingOutlook,
}: {
  integration: Integration;
  onCanvasConnectClick: () => void;
  onCanvasRefresh: () => void;
  onCanvasDisconnect: () => void;
  onOutlookConnectClick: () => void;
  onOutlookRefresh: () => void;
  onOutlookDisconnect: () => void;
  canvasUserName: string | null;
  outlookUserName: string | null;
  outlookEmail: string | null;
  loadingCanvas: boolean;
  loadingOutlook: boolean;
}) {
  const status = statusConfig[integration.status];
  const StatusIcon = status.icon;
  const isCanvas = integration.id === "canvas";
  const isOutlook = integration.id === "outlook";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 transition-smooth",
        integration.status === "connected" &&
          "hover:border-primary/30 hover:shadow-soft"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{integration.icon}</span>
          <div>
            <h3 className="font-medium text-foreground">{integration.name}</h3>
            <div className="mt-1 flex items-center gap-1.5">
              <StatusIcon className={cn("h-4 w-4", status.className)} />
              <span className={cn("text-sm", status.className)}>
                {status.label}
              </span>
            </div>

            {isCanvas && canvasUserName && integration.status === "connected" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Connected as {canvasUserName}
              </p>
            )}

            {isOutlook && integration.status === "connected" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Connected as {outlookUserName || "Unknown user"}
                {outlookEmail ? ` (${outlookEmail})` : ""}
              </p>
            )}
          </div>
        </div>

        {isCanvas ? (
          integration.status === "connected" ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground"
                onClick={onCanvasRefresh}
                disabled={loadingCanvas}
              >
                <RefreshCw
                  className={cn("h-3 w-3", loadingCanvas && "animate-spin")}
                />
                Sync
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={onCanvasDisconnect}
                disabled={loadingCanvas}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="h-8"
              onClick={onCanvasConnectClick}
              disabled={loadingCanvas}
            >
              {loadingCanvas ? "Connecting..." : "Connect"}
            </Button>
          )
        ) : isOutlook ? (
          integration.status === "connected" ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground"
                onClick={onOutlookRefresh}
                disabled={loadingOutlook}
              >
                <RefreshCw
                  className={cn("h-3 w-3", loadingOutlook && "animate-spin")}
                />
                Sync
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={onOutlookDisconnect}
                disabled={loadingOutlook}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="h-8"
              onClick={onOutlookConnectClick}
              disabled={loadingOutlook}
            >
              {loadingOutlook ? "Connecting..." : "Connect"}
            </Button>
          )
        ) : integration.status === "connected" && integration.lastSync ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground"
          >
            <RefreshCw className="h-3 w-3" />
            Sync
          </Button>
        ) : integration.status === "not_connected" ? (
          <Button size="sm" className="h-8">
            Connect
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-8">
            Disconnect
          </Button>
        )}
      </div>

      {integration.lastSync && (
        <p className="mt-3 text-xs text-muted-foreground">
          Last synced {formatDistanceToNow(integration.lastSync, { addSuffix: true })}
        </p>
      )}

      <div className="mt-4 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Permissions
        </p>
        <ul className="space-y-1">
          {integration.permissions.map((perm, index) => (
            <li
              key={index}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              {perm}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Integrations() {
  const [integrations, setIntegrations] =
    useState<Integration[]>(initialIntegrations);

  const [canvasBaseUrl, setCanvasBaseUrl] = useState("");
  const [canvasAccessToken, setCanvasAccessToken] = useState("");
  const [showCanvasModal, setShowCanvasModal] = useState(false);
  const [loadingCanvas, setLoadingCanvas] = useState(false);
  const [canvasUserName, setCanvasUserName] = useState<string | null>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);

  const [outlookAccessToken, setOutlookAccessToken] = useState("");
  const [showOutlookModal, setShowOutlookModal] = useState(false);
  const [loadingOutlook, setLoadingOutlook] = useState(false);
  const [outlookUserName, setOutlookUserName] = useState<string | null>(null);
  const [outlookEmail, setOutlookEmail] = useState<string | null>(null);
  const [outlookError, setOutlookError] = useState<string | null>(null);

  const updateIntegrationStatus = (
    integrationId: string,
    connected: boolean
  ) => {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === integrationId
          ? {
              ...integration,
              status: connected ? "connected" : "not_connected",
              lastSync: connected ? new Date() : undefined,
            }
          : integration
      )
    );
  };

  const fetchCanvasStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/canvas/status`, {
        credentials: "include",
        headers: {
          ...ngrokSkipBrowserWarningHeaders(),
        },
      });

      const data: CanvasStatusResponse = await res.json();

      if (data.connected) {
        updateIntegrationStatus("canvas", true);
        setCanvasUserName(data.user?.name ?? null);
      } else {
        updateIntegrationStatus("canvas", false);
        setCanvasUserName(null);
      }
    } catch (error) {
      console.error("Canvas status error:", error);
      updateIntegrationStatus("canvas", false);
      setCanvasUserName(null);
    }
  };

  const fetchOutlookStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/outlook/status`, {
        credentials: "include",
      });

      const data: OutlookStatusResponse = await res.json();

      if (data.connected) {
        updateIntegrationStatus("outlook", true);
        setOutlookUserName(data.user?.name ?? null);
        setOutlookEmail(data.user?.email ?? null);
      } else {
        updateIntegrationStatus("outlook", false);
        setOutlookUserName(null);
        setOutlookEmail(null);
      }
    } catch (error) {
      console.error("Outlook status error:", error);
      updateIntegrationStatus("outlook", false);
      setOutlookUserName(null);
      setOutlookEmail(null);
    }
  };

  const handleCanvasConnect = async () => {
    setCanvasError(null);

    if (!canvasBaseUrl.trim() || !canvasAccessToken.trim()) {
      setCanvasError("Please enter both Canvas base URL and access token.");
      return;
    }

    try {
      setLoadingCanvas(true);

      const cleanedBaseUrl = canvasBaseUrl.trim().replace(/\/+$/, "");
      const cleanedToken = canvasAccessToken.trim();

      const res = await fetch(`${API_BASE}/canvas/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...ngrokSkipBrowserWarningHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          canvasBaseUrl: cleanedBaseUrl,
          accessToken: cleanedToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to connect Canvas.");
      }

      localStorage.setItem(CANVAS_BASE_URL_KEY, cleanedBaseUrl);
      localStorage.setItem(CANVAS_TOKEN_KEY, cleanedToken);

      updateIntegrationStatus("canvas", true);
      setCanvasUserName(data.user?.name ?? null);
      setCanvasAccessToken("");
      setCanvasError(null);
      setShowCanvasModal(false);
    } catch (error) {
      console.error("Canvas connect error:", error);
      setCanvasError(
        error instanceof Error ? error.message : "Failed to connect Canvas."
      );
    } finally {
      setLoadingCanvas(false);
    }
  };

  const handleOutlookConnect = async () => {
    setOutlookError(null);

    if (!outlookAccessToken.trim()) {
      setOutlookError("Please enter a Microsoft Graph access token.");
      return;
    }

    try {
      setLoadingOutlook(true);

      const cleanedToken = outlookAccessToken.trim();

      const res = await fetch(`${API_BASE}/outlook/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          accessToken: cleanedToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to connect Outlook.");
      }

      localStorage.setItem(OUTLOOK_TOKEN_KEY, cleanedToken);

      updateIntegrationStatus("outlook", true);
      setOutlookUserName(data.user?.name ?? null);
      setOutlookEmail(data.user?.email ?? null);
      setOutlookAccessToken("");
      setOutlookError(null);
      setShowOutlookModal(false);
    } catch (error) {
      console.error("Outlook connect error:", error);
      setOutlookError(
        error instanceof Error ? error.message : "Failed to connect Outlook."
      );
    } finally {
      setLoadingOutlook(false);
    }
  };

  const handleCanvasDisconnect = async () => {
    try {
      setLoadingCanvas(true);

      const res = await fetch(`${API_BASE}/canvas/disconnect`, {
        method: "POST",
        headers: {
          ...ngrokSkipBrowserWarningHeaders(),
        },
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to disconnect Canvas.");
      }

      localStorage.removeItem(CANVAS_BASE_URL_KEY);
      localStorage.removeItem(CANVAS_TOKEN_KEY);

      updateIntegrationStatus("canvas", false);
      setCanvasUserName(null);
      setCanvasAccessToken("");
      setCanvasBaseUrl("");
      setCanvasError(null);
      setShowCanvasModal(false);
    } catch (error) {
      console.error("Canvas disconnect error:", error);
      setCanvasError(
        error instanceof Error ? error.message : "Failed to disconnect Canvas."
      );
    } finally {
      setLoadingCanvas(false);
    }
  };

  const handleOutlookDisconnect = async () => {
    try {
      setLoadingOutlook(true);

      const res = await fetch(`${API_BASE}/outlook/disconnect`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to disconnect Outlook.");
      }

      localStorage.removeItem(OUTLOOK_TOKEN_KEY);

      updateIntegrationStatus("outlook", false);
      setOutlookUserName(null);
      setOutlookEmail(null);
      setOutlookAccessToken("");
      setOutlookError(null);
      setShowOutlookModal(false);
    } catch (error) {
      console.error("Outlook disconnect error:", error);
      setOutlookError(
        error instanceof Error ? error.message : "Failed to disconnect Outlook."
      );
    } finally {
      setLoadingOutlook(false);
    }
  };

  const handleCanvasRefresh = async () => {
    try {
      setLoadingCanvas(true);
      await fetchCanvasStatus();
    } finally {
      setLoadingCanvas(false);
    }
  };

  const handleOutlookRefresh = async () => {
    try {
      setLoadingOutlook(true);
      await fetchOutlookStatus();
    } finally {
      setLoadingOutlook(false);
    }
  };

  useEffect(() => {
    const savedCanvasBaseUrl = localStorage.getItem(CANVAS_BASE_URL_KEY) || "";
    const savedCanvasToken = localStorage.getItem(CANVAS_TOKEN_KEY) || "";
    const savedOutlookToken = localStorage.getItem(OUTLOOK_TOKEN_KEY) || "";

    if (savedCanvasBaseUrl) {
      setCanvasBaseUrl(savedCanvasBaseUrl);
    }

    const initializeIntegrations = async () => {
      try {
        const canvasStatusRes = await fetch(`${API_BASE}/canvas/status`, {
          credentials: "include",
        });
        const canvasStatusData: CanvasStatusResponse =
          await canvasStatusRes.json();

        if (canvasStatusData.connected) {
          updateIntegrationStatus("canvas", true);
          setCanvasUserName(canvasStatusData.user?.name ?? null);
        } else if (savedCanvasBaseUrl && savedCanvasToken) {
          const reconnectRes = await fetch(`${API_BASE}/canvas/connect`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              canvasBaseUrl: savedCanvasBaseUrl.replace(/\/+$/, ""),
              accessToken: savedCanvasToken,
            }),
          });

          const reconnectData = await reconnectRes.json();

          if (reconnectRes.ok) {
            updateIntegrationStatus("canvas", true);
            setCanvasUserName(reconnectData.user?.name ?? null);
          } else {
            updateIntegrationStatus("canvas", false);
            setCanvasUserName(null);
          }
        } else {
          updateIntegrationStatus("canvas", false);
          setCanvasUserName(null);
        }

        const outlookStatusRes = await fetch(`${API_BASE}/outlook/status`, {
          credentials: "include",
        });
        const outlookStatusData: OutlookStatusResponse =
          await outlookStatusRes.json();

        if (outlookStatusData.connected) {
          updateIntegrationStatus("outlook", true);
          setOutlookUserName(outlookStatusData.user?.name ?? null);
          setOutlookEmail(outlookStatusData.user?.email ?? null);
        } else if (savedOutlookToken) {
          const reconnectRes = await fetch(`${API_BASE}/outlook/connect`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              accessToken: savedOutlookToken,
            }),
          });

          const reconnectData = await reconnectRes.json();

          if (reconnectRes.ok) {
            updateIntegrationStatus("outlook", true);
            setOutlookUserName(reconnectData.user?.name ?? null);
            setOutlookEmail(reconnectData.user?.email ?? null);
          } else {
            updateIntegrationStatus("outlook", false);
            setOutlookUserName(null);
            setOutlookEmail(null);
          }
        } else {
          updateIntegrationStatus("outlook", false);
          setOutlookUserName(null);
          setOutlookEmail(null);
        }
      } catch (error) {
        console.error("Integration init error:", error);
        updateIntegrationStatus("canvas", false);
        setCanvasUserName(null);
        updateIntegrationStatus("outlook", false);
        setOutlookUserName(null);
        setOutlookEmail(null);
      }
    };

    initializeIntegrations();
  }, []);

  const connectedCount = integrations.filter(
    (integration) => integration.status === "connected"
  ).length;

  return (
    <div className="min-h-screen px-4 pt-24 pb-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Integrations
          </h1>
          <p className="mt-1 text-muted-foreground">
            {connectedCount} of {integrations.length} services connected
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 animate-fade-in-up">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onCanvasConnectClick={() => {
                setCanvasError(null);
                setShowCanvasModal(true);
              }}
              onCanvasRefresh={handleCanvasRefresh}
              onCanvasDisconnect={handleCanvasDisconnect}
              onOutlookConnectClick={() => {
                setOutlookError(null);
                setShowOutlookModal(true);
              }}
              onOutlookRefresh={handleOutlookRefresh}
              onOutlookDisconnect={handleOutlookDisconnect}
              canvasUserName={canvasUserName}
              outlookUserName={outlookUserName}
              outlookEmail={outlookEmail}
              loadingCanvas={loadingCanvas}
              loadingOutlook={loadingOutlook}
            />
          ))}
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            UniSync only accesses data you explicitly allow. Canvas and Outlook
            credentials are handled through your active backend session.
          </p>
        </div>
      </div>

      {showCanvasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Connect Canvas LMS
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your Canvas base URL and personal access token.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCanvasModal(false);
                  setCanvasError(null);
                  setCanvasAccessToken("");
                }}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Canvas Base URL
                </label>
                <input
                  type="text"
                  value={canvasBaseUrl}
                  onChange={(e) => setCanvasBaseUrl(e.target.value)}
                  placeholder="https://your-school.instructure.com"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Access Token
                </label>
                <input
                  type="password"
                  value={canvasAccessToken}
                  onChange={(e) => setCanvasAccessToken(e.target.value)}
                  placeholder="Paste your Canvas access token"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>

              {canvasError && (
                <p className="text-sm text-red-500">{canvasError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCanvasConnect} disabled={loadingCanvas}>
                  {loadingCanvas ? "Connecting..." : "Save and Connect"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCanvasModal(false);
                    setCanvasError(null);
                    setCanvasAccessToken("");
                  }}
                  disabled={loadingCanvas}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOutlookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Connect Outlook
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your Microsoft Graph access token to connect Outlook.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowOutlookModal(false);
                  setOutlookError(null);
                  setOutlookAccessToken("");
                }}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Microsoft Graph Access Token
                </label>
                <input
                  type="password"
                  value={outlookAccessToken}
                  onChange={(e) => setOutlookAccessToken(e.target.value)}
                  placeholder="Paste your Graph access token"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>

              {outlookError && (
                <p className="text-sm text-red-500">{outlookError}</p>
              )}

              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Use the actual Microsoft Graph <span className="font-medium">access_token</span>.
                Tokens that are not valid Graph access tokens will fail to connect.
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleOutlookConnect} disabled={loadingOutlook}>
                  {loadingOutlook ? "Connecting..." : "Save and Connect"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOutlookModal(false);
                    setOutlookError(null);
                    setOutlookAccessToken("");
                  }}
                  disabled={loadingOutlook}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}