import { Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import './ProjectCard.css';

export const ProjectCard = ({ title, description, route, isHot }) => {
  // Function to get icon based on title
  const getIcon = (title) => {
    const icons = {
      'PDF to Word': '📝',
      'PDF to PPT': '📊',
      'PDF to Excel': '📊',
      'PDF to JPG': '🖼️',
      'PDF to TXT': '📄',
      'PDF to RTF': '📄',
      'PDF to Pages': '📄',
      'PDF to HTML': '🌐',
      'PDF to EPUB': '📚',
      'PDF to JSON': '📋',
      'OCR': '🔍',
      'JPG to PDF': '🖼️',
      'Word to PDF': '📝',
      'Excel to PDF': '📊',
      'PPT to PDF': '📊',
      'JSON to PDF': '📋',
      'Merge PDF': '🔗',
      'Split PDF': '✂️',
      'Compress PDF': '📦',
      'JSON to CSV': '📊',
      'JSON to XML': '📋',
      'XML to JSON': '📋',
      'Speech to Text': '🎤'
    };
    return icons[title] || '📄';
  };

  return (
    <Col>
      <Link to={route} style={{ textDecoration: "none" }}>
        <div className="proj-imgbx">
          {isHot && <div className="hot-label">Hot</div>}
          <div className="tool-icon">{getIcon(title)}</div>
          <div className="title-text">{title}</div>
          <div className="description-text">{description}</div>
        </div>
      </Link>
    </Col>
  );
};
