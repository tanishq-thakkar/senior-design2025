import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import type { PrivacyUsageResponse, PrivacyExportResponse } from "@/types/chat";

export default function Settings() {
  const { settings, updateSetting, clearAllLocalData } = useSettings();
  const { toast } = useToast();

  const [usageDetails, setUsageDetails] = useState<PrivacyUsageResponse | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDownloadData = async () => {
    try {
      setLoadingExport(true);

      const backendExport = await apiFetch<PrivacyExportResponse>("/privacy/export");

      const mergedData = {
        exportedAt: new Date().toISOString(),
        frontend: {
          settings,
          localStorageSnapshot: {
            unisync_settings: localStorage.getItem("unisync_settings"),
            token: localStorage.getItem("token"),
            unisync_conversations: localStorage.getItem("unisync_conversations"),
          },
        },
        backend: backendExport,
      };

      const blob = new Blob([JSON.stringify(mergedData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "unisync-data-export.json";
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Data downloaded",
        description: "Your full UniSync export is ready.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not export your data.",
        variant: "destructive",
      });
    } finally {
      setLoadingExport(false);
    }
  };

  const handleUsageDetails = async () => {
    try {
      setLoadingUsage(true);
      const usage = await apiFetch<PrivacyUsageResponse>("/privacy/usage");
      setUsageDetails(usage);

      toast({
        title: "Data usage loaded",
        description: "Scroll down to review your UniSync data usage details.",
      });
    } catch (error) {
      toast({
        title: "Could not load usage details",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleDeleteAllData = async () => {
    try {
      setDeleting(true);

      await apiFetch<{ success: boolean; message: string }>("/privacy/data", {
        method: "DELETE",
      });

      clearAllLocalData();

      toast({
        title: "Data cleared",
        description: "All UniSync backend and local prototype data has been deleted.",
        variant: "destructive",
      });

      setUsageDetails(null);
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete your data.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 mt-20">
      <h1 className="text-5xl font-bold">Settings</h1>
      <p className="mt-2 text-muted-foreground">Customize your UniSync experience</p>

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border p-6">
          <h2 className="mb-6 text-2xl font-semibold">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark mode</p>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark themes
              </p>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={(checked) => updateSetting("darkMode", checked)}
            />
          </div>
        </section>

        <section className="rounded-2xl border p-6">
          <h2 className="mb-6 text-2xl font-semibold">Voice</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Voice input</p>
                <p className="text-sm text-muted-foreground">
                  Enable microphone for voice queries
                </p>
              </div>
              <Switch
                checked={settings.voiceInput}
                onCheckedChange={(checked) => updateSetting("voiceInput", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Speech output</p>
                <p className="text-sm text-muted-foreground">
                  Let UniSync read responses aloud
                </p>
              </div>
              <Switch
                checked={settings.speechOutput}
                onCheckedChange={(checked) => updateSetting("speechOutput", checked)}
              />
            </div>

            <div>
              <p className="mb-3 font-medium">Speech speed</p>
              <Slider
                value={[settings.speechSpeed]}
                min={0.5}
                max={2}
                step={0.1}
                onValueChange={(value) => updateSetting("speechSpeed", value[0])}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                {settings.speechSpeed.toFixed(1)}x
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border p-6">
          <h2 className="mb-6 text-2xl font-semibold">Language & Translation</h2>
          <div className="space-y-6">
            <div>
              <p className="mb-2 font-medium">Input language</p>
              <p className="mb-3 text-sm text-muted-foreground">
                Choose the language students type or speak in
              </p>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2"
                value={settings.inputLanguage}
                onChange={(e) => updateSetting("inputLanguage", e.target.value)}
              >
                <option value="auto">Auto detect</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="hi">Hindi</option>
                <option value="fr">French</option>
                <option value="ar">Arabic</option>
                <option value="zh">Chinese</option>
              </select>
            </div>

            <div>
              <p className="mb-2 font-medium">Output text language</p>
              <p className="mb-3 text-sm text-muted-foreground">
                Choose the language used for written responses
              </p>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2"
                value={settings.outputTextLanguage}
                onChange={(e) => updateSetting("outputTextLanguage", e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="hi">Hindi</option>
                <option value="fr">French</option>
                <option value="ar">Arabic</option>
                <option value="zh">Chinese</option>
              </select>
            </div>

            <div>
              <p className="mb-2 font-medium">Output speech language</p>
              <p className="mb-3 text-sm text-muted-foreground">
                Choose the spoken language for voice responses
              </p>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2"
                value={settings.outputSpeechLanguage}
                onChange={(e) => updateSetting("outputSpeechLanguage", e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="hi">Hindi</option>
                <option value="fr">French</option>
                <option value="ar">Arabic</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border p-6">
          <h2 className="mb-6 text-2xl font-semibold">Accessibility</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Captions</p>
                <p className="text-sm text-muted-foreground">
                  Show text captions for voice responses
                </p>
              </div>
              <Switch
                checked={settings.captions}
                onCheckedChange={(checked) => updateSetting("captions", checked)}
              />
            </div>

            <div>
              <p className="mb-3 font-medium">Text size</p>
              <Slider
                value={[settings.textSize]}
                min={14}
                max={22}
                step={1}
                onValueChange={(value) => updateSetting("textSize", value[0])}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                {settings.textSize}px
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">High contrast</p>
                <p className="text-sm text-muted-foreground">
                  Increase color contrast for better visibility
                </p>
              </div>
              <Switch
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSetting("highContrast", checked)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border p-6">
          <h2 className="mb-6 text-2xl font-semibold">Privacy & Data</h2>
          <p className="mb-6 text-muted-foreground">
            UniSync stores prototype chat history in the backend while the server is running
            and keeps your UI preferences in local browser storage.
          </p>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={handleUsageDetails}
              disabled={loadingUsage}
            >
              {loadingUsage ? "Loading data usage..." : "View data usage details"}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={handleDownloadData}
              disabled={loadingExport}
            >
              {loadingExport ? "Preparing export..." : "Download my data"}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-red-500 hover:text-red-600"
              onClick={handleDeleteAllData}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete all my data"}
            </Button>
          </div>

          {usageDetails && (
            <div className="mt-6 rounded-xl border bg-muted/30 p-4 space-y-3">
              <h3 className="text-lg font-semibold">Data usage details</h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">Total conversations</p>
                  <p className="text-xl font-bold">{usageDetails.totalConversations}</p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">Total messages</p>
                  <p className="text-xl font-bold">{usageDetails.totalMessages}</p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">User messages</p>
                  <p className="text-xl font-bold">{usageDetails.userMessages}</p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">Assistant messages</p>
                  <p className="text-xl font-bold">{usageDetails.assistantMessages}</p>
                </div>
              </div>

              <div>
                <p className="font-medium">Browser storage keys</p>
                <p className="text-sm text-muted-foreground">
                  {usageDetails.localStorageKeysExpected.join(", ")}
                </p>
              </div>

              <div>
                <p className="font-medium">Backend data types</p>
                <p className="text-sm text-muted-foreground">
                  {usageDetails.backendStores.join(", ")}
                </p>
              </div>

              <div>
                <p className="font-medium">LLM provider</p>
                <p className="text-sm text-muted-foreground">
                  {usageDetails.llmProvider} · {usageDetails.modelUsed}
                </p>
              </div>

              <div>
                <p className="font-medium">Retention note</p>
                <p className="text-sm text-muted-foreground">
                  {usageDetails.retentionNote}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border p-6">
          <h2 className="mb-6 text-2xl font-semibold">Notifications</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Assignment reminders</p>
                <p className="text-sm text-muted-foreground">
                  Get notified about upcoming deadlines
                </p>
              </div>
              <Switch
                checked={settings.assignmentReminders}
                onCheckedChange={(checked) => updateSetting("assignmentReminders", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Calendar alerts</p>
                <p className="text-sm text-muted-foreground">
                  Reminders for classes and meetings
                </p>
              </div>
              <Switch
                checked={settings.calendarAlerts}
                onCheckedChange={(checked) => updateSetting("calendarAlerts", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Weekly digest</p>
                <p className="text-sm text-muted-foreground">
                  Summary of your upcoming week
                </p>
              </div>
              <Switch
                checked={settings.weeklyDigest}
                onCheckedChange={(checked) => updateSetting("weeklyDigest", checked)}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}