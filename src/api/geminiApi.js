import axios from 'axios';

// Base URL for Gemini 1.5 API
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Create an Axios instance with the API key
const geminiApi = axios.create({
  baseURL: GEMINI_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Function to generate content using Gemini API
// Modify the generateContent function with better error handling
export const generateContent = async (documentData) => {
    try {
      // Set up the endpoint for generating content
      const endpoint = '/models/gemini-1.5-flash-latest:generateContent';
  
      // Ensure that documentData is in the right format (check Gemini API docs)
      const requestPayload = JSON.stringify({
        data: documentData, // Make sure 'data' is the correct key expected by the API
      });
  
      // Make the API request
      const response = await geminiApi.post(
        `${endpoint}?key=AIzaSyCtM75vJXvJFJNx2R3-cZlCw6GrTbAjNIY`,
        requestPayload // Convert documentData to JSON string if necessary
      );
      return response.data; // Return the API response data
    } catch (error) {
      // Handle API errors with improved messages
      if (error.response) {
        // Log the detailed error from the API response
        console.error("Error during content generation:", error.response.data);
        alert(`API Error: ${error.response.data.message || 'Unknown error'}`);
      } else if (error.request) {
        // No response received from the server
        console.error("No response received:", error.request);
        alert("No response from the server. Please try again.");
      } else {
        // Other errors (e.g., request setup issues)
        console.error("Error:", error.message);
        alert(`An unexpected error occurred: ${error.message}`);
      }
      throw error; // Rethrow the error for further handling
    }
  };
  