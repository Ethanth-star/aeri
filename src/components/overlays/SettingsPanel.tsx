import { useChatStore } from "../../stores/useChatStore";

export default function SettingsPanel() {
  const showSettings = useChatStore((s) => s.showSettings);
  const toggleSettings = useChatStore((s) => s.toggleSettings);
  const config = useChatStore((s) => s.config);
  const setConfig = useChatStore((s) => s.setConfig);
  const city = useChatStore((s) => s.city);
  const setCity = useChatStore((s) => s.setCity);

  return (
    <>
      <button className="toolbar-btn" onClick={toggleSettings} title="设置">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: "transform 0.2s",
            transform: showSettings ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {showSettings && (
        <div className="settings-overlay" onClick={toggleSettings}>
          <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <label className="settings-field">
              <span>API URL</span>
              <input
                value={config.baseUrl}
                onChange={(e) => setConfig({ baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </label>

            <label className="settings-field">
              <span>API Key</span>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </label>

            <label className="settings-field">
              <span>Model</span>
              <input
                value={config.model}
                onChange={(e) => setConfig({ model: e.target.value })}
                placeholder="gpt-4o-mini"
              />
            </label>

            <label className="settings-field">
              <span>City</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Beijing"
              />
            </label>
          </div>
        </div>
      )}
    </>
  );
}
