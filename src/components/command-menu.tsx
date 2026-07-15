"use client";

import {
  ArrowUpRight,
  BriefcaseBusiness,
  FileText,
  Globe2,
  Home,
  Layers,
  Mail,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { profile, projects, socials } from "@/lib/portfolio-data";

type CommandItem = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  icon: typeof Home;
  run: () => void;
};

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<CommandItem[]>(() => {
    const go = (href: string) => () => {
      setOpen(false);
      router.push(href);
    };
    const external = (href: string) => () => {
      setOpen(false);
      window.open(href, "_blank", "noopener,noreferrer");
    };

    return [
      { id: "home", label: "Home", group: "Pages", icon: Home, run: go("/") },
      { id: "projects", label: "All projects", group: "Pages", icon: Layers, run: go("/projects") },
      { id: "hire-me", label: "Hire me", group: "Pages", icon: BriefcaseBusiness, run: go("/hire-me") },
      { id: "world", label: "World", group: "Pages", icon: Globe2, run: go("/world") },
      { id: "me", label: "Me - interests & the black hole", group: "Pages", icon: Home, run: go("/me") },
      ...projects.map((project) => ({
        id: project.slug,
        label: project.title,
        group: "Projects",
        hint: project.domain,
        icon: project.icon,
        run: go(`/projects/${project.slug}`),
      })),
      {
        id: "resume",
        label: "Download resume",
        group: "Links",
        icon: FileText,
        run: external(profile.resumeHref),
      },
      ...socials.map((social) => ({
        id: social.label.toLowerCase(),
        label: social.label,
        group: "Links",
        icon: social.label === "Email" ? Mail : social.icon,
        run: social.href.startsWith("http") ? external(social.href) : external(social.href),
      })),
    ];
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        (item.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [items, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  // Open on Cmd/Ctrl+K, close on Escape, plus a custom event for the nav trigger.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function onOpenEvent() {
      setOpen(true);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("cmdk:open", onOpenEvent);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("cmdk:open", onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => {
        setActiveIndex(0);
        inputRef.current?.focus();
      }, 30);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function onListKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      filtered[activeIndex]?.run();
    }
  }

  let runningIndex = -1;
  const groups = Array.from(new Set(filtered.map((item) => item.group)));

  return (
    <div
      className="cmdk-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Command menu"
      onClick={close}
    >
      <div className="cmdk-panel" onClick={(event) => event.stopPropagation()}>
        <div className="cmdk-input-row">
          <Search size={18} />
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Jump to a page, project, or link..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onListKeyDown}
          />
          <kbd>esc</kbd>
        </div>
        <div className="cmdk-list">
          {filtered.length === 0 ? (
            <div className="cmdk-empty">No matches for &quot;{query}&quot;.</div>
          ) : (
            groups.map((group) => (
              <div key={group}>
                <div className="cmdk-group-label">{group}</div>
                {filtered
                  .filter((item) => item.group === group)
                  .map((item) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    const Icon = item.icon;
                    const isExternal = item.group === "Links";

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="cmdk-item"
                        data-active={index === activeIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={item.run}
                      >
                        <span className="ic">
                          <Icon size={16} />
                        </span>
                        {item.label}
                        {item.hint ? <span className="meta">{item.hint}</span> : null}
                        {isExternal ? <ArrowUpRight size={14} className="meta" /> : null}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
