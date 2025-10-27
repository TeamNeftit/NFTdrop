// src/components/layout/DocsLayout.tsx
import { Link, useLocation } from "react-router-dom";
import * as React from "react";
import { useRef, useState, useEffect } from "react";
import { DocsPagination } from "../docs/DocsPagination";
import { docsSidebar } from "@/config/docs.config";
import { Search, Menu, X } from "lucide-react";
import { searchContent, SearchResult } from "@/utils/search";
import { SearchResults } from "@/component/search/SearchResults";
import  { debounce }  from "lodash";
import { useDocsNavigation } from "@/contexts/DocsNavigationContext";
import "./DocsLayout.css";

// ====== Highlight search term in sidebar ======
const HighlightText = ({ text, searchTerm }: { text: string; searchTerm: string }) => {
  if (!searchTerm.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${searchTerm})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <span key={i} className="hl-text">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

// ====== Logo ======
const NeftitLogo = () => (
  <img src="/images/logo.png" alt="Neftit Logo" className="logo" />
);


const Sidebar = React.memo(({ 
  allSections, 
  location, 
  searchTerm, 
  onLinkClick,
  isInternalNavigation 
}: { 
  allSections: any[]; 
  location: any; 
  searchTerm: string; 
  onLinkClick: (to: string) => void;
  isInternalNavigation: boolean;
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Function to find and scroll to current page in sidebar
  const scrollToCurrentPage = React.useCallback(() => {
    if (!sidebarRef.current) return;
    
    const currentPath = location.pathname;
    
    // Find the current page link in the sidebar
    const currentLink = sidebarRef.current.querySelector(`a[href="${currentPath}"]`);
    
    if (currentLink) {
      // Calculate position to center the current link in the sidebar
      const sidebar = sidebarRef.current;
      const linkRect = currentLink.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      
      // Position to center the link in the visible area
      const scrollTop = linkRect.top - sidebarRect.top + sidebar.scrollTop - (sidebarRect.height / 2) + (linkRect.height / 2);
      
      // Smooth scroll to the current page
      sidebar.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      });
    }
  }, [location.pathname]);

  const saveScrollPosition = () => {
    if (sidebarRef.current) {
      setScrollPosition(sidebarRef.current.scrollTop);
    }
  };

  // Restore scroll position after render, or scroll to current page if external navigation
  useEffect(() => {
    if (sidebarRef.current) {
      // Check if this is external navigation (not internal docs navigation)
      const isExternalNavigation = !isInternalNavigation;
      
      if (isExternalNavigation) {
        // Scroll to current page for external navigation
        setTimeout(() => {
          scrollToCurrentPage();
        }, 100); // Small delay to ensure content is rendered
      } else {
        // Restore saved scroll position for internal navigation
        sidebarRef.current.scrollTop = scrollPosition;
      }
    }
  }, [location.pathname, scrollPosition, scrollToCurrentPage, isInternalNavigation]);

  const handleLinkClick = (to: string) => {
    saveScrollPosition();
    onLinkClick(to);
  };

  return (
    <aside 
      ref={sidebarRef}
      className="ds"
    >
      <div className="ds-header">
        <NeftitLogo />
        <div className="ds-title">Docs</div>
      </div>
      {allSections.map((section) => (
        <div key={section.label} className="ds-section">
          <div className="ds-section-label">
            {section.label}
          </div>
          <ul>
            {section.links.map((link: any) => (
              <li key={link.to} className="ds-item">
                <Link
                  to={link.to}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(link.to);
                  }}
                  className={`ds-link ${location.pathname === link.to ? "is-active" : ""}`}
                >
                  <HighlightText text={link.label} searchTerm={searchTerm} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}, (prevProps, nextProps) => {
  // Only re-render if location.pathname changes (for active link highlighting)
  // or if searchTerm changes (for highlighting)
  return (
    prevProps.location.pathname === nextProps.location.pathname &&
    prevProps.searchTerm === nextProps.searchTerm
  );
});


const MobileSidebar = React.memo(({ 
  allSections, 
  location, 
  isOpen, 
  onClose,
  onLinkClick,
  isInternalNavigation 
}: { 
  allSections: any[]; 
  location: any; 
  isOpen: boolean;
  onClose: () => void;
  onLinkClick: (to: string) => void;
  isInternalNavigation: boolean;
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Function to find and scroll to current page in mobile sidebar
  const scrollToCurrentPage = React.useCallback(() => {
    if (!sidebarRef.current) return;
    
    const currentPath = location.pathname;
    
    // Find the current page link in the sidebar
    const currentLink = sidebarRef.current.querySelector(`a[href="${currentPath}"]`);
    
    if (currentLink) {
      // Calculate position to center the current link in the sidebar
      const sidebar = sidebarRef.current;
      const linkRect = currentLink.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      
      // Position to center the link in the visible area
      const scrollTop = linkRect.top - sidebarRect.top + sidebar.scrollTop - (sidebarRect.height / 2) + (linkRect.height / 2);
      
      // Smooth scroll to the current page
      sidebar.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      });
    }
  }, [location.pathname]);

  // Save scroll position before navigation
  const saveScrollPosition = () => {
    if (sidebarRef.current) {
      setScrollPosition(sidebarRef.current.scrollTop);
    }
  };

  // Restore scroll position or scroll to current page when sidebar opens
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      // Check if this is external navigation (not internal docs navigation)
      const isExternalNavigation = !isInternalNavigation;
      
      setTimeout(() => {
        if (sidebarRef.current) {
          if (isExternalNavigation) {
            // Scroll to current page for external navigation
            scrollToCurrentPage();
          } else {
            // Restore saved scroll position for internal navigation
            sidebarRef.current.scrollTop = scrollPosition;
          }
        }
      }, 50);
    }
  }, [isOpen, scrollPosition, scrollToCurrentPage, isInternalNavigation]);

  const handleLinkClick = (to: string) => {
    saveScrollPosition();
    onLinkClick(to);
    onClose(); 
  };

  if (!isOpen) return null;

  return (
    <div className="ms-overlay">
      {/* Dark overlay (click to close) */}
      <div className="ms-backdrop" onClick={onClose} />

      {/* Sidebar on the right */}
      <div
        ref={sidebarRef}
        className="ms-panel"
      >
        {allSections.map((section) => (
          <div key={section.label} className="ds-section">
            <div className="ds-section-label">
              {section.label}
            </div>
            <ul>
              {section.links.map((link: any) => (
                <li key={link.to} className="ds-item">
                  <Link
                    to={link.to}
                    onClick={(e) => {
                      e.preventDefault();
                      handleLinkClick(link.to);
                    }}
                    className={`ds-link ${location.pathname === link.to ? "is-active-left" : ""}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if location.pathname changes (for active link highlighting)
  // or if isOpen changes (for mobile sidebar visibility)
  return (
    prevProps.location.pathname === nextProps.location.pathname &&
    prevProps.isOpen === nextProps.isOpen
  );
});

// ====== Flatten docs pages ======
const flattenPages = (sections: typeof docsSidebar) =>
  sections.flatMap((section) =>
    section.items.map((item) => ({
      title: item.title,
      slug: item.slug,
    }))
  );

export default React.memo(function DocsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const contentSearchRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const desktopContentRef = useRef<HTMLDivElement>(null);
  const mobileContentRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { handleDocsNavigation, isInternalNavigation, markInternalNavigation } = useDocsNavigation();

  
  const allPages = flattenPages(docsSidebar);
  const [currentPageIndex, setCurrentPageIndex] = React.useState(0);

  // Update current page index when location changes
  React.useEffect(() => {
    const currentPath = location.pathname.replace(/^\/docs\/?/, "");
    const newIndex = allPages.findIndex(
      (page) =>
        page.slug === currentPath ||
        (currentPath === "" && page.slug === "introduction/problems-targeted")
    );
    
    if (newIndex !== -1) {
      setCurrentPageIndex(newIndex);
    } else {
      // Default to first page if no match found
      setCurrentPageIndex(0);
    }
  }, [location.pathname]);

  // ===== Debounced search =====
  const debouncedSearch = React.useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const results = await searchContent(query);

        
        const cleanResults = results.map((r) => ({
          ...r,
          snippet: r.snippet?.replace(/function\s+mdx.*|export\s+default.*|import\s+.*;/gi, "")
        }));

        setSearchResults(cleanResults);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  React.useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  // Handle clicks outside search results
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchResultsRef.current && !searchResultsRef.current.contains(event.target as Node) &&
          contentSearchRef.current && !contentSearchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clear search on navigation only if search is active
  React.useEffect(() => {
    if (searchTerm || searchResults.length > 0 || mobileSearchOpen || isSearchFocused) {
      setSearchTerm("");
      setSearchResults([]);
      setMobileSearchOpen(false);
      setSidebarOpen(false);
      setIsSearchFocused(false);
    }
  }, [location.pathname]); // Only depend on pathname, not on search state

  // Scroll content area to top on route changes (but preserve sidebar scroll)
  React.useEffect(() => {
    // Only scroll to top if we're on a docs page
    if (location.pathname.startsWith('/docs')) {
      // Use a small delay to ensure the new content is fully rendered before scrolling
      const scrollTimer = setTimeout(() => {
        // Scroll desktop content to top
        if (desktopContentRef.current) {
          desktopContentRef.current.scrollTop = 0;
        }
        
        // Scroll mobile content to top
        if (mobileContentRef.current) {
          mobileContentRef.current.scrollTop = 0;
        }
        
        // Also scroll window to top as a fallback
        window.scrollTo(0, 0);
      }, 100); // 100ms delay to ensure content is rendered
      
      return () => clearTimeout(scrollTimer);
    }
  }, [location.pathname]);

  // Handle links in docs content - make them open in new tabs
  React.useEffect(() => {
    const handleDocsContentLinks = () => {
      // Find all links within docs content
      const docsContentElements = document.querySelectorAll('.docs-content');
      
      docsContentElements.forEach(contentElement => {
        const links = contentElement.querySelectorAll('a');
        
        links.forEach(link => {
          const href = link.getAttribute('href');
          
          // Skip if it's an anchor link or internal docs link
          if (href && !href.startsWith('#') && !href.startsWith('/docs')) {
            // Add target and rel attributes for opening in new tab
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
            
            // Add click handler to ensure new tab behavior
            link.addEventListener('click', (e) => {
              e.preventDefault();
              window.open(href, '_blank', 'noopener,noreferrer');
            });
          }
        });
      });
    };

    // Initial setup
    handleDocsContentLinks();
    
    // Set up a MutationObserver to handle dynamically added content
    const observer = new MutationObserver(() => {
      handleDocsContentLinks();
    });
    
    // Observe the entire document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, [location.pathname]); // Re-run when route changes

  // Scroll content to top function
  const scrollContentToTop = React.useCallback(() => {
    // Scroll desktop content to top
    if (desktopContentRef.current) {
      desktopContentRef.current.scrollTop = 0;
    }
    
    // Scroll mobile content to top
    if (mobileContentRef.current) {
      mobileContentRef.current.scrollTop = 0;
    }
    
    // Also scroll window to top as a fallback
    window.scrollTo(0, 0);
  }, []);

  // Enhanced navigation handler that scrolls content to top
  const enhancedHandleDocsNavigation = React.useCallback((path: string) => {
    handleDocsNavigation(path);
    // Mark as internal navigation for sidebar scroll preservation
    markInternalNavigation();
    // Scroll content to top immediately
    scrollContentToTop();
  }, [handleDocsNavigation, markInternalNavigation, scrollContentToTop]);

  // Memoize the navigation handler
  const memoizedHandleDocsNavigation = React.useCallback(enhancedHandleDocsNavigation, [enhancedHandleDocsNavigation]);

  // Sidebar sections (memoized)
  const allSections = React.useMemo(() => 
    docsSidebar.map((section) => ({
      label: section.title,
      links: section.items.map((item) => ({
        to: `/docs/${item.slug}`,
        label: item.title,
        searchableText: `${section.title} ${item.title}`.toLowerCase(),
      })),
    }))
  , [docsSidebar]);

  return (
    <div className="docs-root">
      {/* ===== Desktop/Laptop Layout ===== */}
      <div className="docs-desktop">
        <Sidebar 
          allSections={allSections}
          location={location}
          searchTerm={searchTerm}
          onLinkClick={memoizedHandleDocsNavigation}
          isInternalNavigation={isInternalNavigation}
        />

        <main ref={desktopContentRef} className="docs-main">
          <div className="docs-main-inner">
            {/* ===== Search (Desktop) ===== */}
            <div className="search-wrap">
              <div className="search-rel">
                <div className="search-icon-wrap">
                  <Search className="icon-16 text-muted" />
                </div>
                <input
                  ref={contentSearchRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className="search-input"
                  placeholder="Search documentation..."
                />
              </div>
              {isSearchFocused && searchTerm && (
                <div 
                  ref={searchResultsRef}
                  className="search-results-panel"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {isSearching ? (
                    <div className="sr-loading">Searching...</div>
                  ) : (
                    <SearchResults
                      results={searchResults}
                      searchTerm={searchTerm}
                      onResultClick={() => {
                        setSearchTerm("");
                        setIsSearchFocused(false);
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Main content */}
            <div className="docs-content">
              {children}
            </div>

            <div className="docs-pagination-wrap">
              <DocsPagination
                prevPage={
                  // Special handling for overview page - no previous page
                  location.pathname === "/docs/overview" ? null :
                  currentPageIndex > 0
                    ? {
                        title: allPages[currentPageIndex - 1]?.title || "Previous",
                        href: `/docs/${allPages[currentPageIndex - 1]?.slug || ""}`,
                      }
                    : null
                }
                nextPage={
                  // Special handling for overview page - next page should be the first page (Problems Targeted)
                  location.pathname === "/docs/overview" 
                    ? {
                        title: allPages[0]?.title || "Next",
                        href: `/docs/${allPages[0]?.slug || ""}`,
                      }
                    : currentPageIndex < allPages.length - 1
                    ? {
                        title: allPages[currentPageIndex + 1]?.title || "Next",
                        href: `/docs/${allPages[currentPageIndex + 1]?.slug || ""}`,
                      }
                    : null
                }
                onNavigate={handleDocsNavigation}
              />
            </div>
          </div>
        </main>
      </div>

      {/* ===== Mobile / Tablet Layout ===== */}
      <div className="docs-mobile">
        {/* Header */}
        <header className="dmh">
          <div className="dmh-brand">
            <NeftitLogo />
            <span className="dmh-title">Docs</span>
          </div>

          {/* Right side buttons (search + hamburger) */}
          <div className="dmh-actions">
            {/* Search trigger (mobile) */}
            <button onClick={() => setMobileSearchOpen(true)}>
              <Search className="icon-24" />
            </button>

            {/* Sidebar toggle */}
            <button onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="icon-24" /> : <Menu className="icon-24" />}
            </button>
          </div>
        </header>

        {/* ===== Fullscreen Search (Mobile/Tablet) ===== */}
        {mobileSearchOpen && (
          <div className="mso">
            <div className="mso-header">
              <input
                ref={contentSearchRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="mso-input"
                placeholder="Search documentation..."
              />
              <button onClick={() => { setMobileSearchOpen(false); setSearchTerm(""); }}>
                <X className="icon-24 mso-close-icon" />
              </button>
            </div>

            <div 
              className="mso-results"
              onClick={(e) => e.stopPropagation()}
            >
              {isSearching ? (
                <div className="mso-loading">Searching...</div>
              ) : (
                <SearchResults
                  results={searchResults}
                  searchTerm={searchTerm}
                  onResultClick={() => {
                    setSearchTerm("");
                    setMobileSearchOpen(false);
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* ===== Mobile Sidebar with Scroll Preservation ===== */}
        <MobileSidebar
          allSections={allSections}
          location={location}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLinkClick={memoizedHandleDocsNavigation}
          isInternalNavigation={isInternalNavigation}
        />

        {/* Content */}
        <main ref={mobileContentRef} className="mobile-content">
          <div className="docs-content">{children}</div>
        </main>
      </div>

      {/* Footer */}
      <footer className="docs-footer">
        <div className="docs-footer-text">
          Docs powered by <span className="docs-footer-brand">NEFTIT</span>
        </div>
      </footer>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if children change (content)
  return prevProps.children === nextProps.children;
});
