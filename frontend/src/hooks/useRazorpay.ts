import { useCallback, useEffect, useState } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number; // in paise
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

interface PaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export function useRazorpay() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    if (window.Razorpay) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => console.error('Failed to load Razorpay');
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  const initiatePayment = useCallback(
    (options: RazorpayOptions): Promise<PaymentResult> => {
      return new Promise((resolve, reject) => {
        if (!isLoaded) {
          reject(new Error('Razorpay not loaded'));
          return;
        }

        setIsLoading(true);

        const rzp = new window.Razorpay({
          ...options,
          handler: (response: PaymentResult) => {
            setIsLoading(false);
            resolve(response);
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
              reject(new Error('Payment cancelled'));
            },
          },
        });

        rzp.on('payment.failed', (response: any) => {
          setIsLoading(false);
          reject(new Error(response.error.description || 'Payment failed'));
        });

        rzp.open();
      });
    },
    [isLoaded]
  );

  return {
    isLoaded,
    isLoading,
    initiatePayment,
  };
}

export default useRazorpay;
