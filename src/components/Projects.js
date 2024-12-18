import { Container, Row, Col } from "react-bootstrap";
import { ProjectCard } from "./ProjectCard";
import projImg1 from "../assets/img/project-img1.png";
import projImg2 from "../assets/img/project-img2.png";
import projImg3 from "../assets/img/project-img3.png";
import projImg4 from "../assets/img/project-img4.png";
import projImg5 from "../assets/img/project-img5.png";
import projImg7 from "../assets/img/project-img7.png";
import projImg9 from "../assets/img/project-img9.png";
import projImg10 from "../assets/img/project-img10.png";
import projImg12 from "../assets/img/project-img12.png";
import projImg13 from "../assets/img/project-img13.png";
import projImg14 from "../assets/img/project-img14.png";
import projImg15 from "../assets/img/project-img15.png";
import colorSharp2 from "../assets/img/color-sharp2.png";
import 'animate.css';
import './Projects.css';

export const Projects = () => {

  const projects = [
    {
      title: "PDF to JPG",
      description: "Convert PDF file to JPG file.",
      imgUrl: projImg1,
      route: "/pdf-to-jpg",
    },
    {
      title: "JPG to PDF",
      description: "Convert JPG file to PDF file.",
      imgUrl: projImg2,
      route: "/jpg-to-pdf",
    },
    {
      title: "Speech to Text",
      description: "Convert Speech to Text.",
      imgUrl: projImg3,
      route: "/sp2txt",
    },
    {
      title: "Merge PDF",
      description: "Merge PDFs into a single PDF.",
      imgUrl: projImg4,
      route: "/merge-pdf",
    },
    {
      title: "Split PDF",
      description: "Split PDF into multiple PDFs.",
      imgUrl: projImg5,
      route: "/split-pdf",
    },
    {
      title: "JSON to PDF",
      description: "Convert JSON file to PDF.",
      imgUrl: projImg9,
      route: "/json-to-pdf",
    },
    {
      title: "Word Doc to PDF",
      description: "Convert doc file to PDF file.",
      imgUrl: projImg7,
      route: "/word-to-pdf",
    },
    {
      title: "CSV to JSON",
      description: "Convert PDF file to doc file.",
      imgUrl: projImg12,
      route: "/csv-to-json",
    },
    {
      title: "PDF to JSON",
      description: "Convert PDF file to JSON file.",
      imgUrl: projImg10,
      route: "/pdf-to-json",
    },
    {
      title: "JSON to CSV",
      description: "Convert JSON file to CSV file.",
      imgUrl: projImg14,
      route: "/json-to-csv",
    },
    {
      title: "JSON to XML",
      description: "Convert JSON file to XML file.",
      imgUrl: projImg15,
      route: "/json-to-xml",
    },
    {
      title: "XML to JSON",
      description: "Convert XML file to JSON file.",
      imgUrl: projImg13,
      route: "/xml-to-json",
    },
  ];

  return (
    <section className="project" id="skillContainer" style={{ backgroundColor: '#ffe6ff', padding: '40px 0' }}>
      <Container>
        <Row>
          <Col size={12}>
            <div style={{ backgroundColor: 'black', padding: '20px', borderRadius: '40px', border: '2px solid white' }}>
              <h2 style={{ color: 'white' }}>Features</h2>
              <p style={{ color: 'white' }}>OCR feature and data extraction can be done easily and efficiently. Transform feature allows you to quickly and easily convert your PDFs to other file formats.</p>
              <Row>
                {
                  projects.map((project, index) => {
                    return (
                      <ProjectCard
                        key={index}
                        {...project}
                      />
                    )
                  })
                }
              </Row>
            </div>
          </Col>
        </Row>
      </Container>
      <img className="background-image-right" src={colorSharp2} alt="Background" />
    </section>
  )
}
