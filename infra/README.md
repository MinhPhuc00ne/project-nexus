# Infrastructure & Deployment Stack

This directory contains container definitions and local orchestration stacks for Project Nexus:

- `docker-compose.yml`: Local backing services orchestration (PostgreSQL 16 and Redis 7).
- `docker/Dockerfile.backend`: Production-ready multi-stage Docker build for the NestJS Modular Monolith backend.
- `docker/Dockerfile.web`: Multi-stage Docker build with NGINX for serving the React frontend.
