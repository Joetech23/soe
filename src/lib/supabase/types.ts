/**
 * Supabase Database types.
 *
 * Hand-maintained to match supabase/migrations. Once the migrations are applied
 * to a live project, regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
 * and drop the `as never` casts in src/lib/supabase/rpc.ts.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AppRole = 'admin' | 'staff' | 'parent'
export type PaymentProvider = 'none' | 'stripe' | 'paypal'
export type PaymentStatus =
  | 'unpaid'
  | 'processing'
  | 'paid'
  | 'partially_refunded'
  | 'refunded'
  | 'failed'
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'cancelled'
  | 'refunded'
  | 'expired'
export type ProductType = 'pdf' | 'video' | 'bundle' | 'external'
export type EntitlementSource =
  | 'purchase'
  | 'free'
  | 'manual'
  | 'bundle'
  | 'import'
export type SubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed' | 'bounced'
export type EnquiryStatus =
  | 'new'
  | 'contacted'
  | 'converted'
  | 'waitlist'
  | 'closed'

/** Row shapes (the fields the app actually reads). */
export type ProductRow = {
  id: string
  slug: string
  name: string
  category_id: string | null
  product_type: ProductType
  summary: string | null
  description: string | null
  price_pence: number
  compare_at_price_pence: number | null
  currency: string
  is_free: boolean
  cover_image_url: string | null
  preview_url: string | null
  page_count: number | null
  duration_minutes: number | null
  year_groups: string[]
  delivery_note: string | null
  featured: boolean
  active: boolean
  sort_order: number
  published_at: string | null
  created_at: string
  updated_at: string
}

export type ProductAssetRow = {
  id: string
  product_id: string
  kind: string
  label: string | null
  storage_bucket: string
  storage_path: string | null
  mime_type: string | null
  size_bytes: number | null
  video_provider: string | null
  video_id: string | null
  sort_order: number
  created_at: string
}

export type OrderRow = {
  id: string
  order_number: string
  customer_id: string | null
  user_id: string | null
  status: OrderStatus
  customer_name: string
  customer_email: string
  subtotal_pence: number
  discount_pence: number
  total_pence: number
  currency: string
  billing_country: string
  ip_country: string | null
  digital_consent_at: string | null
  terms_version: string | null
  payment_provider: PaymentProvider
  payment_status: PaymentStatus
  stripe_session_id: string | null
  stripe_payment_intent: string | null
  paypal_order_id: string | null
  paypal_capture_id: string | null
  amount_refunded_pence: number
  paid_at: string | null
  receipt_sent_at: string | null
  cancelled_at: string | null
  source: string
  created_at: string
  updated_at: string
}

export type EntitlementRow = {
  id: string
  product_id: string
  order_id: string | null
  customer_id: string | null
  user_id: string | null
  email: string
  source: EntitlementSource
  granted_at: string
  expires_at: string | null
  max_downloads: number | null
  download_count: number
  last_downloaded_at: string | null
  revoked_at: string | null
  revoked_reason: string | null
  created_at: string
}

