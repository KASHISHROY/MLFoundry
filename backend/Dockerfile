# Start from official Python image
FROM python:3.11-slim

# Set working directory inside container
WORKDIR /app

# Copy requirements file first (Docker caching trick — explained below)
COPY requirements.txt .

# Install all Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy rest of the code
COPY . .

# Expose port 8000
EXPOSE 8000