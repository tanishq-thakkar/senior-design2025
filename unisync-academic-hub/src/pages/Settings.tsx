import { useSettings } from "@/contexts/SettingsContext"
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { settings, updateSetting, clearAllData } = useSettings();
  const { toast } = useToast();

  const handleDownloadData = () => {
    const data = {
      settings,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "unisync-data.json";
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Data downloaded",
      description: "Your UniSync data export is ready.",
    });
  };

  const handleUsageDetails = () => {
    toast({
      title: "Data usage",
      description: "UniSync stores your local preferences and session data on this device.",
    });
  };

  const handleDeleteAllData = () => {
    clearAllData();
    toast({
      title: "Data cleared",
      description: "All local UniSync data has been deleted.",
      variant: "destructive",
    });
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
            UniSync accesses your academic data only when you ask a question. We don't
            store your emails, assignments, or calendar events.
          </p>

          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-between" onClick={handleUsageDetails}>
              View data usage details
            </Button>

            <Button variant="outline" className="w-full justify-between" onClick={handleDownloadData}>
              Download my data
            </Button>

            <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600" onClick={handleDeleteAllData}>
              Delete all my data
            </Button>
          </div>
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