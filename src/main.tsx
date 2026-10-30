import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PrinterModule } from "./modules/printers";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/impressoras" replace />} />
        <Route
          path="/impressoras/*"
          element={<PrinterModule basePath="/impressoras" apiBasePath="/api" />}
        />
        <Route path="*" element={<Navigate to="/impressoras" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
