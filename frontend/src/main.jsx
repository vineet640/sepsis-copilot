import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ModeProvider } from "./context/ModeContext.jsx";
import { PatientQuestionsProvider } from "./context/PatientQuestionsContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PatientQuestionsProvider>
          <ThemeProvider>
            <ModeProvider>
              <App />
            </ModeProvider>
          </ThemeProvider>
        </PatientQuestionsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
