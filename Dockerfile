FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm ci --only=production

# Bundle app source
COPY . .

# Expose port (Cloud Run sets process.env.PORT, usually 8080)
EXPOSE 8080

# Start the server
CMD [ "node", "server.js" ]
