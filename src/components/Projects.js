import { Container } from "react-bootstrap";
import { ProjectCard } from "./ProjectCard";
import colorSharp2 from "../assets/img/color-sharp2.png";
import 'animate.css';
import './Projects.css';

export const Projects = () => {
  const categories = [
    {
      title: "Convert from PDF",
      tools: [
        {
          title: "PDF to Word",
          description: "Convert PDFs to Microsoft Word documents (DOCX or DOC).",
          route: "/pdf-to-word",
          isHot: true
        },
        {
          title: "PDF to PPT",
          description: "Convert PDFs to Microsoft PowerPoint documents (PPTX or PPT).",
          route: "/pdf-to-ppt"
        },
        {
          title: "PDF to Excel",
          description: "Convert PDFs to Microsoft Excel spreadsheets (XLSX or XLS).",
          route: "/pdf-to-excel"
        },
        {
          title: "PDF to JPG",
          description: "Convert PDFs to images (JPG, PNG, BMP, GIF, and TIFF).",
          route: "/pdf-to-jpg"
        },
        {
          title: "PDF to TXT",
          description: "Convert PDFs to text files (TXT).",
          route: "/pdf-to-txt"
        },
        {
          title: "PDF to RTF",
          description: "Convert PDFs to rich text files (RTF).",
          route: "/pdf-to-rtf"
        },
        {
          title: "PDF to HTML",
          description: "Convert PDFs to HTML web pages.",
          route: "/pdf-to-html"
        },
        {
          title: "PDF to EPUB",
          description: "Convert PDFs to eBook EPUB files.",
          route: "/pdf-to-epub"
        },
        {
          title: "PDF to JSON",
          description: "Convert PDF files to structured JSON format.",
          route: "/pdf-to-json"
        }
      ]
    },
    {
      title: "Convert to PDF",
      tools: [
        {
          title: "JPG to PDF",
          description: "Convert JPG images to PDF file.",
          route: "/jpg-to-pdf"
        },
        {
          title: "Word to PDF",
          description: "Convert Word documents to PDF format.",
          route: "/word-to-pdf"
        },
        {
          title: "Excel to PDF",
          description: "Convert Excel spreadsheets to PDF.",
          route: "/excel-to-pdf"
        },
        {
          title: "PPT to PDF",
          description: "Convert PowerPoint presentations to PDF.",
          route: "/ppt-to-pdf"
        },
        {
          title: "JSON to PDF",
          description: "Convert JSON files to formatted PDF documents.",
          route: "/json-to-pdf"
        }
      ]
    },
    {
      title: "Edit PDF",
      tools: [
        {
          title: "Merge PDF",
          description: "Combine multiple PDFs into one document.",
          route: "/merge-pdf"
        },
        {
          title: "Split PDF",
          description: "Split PDF into separate files.",
          route: "/split-pdf"
        },
        {
          title: "Compress PDF",
          description: "Reduce PDF file size while maintaining quality.",
          route: "/compress-pdf"
        }
      ]
    },
    {
      title: "Data Format Conversion",
      tools: [
        {
          title: "JSON to CSV",
          description: "Convert JSON files to CSV format.",
          route: "/json-to-csv"
        },
        {
          title: "JSON to XML",
          description: "Convert JSON files to XML format.",
          route: "/json-to-xml"
        },
        {
          title: "XML to JSON",
          description: "Convert XML files to JSON format.",
          route: "/xml-to-json"
        },
        {
          title: "Speech to Text",
          description: "Convert audio to text with high accuracy.",
          route: "/sp2txt"
        }
      ]
    }
  ];

  return (
    <section className="project" id="skillContainer">
      <Container>
        <div className="project-container">
          <div className="project-header">
            <h2>All Tools</h2>
            <p>
              Everything you need for your document conversion needs in one place. 
              Simple, fast, and secure.
            </p>
          </div>
          
          <div className="categories-container">
            {categories.map((category, idx) => (
              <div key={idx} className="category-section">
                <h3 className="category-title">{category.title}</h3>
                <p className="category-description">
                  {category.title === "Convert from PDF" && "Save files from PDFs online for free."}
                </p>
                <div className="tools-grid">
                  {category.tools.map((tool, index) => (
                    <ProjectCard key={index} {...tool} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
      <img className="background-image-right" src={colorSharp2} alt="Background" />
    </section>
  );
};
