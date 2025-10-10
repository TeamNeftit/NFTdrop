import { ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import "./DocsPagination.css"

interface DocsPaginationProps {
  prevPage?: {
    title: string
    href: string
  } | null
  nextPage?: {
    title: string
    href: string
  } | null
  onNavigate?: (path: string) => void
}

export function DocsPagination({ prevPage, nextPage, onNavigate }: DocsPaginationProps) {
  const handleNavigation = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(href);
    }
  };

  return (
    <div className="dp">
      {prevPage ? (
        <Link to={prevPage.href} onClick={(e) => handleNavigation(e, prevPage.href)} className="dp-link dp-link--prev">
          <button className="dp-btn dp-btn--left">
            <ChevronLeft className="dp-icon dp-icon--left" />
            <div className="dp-text-left">
              <div className="dp-label">Previous</div>
              <div className="dp-title">{prevPage.title}</div>
            </div>
          </button>
        </Link>
      ) : (
        <div />
      )}
      
      {nextPage && (
        <Link to={nextPage.href} onClick={(e) => handleNavigation(e, nextPage.href)} className="dp-link dp-link--next">
          <button className="dp-btn dp-btn--right">
            <div className="dp-text-right">
              <div className="dp-label">Next</div>
              <div className="dp-title">{nextPage.title}</div>
            </div>
            <ChevronRight className="dp-icon dp-icon--right" />
          </button>
        </Link>
      )}
    </div>
  )
}
