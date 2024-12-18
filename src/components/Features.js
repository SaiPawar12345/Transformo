import React from 'react';
import './Features.css';
import { Container, Row, Col } from "react-bootstrap";
import { FaHome, FaFolder, FaShareAlt, FaTrashAlt, FaFileAlt, FaUpload } from "react-icons/fa"; // Ensure react-icons is installed

export const Features = () => {
  const documents = [
    { title: "Document 1", icon: <FaFileAlt />, id: 1 },
    { title: "Document 2", icon: <FaFileAlt />, id: 2 },
    { title: "Document 3", icon: <FaFileAlt />, id: 3 },
    { title: "Document 4", icon: <FaFileAlt />, id: 4 },
    { title: "Document 5", icon: <FaFileAlt />, id: 5 },
  ];

  return (
    <div className="features-container-2024">
      {/* Sidebar */}
      <div className="sidebar-2024">
        <h3>Decrypt Docs</h3>
        <ul>
          <li><FaHome /> Home</li>
          <li><FaFolder /> Categorized</li>
          <li><FaShareAlt /> Shared</li>
          <li><FaTrashAlt /> Trash</li>
          <li><FaFileAlt /> Talk-2-Docs</li>
        </ul>
        <button className="upload-btn-2024"><FaUpload /> Upload</button>
      </div>

      {/* Main Content */}
      <div className="main-content-2024">
        {/* Header */}
        <div className="header-2024">
          <div className="status-2024">
            <span className="completed-2024">● Completed</span>
            <span className="pending-2024">● Pending</span>
          </div>
          <div className="wallet-info">0x1280...e081</div>
        </div>

        {/* Drag-and-Drop Section */}
        <div className="upload-section-2024">
          <div className="drag-drop">
            <p>Drag and drop your files here</p>
            <p>OR</p>
            <button className="browse-btn-2024">Browse</button>
          </div>
        </div>

        {/* Document Cards */}
        <div className="documents-section-2024">
          <div className="row-2024">
            <div className="col">
              <div className="card-2024 signed-documents-2024">
                <h4>Signed Documents</h4>
                <p>Successfully completed</p>
                <div className="count-2024">8</div>
              </div>
            </div>
            <div className="col">
              <div className="card-2024 pending-documents-2024">
                <h4>Pending Documents</h4>
                <p>Awaiting signatures</p>
                <div className="count-2024">7</div>
              </div>
            </div>
          </div>

          {/* Document Grid */}
          <div className="document-grid-2024">
            {documents.map((doc) => (
              <div className="doc-card-2024" key={doc.id}>
                {doc.icon}
                <p>{doc.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
