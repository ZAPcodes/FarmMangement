
import { useAuth } from "@/contexts/AuthContext";

const OrdersPage = () => {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-500 mt-1">
          {profile?.role === "Farmer" 
            ? "View and manage orders for your products" 
            : "View your order history"}
        </p>
      </div>
      
      <div className="bg-white p-8 rounded-lg shadow text-center">
        <h2 className="text-xl font-semibold mb-4">Coming Soon</h2>
        <p className="text-gray-500">
          The orders functionality is currently under development.
        </p>
      </div>
    </div>
  );
};

export default OrdersPage;
