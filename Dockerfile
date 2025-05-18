# Use the official Bun image
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy the rest of the application code
COPY . .

RUN bunx drizzle-kit migrate

# Expose the desired port (e.g., 3000)
EXPOSE 3000

# Start the application
CMD ["bun", "run", "start"]