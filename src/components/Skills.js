import meter1 from "../assets/img/meter1.svg";
import meter2 from "../assets/img/meter2.svg";
import meter3 from "../assets/img/meter3.svg";
import 'react-multi-carousel/lib/styles.css';
import './Skills.css';

export const Skills = () => {
  return (
    <section className="skill" id="skillContainer">
      <div className="container" Id="skillContainer">
        <div className="row">
          <div className="col-12">
            <div className="skill-bx wow zoomIn">
              <h2>Premium Subscription</h2>
              <p>Get more with Premium. Complete projects faster with batch file processing, <br /> convert scanned documents with OCR, and e-sign your business agreements.</p>
              <div className="plans">
                <div className="item">
                  <img src={meter1} alt="Free Plan" />
                  <div className="item-details">
                    <h5>Level 0<br />Free Plan</h5>
                    <p>Great for Beginners.</p>
                    <span
                      style={{
                        color: "#FFFFFF",
                        textShadow: "0 0 5px #FFFFFF, 0 0 10px #FFFFFF",
                        textAlign: "left",
                        display: "inline-block",
                        marginTop: "5px", /* Reduce the gap */
                      }}
                    >
                      1. Access basic features for individuals<br />
                      2. 100 Tokens Per month<br />
                      3. Merge pdf<br />
                      4. Split pdf<br />
                      5. Edit pdf<br />
                      6. And much more...
                    </span>
                  </div>
                </div>
                <div className="item">
                  <img src={meter2} alt="Level 1 Plan" />
                  <div className="item-details">
                    <h5>Level 1<br />Subscription Plan</h5>
                    <p>Great for startups and small teams.</p>
                    <span
                      style={{
                        color: "#FFFFFF",
                        textShadow: "0 0 5px #FFFFFF, 0 0 10px #FFFFFF",
                        textAlign: "left",
                        display: "inline-block",
                        marginTop: "5px",
                      }}
                    >
                      1. All Free Plan features<br />
                      2. 500 Tokens Per month<br />
                      3. Add watermarks to PDFs<br />
                      4. Rearrange PDF pages<br />
                      5. Priority support<br />
                      6. And much more...
                    </span>
                  </div>
                </div>
                <div className="item">
                  <img src={meter3} alt="Level 2 Plan" />
                  <div className="item-details">
                    <h5>Level 2<br />Subscription Plan</h5>
                    <p>Perfect for growing businesses.</p>
                    <span
                      style={{
                        color: "#FFFFFF",
                        textShadow: "0 0 5px #FFFFFF, 0 0 10px #FFFFFF",
                        textAlign: "left",
                        display: "inline-block",
                        marginTop: "5px",
                      }}
                    >
                      1. All Level 1 Plan features<br />
                      2. 1000 Tokens Per month<br />
                      3. OCR (Optical Character Recognition) for PDFs<br />
                      4. Secure PDF encryption<br />
                      5. Advanced file management<br />
                      6. And much more...
                    </span>
                  </div>
                </div>
                <div className="item">
                  <img src={meter3} alt="Level 3 Plan" />
                  <div className="item-details">
                    <h5>Level 3<br />Subscription Plan</h5>
                    <p>Ultimate plan with advanced features.</p>
                    <span
                      style={{
                        color: "#FFFFFF",
                        textShadow: "0 0 5px #FFFFFF, 0 0 10px #FFFFFF",
                        textAlign: "left",
                        display: "inline-block",
                        marginTop: "5px",
                      }}
                    >
                      1. All Level 2 Plan features<br />
                      2. Unlimited Tokens<br />
                      3. Batch process PDFs<br />
                      4. API Access for developers<br />
                      5. Enterprise-level support<br />
                      6. And much more...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </section>
  );
};
