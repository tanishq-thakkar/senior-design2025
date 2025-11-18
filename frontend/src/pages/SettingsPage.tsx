import SettingsView from '../components/settings/SettingsView'

const SettingsPage = () => (
  <div className="space-y-4">
    <header>
      <p className="text-xs uppercase tracking-[0.3em] text-textSecondary">
        Settings
      </p>
      <h2 className="text-3xl font-semibold text-textPrimary">
        Configure UniSync
      </h2>
      <p className="text-sm text-textSecondary">
        Control voice, ML features, and privacy preferences.
      </p>
    </header>
    <SettingsView />
  </div>
)

export default SettingsPage

