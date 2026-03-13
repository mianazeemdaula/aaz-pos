import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider, ApiStatusProvider } from "./contexts";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <ApiStatusProvider>
        <App />
      </ApiStatusProvider>
    </AuthProvider>
  </React.StrictMode>,
);
