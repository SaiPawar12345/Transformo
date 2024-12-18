import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Home.css';

const Home = () => {
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [pdfs, setPdfs] = useState([]);

    // Fetch the list of uploaded PDFs
    useEffect(() => {
        const fetchPdfs = async () => {
            try {
                const response = await axios.get('http://localhost:8080/pdf/get-files', {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                setPdfs(response.data);
            } catch (err) {
                setError('Failed to fetch PDFs.');
            }
        };
        

        fetchPdfs();
    }, []);

    // Handle file upload
    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleFileUpload = async () => {
        if (!file) {
            setError('Please select a file.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.post('http://localhost:8080/pdf/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            // Fetch PDFs again after upload
            const response = await axios.get('http://localhost:8080/pdf/get-files', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setPdfs(response.data);

            setFile(null); // Reset file input
        } catch (err) {
            setError('Failed to upload the file.');
        }
    };

    return (
        <div className="home-container">
            <h2>Welcome to the Home Page</h2>
            <div>
                <h3>Upload PDF</h3>
                <input type="file" accept="application/pdf" onChange={handleFileChange} />
                <button onClick={handleFileUpload}>Upload</button>
                {error && <p className="error">{error}</p>}
            </div>

            <h3>Uploaded PDFs</h3>
            {pdfs.length === 0 ? (
                <p>No PDFs uploaded yet.</p>
            ) : (
                <ul>
                    {pdfs.map((pdf) => (
                        <li key={pdf._id}>
                            <a href={`/${pdf.filePath}`} target="_blank" rel="noopener noreferrer">
                                {pdf.fileName}
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Home;
