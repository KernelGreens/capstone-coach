import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Tracks from "./pages/Tracks";
import Projects from "./pages/Projects";
import Progress from "./pages/Progress";
import MyProgress from "./pages/MyProgress";
import Evaluations from "./pages/Evaluations";
import Meetings from "./pages/Meetings";
import Resources from "./pages/Resources";
import Setup from "./pages/Setup";
import Settings from "./pages/Settings";
import EvaluationCriteria from "./pages/EvaluationCriteria";
import SubmitFeedback from "./pages/SubmitFeedback";
import ViewFeedback from "./pages/ViewFeedback";
import Messages from "./pages/Messages";
import Analytics from "./pages/Analytics";
import Portfolio from "./pages/Portfolio";
import CapstoneProject from "./pages/CapstoneProject";
import Marketplace from "./pages/Marketplace";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute allowedRoles={['supervisor']}><Students /></ProtectedRoute>} />
            <Route path="/tracks" element={<ProtectedRoute allowedRoles={['supervisor']}><Tracks /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute allowedRoles={['supervisor']}><Projects /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute allowedRoles={['supervisor']}><Progress /></ProtectedRoute>} />
            <Route path="/evaluations" element={<ProtectedRoute allowedRoles={['supervisor']}><Evaluations /></ProtectedRoute>} />
            <Route path="/evaluation-criteria" element={<ProtectedRoute allowedRoles={['supervisor']}><EvaluationCriteria /></ProtectedRoute>} />
            <Route path="/meetings" element={<ProtectedRoute><Meetings /></ProtectedRoute>} />
            <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
            <Route path="/my-progress" element={<ProtectedRoute allowedRoles={['student']}><MyProgress /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/submit-feedback" element={<ProtectedRoute><SubmitFeedback /></ProtectedRoute>} />
            <Route path="/feedback" element={<ProtectedRoute allowedRoles={['supervisor']}><ViewFeedback /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['supervisor']}><Analytics /></ProtectedRoute>} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/capstone" element={<ProtectedRoute><CapstoneProject /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
