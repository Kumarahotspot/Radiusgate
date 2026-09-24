# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
# Set alamat backend produksi di VPS Anda
ARG REACT_APP_BACKEND_URL=""
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

RUN yarn build

# Production stage (Nginx)
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY ./nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
