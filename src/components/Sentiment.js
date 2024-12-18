import React, { useState } from "react";
import axios from "axios";
import './sentiment.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Sentiment = () => {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please upload a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setError("");
      const response = await axios.post("http://127.0.0.1:5000/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setAnalysis(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong!");
    }
  };

  return (
    <div className="sentiment-container">
      <div className="sentiment-analysis-wrapper">
        <h1 className="sentiment-heading">Sentiment Analysis</h1>
        
        <div className="sentiment-upload-container">
          <input
            type="file"
            onChange={handleFileChange}
            className="sentiment-file-input"
          />
          <button
            onClick={handleUpload}
            className="sentiment-upload-button"
          >
            Upload
          </button>
        </div>

        {error && <p className="sentiment-error">{error}</p>}
        
        {analysis && (
          <div className="sentiment-analysis-results">
            <h2>Sentiment Results</h2>
            <p>Conclusion: {analysis.conclusion}</p>
            <div className="sentiment-chart">
              <Bar
                data={{
                  labels: ["Negative", "Neutral", "Positive", "Compound"],
                  datasets: [
                    {
                      label: "Sentiment Scores",
                      data: [
                        analysis.sentiment_scores.neg,
                        analysis.sentiment_scores.neu,
                        analysis.sentiment_scores.pos,
                        analysis.sentiment_scores.compound,
                      ],
                      backgroundColor: ["red", "gray", "green", "blue"],
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: "top",
                    },
                    title: {
                      display: true,
                      text: "Sentiment Analysis Scores",
                    },
                  },
                  scales: {
                    x: {
                      ticks: {
                        color: 'white', // Change X-axis numbers to white
                      },
                    },
                    y: {
                      ticks: {
                        color: 'white', // Change Y-axis numbers to white
                      },
                    },
                  },
                }}
              />
            </div>
            <h3>Top Influential Words</h3>
            <div className="sentiment-influential-words">
              <ul>
                {analysis.influential_words.map((word, index) => (
                  <li key={index}>
                    {word.word} - Impact: {word.impact.toFixed(2)} - Sentiment:{" "}
                    {word.sentiment.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sentiment;
