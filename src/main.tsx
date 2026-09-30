import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider, ApiStatusProvider, SettingsProvider, ThemeProvider } from "./contexts";
import { installBrowserShortcutGuard } from "./utils/blockBrowserShortcuts";

installBrowserShortcutGuard();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <ApiStatusProvider>
            <App />
          </ApiStatusProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
