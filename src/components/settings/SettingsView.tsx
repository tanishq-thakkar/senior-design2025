import { useState } from 'react'

const SettingsView = () => {
  const [voiceResponses, setVoiceResponses] = useState(true)
  const [experimentalMl, setExperimentalMl] = useState(false)
  const [privacyOptIn, setPrivacyOptIn] = useState(false)
  const [latencyPreference, setLatencyPreference] = useState<'fast' | 'balanced' | 'quality'>('balanced')

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/40 bg-background/30 p-6">
        <h3 className="text-lg font-semibold text-textPrimary">Assistant preferences</h3>
        <div className="mt-4 space-y-4">
          <label className="flex items-center justify-between rounded-2xl border border-border/30 bg-surface/60 p-4">
            <div>
              <p className="font-medium text-textPrimary">Enable voice responses</p>
              <p className="text-sm text-textSecondary">Use Amazon Polly to read answers aloud.</p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-accent"
              checked={voiceResponses}
              onChange={(event) => setVoiceResponses(event.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-border/30 bg-surface/60 p-4">
            <div>
              <p className="font-medium text-textPrimary">Use experimental ML features</p>
              <p className="text-sm text-textSecondary">Try SageMaker intent and routing upgrades.</p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-accent"
              checked={experimentalMl}
              onChange={(event) => setExperimentalMl(event.target.checked)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-border/40 bg-background/30 p-6">
        <h3 className="text-lg font-semibold text-textPrimary">Latency vs. quality</h3>
        <p className="mt-1 text-sm text-textSecondary">Choose how UniSync balances response speed with depth.</p>
        <select
          className="mt-4 w-full rounded-2xl border border-border/30 bg-surface/60 px-4 py-3 text-textPrimary"
          value={latencyPreference}
          onChange={(event) => setLatencyPreference(event.target.value as typeof latencyPreference)}
        >
          <option value="fast">Faster responses</option>
          <option value="balanced">Balanced</option>
          <option value="quality">Higher quality</option>
        </select>
      </section>

      <section className="rounded-3xl border border-border/40 bg-background/30 p-6">
        <h3 className="text-lg font-semibold text-textPrimary">FERPA & privacy</h3>
        <p className="mt-1 text-sm text-textSecondary">
          UniSync only uses your own UC data. Nothing is shared outside of University of Cincinnati systems.
        </p>
        <label className="mt-4 flex items-center justify-between rounded-2xl border border-border/30 bg-surface/60 p-4">
          <div>
            <p className="font-medium text-textPrimary">Allow anonymized data for model improvement</p>
            <p className="text-sm text-textSecondary">Optional opt-in to help us improve accuracy.</p>
          </div>
          <input
            type="checkbox"
            className="h-5 w-5 accent-accent"
            checked={privacyOptIn}
            onChange={(event) => setPrivacyOptIn(event.target.checked)}
          />
        </label>
      </section>
    </div>
  )
}

export default SettingsView

