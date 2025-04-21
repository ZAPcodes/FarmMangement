
import React, { useState } from "react";
import { useNavigate, Link, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  ChevronDown 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DashboardLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const FarmerNavItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/dashboard" },
    { icon: <Package size={20} />, label: "My Products", path: "/products" },
    { icon: <ShoppingCart size={20} />, label: "Orders", path: "/orders" },
    { icon: <User size={20} />, label: "Profile", path: "/profile" },
  ];

  const BuyerNavItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/dashboard" },
    { icon: <ShoppingCart size={20} />, label: "Marketplace", path: "/marketplace" },
    { icon: <Package size={20} />, label: "My Orders", path: "/orders" },
    { icon: <User size={20} />, label: "Profile", path: "/profile" },
  ];

  const AdminNavItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/dashboard" },
    { icon: <Package size={20} />, label: "Products", path: "/products" },
    { icon: <ShoppingCart size={20} />, label: "Orders", path: "/orders" },
    { icon: <User size={20} />, label: "Users", path: "/users" },
  ];

  const getNavItems = () => {
    if (!profile) return [];
    switch (profile.role) {
      case "Farmer":
        return FarmerNavItems;
      case "Buyer":
        return BuyerNavItems;
      case "Admin":
        return AdminNavItems;
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:z-auto ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <Link to="/dashboard" className="flex items-center">
            <span className="text-xl font-bold text-green-700">FarmConnect</span>
          </Link>
          <button 
            className="p-2 rounded-md lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="px-4 py-6 space-y-1">
          {navItems.map((item, index) => (
            <Link 
              key={index} 
              to={item.path}
              className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-green-50 hover:text-green-700"
              onClick={() => setIsSidebarOpen(false)}
            >
              <span className="mr-3 text-gray-500">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <Separator className="my-4" />
          <button 
            className="flex w-full items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-700"
            onClick={handleSignOut}
          >
            <span className="mr-3 text-gray-500"><LogOut size={20} /></span>
            <span>Sign Out</span>
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top navbar */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b">
          <button 
            className="p-2 rounded-md lg:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell size={20} />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>No new notifications</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Separator orientation="vertical" className="h-8 mx-4" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-green-100 text-green-800">
                      {profile?.name ? getInitials(profile.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm">
                    <span>{profile?.name || "User"}</span>
                    <span className="text-xs text-gray-500">{profile?.role || "User"}</span>
                  </div>
                  <ChevronDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
