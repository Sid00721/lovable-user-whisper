import { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export interface RealtimeUpdateCallbacks {
  onInvoiceUpdate?: () => void
  onClientUpdate?: () => void
  onNewTransaction?: (transaction: any) => void
}

export const useRealtimeUpdates = (callbacks: RealtimeUpdateCallbacks) => {
  const channelRef = useRef<any>(null)
  const lastUpdateRef = useRef<number>(Date.now())

  useEffect(() => {
    // Create a channel for real-time updates
    const channel = supabase
      .channel('payment-dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices'
        },
        (payload) => {
          console.log('Invoice update received:', payload)
          
          // Debounce updates to prevent excessive API calls
          const now = Date.now()
          if (now - lastUpdateRef.current > 1000) { // 1 second debounce
            lastUpdateRef.current = now
            
            if (payload.eventType === 'INSERT') {
              toast.success('New payment received!', {
                description: `Amount: $${payload.new.amount_paid}`,
                duration: 5000,
              })
              
              callbacks.onNewTransaction?.(payload.new)
            }
            
            callbacks.onInvoiceUpdate?.()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        (payload) => {
          console.log('Client update received:', payload)
          
          // Check if subscription-related fields were updated
          if (payload.new && (
            payload.new.subscription_status !== payload.old?.subscription_status ||
            payload.new.subscription_plan !== payload.old?.subscription_plan ||
            payload.new.last_payment_date !== payload.old?.last_payment_date
          )) {
            const now = Date.now()
            if (now - lastUpdateRef.current > 1000) {
              lastUpdateRef.current = now
              
              if (payload.new.subscription_status === 'active' && payload.old?.subscription_status !== 'active') {
                toast.success('New subscription activated!', {
                  description: `Customer: ${payload.new.name || payload.new.email}`,
                  duration: 5000,
                })
              }
              
              callbacks.onClientUpdate?.()
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to realtime updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to realtime updates')
          toast.error('Real-time updates unavailable')
        }
      })

    channelRef.current = channel

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [callbacks.onInvoiceUpdate, callbacks.onClientUpdate, callbacks.onNewTransaction])

  // Function to manually trigger updates
  const triggerUpdate = () => {
    callbacks.onInvoiceUpdate?.()
    callbacks.onClientUpdate?.()
  }

  // Function to check if real-time is connected
  const isConnected = () => {
    return channelRef.current?.state === 'joined'
  }

  return {
    triggerUpdate,
    isConnected,
  }
}

export default useRealtimeUpdates