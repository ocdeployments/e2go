'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface PaymentInfo {
  payment_type: string;
  amount_paid: number;
  status: string;
}

const PAYMENT_TYPE_NAMES: Record<string, string> = {
  solo: 'Solo Individual',
  solo_spouse: 'Solo + Spouse',
  solo_family_2: 'Solo + Family (up to 2 kids)',
  solo_family_5: 'Solo + Family (3-5 kids)',
  partnership: 'Partnership (no families)',
  partnership_couples: 'Partnership Two Couples',
  partnership_families: 'Partnership Two Full Families',
};

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      const supabase = createBrowserSupabaseClient();

      // First get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to continue');
        setLoading(false);
        return;
      }

      // Find payment by session ID
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('payment_type, amount_paid, status')
        .eq('stripe_session_id', sessionId)
        .single();

      if (paymentError || !paymentData) {
        setError('Payment not found');
        setLoading(false);
        return;
      }

      setPayment(paymentData);
      setLoading(false);
    };

    verifyPayment();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#f5f0e8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-[#f5f0e8] text-2xl mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Payment Issue</h1>
          <p className="text-[rgba(245,240,232,0.70)] mb-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>{error}</p>
          <button
            onClick={() => router.push('/pricing')}
            className="bg-[#C9A84C] text-[#0a0a0a] px-8 py-3 font-medium"
            style={{ fontFamily: 'DM Sans, sans-serif', borderRadius: 0 }}
          >
            Back to Pricing
          </button>
        </div>
      </div>
    );
  }

  const tierName = PAYMENT_TYPE_NAMES[payment?.payment_type || 'solo'] || 'Application';

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201,168,76,0.15)' }}>
          <svg className="w-10 h-10 text-[#C9A84C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-[#f5f0e8] text-3xl mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Payment Confirmed
        </h1>

        <p className="text-[rgba(245,240,232,0.70)] mb-8" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
          Your application is ready. You now have full access to complete your E-2 visa preparation.
        </p>

        <div className="bg-[rgba(201,168,76,0.05)] border border-[rgba(201,168,76,0.15)] p-6 mb-8 text-left">
          <div className="flex justify-between mb-3">
            <span className="text-[rgba(245,240,232,0.60)]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Tier</span>
            <span className="text-[#f5f0e8]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>{tierName}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-[rgba(245,240,232,0.60)]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Amount</span>
            <span className="text-[#f5f0e8]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>${((payment?.amount_paid || 0) / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[rgba(245,240,232,0.60)]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Status</span>
            <span className="text-[#C9A84C]" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>Completed</span>
          </div>
        </div>

        <button
          onClick={() => router.push('/apply/module1')}
          className="bg-[#C9A84C] text-[#0a0a0a] px-10 py-4 font-medium w-full mb-3 transition-opacity hover:opacity-90"
          style={{ fontFamily: 'DM Sans, sans-serif', borderRadius: 0 }}
        >
          Begin Your Application →
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          className="text-[rgba(245,240,232,0.60)] text-sm w-full hover:text-[#f5f0e8] transition-colors"
          style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#f5f0e8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Verifying payment...</p>
      </div>
    </div>
  );
}

export default function PricingSuccessPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SuccessContent />
    </Suspense>
  );
}