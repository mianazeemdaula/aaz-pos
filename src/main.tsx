import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider, ApiStatusProvider, SettingsProvider } from "./contexts";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <ApiStatusProvider>
          <App />
        </ApiStatusProvider>
      </SettingsProvider>
    </AuthProvider>
  </React.StrictMode>,
);
