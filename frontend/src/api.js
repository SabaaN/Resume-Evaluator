import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export async function evaluateCVs(jdFile, cvFiles, additionalRequirements = '') {
  const formData = new FormData();
  formData.append('jd', jdFile);
  cvFiles.forEach((file) => formData.append('cvs', file));
  if (additionalRequirements) {
    formData.append('additional_requirements', additionalRequirements);
  }

  const response = await axios.post(`${API_BASE_URL}/evaluate`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}