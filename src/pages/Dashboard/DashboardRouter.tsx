
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FarmerDashboard from "@/pages/Farmer/FarmerDashboard";
import BuyerDashboard from "@/pages/Buyer/BuyerDashboard";
import AdminDashboard from "@/pages/Admin/AdminDashboard";

const DashboardRouter = () => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If not loading and no profile, redirect to login
    if (!loading && !profile) {
      navigate("/login");
    }
  }, [profile, loading, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  if (!profile) {
    return null; // Will redirect to login
  }

  switch (profile.role) {
    case "Farmer":
      return <FarmerDashboard />;
    case "Buyer":
      return <BuyerDashboard />;
    case "Admin":
      return <AdminDashboard />;
    default:
      return (
        <div className="flex flex-col items-center justify-center h-96">
          <h1 className="text-2xl font-bold text-red-600">Unknown Role</h1>
          <p className="text-gray-500 mt-2">Your account has an invalid role.</p>
        </div>
      );
  }
};

export default DashboardRouter;
