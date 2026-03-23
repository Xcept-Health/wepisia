// App.tsx

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useState, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import Home from "./pages/Home";
import Tools from "./pages/Tools";
import About from "./pages/About";
import Docs from "./pages/Docs";
import { Sidebar } from "./components/Layout/Sidebar";
import standardized_mortality_ratio from "./pages/biostatistics/standardized_mortality_ratio";
import Proportions from "./pages/biostatistics/proportions";
import RxCTable from "./pages/biostatistics/r_by_c";
import ScreeningTest from "./pages/biostatistics/screening";
import DoseResponse from "./pages/biostatistics/dose-response";
import TwoByTwoTable from "./pages/biostatistics/two_by_two";
import OneRate from "./pages/biostatistics/one_rate";
import TwoRatesComparison from "./pages/biostatistics/compare_two_rates";
import MeanConfidenceInterval from "./pages/biostatistics/mean_confidence_interval";
import MedianPercentileCI from "./pages/biostatistics/median_percentile_ci";
import TTestCalculator from "./pages/biostatistics/t_test";
import ANOVA from "./pages/biostatistics/anova";
import ProportionsSample from "./pages/biostatistics/proportions_sample";
import MatchedCaseControl from "./pages/biostatistics/unmatched_case";
import MeanDifference from "./pages/biostatistics/mean_difference_sample";
import MeanDifferencePower from "./pages/biostatistics/mean_difference_power";
import RandomNumberGenerator from "./pages/biostatistics/random_numbers";
import SampleSizeCohortRCT from "./pages/biostatistics/cohort_rct";
import Explorer from "./pages/explorer/search";
import Workspace from "./pages/Workspace";
import Geospatial from "./pages/geospatial/map";
import EpidemiologicalSimulation from "./pages/simulation/dashboard";
import HelpPage from "./pages/help";
import Settings from "./pages/settings";
import { useSettings } from "@/contexts/SettingsContext";
import { setSoundEnabled } from "@/lib/notifications";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tools" component={Tools} />
      <Route path="/about" component={About} />
      <Route path="/docs" component={Docs} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route path="/biostatistics/std_mortality_ratio" component={standardized_mortality_ratio} />
      <Route path="/biostatistics/proportions" component={Proportions} />
      <Route path="/biostatistics/r_by_c" component={RxCTable} />
      <Route path="/biostatistics/screening" component={ScreeningTest} />
      <Route path="/biostatistics/dose-response" component={DoseResponse} />
      <Route path="/biostatistics/two_by_two" component={TwoByTwoTable} />
      <Route path="/biostatistics/one_rate" component={OneRate} />
      <Route path="/biostatistics/compare_two_rates" component={TwoRatesComparison} />
      <Route path="/biostatistics/mean_confidence_interval" component={MeanConfidenceInterval} />
      <Route path="/biostatistics/median_percentile_ci" component={MedianPercentileCI} />
      <Route path="/biostatistics/t_test" component={TTestCalculator} />
      <Route path="/biostatistics/anova" component={ANOVA} />
      <Route path="/biostatistics/proportions_sample" component={ProportionsSample} />
      <Route path="/biostatistics/cohort_rct" component={SampleSizeCohortRCT} />
      <Route path="/biostatistics/unmatched_case" component={MatchedCaseControl} />
      <Route path="/biostatistics/mean_difference_sample" component={MeanDifference} />
      <Route path="/biostatistics/mean_difference_power" component={MeanDifferencePower} />
      <Route path="/biostatistics/random_numbers" component={RandomNumberGenerator} />
      <Route path="/explorer/search" component={Explorer} />
      <Route path="/workspace" component={Workspace} />
      <Route path="/geospatial/map" component={Geospatial} />
      <Route path="/simulation/dashboard" component={EpidemiologicalSimulation} />
      <Route path="/help" component={HelpPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { settings } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatbotWidth, setChatbotWidth] = useState(420);
  const [chatbotNotificationCount, setChatbotNotificationCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(false);
        setChatbotWidth(Math.min(window.innerWidth * 0.9, 420));
      }
    };
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    setSoundEnabled(settings.soundNotifications);
  }, [settings.soundNotifications]);

  return (
    <TooltipProvider>
      <Toaster position="top-center" duration={settings.notificationDuration * 1000} />
      <div className="flex h-screen bg-background">
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          isCollapsed={sidebarCollapsed}
          setIsCollapsed={setSidebarCollapsed}
        />
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        } ${isChatbotOpen && !isMobile ? 'lg:mr-[420px]' : ''}`}>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;