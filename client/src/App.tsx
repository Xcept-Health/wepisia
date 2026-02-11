import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useState, useEffect } from "react";
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
import TwoByTwoTable from "./pages/biostatistics/two_by_two";
import OneRate from "./pages/biostatistics/one_rate";
import TwoRatesComparison from "./pages/biostatistics/compare_two_rates";
import MeanConfidenceInterval from "./pages/biostatistics/mean_confidence_interval";
import MedianPercentileCI from "./pages/biostatistics/median_percentile_ci";
import TTestCalculator from "./pages/biostatistics/t_test";
import ANOVA from "./pages/biostatistics/anova";
import ProportionsSample from "./pages/biostatistics/proportions_sample";
import CohortRCT from "./pages/biostatistics/cohort_rct_power";
import MatchedCaseControl from "./pages/biostatistics/matched_case";
import MeanDifference from "./pages/biostatistics/mean_difference_sample";
import ClinicalTrial from "./pages/biostatistics/clinical_trial";
import CaseControlStudy from "./pages/biostatistics/case_control";
import MeanDifferencePower from "./pages/biostatistics/mean_difference_power";
import PowerCaseControl from "./pages/biostatistics/matched_case_power";
import RandomNumberGenerator from "./pages/biostatistics/random_numbers";
// Importez les composants du chatbot
import { ChatbotSidebar } from "./components/Chatbot/ChatbotSidebar";
import { ChatbotToggle } from "./components/Chatbot/ChatbotToggle";
// Importez la page Workspace
import Workspace from "./pages/Workspace";

import Geospatial from "./pages/geospatial/map";

import EpidemiologicalSimulation from "./pages/simulation/dashboard";



function Router() {
  return (
    <Switch>
      {/* Home Route */}  
      <Route path={"/"} component={Home} />
      {/* Tools Route */}
      <Route path={"/tools"} component={Tools} />
      {/* About Route */}
      <Route path={"/about"} component={About} />
      {/* Docs Route */}
      <Route path={"/docs"} component={Docs} />
      {/* Settings Route */}
      <Route path="/settings" component={Settings} />
      <Route path={"/404"} component={NotFound} />
      {/* Biostatistics Routes */}
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
      <Route path="/biostatistics/cohort_rct_power" component={CohortRCT} />
      <Route path="/biostatistics/matched_case" component={MatchedCaseControl} />
      <Route path="/biostatistics/mean_difference_sample" component={MeanDifference} />
      <Route path="/biostatistics/clinical_trial" component={ClinicalTrial} />
      <Route path="/biostatistics/case_control" component={CaseControlStudy} />
      <Route path="/biostatistics/mean_difference_power" component={MeanDifferencePower} />
      <Route path="/biostatistics/matched_case_power" component={PowerCaseControl} />
      <Route path="/biostatistics/random_numbers" component={RandomNumberGenerator} />
      {/* Workspace Route */}
      <Route path="/workspace" component={Workspace} />
      {/* Geospatial Route */}
      <Route path="/geospatial/map" component={Geospatial} />
      {/* Epidemiological Simulation Route */}
      <Route path="/simulation/dashboard" component={EpidemiologicalSimulation} />
      {/* Fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  // États pour le chatbot
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatbotWidth, setChatbotWidth] = useState(420);
  const [chatbotNotificationCount, setChatbotNotificationCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Détecter si on est en mobile
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

  // Simulation de notifications
  useEffect(() => {
    if (!isChatbotOpen) {
      const timer = setTimeout(() => {
        setChatbotNotificationCount(prev => Math.min(prev + 1, 99));
      }, 120000); // Une notification toutes les 2 minutes
      return () => clearTimeout(timer);
    } else {
      setChatbotNotificationCount(0);
    }
  }, [isChatbotOpen]);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster position="top-center" />
          
          <div className="flex h-screen bg-background">
            {/* Sidebar fixe */}
            <Sidebar
              isOpen={sidebarOpen}
              setIsOpen={setSidebarOpen}
              isCollapsed={sidebarCollapsed}
              setIsCollapsed={setSidebarCollapsed}
            />

            {/* Contenu principal – ajusté selon l'état des sidebars */}
            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
              sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
            } ${isChatbotOpen && !isMobile ? 'lg:mr-[420px]' : ''}`}>
              {/* Page content */}
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>

            {/* Chatbot Toggle Button */}
            <ChatbotToggle
              onClick={() => setIsChatbotOpen(!isChatbotOpen)}
              isActive={isChatbotOpen}
              notificationCount={chatbotNotificationCount}
            />

            {/* Chatbot Sidebar avec design textuel Vercel AI SDK */}
            <ChatbotSidebar
              isOpen={isChatbotOpen}
              onClose={() => setIsChatbotOpen(false)}
              width={chatbotWidth}
              onWidthChange={setChatbotWidth}
              position="right"
            />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
