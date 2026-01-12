import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./App.css";

import { AuthProvider } from "./context/AuthContext";
import { WalletProvider } from "./context/WalletContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </AuthProvider>
  </React.StrictMode>
);
