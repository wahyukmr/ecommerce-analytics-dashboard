import { useEffect, useState } from "react";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "trends", label: "Trends" },
  { id: "journey", label: "Customer journey" },
  { id: "catalog", label: "Catalog" },
  { id: "retention", label: "Retention" },
] as const;

export default function DashboardSectionNav(): React.JSX.Element {
  const [activeId, setActiveId] = useState<string>(sections[0].id);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.find((entry) => entry.isIntersecting);
          if (visible) setActiveId(id);
        },
        { rootMargin: "-16% 0px -68% 0px", threshold: 0 },
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return (
    <nav aria-label="Dashboard sections" className="section-nav">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={activeId === section.id ? "page" : undefined}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
