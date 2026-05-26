"use client";

import { FormEvent, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Container,
  Card,
  Input,
  Button,
  Badge,
  PageHeader,
  Skeleton,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { BookCover } from "@/components/book-cover";
import { RequireAuth } from "@/components/require-auth";
import { Books, Orders } from "@/lib/endpoints";
import { toast } from "@/components/toaster";
import { useAuth } from "@/lib/auth-context";
import type { Book, ShippingAddress } from "@/lib/types";

declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayOptions) => { open: () => void };
  }
}

type RazorpayHandlerArgs = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpayHandlerArgs) => void;
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

export default function BuyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <Inner id={Number(id)} />
    </RequireAuth>
  );
}

function Inner({ id }: { id: number }) {
  const { user } = useAuth();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [shipping, setShipping] = useState<ShippingAddress>({
    name: user?.name ?? "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal: "",
    country: "IN",
  });

  useEffect(() => {
    let active = true;
    Books.show(id)
      .then((r) => {
        if (active) setBook(r.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!book) return;
    setBusy(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok || !window.Razorpay) {
        toast({ title: "Razorpay checkout failed to load", tone: "error" });
        setBusy(false);
        return;
      }

      const created = await Orders.create({ book_id: book.id, shipping });

      const rzp = new window.Razorpay({
        key: created.razorpay.key_id,
        amount: created.razorpay.amount,
        currency: created.razorpay.currency,
        name: "Bookify",
        description: book.title,
        order_id: created.razorpay.order_id,
        prefill: {
          name: shipping.name,
          email: user?.email,
          contact: shipping.phone,
        },
        theme: { color: "#0f172a" },
        handler: async (resp) => {
          try {
            await Orders.verify({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            toast({ title: "Payment successful", tone: "success" });
            router.push("/profile?tab=orders");
          } catch (err) {
            toast({
              title: "Verification failed",
              description: err instanceof Error ? err.message : "",
              tone: "error",
            });
          } finally {
            setBusy(false);
          }
        },
      });

      rzp.open();
    } catch (err) {
      toast({
        title: "Could not start checkout",
        description: err instanceof Error ? err.message : "",
        tone: "error",
      });
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Container className="py-12">
        <Skeleton className="h-32 mb-4" />
        <Skeleton className="h-64" />
      </Container>
    );
  }

  if (!book) {
    return (
      <Container className="py-12">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Book not found.</p>
          <Link href="/books" className="text-foreground underline mt-3 inline-block">
            Back to library
          </Link>
        </Card>
      </Container>
    );
  }

  const amount = book.price_paise ?? 49900;

  return (
    <Container className="py-12 sm:py-16">
      <PageHeader
        eyebrow="Checkout"
        title="Shipping & payment"
        description="Fill your shipping address and pay securely via Razorpay."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-5 sm:p-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input
              label="Full name"
              required
              value={shipping.name}
              onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
              placeholder="Aryan Sharma"
            />
            <Input
              label="Phone"
              required
              value={shipping.phone}
              onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
              placeholder="9876543210"
            />
            <Input
              label="Address line 1"
              required
              value={shipping.line1}
              onChange={(e) => setShipping({ ...shipping, line1: e.target.value })}
              placeholder="House no., street"
            />
            <Input
              label="Address line 2 (optional)"
              value={shipping.line2 ?? ""}
              onChange={(e) => setShipping({ ...shipping, line2: e.target.value })}
              placeholder="Apartment, landmark"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                required
                value={shipping.city}
                onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
              />
              <Input
                label="State"
                required
                value={shipping.state}
                onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Postal code"
                required
                value={shipping.postal}
                onChange={(e) => setShipping({ ...shipping, postal: e.target.value })}
              />
              <Input
                label="Country"
                value={shipping.country ?? "IN"}
                onChange={(e) => setShipping({ ...shipping, country: e.target.value })}
              />
            </div>

            <Button type="submit" disabled={busy} className="mt-2">
              {busy ? "Opening Razorpay…" : `Pay ${rupees(amount)}`}
            </Button>
          </form>
        </Card>

        <Card className="p-5 h-fit lg:sticky lg:top-24">
          <div className="flex gap-4">
            <div className="w-20 h-28 rounded-md bg-white/5 ring-1 ring-white/10 overflow-hidden flex-shrink-0">
              <BookCover src={book.thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <Badge tone="success">In stock</Badge>
              <p
                className="mt-1 text-xl text-foreground tracking-tight line-clamp-2"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                {book.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {book.authors?.join(", ") ?? "—"}
              </p>
            </div>
          </div>
          <div className="mt-5 border-t border-white/5 pt-4 text-sm">
            <Row label="Price" value={rupees(amount)} />
            <Row label="Shipping" value="Free" />
            <div className="mt-3 flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span>{rupees(amount)}</span>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Icon.Lock className="h-3.5 w-3.5" />
            Secured by Razorpay · test mode
          </p>
        </Card>
      </div>
    </Container>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
