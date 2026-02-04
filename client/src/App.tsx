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
import Proportions from "./pages/biostatistics/proportions";
import RxCTable from "./pages/biostatistics/r_by_c";
import ScreeningTest from "./pages/biostatistics/screening";
import DoseResponse from "./pages/biostatistics/dose-response";
import TwoByTwo from "./pages/biostatistics/two_by_two";
import OneRate from "./pages/biostatistics/one_rate";
import TwoRatesComparison from "./pages/biostatistics/compare_two_rates";


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
      <Route path="/biostatistics/proportions" component={Proportions} />
      <Route path="/biostatistics/r_by_c" component={RxCTable} />
      <Route path="/biostatistics/screening" component={ScreeningTest} />
      <Route path="/biostatistics/dose-response" component={DoseResponse} />
      <Route path="/biostatistics/two_by_two" component={TwoByTwo} />
      <Route path="/biostatistics/one_rate" component={OneRate} />
      <Route path="/biostatistics/compare_two_rates" component={TwoRatesComparison} />
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