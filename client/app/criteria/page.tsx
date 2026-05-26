"use client";

import { useState } from "react";
import {
  Container,
  Card,
  Input,
  Button,
  Textarea,
  Badge,
  PageHeader,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { RequireAuth } from "@/components/require-auth";
import { Criteria } from "@/lib/endpoints";
import { useAuth } from "@/lib/auth-context";
import { useCached } from "@/lib/use-cached";
import { toast } from "@/components/toaster";
import type { Criterion } from "@/lib/types";

export default function CriteriaPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const criteriaQ = useCached<{ data: Criterion[] }>(
    "criteria:list",
    () => Criteria.list(),
  );
  const items = criteriaQ.data?.data ?? [];
  const loading = criteriaQ.loading;
  const [showForm, setShowForm] = useState(false);

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [weight, setWeight] = useState("1.0");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await Criteria.create({
        key,
        name,
        description: desc || null,
        scale_min: 1,
        scale_max: 5,
        weight: Number(weight),
        is_active: true,
      });
      setKey("");
      setName("");
      setDesc("");
      setWeight("1.0");
      setShowForm(false);
      toast({ title: "Axis added", tone: "success" });
      void criteriaQ.refresh();
    } catch (error) {
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggle(c: Criterion) {
    await Criteria.update(c.id, { is_active: !c.is_active });
    void criteriaQ.refresh();
  }

  async function remove(c: Criterion) {
    if (!confirm(`Remove "${c.name}"?`)) return;
    await Criteria.remove(c.id);
    toast({ title: "Removed", tone: "success" });
    void criteriaQ.refresh();
  }

  return (
    <Container className="py-12 sm:py-16 relative">
      <div
        aria-hidden
        className="orb"
        style={{
          width: 480,
          height: 480,
          background: "radial-gradient(circle, hsl(200 80% 40% / 0.2), transparent 60%)",
          top: "-15%",
          left: "-10%",
        }}
      />

      <PageHeader
        eyebrow="The instrument"
        title="Rubric"
        description={
          isAdmin
            ? "Define the axes by which all books are measured. Adjust weights, deactivate, or remove axes."
            : "The rubric is read-only. Contact an admin for changes."
        }
        actions={
          isAdmin && (
            <Button onClick={() => setShowForm(!showForm)}>
              <Icon.Plus />
              Add axis
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 mb-8 animate-fade-rise-delay sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Total axes</p>
          <p
            className="text-4xl mt-2 tabular-nums tracking-[-1px]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {items.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Active</p>
          <p
            className="text-4xl mt-2 tabular-nums tracking-[-1px] text-[hsl(var(--success))]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {items.filter((i) => i.is_active).length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Total weight</p>
          <p
            className="text-4xl mt-2 tabular-nums tracking-[-1px]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {items.filter((i) => i.is_active).reduce((s, i) => s + Number(i.weight), 0).toFixed(2)}
          </p>
        </Card>
      </div>

      {isAdmin && showForm && (
        <Card className="p-6 mb-6 animate-fade-rise">
          <h3
            className="text-2xl tracking-[-0.5px] mb-5"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            New axis
          </h3>
          <form onSubmit={create} className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Key (slug)"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              placeholder="inclusivity"
            />
            <Input
              label="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Inclusivity"
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
                placeholder="What does this axis measure?"
              />
            </div>
            <Input
              label="Weight"
              type="number"
              step="0.1"
              min="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            />
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Adding…" : "Add axis"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Icon.ListCheck />}
            title="No criteria defined"
            description="Add the first axis to begin assessing books."
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden animate-fade-rise-delay-2">
          {items.map((c, i) => (
            <div
              key={c.id}
              className={`grid grid-cols-1 gap-4 p-5 sm:grid-cols-12 sm:items-center ${
                i !== 0 ? "border-t border-white/5" : ""
              }`}
            >
              <div className="text-xs font-mono text-muted-foreground sm:col-span-1">
                #{String(i + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0 sm:col-span-7">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className="text-xl tracking-tight"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {c.name}
                  </h3>
                  {!c.is_active && <Badge tone="default">Inactive</Badge>}
                </div>
                <p className="font-mono text-[11px] text-muted-foreground/70 mt-0.5">{c.key}</p>
                {c.description && (
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.description}</p>
                )}
              </div>
              <div className="text-xs text-muted-foreground sm:col-span-2">
                <p>weight {Number(c.weight).toFixed(2)}</p>
                <p>
                  scale {c.scale_min}–{c.scale_max}
                </p>
              </div>
              {isAdmin && (
                <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-end">
                  <Button size="sm" variant="ghost" onClick={() => toggle(c)}>
                    {c.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(c)} aria-label="Remove">
                    <Icon.Trash />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </Container>
  );
}
