"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import {
  Container,
  Card,
  Input,
  Textarea,
  Select,
  Button,
  Badge,
  EmptyState,
  PageHeader,
  Skeleton,
  cx,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { BookCover } from "@/components/book-cover";
import { RequireAuth } from "@/components/require-auth";
import { SellerBooks, RoleRequests } from "@/lib/endpoints";
import { useCached, invalidateCache } from "@/lib/use-cached";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/toaster";
import type { Book } from "@/lib/types";

export default function SellerPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { user, refresh } = useAuth();
  const isSeller = user?.role === "seller" || user?.role === "admin";

  const booksQ = useCached<{ data: Book[] }>(
    isSeller ? "seller:books" : null,
    () => SellerBooks.mine(),
  );
  const books = booksQ.data?.data ?? [];

  const pending = books.filter((b) => b.status === "pending").length;
  const approved = books.filter((b) => b.status === "approved").length;
  const rejected = books.filter((b) => b.status === "rejected").length;

  if (!user) return null;

  if (!isSeller) {
    return <SellerGate onRequested={() => void refresh()} />;
  }

  return (
    <Container className="py-12 sm:py-16 relative">
      <div
        aria-hidden
        className="orb"
        style={{
          width: 520,
          height: 520,
          background:
            "radial-gradient(circle, hsl(200 80% 40% / 0.22), transparent 60%)",
          top: "-15%",
          right: "-10%",
        }}
      />

      <PageHeader
        eyebrow="Seller studio"
        title="Your catalogue"
        description="Submit new titles with cover art and description. Admins verify each listing before it lands on the public shelf."
      />

      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3 animate-fade-rise-delay">
        <Stat label="Pending review" value={pending} />
        <Stat label="Approved" value={approved} />
        <Stat label="Rejected" value={rejected} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[420px_minmax(0,1fr)] animate-fade-rise-delay-2">
        <NewBookForm
          onCreated={(b) => {
            booksQ.setData({ data: [b, ...books] });
            invalidateCache("dashboard:books");
          }}
        />

        <div>
          <h2
            className="text-3xl tracking-[-0.5px] mb-4"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Your submissions
          </h2>
          {booksQ.loading && books.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : books.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Icon.Book />}
                title="No submissions yet"
                description="Use the form on the left to add your first book to the registry."
              />
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              {books.map((b, i) => (
                <Link
                  key={b.id}
                  href={`/books/${b.id}`}
                  className={cx(
                    "flex gap-4 p-5 transition-colors hover:bg-white/[0.04]",
                    i !== 0 && "border-t border-white/5",
                  )}
                >
                  <div className="w-14 h-20 rounded-md bg-white/5 ring-1 ring-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                    <BookCover
                      src={b.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <StatusBadge status={b.status} />
                      <span className="font-mono text-[11px] text-muted-foreground">
                        #{String(b.id).padStart(4, "0")}
                      </span>
                    </div>
                    <p
                      className="text-lg tracking-tight text-foreground truncate"
                      style={{ fontFamily: "'Instrument Serif', serif" }}
                    >
                      {b.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.authors?.join(", ") ?? "—"}
                    </p>
                    {b.status === "rejected" && b.review_note && (
                      <p className="mt-2 text-[11px] text-[hsl(var(--danger))]">
                        Admin note: {b.review_note}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = status ?? "approved";
  if (s === "approved") return <Badge tone="success">Approved</Badge>;
  if (s === "rejected") return <Badge tone="danger">Rejected</Badge>;
  return <Badge tone="warning">Pending</Badge>;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p
        className="text-4xl mt-2 tabular-nums tracking-[-1px]"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {value}
      </p>
    </Card>
  );
}

function NewBookForm({ onCreated }: { onCreated: (b: Book) => void }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [publisher, setPublisher] = useState("");
  const [isbn13, setIsbn13] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [categories, setCategories] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("textbook");
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setCover(f);
    setCoverPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const res = await SellerBooks.create({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        authors: authors.trim() || undefined,
        publisher: publisher.trim() || undefined,
        isbn_13: isbn13.trim() || undefined,
        page_count: pageCount ? Number(pageCount) : undefined,
        categories: categories.trim() || undefined,
        description: description.trim() || undefined,
        type,
        cover,
      });
      toast({ title: "Submitted for review", tone: "success" });
      onCreated(res.data);
      setTitle("");
      setSubtitle("");
      setAuthors("");
      setPublisher("");
      setIsbn13("");
      setPageCount("");
      setCategories("");
      setDescription("");
      setCover(null);
      setCoverPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      toast({
        title: "Submission failed",
        description: err instanceof Error ? err.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6 h-fit lg:sticky lg:top-24">
      <h2
        className="text-2xl tracking-[-0.5px] mb-1"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        Submit a book
      </h2>
      <p className="text-xs text-muted-foreground mb-5">
        Once an admin approves, your book appears in the public registry.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Cover image
          </span>
          <div className="mt-2 flex items-center gap-4">
            <div className="w-20 h-28 rounded-md bg-white/5 ring-1 ring-white/10 overflow-hidden flex items-center justify-center">
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverPreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <Icon.Book className="text-muted-foreground/60" />
              )}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onCoverPick}
                className="text-xs text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-[hsl(var(--primary-foreground))] file:cursor-pointer hover:file:bg-white/90"
              />
              <p className="text-[11px] text-muted-foreground/80">
                JPG/PNG/WebP, max 4MB.
              </p>
            </div>
          </div>
        </label>

        <Input
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="The Republic"
        />
        <Input
          label="Subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="A treatise on justice"
        />
        <Input
          label="Authors (comma-separated)"
          value={authors}
          onChange={(e) => setAuthors(e.target.value)}
          placeholder="Plato, G.M.A. Grube"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Publisher"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            placeholder="Hackett"
          />
          <Input
            label="ISBN-13"
            value={isbn13}
            onChange={(e) => setIsbn13(e.target.value)}
            placeholder="978…"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Pages"
            type="number"
            min={0}
            value={pageCount}
            onChange={(e) => setPageCount(e.target.value)}
            placeholder="320"
          />
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="textbook">Textbook</option>
            <option value="reference">Reference</option>
            <option value="ebook">E-book</option>
          </Select>
        </div>
        <Input
          label="Categories (comma-separated)"
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          placeholder="Philosophy, Ethics"
        />
        <Textarea
          label="Description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A few sentences about the book."
        />

        <Button type="submit" disabled={busy || !title.trim()}>
          {busy ? "Submitting…" : "Submit for review"}
          <Icon.Plus />
        </Button>
      </form>
    </Card>
  );
}

function SellerGate({ onRequested }: { onRequested: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const requestsQ = useCached<{ data: import("@/lib/types").RoleRequest[] }>(
    "me:role-requests",
    () => RoleRequests.mine(),
  );
  const existing = (requestsQ.data?.data ?? []).find(
    (r) => r.requested_role === "seller" && r.status === "pending",
  );

  async function request(e: FormEvent) {
    e.preventDefault();
    // Optimistic: show toast + clear form immediately. POST fires in background.
    const sentReason = reason;
    setBusy(true);
    toast({ title: "Request sent to admin", tone: "success" });
    setReason("");
    invalidateCache("me:role-requests");
    onRequested();
    try {
      await RoleRequests.create({ requested_role: "seller", reason: sentReason });
    } catch (err) {
      toast({
        title: "Request failed — please try again",
        description: err instanceof Error ? err.message : "",
        tone: "error",
      });
      setReason(sentReason);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="py-12 sm:py-16 relative">
      <PageHeader
        eyebrow="Become a seller"
        title="Start listing your own books"
        description="Sellers can submit textbooks and references with cover art and descriptions. Each new listing is reviewed by an admin before it appears publicly."
      />

      {existing ? (
        <Card className="p-6 max-w-xl">
          <Badge tone="warning">Pending review</Badge>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Your request to become a seller is awaiting an admin decision. You
            will be granted access as soon as it is approved.
          </p>
        </Card>
      ) : (
        <Card className="p-6 max-w-xl">
          <form onSubmit={request} className="flex flex-col gap-4">
            <Textarea
              label="Why do you want seller access? (optional)"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="A short note for the admin."
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Requesting…" : "Request seller role"}
            </Button>
          </form>
        </Card>
      )}
    </Container>
  );
}
