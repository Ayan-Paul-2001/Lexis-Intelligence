# Use the official Node.js standard image (Debian-based)
FROM node:20-bookworm-slim

# Install necessary system dependencies: FFmpeg (vital for audio compression)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory directly inside the container
WORKDIR /app

# Copy dependency definition files first (to optimize Docker caching)
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the Vite static assets for the React frontend
RUN npm run build

# Expose the standard Express port
EXPOSE 3000

# Instruct Render to start the production Express server
CMD ["node", "server.js"]
