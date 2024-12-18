import { Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import './ProjectCard.css';

export const ProjectCard = ({ title, description, imgUrl, route }) => {
  return (
    <Col size={12} sm={6} md={3}>
      <Link to={route} style={{ textDecoration: "none" }}>
        <div
          className="proj-imgbx"
          style={{
            position: "relative",
            overflow: "hidden",
            border: "2px solid white",
            borderRadius: "10px",
            marginBottom: "20px",
            background: "#1a1a1a",
            textAlign: "center",
            padding: "10", // Remove extra padding
          }}
        >
          <img
            src={imgUrl}
            alt={title}
            style={{
              width: "90%",
              height: "90%",
              objectFit: "contain", // Ensure the whole image is visible
              borderRadius: "8px",
              transition: "transform 0.3s ease",
            }}
          />
          <div
            className="proj-txtx"
            style={{
              padding: "10px 0",
              color: "white",
              backgroundColor: "#000000b0", // Add a subtle overlay for text visibility
              position: "absolute",
              bottom: "0",
              width: "100%",
              textAlign: "center",
            }}
          >
            <h4 style={{ fontSize: "22px", fontWeight: "bold", margin: "5px 0" }}>
              {title}
            </h4>
            <span style={{ fontSize: "18px", color: "#cccccc" }}>
              {description}
            </span>
          </div>
        </div>
      </Link>
    </Col>
  );
};
