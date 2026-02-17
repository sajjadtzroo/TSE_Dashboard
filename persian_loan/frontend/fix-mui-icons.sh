#!/bin/bash

# Fix MUI Icons Material Installation
# This script resolves the corrupted @mui/icons-material package issue

echo "Cleaning up corrupted @mui/icons-material package..."
rm -rf node_modules/@mui/icons-material

echo "Cleaning npm cache..."
npm cache clean --force

echo "Cleaning Vite cache..."
rm -rf node_modules/.vite

echo "Reinstalling @mui/icons-material..."
npm install @mui/icons-material

echo "Done! You can now run 'npm run dev' to start the development server."
