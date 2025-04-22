import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import { OrderWithDetails } from '../../types/Order';

const SellerDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [orderFilter, setOrderFilter] = useState("all");

  useEffect(() => {
    fetchOrders();

    // Subscribe to real-time updates for orders
    const ordersSubscription = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as OrderWithDetails;
            setOrders(prevOrders => 
              prevOrders.map(order => 
                order.order_id === updatedOrder.order_id ? updatedOrder : order
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
    };
  }, []);

  // ... existing code ...

  return (
    // ... existing JSX ...
  );
};

export default SellerDashboard; 