export type DownloadTokenRow = {
  id: string
  token_hash: string
  order_id: string | null
  email: string
  expires_at: string
  use_count: number
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

export type BookingRequestRow = {
  id: string
  reference: string
  intent: string
  parent_name: string
  email: string
  phone: string | null
  child_name: string
  year_group: string | null
  subject: string | null
  notes: string | null
  terms_agreed_at: string
  terms_version: string | null
  status: EnquiryStatus
  admin_notes: string | null
  child_id: string | null
  notified_at: string | null
  created_at: string
  updated_at: string
}

export type SubscriberRow = {
  id: string
  email: string
  full_name: string | null
  child_year_group: string | null
  status: SubscriberStatus
  source: string
  confirm_token_hash: string | null
  confirmed_at: string | null
  unsubscribed_at: string | null
  consent_ip: string | null
  consent_text: string | null
  created_at: string
  updated_at: string
}

export type CustomerRow = {
  id: string
  user_id: string | null
  email: string
  full_name: string | null
  phone: string | null
  marketing_consent: boolean
  first_seen_at: string
  last_seen_at: string
  created_at: string
}

type T<Row, Ins = Partial<Row>, Upd = Partial<Row>> = {
  Row: Row
  Insert: Ins
  Update: Upd
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      // ---- admin-editable settings + auth audit (migration 0007) ----
      app_settings: T<{
        key: string
        value: Json
        updated_at: string
        updated_by: string | null
      }>
      auth_events: T<{
        id: string
        email: string | null
        kind: string
        detail: string | null
        ip: string | null
        created_at: string
      }>

      // ---- tutoring (existing, live) ----
      user_roles: T<{
        id: string
        user_id: string
        role: AppRole
        created_at: string
      }>
      groups: T<{
        id: string
        name: string
        description: string | null
        is_one_to_one: boolean
        created_at: string
      }>
      children: T<{
        id: string
        name: string
        year_group: string | null
        username: string | null
        group_id: string | null
        parent_user_id: string | null
        created_at: string
      }>
      invite_codes: T<{
        id: string
        code: string
        child_id: string
        used_by: string | null
        used_at: string | null
        created_at: string
      }>
      homework_items: T<{
        id: string
        title: string
        description: string | null
        file_path: string | null
        due_date: string | null
        group_id: string | null
        child_id: string | null
        created_at: string
      }>
      feedback_notes: T<{
        id: string
        child_id: string
        note: string
        lesson_date: string | null
        created_at: string
      }>
      // ---- commerce (migrations 0003+) ----
      product_categories: T<{
        id: string
        slug: string
        name: string
        summary: string | null
        active: boolean
        sort_order: number
        created_at: string
      }>
      products: T<ProductRow>
      product_assets: T<ProductAssetRow>
      product_bundle_items: T<{
        bundle_id: string
        child_product_id: string
        sort_order: number
      }>
      customers: T<CustomerRow>
      orders: T<OrderRow>
      order_items: T<{
        id: string
        order_id: string
        product_id: string | null
        product_name: string
        product_slug: string
        unit_price_pence: number
        quantity: number
        line_total_pence: number
        created_at: string
      }>
      order_events: T<{
        id: string
        order_id: string
        type: string
        message: string | null
        actor: string
        metadata: Json
        created_at: string
      }>
      webhook_events: T<{
        provider: string
        event_id: string
        type: string | null
        received_at: string
      }>
      entitlements: T<EntitlementRow>
      download_events: T<{
        id: string
        entitlement_id: string | null
        product_id: string | null
        asset_id: string | null
        email: string | null
        delivery: string
        ip: string | null
        user_agent: string | null
        created_at: string
      }>
      download_tokens: T<DownloadTokenRow>
      newsletter_subscribers: T<SubscriberRow>
      booking_requests: T<BookingRequestRow>
    }
    Views: Record<string, never>
    Functions: {
      has_role: { Args: { _user_id: string; _role: AppRole }; Returns: boolean }
      is_staff: { Args: Record<string, never>; Returns: boolean }
      redeem_invite_code: { Args: { _code: string }; Returns: string }
      gen_order_reference: { Args: Record<string, never>; Returns: string }
      create_order: {
        Args: {
          p_items: Json
          p_customer_name: string
          p_customer_email: string
          p_marketing_consent?: boolean
          p_user_id?: string | null
          p_billing_country?: string
          p_ip_country?: string | null
          p_terms_version?: string
          p_source?: string
        }
        Returns: OrderRow
      }
      mark_order_paid: {
        Args: {
          p_order_number: string
          p_provider: PaymentProvider
          p_stripe_payment_intent?: string | null
          p_paypal_order_id?: string | null
          p_paypal_capture_id?: string | null
          p_paid_amount_pence?: number | null
        }
        Returns: { order_id: string; newly_paid: boolean }[]
      }
      grant_entitlements_for_order: { Args: { p_order_id: string }; Returns: number }
      record_download: {
        Args: {
          p_entitlement_id: string
          p_asset_id: string
          p_delivery: string
          p_ip?: string | null
          p_user_agent?: string | null
        }
        Returns: string
      }
      expire_stale_orders: { Args: Record<string, never>; Returns: number }
    }
    Enums: {
      app_role: AppRole
      payment_provider: PaymentProvider
      payment_status: PaymentStatus
      order_status: OrderStatus
      product_type: ProductType
      entitlement_source: EntitlementSource
      subscriber_status: SubscriberStatus
      enquiry_status: EnquiryStatus
    }
    CompositeTypes: Record<string, never>
  }
}
