import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Tools from "./pages/Tools";
import About from "./pages/About";
import Docs from "./pages/Docs";
import { Sidebar } from "./components/Layout/Sidebar";
import standardized_mortality_ratio from "./pages/biostatistics/standardized_mortality_ratio";
import Settings from "./pages/settings";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/tools"} component={Tools} />
      <Route path={"/about"} component={About} />
      <Route path={"/docs"} component={Docs} />
      <Route path={"/404"} component={NotFound} />
      <Route path="/biostatistics/std-mortality-ratio" component={standardized_mortality_ratio} />
      <Route path="/settings" component={Settings} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Réduite par défaut sur desktop

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          
          <div className="flex h-screen bg-background">
            {/* Sidebar fixe */}
            <Sidebar
              isOpen={sidebarOpen}
              setIsOpen={setSidebarOpen}
              isCollapsed={sidebarCollapsed}
              setIsCollapsed={setSidebarCollapsed}
            />

            {/* Contenu principal – décalé sur desktop pour éviter le chevauchement */}
            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
              {/* Page content */}
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;