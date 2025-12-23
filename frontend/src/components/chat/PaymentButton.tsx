import React from 'react';
import { useRazorpay } from '../../hooks/useRazorpay';

interface PaymentButtonProps {
  orderId: string;
  amount: number; // in rupees
  orderDetails: {
    name?: string;
    email?: string;
    phone?: string;
    description?: string;
  };
  onSuccess: (paymentId: string, signature: string) => void;
  onError: (error: string) => void;
  razorpayKey?: string;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  orderId,
  amount,
  orderDetails,
  onSuccess,
  onError,
  razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY || 'rzp_test_xxx',
}) => {
  const { isLoaded, isLoading, initiatePayment } = useRazorpay();

  const handlePayment = async () => {
    if (!isLoaded) {
      onError('Payment system not ready');
      return;
    }

    try {
      const result = await initiatePayment({
        key: razorpayKey,
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        name: 'Mangwale',
        description: orderDetails.description || `Order #${orderId}`,
        order_id: orderId,
        prefill: {
          name: orderDetails.name,
          email: orderDetails.email,
          contact: orderDetails.phone,
        },
        theme: {
          color: '#FF6B00', // Mangwale orange
        },
      });

      onSuccess(result.razorpay_payment_id, result.razorpay_signature);
    } catch (error: any) {
      onError(error.message || 'Payment failed');
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={!isLoaded || isLoading}
      className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 
                 text-white font-semibold rounded-lg shadow-md 
                 hover:from-orange-600 hover:to-orange-700 
                 disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2 transition-all"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Processing...
        </>
      ) : (
        <>
          💳 Pay ₹{amount.toFixed(2)}
        </>
      )}
    </button>
  );
};

export default PaymentButton;
