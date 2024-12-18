import { Container, Row, Col, Tab, Nav } from "react-bootstrap";
import { ProjectCard } from "./ProjectCard";
import projImg1 from "../assets/img/project-img1.png";
import projImg2 from "../assets/img/project-img2.png";
import projImg3 from "../assets/img/project-img3.png";
import colorSharp2 from "../assets/img/color-sharp2.png";
import 'animate.css';
import TrackVisibility from 'react-on-screen';
import { Link } from "react-router-dom"; // Import Link from React Router
import './tp2.css';

export const Projects = () => {
  const projects = [
    {
      title: "PDF to JPG",
      description: "Convert PDF file to JPG file.",
      imgUrl: projImg1,
      route: "/pdf-to-jpg", // Route for the feature
    },
    {
      title: "JPG to PDF",
      description: "Convert JPG file to PDF file.",
      imgUrl: projImg2,
      route: "/jpg-to-pdf",
    },
    {
      
      title: "PDF to Excel",
      description: "Extracting insights and making predictions.",
      imgUrl: projImg3,
      route: "/pdf-to-excel",
    },
    {
      title: "Merge PDF",
      description: "Merge multiple PDFs into a single PDF.",
      imgUrl: projImg1,
      route: "/merge-pdf",
    },
    {
      title: "Split PDF",
      description: "Split PDF into multiple PDFs.",
      imgUrl: projImg2,
      route: "/split-pdf",
    },
    {
      title: "Compress PDF",
      description: "Compress PDF into smaller sizes.",
      imgUrl: projImg3,
      route: "/compress-pdf",
    },
    {
      title: "Word Doc to PDF",
      description: "Convert Word file to PDF file.",
      imgUrl: projImg1,
      route: "/word-to-pdf",
    },
    {
      title: "PDF to Word doc",
      description: "Convert PDF file to Word document.",
      imgUrl: projImg2,
      route: "/pdf-to-word",
    },
    {
      title: "Edit PDF",
      description: "Edit PDF files.",
      imgUrl: projImg3,
      route: "/edit-pdf",
    },
  ];


  return (
    <section className="project" id="projects">
      <Container>
        <Row>
          <Col size={12}>
            <TrackVisibility>
              {({ isVisible }) =>
              <div className={isVisible ? "animate__animated animate__fadeIn": ""}>
                <h2>Features</h2>
                <p>OCR feature and data extraction can be done easily and efficiently. Transform feature allows you to quickly and easily convert your PDFs to other file formats.</p>
                <Tab.Container id="projects-tabs" defaultActiveKey="first">
                  <Nav variant="pills" className="nav-pills mb-5 justify-content-center align-items-center" id="pills-tab">
                    <Nav.Item>
                      <Nav.Link eventKey="first">Features</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="second">About Us</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="third">Tab 3</Nav.Link>
                    </Nav.Item>
                  </Nav>
                  <Tab.Content id="slideInUp" className={isVisible ? "animate__animated animate__slideInUp" : ""}>
                    <Tab.Pane eventKey="first">
                    <Row>
                      {projects.map((project, index) => (
                        <Link to={project.route} key={index}> {/* Link to specific route */}
                          <ProjectCard {...project} />
                        </Link>
                      ))}
                    </Row>
                    </Tab.Pane>
                    <Tab.Pane eventKey="section">
                      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Cumque quam, quod neque provident velit, rem explicabo excepturi id illo molestiae blanditiis, eligendi dicta officiis asperiores delectus quasi inventore debitis quo.</p>
                    </Tab.Pane>
                    <Tab.Pane eventKey="third">
                      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Cumque quam, quod neque provident velit, rem explicabo excepturi id illo molestiae blanditiis, eligendi dicta officiis asperiores delectus quasi inventore debitis quo.</p>
                    </Tab.Pane>
                  </Tab.Content>
                </Tab.Container>
              </div>}
            </TrackVisibility>
          </Col>
        </Row>
      </Container>
      <img className="background-image-right" src={colorSharp2}></img>
    </section>
  )
}