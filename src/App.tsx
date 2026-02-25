import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/layout/AuthGuard";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/UsersPage";
import UserAnalyticsPage from "./pages/UserAnalyticsPage";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import ProductTypesPage from "./pages/ProductTypesPage";
import SupportChatsPage from "./pages/SupportChatsPage";
import SurveysReviewsPage from "./pages/SurveysReviewsPage";
import GalleryPage from "./pages/GalleryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGuard>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:userId/analytics" element={<UserAnalyticsPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/product-types" element={<ProductTypesPage />} />
            <Route path="/support" element={<SupportChatsPage />} />
            <Route path="/surveys-reviews" element={<SurveysReviewsPage />} />
            <Route path="/reviews" element={<SurveysReviewsPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
