import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DuplicateLoginProvider } from "@/contexts/DuplicateLoginContext";
import { SessionExpiredProvider } from "@/contexts/SessionExpiredContext";
import { MaintenanceProvider } from "@/contexts/MaintenanceContext";
import { MaintenanceGuard } from "@/components/layout/MaintenanceGuard";
import { lazy, Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AIStats from "./pages/admin/AIStats";
import { EmergencyAlertPopup } from "@/components/alert/EmergencyAlertPopup";


const queryClient = new QueryClient();
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ForgotId = lazy(() => import("./pages/auth/ForgotId"));

const GuardianDashboard = lazy(() => import("./pages/guardian/GuardianDashboard"));
const GuardianCalls = lazy(() => import("./pages/guardian/GuardianCalls"));
const GuardianCallDetail = lazy(() => import("./pages/guardian/GuardianCallDetail"));
const GuardianStats = lazy(() => import("./pages/guardian/GuardianStats"));
const GuardianWelfare = lazy(() => import("./pages/guardian/GuardianWelfare"));
const GuardianInquiry = lazy(() => import("./pages/guardian/GuardianInquiry"));
const GuardianComplaint = lazy(() => import("./pages/guardian/GuardianComplaint"));
const GuardianNotices = lazy(() => import("./pages/guardian/GuardianNotices"));
const GuardianProfile = lazy(() => import("./pages/guardian/GuardianProfile"));
const GuardianSensitiveInfo = lazy(() => import("./pages/guardian/GuardianSensitiveInfo"));
const GuardianAlerts = lazy(() => import("./pages/guardian/GuardianAlerts"));

const CounselorDashboard = lazy(() => import("./pages/counselor/CounselorDashboard"));
const SeniorList = lazy(() => import("./pages/counselor/SeniorList"));
const SeniorDetail = lazy(() => import("./pages/counselor/SeniorDetail"));
const CounselorAlerts = lazy(() => import("./pages/counselor/CounselorAlerts"));
const CounselorRecords = lazy(() => import("./pages/counselor/CounselorRecords"));
const CounselorNotices = lazy(() => import("./pages/counselor/CounselorNotices"));
const CounselorInquiries = lazy(() => import("./pages/counselor/CounselorInquiries"));
const CounselorCalls = lazy(() => import("./pages/counselor/CounselorCalls"));
const CounselorCallDetail = lazy(() => import("./pages/counselor/CounselorCallDetail"));
const CounselorSensitiveInfo = lazy(() => import("./pages/counselor/CounselorSensitiveInfo"));
const CounselorProfile = lazy(() => import("./pages/counselor/CounselorProfile"));
const CounselorScheduleRequests = lazy(() => import("./pages/counselor/CounselorScheduleRequests"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const MemberManagement = lazy(() => import("./pages/admin/MemberManagement"));
const AssignmentManagement = lazy(() => import("./pages/admin/AssignmentManagement"));
const CallTest = lazy(() => import("./pages/admin/CallTest"));

const ComplaintManagement = lazy(() => import("./pages/admin/ComplaintManagement"));
const SystemSettings = lazy(() => import("./pages/admin/SystemSettings"));
const NoticeManagement = lazy(() => import("./pages/admin/NoticeManagement"));
const SensitiveInfoManagement = lazy(() => import("./pages/admin/SensitiveInfoManagement"));
const MemberRegistration = lazy(() => import("./pages/admin/MemberRegistration"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const PolicyManagement = lazy(() => import("./pages/admin/PolicyManagement"));

const FAQPage = lazy(() => import("./pages/faq/FAQPage"));
const NotificationHistory = lazy(() => import("./pages/common/NotificationHistory"));

const SeniorDashboard = lazy(() => import("./pages/senior/SeniorDashboard"));
const SeniorLogin = lazy(() => import("./pages/senior/SeniorLogin"));
const SeniorOCR = lazy(() => import("./pages/senior/SeniorOCR"));
const SeniorHealth = lazy(() => import("./pages/senior/SeniorHealth"));
const SeniorMedication = lazy(() => import("./pages/senior/SeniorMedication"));
const SeniorNotices = lazy(() => import("./pages/senior/SeniorNotices"));
const SeniorFAQ = lazy(() => import("./pages/senior/SeniorFAQ"));
const SeniorProfile = lazy(() => import("./pages/senior/SeniorProfile"));
const SeniorBiometric = lazy(() => import("./pages/senior/SeniorBiometric"));



const WelfareFacilityList = lazy(() => import("./pages/map/WelfareFacilityList"));
const FacilityManagement = lazy(() => import("./pages/admin/FacilityManagement"));
const WelfareServiceManagement = lazy(() => import("./pages/admin/WelfareServiceManagement"));

const CounselorRegistration = lazy(() => import("./pages/admin/CounselorRegistration"));
const MyProfile = lazy(() => import("./pages/user/MyProfile"));
const SettingsPage = lazy(() => import("./pages/user/SettingsPage"));

const NotFound = lazy(() => import("./pages/NotFound"));


const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DuplicateLoginProvider>
        <SessionExpiredProvider>
          <MaintenanceProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<div>Loading...</div>}>
                  <MaintenanceGuard>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<Index />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/forgot-id" element={<ForgotId />} />
                      <Route path="/map" element={<WelfareFacilityList />} />

                      {/* Common Protected Routes */}
                      <Route path="/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
                      <Route path="/notifications" element={<ProtectedRoute><NotificationHistory /></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

                      {/* Guardian Routes - GUARDIAN role only */}
                      <Route path="/guardian" element={<ProtectedRoute allowedRoles={["GUARDIAN"]}><GuardianDashboard /></ProtectedRoute>} />
                      <Route path="/guardian/calls" element={<ProtectedRoute allowedRoles={["GUARDIAN"]}><GuardianCalls /></ProtectedRoute>} />
                      <Route path="/guardian/calls/:id" element={<ProtectedRoute allowedRoles={["GUARDIAN"]}><GuardianCallDetail /></ProtectedRoute>} />
                      <Route path="/guardian/stats" element={<ProtectedRoute allowedRoles={["GUARDIAN"]}><GuardianStats /></ProtectedRoute>} />
                      <Route path="/guardian/welfare" element={<ProtectedRoute allowedRoles={["GUARDIAN"]}><GuardianWelfare /></ProtectedRoute>} />
                      <Route path="/guardian/inquiry" element={<ProtectedRoute allowedRoles={["GUARDIAN"]}><GuardianInquiry /></ProtectedRoute>} />
                      <Route path="/guardian/complaint" element={<ProtectedRoute allowedRoles={["GUARDIAN"]}><GuardianComplaint /></ProtectedRoute>} />
                      <Route path="/guardian/notices" element={<ProtectedRoute allowedRoles={["GUARDIAN"]}><GuardianNotices /></ProtectedRoute>} />
                      <Route path="/guardian/profile" element={<ProtectedRoute allowedRoles={["GUARDIAN"]}><GuardianProfile /></ProtectedRoute>} />
                      <Route path="/guardian/sensitive-info" element={<ProtectedRoute allowedRoles={["GUARDIAN"]}><GuardianSensitiveInfo /></ProtectedRoute>} />
                      <Route path="/guardian/alerts" element={<ProtectedRoute allowedRoles={["GUARDIAN"]}><GuardianAlerts /></ProtectedRoute>} />
                      <Route path="/guardian/faq" element={<ProtectedRoute allowedRoles={["GUARDIAN"]}><FAQPage /></ProtectedRoute>} />

                      {/* Counselor Routes - COUNSELOR role only */}
                      <Route path="/counselor" element={<ProtectedRoute allowedRoles={["COUNSELOR"]}><CounselorDashboard /></ProtectedRoute>} />
                      <Route path="/counselor/seniors" element={<ProtectedRoute allowedRoles={["COUNSELOR"]}><SeniorList /></ProtectedRoute>} />
                      <Route path="/counselor/seniors/:id" element={<ProtectedRoute allowedRoles={["COUNSELOR"]}><SeniorDetail /></ProtectedRoute>} />
                      <Route path="/counselor/calls" element={<ProtectedRoute allowedRoles={["COUNSELOR"]}><CounselorCalls /></ProtectedRoute>} />
                      <Route path="/counselor/calls/:id" element={<ProtectedRoute allowedRoles={["COUNSELOR"]}><CounselorCallDetail /></ProtectedRoute>} />
                      <Route path="/counselor/records" element={<ProtectedRoute allowedRoles={["COUNSELOR"]}><CounselorRecords /></ProtectedRoute>} />
                      <Route path="/counselor/inquiries" element={<ProtectedRoute allowedRoles={["COUNSELOR"]}><CounselorInquiries /></ProtectedRoute>} />
                      <Route path="/counselor/alerts" element={<ProtectedRoute allowedRoles={["COUNSELOR"]}><CounselorAlerts /></ProtectedRoute>} />
                      <Route path="/counselor/notifications" element={<ProtectedRoute allowedRoles={["COUNSELOR"]}><NotificationHistory /></ProtectedRoute>} />
                      <Route path="/counselor/notices" element={<ProtectedRoute allowedRoles={["COUNSELOR"]}><CounselorNotices /></ProtectedRoute>} />
                      <Route path="/counselor/sensitive-info" element={<ProtectedRoute allowedRoles={["COUNSELOR"]}><CounselorSensitiveInfo /></ProtectedRoute>} />
                      <Route path="/counselor/schedule-requests" element={<ProtectedRoute allowedRoles={["COUNSELOR"]}><CounselorScheduleRequests /></ProtectedRoute>} />
                      <Route path="/counselor/profile" element={<ProtectedRoute allowedRoles={["COUNSELOR"]}><CounselorProfile /></ProtectedRoute>} />

                      {/* Admin Routes - ADMIN role onlyy */}
                      <Route path="/admin" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
                      <Route path="/admin/members" element={<ProtectedRoute allowedRoles={["ADMIN"]}><MemberManagement /></ProtectedRoute>} />
                      <Route path="/admin/assignments" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AssignmentManagement /></ProtectedRoute>} />
                      <Route path="/admin/call-test" element={<ProtectedRoute allowedRoles={["ADMIN"]}><CallTest /></ProtectedRoute>} />
                      <Route path="/admin/ai-stats" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AIStats /></ProtectedRoute>} />
                      <Route path="/admin/complaints" element={<ProtectedRoute allowedRoles={["ADMIN"]}><ComplaintManagement /></ProtectedRoute>} />
                      <Route path="/admin/sensitive-info" element={<ProtectedRoute allowedRoles={["ADMIN"]}><SensitiveInfoManagement /></ProtectedRoute>} />
                      <Route path="/admin/notices" element={<ProtectedRoute allowedRoles={["ADMIN"]}><NoticeManagement /></ProtectedRoute>} />
                      <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={["ADMIN"]}><NotificationHistory /></ProtectedRoute>} />
                      <Route path="/admin/policies" element={<ProtectedRoute allowedRoles={["ADMIN"]}><PolicyManagement /></ProtectedRoute>} />
                      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["ADMIN"]}><SystemSettings /></ProtectedRoute>} />
                      <Route path="/admin/register" element={<ProtectedRoute allowedRoles={["ADMIN"]}><MemberRegistration /></ProtectedRoute>} />
                      <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminProfile /></ProtectedRoute>} />
                      <Route path="/admin/facilities" element={<ProtectedRoute allowedRoles={["ADMIN"]}><FacilityManagement /></ProtectedRoute>} />
                      <Route path="/admin/counselors/new" element={<ProtectedRoute allowedRoles={["ADMIN"]}><CounselorRegistration /></ProtectedRoute>} />
                      <Route path="/admin/welfare-services" element={<ProtectedRoute allowedRoles={["ADMIN"]}><WelfareServiceManagement /></ProtectedRoute>} />

                      <Route path="/admin/complaints" element={<ProtectedRoute allowedRoles={["ADMIN"]}><ComplaintManagement /></ProtectedRoute>} />
                      <Route path="/admin/sensitive-info" element={<ProtectedRoute allowedRoles={["ADMIN"]}><SensitiveInfoManagement /></ProtectedRoute>} />
                      <Route path="/admin/notices" element={<ProtectedRoute allowedRoles={["ADMIN"]}><NoticeManagement /></ProtectedRoute>} />
                      <Route path="/admin/policies" element={<ProtectedRoute allowedRoles={["ADMIN"]}><PolicyManagement /></ProtectedRoute>} />
                      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["ADMIN"]}><SystemSettings /></ProtectedRoute>} />
                      <Route path="/admin/register" element={<ProtectedRoute allowedRoles={["ADMIN"]}><MemberRegistration /></ProtectedRoute>} />
                      <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminProfile /></ProtectedRoute>} />
                      <Route path="/admin/facilities" element={<ProtectedRoute allowedRoles={["ADMIN"]}><FacilityManagement /></ProtectedRoute>} />
                      <Route path="/admin/counselors/new" element={<ProtectedRoute allowedRoles={["ADMIN"]}><CounselorRegistration /></ProtectedRoute>} />

                      {/* Senior Routes - ELDERLY role only */}
                      <Route path="/senior/login" element={<SeniorLogin />} />
                      <Route path="/senior" element={<ProtectedRoute allowedRoles={["ELDERLY"]}><SeniorDashboard /></ProtectedRoute>} />
                      <Route path="/senior/ocr" element={<ProtectedRoute allowedRoles={["ELDERLY"]}><SeniorOCR /></ProtectedRoute>} />
                      <Route path="/senior/health" element={<ProtectedRoute allowedRoles={["ELDERLY"]}><SeniorHealth /></ProtectedRoute>} />
                      <Route path="/senior/medication" element={<ProtectedRoute allowedRoles={["ELDERLY"]}><SeniorMedication /></ProtectedRoute>} />
                      <Route path="/senior/notices" element={<ProtectedRoute allowedRoles={["ELDERLY"]}><SeniorNotices /></ProtectedRoute>} />
                      <Route path="/senior/faq" element={<ProtectedRoute allowedRoles={["ELDERLY"]}><SeniorFAQ /></ProtectedRoute>} />
                      <Route path="/senior/profile" element={<ProtectedRoute allowedRoles={["ELDERLY"]}><SeniorProfile /></ProtectedRoute>} />
                      <Route path="/senior/biometric" element={<ProtectedRoute allowedRoles={["ELDERLY"]}><SeniorBiometric /></ProtectedRoute>} />



                      {/* Catch-all for 404 */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <EmergencyAlertPopup />
                  </MaintenanceGuard>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </MaintenanceProvider>
        </SessionExpiredProvider>
      </DuplicateLoginProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
