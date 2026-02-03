import axios from "axios";
import Constants from "expo-constants";

// Replace with your computer's IP address if running on physical device
// Android Emulator uses 10.0.2.2 to access host localhost
// iOS Simulator uses localhost
const API_URL = "http://192.168.1.16:3000/api";

const client = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default client;
