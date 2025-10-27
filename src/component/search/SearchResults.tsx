import React, { useCallback } from "react";
import { SearchResult } from "@/utils/search";
import { useDocsNavigation } from "@/contexts/DocsNavigationContext";
import "./SearchResults.css";

interface SearchResultsProps {
  results: SearchResult[];
  searchTerm: string;
  onResultClick?: () => void;
}

const HighlightMatch: React.FC<{ text: string; searchTerm: string }> = ({
  text,
  searchTerm,
}) => {
  if (!searchTerm.trim()) return <>{text}</>;

  const escapeRegex = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regex = new RegExp(`(${escapeRegex(searchTerm)})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="sr-hl">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchTerm,
  onResultClick,
}) => {
  const { handleDocsNavigation } = useDocsNavigation();

  const handleResultClick = useCallback((slug: string) => {
    // Close search dropdown
    if (onResultClick) {
      onResultClick();
    }
    
    // Navigate to the selected page using docs navigation
    handleDocsNavigation(`/docs/${slug}`);
    
    // Close mobile keyboard on mobile devices
    if (window.innerWidth < 1024) {
      const activeElement = document.activeElement as HTMLElement;
      activeElement?.blur();
    }
    
    // Scroll to top of the page
    window.scrollTo(0, 0);
  }, [handleDocsNavigation, onResultClick]);
  if (!searchTerm.trim()) return null;

  if (results.length === 0) {
    return (
      <div className="sr-empty">
        <p className="sr-empty-text">
          No results found for <span className="sr-empty-highlight">"{searchTerm}"</span>
        </p>
      </div>
    );
  }

  return (
    <div className="sr-container custom-scrollbar">
      <div className="sr-list">
        {results.map((result) => (
          <a
            key={result.slug}
            href={`/docs/${result.slug}`}
            onClick={(e) => {
              e.preventDefault();
              handleResultClick(result.slug);
            }}
            className="sr-item"
          >
            <div className="sr-item-head">
              <span className="sr-section-pill">{result.section}</span>
            </div>
            <h3 className="sr-title">
              <HighlightMatch text={result.title} searchTerm={searchTerm} />
            </h3>
            <p className="sr-snippet">
              <HighlightMatch
                text={result.snippet || result.content}
                searchTerm={searchTerm}
              />
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
