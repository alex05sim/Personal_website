"use client";

import { useState } from "react";
import type { BoardSection } from "@/lib/portfolio-data";

export function BoardSectionTabs({ sections }: { sections: BoardSection[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = sections[activeIndex];

  return (
    <div className="board-tabs mt-6">
      <div className="board-tab-list" role="tablist" aria-label="PCB board sections">
        {sections.map((section, index) => (
          <button
            aria-controls={`board-panel-${index}`}
            aria-selected={activeIndex === index}
            className="board-tab"
            id={`board-tab-${index}`}
            key={section.title}
            onClick={() => setActiveIndex(index)}
            role="tab"
            type="button"
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {section.title}
          </button>
        ))}
      </div>

      <article
        aria-labelledby={`board-tab-${activeIndex}`}
        className="card board-tab-panel"
        id={`board-panel-${activeIndex}`}
        role="tabpanel"
      >
        <div>
          <p className="board-panel-kicker">Selected section</p>
          <h3>{active.title}</h3>
          <p>{active.description}</p>
        </div>

        <div className="board-panel-meta">
          <div>
            <span>Refs</span>
            <strong>{active.refs}</strong>
          </div>
          <div>
            <span>Footprints</span>
            <strong>{active.footprint}</strong>
          </div>
        </div>

        <div className="board-choice-list">
          <span>Design choices</span>
          <ul>
            {active.designChoices.map((choice) => (
              <li key={choice}>{choice}</li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  );
}
