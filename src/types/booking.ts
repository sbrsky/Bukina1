import { Timestamp } from 'firebase/firestore';

// ─── Slot ────────────────────────────────────────────────────────────────────

export interface Slot {
  id: string;
  date: string;        // "YYYY-MM-DD" — date in Riga timezone
  time: string;        // "HH:MM" e.g. "14:00"
  isAvailable: boolean;
  bookingId: string | null;
  createdAt: Timestamp;
}

// ─── Booking ─────────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'pending'              // just created, awaiting admin confirmation
  | 'confirmed'            // confirmed by admin
  | 'cancelled_by_client'  // client cancelled via token link
  | 'cancelled_by_admin'   // admin cancelled from dashboard
  | 'completed';           // procedure completed

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface BookingPayment {
  status: PaymentStatus;
  amount: number | null;           // amount in cents (Stripe-style)
  currency: string;                // 'eur'
  stripePaymentIntentId: string | null;
  paidAt: Timestamp | null;
}

export interface BookingNotifications {
  confirmationSentAt: Timestamp | null;
  reminderSentAt: Timestamp | null;
  cancellationSentAt: Timestamp | null;
}

export interface BookingCancellation {
  reason: string;
  cancelledBy: 'client' | 'admin';
  cancelledAt: Timestamp;
}

export interface BookingClient {
  name: string;
  phone: string;
  email: string;
  comment: string;
}

export interface Booking {
  id: string;

  // Slot reference
  slotId: string;
  date: string;   // denormalized from slot for easy querying
  time: string;   // denormalized from slot for easy querying

  // Service info
  serviceId: string;
  serviceName: string;
  serviceDuration: string;
  servicePrice: string;

  // Client info
  client: BookingClient;

  // Status
  status: BookingStatus;

  // Payment (Stripe-ready)
  payment: BookingPayment;

  // Notification tracking (SMS/Email-ready)
  notifications: BookingNotifications;

  // Cancellation audit
  cancellation: BookingCancellation | null;

  // Token for client-side cancellation without auth
  cancelToken: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Form data ───────────────────────────────────────────────────────────────

export interface BookingFormData {
  name: string;
  phone: string;
  email: string;
  comment: string;
}

export interface SelectedService {
  id: string;
  name: string;
  duration: string;
  price: string;
  description?: string;
}
