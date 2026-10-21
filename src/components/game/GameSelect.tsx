import { Children, isValidElement, useMemo, useState, type ReactNode, type ReactElement } from "react";
import { Check, ChevronRight, Search } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export type Choice = { value: string; label: string; disabled?: boolean };

type OptionProps = { value?: string | number; children?: ReactNode; disabled?: boolean };

function text(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  if (isValidElement(node)) return text((node.props as { children?: ReactNode }).children);
  return "";
}

/** Extracts <option> elements (even nested in fragments/arrays/optgroups). */
export function optionsFromChildren(children: ReactNode): Choice[] {
  const out: Choice[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<OptionProps>;
    if (el.type === "option") {
      const label = text(el.props.children);
      out.push({ value: el.props.value != null ? String(el.props.value) : label, label, disabled: el.props.disabled });
    } else out.push(...optionsFromChildren(el.props.children));
  });
  return out;
}

type Props = {
  value?: string | number;
  onChange?: (e: { target: { value: string }; currentTarget: { value: string } }) => void;
  children?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
  title?: string;
};

/**
 * Drop-in replacement for a native <select>: big touch tiles when there are
 * few choices, a bottom sheet with search otherwise. Same value/onChange API.
 */
export function GameSelect({ value, onChange, children, disabled, required, name, id, className, title, ...rest }: Props) {
  const options = useMemo(() => optionsFromChildren(children), [children]);
  const current = value == null ? "" : String(value);
  const label = rest["aria-label"] ?? title;
  const pick = (v: string) => onChange?.({ target: { value: v }, currentTarget: { value: v } });
  const real = options.filter((o) => o.value !== "");
  const hidden = name ? <input type="hidden" name={name} value={current} /> : null;

  if (real.length > 0 && real.length <= 6 && options.every((o) => o.label.length <= 40)) {
    return (
      <div id={id} role="radiogroup" aria-label={label} aria-required={required} className={cn("grid w-full grid-cols-2 gap-2 sm:grid-cols-3", className?.includes("w-auto") && "w-auto")}>
        {hidden}
        {real.map((o) => {
          const on = o.value === current;
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} disabled={disabled || o.disabled} onClick={() => pick(o.value)}
              className={cn("flex min-h-12 items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition active:scale-[0.97] disabled:opacity-50",
                on ? "border-primary bg-primary/10 text-foreground shadow-sm" : "border-border bg-card text-card-foreground hover:border-primary/50")}>
              <span className="min-w-0 break-words">{o.label}</span>
              {on && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>
    );
  }
  return <SheetPicker id={id} label={label} options={options} current={current} disabled={disabled} onPick={pick} hidden={hidden} />;
}

function SheetPicker({ id, label, options, current, disabled, onPick, hidden }: { id?: string; label?: string; options: Choice[]; current: string; disabled?: boolean; onPick: (v: string) => void; hidden: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.find((o) => o.value === current);
  const placeholder = options.find((o) => o.value === "")?.label ?? "Choisir";
  const list = options.filter((o) => o.value !== "" && o.label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      {hidden}
      <button id={id} type="button" disabled={disabled} aria-label={label} aria-haspopup="dialog" onClick={() => setOpen(true)}
        className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border-2 border-border bg-card px-4 py-2 text-left text-card-foreground transition hover:border-primary/50 active:scale-[0.99] disabled:opacity-50">
        <span className={cn("min-w-0 truncate", !selected && "text-muted-foreground")}>{selected?.label || placeholder}</span>
        <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
      </button>
      <Drawer open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerHeader><DrawerTitle className="font-heading">{label ?? placeholder}</DrawerTitle></DrawerHeader>
          {options.length > 8 && (
            <label className="mx-4 mb-2 flex min-h-12 items-center gap-2 rounded-xl border border-input bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="w-full bg-transparent py-2 outline-none" />
            </label>
          )}
          <ul className="space-y-2 overflow-y-auto px-4 pb-6">
            {list.map((o) => {
              const on = o.value === current;
              return (
                <li key={o.value}>
                  <button type="button" disabled={o.disabled} onClick={() => { onPick(o.value); setOpen(false); setQ(""); }}
                    className={cn("flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border-2 px-4 text-left transition active:scale-[0.98] disabled:opacity-50",
                      on ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50")}>
                    <span className="min-w-0 break-words">{o.label}</span>
                    {on && <Check className="h-5 w-5 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
            {list.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Aucun résultat</li>}
          </ul>
        </DrawerContent>
      </Drawer>
    </>
  );
}
